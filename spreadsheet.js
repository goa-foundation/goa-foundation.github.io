/**
 * Goa Foundation Spreadsheet Configuration and Data Processing Module
 * 
 * This module handles:
 * - Configurable spreadsheet URL and field mappings
 * - Data validation and error reporting
 * - Field name alias resolution
 * - Data transformation for the timeline visualization
 */

class GoaFoundationSpreadsheetProcessor {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            // Google Sheets URL
            sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSLFcCdng-x_P4-i8mYeZA0cdWZoG6DUJfwsj36czKj5LKk6ZfuzZ18JSkAZdZNlv6MkgShPF4YFhU5/pub?gid=1740040742&single=true&output=csv',
            
            // Required field mappings with aliases
            // Each field can have multiple possible column names (aliases)
            fieldMappings: {
                // Primary identifier for the case (required)
                reference: {
                    aliases: ['Case No.'],
                    required: true,
                    description: 'Case reference number or identifier'
                },
                
                // Subject/topic of the case (required)
                subject: {
                    aliases: ['Subject'],
                    required: true,
                    description: 'Main subject or topic of the case'
                },
                
                // Year of the case (required)
                year: {
                    aliases: ['Year'],
                    required: true,
                    description: 'Year when the case was filed or occurred',
                    validator: (value) => {
                        const year = parseInt(value);
                        return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 10;
                    }
                },
                
                // Case description (optional)
                description: {
                    aliases: ['Description'],
                    required: false,
                    description: 'Detailed description of the case'
                },
                
                // Case title (optional)
                title: {
                    aliases: ['Title'],
                    required: false,
                    description: 'Title of the case'
                },
                
                // Case image (optional)
                image: {
                    aliases: ['Image'],
                    required: false,
                    description: 'Image URL with license and attribution information'
                },
                
                // Case timeline (optional)
                timeline: {
                    aliases: ['Timeline'],
                    required: false,
                    description: 'Timeline of events with dates, descriptions, and optional URLs'
                },
                
                // Tags for categorization (optional)
                tags: {
                    aliases: ['Tags'],
                    required: false,
                    description: 'Tags or categories for the case (comma or semicolon separated)'
                },
                
                // Document links (all optional)
                archive: {
                    aliases: ['Archive'],
                    required: false,
                    description: 'Link to archived documents'
                },
                
                petition: {
                    aliases: ['Petition'],
                    required: false,
                    description: 'Link to petition document'
                },
                
                additionalDocuments: {
                    aliases: ['Additional Documents'],
                    required: false,
                    description: 'Link to additional supporting documents'
                },
                
                order: {
                    aliases: ['Order'],
                    required: false,
                    description: 'Link to court order or judgment'
                }
            },
            
            // Validation options
            validation: {
                // Whether to be strict about required fields
                strictMode: true,
                // Whether to log warnings for optional missing fields
                logMissingOptional: false,
                // Whether to validate URLs
                validateUrls: true,
                // Whether to validate years
                validateYears: true
            },
            
            // Debug options
            debug: false,
            
