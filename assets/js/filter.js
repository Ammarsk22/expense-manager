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
    const searchTermInput = document.getElementById('search-term'); // Search input
    const filterButton = document.getElementById('filter-button');
    const resetButton = document.getElementById('reset-button');

    // Firestore References
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const categoriesRef = db.collection('users').doc(userId).collection('categories');

    // Helper function to safely get currency
    const getAppCurrency = () => {
        return typeof getCurrency === 'function' ? getCurrency() : '₹';
    };

    // --- Populate Category Filter Dropdown ---
    categoriesRef.orderBy('name').onSnapshot(snapshot => {
        filterCategorySelect.innerHTML = '<option value="all">All Categories</option>';
        snapshot.forEach(doc => {
            const category = doc.data();
            filterCategorySelect.innerHTML += `<option value="${category.name}">${category.name}</option>`;
        });
    });

    // --- Function to Render Transactions to the DOM ---
    const renderTransactions = (docs) => {
        transactionList.innerHTML = ''; // Clear the list first
        if (!docs || docs.length === 0) {
            transactionList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No transactions found for the selected filters.</p>';
            return;
        }

        const currencySymbol = getAppCurrency();

        docs.forEach(doc => {
            const transaction = doc.data();
            const amountColor = transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const amountSign = transaction.type === 'income' ? '+' : '-';

            const itemHTML = `
                <div class="flex justify-between items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <div>
                        <p class="font-bold text-gray-800 dark:text-gray-200">${transaction.description}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            <span class="bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-500">${transaction.category}</span>
                            <span class="mx-1">•</span>
                            ${transaction.account || 'N/A'} 
                            <span class="mx-1">•</span> 
                            ${transaction.date}
                        </p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <p class="font-bold text-lg ${amountColor}">${amountSign} ${currencySymbol}${transaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        <button data-id="${doc.id}" class="delete-btn text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            transactionList.innerHTML += itemHTML;
        });
    };

    // --- Main Function to Fetch and Filter Transactions ---
    const applyFiltersAndSearch = async () => {
        transactionList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Loading transactions...</p>';
        
        // UPDATED SORTING LOGIC: Sort by Date first, then by Created Time
        let query = transactionsRef.orderBy('date', 'desc').orderBy('createdAt', 'desc');

        // Apply Firestore-level filters
        if (filterType.value !== 'all') {
            query = query.where('type', '==', filterType.value);
        }
        if (filterCategorySelect.value !== 'all') {
            query = query.where('category', '==', filterCategorySelect.value);
        }

        try {
            const snapshot = await query.get();
            let transactions = snapshot.docs;

            // Apply client-side search filter
            const searchTerm = searchTermInput.value.toLowerCase().trim();
            if (searchTerm) {
                transactions = transactions.filter(doc => {
                    const data = doc.data();
                    const description = data.description ? data.description.toLowerCase() : '';
                    const category = data.category ? data.category.toLowerCase() : '';
                    const accountName = data.account ? data.account.toLowerCase() : ''; 

                    return description.includes(searchTerm) || 
                           category.includes(searchTerm) || 
                           accountName.includes(searchTerm);
                });
            }

            renderTransactions(transactions);

        } catch (error) {
            console.error("Error fetching transactions: ", error);
            
            // Handle missing index error
            if (error.message.includes('The query requires an index')) {
                const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)[0];
                transactionList.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-red-500 mb-2">Error: Missing Index.</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">To fix sorting by Date + Time, click the link below to create the index in Firebase:</p>
                        <a href="${indexLink}" target="_blank" class="text-indigo-600 underline">Create Index</a>
                    </div>
                `;
            } else {
                transactionList.innerHTML = '<p class="text-red-500 text-center py-8">Error loading data. Please check console.</p>';
            }
        }
    };

    // --- Initial Fetch ---
    applyFiltersAndSearch();

    // --- Event Listeners ---
    filterButton.addEventListener('click', applyFiltersAndSearch);

    resetButton.addEventListener('click', () => {
        // Reset form fields
        filterType.value = 'all';
        filterCategorySelect.value = 'all';
        searchTermInput.value = '';
        // Fetch the original full list
        applyFiltersAndSearch();
    });

    // Delete Button (using event delegation)
    transactionList.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const docId = deleteButton.dataset.id;
            if (confirm('Are you sure you want to delete this transaction?')) {
                transactionsRef.doc(docId).delete()
                    .then(() => applyFiltersAndSearch()) // Re-apply filters to refresh the list
                    .catch(error => console.error("Error deleting transaction: ", error));
            }
        }
    });
}