/**
 * Receipt Scanning Logic using Tesseract.js
 */

document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scan-btn');
    const fileInput = document.getElementById('scan-input');
    const modal = document.getElementById('scan-modal');
    const closeBtn = document.getElementById('close-scan');
    const preview = document.getElementById('scan-preview');
    const loader = document.getElementById('scan-loader');
    const scanAnim = document.getElementById('scan-anim');
    const statusText = document.getElementById('scan-status');

    if (!scanBtn || !fileInput) return;

    // Trigger File Input
    scanBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle File Selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            showModal(file);
            processImage(file);
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        fileInput.value = ''; // Reset input
    });

    function showModal(file) {
        modal.classList.remove('hidden');
        loader.classList.remove('hidden');
        scanAnim.classList.remove('hidden');
        statusText.textContent = "Initializing Scanner...";
        
        // Show Image Preview
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function processImage(file) {
        Tesseract.recognize(
            file,
            'eng',
            {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        statusText.textContent = `Scanning: ${Math.round(m.progress * 100)}%`;
                    }
                }
            }
        ).then(({ data: { text } }) => {
            console.log('Scanned Text:', text);
            parseAndFill(text);
            
            // Clean up UI
            loader.classList.add('hidden');
            scanAnim.classList.add('hidden');
            statusText.textContent = "Scan Complete!";
            setTimeout(() => {
                modal.classList.add('hidden');
                fileInput.value = '';
            }, 1000);
        }).catch(err => {
            console.error(err);
            statusText.textContent = "Error scanning image.";
            loader.classList.add('hidden');
        });
    }

    function parseAndFill(text) {
        // Simple Regex for Date (DD/MM/YYYY or DD-MM-YYYY)
        const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
        
        // Regex for Amount (Look for numbers with decimals, often after TOTAL or AMOUNT)
        // This is a basic pattern; receipts vary wildly.
        // Strategies: Look for largest number, or number near 'Total'
        const amountMatches = text.match(/(\d+[.,]\d{2})/g); 
        
        // Default to today
        if (dateMatch) {
            // Convert to YYYY-MM-DD for input
            // Logic needed to parse DD/MM/YYYY vs MM/DD/YYYY based on locale if strict
            // For now, assume detected date might need manual correction or simple ISO conversion
            // let dateVal = new Date(dateMatch[0]).toISOString().split('T')[0];
            // document.getElementById('date').value = dateVal;
            console.log("Date found:", dateMatch[0]);
        }

        let extractedAmount = null;
        if (amountMatches) {
            // Usually the total is the highest number or the last one found
            // Let's take the largest value found to be safe as 'Total'
            const values = amountMatches.map(v => parseFloat(v.replace(',', '.')));
            extractedAmount = Math.max(...values);
        }

        // Fill Form
        if (extractedAmount) {
            document.getElementById('amount').value = extractedAmount.toFixed(2);
        }
        
        // Try to guess description from first few lines (Merchant Name)
        const lines = text.split('\n').filter(line => line.trim().length > 3);
        if (lines.length > 0) {
            // Use first valid line as description (Store Name usually at top)
            document.getElementById('description').value = lines[0].substring(0, 20); 
        }

        alert(`Scanned!\nAmount: ${extractedAmount || 'Not found'}\nCheck details before saving.`);
    }
});