(function() {
    let newWorker;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        #updateNotification.hidden { display: none; }
        #updateNotification { 
            display: flex;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 100005;
            padding: 16px;
            pointer-events: none;
        }
        .mobile-update-card {
            width: 100%;
            background: #1a1a1a;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px 20px 0 0;
            padding: 24px 20px;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
            pointer-events: auto;
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.33, 1, 0.68, 1);
        }
        .mobile-update-card.show {
            transform: translateY(0);
        }
        .update-handle {
            width: 40px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            margin: -8px auto 20px;
        }
    `;
    document.head.appendChild(style);

    // Inject HTML
    const notificationHtml = `
        <div id="updateNotification" class="hidden">
            <div class="mobile-update-card" id="updateCard">
                <div class="update-handle"></div>
                <div class="flex items-start gap-4 mb-6">
                    <div class="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                        <span class="material-symbols-outlined text-white text-2xl">system_update</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-white font-bold text-lg leading-tight">App Update Available</h4>
                        <p class="text-gray-400 text-sm mt-1">A newer version is ready with performance fixes and new features.</p>
                    </div>
                </div>
                <div class="flex flex-col gap-3">
                    <button id="applyUpdateBtn" 
                        class="w-full py-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-base font-bold transition-all shadow-lg shadow-blue-900/20 uppercase tracking-wider">
                        Update & Restart
                    </button>
                    <button id="closeUpdateBtn" 
                        class="w-full py-3 rounded-xl bg-transparent text-gray-400 text-sm font-medium transition-colors">
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', notificationHtml);

    const notification = document.getElementById('updateNotification');
    const updateCard = document.getElementById('updateCard');
    const closeBtn = document.getElementById('closeUpdateBtn');
    const applyBtn = document.getElementById('applyUpdateBtn');

    function showUpdateNotification() {
        if (notification && updateCard) {
            notification.classList.remove('hidden');
            // Force reflow
            updateCard.offsetHeight;
            updateCard.classList.add('show');
            
            // Haptic feedback if available (standard for Android)
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([10, 30, 10]);
            }
        }
    }

    function reloadToUpdate() {
        if (newWorker) {
            newWorker.postMessage({ action: 'skipWaiting' });
        } else {
            window.location.reload();
        }
    }

    closeBtn.addEventListener('click', () => {
        updateCard.classList.remove('show');
        setTimeout(() => notification.classList.add('hidden'), 400);
    });

    applyBtn.addEventListener('click', reloadToUpdate);

    if ('serviceWorker' in navigator) {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('✅ [PWA] Service Worker registered:', registration);
                    
                    // Check for updates immediately
                    registration.update();

                    if (registration.waiting) {
                        console.log('🔄 [PWA] Update waiting found on load');
                        newWorker = registration.waiting;
                        showUpdateNotification();
                    }

                    // Poll for updates every 15 minutes
                    setInterval(() => {
                        console.log('🔍 [PWA] Checking for updates...');
                        registration.update();
                    }, 1000 * 60 * 15);

                    registration.addEventListener('updatefound', () => {
                        console.log('🆕 [PWA] New update found, installing...');
                        newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            console.log('⚙️ [PWA] Worker state changed:', newWorker.state);
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('✨ [PWA] Update installed and ready');
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log('Service Worker registration failed:', error);
                });
        });
    }

    // Offline Detection
    window.addEventListener('offline', function() {
        console.log('🔴 [OFFLINE] Connection lost. Current page:', window.location.href);
        if (!window.location.href.includes('offline.html')) {
            console.log('📘 [OFFLINE] Navigating to offline.html');
            window.location.href = './offline.html';
        }
    });

    window.addEventListener('online', function() {
        console.log('🟢 [ONLINE] Connection restored!');
        if (window.location.href.includes('offline.html')) {
            const previousUrl = sessionStorage.getItem('previousPageUrl') || './home.html';
            console.log('📘 [ONLINE] Redirecting to:', previousUrl);
            window.location.href = previousUrl;
        }
    });

    setInterval(() => {
        if (!navigator.onLine && !window.location.href.includes('offline.html')) {
            console.log('🔴 [FALLBACK] Offline detected via polling, redirecting...');
            window.location.href = './offline.html';
        }
    }, 30000);
})();
