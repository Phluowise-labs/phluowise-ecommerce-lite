/**
 * Phluowise Theme Management
 * Supports: dark, gray, light themes
 * Matches React Native themeContext.tsx exactly
 */

const THEMES = {
    dark: {
        backgroundColor: '#060606',
        backgroundSecondColor: '#1D1D1DF2',
        backgroundThirdColor: '#101010',
        bottomSheetColor: '#1D1D1D',
        buttonColor: '#007ACC66',
        buttonBorderColor: '#3B74FF',
        buttonSecondColor: '#F57D7D4D',
        buttonSecondBorderColor: '#F57D7D',
        inputFieldColor: '#22222233',
        inputFieldBorderColor: '#DADADA',
        inputFieldSecondColor: '#40444B66',
        inputFieldSecondBorderColor: '#808080',
        modelBackgroundColor: '#101010',
        modelBorderColor: '#DADADA',
        headerBg: '#101010',
        tabBg: '#101010',
        textColor: '#FFFFFF',
        textMuted: '#A0AEC0'
    },
    gray: {
        backgroundColor: '#202225',
        backgroundSecondColor: '#40444B',
        backgroundThirdColor: '#292B2F',
        bottomSheetColor: '#40444B',
        buttonColor: '#007ACC',
        buttonBorderColor: '#007ACC',
        buttonSecondColor: '#F57D7D',
        buttonSecondBorderColor: '#F57D7D',
        inputFieldColor: '#40444B',
        inputFieldBorderColor: '#40444B',
        inputFieldSecondColor: '#40444B',
        inputFieldSecondBorderColor: '#40444B',
        modelBackgroundColor: '#40444B',
        modelBorderColor: '#40444B',
        headerBg: '#292B2F',
        tabBg: '#292B2F',
        textColor: '#FFFFFF',
        textMuted: '#B0B6C1'
    },
    light: {
        backgroundColor: '#F8FAFC',
        backgroundSecondColor: '#FFFFFF',
        backgroundThirdColor: '#F1F5F9',
        bottomSheetColor: '#FFFFFF',
        buttonColor: '#2563EB',
        buttonBorderColor: '#2563EB',
        buttonSecondColor: '#FBCFE8',
        buttonSecondBorderColor: '#DB2777',
        inputFieldColor: '#E5E7EB',
        inputFieldBorderColor: '#D1D5DB',
        inputFieldSecondColor: '#F3F4F6',
        inputFieldSecondBorderColor: '#D1D5DB',
        modelBackgroundColor: '#FFFFFF',
        modelBorderColor: '#D1D5DB',
        headerBg: '#FFFFFF',
        tabBg: '#FFFFFF',
        textColor: '#111827',
        textMuted: '#475569'
    },
    'liquid-glass': {
        backgroundColor: '#F5F5F7',
        backgroundSecondColor: 'rgba(255, 255, 255, 0.45)',
        backgroundThirdColor: 'rgba(255, 255, 255, 0.35)',
        bottomSheetColor: 'rgba(255, 255, 255, 0.5)',
        buttonColor: '#0071E3',
        buttonBorderColor: '#0071E3',
        buttonSecondColor: 'rgba(0, 0, 0, 0.04)',
        buttonSecondBorderColor: 'rgba(0, 0, 0, 0.1)',
        inputFieldColor: 'rgba(255, 255, 255, 0.5)',
        inputFieldBorderColor: 'rgba(255, 255, 255, 0.8)',
        inputFieldSecondColor: 'rgba(255, 255, 255, 0.5)',
        inputFieldSecondBorderColor: 'rgba(255, 255, 255, 0.8)',
        modelBackgroundColor: 'rgba(255, 255, 255, 0.5)',
        modelBorderColor: 'rgba(255, 255, 255, 0.8)',
        headerBg: 'rgba(255, 255, 255, 0.3)',
        tabBg: 'rgba(255, 255, 255, 0.5)',
        textColor: '#1D1D1F',
        textMuted: '#86868B'
    }
};

