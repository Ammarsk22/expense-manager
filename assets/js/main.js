document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GLOBAL UI ELEMENTS ---
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const menuBtn = document.getElementById('menu-button');
    const logoutBtn = document.getElementById('logout-button');
    const ptrSpinner = document.getElementById('ptr-spinner');
    
    // --- 2. AUTH STATE & GREETING ---
    auth.onAuthStateChanged(user => {
        if (user) {
            updateGreeting(user);
            // Load specific page logic if functions exist
            if (typeof loadTransactions === 'function') loadTransactions(user.uid);
            if (typeof updateDashboard === 'function') updateDashboard(user.uid);
            if (typeof NotificationManager !== 'undefined') NotificationManager.checkDueItems(user.uid);
        } else {
            // Redirect to login if not on login page
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    function updateGreeting(user) {
        const titleEl = document.getElementById('greeting-title');
        const subEl = document.getElementById('user-greeting');
        
        if (titleEl) {
            const hour = new Date().getHours();
            let greeting = "Good Morning";
            if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
            else if (hour >= 17) greeting = "Good Evening";
            
            // Get first name
            const firstName = user.displayName ? user.displayName.split(' ')[0] : 'User';
            titleEl.innerText = `${greeting}, ${firstName}!`;
        }
    }

    // --- 3. SIDEBAR NAVIGATION (Mobile) ---
    if (menuBtn && sidebar && sidebarBackdrop) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
            sidebarBackdrop.classList.remove('hidden');
            if(window.triggerHaptic) window.triggerHaptic(10);
        });

        const closeSidebar = () => {
            sidebar.classList.add('-translate-x-full');
            sidebarBackdrop.classList.add('hidden');
        };

        sidebarBackdrop.addEventListener('click', closeSidebar);
        window.closeSidebarMenu = closeSidebar; // Expose globally
    }

    // --- 4. LOGOUT HANDLER ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to log out?")) {
                auth.signOut().then(() => window.location.href = 'login.html');
            }
        });
    }

    // --- 5. PULL-TO-REFRESH LOGIC ---
    let touchStartY = 0;
    const mainContent = document.getElementById('main-content');
    
    if (mainContent && ptrSpinner) {
        mainContent.addEventListener('touchstart', e => {
            if (mainContent.scrollTop === 0) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        mainContent.addEventListener('touchmove', e => {
            const touchY = e.touches[0].clientY;
            const pullDistance = touchY - touchStartY;

            if (mainContent.scrollTop === 0 && pullDistance > 0) {
                if (pullDistance > 60) {
                    ptrSpinner.classList.add('visible');
                    ptrSpinner.style.transform = `translateX(-50%) rotate(${pullDistance * 2}deg)`;
                }
            }
        }, { passive: true });

        mainContent.addEventListener('touchend', e => {
            const touchY = e.changedTouches[0].clientY;
            if (mainContent.scrollTop === 0 && (touchY - touchStartY) > 80) {
                // Trigger Refresh
                performRefresh();
            } else {
                ptrSpinner.classList.remove('visible');
            }
            touchStartY = 0;
        });
    }

    async function performRefresh() {
        if(window.triggerHaptic) window.triggerHaptic(20);
        
        // Reload Data
        const user = auth.currentUser;
        if (user) {
            if (typeof loadTransactions === 'function') await loadTransactions(user.uid);
            if (typeof updateDashboard === 'function') await updateDashboard(user.uid);
        }

        setTimeout(() => {
            ptrSpinner.classList.remove('visible');
            if(typeof showToast === 'function') showToast("Dashboard Updated", "success");
        }, 800);
    }

    // --- 6. GLOBAL UTILITIES ---
    
    // Haptic Feedback (Vibration)
    window.triggerHaptic = function(duration = 10) {
        const isHapticEnabled = localStorage.getItem('hapticEnabled') !== 'false';
        if (isHapticEnabled && navigator.vibrate) {
            navigator.vibrate(duration);
        }
    };

    // --- 7. SERVICE WORKER REGISTRATION (PWA) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW registration failed:', err));
        });
    }
});