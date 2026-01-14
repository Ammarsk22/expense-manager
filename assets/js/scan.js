document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const closeBtn = document.getElementById('close-scan');
    const fileInput = document.getElementById('scan-input');
    const modal = document.getElementById('scan-modal');
    const preview = document.getElementById('scan-preview');
    const anim = document.getElementById('scan-anim');
    const loader = document.getElementById('scan-loader');
    const status = document.getElementById('scan-status');

    let worker = null;

    if (scanBtn && fileInput && modal) {
        
        // --- LAZY LOAD TESSERACT & OPEN MODAL ---
        scanBtn.addEventListener('click', () => {
            if (navigator.vibrate) navigator.vibrate(15);
            
            // Check if Tesseract is loaded
            if (typeof Tesseract === 'undefined') {
                // Show loading state while script loads
                const originalText = status ? status.innerText : '';
                if(status) status.innerText = "Loading scanner engine...";
                
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js';
                
                script.onload = () => {
                    if(status) status.innerText = originalText;
                    fileInput.click();
                };
                
                script.onerror = () => {
                    alert("Failed to load scanner. Please check internet connection.");
                };
                
                document.head.appendChild(script);
            } else {
                // Already loaded, just open input
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    modal.classList.remove('hidden');
                    anim.classList.remove('hidden');
                    loader.classList.remove('hidden');
                    status.innerText = "Initializing OCR...";
                    processImage(file);
                };
                reader.readAsDataURL(file);
            }
        });

        if(closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                fileInput.value = ''; 
                preview.src = '';
                if(worker) {
                    worker.terminate();
                    worker = null;
                }
            });
        }
    }

    async function processImage(file) {
        try {
            status.innerText = "Recognizing text...";
            
            // Tesseract worker creation
            worker = Tesseract.createWorker({
                logger: m => {
                    if(m.status === 'recognizing text') {
                        status.innerText = `Scanning... ${Math.round(m.progress * 100)}%`;
                    }
                }
            });

            await worker.load();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            const { data: { text } } = await worker.recognize(file);
            
            status.innerText = "Processing data...";
            parseReceiptData(text);
            
            await worker.terminate();
            worker = null;
            
            // Close modal after delay
            setTimeout(() => {
                modal.classList.add('hidden');
                fileInput.value = '';
            }, 1000);

        } catch (error) {
            console.error(error);
            status.innerText = "Error scanning. Try again.";
            anim.classList.add('hidden');
            loader.classList.add('hidden');
        }
    }

    function parseReceiptData(text) {
        const lines = text.split('\n');
        let total = 0;
        let date = null;
        let merchant = "Scanned Receipt";

        // Simple Heuristics
        const amountRegex = /(\d+\.\d{2})/;
        const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;

        for (let line of lines) {
            // Find biggest amount
            const matchAmount = line.match(amountRegex);
            if (matchAmount) {
                const val = parseFloat(matchAmount[1]);
                if (val > total) total = val;
            }

            // Find date
            if (!date) {
                const matchDate = line.match(dateRegex);
                if (matchDate) {
                    // Try to parse date (naive)
                    try {
                        const d = new Date(matchDate[1]);
                        if(!isNaN(d.getTime())) date = d.toISOString().split('T')[0];
                    } catch(e) {}
                }
            }
            
            // Guess merchant (first non-empty line usually)
            if(merchant === "Scanned Receipt" && line.trim().length > 3 && !line.match(/\d/)) {
                merchant = line.trim();
            }
        }

        // Fill Form
        document.getElementById('amount').value = total || '';
        document.getElementById('description').value = merchant;
        if(date) document.getElementById('date').value = date;
        
        // Haptic feedback
        if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }
});