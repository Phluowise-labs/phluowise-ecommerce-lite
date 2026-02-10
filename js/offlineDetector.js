/**
 * Offline Detector - Universal offline detection for all pages
 * Include this on every page: <script src="js/offlineDetector.js"></script>
 */

(function() {
    'use strict';

    console.log('📡 [OFFLINE-DETECTOR] Initialized on page:', window.location.href);

    // Proactive offline detection - immediately show offline page when connection drops
    window.addEventListener('offline', function() {
        console.log('🔴 [OFFLINE] Connection lost. Current page:', window.location.href);
        // Only navigate if not already on offline.html
        if (!window.location.href.includes('offline.html')) {
            console.log('📘 [OFFLINE] Navigating to offline.html');
            window.location.href = './offline.html';
        }
    });

    // Listen for connection restoration
    window.addEventListener('online', function() {
        console.log('🟢 [ONLINE] Connection restored!');
        // If on offline page, redirect to tracked page
        if (window.location.href.includes('offline.html')) {
            const previousUrl = sessionStorage.getItem('previousPageUrl') || './home.html';
            console.log('📘 [ONLINE] Redirecting to:', previousUrl);
            window.location.href = previousUrl;
        }
    });

    // Fallback: Check connection status every 30 seconds
    // This catches offline events that don't fire properly
    setInterval(() => {
        if (!navigator.onLine && !window.location.href.includes('offline.html')) {
            console.log('🔴 [FALLBACK] Offline detected via polling, redirecting...');
            window.location.href = './offline.html';
        }
    }, 30000);

})();
