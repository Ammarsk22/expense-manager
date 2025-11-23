// 1. Check and Apply Theme on Load
const themeCheck = () => {
    // Check if 'theme' is in local storage
    const userTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply Dark Mode if:
    // - User has manually set it to 'dark'
    // - OR User hasn't set anything, but their system preference is dark
    if (userTheme === 'dark' || (!userTheme && systemTheme)) {
        document.documentElement.classList.add('dark');
        return 'dark';
    } else {
        document.documentElement.classList.remove('dark');
        return 'light';
    }
};

// Run check immediately when script loads to prevent flash of unstyled content
themeCheck();

// 2. Toggle Theme Function (Called when switch is clicked)
const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    
    // Ensure the toggle button state reflects the change
    updateToggleState();
};

// 3. Sync Toggle Button State
// This function ensures the checkbox visual state matches the actual theme
const updateToggleState = () => {
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.checked = document.documentElement.classList.contains('dark');
    }
}

// 4. Event Listener Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Set initial toggle state when page loads
    updateToggleState();
    
    // Find the toggle button and attach click listener
    const toggleBtn = document.getElementById('theme-toggle');
    if(toggleBtn) {
        // 'change' event works best for checkboxes
        toggleBtn.addEventListener('change', toggleTheme);
    }
});