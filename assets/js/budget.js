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
    // 1. Monthly Total Budget Logic
    const budgetForm = document.getElementById('budget-form');
    const budgetInput = document.getElementById('monthly-budget');
    const budgetStatus = document.getElementById('budget-status');
    const budgetRef = db.collection('users').doc(userId).collection('settings').doc('budget');

    // Load existing total budget
    budgetRef.get().then(doc => {
        if (doc.exists) {
            budgetInput.value = doc.data().amount;
        }
    }).catch(error => console.error("Error loading budget:", error));

    // Save total budget
    budgetForm.addEventListener('submit', e => {
        e.preventDefault();
        const budgetAmount = parseFloat(budgetInput.value);

        if (isNaN(budgetAmount) || budgetAmount < 0) {
            budgetStatus.textContent = "Please enter a valid, positive number.";
            budgetStatus.className = 'text-red-500';
            return;
        }

        budgetRef.set({ amount: budgetAmount }).then(() => {
            budgetStatus.textContent = "Total budget saved!";
            budgetStatus.className = 'text-green-600 font-medium';
            setTimeout(() => { budgetStatus.textContent = ''; }, 3000);
        }).catch(error => {
            console.error("Error saving budget: ", error);
            budgetStatus.textContent = "Error saving budget.";
            budgetStatus.className = 'text-red-500';
        });
    });

    // 2. Category-wise Budget Logic (NEW)
    const categoryListEl = document.getElementById('category-budget-list');
    const saveCatBudgetBtn = document.getElementById('save-category-budgets-btn');
    const catBudgetStatus = document.getElementById('cat-budget-status');
    
    const categoriesRef = db.collection('users').doc(userId).collection('categories');
    const catBudgetRef = db.collection('users').doc(userId).collection('settings').doc('categoryBudgets');

    Promise.all([
        categoriesRef.where('type', '==', 'expense').orderBy('name').get(),
        catBudgetRef.get()
    ]).then(([categoriesSnap, budgetSnap]) => {
        categoryListEl.innerHTML = '';
        const savedBudgets = budgetSnap.exists ? budgetSnap.data() : {};

        if (categoriesSnap.empty) {
            categoryListEl.innerHTML = '<p class="text-gray-500 italic">No expense categories found.</p>';
            return;
        }

        categoriesSnap.forEach(doc => {
            const catName = doc.data().name;
            const currentLimit = savedBudgets[catName] || '';

            const row = document.createElement('div');
            row.className = 'flex items-center justify-between space-x-4 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md border border-gray-100 dark:border-gray-700';
            row.innerHTML = `
                <label class="font-medium text-gray-700 dark:text-gray-300 w-1/3 truncate" title="${catName}">${catName}</label>
                <div class="relative flex-1">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 dark:text-gray-400">₹</span>
                    <input type="number" data-category="${catName}" value="${currentLimit}" placeholder="No Limit" 
                        class="cat-budget-input w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 text-sm">
                </div>
            `;
            categoryListEl.appendChild(row);
        });

        // Save Action
        saveCatBudgetBtn.addEventListener('click', () => {
            const inputs = document.querySelectorAll('.cat-budget-input');
            const newBudgets = {};
            let hasData = false;

            inputs.forEach(input => {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val > 0) {
                    newBudgets[input.dataset.category] = val;
                    hasData = true;
                }
            });

            const savePromise = hasData ? catBudgetRef.set(newBudgets) : catBudgetRef.delete();

            savePromise.then(() => {
                catBudgetStatus.textContent = "Category limits saved successfully!";
                catBudgetStatus.className = 'text-green-600 font-medium';
                setTimeout(() => { catBudgetStatus.textContent = ''; }, 3000);
            }).catch(err => {
                console.error(err);
                catBudgetStatus.textContent = "Error saving limits.";
                catBudgetStatus.className = 'text-red-500';
            });
        });
    });
}

// --- Function for index.html (Smart Budget Alerts) ---
function checkBudgetStatus(userId) {
    const settingsRef = db.collection('users').doc(userId).collection('settings');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const budgetAlertEl = document.getElementById('budget-alert');

    if (!budgetAlertEl) return;

    // Fetch Total Budget & Category Budgets
    Promise.all([
        settingsRef.doc('budget').get(),
        settingsRef.doc('categoryBudgets').get()
    ]).then(([totalBudgetDoc, catBudgetDoc]) => {
        const totalBudget = totalBudgetDoc.exists ? totalBudgetDoc.data().amount : 0;
        const catBudgets = catBudgetDoc.exists ? catBudgetDoc.data() : {};

        // If no budgets set at all, hide alert
        if (totalBudget === 0 && Object.keys(catBudgets).length === 0) return;

        // Current Month Range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

        // Fetch Expenses
        transactionsRef.where('type', '==', 'expense')
            .where('date', '>=', startOfMonth)
            .where('date', '<=', endOfMonth)
            .onSnapshot(snapshot => {
                let totalSpent = 0;
                const catSpent = {};

                snapshot.forEach(doc => {
                    const t = doc.data();
                    totalSpent += t.amount;
                    if (t.category) {
                        catSpent[t.category] = (catSpent[t.category] || 0) + t.amount;
                    }
                });

                const alerts = [];

                // 1. Check Total Budget
                if (totalBudget > 0) {
                    const pct = (totalSpent / totalBudget) * 100;
                    if (pct >= 100) {
                        alerts.push({ type: 'danger', msg: `<b>Total Budget Exceeded!</b> Spent ₹${totalSpent.toLocaleString()} of ₹${totalBudget.toLocaleString()}` });
                    } else if (pct >= 85) {
                        alerts.push({ type: 'warning', msg: `<b>Total Budget Warning:</b> You've used ${pct.toFixed(0)}% of your monthly limit.` });
                    }
                }

                // 2. Check Category Budgets
                Object.keys(catBudgets).forEach(cat => {
                    const limit = catBudgets[cat];
                    const spent = catSpent[cat] || 0;
                    
                    if (spent > limit) {
                        alerts.push({ type: 'danger', msg: `<b>${cat} Limit Exceeded!</b> Spent ₹${spent.toLocaleString()} (Limit: ₹${limit.toLocaleString()})` });
                    } else if (spent >= (limit * 0.9)) {
                         alerts.push({ type: 'warning', msg: `<b>${cat} Alert:</b> You are near your ₹${limit.toLocaleString()} limit.` });
                    }
                });

                // Display Alerts
                if (alerts.length > 0) {
                    // Prioritize: Show max 2 alerts, Red (danger) first
                    alerts.sort((a, b) => (a.type === 'danger' ? -1 : 1));
                    
                    const topAlerts = alerts.slice(0, 2); 
                    const isDanger = topAlerts.some(a => a.type === 'danger');
                    
                    budgetAlertEl.className = isDanger 
                        ? 'p-4 mb-6 rounded-lg border shadow-sm bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-200'
                        : 'p-4 mb-6 rounded-lg border shadow-sm bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/40 dark:border-yellow-800 dark:text-yellow-200';

                    budgetAlertEl.innerHTML = topAlerts.map(a => `<div class="flex items-center mb-1 last:mb-0"><i class="fas ${a.type === 'danger' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-2"></i><span>${a.msg}</span></div>`).join('');
                    budgetAlertEl.classList.remove('hidden');
                } else {
                    budgetAlertEl.classList.add('hidden');
                }
            });
    });
}