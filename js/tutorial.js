/**
 * Interactive Tutorial Module for Phluowise
 * Features emotional animations, guided walkthroughs, and a Tutorial Hub.
 * Automatically injects the Hub button into the sliding menu.
 */

class PhluowiseTutorial {
    constructor(steps = [], forceKey = null) {
        this.steps = steps;
        this.currentStep = 0;
        this.overlay = null;
        this.highlight = null;
        this.box = null;
        this.activeTarget = null;
        this.originalZIndex = '';
        this.originalPosition = '';
        this.forceKey = forceKey;
        
        this.hubOverlay = null;
        
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

        // Create Hub
        this.createHub();
        
        // Auto-inject Hub button into menu
        this.injectMenuButton();

        // Check if tutorial should be shown
        const path = window.location.pathname;
        const pageKey = path.split('/').pop().replace('.html', '') || 'home';
        
        // Check for specific parts (Services Part 1 vs Part 2)
        const forceTutorialPart1 = localStorage.getItem('forceServicesTutorialPart1') === 'true';
        const forceTutorialPart2 = localStorage.getItem('forceServicesTutorialPart2') === 'true';
        
        const hasSeenTutorial = localStorage.getItem(`hasSeen${pageKey}Tutorial`);
        const forceTutorial = this.forceKey ? localStorage.getItem(this.forceKey) === 'true' : false;

        if (path.includes('services.html')) {
            if (forceTutorialPart1) {
                this.steps = servicesTutorialSteps1;
                localStorage.removeItem('forceServicesTutorialPart1');
                setTimeout(() => this.start(), 2000);
            } else if (forceTutorialPart2) {
                this.steps = servicesTutorialSteps2;
                localStorage.removeItem('forceServicesTutorialPart2');
                setTimeout(() => this.start(), 2000);
            } else if (!hasSeenTutorial || forceTutorial) {
                if (forceTutorial) localStorage.removeItem(this.forceKey);
                this.steps = servicesTutorialSteps1; // Default to Part 1
                setTimeout(() => this.start(), 2000);
            }
        } else if (this.steps.length > 0 && (!hasSeenTutorial || forceTutorial)) {
            if (forceTutorial && this.forceKey) {
                localStorage.removeItem(this.forceKey);
            }
            setTimeout(() => this.start(), 2000);
        }
    }

    createHub() {
        if (document.querySelector('.tutorial-hub-overlay')) return;

        this.hubOverlay = document.createElement('div');
        this.hubOverlay.className = 'tutorial-hub-overlay';
        this.hubOverlay.onclick = (e) => {
            if (e.target === this.hubOverlay) this.closeHub();
        };

        this.hubOverlay.innerHTML = `
            <div class="tutorial-hub-modal">
                <div class="tutorial-hub-title">Tutorial Hub</div>
                <div class="tutorial-hub-subtitle">Choose a guide to help you navigate Phluowise</div>
                
                <div class="tutorial-hub-list">
                    <div class="tutorial-hub-item" onclick="window.triggerTutorial('services.html', 1)">
                        <div class="tutorial-hub-icon icon-blue">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div class="tutorial-hub-info">
                            <div class="tutorial-hub-name">Service Tutorial 1</div>
                            <div class="tutorial-hub-desc">Product discovery & selection</div>
                        </div>
                    </div>

                    <div class="tutorial-hub-item" onclick="window.triggerTutorial('services.html', 2)">
                        <div class="tutorial-hub-icon icon-blue">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <div class="tutorial-hub-info">
                            <div class="tutorial-hub-name">Service Tutorial 2</div>
                            <div class="tutorial-hub-desc">Checkout & Payment process</div>
                        </div>
                    </div>
                    
                    <div class="tutorial-hub-item" onclick="window.triggerTutorial('schedule-history.html')">
                        <div class="tutorial-hub-icon icon-green">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div class="tutorial-hub-info">
                            <div class="tutorial-hub-name">Order History</div>
                            <div class="tutorial-hub-desc">Track your deliveries and returns</div>
                        </div>
                    </div>

                    <div class="tutorial-hub-item" onclick="window.triggerTutorial('home.html')">
                        <div class="tutorial-hub-icon icon-purple">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <div class="tutorial-hub-info">
                            <div class="tutorial-hub-name">Dashboard Overview</div>
                            <div class="tutorial-hub-desc">Quick guide to your main screen</div>
                        </div>
                    </div>
                </div>
                
                <button class="tutorial-hub-close" onclick="window.phTutorial.closeHub()">Close</button>
            </div>
        `;

        document.body.appendChild(this.hubOverlay);
    }

