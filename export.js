document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeHistory(user.uid);
            setupExport(user.uid);
        }
    });
});

let globalTransactions = []; // Store for search/export

function initializeHistory(userId) {
    const listContainer = document.getElementById('full-transaction-list');
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-type');

    if (!listContainer) return;

    // Fetch All Transactions
    db.collection('users').doc(userId).collection('transactions')
        .orderBy('date', 'desc')
        .onSnapshot(snapshot => {
            globalTransactions = snapshot.docs.map(doc => doc.data());
            renderList(globalTransactions);
        });

    // Render Function
    function renderList(data) {
        listContainer.innerHTML = '';
        
        if (data.length === 0) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                    <i class="fas fa-receipt text-4xl mb-3"></i>
                    <p>No transactions found.</p>
                </div>`;
            return;
        }

        let currentMonth = '';

        data.forEach(t => {
            const dateObj = new Date(t.date);
            const monthStr = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            // Month Header
            if (monthStr !== currentMonth) {
                currentMonth = monthStr;
                listContainer.innerHTML += `
                    <div class="bg-gray-100 dark:bg-gray-700 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide sticky top-0">
                        ${currentMonth}
                    </div>`;
            }

            const isIncome = t.type === 'income';
            const colorClass = isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const sign = isIncome ? '+' : '-';
            const icon = isIncome ? 'fa-arrow-down' : 'fa-shopping-bag';
            const bgIcon = isIncome ? 'bg-green-100' : 'bg-red-100';

            const html = `
                <div class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${bgIcon} flex items-center justify-center ${isIncome ? 'text-green-600' : 'text-red-600'}">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800 dark:text-white">${t.description}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                ${t.category} • ${t.date}
                            </p>
                        </div>
                    </div>
                    <span class="font-bold ${colorClass}">${sign} ₹${t.amount.toLocaleString()}</span>
                </div>`;
            listContainer.innerHTML += html;
        });
    }

    // Filter Logic
    function filterData() {
        const query = searchInput.value.toLowerCase();
        const type = filterSelect.value;

        const filtered = globalTransactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(query) || t.category.toLowerCase().includes(query);
            const matchesType = type === 'all' || t.type === type;
            return matchesSearch && matchesType;
        });
        renderList(filtered);
    }

    if (searchInput) searchInput.addEventListener('input', filterData);
    if (filterSelect) filterSelect.addEventListener('change', filterData);
}

// --- PDF EXPORT LOGIC ---
function setupExport(userId) {
    const btn = document.getElementById('export-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
        btn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // 1. Header
            doc.setFontSize(22);
            doc.setTextColor(79, 70, 229); // Indigo Color
            doc.text("Expense Manager Report", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            const dateStr = new Date().toLocaleDateString();
            doc.text(`Generated on: ${dateStr}`, 14, 28);

            // 2. Summary Calculation
            let totalIncome = 0;
            let totalExpense = 0;
            globalTransactions.forEach(t => {
                if(t.type === 'income') totalIncome += t.amount;
                else totalExpense += t.amount;
            });

            // 3. Summary Box
            doc.setDrawColor(200);
            doc.setFillColor(245, 247, 250);
            doc.rect(14, 35, 180, 25, 'F');
            
            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text("Total Income", 20, 45);
            doc.text("Total Expense", 80, 45);
            doc.text("Net Balance", 140, 45);

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(22, 163, 74); // Green
            doc.text(`Rs. ${totalIncome.toLocaleString()}`, 20, 53);
            
            doc.setTextColor(220, 38, 38); // Red
            doc.text(`Rs. ${totalExpense.toLocaleString()}`, 80, 53);
            
            const balance = totalIncome - totalExpense;
            doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
            doc.text(`Rs. ${balance.toLocaleString()}`, 140, 53);

            // 4. Table Data Preparation
            const tableRows = globalTransactions.map(t => [
                t.date,
                t.description,
                t.category,
                t.type.toUpperCase(),
                (t.type === 'income' ? '+' : '-') + t.amount.toFixed(2)
            ]);

            // 5. Generate Table
            doc.autoTable({
                startY: 70,
                head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] }, // Indigo header
                styles: { fontSize: 9 },
                columnStyles: {
                    4: { halign: 'right', fontStyle: 'bold' } // Amount aligned right
                },
                didParseCell: function(data) {
                    // Color code amount column
                    if (data.section === 'body' && data.column.index === 4) {
                        const rawVal = data.cell.raw;
                        if (rawVal.startsWith('+')) data.cell.styles.textColor = [22, 163, 74];
                        else data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            });

            // 6. Save PDF
            doc.save(`Expense_Report_${dateStr.replace(/\//g, '-')}.pdf`);

        } catch (error) {
            console.error("PDF Error:", error);
            alert("Failed to generate PDF.");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}