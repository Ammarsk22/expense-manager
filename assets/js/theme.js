// --- THEME MANAGER ---
// Handles Dark/Light mode toggling and persistence

(function() {
    // 1. IMMEDIATE APPLY (Prevent Flash of Incorrect Theme)
    // Runs before DOM Content Loaded
    function applyInitialTheme() {
        const userPref = localStorage.getItem('theme');
        const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (userPref === 'dark' || (!userPref && systemPref)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    applyInitialTheme();

    // 2. GLOBAL TOGGLE FUNCTION
    window.toggleTheme = function() {
        const html = document.documentElement;
        
        if (html.classList.contains('dark')) {
            html.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            updateThemeIcons(false);
        } else {
            html.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            updateThemeIcons(true);
        }
    };

    // 3. UPDATE ICONS (Moon/Sun)
    // Helps update UI elements across different pages if they exist
    function updateThemeIcons(isDark) {
        // Toggle Switch inputs (Settings/Profile)
        const toggles = document.querySelectorAll('#theme-toggle');
        toggles.forEach(toggle => {
            toggle.checked = isDark;
        });

        // Any custom icons (optional)
        const icons = document.querySelectorAll('.theme-icon');
        icons.forEach(icon => {
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
    }

    // 4. LISTEN FOR SYSTEM CHANGES
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    });

    // 5. SYNC ON LOAD
    document.addEventListener('DOMContentLoaded', () => {
        const isDark = document.documentElement.classList.contains('dark');
        updateThemeIcons(isDark);
    });

})();