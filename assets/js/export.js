document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the history page
    const exportBtn = document.getElementById('export-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) {
                alert("Please log in to export data.");
                return;
            }

            // Change button text to show loading state
            const originalText = exportBtn.innerHTML;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exporting...';
            exportBtn.disabled = true;

            try {
                // 1. Fetch ALL transactions from Firestore
                const snapshot = await db.collection('users').doc(user.uid).collection('transactions')
                    .orderBy('date', 'desc') // Order by date
                    .get();

                if (snapshot.empty) {
                    alert("No transactions found to export.");
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                    return;
                }

                // 2. Define CSV Headers
                let csvContent = "data:text/csv;charset=utf-8,";
                csvContent += "Date,Description,Category,Type,Account,Amount\n"; // Header Row

                // 3. Loop through data and format rows
                snapshot.forEach(doc => {
                    const t = doc.data();
                    
                    // Escape commas in descriptions to prevent breaking CSV format
                    const safeDesc = t.description ? `"${t.description.replace(/"/g, '""')}"` : "";
                    const safeCat = t.category || "Uncategorized";
                    const safeAcc = t.account || "General";
                    const safeType = t.type || "expense";
                    
                    // Format row: 2023-10-25,"Lunch with team",Food,expense,Cash,500
                    const row = `${t.date},${safeDesc},${safeCat},${safeType},${safeAcc},${t.amount}`;
                    csvContent += row + "\r\n";
                });

                // 4. Create Download Link
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                
                // Generate filename with current date: transactions_2023-10-27.csv
                const today = new Date().toISOString().split('T')[0];
                link.setAttribute("download", `transactions_${today}.csv`);
                
                document.body.appendChild(link); // Required for Firefox
                link.click();
                document.body.removeChild(link);

                // Reset button
                exportBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Done!';
                setTimeout(() => {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error("Export failed:", error);
                alert("Failed to export data. See console for details.");
                exportBtn.innerHTML = originalText;
                exportBtn.disabled = false;
            }
        });
    }
});