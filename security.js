/**
 * FinTrack Security Module
 * Handles App Lock, PIN Verification, and Settings
 */

const Security = {
    key: 'fintrack_pin',
    sessionKey: 'fintrack_unlocked',
    
    init() {
        this.renderPinModal(); // Prepare the modal structure
        this.checkLock();      // Check if locking is needed on load
        this.bindSettings();   // Bind listeners for Settings page
    },

    getPin() {
        return localStorage.getItem(this.key);
    },

    setPin(pin) {
        localStorage.setItem(this.key, pin);
    },

    removePin() {
        localStorage.removeItem(this.key);
        sessionStorage.removeItem(this.sessionKey);
    },

    isLocked() {
        return this.getPin() && !sessionStorage.getItem(this.sessionKey);
    },

    checkLock() {
        if (this.isLocked()) {
            this.showModal('unlock');
        }
    },

    unlock() {
        sessionStorage.setItem(this.sessionKey, 'true');
        this.hideModal();
    },

    // --- UI Logic ---
    
    renderPinModal() {
        if (document.getElementById('pin-modal')) return;

        const modalHtml = `
            <div id="pin-modal" class="fixed inset-0 bg-gray-900 z-[60] flex flex-col items-center justify-center hidden">
                <div class="text-center mb-8">
                    <div class="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/50">
                        <i class="fas fa-lock text-2xl text-white"></i>
                    </div>
                    <h2 id="pin-title" class="text-2xl font-bold text-white mb-2">Enter PIN</h2>
                    <p id="pin-subtitle" class="text-gray-400 text-sm">Please enter your 4-digit PIN</p>
                </div>

                <div class="flex gap-4 mb-8">
                    <div class="pin-dot w-4 h-4 rounded-full bg-gray-700 border-2 border-transparent transition-all duration-200"></div>
                    <div class="pin-dot w-4 h-4 rounded-full bg-gray-700 border-2 border-transparent transition-all duration-200"></div>
                    <div class="pin-dot w-4 h-4 rounded-full bg-gray-700 border-2 border-transparent transition-all duration-200"></div>
                    <div class="pin-dot w-4 h-4 rounded-full bg-gray-700 border-2 border-transparent transition-all duration-200"></div>
                </div>

                <div class="grid grid-cols-3 gap-6">
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">1</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">2</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">3</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">4</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">5</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">6</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">7</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">8</button>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">9</button>
                    <div class="w-16 h-16"></div>
                    <button class="pin-btn w-16 h-16 rounded-full bg-gray-800 text-white text-xl font-bold hover:bg-gray-700 active:bg-indigo-600 transition-colors">0</button>
                    <button id="pin-backspace" class="w-16 h-16 rounded-full text-gray-400 text-xl hover:text-white transition-colors flex items-center justify-center">
                        <i class="fas fa-backspace"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.attachPadEvents();
    },

    currentInput: '',
    mode: 'unlock', // unlock, setup, verify, disable
    tempPin: '', // To store first entry during setup

    showModal(mode) {
        this.mode = mode;
        this.currentInput = '';
        this.updateDots();
        
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-title');
        const subtitle = document.getElementById('pin-subtitle');

        modal.classList.remove('hidden');

        if (mode === 'unlock') {
            title.textContent = 'FinTrack Locked';
            subtitle.textContent = 'Enter your PIN to continue';
        } else if (mode === 'setup') {
            title.textContent = 'Set New PIN';
            subtitle.textContent = 'Create a 4-digit PIN';
        } else if (mode === 'verify') {
            title.textContent = 'Confirm PIN';
            subtitle.textContent = 'Re-enter your PIN';
        } else if (mode === 'disable') {
            title.textContent = 'Disable Lock';
            subtitle.textContent = 'Enter PIN to disable';
        }
    },

    hideModal() {
        document.getElementById('pin-modal').classList.add('hidden');
        this.currentInput = '';
    },

    attachPadEvents() {
        const btns = document.querySelectorAll('.pin-btn');
        const backspace = document.getElementById('pin-backspace');

        btns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleInput(e.target.innerText));
        });

        backspace.addEventListener('click', () => {
            this.currentInput = this.currentInput.slice(0, -1);
            this.updateDots();
        });
    },

    handleInput(num) {
        if (this.currentInput.length < 4) {
            this.currentInput += num;
            this.updateDots();
        }

        if (this.currentInput.length === 4) {
            setTimeout(() => this.processPin(), 300); // Small delay for UX
        }
    },

    updateDots() {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((dot, idx) => {
            if (idx < this.currentInput.length) {
                dot.classList.add('bg-indigo-500', 'border-indigo-500');
                dot.classList.remove('bg-gray-700', 'border-transparent');
            } else {
                dot.classList.add('bg-gray-700', 'border-transparent');
                dot.classList.remove('bg-indigo-500', 'border-indigo-500');
            }
        });
    },

    processPin() {
        if (this.mode === 'unlock') {
            if (this.currentInput === this.getPin()) {
                this.unlock();
            } else {
                this.shakeModal();
                this.currentInput = '';
                this.updateDots();
            }
        } 
        else if (this.mode === 'setup') {
            this.tempPin = this.currentInput;
            this.showModal('verify');
        } 
        else if (this.mode === 'verify') {
            if (this.currentInput === this.tempPin) {
                this.setPin(this.currentInput);
                this.hideModal();
                this.updateSettingsUI(true);
                alert('PIN Setup Successfully!');
            } else {
                alert('PINs do not match. Try again.');
                this.showModal('setup');
            }
        }
        else if (this.mode === 'disable') {
            if (this.currentInput === this.getPin()) {
                this.removePin();
                this.hideModal();
                this.updateSettingsUI(false);
                alert('App Lock Disabled.');
            } else {
                this.shakeModal();
                this.currentInput = '';
                this.updateDots();
            }
        }
    },

    shakeModal() {
        const dots = document.querySelector('.flex.gap-4');
        dots.classList.add('animate-pulse', 'text-red-500'); // Simple visual cue
        setTimeout(() => dots.classList.remove('animate-pulse', 'text-red-500'), 500);
    },

    // --- Settings Page Integration ---
    
    bindSettings() {
        const toggle = document.getElementById('pin-toggle');
        const changeBtn = document.getElementById('change-pin-btn');

        if (toggle) {
            // Set initial state
            toggle.checked = !!this.getPin();

            toggle.addEventListener('click', (e) => {
                e.preventDefault(); // Control manually
                if (this.getPin()) {
                    // Try to disable
                    this.showModal('disable');
                } else {
                    // Try to enable
                    this.showModal('setup');
                }
            });
        }

        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                if (this.getPin()) {
                    this.showModal('setup'); // Overwrite logic
                } else {
                    alert('Please enable PIN first.');
                }
            });
        }
    },

    updateSettingsUI(isEnabled) {
        const toggle = document.getElementById('pin-toggle');
        if (toggle) toggle.checked = isEnabled;
    }
};

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    Security.init();
});