// Get current theme
function getCurrentTheme() {
    return localStorage.getItem('theme') || 'dark';
}

// Save theme
function saveTheme(theme) {
    localStorage.setItem('theme', theme);
}

// Update theme on page
function updateTheme(theme) {
    const resolvedTheme = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    const colors = THEMES[resolvedTheme] || THEMES.dark;

    // Remove existing theme classes
    document.body.classList.remove('dark-theme', 'gray-theme', 'light-theme', 'liquid-glass-theme', 'system-theme');

    // Add new theme class for the resolved theme
    document.body.classList.add(resolvedTheme + '-theme');

    // Update CSS variables
    document.documentElement.style.setProperty('--bg-color', colors.backgroundColor);
    document.documentElement.style.setProperty('--bg-second', colors.backgroundSecondColor);
    document.documentElement.style.setProperty('--bg-third', colors.backgroundThirdColor);
    document.documentElement.style.setProperty('--header-bg', colors.headerBg);
    document.documentElement.style.setProperty('--tab-bg', colors.tabBg);
    document.documentElement.style.setProperty('--bottom-sheet', colors.bottomSheetColor);
    document.documentElement.style.setProperty('--modal-bg', colors.modelBackgroundColor);
    document.documentElement.style.setProperty('--modal-border', colors.modelBorderColor);
    document.documentElement.style.setProperty('--text-color', colors.textColor);
    document.documentElement.style.setProperty('--text-muted', colors.textMuted);

    // Save user choice; system uses preference fallback
    saveTheme(theme);

    // Update body background
    document.body.style.backgroundColor = colors.backgroundColor;

    // Update header if exists
    const headerBar = document.querySelector('.header-bar');
    if (headerBar) {
        headerBar.style.backgroundColor = colors.headerBg;
    }

    // Update tab bar if exists
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) {
        tabBar.style.backgroundColor = colors.tabBg;
    }
}

// Initialize theme on page load
function initTheme() {
    const theme = getCurrentTheme();
    updateTheme(theme);
}

// Set greeting based on time of day
function setGreeting() {
    const hour = new Date().getHours();
    const userName = localStorage.getItem('userName') || 'USER';
    let greeting = '';

    if (hour >= 0 && hour < 12) {
        greeting = `Good Morning, ${userName.toUpperCase()}`;
    } else if (hour >= 12 && hour < 18) {
        greeting = `Good Afternoon, ${userName.toUpperCase()}`;
    } else {
        greeting = `Good Evening, ${userName.toUpperCase()}`;
    }

    const greetingEl = document.getElementById('greetingText');
    if (greetingEl) {
        greetingEl.textContent = greeting;
    }
}

