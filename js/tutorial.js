/**
 * Interactive Tutorial Module for Phluowise
 * Features emotional animations and guided walkthroughs.
 */

class PhluowiseTutorial {
    constructor(steps, forceKey = null) {
        this.steps = steps;
        this.currentStep = 0;
        this.overlay = null;
        this.highlight = null;
        this.box = null;
        this.activeTarget = null;
        this.originalZIndex = '';
        this.originalPosition = '';
        this.forceKey = forceKey;
        this.init();
    }

    init() {
        // Create tutorial elements
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        
        this.highlight = document.createElement('div');
        this.highlight.className = 'tutorial-highlight pulsing';
        
        this.box = document.createElement('div');
        this.box.className = 'tutorial-box';
        
        this.overlay.appendChild(this.highlight);
        this.overlay.appendChild(this.box);
        document.body.appendChild(this.overlay);

        // Check if tutorial should be shown
        const pageKey = window.location.pathname.split('/').pop().replace('.html', '');
        const hasSeenTutorial = localStorage.getItem(`hasSeen${pageKey}Tutorial`);
        const forceTutorial = this.forceKey ? localStorage.getItem(this.forceKey) === 'true' : false;

        if (!hasSeenTutorial || forceTutorial) {
            if (forceTutorial && this.forceKey) {
                localStorage.removeItem(this.forceKey);
            }
            // Wait for elements to be rendered
            setTimeout(() => this.start(), 2000);
        }
    }

    start() {
        this.overlay.classList.add('active');
        this.showStep(0);
    }

    showStep(index) {
        if (index >= this.steps.length) {
            this.finish();
            return;
        }

        if (this.activeTarget) {
            this.activeTarget.style.zIndex = this.originalZIndex;
            this.activeTarget.style.position = this.originalPosition;
        }

        this.currentStep = index;
        const step = this.steps[index];
        const target = document.querySelector(step.selector);
        
        if (!target) {
            console.warn(`Tutorial target not found: ${step.selector}`);
            this.next();
            return;
        }

        // Boost target element z-index
        this.activeTarget = target;
        this.originalZIndex = target.style.zIndex;
        this.originalPosition = target.style.position;
        target.style.zIndex = '2147483647';
        if (!['absolute', 'fixed', 'sticky'].includes(window.getComputedStyle(target).position)) {
            target.style.position = 'relative';
        }

        // Update content
        this.box.innerHTML = `
            <div class="tutorial-icon">${step.icon || '✨'}</div>
            <div class="tutorial-title">${step.title}</div>
            <div class="tutorial-text">${step.content}</div>
            <div class="tutorial-footer">
                <div class="tutorial-steps">Step ${index + 1} of ${this.steps.length}</div>
                <div class="tutorial-buttons">
                    <button class="tutorial-btn tutorial-btn-skip" onclick="window.phTutorial.finish()">Skip</button>
                    <button class="tutorial-btn tutorial-btn-next" onclick="window.phTutorial.next()">
                        ${index === this.steps.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        `;

        // Adjust position with small delay for accuracy after scrolling
        setTimeout(() => {
            this.updateHighlight(target); 
            this.adjustBoxPosition(target);
        }, 100);
        
        // Scroll into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateHighlight(element) {
        const rect = element.getBoundingClientRect();
        const padding = 10;
        
        this.highlight.style.width = `${rect.width + padding * 2}px`;
        this.highlight.style.height = `${rect.height + padding * 2}px`;
        this.highlight.style.top = `${rect.top - padding}px`;
        this.highlight.style.left = `${rect.left - padding}px`;
    }

    adjustBoxPosition(target) {
        const rect = target.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        if (rect.top > windowHeight / 2) {
            this.box.style.bottom = 'auto';
            this.box.style.top = '140px'; 
        } else {
            this.box.style.top = 'auto';
            this.box.style.bottom = '100px'; 
        }
    }

    next() {
        this.showStep(this.currentStep + 1);
    }

    finish() {
        if (this.activeTarget) {
            this.activeTarget.style.zIndex = this.originalZIndex;
            this.activeTarget.style.position = this.originalPosition;
        }
        this.overlay.classList.remove('active');
        const pageKey = window.location.pathname.split('/').pop().replace('.html', '');
        localStorage.setItem(`hasSeen${pageKey}Tutorial`, 'true');
        setTimeout(() => {
            this.overlay.remove();
        }, 500);
    }
}

// Define the tutorial steps for Schedule History
const historyTutorialSteps = [
    {
        selector: '.header-bar h1',
        title: 'Schedule History',
        content: 'Welcome! This is where you can track all your past and upcoming water deliveries.',
        icon: '🌊'
    },
    {
        selector: '.status-tabs',
        title: 'Quick Filters',
        content: 'Easily switch between Ongoing, Denied, and Completed orders to stay organized.',
        icon: '📊'
    },
    {
        selector: '#floatingBottleBtn',
        title: 'Manage Returns',
        content: 'Have empty dispensers? Tap here to request a bottle return pickup anytime.',
        icon: '♻️'
    },
    {
        selector: '#floatingFilterBtn',
        title: 'Advanced Search',
        content: 'Need to find something specific? Use advanced filters to sort by date, price, or payment method.',
        icon: '🔍'
    },
    {
        selector: '#loadingSkeleton, .schedule-card',
        title: 'Your Orders',
        content: 'All your order details, receipts, and status updates appear right here in real-time.',
        icon: '📋'
    }
];

// Define the tutorial steps for Services Page
const servicesTutorialSteps = [
    {
        selector: '.header-bar h1, .w-full h1',
        title: 'Book a Service',
        content: 'Ready for fresh water? Let\'s walk through the booking process.',
        icon: '✨'
    },
    {
        selector: '.product-grid, .swipe-product-item',
        title: 'Select Products',
        content: 'Browse our range of premium water and dispenser products. Tap to select!',
        icon: '💧'
    },
    {
        selector: '.recipient-type-container',
        title: 'Who is it for?',
        content: 'Choose between personal delivery or business delivery for tailored options.',
        icon: '👤'
    },
    {
        selector: '.nav-btn.next',
        title: 'Easy Navigation',
        content: 'Use these buttons to move through the steps: Products → Details → Payment.',
        icon: '🚀'
    },
    {
        selector: '.payment-method-card',
        title: 'Secure Payment',
        content: 'Select your preferred payment method. We support Mobile Money and Cash on Delivery.',
        icon: '💳'
    }
];

// Initialize when the script loads
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('schedule-history.html')) {
        window.phTutorial = new PhluowiseTutorial(historyTutorialSteps, 'forceHistoryTutorial');
    } else if (path.includes('services.html')) {
        window.phTutorial = new PhluowiseTutorial(servicesTutorialSteps, 'forceServicesTutorial');
    }
});