            // Override with user-provided config
            ...config
        };
        
        // Initialize error and warning collections
        this.errors = [];
        this.warnings = [];
        this.fieldMappingResult = {};
    }
    
    /**
     * Load and process data from the configured spreadsheet
     * @returns {Promise<Object>} Processed data with errors/warnings
     */
    async loadAndProcessData() {
        try {
            this.log('Starting data load from spreadsheet...');
            
            // Clear previous errors/warnings
            this.errors = [];
            this.warnings = [];
            this.fieldMappingResult = {};
            
            // Fetch raw CSV data
            const csvData = await this.fetchCSVData();
            
            // Parse CSV
            const parsedData = this.parseCSV(csvData);
            
            if (parsedData.length === 0) {
                throw new Error('No data found in the spreadsheet');
            }
            
            // Extract column headers
            const headers = Object.keys(parsedData[0]);
            this.log(`Found ${headers.length} columns: ${headers.join(', ')}`);
            
            // Map field names
            const fieldMapping = this.mapFieldNames(headers);
            
            // Validate required fields are present
            this.validateRequiredFields(fieldMapping);
            
            // Process and validate data
            const processedData = this.processData(parsedData, fieldMapping);
            
            // Return results
            const result = {
                success: this.errors.length === 0,
                data: processedData,
                errors: this.errors,
                warnings: this.warnings,
                fieldMapping: this.fieldMappingResult,
                totalRecords: processedData.length,
                validRecords: processedData.filter(record => record._isValid !== false).length
            };
            
            this.log(`Processing complete. ${result.validRecords}/${result.totalRecords} valid records. ${this.errors.length} errors, ${this.warnings.length} warnings.`);
            
            return result;
            
        } catch (error) {
            this.errors.push({
                type: 'FATAL_ERROR',
                message: error.message,
                context: 'Data loading'
            });
            
            return {
                success: false,
                data: [],
                errors: this.errors,
                warnings: this.warnings,
                fieldMapping: {},
                totalRecords: 0,
                validRecords: 0
            };
        }
    }
    
    /**
     * Fetch CSV data from the configured URL
     * @returns {Promise<string>} Raw CSV text
     */
    async fetchCSVData() {
        const response = await fetch(this.config.sheetUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data from spreadsheet: ${response.status} ${response.statusText}`);
        }
        
        return await response.text();
    }
    
    /**
     * Parse CSV text into array of objects
     * @param {string} csvText - Raw CSV text
     * @returns {Array<Object>} Parsed data
     */
    parseCSV(csvText) {
        try {
            const parsed = d3.csvParse(csvText);
            this.log(`Parsed ${parsed.length} rows from CSV`);
            return parsed;
        } catch (error) {
            throw new Error(`Failed to parse CSV data: ${error.message}`);
        }
    }
    
    /**
     * Map column headers to internal field names using aliases
     * @param {Array<string>} headers - Column headers from CSV
     * @returns {Object} Mapping of internal field name to actual column name
     */
    mapFieldNames(headers) {
        const mapping = {};
        const unmappedHeaders = [...headers];
        
        // Process each required field
        for (const [fieldName, fieldConfig] of Object.entries(this.config.fieldMappings)) {
            let foundMatch = null;
            
            // Try each alias for this field
            for (const alias of fieldConfig.aliases) {
                // Case-insensitive exact match
                const exactMatch = headers.find(header => 
                    header.toLowerCase().trim() === alias.toLowerCase().trim()
                );
                
                if (exactMatch) {
                    foundMatch = exactMatch;
                    break;
                }
                
                // Case-insensitive partial match (alias contained in header)
                const partialMatch = headers.find(header => 
                    header.toLowerCase().trim().includes(alias.toLowerCase().trim())
                );
                
                if (partialMatch && !foundMatch) {
                    foundMatch = partialMatch;
                }
            }
            
            if (foundMatch) {
                mapping[fieldName] = foundMatch;
                this.fieldMappingResult[fieldName] = {
                    mappedTo: foundMatch,
                    status: 'found'
                };
                
                // Remove from unmapped list
                const index = unmappedHeaders.indexOf(foundMatch);
                if (index > -1) {
                    unmappedHeaders.splice(index, 1);
                }
                            } else {
                this.fieldMappingResult[fieldName] = {
                    mappedTo: null,
                    status: 'not_found',
                    aliases: fieldConfig.aliases
                };
                
                if (fieldConfig.required) {
                    this.errors.push({
                        type: 'MISSING_REQUIRED_FIELD',
                        message: `Required field '${fieldName}' not found. Expected one of: ${fieldConfig.aliases.join(', ')}`,
                        context: 'Field mapping',
                        field: fieldName,
                        expectedAliases: fieldConfig.aliases
                    });
                } else {
                    this.warnings.push({
                        type: 'MISSING_OPTIONAL_FIELD',
                        message: `Optional field '${fieldName}' not found. Expected one of: ${fieldConfig.aliases.join(', ')}`,
                        context: 'Field mapping',
                        field: fieldName,
                        expectedAliases: fieldConfig.aliases
                    });
                }
            }
        }
        
        // Report unmapped columns
        if (unmappedHeaders.length > 0) {
            this.warnings.push({
                type: 'UNMAPPED_COLUMNS',
                message: `Found ${unmappedHeaders.length} unmapped columns: ${unmappedHeaders.join(', ')}`,
                context: 'Field mapping',
                unmappedColumns: unmappedHeaders
            });
        }
        
        return mapping;
    }
    
    /**
     * Validate that all required fields are present
     * @param {Object} fieldMapping - Field mapping result
     */
    validateRequiredFields(fieldMapping) {
        const requiredFields = Object.entries(this.config.fieldMappings)
            .filter(([_, config]) => config.required)
            .map(([fieldName, _]) => fieldName);
        
        const missingRequired = requiredFields.filter(fieldName => !fieldMapping[fieldName]);
        
        if (missingRequired.length > 0 && this.config.validation.strictMode) {
            throw new Error(`Missing required fields: ${missingRequired.join(', ')}`);
        }
    }
    
    /**
     * Process and validate the raw data
     * @param {Array<Object>} rawData - Raw parsed CSV data
     * @param {Object} fieldMapping - Field name mapping
     * @returns {Array<Object>} Processed and validated data
     */
    processData(rawData, fieldMapping) {
        const processedData = [];
        
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const processedRow = this.processRow(row, fieldMapping, i + 1);
            
            if (processedRow) {
                processedData.push(processedRow);
            }
        }
        
        return processedData;
    }
    
    /**
     * Process a single row of data
     * @param {Object} row - Raw row data
     * @param {Object} fieldMapping - Field mapping
     * @param {number} rowNumber - Row number for error reporting
     * @returns {Object|null} Processed row or null if invalid
     */
    processRow(row, fieldMapping, rowNumber) {
        const processedRow = {
            _rowNumber: rowNumber,
            _isValid: true,
            _errors: [],
            _warnings: []
        };
        
        // Process each mapped field
        for (const [fieldName, fieldConfig] of Object.entries(this.config.fieldMappings)) {
            const columnName = fieldMapping[fieldName];
            
            if (columnName && row[columnName] !== undefined) {
                let value = row[columnName];
                
                // Clean up the value
                if (typeof value === 'string') {
                    value = value.trim();
                }
                
                // Validate the value
                const validationResult = this.validateFieldValue(fieldName, value, fieldConfig, rowNumber);
                
                if (validationResult.isValid) {
                    // Store the processed value using the expected field name for the timeline
                    processedRow[this.getTimelineFieldName(fieldName)] = validationResult.processedValue;
                } else {
                    processedRow._isValid = false;
                    processedRow._errors.push(...validationResult.errors);
                    processedRow._warnings.push(...validationResult.warnings);
                }
            } else if (fieldConfig.required) {
                processedRow._isValid = false;
                processedRow._errors.push({
                    type: 'MISSING_REQUIRED_VALUE',
                    message: `Missing required value for field '${fieldName}'`,
                    context: `Row ${rowNumber}`,
                    field: fieldName,
                    rowNumber
                });
            }
        }
        
        // Add row-level errors to global collections
        this.errors.push(...processedRow._errors);
        this.warnings.push(...processedRow._warnings);
        
        // Return the row even if invalid, but mark it
        return processedRow;
    }
    
    /**
     * Validate a single field value
     * @param {string} fieldName - Internal field name
     * @param {any} value - Field value
     * @param {Object} fieldConfig - Field configuration
     * @param {number} rowNumber - Row number for error reporting
     * @returns {Object} Validation result
     */
    validateFieldValue(fieldName, value, fieldConfig, rowNumber) {
        const result = {
            isValid: true,
            processedValue: value,
            errors: [],
            warnings: []
        };
        
        // Check if value is empty for required fields
        if (fieldConfig.required && (!value || value === '')) {
            result.isValid = false;
            result.errors.push({
                type: 'EMPTY_REQUIRED_VALUE',
                message: `Empty value for required field '${fieldName}'`,
                context: `Row ${rowNumber}`,
                field: fieldName,
                rowNumber
            });
            return result;
        }
        
        // Skip validation for empty optional fields
        if (!fieldConfig.required && (!value || value === '')) {
            return result;
        }
        
        // Apply field-specific validation
        if (fieldConfig.validator) {
            if (!fieldConfig.validator(value)) {
                result.isValid = false;
                result.errors.push({
                    type: 'INVALID_FIELD_VALUE',
                    message: `Invalid value '${value}' for field '${fieldName}' (${fieldConfig.description})`,
                    context: `Row ${rowNumber}`,
                    field: fieldName,
                    value: value,
                    rowNumber
                });
                return result;
            }
        }
        
        // Apply built-in validations
        if (fieldName === 'year' && this.config.validation.validateYears) {
            const year = parseInt(value);
            if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 10) {
                result.isValid = false;
                result.errors.push({
                    type: 'INVALID_YEAR',
                    message: `Invalid year '${value}'. Expected a year between 1900 and ${new Date().getFullYear() + 10}`,
                    context: `Row ${rowNumber}`,
                    field: fieldName,
                    value: value,
                    rowNumber
                });
                return result;
            }
            result.processedValue = year.toString();
        }
        
        // URL validation for link fields
        if (this.config.validation.validateUrls && 
            ['archive', 'petition', 'additionalDocuments', 'order'].includes(fieldName) &&
            value && value.trim()) {
            
            try {
                new URL(value);
            } catch (error) {
                result.warnings.push({
                    type: 'INVALID_URL',
                    message: `Invalid URL format for field '${fieldName}': '${value}'`,
                    context: `Row ${rowNumber}`,
                    field: fieldName,
                    value: value,
                    rowNumber
                });
            }
        }
        
        return result;
    }
    
    /**
     * Map internal field names to the field names expected by the timeline visualization
     * @param {string} internalFieldName - Internal field name
     * @returns {string} Timeline field name
     */
    getTimelineFieldName(internalFieldName) {
        const mapping = {
            reference: 'Reference',
            subject: 'Subject',
            year: 'Year',
            description: 'Description',
            title: 'Title',
            image: 'Image',
            timeline: 'Timeline',
            tags: 'Tags',
            archive: 'Archive',
            petition: 'Petition',
            additionalDocuments: 'Additional Documents',
            order: 'Order'
        };
        
        return mapping[internalFieldName] || internalFieldName;
    }
    
    /**
     * Update configuration
     * @param {Object} newConfig - New configuration to merge
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig,
            fieldMappings: {
                ...this.config.fieldMappings,
                ...(newConfig.fieldMappings || {})
            },
            validation: {
                ...this.config.validation,
                ...(newConfig.validation || {})
            }
        };
    }
    
    /**
     * Get current field mapping configuration
     * @returns {Object} Current field mappings
     */
    getFieldMappings() {
        return this.config.fieldMappings;
    }
    
    /**
     * Log a message if debug mode is enabled
     * @param {string} message - Message to log
     */
    log(message) {
        if (this.config.debug) {
            console.log(`[SpreadsheetProcessor] ${message}`);
        }
    }
    
    /**
     * Generate a summary report of the processing results
     * @param {Object} result - Processing result
     * @returns {string} Human-readable summary
     */
    generateSummaryReport(result) {
        let report = `\n=== Goa Foundation Spreadsheet Processing Report ===\n`;
        report += `Status: ${result.success ? 'SUCCESS' : 'FAILED'}\n`;
        report += `Records: ${result.validRecords}/${result.totalRecords} valid\n`;
        report += `Errors: ${result.errors.length}\n`;
        report += `Warnings: ${result.warnings.length}\n\n`;
        
        // Field mapping summary
        report += `=== Field Mapping ===\n`;
        for (const [fieldName, mapping] of Object.entries(result.fieldMapping)) {
            if (mapping.status === 'found') {
                report += `✓ ${fieldName} → '${mapping.mappedTo}'\n`;
            } else {
                const fieldConfig = this.config.fieldMappings[fieldName];
                const required = fieldConfig?.required ? ' (REQUIRED)' : ' (optional)';
                report += `✗ ${fieldName}${required} → not found\n`;
            }
        }
        
        // Error summary
        if (result.errors.length > 0) {
            report += `\n=== Errors ===\n`;
            const errorsByType = {};
            result.errors.forEach(error => {
                if (!errorsByType[error.type]) {
                    errorsByType[error.type] = [];
                }
                errorsByType[error.type].push(error);
            });
            
            for (const [type, errors] of Object.entries(errorsByType)) {
                report += `${type}: ${errors.length} occurrences\n`;
                errors.slice(0, 3).forEach(error => {
                    report += `  - ${error.message}\n`;
                });
                if (errors.length > 3) {
                    report += `  - ... and ${errors.length - 3} more\n`;
                }
            }
        }
        
        // Warning summary
        if (result.warnings.length > 0) {
            report += `\n=== Warnings ===\n`;
            const warningsByType = {};
            result.warnings.forEach(warning => {
                if (!warningsByType[warning.type]) {
                    warningsByType[warning.type] = [];
                }
                warningsByType[warning.type].push(warning);
            });
            
            for (const [type, warnings] of Object.entries(warningsByType)) {
                report += `${type}: ${warnings.length} occurrences\n`;
                warnings.slice(0, 2).forEach(warning => {
                    report += `  - ${warning.message}\n`;
                });
                if (warnings.length > 2) {
                    report += `  - ... and ${warnings.length - 2} more\n`;
                }
            }
        }
        
        return report;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoaFoundationSpreadsheetProcessor;
} else if (typeof window !== 'undefined') {
    window.GoaFoundationSpreadsheetProcessor = GoaFoundationSpreadsheetProcessor;
}
