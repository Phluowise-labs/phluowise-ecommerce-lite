/**
 * Pull-to-Refresh Module
 * Provides a native-like pull-to-refresh experience for the mobile app.
 */

(function() {
    'use strict';

    let startY = 0;
    let refreshing = false;
    const threshold = 150;
    let pullContainer = null;

    function init() {
        // Only initialize on scrollable containers or body
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        
        // Create indicator element
        createIndicator();
    }

    function createIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'pull-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: -60px;
            left: 50%;
            transform: translateX(-50%);
            width: 40px;
            height: 40px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            transition: transform 0.2s;
        `;
        indicator.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007ACC" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
        `;
        document.body.appendChild(indicator);
    }

    function handleTouchStart(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].pageY;
        }
    }

    function handleTouchMove(e) {
        if (refreshing || window.scrollY > 0) return;
        
        const y = e.touches[0].pageY;
        const diff = y - startY;

        if (diff > 0) {
            const indicator = document.getElementById('pull-indicator');
            if (indicator) {
                const translate = Math.min(diff / 2, threshold);
                indicator.style.top = `${translate - 60}px`;
                indicator.style.transform = `translateX(-50%) rotate(${diff}deg)`;
                
                if (diff > threshold) {
                    indicator.style.opacity = '1';
                } else {
                    indicator.style.opacity = '0.7';
                }
            }
        }
    }

    function handleTouchEnd(e) {
        if (refreshing || window.scrollY > 0) return;
        
        const y = e.changedTouches[0].pageY;
        const diff = y - startY;
        const indicator = document.getElementById('pull-indicator');

        if (diff > threshold) {
            startRefresh();
        } else if (indicator) {
            indicator.style.top = '-60px';
        }
        
        startY = 0;
    }

    function startRefresh() {
        refreshing = true;
        const indicator = document.getElementById('pull-indicator');
        if (indicator) {
            indicator.style.top = '20px';
            indicator.classList.add('animate-spin');
        }

        // Simulate refresh
        setTimeout(() => {
            stopRefresh();
            window.location.reload();
        }, 1000);
    }

    function stopRefresh() {
        refreshing = false;
        const indicator = document.getElementById('pull-indicator');
        if (indicator) {
            indicator.style.top = '-60px';
            indicator.classList.remove('animate-spin');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
