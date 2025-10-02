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
            addAccountForm['opening-balance'].value = 0; // Reset opening balance to 0
        }).catch(error => console.error("Error adding account: ", error));
    });

    // --- DISPLAY ACCOUNTS & CALCULATE BALANCES (REAL-TIME) ---
    const refreshAccountsAndBalances = () => {
        // First, get all accounts. Then, get all transactions.
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

            // Loop through each account to calculate its balance
            accountsSnapshot.forEach(doc => {
                const account = doc.data();
                const accountId = doc.id;
                let balance = account.openingBalance || 0;

                // Loop through all transactions to find ones related to this account
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
                        <div class="text-right">
                            <p class="font-bold text-lg ${balanceColor}">₹${balance.toFixed(2)}</p>
                            <p class="text-xs text-gray-400">Current Balance</p>
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
    
    // Refresh the account list and balances whenever accounts or transactions change.
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
        const batch = db.batch(); // Use a batch for atomic writes

        // 1. Create an 'expense' transaction for the 'from' account
        const expenseRef = transactionsRef.doc();
        batch.set(expenseRef, {
            type: 'expense', category: 'Transfer', description: `Transfer to ${toAccountName}`,
            amount: amount, date: date, accountId: fromAccountId, accountName: fromAccountName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 2. Create an 'income' transaction for the 'to' account
        const incomeRef = transactionsRef.doc();
        batch.set(incomeRef, {
            type: 'income', category: 'Transfer', description: `Transfer from ${fromAccountName}`,
            amount: amount, date: date, accountId: toAccountId, accountName: toAccountName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Commit both writes at once
        batch.commit().then(() => {
            console.log("Transfer successful!");
            transferForm.reset();
        }).catch(error => {
            console.error("Transfer failed: ", error);
            alert("Transfer failed. Please try again.");
        });
    });
}

