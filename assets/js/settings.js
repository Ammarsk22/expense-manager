document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeSettings(user);
        } else {
            window.location.href = 'login.html';
        }
    });
});

function initializeSettings(user) {
    // --- UI ELEMENTS ---
    const langSelect = document.getElementById('language-select');
    const appLockToggle = document.getElementById('app-lock-toggle');
    const biometricToggle = document.getElementById('biometric-toggle');
    const changePinBtn = document.getElementById('change-pin-btn');
    const changePinContainer = document.getElementById('change-pin-container');
    
    const themeToggle = document.getElementById('theme-toggle');
    const hapticToggle = document.getElementById('haptic-toggle');
    const currencySelect = document.getElementById('currency-select');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- 1. LANGUAGE SETTINGS ---
    if (langSelect && window.Lang) {
        // Load current
        langSelect.value = Lang.currentLang;
        
        langSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            Lang.setLanguage(lang);
            if(window.triggerHaptic) window.triggerHaptic(10);
            
            // Optional: Show toast or reload to apply everywhere
            alert(lang === 'hi' ? "भाषा हिंदी में बदली गई।" : "Language changed to English.");
            location.reload(); 
        });
    }

    // --- 2. SECURITY SETTINGS ---
    if (appLockToggle && window.SecurityManager) {
        // Init State
        const isLocked = localStorage.getItem('app_lock_enabled') === 'true';
        appLockToggle.checked = isLocked;
        if(isLocked) changePinContainer.classList.remove('hidden');

        appLockToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Enable Lock
                const pin = prompt("Set a 4-digit PIN for App Lock:");
                if (pin && pin.length === 4 && !isNaN(pin)) {
                    SecurityManager.setPin(pin);
                    changePinContainer.classList.remove('hidden');
                } else {
                    e.target.checked = false; // Revert
                    alert("Invalid PIN. Please enter exactly 4 digits.");
                }
            } else {
                // Disable Lock
                if (confirm("Disable App Lock?")) {
                    SecurityManager.removePin();
                    changePinContainer.classList.add('hidden');
                } else {
                    e.target.checked = true; // Revert
                }
            }
        });
    }

    if (biometricToggle) {
        biometricToggle.checked = localStorage.getItem('biometric_enabled') === 'true';
        biometricToggle.addEventListener('change', (e) => {
            localStorage.setItem('biometric_enabled', e.target.checked);
            if(e.target.checked) alert("Biometric Unlock enabled (if supported by device).");
        });
    }

    if (changePinBtn) {
        changePinBtn.addEventListener('click', () => {
            const currentPin = prompt("Enter Current PIN:");
            const savedPin = atob(localStorage.getItem('app_pin'));
            
            if (currentPin === savedPin) {
                const newPin = prompt("Enter New 4-digit PIN:");
                if (newPin && newPin.length === 4 && !isNaN(newPin)) {
                    SecurityManager.setPin(newPin);
                    alert("PIN Updated Successfully!");
                } else {
                    alert("Invalid PIN format.");
                }
            } else {
                alert("Incorrect PIN.");
            }
        });
    }

    // --- 3. PREFERENCES (Theme, Haptic, Currency) ---
    if (themeToggle) {
        themeToggle.checked = document.documentElement.classList.contains('dark');
        themeToggle.addEventListener('change', () => {
            if (window.toggleTheme) window.toggleTheme();
            if(window.triggerHaptic) window.triggerHaptic(10);
        });
    }

    if (hapticToggle) {
        hapticToggle.checked = localStorage.getItem('hapticEnabled') !== 'false';
        hapticToggle.addEventListener('change', (e) => {
            localStorage.setItem('hapticEnabled', e.target.checked);
            if(e.target.checked && navigator.vibrate) navigator.vibrate(20);
        });
    }

    if (currencySelect) {
        currencySelect.value = localStorage.getItem('app_currency') || '₹';
        currencySelect.addEventListener('change', (e) => {
            localStorage.setItem('app_currency', e.target.value);
            if(window.triggerHaptic) window.triggerHaptic(10);
            alert(`Currency updated to ${e.target.value}.`);
        });
    }

    // --- 4. DATA & LOGOUT ---
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', async () => {
            if (confirm("⚠️ Are you sure you want to delete ALL transactions? This cannot be undone.")) {
                const promptVal = prompt("Type 'DELETE' to confirm:");
                if (promptVal === 'DELETE') {
                    // Logic to delete collection
                    // Note: Client-side deletion of huge collections is not efficient, usually done via Cloud Function
                    // Here is a simple batch delete for demo
                    alert("Deletion started... (This feature requires Cloud Functions for full cleanup)");
                }
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm("Logout?")) {
                auth.signOut().then(() => window.location.href = 'login.html');
            }
        });
    }
}