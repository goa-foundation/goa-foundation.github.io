/**
 * Goa Foundation Slideshow Plugin
 * A reveal.js plugin that creates an auto-cycling slideshow overlay
 */
class GoaFoundationSlideshow {
    constructor(options = {}) {
        this.options = {
            timeout: 10000, // 10 seconds
            slideDuration: 3000, // 3 seconds per slide
            transitionDuration: 500, // 0.5 seconds transition
            ...options
        };
        
        this.isActive = false;
        this.currentSlide = 0;
        this.slides = [];
        this.overlay = null;
        this.intervalId = null;
        this.timeoutId = null;
        
        this.init();
    }
    
    init() {
        // Create slides configuration from JSON
        this.slides = this.createSlidesFromConfig();
    }
    
    createSlidesFromConfig() {
        const slidesConfig = [
            {
                id: 'tiger-reserve',
                type: 'tiger-reserve',
                title: 'PIL for a Tiger Reserve in Goa',
                tags: ['environment', 'wildlife', 'legal'],
                updates: [
                    {
                        datestamp: '2025-09-16',
                        htmlText: '<p>Supreme Court rules against Goa Government in Tiger Reserve dispute. - <a href="https://www.heraldgoa.in/goa/goa/supreme-court-rules-against-goa-government-in-tiger-reserve-dispute-2/427037">Herald Goa</a></p>'
                    }
                ],
                backgroundImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Bengal_tiger_in_Sanjay_Dubri_Tiger_Reserve_December_2024_by_Tisha_Mukherjee_10.jpg/1599px-Bengal_tiger_in_Sanjay_Dubri_Tiger_Reserve_December_2024_by_Tisha_Mukherjee_10.jpg?20250201075819',
                backgroundOverlay: 'linear-gradient(135deg, rgba(139, 69, 19, 0.85), rgba(160, 82, 45, 0.85))'
            },
            {
                id: 'quote',
                type: 'quote',
                quote: '"<span style="color:white">The intergenerational equity principle asks us to ensure our children and future generations inherit at least as much as we did.</span>"',
                backgroundImage: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Zuari%2C_Goa_India.jpg',
                backgroundOverlay: 'linear-gradient(135deg, hsla(0, 15.90%, 67.80%, 0.49), rgba(231, 200, 199, 0.85))'
            },
            {
                id: 'stats',
                type: 'stats',
                dynamicContent: true, // This slide gets content from timeline
                backgroundImage: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Zuari%2C_Goa_India.jpg',
                backgroundOverlay: 'linear-gradient(135deg, rgba(144, 87, 86, 0.85), rgba(122, 75, 74, 0.85))'
            }
        ];
        
        return slidesConfig.map(config => ({
            type: 'content',
            config: config,
            content: () => this.createSlideFromConfig(config)
        }));
    }
    
    createSlideFromConfig(config) {
        switch (config.type) {
            case 'story':
                return this.createStorySlide(config);
            case 'quote':
                return this.createQuoteSlide(config);
            case 'stats':
                return this.createStatsSlide(config);
            default:
                return this.createGenericSlide(config);
        }
    }
    
