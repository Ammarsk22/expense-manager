document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.endsWith('categories.html')) {
            initializeCategoriesPage(user.uid);
        }
    });
});

function initializeCategoriesPage(userId) {
    // DOM Elements
    const expenseForm = document.getElementById('add-expense-category-form');
    const incomeForm = document.getElementById('add-income-category-form');
    const expenseList = document.getElementById('expense-categories-list');
    const incomeList = document.getElementById('income-categories-list');
    const expenseSuggestionsDiv = document.getElementById('expense-suggestions');
    const incomeSuggestionsDiv = document.getElementById('income-suggestions');

    // Firestore Reference
    const categoriesRef = db.collection('users').doc(userId).collection('categories');

    // --- DEFAULT CATEGORIES LIST (For Auto-Population) ---
    const defaultExpenseCategories = [
        'Food', 'Travel', 'Groceries', 'Bills', 
        'Rent', 'Health', 'Shopping', 'Entertainment', 
        'Education', 'Personal Care', 'Gifts', 
        'Family', 'Insurance', 'Investment'
    ];
    
    const defaultIncomeCategories = [
        'Salary', 'Freelance', 'Business', 'Investments', 
        'Rental', 'Gifts', 'Bonus'
    ];

    // --- SUGGESTIONS (Extra ones for Quick Add) ---
    const expenseSuggestions = ['Pets', 'Subscriptions', 'Electronics', 'Furniture', 'Maintenance', 'Parking', 'Charity', 'Books', 'Gym'];
    const incomeSuggestions = ['Dividends', 'Interest', 'Side Hustle', 'Pension', 'Grant', 'Allowance', 'Refunds'];

    // --- 1. AUTO-ADD DEFAULT CATEGORIES (One-time setup) ---
    categoriesRef.limit(1).get().then(snapshot => {
        if (snapshot.empty) {
            console.log("No categories found. Adding defaults...");
            const batch = db.batch();

            // Add Default Expenses
            defaultExpenseCategories.forEach(name => {
                const docRef = categoriesRef.doc();
                batch.set(docRef, {
                    name: name,
                    type: 'expense',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            // Add Default Income
            defaultIncomeCategories.forEach(name => {
                const docRef = categoriesRef.doc();
                batch.set(docRef, {
                    name: name,
                    type: 'income',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            batch.commit().then(() => {
                console.log("Default categories added successfully.");
            }).catch(err => console.error("Error adding defaults:", err));
        }
    });

    // --- Helper: Add Category to Firestore ---
    const saveCategoryToDB = (name, type) => {
        if (!name) return;
        
        // Simple duplicate check logic (Frontend check)
        categoriesRef.where('name', '==', name).where('type', '==', type).get().then(snap => {
            if(!snap.empty) {
                alert('This category already exists!');
                return;
            }
            
            categoriesRef.add({
                name: name,
                type: type,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log(`${type} category added!`);
            }).catch(error => console.error(`Error adding ${type} category: `, error));
        });
    };

    // --- 2. HANDLE FORM SUBMISSION ---
    const setupForm = (form, type) => {
        const input = form.querySelector('input');
        form.addEventListener('submit', e => {
            e.preventDefault();
            saveCategoryToDB(input.value.trim(), type);
            input.value = '';
        });
    };

    setupForm(expenseForm, 'expense');
    setupForm(incomeForm, 'income');

    // --- 3. RENDER LIST & SUGGESTIONS ---
    const renderCategoriesAndSuggestions = (listElement, suggestionsElement, type, suggestionData) => {
        categoriesRef.where('type', '==', type).orderBy('name').onSnapshot(snapshot => {
            listElement.innerHTML = '';
            const existingNames = new Set();

            if (snapshot.empty) {
                listElement.innerHTML = `<p class="text-gray-500 dark:text-gray-400 italic text-sm text-center py-4">Loading default categories...</p>`;
            }

            // Render List Items
            snapshot.forEach(doc => {
                const category = doc.data();
                existingNames.add(category.name); // Track existing names

                const itemHTML = `
                    <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <p class="font-medium text-gray-800 dark:text-gray-200">${category.name}</p>
                        <button data-id="${doc.id}" class="delete-category-btn text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                listElement.innerHTML += itemHTML;
            });

            // Render Suggestions (Only show ones NOT already in the list)
            suggestionsElement.innerHTML = '';
            suggestionData.forEach(name => {
                if (!existingNames.has(name)) {
                    const chip = document.createElement('button');
                    chip.className = "text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full transition-all shadow-sm hover:shadow-md flex items-center";
                    chip.innerHTML = `<i class="fas fa-plus mr-1 text-gray-400 text-[10px]"></i>${name}`;
                    
                    chip.addEventListener('click', () => {
                        saveCategoryToDB(name, type);
                    });
                    
                    suggestionsElement.appendChild(chip);
                }
            });
        });
    };

    // Initialize Renderers
    // Note: We pass both default lists AND extra suggestions to the suggestion renderer so user can re-add them if deleted
    const allExpenseSuggestions = [...defaultExpenseCategories, ...expenseSuggestions];
    const allIncomeSuggestions = [...defaultIncomeCategories, ...incomeSuggestions];

    renderCategoriesAndSuggestions(expenseList, expenseSuggestionsDiv, 'expense', allExpenseSuggestions);
    renderCategoriesAndSuggestions(incomeList, incomeSuggestionsDiv, 'income', allIncomeSuggestions);

    // --- 4. HANDLE DELETE ---
    const handleDelete = (event) => {
        const deleteButton = event.target.closest('.delete-category-btn');
        if (deleteButton) {
            const docId = deleteButton.dataset.id;
            if (confirm('Delete this category?')) {
                categoriesRef.doc(docId).delete()
                    .catch(error => console.error("Error deleting category: ", error));
            }
        }
    };
    
    expenseList.addEventListener('click', handleDelete);
    incomeList.addEventListener('click', handleDelete);
}