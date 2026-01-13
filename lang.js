/**
 * FinTrack Multi-Language Support
 * Handles translation and language switching
 */

const translations = {
    "en": {
        // Sidebar & Nav
        "nav_dashboard": "Dashboard",
        "nav_calendar": "Calendar",
        "nav_analysis": "Analysis",
        "nav_accounts": "Accounts",
        "nav_recurring": "Subscriptions",
        "nav_categories": "Categories",
        "nav_goals": "Goals",
        "nav_debts": "Debts",
        "nav_history": "History",
        "nav_profile": "Profile",
        "nav_settings": "Settings",
        "nav_logout": "Logout",
        
        // Settings Page
        "settings_title": "Settings",
        "settings_desc": "Control your app preferences and security.",
        "sec_security": "Security",
        "lbl_app_lock": "App Lock (PIN)",
        "desc_app_lock": "Require 4-digit PIN on startup",
        "btn_change_pin": "Change PIN Code",
        "sec_notifications": "Notifications",
        "lbl_reminders": "Daily Reminders",
        "desc_reminders": "Get alerts for bills due Today or Tomorrow",
        "sec_appearance": "Appearance",
        "lbl_dark_mode": "Dark Mode",
        "desc_dark_mode": "Switch between light and dark themes",
        "sec_budget": "Monthly Budget",
        "desc_budget": "Set a monthly spending limit alerts.",
        "lbl_budget_amt": "Your Monthly Budget (₹)",
        "btn_save_budget": "Save Budget",
        "sec_cat_budget": "Category Budgets",
        "desc_cat_budget": "Set specific spending limits for your expense categories.",
        "btn_save_cat": "Save Category Budgets",
        
        // Language Section
        "sec_language": "Language",
        "lbl_select_lang": "App Language",
        "desc_select_lang": "Choose your preferred language",
    },
    "hi": {
        // Sidebar & Nav
        "nav_dashboard": "डैशबोर्ड",
        "nav_calendar": "कैलेंडर",
        "nav_analysis": "विश्लेषण",
        "nav_accounts": "खाते (Accounts)",
        "nav_recurring": "सब्सक्रिप्शन",
        "nav_categories": "श्रेणियाँ (Categories)",
        "nav_goals": "लक्ष्य (Goals)",
        "nav_debts": "उधारी (Debts)",
        "nav_history": "इतिहास",
        "nav_profile": "प्रोफाइल",
        "nav_settings": "सेटिंग्स",
        "nav_logout": "लॉग आउट",

        // Settings Page
        "settings_title": "सेटिंग्स",
        "settings_desc": "अपने ऐप की प्राथमिकताएं और सुरक्षा प्रबंधित करें।",
        "sec_security": "सुरक्षा",
        "lbl_app_lock": "ऐप लॉक (PIN)",
        "desc_app_lock": "ऐप खोलने पर 4-अंकीय पिन मांगें",
        "btn_change_pin": "पिन कोड बदलें",
        "sec_notifications": "नोटिफिकेशन्स",
        "lbl_reminders": "दैनिक रिमाइंडर",
        "desc_reminders": "आज या कल देय बिलों के लिए अलर्ट प्राप्त करें",
        "sec_appearance": "दिखावट",
        "lbl_dark_mode": "डार्क मोड",
        "desc_dark_mode": "लाइट और डार्क थीम के बीच स्विच करें",
        "sec_budget": "मासिक बजट",
        "desc_budget": "मासिक खर्च सीमा अलर्ट सेट करें।",
        "lbl_budget_amt": "आपका मासिक बजट (₹)",
        "btn_save_budget": "बजट सहेजें",
        "sec_cat_budget": "श्रेणी बजट",
        "desc_cat_budget": "अपनी खर्च श्रेणियों के लिए विशिष्ट सीमाएँ निर्धारित करें।",
        "btn_save_cat": "श्रेणी बजट सहेजें",

        // Language Section
        "sec_language": "भाषा",
        "lbl_select_lang": "ऐप की भाषा",
        "desc_select_lang": "अपनी पसंदीदा भाषा चुनें",
    },
    "hinglish": {
        // Sidebar & Nav
        "nav_dashboard": "Dashboard",
        "nav_calendar": "Calendar",
        "nav_analysis": "Analysis (Hisab)",
        "nav_accounts": "Accounts",
        "nav_recurring": "Subscriptions",
        "nav_categories": "Categories",
        "nav_goals": "Goals",
        "nav_debts": "Udhaar (Debts)",
        "nav_history": "History",
        "nav_profile": "Profile",
        "nav_settings": "Settings",
        "nav_logout": "Logout",

        // Settings Page
        "settings_title": "Settings",
        "settings_desc": "App settings aur security manage karein.",
        "sec_security": "Suraksha (Security)",
        "lbl_app_lock": "App Lock (PIN)",
        "desc_app_lock": "Startup par 4-digit PIN mangein",
        "btn_change_pin": "PIN Code Badlein",
        "sec_notifications": "Notifications",
        "lbl_reminders": "Daily Reminders",
        "desc_reminders": "Aaj ya Kal ke bills ka alert paayein",
        "sec_appearance": "Appearance",
        "lbl_dark_mode": "Dark Mode",
        "desc_dark_mode": "Light aur Dark theme change karein",
        "sec_budget": "Monthly Budget",
        "desc_budget": "Mahine ke kharche ki limit set karein.",
        "lbl_budget_amt": "Aapka Monthly Budget (₹)",
        "btn_save_budget": "Budget Save Karein",
        "sec_cat_budget": "Category Budgets",
        "desc_cat_budget": "Har category ke liye limit set karein.",
        "btn_save_cat": "Category Budget Save Karein",

        // Language Section
        "sec_language": "Language (Bhasha)",
        "lbl_select_lang": "App Language",
        "desc_select_lang": "Apni pasandida bhasha chunein",
    }
};

const LangManager = {
    currentLang: localStorage.getItem('fintrack_lang') || 'en',

    init() {
        this.applyLanguage(this.currentLang);
        this.bindSettings();
    },

    applyLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('fintrack_lang', lang);
        
        // Find all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                // If it's an input with placeholder
                if (el.tagName === 'INPUT' && el.placeholder) {
                    el.placeholder = translations[lang][key];
                } else {
                    // Start with icon if present
                    const icon = el.querySelector('i');
                    if (icon) {
                        el.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                node.textContent = " " + translations[lang][key];
                            }
                        });
                    } else {
                        el.innerText = translations[lang][key];
                    }
                }
            }
        });

        // Update Dropdown value if exists
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.value = lang;
        }
    },

    bindSettings() {
        const selector = document.getElementById('language-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.applyLanguage(e.target.value);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    LangManager.init();
});