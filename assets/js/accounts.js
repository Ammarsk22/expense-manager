// This script handles all logic for the accounts.html page, including balance calculation and transfers.

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        // Run this script only if the user is logged in and on the accounts page.
        if (user && window.location.pathname.endsWith('accounts.html')) {
            initializeAccountsPage(user.uid);
        }
    });
});

function initializeAccountsPage(userId) {
    // --- DOM Elements ---
    const addAccountForm = document.getElementById('add-account-form');
    const accountsListEl = document.getElementById('accounts-list');
    const transferForm = document.getElementById('transfer-form');
    const fromAccountSelect = document.getElementById('from-account');
    const toAccountSelect = document.getElementById('to-account');

    // --- Edit Modal DOM Elements ---
    const editModal = document.getElementById('edit-account-modal');
    const editAccountForm = document.getElementById('edit-account-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const editAccountId = document.getElementById('edit-account-id');
    const editAccountName = document.getElementById('edit-account-name');
    const editOpeningBalance = document.getElementById('edit-opening-balance');
    const editAccountType = document.getElementById('edit-account-type');

    // --- Firestore References ---
    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');

    // --- ADD NEW ACCOUNT ---
    addAccountForm.addEventListener('submit', e => {
        e.preventDefault();
        const accountName = addAccountForm['account-name'].value;
        const openingBalance = parseFloat(addAccountForm['opening-balance'].value);
        const accountType = addAccountForm['account-type'].value;

        if (!accountName) { alert('Please enter an account name.'); return; }
        
        accountsRef.add({
            name: accountName,
            type: accountType,
            openingBalance: isNaN(openingBalance) ? 0 : openingBalance,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            addAccountForm.reset();
            addAccountForm['opening-balance'].value = 0;
        }).catch(error => console.error("Error adding account: ", error));
    });

    // --- DISPLAY ACCOUNTS & CALCULATE BALANCES ---
    const refreshAccountsAndBalances = () => {
        Promise.all([
            accountsRef.orderBy('name').get(),
            transactionsRef.get()
        ]).then(([accountsSnapshot, transactionsSnapshot]) => {
            accountsListEl.innerHTML = '';
            if (accountsSnapshot.empty) {
                accountsListEl.innerHTML = '<p class="text-gray-500">No accounts found. Add one to get started!</p>';
                return;
            }

            let html = '';
            let accountOptions = '';

            accountsSnapshot.forEach(doc => {
                const account = doc.data();
                const accountId = doc.id;
                let balance = account.openingBalance || 0;

                transactionsSnapshot.forEach(tDoc => {
                    const t = tDoc.data();
                    if (t.accountId === accountId) {
                        if (t.type === 'income') balance += t.amount;
                        else if (t.type === 'expense') balance -= t.amount;
                    }
                });
                
                const balanceColor = balance >= 0 ? 'text-green-600' : 'text-red-600';

                html += `
                    <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg shadow-sm">
                        <div>
                            <p class="font-bold text-gray-800">${account.name}</p>
                            <p class="text-sm text-gray-500">${account.type}</p>
                        </div>
                        <div class="flex items-center space-x-4">
                             <div class="text-right">
                                <p class="font-bold text-lg ${balanceColor}">₹${balance.toFixed(2)}</p>
                                <p class="text-xs text-gray-400">Current Balance</p>
                            </div>
                            <button data-id="${accountId}" class="edit-account-btn text-gray-400 hover:text-blue-500"><i class="fas fa-edit"></i></button>
                            <button data-id="${accountId}" class="delete-account-btn text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                accountOptions += `<option value="${accountId}">${account.name}</option>`;
            });

            accountsListEl.innerHTML = html;
            fromAccountSelect.innerHTML = accountOptions;
            toAccountSelect.innerHTML = accountOptions;
        });
    };
    
    accountsRef.onSnapshot(refreshAccountsAndBalances);
    transactionsRef.onSnapshot(refreshAccountsAndBalances);

    // --- ACCOUNT TO ACCOUNT TRANSFER ---
    transferForm.addEventListener('submit', e => {
        e.preventDefault();
        const fromAccountId = fromAccountSelect.value;
        const toAccountId = toAccountSelect.value;
        const amount = parseFloat(transferForm['transfer-amount'].value);
        const fromAccountName = fromAccountSelect.options[fromAccountSelect.selectedIndex].text;
        const toAccountName = toAccountSelect.options[toAccountSelect.selectedIndex].text;

        if (fromAccountId === toAccountId) {
            alert("'From' and 'To' accounts cannot be the same."); return;
        }
        if (!amount || amount <= 0) {
            alert("Please enter a valid transfer amount."); return;
        }

        const date = new Date().toISOString().split('T')[0];
        const batch = db.batch();

        const expenseRef = transactionsRef.doc();
        batch.set(expenseRef, {
            type: 'expense', category: 'Transfer', description: `Transfer to ${toAccountName}`,
            amount: amount, date: date, accountId: fromAccountId, accountName: fromAccountName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const incomeRef = transactionsRef.doc();
        batch.set(incomeRef, {
            type: 'income', category: 'Transfer', description: `Transfer from ${fromAccountName}`,
            amount: amount, date: date, accountId: toAccountId, accountName: toAccountName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.commit().then(() => {
            console.log("Transfer successful!");
            transferForm.reset();
        }).catch(error => {
            console.error("Transfer failed: ", error);
            alert("Transfer failed. Please try again.");
        });
    });

    // --- EDIT & DELETE LOGIC ---
    accountsListEl.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-account-btn');
        const deleteBtn = e.target.closest('.delete-account-btn');

        // Handle Edit
        if (editBtn) {
            const id = editBtn.dataset.id;
            const doc = await accountsRef.doc(id).get();
            if (doc.exists) {
                const account = doc.data();
                editAccountId.value = id;
                editAccountName.value = account.name;
                editOpeningBalance.value = account.openingBalance;
                editAccountType.value = account.type;
                editModal.classList.remove('hidden');
                editModal.classList.add('modal-active');
            }
        }

        // Handle Delete
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const associatedTransactions = await transactionsRef.where('accountId', '==', id).limit(1).get();

            if (!associatedTransactions.empty) {
                alert("Cannot delete this account because it has transactions associated with it. Please delete the transactions first.");
                return;
            }

            if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
                await accountsRef.doc(id).delete();
            }
        }
    });

    // --- EDIT MODAL LOGIC ---
    const closeModal = () => {
        editModal.classList.add('hidden');
        editModal.classList.remove('modal-active');
    };

    editAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = editAccountId.value;
        const updatedData = {
            name: editAccountName.value,
            openingBalance: parseFloat(editOpeningBalance.value),
            type: editAccountType.value
        };
        await accountsRef.doc(id).update(updatedData);
        closeModal();
    });

    closeModalBtn.addEventListener('click', closeModal);
    cancelEditBtn.addEventListener('click', closeModal);
}