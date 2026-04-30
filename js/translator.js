/**
 * Phluowise Language Translator
 * Integrates Google Translate with a custom UI
 */

(function() {
    // Languages supported by Phluowise with their Google Translate codes
    const LANGUAGES = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'ak', name: 'Akan (Twi)', flag: '🇬🇭' },
        { code: 'fr', name: 'French', flag: '🇫🇷' },
        { code: 'es', name: 'Spanish', flag: '🇪🇸' },
        { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ar', name: 'Arabic', flag: '🇸🇦' }
    ];

    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: LANGUAGES.map(l => l.code).join(','),
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
        
        // Apply saved language after initialization
        const savedLang = localStorage.getItem('phluowiseLanguage') || 'en';
        if (savedLang !== 'en') {
            setTimeout(() => applyLanguage(savedLang), 1000);
        }
    };

    function applyLanguage(langCode) {
        const select = document.querySelector('.goog-te-combo');
        if (select) {
            select.value = langCode;
            select.dispatchEvent(new Event('change'));
        } else {
            // Retry if widget not ready
            setTimeout(() => applyLanguage(langCode), 500);
        }
    }

    window.changeLanguage = function(langCode) {
        localStorage.setItem('phluowiseLanguage', langCode);
        
        // Google Translate widget uses a cookie 'googtrans'
        // Format: /en/langCode
        document.cookie = `googtrans=/en/${langCode}; path=/;`;
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname};`;
        
        // Force refresh to apply translation reliably
        window.location.reload();
    };

    window.getLanguageList = function() {
        return LANGUAGES;
    };

    window.getCurrentLanguage = function() {
        return localStorage.getItem('phluowiseLanguage') || 'en';
    };

    // Inject Google Translate required elements and script
    document.addEventListener('DOMContentLoaded', function() {
        // Add hidden element for Google Translate
        if (!document.getElementById('google_translate_element')) {
            const div = document.createElement('div');
            div.id = 'google_translate_element';
            div.style.display = 'none';
            document.body.appendChild(div);
        }

        // Add script
        if (!document.getElementById('google_translate_script')) {
            const script = document.createElement('script');
            script.id = 'google_translate_script';
            script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            document.head.appendChild(script);
        }

        // Hide Google's top bar and branding aggressively
        const style = document.createElement('style');
        style.innerHTML = `
            /* Hide Google Translate Banner */
            .goog-te-banner-frame.skiptranslate, 
            .goog-te-banner-frame,
            .goog-te-banner,
            .goog-te-gadget-icon,
            img[src*="google_logo"],
            .goog-logo-link { 
                display: none !important; 
            }
            
            /* Reset body top margin added by Google */
            body { 
                top: 0px !important; 
                position: static !important;
            }
            
            /* Hide "Original Text" tooltips and highlights */
            .goog-te-menu-value { display: none !important; }
            #goog-gt-tt, .goog-gt-tt { display: none !important; visibility: hidden !important; }
            .goog-tooltip, .goog-tooltip:hover { display: none !important; }
            .goog-text-highlight { 
                background-color: transparent !important; 
                box-shadow: none !important; 
                box-sizing: border-box !important;
            }

            /* Hide the actual widget element if it somehow becomes visible */
            #google_translate_element {
                display: none !important;
            }

            /* Prevent layout shifts */
            .skiptranslate {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    });
})();
