// --- NOTIFICATION MANAGER ---
// Handles both In-App Toasts and Native System Notifications

const NotificationManager = {
    
    // 1. INITIALIZE (Request Permissions)
    init: function() {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            // Ask for permission silently or on first interaction
            // We usually wait for user action, but can check status here
        }
        
        // Create Toast Container if not exists
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] flex flex-col gap-2 w-full max-w-xs pointer-events-none';
            document.body.appendChild(container);
        }
    },

    // 2. SHOW IN-APP TOAST (The colorful popups)
    showToast: function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        // Styles based on type
        let bgClass, icon;
        switch (type) {
            case 'success':
                bgClass = 'bg-white dark:bg-gray-800 border-l-4 border-emerald-500';
                icon = '<i class="fas fa-check-circle text-emerald-500 text-xl"></i>';
                break;
            case 'error':
                bgClass = 'bg-white dark:bg-gray-800 border-l-4 border-red-500';
                icon = '<i class="fas fa-times-circle text-red-500 text-xl"></i>';
                break;
            case 'warning':
                bgClass = 'bg-white dark:bg-gray-800 border-l-4 border-amber-500';
                icon = '<i class="fas fa-exclamation-circle text-amber-500 text-xl"></i>';
                break;
            default:
                bgClass = 'bg-white dark:bg-gray-800 border-l-4 border-blue-500';
                icon = '<i class="fas fa-info-circle text-blue-500 text-xl"></i>';
        }

        // Create Element
        const toast = document.createElement('div');
        toast.className = `${bgClass} shadow-lg rounded-r-xl p-4 flex items-center gap-3 transform -translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto min-w-[300px]`;
        toast.innerHTML = `
            ${icon}
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800 dark:text-white leading-tight">${message}</p>
            </div>
        `;

        container.appendChild(toast);

        // Haptic Feedback
        if(window.triggerHaptic) window.triggerHaptic(type === 'error' ? 50 : 20);

        // Animate In
        requestAnimationFrame(() => {
            toast.classList.remove('-translate-y-10', 'opacity-0');
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('-translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // 3. SEND NATIVE NOTIFICATION (System Level)
    sendSystemNotification: function(title, body) {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: 'assets/img/icon-192.png',
                badge: 'assets/img/icon-192.png',
                vibrate: [200, 100, 200]
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.sendSystemNotification(title, body);
                }
            });
        }
    },

    // 4. CHECK REMINDERS (Called on App Load)
    checkDueItems: async function(userId) {
        // Only run once per session to avoid spam
        if (sessionStorage.getItem('checked_reminders')) return;
        sessionStorage.setItem('checked_reminders', 'true');

        // A. Check Subscriptions
        try {
            const today = new Date().toISOString().split('T')[0];
            const subsSnapshot = await db.collection('users').doc(userId).collection('recurring')
                .where('nextDue', '==', today)
                .where('active', '==', true)
                .get();

            if (!subsSnapshot.empty) {
                subsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const msg = `Reminder: ${data.name} payment of ₹${data.amount} is due today!`;
                    
                    this.showToast(msg, 'warning');
                    this.sendSystemNotification("Bill Due Today", msg);
                });
            }
        } catch (e) { console.error("Reminder Check Error", e); }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    NotificationManager.init();
});

// Expose globally
window.NotificationManager = NotificationManager;
// Alias for easier usage
window.showToast = NotificationManager.showToast.bind(NotificationManager);