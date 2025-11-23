// This script handles saving the budget on settings.html and checking/displaying budget alerts on index.html.

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Check which page we are on and run the corresponding function.
            if (window.location.pathname.endsWith('settings.html')) {
                initializeSettingsPage(user.uid);
            } else if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
                checkBudgetStatus(user.uid);
            }
        }
    });
});

// --- Function for settings.html ---
function initializeSettingsPage(userId) {
    const budgetForm = document.getElementById('budget-form');
    const budgetInput = document.getElementById('monthly-budget');
    const budgetStatus = document.getElementById('budget-status');
    const budgetRef = db.collection('users').doc(userId).collection('settings').doc('budget');

    // Load existing budget
    budgetRef.get().then(doc => {
        if (doc.exists) {
            budgetInput.value = doc.data().amount;
        }
    }).catch(error => console.error("Error loading budget:", error));

    // Save new budget
    budgetForm.addEventListener('submit', e => {
        e.preventDefault();
        const budgetAmount = parseFloat(budgetInput.value);

        if (isNaN(budgetAmount) || budgetAmount < 0) {
            budgetStatus.textContent = "Please enter a valid, positive number.";
            budgetStatus.className = 'text-red-500';
            return;
        }

        budgetRef.set({ amount: budgetAmount }).then(() => {
            budgetStatus.textContent = "Budget saved successfully!";
            budgetStatus.className = 'text-green-600 font-medium';
            setTimeout(() => { budgetStatus.textContent = ''; }, 3000);
        }).catch(error => {
            console.error("Error saving budget: ", error);
            budgetStatus.textContent = "Error: Could not save your budget.";
            budgetStatus.className = 'text-red-500';
        });
    });
}

// --- Function for index.html (Budget Alert) ---
function checkBudgetStatus(userId) {
    const budgetRef = db.collection('users').doc(userId).collection('settings').doc('budget');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const budgetAlertEl = document.getElementById('budget-alert');

    if (!budgetAlertEl) return;

    budgetRef.get().then(budgetDoc => {
        if (!budgetDoc.exists) { return; } // No budget set

        const budgetAmount = budgetDoc.data().amount;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        transactionsRef.where('type', '==', 'expense').where('date', '>=', startOfMonth).where('date', '<=', endOfMonth)
            .onSnapshot(snapshot => {
                let currentMonthExpenses = 0;
                snapshot.forEach(doc => {
                    currentMonthExpenses += doc.data().amount;
                });

                const percentageSpent = (currentMonthExpenses / budgetAmount) * 100;

                // Format numbers nicely (e.g. 1,200.00)
                const fmtExpense = currentMonthExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                const fmtBudget = budgetAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});

                if (percentageSpent >= 100) {
                    // Red Alert (Over Budget)
                    budgetAlertEl.className = 'p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-100 dark:bg-red-900/50 dark:text-red-300 block border border-red-200 dark:border-red-800';
                    budgetAlertEl.innerHTML = `<span class="font-bold"><i class="fas fa-exclamation-circle mr-2"></i>Budget Alert!</span> You have spent ₹${fmtExpense}, exceeding your budget of ₹${fmtBudget}.`;
                } else if (percentageSpent >= 80) {
                    // Yellow Warning (Near Budget)
                    budgetAlertEl.className = 'p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/50 dark:text-yellow-300 block border border-yellow-200 dark:border-yellow-800';
                    budgetAlertEl.innerHTML = `<span class="font-bold"><i class="fas fa-exclamation-triangle mr-2"></i>Budget Warning!</span> You have spent ₹${fmtExpense} (${percentageSpent.toFixed(0)}%) of your ₹${fmtBudget} budget.`;
                } else {
                    budgetAlertEl.className = 'hidden';
                }
            });
    });
}