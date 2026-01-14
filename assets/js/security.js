/**
 * FinTrack Security Module
 * Handles App Lock, PIN Verification, and Biometric Authentication (WebAuthn)
 */

const Security = {
    key: 'fintrack_pin',
    sessionKey: 'fintrack_unlocked',
    bioKey: 'fintrack_bio_id', // Stores the Credential ID for WebAuthn
    
    init() {
        this.renderPinModal(); 
        this.checkLock();      
        this.bindSettings();   
    },

    // --- PIN & Storage Helpers ---
    getPin() { return localStorage.getItem(this.key); },
    setPin(pin) { localStorage.setItem(this.key, pin); },
    
    getBioId() { return localStorage.getItem(this.bioKey); },
    setBioId(id) { localStorage.setItem(this.bioKey, id); },

    removeSecurity() {
        localStorage.removeItem(this.key);
        localStorage.removeItem(this.bioKey); // Remove biometric data
        sessionStorage.removeItem(this.sessionKey);
    },

    isLocked() {
        return this.getPin() && !sessionStorage.getItem(this.sessionKey);
    },

    // --- Main Lock Logic ---
    async checkLock() {
        if (this.isLocked()) {
            // Agar Biometric set hai, to pehle usse try karein
            if (this.getBioId()) {
                const success = await this.verifyBiometric();
                if (success) {
                    this.unlock();
                    return;
                }
            }
            // Agar biometric fail ho ya na ho, PIN modal dikhayein
            this.showModal('unlock');
        }
    },

    unlock() {
        sessionStorage.setItem(this.sessionKey, 'true');
        this.hideModal();
        if (navigator.vibrate) navigator.vibrate(50); // Haptic success
    },

    // --- Biometric (WebAuthn) Logic ---
    
    // 1. Check if device supports Biometric
    async isBiometricAvailable() {
        if (!window.PublicKeyCredential) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    },

    // 2. Register/Setup Biometric (Create Credential)
    async registerBiometric() {
        if (!window.PublicKeyCredential) {
            alert("Your device does not support Biometric Authentication.");
            return false;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const publicKey = {
            challenge: challenge,
            rp: { name: "FinTrack Expense Manager" },
            user: {
                id: new Uint8Array(16),
                name: "user@fintrack",
                displayName: "FinTrack User"
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Forces built-in fingerprint/faceID
                userVerification: "required"
            },
            timeout: 60000
        };

        try {
            const credential = await navigator.credentials.create({ publicKey });
            // Save the Credential ID to use for verification later
            // We need to convert ArrayBuffer to Base64 string to store in localStorage
            const credId = this.bufferToBase64(credential.rawId);
            this.setBioId(credId);
            return true;
        } catch (err) {
            console.error("Biometric Setup Failed:", err);
            return false;
        }
    },

    // 3. Verify Biometric (Unlock App)
    async verifyBiometric() {
        const savedId = this.getBioId();
        if (!savedId) return false;

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        try {
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    allowCredentials: [{
                        id: this.base64ToBuffer(savedId),
                        type: "public-key"
                    }],
                    userVerification: "required"
                }
            });
            // If we get a credential back, the OS successfully verified the user
            return !!credential;
        } catch (err) {
            console.log("Biometric Verification Cancelled/Failed", err);
            return false;
        }
    },

    // Helpers for ArrayBuffer <-> Base64
    bufferToBase64(buffer) {
        return btoa(String.fromCharCode(...new Uint8Array(buffer)));
    },
    base64ToBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes.buffer;
    },


    // --- UI Logic (PIN Modal) ---
    
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
                    
                    <button id="bio-unlock-btn" class="hidden mt-4 px-4 py-2 bg-gray-800 rounded-full text-indigo-400 text-sm border border-gray-700 hover:bg-gray-700 transition">
                        <i class="fas fa-fingerprint mr-2"></i> Use Biometric
                    </button>
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
        
        // Listener for manual biometric button on lock screen
        document.getElementById('bio-unlock-btn').addEventListener('click', async () => {
             const success = await this.verifyBiometric();
             if(success) this.unlock();
        });
    },

    currentInput: '',
    mode: 'unlock', 
    tempPin: '', 

    showModal(mode) {
        this.mode = mode;
        this.currentInput = '';
        this.updateDots();
        
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-title');
        const subtitle = document.getElementById('pin-subtitle');
        const bioBtn = document.getElementById('bio-unlock-btn');

        modal.classList.remove('hidden');

        if (mode === 'unlock') {
            title.textContent = 'FinTrack Locked';
            subtitle.textContent = 'Enter your PIN to continue';
            // Show bio button only if enrolled
            if(this.getBioId()) bioBtn.classList.remove('hidden');
            else bioBtn.classList.add('hidden');
        } else if (mode === 'setup') {
            title.textContent = 'Set New PIN';
            subtitle.textContent = 'Create a 4-digit PIN';
            bioBtn.classList.add('hidden');
        } else if (mode === 'verify') {
            title.textContent = 'Confirm PIN';
            subtitle.textContent = 'Re-enter your PIN';
            bioBtn.classList.add('hidden');
        } else if (mode === 'disable') {
            title.textContent = 'Disable Lock';
            subtitle.textContent = 'Enter PIN to disable';
            bioBtn.classList.add('hidden');
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
            btn.addEventListener('click', (e) => {
                if (navigator.vibrate) navigator.vibrate(15);
                this.handleInput(e.target.innerText)
            });
        });

        backspace.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(15);
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
            setTimeout(() => this.processPin(), 300);
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
                this.updateSettingsUI(true, false);
                alert('PIN Setup Successfully!');
            } else {
                alert('PINs do not match. Try again.');
                this.showModal('setup');
            }
        }
        else if (this.mode === 'disable') {
            if (this.currentInput === this.getPin()) {
                this.removeSecurity();
                this.hideModal();
                this.updateSettingsUI(false, false);
                alert('App Lock Disabled.');
            } else {
                this.shakeModal();
                this.currentInput = '';
                this.updateDots();
            }
        }
    },

    shakeModal() {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        const dots = document.querySelector('.flex.gap-4');
        dots.classList.add('animate-pulse', 'text-red-500');
        setTimeout(() => dots.classList.remove('animate-pulse', 'text-red-500'), 500);
    },

    // --- Settings Page Integration ---
    
    bindSettings() {
        const pinToggle = document.getElementById('pin-toggle');
        const bioToggle = document.getElementById('bio-toggle');
        const changeBtn = document.getElementById('change-pin-btn');

        // Initial State
        const hasPin = !!this.getPin();
        const hasBio = !!this.getBioId();

        if (pinToggle) pinToggle.checked = hasPin;
        if (bioToggle) {
            bioToggle.checked = hasBio;
            bioToggle.disabled = !hasPin; // Enable bio only if PIN is set
        }

        // 1. PIN Toggle
        if (pinToggle) {
            pinToggle.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.getPin()) {
                    this.showModal('disable');
                } else {
                    this.showModal('setup');
                }
            });
        }

        // 2. Biometric Toggle
        if (bioToggle) {
            bioToggle.addEventListener('click', async (e) => {
                e.preventDefault();
                
                // Agar pehle se ON hai, to OFF kar do
                if (this.getBioId()) {
                    this.setBioId('');
                    bioToggle.checked = false;
                    alert("Biometric Disabled");
                    return;
                }

                // Agar OFF hai, to ON karne ka try karo
                const success = await this.registerBiometric();
                if (success) {
                    bioToggle.checked = true;
                    alert("Biometric Enabled Successfully!");
                }
            });
        }

        if (changeBtn) {
            changeBtn.addEventListener('click', () => {
                if (this.getPin()) this.showModal('setup');
                else alert('Please enable PIN first.');
            });
        }
    },

    updateSettingsUI(isPinEnabled, isBioEnabled) {
        const pinToggle = document.getElementById('pin-toggle');
        const bioToggle = document.getElementById('bio-toggle');
        
        if (pinToggle) pinToggle.checked = isPinEnabled;
        if (bioToggle) {
            bioToggle.checked = isBioEnabled;
            bioToggle.disabled = !isPinEnabled; // Disable bio if PIN removed
            if(!isPinEnabled) bioToggle.checked = false;
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    Security.init();
});