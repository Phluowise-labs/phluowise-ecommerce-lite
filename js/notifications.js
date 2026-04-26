// Schedule History Notification System
// Prevent redeclaration
if (typeof window.ScheduleNotificationManager !== 'undefined') {
    // console.log('🔔 Notification system already loaded, skipping initialization...');
} else {

    // Global timestamp to prevent sound on page load
    window.lastPageLoadTime = Date.now();

    class ScheduleNotificationManager {
        constructor() {
            this.orders = [];
            this.notificationContainers = []; // Support multiple containers
            this.lastNotificationState = ''; // Track last notification state to prevent repeated sounds
            this.soundPlayedForCurrentState = false; // Track if sound has been played for current state
            this.init();
        }

        init() {
            // console.log('🚀 Initializing notification manager...');
            // Load orders from localStorage
            this.loadOrders();

            // Initialize notification container when DOM is ready
            if (document.readyState === 'loading') {
                // console.log('📄 DOM still loading, waiting for DOMContentLoaded...');
                document.addEventListener('DOMContentLoaded', () => {
                    // console.log('📄 DOMContentLoaded fired, setting up notifications...');
                    this.setupNotifications();
                });
            } else {
                // console.log('📄 DOM already loaded, setting up notifications immediately...');
                this.setupNotifications();
            }

            // Listen for storage changes (cross-tab synchronization)
            window.addEventListener('storage', (e) => {
                // console.log('🔄 Storage event detected:', e.key);
                if (e.key === 'phluowiseOrders') {
                    // console.log('📦 Orders updated in storage, reloading...');
                    this.loadOrders();
                    this.updateNotifications();
                }
            });

            // Check for order updates periodically
            setInterval(() => {
                // console.log('⏰ Periodic check for order updates...');
                this.loadOrders();
                this.checkCompanies();
                this.updateNotifications();
            }, 2000);

            // Initial check for companies
            this.checkCompanies();

            // // console.log('✅ Notification manager initialization complete');
        }

        playBellSound() {
            // Prevent sound if page was loaded recently (within last 3 seconds)
            const timeSincePageLoad = Date.now() - window.lastPageLoadTime;
            if (timeSincePageLoad < 3000) {
                // console.log('🔕 Skipping sound during page load window');
                return;
            }

            // Create audio context for bell sound
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // Create a simple bell-like sound using Web Audio API
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                // Bell sound parameters
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Start frequency
                oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1); // Rise
                oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3); // Fall

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                // Fallback to HTML5 audio if Web Audio API fails
                try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
                    audio.volume = 0.3;
                    audio.play().catch(e => console.log('Audio play failed:', e));
                } catch (fallbackError) {
                    // Silent fail if audio doesn't work
                }
            }
        }

        loadOrders() {
            // console.log('📥 Loading orders from localStorage...');
            try {
                const savedOrders = localStorage.getItem('phluowiseOrders');
                // console.log('📦 Raw localStorage data:', savedOrders);

                if (savedOrders) {
                    this.orders = JSON.parse(savedOrders);
                    // console.log('✅ Successfully parsed orders:', this.orders.length, 'orders loaded');
                    // console.log('📋 Order details:', this.orders.map(o => ({
                    //     id: o.orderId,
                    //     company: o.company,
                    //     status: o.status,
                    //     statusText: o.statusText
                    // })));
                } else {
                    // console.log('⚠️ No orders found in localStorage');
                    this.orders = [];
                }
            } catch (error) {
                // console.error('❌ Error loading orders:', error);
                this.orders = [];
            }
        }

        checkCompanies() {
            try {
                let companiesData = null;
                if (window.cacheManager) {
                    companiesData = window.cacheManager.getCache('companies');
                } else {
                    const cached = localStorage.getItem('phluowise_companies__1.0');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        companiesData = parsed.data;
                    }
                }

                if (companiesData && Array.isArray(companiesData)) {
                    const currentCount = companiesData.length;
                    const savedCount = parseInt(localStorage.getItem('phluowiseKnownCompaniesCount') || '0', 10);

                    if (savedCount > 0 && currentCount > savedCount) {
                        // New company added!
                        const numNew = currentCount - savedCount;
                        // Assuming newest companies are at index 0 based on appwrite desc sort
                        const newCompanies = companiesData.slice(0, numNew);

                        this.playBellSound();
                        this.sendSystemPushNotification(['new_company']);

                        if (newCompanies.length > 0) {
                            this.showNewCompaniesModal(newCompanies);
                        }
                    }

                    // Update the saved count
                    if (currentCount !== savedCount) {
                        localStorage.setItem('phluowiseKnownCompaniesCount', currentCount.toString());
                    }
                }
            } catch (error) {
                // Silently fail if cache is unavailable or malformed
            }
        }

        showNewCompaniesModal(companies) {
            // Prevent multiple modals
            const existingModal = document.getElementById('newCompaniesModal');
            if (existingModal) existingModal.remove();

            // 1. Create wrapper
            const modal = document.createElement('div');
            modal.id = 'newCompaniesModal';
            modal.className = 'fixed inset-0 flex flex-col items-center justify-center';
            modal.style.cssText = 'z-index: 9999; background: rgba(0,0,0,0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); opacity: 0; transition: opacity 0.4s ease-out;';

            // 2. HTML Structure
            let cardsHTML = '';
            companies.forEach((company, index) => {
                const name = company.name_of_company || company.name || 'New Water Company';
                const location = company.state || company.location || 'Your Area';
                const imgUrl = company.profile_image || company.header_image || company.image_url || company.logo || 'images/logo.png';
                const rating = (company.company_rating || company.average_rating) ? parseFloat(company.company_rating || company.average_rating).toFixed(1) : 'New';

                cardsHTML += `
                <div class="stacked-company-card absolute top-0 w-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 cursor-pointer"
                     data-index="${index}"
                     style="background-color: var(--model-bg, #101010); border: 1px solid var(--model-border, #DADADA); z-index: ${(companies.length - index)};">
                    
                    <div class="w-full relative" style="height: 180px;">
                        <img src="${imgUrl}" alt="${name}" class="w-full h-full object-cover" onerror="this.src='images/logo.png'">
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" style="background: linear-gradient(to top, #101010, transparent);"></div>
                        <div class="absolute text-white font-bold flex items-center justify-center transition-all"
                             style="top: 14px; right: 14px; font-size: 13px; padding: 6px 12px; gap: 6px; border-radius: 12px; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                            <svg style="width: 15px; height: 15px; color: #FBBF24; filter: drop-shadow(0 0 3px rgba(251,191,36,0.6));" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                            <span style="text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${rating}</span>
                        </div>
                    </div>
                    
                    <div class="relative text-center flex flex-col items-center" style="padding: 24px;">
                        <h3 class="text-white font-bold mb-2 whitespace-nowrap overflow-hidden text-ellipsis w-full" style="font-size: 24px;">${name}</h3>
                        <div class="flex items-center justify-center text-gray-400 mb-6" style="font-size: 15px;">
                            <svg class="mr-2 text-blue-500" style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            ${location}
                        </div>
                        
                        <a href="services.html" class="block w-full font-semibold transition-all backdrop-blur-md" 
                           style="padding: 14px 0; border-radius: 12px; background: linear-gradient(135deg, rgba(59, 116, 255, 0.35), rgba(59, 116, 255, 0.1)); border: 1px solid rgba(59, 116, 255, 0.5); box-shadow: 0 8px 32px rgba(59, 116, 255, 0.2); color: #E5F0FF; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                            Order Now
                        </a>
                    </div>
                </div>
            `;
            });

            modal.innerHTML = `
            <!-- Pulse Effect -->
            <div class="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                <div class="rounded-full animate-pulse" style="width: 80vw; height: 80vw; background-color: rgba(37,99,235,0.1); filter: blur(80px);"></div>
            </div>

            <!-- Header -->
            <div class="w-full text-center px-4 z-10 absolute transition-all duration-500 ease-out" id="newCompanyModalHeader" style="top: 10%; transform: translateY(-20px); opacity: 0;">
                <h2 class="font-extrabold text-white mb-2 tracking-tight" style="font-size: 30px;">New Suppliers</h2>
                <p class="mx-auto" style="font-size: 15px; color: var(--text-gray, #A0A0A0); max-width: 280px;">Tap a card to continue exploring.</p>
            </div>

            <!-- Stacked Deck Container -->
            <div class="relative z-10" id="deckContainer" style="width: 85%; max-width: 320px; height: 380px; margin-top: 15vh;">
                ${cardsHTML}
            </div>
            
            <!-- Deck Progress Indicators -->
            <div class="flex justify-center flex-row z-10" id="deckIndicators" style="gap: 8px; margin-top: 32px;">
                ${companies.map((_, i) => '<div class="rounded-full transition-all duration-300" style="' + (i === 0 ? 'background-color: #3B74FF; width: 20px; height: 8px;' : 'background-color: #40444B; width: 8px; height: 8px;') + '"></div>').join('')}
            </div>

            <!-- Close Button -->
            <button onclick="document.getElementById('newCompaniesModal').style.opacity='0'; setTimeout(()=>document.getElementById('newCompaniesModal').remove(), 400);" 
                    class="absolute z-20 flex items-center justify-center rounded-full text-white backdrop-blur-md border transition-all"
                    style="top: 24px; right: 24px; width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        `;

            document.body.appendChild(modal);

            // Stacked Deck Logic
            const cards = modal.querySelectorAll('.stacked-company-card');
            const indicators = modal.querySelectorAll('#deckIndicators > div');
            let currentIndex = 0;

            function updateDeck() {
                cards.forEach((card, i) => {
                    const diff = i - currentIndex;

                    if (diff === 0) {
                        // Active front card
                        card.style.transform = 'translateY(0) scale(1)';
                        card.style.opacity = '1';
                        card.style.zIndex = '10';
                        card.style.pointerEvents = 'auto';
                    } else if (diff === 1) {
                        // Second card behind
                        card.style.transform = 'translateY(-20px) scale(0.92)';
                        card.style.opacity = '0.9';
                        card.style.zIndex = '9';
                        card.style.pointerEvents = 'none';
                    } else if (diff === 2) {
                        // Third card behind
                        card.style.transform = 'translateY(-40px) scale(0.84)';
                        card.style.opacity = '0.6';
                        card.style.zIndex = '8';
                        card.style.pointerEvents = 'none';
                    } else if (diff > 2) {
                        // Hidden deeply behind
                        card.style.transform = 'translateY(-50px) scale(0.8)';
                        card.style.opacity = '0';
                        card.style.zIndex = '1';
                        card.style.pointerEvents = 'none';
                    } else {
                        // Swiped away / Next card (Diff < 0)
                        card.style.transform = 'translateY(100px) scale(0.8)';
                        card.style.opacity = '0';
                        card.style.zIndex = '1';
                        card.style.pointerEvents = 'none';
                    }
                });

                // Update Indicators
                indicators.forEach((dot, i) => {
                    if (i === currentIndex) {
                        dot.style.backgroundColor = '#3B74FF';
                        dot.style.width = '20px';
                    } else {
                        dot.style.backgroundColor = '#40444B';
                        dot.style.width = '8px';
                    }
                });
            }

            // Add Click listener to cycle deck
            cards.forEach(card => {
                card.addEventListener('click', (e) => {
                    // If they click the Link, let it navigate. Otherwise advance card
                    if (e.target.tagName !== 'A') {
                        if (currentIndex < cards.length - 1) {
                            currentIndex++;
                            updateDeck();
                        } else if (currentIndex === cards.length - 1) {
                            // Resets to beginning when clicking last card
                            currentIndex = 0;
                            updateDeck();
                        }
                    }
                });
            });

            // Initialize positions instantly before animating in
            cards.forEach(card => card.style.transition = 'none');
            updateDeck();
            // Restore transitions
            setTimeout(() => {
                cards.forEach(card => card.style.transition = 'all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)');
            }, 50);

            // Animate In using requestAnimationFrame to ensure the DOM is painted first
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.style.opacity = '1';
                    setTimeout(() => {
                        document.getElementById('newCompanyModalHeader').style.transform = 'translateY(0)';
                        document.getElementById('newCompanyModalHeader').style.opacity = '1';
                    }, 100);
                });
            });
        }

        setupNotifications() {
            // console.log('🔧 Setting up notifications...');

            // Clear existing containers
            this.notificationContainers = [];

            // Debug: Show ALL links on the page
            const allLinks = document.querySelectorAll('a');
            // console.log('🔍 Total links found on page:', allLinks.length);

            // Show all links that contain "schedule" in any form
            const scheduleLinks = Array.from(allLinks).filter(link =>
                link.href.includes('schedule') ||
                link.textContent.toLowerCase().includes('schedule')
            );
            // console.log('🔍 Schedule-related links found:', scheduleLinks.length);
            scheduleLinks.forEach((link, index) => {
                // console.log(`  Link ${index}: href="${link.href}" text="${link.textContent.trim()}"`);
            });

            // Find ALL schedule history links (both menu and bottom navigation)
            const selectors = [
                'a[href="schedule-history.html"]', // Direct match
                '.tab-bar a[href*="schedule-history"]', // Bottom navigation specific
                'a[href*="schedule-history"]', // Contains schedule-history
                'a[href="./schedule-history.html"]', // Relative path
                'a[href="../schedule-history.html"]', // Parent relative path
                'a[href*="schedule"]' // Last resort: any schedule link
            ];

            const allScheduleLinks = new Set(); // Use Set to avoid duplicates

            for (const selector of selectors) {
                const links = document.querySelectorAll(selector);
                // console.log(`🔍 Trying selector "${selector}": found ${links.length} links`);

                links.forEach(link => {
                    allScheduleLinks.add(link);
                });
            }

            // console.log(`🔍 Total unique schedule links found: ${allScheduleLinks.size}`);

            // Setup notification containers for all found links
            let containerIndex = 0;
            allScheduleLinks.forEach(link => {
                const location = link.closest('.tab-bar') ? 'Bottom Navigation' :
                    link.closest('.sliding-menu') ? 'Menu' : 'Other';

                // console.log(`🔍 Setting up container ${containerIndex} for: ${location}`);
                // console.log(`🔍 Link href: ${link.href}`);
                // console.log(`🔍 Link text: ${link.textContent.trim()}`);

                // Wrap the SVG in a notification container
                const svg = link.querySelector('svg');
                // console.log(`🔍 SVG found: ${!!svg}`);

                if (svg && !svg.parentElement.classList.contains('nav-notification-container')) {
                    const container = document.createElement('div');
                    container.className = 'nav-notification-container';
                    container.setAttribute('data-location', location);
                    svg.parentNode.insertBefore(container, svg);
                    container.appendChild(svg);
                    this.notificationContainers.push(container);
                    // console.log(`✅ Created notification container for ${location}`);
                } else if (svg && svg.parentElement.classList.contains('nav-notification-container')) {
                    const existingContainer = svg.parentElement;
                    existingContainer.setAttribute('data-location', location);
                    this.notificationContainers.push(existingContainer);
                    // console.log(`✅ Using existing notification container for ${location}`);
                } else {
                    // console.log(`❌ No SVG found for ${location} link`);
                }

                containerIndex++;
            });

            // console.log(`🔔 Total notification containers setup: ${this.notificationContainers.length}`);

            // Initial notification update
            // console.log('🚀 Running initial notification update...');
            this.updateNotifications();
        }

        getOrderStatusCounts() {
            const counts = {
                pending: 0,
                accepted: 0,
                completed: 0
            };

            this.orders.forEach(order => {
                const status = (order.status || '').toLowerCase();
                if (counts.hasOwnProperty(status)) {
                    counts[status]++;
                }
            });

            // console.log('📊 Order Status Counts:', {
            //     totalOrders: this.orders.length,
            //     pending: counts.pending,
            //     accepted: counts.accepted,
            //     completed: counts.completed,
            //     orders: this.orders.map(o => ({ id: o.orderId, status: o.status }))
            // });

            return counts;
        }

        updateNotifications() {
            // console.log('🔄 Starting notification update...');
            // console.log('🔍 Current notification containers:', this.notificationContainers.length);

            if (this.notificationContainers.length === 0) {
                // console.log('⚠️ No notification containers found, setting up...');
                this.setupNotifications();
                return;
            }

            // Remove existing notifications from all containers
            this.notificationContainers.forEach((container, index) => {
                const existingNotifications = container.querySelectorAll('.nav-notification-dot, .nav-notification-multiple');
                // console.log(`🧹 Container ${index} (${container.getAttribute('data-location')}): Found ${existingNotifications.length} existing notifications to remove`);
                existingNotifications.forEach(notification => notification.remove());
            });
            // console.log('🧹 Cleared existing notifications from all containers');

            const counts = this.getOrderStatusCounts();

            // Determine which notifications to show
            const notificationsToShow = [];

            // console.log('🎯 Determining notifications to show...');
            // console.log('📋 Counts:', counts);

            if (counts.pending > 0) {
                notificationsToShow.push('pending');
                // console.log('✅ Added pending notification (Yellow dot)');
            }
            if (counts.accepted > 0) {
                notificationsToShow.push('accepted');
                // console.log('✅ Added accepted notification (Green dot)');
            }
            if (counts.completed > 0 && counts.pending === 0 && counts.accepted === 0) {
                notificationsToShow.push('completed');
                // console.log('✅ Added completed notification (Grey dot)');
            }

            // console.log('🎨 Final notifications to show:', notificationsToShow);

            // Create notification elements for all containers
            if (notificationsToShow.length === 0) {
                // console.log('❌ No notifications to display');
                // Reset tracking variables when there are no notifications
                this.lastNotificationState = '';
                this.soundPlayedForCurrentState = false;
                return;
            }

            // Create a unique state string from notifications to show
            const currentState = notificationsToShow.sort().join(',');

            // Determine if we should play the bell sound based on your exact flow:
            let shouldPlaySound = false;

            if (currentState !== this.lastNotificationState) {
                // State has changed (Empty → Pending, Pending → Accepted, etc.)
                shouldPlaySound = true;
                // Reset sound tracking for the new state
                this.soundPlayedForCurrentState = false;
            } else if (currentState === this.lastNotificationState && !this.soundPlayedForCurrentState) {
                // Same state but sound hasn't been played yet (initial state)
                shouldPlaySound = true;
            }
            // If same state and sound has already been played (Periodic checks), no sound

            // Update tracking variables
            if (currentState !== this.lastNotificationState) {
                this.lastNotificationState = currentState;
                // soundPlayedForCurrentState already set to false above
            }

            // Play sound if needed (the timestamp check is handled in playBellSound method)
            if (shouldPlaySound) {
                this.playBellSound();
                this.sendSystemPushNotification(notificationsToShow);
                this.soundPlayedForCurrentState = true;
            }

            // Add notifications to all containers
            this.notificationContainers.forEach((container, index) => {
                const location = container.getAttribute('data-location');
                // console.log(`🎨 Adding notifications to container ${index} (${location})`);

                if (notificationsToShow.length === 1) {
                    const dot = document.createElement('div');
                    dot.className = `nav-notification-dot ${notificationsToShow[0]} new`;
                    container.appendChild(dot);
                    // console.log(`🟡 Created single ${notificationsToShow[0]} notification for ${location}`);
                } else {
                    const multipleContainer = document.createElement('div');
                    multipleContainer.className = 'nav-notification-multiple';

                    notificationsToShow.forEach(status => {
                        const dot = document.createElement('div');
                        dot.className = `nav-notification-dot ${status} new`;
                        multipleContainer.appendChild(dot);
                        // console.log(`🟢 Created ${status} notification in multiple container for ${location}`);
                    });
                    container.appendChild(multipleContainer);
                    // console.log(`🟢 Created multiple notifications for ${location}`);
                }
            });

            // console.log('🔍 Final DOM verification:');
            this.notificationContainers.forEach((container, index) => {
                const location = container.getAttribute('data-location');
                // console.log(`🔍 Container ${index} (${location}):`);
                // console.log(`  - Exists: ${!!container}`);
                // console.log(`  - Children: ${container.children.length}`);
                // console.log(`  - Has notifications: ${container.querySelectorAll('.nav-notification-dot, .nav-notification-multiple').length > 0}`);
            });

            // console.log('🔔 Notifications updated:', {
            //     counts,
            //     notificationsToShow,
            //     containersUpdated: this.notificationContainers.length,
            //     expectedBehavior: this.getExpectedBehavior(counts)
            // });
        }

        getExpectedBehavior(counts) {
            if (counts.pending > 0 && counts.accepted > 0) {
                return 'Both yellow and green dots should appear';
            } else if (counts.pending > 0) {
                return 'Yellow dot should appear';
            } else if (counts.accepted > 0) {
                return 'Green dot should appear';
            } else if (counts.completed > 0 && counts.pending === 0 && counts.accepted === 0) {
                return 'Grey dot should appear';
            } else {
                return 'No notification dot should appear';
            }
        }

        // Call System Push Notifications
        sendSystemPushNotification(notificationsToShow) {
            // Only send if the user has enabled it in settings
            const isPushEnabled = localStorage.getItem('phluowisePushEnabled');
            if (isPushEnabled !== 'true') {
                return;
            }

            // Make sure the browser supports the Notification API
            if (!('Notification' in window)) {
                return;
            }

            // Only send a push notification if permissions are granted
            if (Notification.permission === 'granted') {
                let title = 'Order Update';
                let body = 'One of your orders has a new status update.';

                // Customize the message slightly based on status
                if (notificationsToShow.includes('new_company')) {
                    title = 'New Company Added!';
                    body = 'A new company is now available. Check them out!';
                } else if (notificationsToShow.includes('accepted')) {
                    title = 'Order Accepted!';
                    body = 'Your order has been accepted. Click here to view the schedule history.';
                } else if (notificationsToShow.includes('pending')) {
                    title = 'Order Pending';
                    body = 'Your order is currently pending and waiting for approval.';
                } else if (notificationsToShow.includes('completed')) {
                    title = 'Order Completed!';
                    body = 'Your recent order was completed successfully.';
                }

                const options = {
                    body: body,
                    icon: 'images/icons/icon-192x192.png',
                    vibrate: [200, 100, 200],
                    tag: 'phluowise-order-update',
                    renotify: true,
                    requireInteraction: false
                };

                // 1. Android Studio WebView Native Integration
                if (typeof window.Android !== 'undefined' && typeof window.Android.showNotification === 'function') {
                    try {
                        window.Android.showNotification(title, body);
                        return; // Prevent standard browser API from firing since we just sent it natively
                    } catch (e) { }
                }

                // 2. Standard Web & PWA Notification Integration
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(function (registration) {
                        registration.showNotification(title, options);
                    }).catch(function (err) {
                        // Fallback to normal Notification
                        new Notification(title, options);
                    });
                } else {
                    new Notification(title, options);
                }
            }
        }

        // Method to manually trigger notification update (for testing)
        forceUpdate() {
            this.loadOrders();
            this.updateNotifications();
        }

        // Method to add test orders (for development)
        addTestOrder(status = 'pending') {
            const testOrder = {
                orderId: 'TEST' + Date.now(),
                company: 'Test Company',
                location: 'Test Location',
                payment: 'Test Payment',
                time: new Date().toLocaleTimeString(),
                date: new Date().toLocaleDateString(),
                price: 'GH₵25.00',
                quantity: 1,
                subtotal: 20.00,
                serviceFee: 5.00,
                total: 25.00,
                status: status,
                statusText: status.charAt(0).toUpperCase() + status.slice(1),
                statusColor: status === 'pending' ? '#F2A78C' : status === 'accepted' ? '#2C9043' : '#2CAA48',
                product: 'Test Product',
                recipient: { name: 'Test User', phone: '0000000000', email: 'test@example.com' },
                timestamp: new Date().toISOString(),
                deliveryAddress: 'Test Delivery Address',
                deliveryLocation: 'Test Delivery Location',
                deliveryTime: 'Test Delivery Time',
                deliveryDate: 'Test Delivery Date'
            };

            this.orders.push(testOrder);
            localStorage.setItem('phluowiseOrders', JSON.stringify(this.orders));
            this.updateNotifications();
        }
    }

    // Initialize the notification system
    let notificationManager;

    // Global function to access the notification manager
    window.getNotificationManager = function () {
        if (!notificationManager) {
            notificationManager = new ScheduleNotificationManager();
        }
        return notificationManager;
    };

    // UI Toggle logic
    window.togglePushNotifications = function (checkbox) {
        if (checkbox.checked) {
            // ALWAYS enable local push preference so in-app notifications (dots/sounds) activate
            localStorage.setItem('phluowisePushEnabled', 'true');

            if ('Notification' in window) {
                Notification.requestPermission().then(function (permission) {
                    if (permission !== 'granted') {
                        // Browser permission denied, but we keep in-app notifications enabled
                        console.log('Push notifications permission was denied by the OS. In-app notifications will still work.');
                    }
                });
            }

            // Android WebView generic javascript interface fallback if one exists
            if (typeof window.Android !== 'undefined' && typeof window.Android.requestNotificationPermission === 'function') {
                try {
                    window.Android.requestNotificationPermission();
                } catch (e) { }
            }
        } else {
            localStorage.setItem('phluowisePushEnabled', 'false');
        }

        window.updatePushNotificationToggleUI();
    };

    window.updatePushNotificationToggleUI = function () {
        const toggles = document.querySelectorAll('input[type="checkbox"][onchange*="togglePushNotifications"]');
        const isEnabled = localStorage.getItem('phluowisePushEnabled') === 'true';
        toggles.forEach(toggle => {
            toggle.checked = isEnabled;
        });
    };

    function getSettingsModalHTML() {
        const isEnabled = localStorage.getItem('phluowisePushEnabled') === 'true';
        const isChecked = isEnabled ? 'checked' : '';
        return `
    <div id="settingsModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50" style="display: none; z-index: 999999 !important; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">
        <div class="w-full h-full flex flex-col items-center justify-center p-5">
            <!-- Back Button -->
            <div class="w-full max-w-[400px] mb-4">
                <style>
                    .glass-back-btn {
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
                        cursor: pointer;
                        transition: all 0.2s ease-in-out;
                    }
                    .glass-back-btn:active {
                        transform: scale(0.95);
                        background: rgba(255, 255, 255, 0.15);
                    }
                </style>
                <button onclick="closeSettingsModal()" class="glass-back-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
            </div>
            
            <!-- Settings Options Container -->
            <div class="w-full max-w-[400px] rounded-[15px] overflow-hidden border" 
                 style="border-color: var(--model-border, #DADADA); background-color: var(--model-bg, #101010);">
                
                <!-- Settings Header -->
                <div class="h-[60px] flex items-center px-6 border-b border-[#3A3B3F]"
                     style="background-color: var(--bg-third, #101010);">
                    <span class="text-white text-lg font-semibold">Settings</span>
                </div>

                <!-- Push Notifications -->
                <label class="w-full h-[60px] flex flex-row justify-between items-center px-6 cursor-pointer border-b border-[#3A3B3F]"
                    style="background-color: var(--bg-third, #101010);"
                    for="pushNotificationToggleInput">
                    <div class="flex flex-row items-center gap-[30px]">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span class="text-white text-lg font-semibold">Push Notifications</span>
                    </div>
                    <!-- Premium Mobile App Style Toggle (CSS Included) -->
                    <div class="relative inline-flex items-center">
                        <style>
                            .premium-toggle-input {
                                display: none;
                            }
                            .premium-toggle-track {
                                position: relative;
                                display: inline-block;
                                width: 50px;
                                height: 26px;
                                background-color: #40444B;
                                border-radius: 9999px;
                                cursor: pointer;
                                transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                border: 1px solid rgba(255,255,255,0.1);
                            }
                            .premium-toggle-track::after {
                                content: '';
                                position: absolute;
                                top: 1px;
                                left: 2px;
                                width: 22px;
                                height: 22px;
                                background-color: white;
                                border-radius: 50%;
                                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                            }
                            .premium-toggle-input:checked + .premium-toggle-track {
                                background-color: #3B74FF;
                                border-color: #3B74FF;
                            }
                            .premium-toggle-input:checked + .premium-toggle-track::after {
                                transform: translateX(22px);
                            }
                        </style>
                        <input type="checkbox" id="pushNotificationToggleInput" onchange="togglePushNotifications(this)" class="premium-toggle-input" ${isChecked}>
                        <div class="premium-toggle-track"></div>
                    </div>
                </label>
            </div>
        </div>
    </div>
    `;
    }

    window.openSettingsModal = function () {
        let modal = document.getElementById('settingsModal');

        if (!modal) {
            // Create modal if it doesn't exist
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = getSettingsModalHTML();
            document.body.appendChild(modalContainer.firstElementChild);
            modal = document.getElementById('settingsModal');
        } else {
            // Refresh HTML content to reflect current state
            modal.outerHTML = getSettingsModalHTML();
            modal = document.getElementById('settingsModal');
        }

        modal.style.display = 'flex';
    };

    window.closeSettingsModal = function () {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    // Auto-initialize when script loads - but only if no manager exists
    if (typeof window !== 'undefined' && typeof window.ScheduleNotificationManager === 'undefined') {
        notificationManager = new ScheduleNotificationManager();
        // Set the global reference to prevent re-creation
        window.ScheduleNotificationManager = ScheduleNotificationManager;
        window.notificationManagerInstance = notificationManager;
    } else if (window.notificationManagerInstance) {
        // Use existing instance if available
        notificationManager = window.notificationManagerInstance;
    }


    // Update UI toggle on load
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            window.updatePushNotificationToggleUI();
        });
    }

    // Close the guard block
}