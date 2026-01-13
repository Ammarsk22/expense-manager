// 1. Check and Apply Theme on Load
const themeCheck = () => {
    const userTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (userTheme === 'dark' || (!userTheme && systemTheme)) {
        document.documentElement.classList.add('dark');
        updateMetaThemeColor('dark'); // Update browser bar color
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        updateMetaThemeColor('light'); // Update browser bar color
        return 'light';
    }
};

// 2. Update Browser Address Bar Color (Meta Tag)
const updateMetaThemeColor = (theme) => {
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
        // Dark Mode: Gray-800 (#1F2937), Light Mode: Indigo-600 (#4F46E5)
        metaThemeColor.setAttribute("content", theme === 'dark' ? "#1F2937" : "#4F46E5");
    }
}

// 3. Toggle Theme Function
const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        updateMetaThemeColor('light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        updateMetaThemeColor('dark');
    }
    updateToggleState();
};

// 4. Sync Toggle Button State
const updateToggleState = () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.checked = document.documentElement.classList.contains('dark');
    }
}

// 5. Initialize
document.addEventListener('DOMContentLoaded', () => {
    themeCheck();
    updateToggleState();
    
    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn) {
        toggleBtn.addEventListener('change', toggleTheme);
    }
});