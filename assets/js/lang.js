// --- LANGUAGE & LOCALIZATION ENGINE ---
// Handles English/Hindi translations

const Lang = {
    
    // 1. DICTIONARY (Translation Keys)
    translations: {
        'en': {
            // Navigation
            'nav_dashboard': 'Dashboard',
            'nav_calendar': 'Calendar',
            'nav_analysis': 'Analysis',
            'nav_accounts': 'Accounts',
            'nav_recurring': 'Subscriptions',
            'nav_categories': 'Categories',
            'nav_goals': 'Goals',
            'nav_debts': 'Debts',
            'nav_split': 'Split Bill',
            'nav_history': 'History',
            'nav_profile': 'Profile',
            'nav_settings': 'Settings',
            'nav_logout': 'Logout',
            
            // Dashboard
            'welcome_back': 'Welcome Back!',
            'add_transaction': 'New Transaction',
            'total_income': 'Total Income',
            'total_expense': 'Total Expense',
            'balance': 'Available Balance',
            'recent_transactions': 'Recent Transactions',
            'view_all': 'View All',
            'spending_breakdown': 'Spending Breakdown',
            
            // Actions
            'save': 'Save',
            'cancel': 'Cancel',
            'delete': 'Delete',
            'edit': 'Edit',
            'scan_bill': 'Scan Bill',
            
            // Settings
            'pref_language': 'Language',
            'pref_security': 'Security',
            'pref_theme': 'Theme',
            'pref_dark_mode': 'Dark Mode',
            'pref_currency': 'Currency'
        },
        'hi': {
            // Navigation
            'nav_dashboard': 'डैशबोर्ड',
            'nav_calendar': 'कैलेंडर',
            'nav_analysis': 'विश्लेषण',
            'nav_accounts': 'खाते',
            'nav_recurring': 'सब्सक्रिप्शन',
            'nav_categories': 'श्रेणियाँ',
            'nav_goals': 'लक्ष्य',
            'nav_debts': 'उधारी',
            'nav_split': 'बिल बाटें',
            'nav_history': 'इतिहास',
            'nav_profile': 'प्रोफाइल',
            'nav_settings': 'सेटिंग्स',
            'nav_logout': 'लॉग आउट',
            
            // Dashboard
            'welcome_back': 'स्वागत है!',
            'add_transaction': 'नया लेनदेन',
            'total_income': 'कुल आय',
            'total_expense': 'कुल खर्च',
            'balance': 'उपलब्ध शेष',
            'recent_transactions': 'हाल के लेनदेन',
            'view_all': 'सभी देखें',
            'spending_breakdown': 'खर्च का विवरण',
            
            // Actions
            'save': 'सेव करें',
            'cancel': 'रद्द करें',
            'delete': 'हटाएं',
            'edit': 'संपादित करें',
            'scan_bill': 'बिल स्कैन करें',

            // Settings
            'pref_language': 'भाषा',
            'pref_security': 'सुरक्षा',
            'pref_theme': 'थीम',
            'pref_dark_mode': 'डार्क मोड',
            'pref_currency': 'मुद्रा'
        }
    },

    // 2. CURRENT LANGUAGE STATE
    currentLang: 'en', // Default

    // 3. INITIALIZE
    init: function() {
        // Load from LocalStorage or default to English
        const savedLang = localStorage.getItem('app_lang');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        }
        
        // Apply immediately
        this.applyLanguage();
    },

    // 4. SWITCH LANGUAGE
    setLanguage: function(langCode) {
        if (this.translations[langCode]) {
            this.currentLang = langCode;
            localStorage.setItem('app_lang', langCode);
            this.applyLanguage();
            
            // Optional: Update HTML lang attribute for accessibility
            document.documentElement.lang = langCode;
        }
    },

    // 5. APPLY TRANSLATIONS TO DOM ELEMENTS
    applyLanguage: function() {
        // Find all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.translations[this.currentLang][key];
            
            if (text) {
                // If element is input with placeholder
                if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                    el.placeholder = text;
                } else {
                    el.innerText = text;
                }
            }
        });
    },

    // 6. HELPER FOR DYNAMIC STRINGS (Used in JS Alerts etc)
    get: function(key) {
        return this.translations[this.currentLang][key] || key;
    }
};

// Auto-Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    Lang.init();
});

// Expose Globally
window.Lang = Lang;