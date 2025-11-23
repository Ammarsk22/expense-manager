document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeDebtManager(user.uid);
        }
    });
});

function initializeDebtManager(userId) {
    const debtList = document.getElementById('debt-list');
    const debtsRef = db.collection('users').doc(userId).collection('debts');
    
    // UI Elements
    const debtModal = document.getElementById('debt-modal');
    const debtForm = document.getElementById('debt-form');
    const totalPayEl = document.getElementById('total-pay');
    const totalReceiveEl = document.getElementById('total-receive');

    // --- REAL-TIME LISTENER ---
    debtsRef.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        debtList.innerHTML = '';
        let totalPay = 0;
        let totalReceive = 0;
        
        if (snapshot.empty) {
            debtList.innerHTML = `
                <div class="text-center py-10">
                    <div class="bg-gray-100 dark:bg-gray-700 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-check text-2xl text-green-500"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">All settled up! No active debts.</p>
                </div>`;
            updateTotals(0, 0);
            return;
        }

        snapshot.forEach(doc => {
            const debt = doc.data();
            
            // Calculate Totals
            if (debt.type === 'borrowed') {
                totalPay += debt.amount;
            } else {
                totalReceive += debt.amount;
            }

            // Styles based on type
            const isBorrowed = debt.type === 'borrowed';
            const amountColor = isBorrowed ? 'text-red-500' : 'text-green-500';
            const iconColor = isBorrowed ? 'text-red-500 bg-red-100 dark:bg-red-900/20' : 'text-green-500 bg-green-100 dark:bg-green-900/20';
            const arrowIcon = isBorrowed ? 'fa-arrow-down' : 'fa-arrow-up';
            const typeLabel = isBorrowed ? 'You owe' : 'Owes you';

            const html = `
                <div class="p-4 flex flex-col sm:flex-row justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div class="flex items-center w-full sm:w-auto mb-3 sm:mb-0">
                        <div class="h-10 w-10 rounded-full ${iconColor} flex items-center justify-center mr-4 shrink-0">
                            <i class="fas ${arrowIcon}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-800 dark:text-white text-lg">${debt.person}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${debt.description || 'No description'}</p>
                            ${debt.dueDate ? `<p class="text-xs text-indigo-500 mt-1"><i class="fas fa-clock mr-1"></i>Due: ${debt.dueDate}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="flex items-center w-full sm:w-auto justify-between sm:justify-end">
                        <div class="text-right mr-6">
                            <span class="text-xs text-gray-400 uppercase font-semibold block">${typeLabel}</span>
                            <span class="font-bold text-xl ${amountColor}">₹${debt.amount.toLocaleString()}</span>
                        </div>
                        
                        <div class="flex space-x-2">
                            <button class="settle-btn p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full" title="Mark as Settled" data-id="${doc.id}" data-person="${debt.person}">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="delete-btn p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full" title="Delete" data-id="${doc.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            debtList.innerHTML += html;
        });

        updateTotals(totalPay, totalReceive);
        attachEvents();
    });

    function updateTotals(pay, receive) {
        totalPayEl.textContent = `₹${pay.toLocaleString()}`;
        totalReceiveEl.textContent = `₹${receive.toLocaleString()}`;
    }

    // --- ADD NEW DEBT ---
    debtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.querySelector('input[name="debt-type"]:checked').value;
        const person = document.getElementById('person-name').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const date = document.getElementById('due-date').value;
        const desc = document.getElementById('description').value;

        debtsRef.add({
            type,
            person,
            amount,
            dueDate: date,
            description: desc,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            debtModal.classList.add('hidden');
            debtForm.reset();
        }).catch(err => console.error(err));
    });

    // --- ACTIONS (Settle & Delete) ---
    function attachEvents() {
        // Settle Debt (Delete with confirmation)
        document.querySelectorAll('.settle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const person = btn.dataset.person;
                if (confirm(`Mark debt with ${person} as fully settled? This will remove it from the list.`)) {
                    debtsRef.doc(btn.dataset.id).delete();
                }
            });
        });

        // Delete Record
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete this record?')) {
                    debtsRef.doc(btn.dataset.id).delete();
                }
            });
        });
    }

    // --- MODAL TOGGLE ---
    document.getElementById('add-debt-btn').addEventListener('click', () => {
        debtModal.classList.remove('hidden');
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        debtModal.classList.add('hidden');
    });
}