    injectMenuButton() {
        const menuList = document.querySelector('.sliding-menu .rounded-\\[15px\\]');
        if (!menuList) return;

        // Check if button already exists
        if (menuList.innerText.includes('App Tutorial')) return;

        const tutorialBtn = document.createElement('button');
        tutorialBtn.onclick = () => {
            this.showHub();
            if (window.closeMenu) window.closeMenu();
        };
        tutorialBtn.className = 'w-full h-[60px] flex flex-row justify-between items-center px-6 border-b border-[#3A3B3F]';
        tutorialBtn.style.backgroundColor = 'var(--bg-third, #101010)';
        
        tutorialBtn.innerHTML = `
            <div class="flex flex-row items-center gap-[30px]">
                <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-white text-lg font-semibold">App Tutorial</span>
            </div>
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
        `;

        const profileLink = Array.from(menuList.querySelectorAll('a, button')).find(el => el.innerText.includes('Profile') || el.innerText.includes('Theme'));
        if (profileLink) {
            profileLink.after(tutorialBtn);
        } else {
            menuList.appendChild(tutorialBtn);
        }
    }

    showHub() {
        if (this.hubOverlay) this.hubOverlay.classList.add('active');
    }

    closeHub() {
        if (this.hubOverlay) this.hubOverlay.classList.remove('active');
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

        this.activeTarget = target;
        this.originalZIndex = target.style.zIndex;
        this.originalPosition = target.style.position;
        target.style.zIndex = '2147483647';
        if (!['absolute', 'fixed', 'sticky'].includes(window.getComputedStyle(target).position)) {
            target.style.position = 'relative';
        }

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

        setTimeout(() => {
            this.updateHighlight(target); 
            this.adjustBoxPosition(target);
        }, 100);
        
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
        const path = window.location.pathname;
        const pageKey = path.split('/').pop().replace('.html', '') || 'home';
        localStorage.setItem(`hasSeen${pageKey}Tutorial`, 'true');
        setTimeout(() => {
            this.overlay.remove();
        }, 500);
    }
}

// Global Trigger Helper
window.triggerTutorial = function(page, part = null) {
    let flagName = 'forceHistoryTutorial';
    if (page.includes('services')) {
        if (part === 1) flagName = 'forceServicesTutorialPart1';
        else if (part === 2) flagName = 'forceServicesTutorialPart2';
        else flagName = 'forceServicesTutorial';
    }
    if (page.includes('home')) flagName = 'forceHomeTutorial';
    
    localStorage.setItem(flagName, 'true');
    window.location.href = page;
}

// Tutorial Steps Definitions
const historyTutorialSteps = [
    { selector: '.header-bar h1', title: 'Schedule History', content: 'Track all your deliveries.', icon: '🌊' },
    { selector: '.status-tabs', title: 'Quick Filters', content: 'Organize by status.', icon: '📊' },
    { selector: '#floatingBottleBtn', title: 'Manage Returns', content: 'Request return pickups.', icon: '♻️' },
    { selector: '#loadingSkeleton, .schedule-card', title: 'Your Orders', content: 'Real-time updates.', icon: '📋' }
];

const servicesTutorialSteps1 = [
    { selector: '.header-bar h1, .w-full h1', title: 'Service Tutorial 1', content: 'Welcome! Let\'s find the perfect water service for you.', icon: '✨' },
    { selector: '.product-grid, .swipe-product-item', title: 'Select Products', content: 'Browse our range of premium water and dispenser products.', icon: '💧' },
    { selector: '.recipient-type-container', title: 'Who is it for?', content: 'Choose between personal delivery or business delivery.', icon: '👤' }
];

const servicesTutorialSteps2 = [
    { selector: '.form-input, #deliverySection', title: 'Service Tutorial 2', content: 'Almost done! Tell us where to deliver your fresh water.', icon: '📍' },
    { selector: '.nav-btn.next', title: 'Easy Navigation', content: 'Use these buttons to move through the final booking steps.', icon: '🚀' },
    { selector: '.payment-method-card', title: 'Secure Payment', content: 'Select your preferred payment method to finalize.', icon: '💳' }
];

const homeTutorialSteps = [
    { selector: '.header-bar', title: 'Welcome Home', content: 'Your dashboard overview.', icon: '🏠' },
    { selector: '.search-container', title: 'Find Companies', content: 'Search for local suppliers.', icon: '🔍' },
    { selector: '.tab-bar', title: 'Quick Access', content: 'Switch between main areas.', icon: '📱' }
];

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    let steps = [];
    let forceKey = null;

    if (path.includes('schedule-history.html')) {
        steps = historyTutorialSteps;
        forceKey = 'forceHistoryTutorial';
    } else if (path.includes('services.html')) {
        // Handled in init() for parts
    } else if (path.includes('home.html') || path.endsWith('/')) {
        steps = homeTutorialSteps;
        forceKey = 'forceHomeTutorial';
    }

    window.phTutorial = new PhluowiseTutorial(steps, forceKey);
});
