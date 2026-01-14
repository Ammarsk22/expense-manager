/**
 * Main JavaScript File
 * Handles: Global Navigation, Sidebar, Haptic Feedback, Swipe Gestures, and PWA Features
 */

// --- 1. GLOBAL FUNCTIONS (Available on all pages) ---

window.openSidebarMenu = function() {
    if (navigator.vibrate) navigator.vibrate(15); // Haptic
    
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    // Fix: Create backdrop if it doesn't exist (Dynamic fix for other pages)
    // We set z-40 so it stays BEHIND the sidebar (which is usually z-50 or z-60)
    if (!backdrop && sidebar) {
        const newBackdrop = document.createElement('div');
        newBackdrop.id = 'sidebar-backdrop';
        newBackdrop.className = 'fixed inset-0 bg-black/50 z-40 hidden md:hidden transition-opacity';
        newBackdrop.onclick = window.closeSidebarMenu;
        document.body.appendChild(newBackdrop);
        
        // Small delay to allow DOM update
        setTimeout(() => window.openSidebarMenu(), 10);
        return;
    }

    if (sidebar) {
        sidebar.classList.remove('-translate-x-full');
        // Fix: Force Sidebar to be on top of everything
        sidebar.classList.add('z-[100]'); 
    }
    
    if (backdrop) {
        backdrop.classList.remove('hidden');
        setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
    }
};

window.closeSidebarMenu = function() {
    if (navigator.vibrate) navigator.vibrate(15); // Haptic

    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    
    if (sidebar) {
        sidebar.classList.add('-translate-x-full');
        // Reset z-index after animation finishes
        setTimeout(() => sidebar.classList.remove('z-[100]'), 300);
    }
    
    if (backdrop) {
        backdrop.classList.add('opacity-0');
        setTimeout(() => backdrop.classList.add('hidden'), 300);
    }
};

// --- 2. DOM LOADED LOGIC ---

document.addEventListener('DOMContentLoaded', function() {
    
    // A. Apply Haptic Feedback to ALL Navigation Links
    // This makes sure vibration works on Calendar, Settings, etc.
    const allNavLinks = document.querySelectorAll('nav a, .md\\:hidden a, button, .btn');
    allNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(10);
        });
    });

    // B. Shortcuts & Deep Link Handler
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');

    if (action) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
            if (action === 'add') {
                const form = document.getElementById('transaction-form');
                if (form) {
                    form.scrollIntoView({ behavior: 'smooth' });
                    form.classList.add('ring-2', 'ring-indigo-500', 'rounded-lg');
                    setTimeout(() => form.classList.remove('ring-2', 'ring-indigo-500', 'rounded-lg'), 2000);
                }
            } else if (action === 'scan') {
                const scanBtn = document.getElementById('scan-btn');
                if (scanBtn) scanBtn.click();
            }
        }, 500);
    }

    // C. Legacy Menu Button Handler (Safe Check)
    const menuButton = document.getElementById('menu-button');
    if (menuButton) {
        // Remove old listeners to avoid duplicates, use new Global function
        menuButton.replaceWith(menuButton.cloneNode(true));
        document.getElementById('menu-button').addEventListener('click', (e) => {
            e.stopPropagation();
            window.openSidebarMenu();
        });
    }

    // D. Edge Swipe to Open Sidebar (Works on ALL pages)
    let touchStartX = 0;
    let touchStartY = 0;
    const EDGE_THRESHOLD = 30; 
    const SWIPE_THRESHOLD = 70;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        
        if (touchStartX < EDGE_THRESHOLD && 
            touchEndX > touchStartX + SWIPE_THRESHOLD && 
            Math.abs(touchEndY - touchStartY) < 50) {
            
            window.openSidebarMenu();
        }
    }, { passive: true });

    // E. Pull-to-Refresh Logic (Generic for any page with main content)
    const mainContent = document.querySelector('main'); // Selects <main> on any page
    const spinner = document.getElementById('ptr-spinner');
    
    // Only run if spinner exists on the page
    if(mainContent && spinner) {
        let pStart = {x: 0, y:0};
        let pCurrent = {x: 0, y:0};
        let isDragging = false;

        mainContent.addEventListener('touchstart', e => {
            if (mainContent.scrollTop <= 0) {
                pStart.x = e.touches[0].screenX;
                pStart.y = e.touches[0].screenY;
                isDragging = true;
            }
        }, {passive: true});

        mainContent.addEventListener('touchmove', e => {
            if (!isDragging) return;
            pCurrent.y = e.touches[0].screenY;
            let diff = pCurrent.y - pStart.y;
            
            if (diff > 0 && mainContent.scrollTop <= 0) {
                 const move = Math.min(diff * 0.5, 150); 
                 spinner.style.transform = `translateY(${move}px) translateX(-50%)`;
                 if(diff > 50) {
                     spinner.classList.add('visible');
                     spinner.style.opacity = '1';
                 }
            }
        }, {passive: true});

        mainContent.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            pCurrent.y = e.changedTouches[0].screenY;
            let diff = pCurrent.y - pStart.y;
            spinner.style.transform = 'translateX(-50%)'; 
            
            if (diff > 80 && mainContent.scrollTop <= 0) {
                 if (navigator.vibrate) navigator.vibrate(30);
                 setTimeout(() => window.location.reload(), 500);
            } else {
                 spinner.classList.remove('visible');
                 spinner.style.opacity = '0';
            }
        });
    }
});