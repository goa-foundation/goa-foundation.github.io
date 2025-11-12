/**
 * Goa Foundation Slideshow Plugin
 * A reveal.js based slideshow overlay with scroll view transitions
 */
class GoaFoundationSlideshow {
    constructor(options = {}) {
        this.options = {
            timeout: 10000, // 10 seconds between cycles
            slideDuration: 3000, // 3 seconds per slide (auto-slide timing)
            transitionDuration: 500, // 0.5 seconds transition
            ...options
        };
        
        this.isActive = false;
        this.overlay = null;
        this.reveal = null;
        this.timeoutId = null;
        this.autoSlideTimeoutId = null;
        
        this.init();
    }
    
    init() {
        // Initialize will be called when starting
    }
    
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.createOverlay();
        this.initializeReveal();
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
        
        // Create overlay container positioned exactly on top of header
        this.overlay = document.createElement('div');
        this.overlay.className = 'slideshow-overlay';
        this.overlay.innerHTML = `
            <div class="reveal">
                <div class="slides">
                    ${this.createSlides()}
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
        
        // Insert overlay positioned over header
        const header = document.querySelector('header');
        if (header) {
            header.style.position = 'relative';
            header.appendChild(this.overlay);
        }
    }
    
    createSlides() {
        const slidesData = this.getSlidesData();
        
        return slidesData.map(slide => `
            <section data-background-image="${slide.backgroundImage}" 
                     data-background-size="cover" 
                     data-background-position="center"
                     data-auto-slide="${this.options.slideDuration}">
                <div class="slide-overlay" style="background: ${slide.backgroundOverlay}"></div>
                <div class="slide-content-wrapper">
                    ${slide.content}
                </div>
            </section>
        `).join('');
    }
    
    getSlidesData() {
        // Get statistics from timeline instance
        const timeline = window.goaFoundationTimeline;
        const stats = timeline ? timeline.getStatistics() : { totalCases: 0, yearSpan: 0 };
        
        return [
            {
                type: 'tiger-reserve',
                backgroundImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Bengal_tiger_in_Sanjay_Dubri_Tiger_Reserve_December_2024_by_Tisha_Mukherjee_10.jpg/1599px-Bengal_tiger_in_Sanjay_Dubri_Tiger_Reserve_December_2024_by_Tisha_Mukherjee_10.jpg?20250201075819',
                backgroundOverlay: 'linear-gradient(135deg, rgba(139, 69, 19, 0.85), rgba(160, 82, 45, 0.85))',
                content: `
                    <div class="tiger-reserve-content">
                        <h2 class="tiger-reserve-title">Tiger Reserve PIL Victory</h2>
                        <p class="tiger-reserve-update">
                            Supreme Court rules against Goa Govt - 
                            <a href="https://www.heraldgoa.in/goa/goa/supreme-court-rules-against-goa-government-in-tiger-reserve-dispute-2/427037" 
                               target="_blank" class="tiger-reserve-link">Details</a>
                        </p>
                    </div>
                `
            },
            {
                type: 'quote',
                backgroundImage: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Zuari%2C_Goa_India.jpg',
                backgroundOverlay: 'linear-gradient(135deg, hsla(0, 15.90%, 67.80%, 0.49), rgba(231, 200, 199, 0.85))',
                content: `
                    <div class="quote-content">
                        <blockquote class="main-quote">
                            "Ensure our children inherit at least as much as we did."
                        </blockquote>
                    </div>
                `
            },
            {
                type: 'stats',
                backgroundImage: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Zuari%2C_Goa_India.jpg',
                backgroundOverlay: 'linear-gradient(135deg, rgba(144, 87, 86, 0.85), rgba(122, 75, 74, 0.85))',
                content: `
                    <div class="stats-content">
                        <div class="stats-text">
                            Explore <u>${stats.totalCases}</u> Cases over <u>${stats.yearSpan} years</u>.
                        </div>
                    </div>
                `
            }
        ];
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
                height: 100%;
                z-index: 1000;
                opacity: 0;
                transition: opacity ${this.options.transitionDuration}ms ease-in-out;
                pointer-events: none;
                overflow: hidden;
            }
            
            .slideshow-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            
            .slideshow-overlay .reveal {
                width: 100%;
                height: 100%;
            }
            
            .slideshow-overlay .reveal .slides {
                width: 100%;
                height: 100%;
            }
            
            .slideshow-overlay .reveal .slides section {
                width: 100%;
                height: 100%;
                display: flex !important;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            
            .slide-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 1;
            }
            
            .slide-content-wrapper {
                position: relative;
                z-index: 2;
                color: white;
                padding: 8px 15px;
                width: 100%;
                height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
            }
            
            /* Tiger Reserve Slide Styles */
            .tiger-reserve-content {
                font-family: 'Source Sans Pro', sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                width: 100%;
            }
            
            .tiger-reserve-title {
                font-size: 18px;
                font-weight: 700;
                margin-bottom: 4px;
                text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
                letter-spacing: -0.2px;
                line-height: 1.1;
                color: white;
            }
            
            .tiger-reserve-update {
                font-size: 12px;
                font-weight: 400;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                line-height: 1.2;
                opacity: 0.95;
                color: white;
                margin: 0;
            }
            
            .tiger-reserve-link {
                color: rgba(255, 255, 255, 0.9);
                text-decoration: underline;
                font-weight: 600;
                transition: all 0.3s ease;
            }
            
            .tiger-reserve-link:hover {
                color: white;
                text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
            }
            
            /* Quote Slide Styles */
            .quote-content {
                font-family: 'Source Sans Pro', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                max-width: 600px;
            }
            
            .main-quote {
                font-size: 16px;
                font-style: italic;
                line-height: 1.3;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                margin: 0;
                padding: 0;
                border: none;
                color: white;
                text-align: center;
            }
            
            /* Stats Slide Styles */
            .stats-content {
                font-family: 'Source Sans Pro', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
            }
            
            .stats-text {
                font-size: 14px;
                font-weight: 600;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
                color: white;
                text-align: center;
            }
            
            /* Responsive styles for 150px banner height */
            @media (max-width: 768px) {
                .slide-content-wrapper {
                    padding: 6px 12px;
                    height: 150px;
                }
                
                .tiger-reserve-title {
                    font-size: 16px;
                    margin-bottom: 3px;
                }
                
                .tiger-reserve-update {
                    font-size: 11px;
                    line-height: 1.1;
                }
                
                .main-quote {
                    font-size: 14px;
                    line-height: 1.2;
                }
                
                .stats-text {
                    font-size: 12px;
                }
            }
            
            @media (max-width: 480px) {
                .slide-content-wrapper {
                    padding: 4px 8px;
                    height: 150px;
                }
                
                .tiger-reserve-title {
                    font-size: 14px;
                    margin-bottom: 2px;
                }
                
                .tiger-reserve-update {
                    font-size: 10px;
                    line-height: 1.1;
                }
                
                .main-quote {
                    font-size: 12px;
                    line-height: 1.2;
                }
                
                .stats-text {
                    font-size: 11px;
                }
            }
            
            /* Hide reveal.js default controls and progress */
            .slideshow-overlay .reveal .controls {
                display: none !important;
            }
            
            .slideshow-overlay .reveal .progress {
                display: none !important;
            }
            
            .slideshow-overlay .reveal .slide-number {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    async initializeReveal() {
        if (!window.Reveal) {
            console.error('Reveal.js not loaded');
            return;
        }
        
        // Get header dimensions for proper sizing (constrained to 150px height)
        const header = document.querySelector('header');
        const headerRect = header ? header.getBoundingClientRect() : { width: 800, height: 150 };
        // Ensure height is exactly 150px for banner consistency
        headerRect.height = 150;
        
        // Initialize reveal.js with scroll view
        this.reveal = new Reveal(this.overlay.querySelector('.reveal'), {
            // Scroll view configuration
            view: 'scroll',
            scrollProgress: false,
            scrollSnap: 'mandatory',
            scrollLayout: 'compact', // Use compact layout for banner style
            
            // Auto-slide configuration
            autoSlide: this.options.slideDuration,
            autoSlideStoppable: false,
            autoSlideMethod: 'next', // Ensure it moves to next slide
            
            // Disable controls
            controls: false,
            progress: false,
            center: true,
            touch: false,
            loop: false,
            keyboard: false,
            
            // Transitions
            transition: 'fade',
            transitionSpeed: 'default',
            
            // Constrained sizing for header banner
            width: headerRect.width,
            height: headerRect.height,
            margin: 0,
            minScale: 1,
            maxScale: 1,
            
            // Ensure slides are properly sized for banner
            disableLayout: false,
            embedded: true // Treat as embedded presentation
        });
        
        await this.reveal.initialize({
  view: 'scroll',

  // Force the scrollbar to remain visible
  scrollProgress: true,
  scrollSnap: 'mandatory',
  scrollLayout: 'compact',
  scrollSnap: 'mandatory',
  autoSlide: 5000,
  loop: true,
});
        
        // Listen for auto-slide events to detect when we reach the last slide
        this.reveal.on('autoslideresumed', () => {
            // Auto-slide has resumed
        });
        
        this.reveal.on('autoslidepaused', () => {
            // Check if we're on the last slide when auto-slide pauses (which happens at the end)
            const currentSlide = this.reveal.getIndices().h;
            const totalSlides = this.reveal.getTotalSlides();
            
            if (currentSlide === totalSlides - 1) {
                // We're on the last slide and auto-slide has paused, complete the slideshow
                this.autoSlideTimeoutId = setTimeout(() => {
                    this.completeSlideshow();
                }, this.options.slideDuration);
            }
        });
        
        // Also listen for slide changes as backup
        this.reveal.on('slidechanged', (event) => {
            const isLastSlide = event.indexh === this.reveal.getTotalSlides() - 1;
            
            if (isLastSlide) {
                // Schedule auto-hide after the last slide duration
                this.autoSlideTimeoutId = setTimeout(() => {
                    this.completeSlideshow();
                }, this.options.slideDuration);
            }
        });
        
        // Show overlay with fade in
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.classList.add('active');
            }
        }, 100);
    }
    
    completeSlideshow() {
        // Stop the slideshow and hide overlay
        this.stop();
        
        // Schedule next cycle
        this.scheduleNext();
    }
    
    scheduleNext() {
        // Schedule next slideshow cycle
        this.timeoutId = setTimeout(() => {
            this.start();
        }, this.options.timeout);
    }
    
    clearTimers() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.autoSlideTimeoutId) {
            clearTimeout(this.autoSlideTimeoutId);
            this.autoSlideTimeoutId = null;
        }
    }
    
    hideOverlay() {
        if (this.overlay) {
            this.overlay.classList.remove('active');
            
            // Destroy reveal.js instance
            if (this.reveal) {
                this.reveal.destroy();
                this.reveal = null;
            }
            
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
        if (this.reveal) {
            this.reveal.configure({ autoSlide: 0 });
        }
    }
    
    resume() {
        if (this.isActive && this.reveal) {
            this.reveal.configure({ autoSlide: this.options.slideDuration });
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