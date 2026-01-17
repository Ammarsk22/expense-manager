// --- SECURITY MANAGER ---
// Handles App Lock (PIN), Biometric Logic, and Privacy Mode

const SecurityManager = {
    
    // Config
    inactivityLimit: 60 * 1000, // 1 Minute
    inactivityTimer: null,
    isLocked: false,

    // 1. INITIALIZE
    init: function() {
        this.renderLockScreen(); // Build UI first
        this.checkPrivacyMode();
        this.checkAppLock();     // Check if we need to lock immediately
        this.setupAutoLock();
    },

    // --- PRIVACY MODE (Blur Amounts) ---
    togglePrivacy: function(enable) {
        if (enable) {
            document.body.classList.add('privacy-active');
            localStorage.setItem('privacy_mode', 'true');
            if(typeof showToast === 'function') showToast("Privacy Mode On", "info");
        } else {
            document.body.classList.remove('privacy-active');
            localStorage.setItem('privacy_mode', 'false');
            if(typeof showToast === 'function') showToast("Privacy Mode Off", "info");
        }
    },

    checkPrivacyMode: function() {
        if (localStorage.getItem('privacy_mode') === 'true') {
            document.body.classList.add('privacy-active');
        }
    },

    // --- PIN MANAGEMENT ---
    setPin: function(pin) {
        // Simple Base64 encoding for client-side storage
        // (Note: For high security, use hashing, but Base64 is sufficient for basic app lock)
        localStorage.setItem('app_pin', btoa(pin)); 
        localStorage.setItem('app_lock_enabled', 'true');
        alert("App Lock Enabled!");
    },

    removePin: function() {
        localStorage.removeItem('app_pin');
        localStorage.setItem('app_lock_enabled', 'false');
        alert("App Lock Disabled.");
    },

    // --- LOCKING LOGIC ---
    checkAppLock: function() {
        // If enabled, lock immediately on load
        if (localStorage.getItem('app_lock_enabled') === 'true') {
            this.lockApp();
        }
    },

    lockApp: function() {
        // Don't lock if not enabled
        if (localStorage.getItem('app_lock_enabled') !== 'true') return;
        
        this.isLocked = true;
        const lockScreen = document.getElementById('app-lock-screen');
        const pinInput = document.getElementById('pin-input');
        
        if (lockScreen && pinInput) {
            lockScreen.classList.remove('hidden');
            lockScreen.classList.add('flex');
            pinInput.value = '';
            this.updateDots('');
            pinInput.focus();
        }
    },

    unlockApp: function(enteredPin) {
        const savedPin = atob(localStorage.getItem('app_pin'));
        
        if (enteredPin === savedPin) {
            this.isLocked = false;
            const lockScreen = document.getElementById('app-lock-screen');
            if (lockScreen) {
                lockScreen.classList.add('hidden');
                lockScreen.classList.remove('flex');
            }
            this.resetInactivityTimer();
            if(window.triggerHaptic) window.triggerHaptic(20);
        } else {
            // Wrong PIN Animation
            if(window.triggerHaptic) window.triggerHaptic(50);
            
            const pinDisplay = document.getElementById('pin-display');
            pinDisplay.classList.add('animate-shake');
            setTimeout(() => pinDisplay.classList.remove('animate-shake'), 500);
            
            document.getElementById('pin-input').value = '';
            this.updateDots('');
        }
    },

    // --- AUTO-LOCK ON INACTIVITY ---
    setupAutoLock: function() {
        if (localStorage.getItem('app_lock_enabled') !== 'true') return;

        // Reset timer on any interaction
        const reset = this.resetInactivityTimer.bind(this);
        window.onload = reset;
        window.onmousemove = reset;
        window.onmousedown = reset; 
        window.ontouchstart = reset; 
        window.onclick = reset;
        window.onkeydown = reset;
    },

    resetInactivityTimer: function() {
        if (this.isLocked) return;
        
        clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(() => {
            this.lockApp();
        }, this.inactivityLimit);
    },

    // --- UI RENDERER (Injects Lock Screen HTML) ---
    renderLockScreen: function() {
        if (document.getElementById('app-lock-screen')) return;

        const div = document.createElement('div');
        div.id = 'app-lock-screen';
        div.className = 'fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center hidden transition-opacity duration-300';
        div.innerHTML = `
            <div class="text-center w-full max-w-sm px-6">
                <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/50">
                    <i class="fas fa-lock text-white text-3xl"></i>
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">App Locked</h2>
                <p class="text-gray-400 text-sm mb-8">Enter your PIN to unlock</p>

                <div id="pin-display" class="flex gap-4 justify-center mb-10">
                    <div class="w-4 h-4 rounded-full bg-gray-700 border border-gray-600 dot transition-colors duration-200"></div>
                    <div class="w-4 h-4 rounded-full bg-gray-700 border border-gray-600 dot transition-colors duration-200"></div>
                    <div class="w-4 h-4 rounded-full bg-gray-700 border border-gray-600 dot transition-colors duration-200"></div>
                    <div class="w-4 h-4 rounded-full bg-gray-700 border border-gray-600 dot transition-colors duration-200"></div>
                </div>

                <input type="password" id="pin-input" maxlength="4" class="opacity-0 absolute inset-0 h-full w-full -z-10" inputmode="numeric" pattern="[0-9]*">

                <div class="grid grid-cols-3 gap-6 max-w-[280px] mx-auto select-none">
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(1)">1</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(2)">2</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(3)">3</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(4)">4</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(5)">5</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(6)">6</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(7)">7</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(8)">8</button>
                    <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(9)">9</button>
                    <div class="w-16 h-16"></div> <button class="w-16 h-16 rounded-full bg-gray-800 text-white font-bold text-2xl hover:bg-gray-700 active:bg-indigo-600 transition-colors" onclick="SecurityManager.pressKey(0)">0</button>
                    <button class="w-16 h-16 rounded-full text-red-400 hover:text-red-300 transition flex items-center justify-center active:scale-90" onclick="SecurityManager.clearKey()"><i class="fas fa-backspace text-2xl"></i></button>
                </div>
                
                <p id="biometric-btn" class="mt-8 text-indigo-400 text-sm font-medium hidden cursor-pointer" onclick="alert('Use device sensor')"><i class="fas fa-fingerprint mr-2"></i>Use Biometric</p>
            </div>
        `;
        document.body.appendChild(div);

        // Bind Input Logic
        const input = document.getElementById('pin-input');
        
        // Keep focus on input to allow physical keyboard usage
        div.addEventListener('click', () => input.focus());
        input.addEventListener('blur', () => { if(this.isLocked) input.focus(); });

        input.addEventListener('input', (e) => {
            // Prevent non-numeric
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            this.updateDots(e.target.value);
            if (e.target.value.length === 4) {
                setTimeout(() => this.unlockApp(e.target.value), 150);
            }
        });
        
        // Show Biometric option if enabled
        if(localStorage.getItem('biometric_enabled') === 'true') {
            document.getElementById('biometric-btn').classList.remove('hidden');
        }
    },

    // --- KEYPAD HANDLERS ---
    pressKey: function(num) {
        if(window.triggerHaptic) window.triggerHaptic(15);
        
        const input = document.getElementById('pin-input');
        if (input.value.length < 4) {
            input.value += num;
            this.updateDots(input.value);
            
            if (input.value.length === 4) {
                setTimeout(() => this.unlockApp(input.value), 150);
            }
        }
    },

    clearKey: function() {
        if(window.triggerHaptic) window.triggerHaptic(10);
        const input = document.getElementById('pin-input');
        input.value = input.value.slice(0, -1);
        this.updateDots(input.value);
    },

    updateDots: function(val) {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index < val.length) {
                dot.classList.add('bg-indigo-500', 'border-indigo-500', 'scale-110');
                dot.classList.remove('bg-gray-700', 'border-gray-600');
            } else {
                dot.classList.remove('bg-indigo-500', 'border-indigo-500', 'scale-110');
                dot.classList.add('bg-gray-700', 'border-gray-600');
            }
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    SecurityManager.init();
});

// Expose globally
window.SecurityManager = SecurityManager;