    createStorySlide(config) {
        return `
            <div class="story-slide" style="background-image: url('${config.backgroundImage}')">
                <div class="slide-background" style="background: ${config.backgroundOverlay}"></div>
                <div class="slide-content">
                    <div class="story-content">
                        <h2 class="story-title">${config.title}
                            <button class="view-cases-button" onclick="dispatchCustomEvent('viewCases', { id: '${config.id}' })">View Cases</button>
                        </h2>
                        <h3 class="story-subtitle">${config.subtitle}</h3>
                        ${config.updates.map(update => `<p>${update.htmlText}</p>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    createQuoteSlide(config) {
        return `
            <div class="quote-slide" style="background-image: url('${config.backgroundImage}')">
                <div class="slide-background" style="background: ${config.backgroundOverlay}"></div>
                <div class="slide-content">
                    <div class="blockquote-content">
                        <blockquote class="text-center italic mb-3 text-base" style="color: var(--gf-text-dark);">
                            ${config.quote}
                        </blockquote>
                    </div>
                </div>
            </div>
        `;
    }
    
    createStatsSlide(config) {
        // Get statistics from the timeline instance
        const timeline = window.goaFoundationTimeline;
        const stats = timeline ? timeline.getStatistics() : { totalCases: 0, yearSpan: 0 };
        
        return `
            <div class="stats-slide" style="background-image: url('${config.backgroundImage}')">
                <div class="slide-background" style="background: ${config.backgroundOverlay}"></div>
                <div class="slide-content">
                    <div class="stats-content">
                        <div class="text-center text-sm" style="color: var(--gf-text-light);">
                            Explore <u>${stats.totalCases}</u> Cases over <u>${stats.yearSpan} years</u>.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createGenericSlide(config) {
        // Generic slide template for future extensibility
        return `
            <div class="generic-slide" style="background-image: url('${config.backgroundImage || ''}')">
                <div class="slide-background" style="background: ${config.backgroundOverlay || 'rgba(0,0,0,0.5)'}"></div>
                <div class="slide-content">
                    <div class="generic-content">
                        ${config.content || ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.createOverlay();
        this.showSlide(0);
        this.startAutoCycle();
    }
    
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.clearTimers();
        this.hideOverlay();
    }
    
    createOverlay() {
        // Remove existing overlay if any
        if (this.overlay) {
            this.overlay.remove();
        }
        
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'slideshow-overlay';
        this.overlay.innerHTML = `
            <div class="slideshow-container">
                <div class="slideshow-slides"></div>
                <div class="slideshow-controls">
                    <div class="slideshow-progress">
                        <div class="slideshow-progress-bar"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Insert into header
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(this.overlay);
        }
    }
    
    addStyles() {
        if (document.getElementById('slideshow-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'slideshow-styles';
        style.textContent = `
            .slideshow-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, rgba(144, 87, 86, 0.95), rgba(122, 75, 74, 0.95));
                backdrop-filter: blur(5px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity ${this.options.transitionDuration}ms ease-in-out;
            }
            
            .slideshow-overlay.active {
                opacity: 1;
            }
            
            .slideshow-container {
                width: 100%;
                height: 100%;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            
            .slideshow-slides {
                flex: 1;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .slideshow-slide {
                position: absolute;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity ${this.options.transitionDuration}ms ease-in-out;
            }
            
            .slideshow-slide.active {
                opacity: 1;
            }
            
            .quote-slide, .stats-slide, .tiger-reserve-slide, .generic-slide {
                width: 100%;
                height: 100%;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
            }
            
            .quote-slide .slide-background, .stats-slide .slide-background, 
            .tiger-reserve-slide .slide-background, .generic-slide .slide-background {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1;
            }
            
            .quote-slide .slide-content, .stats-slide .slide-content, 
            .tiger-reserve-slide .slide-content, .generic-slide .slide-content {
                position: relative;
                z-index: 2;
                text-align: center;
                color: white;
                max-width: 800px;
                padding: 40px;
            }
            
            .quote-slide .blockquote-content {
                font-size: 28px;
                font-style: italic;
                line-height: 1.6;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                font-family: 'Source Sans Pro', sans-serif;
            }
            
            .stats-slide .stats-content {
                font-size: 24px;
                font-weight: 600;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                font-family: 'Source Sans Pro', sans-serif;
            }
            
            .tiger-reserve-content {
                font-family: 'Source Sans Pro', sans-serif;
            }
            
            .tiger-reserve-title {
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 20px;
                text-shadow: 3px 3px 6px rgba(0,0,0,0.7);
                letter-spacing: -0.5px;
                line-height: 1.2;
            }
            
            .tiger-reserve-subtitle {
                font-size: 20px;
                font-weight: 400;
                margin-bottom: 30px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.6);
                line-height: 1.4;
                opacity: 0.95;
            }
            
            .tiger-reserve-link {
                display: inline-block;
                background: rgba(255, 255, 255, 0.15);
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                transition: all 0.3s ease;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
            }
            
            .tiger-reserve-link:hover {
                background: rgba(255, 255, 255, 0.25);
                border-color: rgba(255, 255, 255, 0.5);
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            
            .slideshow-controls {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                width: 300px;
            }
            
            .slideshow-progress {
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                overflow: hidden;
            }
            
            .slideshow-progress-bar {
                height: 100%;
                background: white;
                border-radius: 2px;
                width: 0%;
                transition: width 100ms linear;
            }
            
            @media (max-width: 768px) {
                .quote-slide .slide-content, .stats-slide .slide-content, 
                .tiger-reserve-slide .slide-content, .generic-slide .slide-content {
                    padding: 20px;
                }
                
                .quote-slide .blockquote-content {
                    font-size: 22px;
                }
                
                .stats-slide .stats-content {
                    font-size: 18px;
                }
                
                .tiger-reserve-title {
                    font-size: 28px;
                }
                
                .tiger-reserve-subtitle {
                    font-size: 16px;
                }
                
                .tiger-reserve-link {
                    font-size: 14px;
                    padding: 10px 20px;
                }
                
                .slideshow-controls {
                    width: 250px;
                }
            }
            
            @media (max-width: 480px) {
                .quote-slide .blockquote-content {
                    font-size: 20px;
                }
                
                .stats-slide .stats-content {
                    font-size: 16px;
                }
                
                .tiger-reserve-title {
                    font-size: 24px;
                }
                
                .tiger-reserve-subtitle {
                    font-size: 14px;
                }
                
                .tiger-reserve-link {
                    font-size: 13px;
                    padding: 8px 16px;
                }
                
                .slideshow-controls {
                    width: 200px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    showSlide(index) {
        if (!this.overlay || index < 0 || index >= this.slides.length) return;
        
        const slidesContainer = this.overlay.querySelector('.slideshow-slides');
        if (!slidesContainer) return;
        
        // Clear existing slides
        slidesContainer.innerHTML = '';
        
        // Create current slide
        const slide = document.createElement('div');
        slide.className = 'slideshow-slide active';
        slide.innerHTML = this.slides[index].content();
        
        slidesContainer.appendChild(slide);
        
        this.currentSlide = index;
        this.updateProgress();
    }
    
    updateProgress() {
        const progressBar = this.overlay?.querySelector('.slideshow-progress-bar');
        if (progressBar) {
            const progress = ((this.currentSlide + 1) / this.slides.length) * 100;
            progressBar.style.width = `${progress}%`;
        }
    }
    
    startAutoCycle() {
        this.clearTimers();
        
        // Show overlay with fade in
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.classList.add('active');
            }
        }, 100);
        
        // Start cycling through slides
        this.intervalId = setInterval(() => {
            this.nextSlide();
        }, this.options.slideDuration);
    }
    
    nextSlide() {
        if (!this.isActive) return;
        
        const nextIndex = (this.currentSlide + 1) % this.slides.length;
        this.showSlide(nextIndex);
        
        // If we've completed all slides, stop and hide
        if (nextIndex === 0) {
            this.stop();
            this.scheduleNext();
        }
    }
    
    scheduleNext() {
        // Schedule next slideshow cycle
        this.timeoutId = setTimeout(() => {
            this.start();
        }, this.options.timeout);
    }
    
    clearTimers() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    
    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            
            // Remove overlay after transition
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                }
            }, this.options.transitionDuration);
        }
    }
    
    // Public methods for external control
    pause() {
        this.clearTimers();
    }
    
    resume() {
        if (this.isActive) {
            this.startAutoCycle();
        }
    }
    
    destroy() {
        this.stop();
        this.clearTimers();
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoaFoundationSlideshow;
} else if (typeof window !== 'undefined') {
    window.GoaFoundationSlideshow = GoaFoundationSlideshow;
}
