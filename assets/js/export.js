document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeHistory(user.uid);
            setupExport(user.uid);
            setupEditModal(user.uid); 
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

    // 1. Fetch All Transactions
    db.collection('users').doc(userId).collection('transactions')
        .orderBy('date', 'desc')
        .onSnapshot(snapshot => {
            globalTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderList(globalTransactions);
        });

    // 2. Fetch Categories & Accounts (For Edit Modal)
    db.collection('users').doc(userId).collection('categories').onSnapshot(snap => { allCategories = snap.docs.map(d => d.data()); });
    db.collection('users').doc(userId).collection('accounts').onSnapshot(snap => { allAccounts = snap.docs.map(d => ({id: d.id, ...d.data()})); });

    // --- RENDER FUNCTION ---
    function renderList(data) {
        listContainer.innerHTML = '';
        
        if (data.length === 0) {
            listContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                        <i class="fas fa-search text-2xl opacity-50"></i>
                    </div>
                    <p class="text-sm font-medium">No transactions found.</p>
                </div>`;
            return;
        }

        let currentMonth = '';

        data.forEach(t => {
            // Group by Month
            const dateObj = new Date(t.date);
            const monthStr = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            if (monthStr !== currentMonth) {
                currentMonth = monthStr;
                listContainer.innerHTML += `
                    <div class="sticky top-0 z-10 bg-gray-50/95 dark:bg-darkBg/95 backdrop-blur-md py-3 px-1">
                        <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center">
                            <i class="far fa-calendar-alt mr-2"></i> ${currentMonth}
                        </h4>
                    </div>`;
            }

            const isIncome = t.type === 'income';
            const colorClass = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white';
            const sign = isIncome ? '+' : '-';
            
            // Icon Logic
            const iconMap = {
                'food': 'fa-utensils', 'travel': 'fa-car', 'shopping': 'fa-shopping-bag',
                'bills': 'fa-file-invoice-dollar', 'entertainment': 'fa-film', 'health': 'fa-medkit',
                'salary': 'fa-money-bill-wave', 'grocery': 'fa-carrot', 'rent': 'fa-home'
            };
            const catKey = t.category ? t.category.toLowerCase() : 'other';
            const iconClass = iconMap[catKey] || (isIncome ? 'fa-wallet' : 'fa-receipt');
            const iconBg = isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';

            // Modern Card Item
            const html = `
                <div class="flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                    <div class="w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0 mr-4">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    
                    <div class="flex-1 min-w-0 mr-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-gray-900 dark:text-white text-sm truncate">${t.description}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    ${t.category} • ${new Date(t.date).toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}
                                </p>
                            </div>
                            <span class="font-bold text-sm ${colorClass} whitespace-nowrap">${sign} ${t.amount.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editTransaction('${t.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                            <i class="fas fa-pen text-xs"></i>
                        </button>
                        <button onclick="deleteTransaction('${t.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>`;
            listContainer.innerHTML += html;
        });
    }

    // --- FILTER LOGIC ---
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
        if(window.triggerHaptic) window.triggerHaptic(10);
    });
}

// --- GLOBAL ACTIONS ---
window.deleteTransaction = function(id) {
    if (window.triggerHaptic) window.triggerHaptic(50);
    if(!confirm('Delete this transaction?')) return;

    const user = auth.currentUser;
    if(user) {
        const ref = db.collection('users').doc(user.uid).collection('transactions');
        ref.doc(id).get().then(doc => {
            if (doc.exists) {
                const backupData = doc.data();
                ref.doc(id).delete().then(() => {
                    // Undo Toast Logic (If main.js has it)
                    if (window.showUndoToast) {
                        window.showUndoToast(`Deleted transaction`, () => {
                            ref.doc(id).set(backupData);
                        });
                    }
                });
            }
        });
    }
};

window.editTransaction = function(id) {
    const t = globalTransactions.find(item => item.id === id);
    if(!t) return;

    document.getElementById('edit-id').value = id;
    document.getElementById('edit-amount').value = t.amount;
    document.getElementById('edit-description').value = t.description;
    document.getElementById('edit-date').value = t.date;
    document.getElementById('edit-type').value = t.type;
    
    // Fill Dropdowns
    const catSelect = document.getElementById('edit-category');
    catSelect.innerHTML = '';
    allCategories.filter(c => c.type === t.type).forEach(c => {
        catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    });
    catSelect.value = t.category;

    const accSelect = document.getElementById('edit-account');
    accSelect.innerHTML = '';
    allAccounts.forEach(a => {
        accSelect.innerHTML += `<option value="${a.name}" data-id="${a.id}">${a.name}</option>`;
    });
    if (t.account) accSelect.value = t.account;

    document.getElementById('edit-transaction-modal').classList.remove('hidden');
    document.getElementById('edit-transaction-modal').classList.add('flex');
};

function setupEditModal(userId) {
    const modal = document.getElementById('edit-transaction-modal');
    const closeBtn = document.getElementById('close-edit-modal');
    const form = document.getElementById('edit-form');
    const typeSelect = document.getElementById('edit-type');
    
    if(!modal) return;

    closeBtn.addEventListener('click', () => { modal.classList.add('hidden'); modal.classList.remove('flex'); });

    typeSelect.addEventListener('change', () => {
        const type = typeSelect.value;
        const catSelect = document.getElementById('edit-category');
        catSelect.innerHTML = '';
        allCategories.filter(c => c.type === type).forEach(c => {
            catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const accSelect = document.getElementById('edit-account');
        
        const updatedData = {
            amount: parseFloat(document.getElementById('edit-amount').value),
            description: document.getElementById('edit-description').value,
            date: document.getElementById('edit-date').value,
            type: document.getElementById('edit-type').value,
            category: document.getElementById('edit-category').value,
            account: accSelect.value,
            accountId: accSelect.options[accSelect.selectedIndex]?.dataset.id || ''
        };

        db.collection('users').doc(userId).collection('transactions').doc(id).update(updatedData)
        .then(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            if(window.triggerHaptic) window.triggerHaptic(50);
        });
    });
}

function setupExport(userId) {
    const btn = document.getElementById('export-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22); doc.setTextColor(79, 70, 229); 
            doc.text("FinTrack Report", 14, 20);
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

            // Table
            const tableRows = globalTransactions.map(t => [
                t.date, t.description, t.category, t.type.toUpperCase(), 
                (t.type === 'income' ? '+' : '-') + t.amount.toFixed(2)
            ]);

            doc.autoTable({
                startY: 35,
                head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
            });

            doc.save(`FinTrack_Report.pdf`);
        } catch (error) {
            alert("Export failed.");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}