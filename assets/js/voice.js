document.addEventListener('DOMContentLoaded', () => {
    const voiceBtn = document.getElementById('voice-input-btn');
    const transactionForm = document.getElementById('transaction-form');

    // Check if the browser supports the Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if(voiceBtn) voiceBtn.style.display = 'none'; // Hide button if not supported
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Set language to English (India)
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    voiceBtn.addEventListener('click', () => {
        voiceBtn.classList.add('bg-red-500', 'text-white'); // Indicate that it's listening
        voiceBtn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        recognition.start();
    });

    recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript.toLowerCase();
        console.log('Speech recognized:', speechResult);
        parseCommand(speechResult);
    };

    recognition.onspeechend = () => {
        recognition.stop();
        voiceBtn.classList.remove('bg-red-500', 'text-white');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        voiceBtn.classList.remove('bg-red-500', 'text-white');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    };

    function parseCommand(command) {
        // Find amount (e.g., "150 rupees", "rs 150", "150")
        const amountResult = command.match(/(\d+)/);
        if (amountResult) {
            transactionForm.amount.value = amountResult[0];
        }

        // Find category by looping through existing categories in the dropdown
        const categorySelect = transactionForm.category;
        for (let i = 0; i < categorySelect.options.length; i++) {
            const option = categorySelect.options[i];
            if (command.includes(option.text.toLowerCase())) {
                categorySelect.value = option.value;
                break;
            }
        }
        
        // Use the rest of the command as description
        // Example: "add 200 rupees for uber ride" -> description will be "uber ride"
        let description = command;
        description = description.replace(/add|rs|rupees|expense|for|on/g, ''); // Remove common words
        if(amountResult) description = description.replace(amountResult[0], ''); // Remove amount
        
        // Also remove category from description
        if(categorySelect.value) {
             description = description.replace(categorySelect.options[categorySelect.selectedIndex].text.toLowerCase(), '');
        }

        transactionForm.description.value = description.trim();
        
        // Default to today's date
        transactionForm.date.value = new Date().toISOString().split('T')[0];
    }
});