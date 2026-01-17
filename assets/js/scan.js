// --- RECEIPT SCANNER ENGINE (OCR) ---
// Uses Tesseract.js to extract text from images

document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const scanInput = document.getElementById('scan-input');
    const scanModal = document.getElementById('scan-modal');
    const closeScanBtn = document.getElementById('close-scan');
    const previewImg = document.getElementById('scan-preview');
    const scanAnim = document.getElementById('scan-anim');
    const scanLoader = document.getElementById('scan-loader');
    const scanStatus = document.getElementById('scan-status');
    
    // Target Fields
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const descInput = document.getElementById('description');
    const catSelect = document.getElementById('category');

    if (!scanBtn || !scanInput) return;

    // 1. TRIGGER CAMERA / FILE PICKER
    scanBtn.addEventListener('click', () => {
        scanInput.click();
    });

    // 2. HANDLE FILE SELECTION
    scanInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Show UI
            scanModal.classList.remove('hidden');
            scanModal.classList.add('flex');
            
            // Display Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                startScanning(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // 3. CLOSE MODAL
    if (closeScanBtn) {
        closeScanBtn.addEventListener('click', () => {
            resetScanner();
        });
    }

    function resetScanner() {
        scanModal.classList.add('hidden');
        scanModal.classList.remove('flex');
        scanAnim.classList.add('hidden');
        scanLoader.classList.add('hidden');
        scanStatus.innerText = "Ready to scan";
        previewImg.src = "";
        scanInput.value = ''; // Allow re-scanning same file
    }

    // 4. CORE SCANNING LOGIC
    async function startScanning(imageSrc) {
        // UI State: Scanning
        scanAnim.classList.remove('hidden');
        scanLoader.classList.remove('hidden');
        scanStatus.innerText = "Initializing OCR Engine...";
        
        try {
            // Check if Tesseract is loaded
            if (typeof Tesseract === 'undefined') {
                throw new Error("Tesseract.js library not loaded. Please check internet connection.");
            }

            scanStatus.innerText = "Reading text... (This may take a few seconds)";
            
            // Perform OCR
            const result = await Tesseract.recognize(
                imageSrc,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            scanStatus.innerText = `Scanning... ${Math.round(m.progress * 100)}%`;
                        }
                    }
                }
            );

            const text = result.data.text;
            console.log("Scanned Text:", text); // Debugging
            
            scanStatus.innerText = "Analyzing data...";
            
            // Extract Data using Regex
            const data = extractData(text);
            
            // Auto-fill Form
            applyScannedData(data);

            // Success UI
            scanStatus.innerText = "Done! Receipt processed.";
            if(window.triggerHaptic) window.triggerHaptic(50);

            setTimeout(() => {
                resetScanner();
            }, 1500);

        } catch (error) {
            console.error(error);
            scanStatus.innerText = "Error: " + error.message;
            scanAnim.classList.add('hidden');
            scanLoader.classList.add('hidden');
        }
    }

    // 5. PARSING LOGIC
    function extractData(text) {
        const lines = text.split('\n');
        let amount = null;
        let date = null;
        let merchant = null;

        // Clean text (keep numbers, letters, dots, currency symbols)
        const cleanText = text.replace(/[^a-zA-Z0-9\s.\-:\/₹$]/g, '');

        // A. FIND AMOUNT
        // Regex to find currency-like patterns (e.g., 1,200.50 or 50.00)
        // We look for the LARGEST number in the text, assuming it's the Total
        const amountRegex = /(\d{1,3}(,\d{3})*(\.\d{2}))/g;
        const numbers = cleanText.match(amountRegex);
        if (numbers) {
            // Convert strings to floats and find max
            const floats = numbers.map(n => parseFloat(n.replace(/,/g, '')));
            amount = Math.max(...floats);
        }

        // B. FIND DATE
        // Formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
        const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/g;
        const dates = cleanText.match(dateRegex);
        if (dates) {
            let rawDate = dates[0];
            // Standardize to YYYY-MM-DD
            if (rawDate.includes('/')) {
                const [d, m, y] = rawDate.split('/');
                date = `${y}-${m}-${d}`;
            } else if (rawDate.includes('-') && rawDate.split('-')[0].length === 2) {
                const [d, m, y] = rawDate.split('-');
                date = `${y}-${m}-${d}`;
            } else {
                date = rawDate;
            }
        } else {
            // Default to today if not found
            date = new Date().toISOString().split('T')[0];
        }

        // C. FIND MERCHANT
        // Heuristic: First line that isn't a "Welcome" or "Receipt" header
        const ignoreWords = ['welcome', 'receipt', 'invoice', 'tax', 'total', 'bill', 'copy', 'gst', 'tin'];
        for (let line of lines) {
            line = line.trim();
            if (line.length > 3 && !ignoreWords.some(w => line.toLowerCase().includes(w)) && !/\d/.test(line)) {
                merchant = window.AI ? window.AI.translate(line) : line;
                break;
            }
        }
        if (!merchant) merchant = "Scanned Receipt";

        return { amount, date, merchant };
    }

    // 6. AUTO-FILL FORM
    function applyScannedData(data) {
        if (data.amount) {
            amountInput.value = data.amount;
            // Flash Effect
            amountInput.classList.add('bg-green-100', 'dark:bg-green-900');
            setTimeout(() => amountInput.classList.remove('bg-green-100', 'dark:bg-green-900'), 1000);
        }

        if (data.date) {
            dateInput.value = data.date;
        }

        if (data.merchant) {
            descInput.value = data.merchant;
            
            // AI Categorization
            if (window.AI && window.AI.predictCategory) {
                const category = window.AI.predictCategory(data.merchant);
                if (category) {
                    // Select option in dropdown
                    for(let i=0; i<catSelect.options.length; i++) {
                        if(catSelect.options[i].text === category) {
                            catSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        }
    }
});