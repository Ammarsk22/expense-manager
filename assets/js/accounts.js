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

    // --- 1. AUTO-ADD DEFAULT ACCOUNTS (If none exist) ---
    accountsRef.get().then(snapshot => {
        if (snapshot.empty) {
            console.log("No accounts found. Creating defaults...");
            const batch = db.batch();
            
            const defaultAccounts = [
                { name: 'Cash', type: 'Cash', openingBalance: 0 },
                { name: 'Bank Account', type: 'Bank Account', openingBalance: 0 },
                { name: 'Digital Wallet', type: 'Wallet', openingBalance: 0 }
            ];

            defaultAccounts.forEach(acc => {
                const newDocRef = accountsRef.doc();
                batch.set(newDocRef, {
                    ...acc,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            batch.commit().then(() => {
                console.log("Default accounts created successfully.");
            }).catch(err => console.error("Error creating default accounts:", err));
        }
    });

    // --- 2. ADD NEW ACCOUNT (Manual) ---
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

    // --- 3. DISPLAY ACCOUNTS & CALCULATE BALANCES ---
    const refreshAccountsAndBalances = () => {
        Promise.all([
            accountsRef.orderBy('name').get(),
            transactionsRef.get()
        ]).then(([accountsSnapshot, transactionsSnapshot]) => {
            accountsListEl.innerHTML = '';
            fromAccountSelect.innerHTML = '';
            toAccountSelect.innerHTML = '';

            if (accountsSnapshot.empty) {
                accountsListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Creating default accounts...</p>';
                return;
            }

            let html = '';
            let accountOptions = '';

            accountsSnapshot.forEach(doc => {
                const account = doc.data();
                const accountId = doc.id;
                
                // Start with opening balance or fallback to 0
                let initialBalance = (account.openingBalance !== undefined) ? account.openingBalance : 0;
                let currentBalance = initialBalance;

                // Calculate live balance from transactions
                transactionsSnapshot.forEach(tDoc => {
                    const t = tDoc.data();
                    if (t.accountId === accountId) {
                        if (t.type === 'income') currentBalance += t.amount;
                        else if (t.type === 'expense') currentBalance -= t.amount;
                    }
                });
                
                const balanceColor = currentBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

                // Create List Item with Rupee Symbol
                html += `
                    <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 transition-colors">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-200 text-lg">${account.name}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-600 px-2 py-0.5 rounded inline-block border border-gray-200 dark:border-gray-500 mt-1">${account.type}</p>
                        </div>
                        <div class="flex items-center space-x-4">
                             <div class="text-right mr-2">
                                <p class="font-bold text-lg ${balanceColor}">₹${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                <p class="text-xs text-gray-400 uppercase tracking-wider">Balance</p>
                            </div>
                            <div class="flex space-x-1">
                                <button data-id="${accountId}" class="edit-account-btn p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button data-id="${accountId}" class="delete-account-btn p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
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
    
    // Listen for changes
    accountsRef.onSnapshot(refreshAccountsAndBalances);
    transactionsRef.onSnapshot(refreshAccountsAndBalances);

    // --- 4. ACCOUNT TO ACCOUNT TRANSFER ---
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

        // Create Expense Entry (Money leaving)
        const expenseRef = transactionsRef.doc();
        batch.set(expenseRef, {
            type: 'expense', category: 'Transfer', description: `Transfer to ${toAccountName}`,
            amount: amount, date: date, accountId: fromAccountId, accountName: fromAccountName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create Income Entry (Money entering)
        const incomeRef = transactionsRef.doc();
        batch.set(incomeRef, {
            type: 'income', category: 'Transfer', description: `Transfer from ${fromAccountName}`,
            amount: amount, date: date, accountId: toAccountId, accountName: toAccountName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        batch.commit().then(() => {
            console.log("Transfer successful!");
            transferForm.reset();
            alert("Funds transferred successfully!");
        }).catch(error => {
            console.error("Transfer failed: ", error);
            alert("Transfer failed. Please try again.");
        });
    });

    // --- 5. EDIT & DELETE LOGIC ---
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
                // Use openingBalance if available, otherwise fallback to 0
                editOpeningBalance.value = (account.openingBalance !== undefined) ? account.openingBalance : 0;
                editAccountType.value = account.type;
                editModal.classList.remove('hidden');
                editModal.classList.add('modal-active');
            }
        }

        // Handle Delete
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            // Check if account has transactions before deleting
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

    // --- 6. EDIT MODAL LOGIC ---
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