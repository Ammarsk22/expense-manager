/**
 * FinTrack Notifications Module
 * Handles permission requests and due date checks
 */

const Notifications = {
    init() {
        this.checkPermission();
        this.setupSettingsListener();
        
        // Check for reminders if enabled
        if (this.isEnabled()) {
            this.checkForDueItems();
        }
    },

    // 1. Permission Logic
    async requestPermission() {
        if (!('Notification' in window)) {
            alert('This browser does not support notifications.');
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            localStorage.setItem('fintrack_notifications', 'true');
            this.send('Notifications Enabled', 'You will now receive reminders for bills and debts.');
            return true;
        } else {
            localStorage.setItem('fintrack_notifications', 'false');
            alert('Permission denied. Enable notifications in browser settings.');
            return false;
        }
    },

    isEnabled() {
        return localStorage.getItem('fintrack_notifications') === 'true' && Notification.permission === 'granted';
    },

    checkPermission() {
        const toggle = document.getElementById('notification-toggle');
        if (toggle) {
            toggle.checked = this.isEnabled();
        }
    },

    setupSettingsListener() {
        const toggle = document.getElementById('notification-toggle');
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.requestPermission();
                } else {
                    localStorage.setItem('fintrack_notifications', 'false');
                }
            });
        }
    },

    // 2. Trigger Notification
    send(title, body) {
        if (Notification.permission === 'granted') {
            // Try Service Worker first (Better for Mobile)
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: 'assets/img/icon-192.png',
                        vibrate: [200, 100, 200],
                        badge: 'assets/img/icon-192.png'
                    });
                });
            } else {
                // Fallback to standard API
                new Notification(title, {
                    body: body,
                    icon: 'assets/img/icon-192.png'
                });
            }
        }
    },

    // 3. Logic to Check Database for Due Dates
    async checkForDueItems() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        // Prevent spamming: Check only once per day
        const lastCheck = localStorage.getItem('last_notification_check');
        const todayStr = new Date().toISOString().split('T')[0];

        if (lastCheck === todayStr) {
            console.log("Reminders already checked today.");
            return;
        }

        // Calculate Dates (Today & Tomorrow)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayISO = today.toISOString().split('T')[0];
        const tomorrowISO = tomorrow.toISOString().split('T')[0];

        let alerts = [];

        try {
            // A. Check Subscriptions
            const subsSnapshot = await db.collection('users').doc(user.uid).collection('recurring').get();
            subsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.nextDueDate === todayISO) {
                    alerts.push(`Subscription Due Today: ${data.name} (₹${data.amount})`);
                } else if (data.nextDueDate === tomorrowISO) {
                    alerts.push(`Subscription Due Tomorrow: ${data.name} (₹${data.amount})`);
                }
            });

            // B. Check Debts (To Receive / To Pay)
            const debtsSnapshot = await db.collection('users').doc(user.uid).collection('debts').get();
            debtsSnapshot.forEach(doc => {
                const data = doc.data();
                // Check if 'due-date' field exists (we added it in Debt Manager)
                if (data.date === todayISO) { // Assuming 'date' or specific 'dueDate' field
                     // Simple check on created date for now, or update Debt logic to have strict due dates
                }
            });

            // C. Send Notifications
            if (alerts.length > 0) {
                this.send('FinTrack Reminders 🔔', alerts.join('\n'));
                localStorage.setItem('last_notification_check', todayStr);
            }

        } catch (error) {
            console.error("Error checking reminders:", error);
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase Auth
    setTimeout(() => {
        if (firebase.auth().currentUser) {
            Notifications.init();
        }
    }, 2000);
});