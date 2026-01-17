// --- VOICE ASSISTANT (Speech-to-Text) ---
// Uses Web Speech API to parse natural language commands

const VoiceAssistant = {
    
    recognition: null,
    isListening: false,
    btn: null,

    // 1. INITIALIZE
    init: function() {
        this.btn = document.getElementById('voice-input-btn');
        if (!this.btn) return;

        // Check Browser Support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser.");
            this.btn.style.display = 'none'; // Hide button if not supported
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.lang = 'en-US'; // Default to English (works well for Hinglish too)
        this.recognition.interimResults = false;

        // Event Listeners
        this.btn.addEventListener('click', () => {
            this.toggleListening();
        });

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateButtonState(true);
            if(typeof showToast === 'function') showToast("Listening... Speak now", "info");
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateButtonState(false);
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Voice Input:", transcript);
            this.processCommand(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error("Voice Error:", event.error);
            if(typeof showToast === 'function') showToast("Voice Error: " + event.error, "error");
            this.isListening = false;
            this.updateButtonState(false);
        };
    },

    // 2. TOGGLE LISTENING
    toggleListening: function() {
        if(window.triggerHaptic) window.triggerHaptic(20);
        
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    },

    // 3. UI FEEDBACK (Pulse Effect)
    updateButtonState: function(active) {
        if (active) {
            this.btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
            this.btn.classList.remove('bg-gray-100', 'text-gray-600', 'dark:bg-gray-700', 'dark:text-gray-300');
            this.btn.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            this.btn.classList.remove('bg-red-500', 'text-white', 'animate-pulse');
            this.btn.classList.add('bg-gray-100', 'text-gray-600', 'dark:bg-gray-700', 'dark:text-gray-300');
            this.btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    },

    // 4. NATURAL LANGUAGE PROCESSING (NLP)
    processCommand: function(text) {
        if(typeof showToast === 'function') showToast(`Heard: "${text}"`, "info");
        
        const lowerText = text.toLowerCase();
        let amount = null;
        let description = "";
        let type = "expense"; // Default

        // A. Extract Amount (Find numbers)
        // Looks for patterns like "500", "500rs", "rs 500"
        const amountMatch = text.match(/(\d+)(\.\d{2})?/);
        if (amountMatch) {
            amount = parseFloat(amountMatch[0]);
        }

        // B. Detect Type (Income vs Expense)
        if (lowerText.includes('salary') || lowerText.includes('received') || lowerText.includes('income') || lowerText.includes('got')) {
            type = "income";
        }

        // C. Extract Description
        // Remove the number and common filler words to get description
        description = text.replace(/(\d+)(\.\d{2})?/, '') // Remove number
                          .replace(/(rupees|rs|for|on|spent|paid|added|received)/gi, '') // Remove keywords
                          .trim();
        
        // Capitalize first letter
        description = description.charAt(0).toUpperCase() + description.slice(1);

        // 5. FILL THE FORM
        if (amount) {
            document.getElementById('amount').value = amount;
            // Visual feedback on amount field
            const amtField = document.getElementById('amount');
            amtField.classList.add('bg-green-100', 'dark:bg-green-900');
            setTimeout(() => amtField.classList.remove('bg-green-100', 'dark:bg-green-900'), 1000);
        }

        if (description) {
            document.getElementById('description').value = description;
            
            // AI Category Prediction (Integration with ai.js)
            if (window.AI && window.AI.predictCategory) {
                const category = window.AI.predictCategory(description);
                if (category) {
                    const catSelect = document.getElementById('category');
                    for(let i=0; i<catSelect.options.length; i++) {
                        if(catSelect.options[i].text === category) {
                            catSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        }

        // Set Type
        document.getElementById('type').value = type;

        if (amount) {
            if(window.triggerHaptic) window.triggerHaptic(50);
            if(typeof showToast === 'function') showToast("Form filled via Voice!", "success");
        } else {
            if(typeof showToast === 'function') showToast("Could not understand amount.", "warning");
        }
    }
};

// Auto-Init
document.addEventListener('DOMContentLoaded', () => {
    VoiceAssistant.init();
});