// This script handles adding, fetching, and deleting categories on the categories.html page.

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        // Run this script only if the user is logged in and on the categories page.
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

    // Firestore Reference
    const categoriesRef = db.collection('users').doc(userId).collection('categories');

    // --- Reusable Function to ADD a CATEGORY ---
    const addCategory = (form, type) => {
        const input = form.querySelector('input');
        form.addEventListener('submit', e => {
            e.preventDefault();
            const categoryName = input.value.trim();
            if (!categoryName) return; // Do nothing if input is empty

            categoriesRef.add({
                name: categoryName,
                type: type, // 'expense' or 'income'
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                console.log(`${type} category added!`);
                input.value = ''; // Clear input field after successful submission
            }).catch(error => console.error(`Error adding ${type} category: `, error));
        });
    };

    // Initialize both forms
    addCategory(expenseForm, 'expense');
    addCategory(incomeForm, 'income');

    // --- Reusable Function to DISPLAY & DELETE CATEGORIES ---
    const renderCategories = (listElement, type) => {
        // BADLAV YAHAN KIYA GAYA HAI: .orderBy('name') ko hata diya gaya hai
        categoriesRef.where('type', '==', type).onSnapshot(snapshot => {
            listElement.innerHTML = ''; // Clear the list before re-rendering
            if (snapshot.empty) {
                listElement.innerHTML = `<p class="text-gray-500">No ${type} categories yet. Add one to get started.</p>`;
                return;
            }
            snapshot.forEach(doc => {
                const category = doc.data();
                const itemHTML = `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                        <p class="font-medium text-gray-800">${category.name}</p>
                        <button data-id="${doc.id}" class="delete-category-btn text-gray-400 hover:text-red-500">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                listElement.innerHTML += itemHTML;
            });
        });
    };

    // Render both lists
    renderCategories(expenseList, 'expense');
    renderCategories(incomeList, 'income');

    // --- Function to handle DELETE (uses Event Delegation) ---
    const handleDelete = (event) => {
        const deleteButton = event.target.closest('.delete-category-btn');
        if (deleteButton) {
            const docId = deleteButton.dataset.id;
            if (confirm('Are you sure you want to delete this category?')) {
                categoriesRef.doc(docId).delete()
                    .catch(error => console.error("Error deleting category: ", error));
            }
        }
    };
    
    // Attach a single event listener to each list for handling deletes
    expenseList.addEventListener('click', handleDelete);
    incomeList.addEventListener('click', handleDelete);
}