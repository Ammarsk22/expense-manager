document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeHistory(user.uid);
            setupExport(user.uid);
            setupEditModal(user.uid); // Setup listeners for the new modal
        }
    });
});

let globalTransactions = []; 
let allCategories = [];
let allAccounts = [];

function initializeHistory(userId) {
    const listContainer = document.getElementById('full-transaction-list');
    const searchInput = document.getElementById('search-input');
    const filterSelect = document.getElementById('filter-type');
    const resetBtn = document.getElementById('reset-button');

    if (!listContainer) return;

    // Fetch All Transactions
    db.collection('users').doc(userId).collection('transactions')
        .orderBy('date', 'desc')
        .onSnapshot(snapshot => {
            globalTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderList(globalTransactions);
        });

    // Fetch Categories (For Filter & Edit)
    db.collection('users').doc(userId).collection('categories')
        .onSnapshot(snapshot => {
            allCategories = snapshot.docs.map(doc => doc.data());
        });
        
    // Fetch Accounts (For Edit)
    db.collection('users').doc(userId).collection('accounts')
        .onSnapshot(snapshot => {
            allAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
                    <div class="bg-gray-100 dark:bg-gray-700 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wide sticky top-0 z-10">
                        ${currentMonth}
                    </div>`;
            }

            const isIncome = t.type === 'income';
            const colorClass = isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const sign = isIncome ? '+' : '-';
            const icon = isIncome ? 'fa-arrow-down' : 'fa-shopping-bag';
            const bgIcon = isIncome ? 'bg-green-100' : 'bg-red-100';

            const html = `
                <div class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <div class="flex items-center gap-4 overflow-hidden">
                        <div class="w-10 h-10 rounded-full ${bgIcon} flex items-center justify-center ${isIncome ? 'text-green-600' : 'text-red-600'} shrink-0">
                            <i class="fas ${icon}"></i>
                        </div>
                        <div class="min-w-0">
                            <p class="font-bold text-gray-800 dark:text-white truncate">${t.description}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                ${t.category} • ${t.date} • ${t.account || 'Wallet'}
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <span class="font-bold ${colorClass} whitespace-nowrap">${sign} ₹${t.amount.toLocaleString()}</span>
                        
                        <button onclick="editTransaction('${t.id}')" class="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button onclick="deleteTransaction('${t.id}')" class="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
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
    if (resetBtn) resetBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterSelect.value = 'all';
        renderList(globalTransactions);
    });
}

// --- GLOBAL ACTIONS (Delete & Edit) ---

window.deleteTransaction = function(id) {
    if(confirm('Are you sure you want to delete this transaction permanently?')) {
        const user = auth.currentUser;
        if(user) {
            db.collection('users').doc(user.uid).collection('transactions').doc(id).delete()
            .then(() => {
                // UI updates automatically via listener
                if(navigator.vibrate) navigator.vibrate(50);
            })
            .catch(err => alert('Error deleting: ' + err.message));
        }
    }
};

window.editTransaction = function(id) {
    const t = globalTransactions.find(item => item.id === id);
    if(!t) return;

    // Fill Modal Fields
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-amount').value = t.amount;
    document.getElementById('edit-description').value = t.description;
    document.getElementById('edit-date').value = t.date;
    document.getElementById('edit-type').value = t.type;
    
    // Populate Dropdowns dynamically
    const catSelect = document.getElementById('edit-category');
    const accSelect = document.getElementById('edit-account');
    
    catSelect.innerHTML = '';
    allCategories.filter(c => c.type === t.type).forEach(c => {
        catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
    catSelect.value = t.category;

    accSelect.innerHTML = '';
    allAccounts.forEach(a => {
        accSelect.innerHTML += `<option value="${a.name}" data-id="${a.id}">${a.name}</option>`;
    });
    accSelect.value = t.account || '';

    // Show Modal
    document.getElementById('edit-transaction-modal').classList.remove('hidden');
    document.getElementById('edit-transaction-modal').classList.add('flex');
};

function setupEditModal(userId) {
    const modal = document.getElementById('edit-transaction-modal');
    const closeBtn = document.getElementById('close-edit-modal');
    const form = document.getElementById('edit-form');
    const typeSelect = document.getElementById('edit-type');
    
    if(!modal) return;

    // Close Modal
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    // Dynamic Category Change on Type Change
    typeSelect.addEventListener('change', () => {
        const type = typeSelect.value;
        const catSelect = document.getElementById('edit-category');
        catSelect.innerHTML = '';
        allCategories.filter(c => c.type === type).forEach(c => {
            catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    });

    // Save Changes
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const accountSelect = document.getElementById('edit-account');
        const accountId = accountSelect.options[accountSelect.selectedIndex].dataset.id;
        
        const updatedData = {
            amount: parseFloat(document.getElementById('edit-amount').value),
            description: document.getElementById('edit-description').value,
            date: document.getElementById('edit-date').value,
            type: document.getElementById('edit-type').value,
            category: document.getElementById('edit-category').value,
            account: accountSelect.value,
            accountId: accountId
        };

        db.collection('users').doc(userId).collection('transactions').doc(id).update(updatedData)
        .then(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            if(navigator.vibrate) navigator.vibrate(50);
        })
        .catch(err => alert('Update failed: ' + err.message));
    });
}

// --- PDF EXPORT LOGIC (Kept same) ---
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
            doc.setTextColor(79, 70, 229); 
            doc.text("Expense Manager Report", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            const dateStr = new Date().toLocaleDateString();
            doc.text(`Generated on: ${dateStr}`, 14, 28);

            // 2. Summary
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
            doc.setTextColor(22, 163, 74); 
            doc.text(`Rs. ${totalIncome.toLocaleString()}`, 20, 53);
            
            doc.setTextColor(220, 38, 38); 
            doc.text(`Rs. ${totalExpense.toLocaleString()}`, 80, 53);
            
            const balance = totalIncome - totalExpense;
            doc.setTextColor(balance >= 0 ? 22 : 220, balance >= 0 ? 163 : 38, balance >= 0 ? 74 : 38);
            doc.text(`Rs. ${balance.toLocaleString()}`, 140, 53);

            // 4. Table
            const tableRows = globalTransactions.map(t => [
                t.date,
                t.description,
                t.category,
                t.type.toUpperCase(),
                (t.type === 'income' ? '+' : '-') + t.amount.toFixed(2)
            ]);

            doc.autoTable({
                startY: 70,
                head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                styles: { fontSize: 9 },
                columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 4) {
                        const rawVal = data.cell.raw;
                        if (rawVal.startsWith('+')) data.cell.styles.textColor = [22, 163, 74];
                        else data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            });

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