// Theme Modal HTML template
function getThemeModalHTML() {
    const currentTheme = getCurrentTheme();

    return `
    <div id="themeModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" style="display: none; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);">
        <div class="w-full min-h-full flex flex-col items-center justify-center px-4 py-5">
            <!-- Back Button -->
            <div class="w-full max-w-[400px] mb-4">
                <button onclick="closeThemeModal()" class="theme-modal-back-btn w-10 h-10 flex items-center justify-center rounded-full" style="color: var(--text-color);">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
            </div>
            
            <!-- Theme Options Container -->
            <div class="theme-modal-content w-full max-w-[400px] rounded-[15px] overflow-hidden border shadow-xl"
                 style="min-height: 301px; border-color: var(--modal-border, #DADADA); background-color: var(--modal-bg); color: var(--text-color);">
                
                <!-- Choose Theme Header -->
                <div class="h-[60px] flex items-center px-6 border-b"
                     style="background-color: var(--bg-third, #101010); color: var(--text-color); border-color: var(--modal-border, #DADADA);">
                    <span class="text-lg font-semibold">Choose Theme</span>
                </div>
                
                <!-- Light Option -->
                <button data-theme="light" onclick="selectTheme('light')" 
                        class="w-full h-[60px] flex items-center px-6 gap-5 border-b border-[#3A3B3F]"
                        style="background-color: var(--bg-third, #101010); color: var(--text-color);">
                    <div class="w-6 h-6 rounded-full bg-[#40444B]"></div>
                    <span class="text-lg font-semibold">Light</span>
                </button>
                
                <!-- Gray Option -->
                <button data-theme="gray" onclick="selectTheme('gray')" 
                        class="w-full h-[60px] flex items-center px-6 gap-5 border-b border-[#3A3B3F]"
                        style="background-color: var(--bg-third, #101010); color: var(--text-color);">
                    <div class="w-6 h-6 rounded-full bg-[#40444B]"></div>
                    <span class="text-lg font-semibold">Gray</span>
                </button>
                
                <!-- Dark Option -->
                <button data-theme="dark" onclick="selectTheme('dark')" 
                        class="w-full h-[60px] flex items-center px-6 gap-5 border-b border-[#3A3B3F]"
                        style="background-color: var(--bg-third, #101010); color: var(--text-color);">
                    <div class="w-6 h-6 rounded-full bg-[#40444B]"></div>
                    <span class="text-lg font-semibold">Dark</span>
                </button>

                <!-- Liquid Glass Option -->
                <button data-theme="liquid-glass" onclick="selectTheme('liquid-glass')" 
                        class="w-full h-[60px] flex items-center px-6 gap-5 border-b border-[#3A3B3F]"
                        style="background-color: var(--bg-third, #101010); color: var(--text-color);">
                    <div class="w-6 h-6 rounded-full bg-[#40444B]" style="background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2)); border: 1px solid rgba(0,0,0,0.1);"></div>
                    <span class="text-lg font-semibold">Liquid Glass</span>
                </button>

                <!-- System Default Option -->
                <button data-theme="system" onclick="selectTheme('system')" 
                        class="w-full h-[60px] flex items-center px-6 gap-5"
                        style="background-color: var(--bg-third, #101010); color: var(--text-color);">
                    <div class="w-6 h-6 rounded-full bg-[#40444B]"></div>
                    <span class="text-lg font-semibold">System Default</span>
                </button>
                
            </div>
        </div>
    </div>
    `;
}

// Open theme modal
function openThemeModal() {
    let modal = document.getElementById('themeModal');

    if (!modal) {
        // Create modal if it doesn't exist
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = getThemeModalHTML();
        document.body.appendChild(modalContainer.firstElementChild);
        modal = document.getElementById('themeModal');
    }

    // Update highlighting based on current theme
    updateThemeModalHighlight();

    modal.style.display = 'flex';
}

// Close theme modal
function closeThemeModal() {
    const modal = document.getElementById('themeModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Select theme from modal
function selectTheme(theme) {
    updateTheme(theme);
    updateThemeModalHighlight();

    // Update theme display in menu if exists
    const themeDisplay = document.getElementById('currentThemeDisplay');
    if (themeDisplay) {
        let displayName = theme.charAt(0).toUpperCase() + theme.slice(1);
        if (theme === 'liquid-glass') displayName = 'Liquid Glass';
        themeDisplay.textContent = displayName;
    }

    closeThemeModal();
}

// Update theme modal highlighting
function updateThemeModalHighlight() {
    const currentTheme = getCurrentTheme();
    const modal = document.getElementById('themeModal');

    if (!modal) return;

    const buttons = modal.querySelectorAll('button[data-theme]');

    buttons.forEach(button => {
        const themeName = button.dataset.theme;
        const span = button.querySelector('span');

        if (themeName === currentTheme) {
            button.style.backgroundColor = 'rgba(59, 130, 246, 0.12)';
            button.style.borderColor = 'rgba(59, 130, 246, 0.35)';
            if (span) {
                span.style.opacity = '1';
            }
        } else {
            button.style.backgroundColor = 'transparent';
            button.style.borderColor = 'var(--border-color, rgba(148, 163, 184, 0.35))';
            if (span) {
                span.style.opacity = '0.65';
            }
        }
    });
}

// Initialize everything on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    setGreeting();
});
