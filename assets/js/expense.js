// This script handles adding/fetching expenses from Firestore and displaying them on the dashboard.

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        // Run this script only if the user is logged in and on the dashboard page.
        if (user && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
            initializeExpenseTracking(user.uid);
        }
    });
});

function initializeExpenseTracking(userId) {
    // DOM Elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    const dateInput = document.getElementById('date');
    const accountSelect = document.getElementById('account');
    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');

    // Firestore References
    const categoriesRef = db.collection('users').doc(userId).collection('categories');
    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');

    // --- Set Date to Today Automatically ---
    dateInput.value = new Date().toISOString().split('T')[0];

    // --- Populate Accounts Dropdown ---
    accountsRef.orderBy('name').onSnapshot(snapshot => {
        accountSelect.innerHTML = '<option value="" disabled selected>Select Account</option>';
        if (snapshot.empty) {
            accountSelect.innerHTML = '<option value="" disabled>Please add an account first</option>';
        }
        snapshot.forEach(doc => {
            accountSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    });

    // --- Populate Categories Dropdown based on Type ---
    const populateCategories = (type) => {
        // BADLAV YAHAN KIYA GAYA HAI: .orderBy('name') ko hata diya gaya hai
        categoriesRef.where('type', '==', type).onSnapshot(snapshot => {
            categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
            if (snapshot.empty) {
                 categorySelect.innerHTML = `<option value="" disabled>No ${type} categories found</option>`;
            }
            snapshot.forEach(doc => {
                categorySelect.innerHTML += `<option value="${doc.data().name}">${doc.data().name}</option>`;
            });
        });
    };

    // Initial population for 'expense'
    populateCategories('expense');
    // Add event listener to change categories when transaction type changes
    typeSelect.addEventListener('change', () => populateCategories(typeSelect.value));


    // --- ADD TRANSACTION ---
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const accountId = transactionForm.account.value;
        const category = transactionForm.category.value;

        if (!accountId || !category) {
            alert("Please select an account and a category.");
            return;
        }

        transactionsRef.add({
            accountId: accountId,
            accountName: transactionForm.account.options[transactionForm.account.selectedIndex].text,
            type: transactionForm.type.value,
            amount: parseFloat(transactionForm.amount.value),
            category: category,
            description: transactionForm.description.value,
            date: transactionForm.date.value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Transaction successfully added!");
            transactionForm.reset();
            dateInput.value = new Date().toISOString().split('T')[0]; // Reset date to today
            populateCategories('expense'); // Reset category dropdown to show expenses
        }).catch(error => console.error("Error adding transaction: ", error));
    });

    // --- DISPLAY RECENT TRANSACTIONS ---
    transactionsRef.orderBy('createdAt', 'desc').limit(5).onSnapshot(snapshot => {
        transactionList.innerHTML = '';
        if (snapshot.empty) {
            transactionList.innerHTML = '<p class="text-gray-500">No recent transactions.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const t = doc.data();
            const amountColor = t.type === 'income' ? 'text-green-500' : 'text-red-500';
            const amountSign = t.type === 'income' ? '+' : '-';
            transactionList.innerHTML += `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                    <div>
                        <p class="font-bold text-gray-800">${t.description}</p>
                        <p class="text-xs text-gray-500">${t.accountName} | ${t.category} on ${t.date}</p>
                    </div>
                    <p class="font-bold text-md ${amountColor}">${amountSign} ₹${t.amount.toFixed(2)}</p>
                </div>`;
        });
    });
}