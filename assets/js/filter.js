// This script handles fetching, displaying, filtering, and deleting transactions on the history.html page.

document.addEventListener('DOMContentLoaded', function() {
    // Run this script only if we are on the history page
    if (window.location.pathname.endsWith('history.html')) {
        auth.onAuthStateChanged(user => {
            if (user) {
                initializeHistoryPage(user.uid);
            }
        });
    }
});

function initializeHistoryPage(userId) {
    // DOM Elements
    const transactionList = document.getElementById('history-transaction-list');
    const filterType = document.getElementById('filter-type');
    const filterCategorySelect = document.getElementById('filter-category');
    const filterDate = document.getElementById('filter-date');
    const filterButton = document.getElementById('filter-button');
    const resetButton = document.getElementById('reset-button');

    // Firestore References
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const categoriesRef = db.collection('users').doc(userId).collection('categories');

    // --- Populate Category Filter Dropdown ---
    categoriesRef.orderBy('name').onSnapshot(snapshot => {
        // Keep the "All Categories" option and add the rest dynamically
        filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
        snapshot.forEach(doc => {
            const category = doc.data();
            filterCategorySelect.innerHTML += `<option value="${category.name}">${category.name}</option>`;
        });
    });

    // --- Function to Render Transactions to the DOM ---
    const renderTransactions = (docs) => {
        transactionList.innerHTML = ''; // Clear the list first
        if (docs.length === 0) {
            transactionList.innerHTML = '<p class="text-gray-500 text-center py-8">No transactions found for the selected filters.</p>';
            return;
        }
        docs.forEach(doc => {
            const transaction = doc.data();
            const amountColor = transaction.type === 'income' ? 'text-green-500' : 'text-red-500';
            const amountSign = transaction.type === 'income' ? '+' : '-';

            const itemHTML = `
                <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg shadow-sm">
                    <div>
                        <p class="font-bold text-gray-800">${transaction.description}</p>
                        <!-- Updated to show account name -->
                        <p class="text-sm text-gray-500">${transaction.accountName || 'N/A'} | ${transaction.category} on ${transaction.date}</p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <p class="font-bold text-lg ${amountColor}">${amountSign} ₹${transaction.amount.toFixed(2)}</p>
                        <button data-id="${doc.id}" class="delete-btn text-gray-400 hover:text-red-500">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            transactionList.innerHTML += itemHTML;
        });
    };

    // --- Function to Fetch Transactions based on a query ---
    const fetchTransactions = (query) => {
        transactionList.innerHTML = '<p class="text-gray-500 text-center py-8">Loading transactions...</p>';
        query.get()
            .then(snapshot => renderTransactions(snapshot.docs))
            .catch(error => console.error("Error fetching transactions: ", error));
    };
    
    // --- Initial Fetch ---
    let baseQuery = transactionsRef.orderBy('date', 'desc');
    fetchTransactions(baseQuery);

    // --- Event Listeners ---
    // Filter Button
    filterButton.addEventListener('click', () => {
        let filteredQuery = transactionsRef.orderBy('date', 'desc'); // Start with the base query
        if (filterType.value !== 'all') {
            filteredQuery = filteredQuery.where('type', '==', filterType.value);
        }
        if (filterCategorySelect.value !== 'all') {
            filteredQuery = filteredQuery.where('category', '==', filterCategorySelect.value);
        }
        if (filterDate.value) {
            filteredQuery = filteredQuery.where('date', '==', filterDate.value);
        }
        fetchTransactions(filteredQuery);
    });

    // Reset Button
    resetButton.addEventListener('click', () => {
        // Reset form fields
        filterType.value = 'all';
        filterCategorySelect.value = 'all';
        filterDate.value = '';
        // Fetch the original full list
        fetchTransactions(baseQuery);
    });

    // Delete Button (using event delegation)
    transactionList.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const docId = deleteButton.dataset.id;
            if (confirm('Are you sure you want to delete this transaction?')) {
                transactionsRef.doc(docId).delete()
                    .then(() => filterButton.click()) // Re-apply filter to refresh the list
                    .catch(error => console.error("Error deleting transaction: ", error));
            }
        }
    });
}

