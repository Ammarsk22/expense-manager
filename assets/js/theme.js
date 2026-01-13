/**
 * FinTrack Theme Manager
 * Handles Light/Dark mode toggling and updates the mobile status bar color.
 */

// 1. Check and Apply Theme on Load
const themeCheck = () => {
    const userTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Check saved preference or system preference
    if (userTheme === 'dark' || (!userTheme && systemTheme)) {
        document.documentElement.classList.add('dark');
        updateMetaThemeColor('dark'); // Update mobile status bar
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        updateMetaThemeColor('light'); // Update mobile status bar
        return 'light';
    }
};

// 2. Update Browser Address Bar Color (Critical for Mobile PWA)
const updateMetaThemeColor = (theme) => {
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
        // Light Mode: Indigo-600 (#4F46E5) | Dark Mode: Gray-900 (#111827)
        // These colors MUST match the header colors in your HTML files.
        metaThemeColor.setAttribute("content", theme === 'dark' ? "#111827" : "#4F46E5");
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

// 4. Sync Toggle Button State (for Settings page)
const updateToggleState = () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.checked = document.documentElement.classList.contains('dark');
    }
}

// 5. Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Apply theme immediately
    themeCheck();
    
    // Sync toggle button if it exists on the page
    updateToggleState();
    
    // Attach event listener to the toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn) {
        toggleBtn.addEventListener('change', toggleTheme);
    }
});