/**
 * Page Tracker - Tracks the current page URL for offline navigation
 * Automatically saves the current page when online and allows restoration when connection is restored
 */

(function() {
    'use strict';

    // Save current page URL to sessionStorage when online
    function trackCurrentPage() {
        if (navigator.onLine) {
            sessionStorage.setItem('previousPageUrl', window.location.href);
            console.log('Page tracked:', window.location.href);
        }
    }

    // Track page on initial load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', trackCurrentPage);
    } else {
        trackCurrentPage();
    }

    // Track page on navigation
    window.addEventListener('beforeunload', trackCurrentPage);

    // Track page when connection is restored
    window.addEventListener('online', trackCurrentPage);

    // Listen for hash changes (single page app navigation)
    window.addEventListener('hashchange', trackCurrentPage);

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', trackCurrentPage);

    // Export function to get previous page URL
    window.getPreviousPageUrl = function() {
        const previousUrl = sessionStorage.getItem('previousPageUrl');
        return previousUrl || '/';
    };

})();
