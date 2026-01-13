document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeExpenseTracking(user.uid);
        }
    });
});

// Skeleton Loader Function
function getTransactionSkeleton() {
    return `
        <div class="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
            <div class="space-y-2">
                <div class="skeleton h-4 w-32"></div>
                <div class="skeleton h-3 w-24"></div>
            </div>
            <div class="skeleton h-6 w-16"></div>
        </div>
    `;
}

function initializeExpenseTracking(userId) {
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    
    // Helper: Get Currency Symbol (Default to ₹ if script not loaded)
    const getAppCurrency = () => {
        return typeof getCurrency === 'function' ? getCurrency() : '₹';
    };

    // Firestore References
    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const categoriesRef = db.collection('users').doc(userId).collection('categories'); 
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const templatesRef = db.collection('users').doc(userId).collection('templates');

    // Global data storage
    let allAccounts = [];
    let allTransactions = [];
    let allCategories = [];

    // --- 1. SMART ACCOUNT DROPDOWN (Calculates Real Balance) ---
    const accountSelect = document.getElementById('account');
    
    const renderAccountDropdown = () => {
        if (!accountSelect) return;
        
        const currentVal = accountSelect.value; 
        
        if (allAccounts.length === 0) {
            accountSelect.innerHTML = '<option value="" disabled selected>No accounts found. Add one first!</option>';
            return;
        }

        accountSelect.innerHTML = '<option value="" disabled selected>Select Account</option>';
        
        const currencySymbol = getAppCurrency();

        allAccounts.forEach(acc => {
            // Calculate Balance dynamically (Opening + Income - Expense)
            // Using fallback to 0 if openingBalance is missing
            let liveBalance = (acc.openingBalance !== undefined) ? acc.openingBalance : 0;
            
            allTransactions.forEach(t => {
                if (t.accountId === acc.id) {
                    if (t.type === 'income') liveBalance += t.amount;
                    else if (t.type === 'expense') liveBalance -= t.amount;
                }
            });

            const option = document.createElement('option');
            option.value = acc.name;
            option.dataset.id = acc.id;
            option.dataset.balance = liveBalance;
            
            // Display: "SBI Bank (₹5000)"
            option.textContent = `${acc.name} (${currencySymbol}${liveBalance.toLocaleString()})`;
            accountSelect.appendChild(option);
        });

        // Restore previous selection if it still exists
        if (currentVal) {
            const exists = Array.from(accountSelect.options).some(o => o.value === currentVal);
            if (exists) accountSelect.value = currentVal;
        }
    };

    // Listen to Accounts & Transactions for Real-time Updates
    if (accountSelect) {
        accountsRef.orderBy('name').onSnapshot(snapshot => {
            allAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAccountDropdown();
        });
        transactionsRef.onSnapshot(snapshot => {
            allTransactions = snapshot.docs.map(doc => doc.data());
            renderAccountDropdown();
        });
    }

    // --- 2. SMART CATEGORY DROPDOWN (Fetches from DB) ---
    const categorySelect = document.getElementById('category');
    const typeSelect = document.getElementById('type'); // 'expense' or 'income' dropdown

    const renderCategoryDropdown = () => {
        if (!categorySelect) return;

        const selectedType = typeSelect ? typeSelect.value : 'expense'; 
        const currentVal = categorySelect.value;

        categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
        
        // Filter categories based on selected type (Income/Expense)
        const filteredCats = allCategories.filter(cat => cat.type.toLowerCase() === selectedType.toLowerCase());

        if (filteredCats.length === 0) {
            // Fallback default categories if user hasn't created any
            const defaultCategories = selectedType === 'income' 
                ? ['Salary', 'Allowance', 'Bonus', 'Other'] 
                : ['Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Other'];
            
            defaultCategories.forEach(catName => {
                const option = document.createElement('option');
                option.value = catName;
                option.textContent = catName;
                categorySelect.appendChild(option);
            });
        } else {
            // Use User's Custom Categories
            filteredCats.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        }

        // Restore selection if valid
        if (currentVal) {
            const exists = Array.from(categorySelect.options).some(o => o.value === currentVal);
            if (exists) categorySelect.value = currentVal;
        }
    };

    if (categorySelect) {
        // Fetch categories from Firestore
        categoriesRef.orderBy('name').onSnapshot(snapshot => {
            allCategories = snapshot.docs.map(doc => doc.data());
            renderCategoryDropdown();
        });

        // Re-render dropdown when user switches between "Expense" and "Income"
        if (typeSelect) {
            typeSelect.addEventListener('change', renderCategoryDropdown);
        }
    }

    // --- 3. ADD TRANSACTION FORM SUBMISSION ---
    if (transactionForm) {
        transactionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const accountSelect = document.getElementById('account');
            const selectedOption = accountSelect.options[accountSelect.selectedIndex];
            
            if (!selectedOption || !selectedOption.dataset.id) {
                alert("Please select a valid account.");
                return;
            }

            const accountId = selectedOption.dataset.id;
            const accountName = accountSelect.value;
            const type = document.getElementById('type').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const description = document.getElementById('description').value;
            const date = document.getElementById('date').value;
            const saveAsTemplate = document.getElementById('save-template').checked;

            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount.");
                return;
            }

            // UI Loading State
            const submitBtn = transactionForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Saving...";
            submitBtn.disabled = true;

            try {
                const batch = db.batch();

                // A. Add Transaction
                const newTxRef = transactionsRef.doc();
                batch.set(newTxRef, {
                    type, amount, category, description, date,
                    account: accountName, accountId: accountId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // B. Add Template (if checked)
                if (saveAsTemplate) {
                    const newTempRef = templatesRef.doc();
                    batch.set(newTempRef, {
                        type, amount, category, description,
                        account: accountName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                await batch.commit();

                // Reset Form
                transactionForm.reset();
                document.getElementById('save-template').checked = false;
                document.getElementById('date').valueAsDate = new Date();
                
                // Trigger change to refresh categories based on default type
                if (typeSelect) typeSelect.dispatchEvent(new Event('change'));

                // Success Feedback
                submitBtn.innerText = "Saved Successfully!";
                submitBtn.classList.replace('bg-indigo-600', 'bg-green-600');
                submitBtn.classList.replace('hover:bg-indigo-700', 'hover:bg-green-700');

                setTimeout(() => {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.classList.replace('bg-green-600', 'bg-indigo-600');
                    submitBtn.classList.replace('hover:bg-green-700', 'hover:bg-indigo-700');
                    submitBtn.disabled = false;
                }, 2000);

            } catch (error) {
                console.error("Error saving:", error);
                alert("Failed to save transaction.");
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- 4. REAL-TIME LIST DISPLAY ---
    if (transactionList) {
        // Show Skeleton Loading immediately
        transactionList.innerHTML = getTransactionSkeleton() + getTransactionSkeleton() + getTransactionSkeleton();

        // Updated Sorting: Date first, then CreatedAt
        transactionsRef.orderBy('date', 'desc').orderBy('createdAt', 'desc').limit(10).onSnapshot(snapshot => {
            transactionList.innerHTML = '';
            
            if (snapshot.empty) {
                transactionList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No transactions yet.</p>';
                return;
            }

            const currencySymbol = getAppCurrency();

            snapshot.forEach(doc => {
                const t = doc.data();
                const isIncome = t.type === 'income';
                const colorClass = isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                const sign = isIncome ? '+' : '-';
                const borderClass = isIncome ? 'border-green-500' : 'border-red-500';

                const html = `
                    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-l-4 ${borderClass} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-200">${t.description}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <span class="bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">${t.category}</span>
                                <span class="mx-1">•</span> ${t.account} <span class="mx-1">•</span> ${t.date}
                            </p>
                        </div>
                        <p class="font-bold text-lg ${colorClass}">${sign} ${currencySymbol}${t.amount.toLocaleString()}</p>
                    </div>`;
                transactionList.innerHTML += html;
            });
        }, error => {
             // Error handling for missing index
             console.error("Error fetching recent transactions:", error);
             if (error.message.includes('The query requires an index')) {
                 const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)[0];
                 transactionList.innerHTML = `
                     <div class="text-center py-4">
                         <p class="text-red-500 text-sm mb-2"><i class="fas fa-exclamation-triangle mr-1"></i> Setup Required</p>
                         <a href="${indexLink}" target="_blank" class="text-indigo-600 dark:text-indigo-400 text-sm underline">Click to Create Index</a>
                     </div>`;
             } else {
                 transactionList.innerHTML = '<p class="text-red-500 text-center py-4">Error loading data.</p>';
             }
        });
    }
}