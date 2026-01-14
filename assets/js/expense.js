document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeExpenseTracking(user.uid);
        }
    });
});

// Skeleton Loader
function getTransactionSkeleton() {
    return `
        <div class="flex items-center p-3 bg-white dark:bg-gray-800 rounded-lg mb-3 shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="skeleton h-10 w-10 rounded-full mr-3"></div>
            <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-32"></div>
                <div class="skeleton h-3 w-20"></div>
            </div>
            <div class="skeleton h-5 w-16"></div>
        </div>
    `;
}

// Icon Helper
function getCategoryIcon(category, type) {
    const map = {
        'food': 'fa-utensils',
        'travel': 'fa-car',
        'shopping': 'fa-shopping-bag',
        'bills': 'fa-file-invoice-dollar',
        'entertainment': 'fa-film',
        'health': 'fa-medkit',
        'education': 'fa-graduation-cap',
        'grocery': 'fa-carrot',
        'salary': 'fa-money-bill-wave',
        'bonus': 'fa-coins',
        'allowance': 'fa-hand-holding-usd',
        'investment': 'fa-chart-line',
        'fuel': 'fa-gas-pump',
        'rent': 'fa-home',
        'gift': 'fa-gift',
        'others': 'fa-tag'
    };
    const key = category.toLowerCase();
    // Default icons based on type if category not found
    const defaultIcon = type === 'income' ? 'fa-wallet' : 'fa-receipt';
    return map[key] || defaultIcon;
}

// Date Formatter Helper
function formatDateHeader(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset times for accurate comparison
    date.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    yesterday.setHours(0,0,0,0);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    
    return new Date(dateString).toLocaleDateString('en-US', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

function initializeExpenseTracking(userId) {
    const transactionForm = document.getElementById('transaction-form');
    const transactionList = document.getElementById('transaction-list');
    
    const getAppCurrency = () => {
        return typeof getCurrency === 'function' ? getCurrency() : '₹';
    };

    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const categoriesRef = db.collection('users').doc(userId).collection('categories'); 
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const templatesRef = db.collection('users').doc(userId).collection('templates');

    let allAccounts = [];
    let allTransactions = [];
    let allCategories = [];

    // --- 1. SMART ACCOUNT DROPDOWN ---
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
            option.textContent = `${acc.name} (${currencySymbol}${liveBalance.toLocaleString()})`;
            accountSelect.appendChild(option);
        });

        if (currentVal) {
            const exists = Array.from(accountSelect.options).some(o => o.value === currentVal);
            if (exists) accountSelect.value = currentVal;
        }
    };

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

    // --- 2. SMART CATEGORY DROPDOWN ---
    const categorySelect = document.getElementById('category');
    const typeSelect = document.getElementById('type'); 

    const renderCategoryDropdown = () => {
        if (!categorySelect) return;
        const selectedType = typeSelect ? typeSelect.value : 'expense'; 
        const currentVal = categorySelect.value;

        categorySelect.innerHTML = '<option value="" disabled selected>Select Category</option>';
        const filteredCats = allCategories.filter(cat => cat.type.toLowerCase() === selectedType.toLowerCase());

        if (filteredCats.length === 0) {
            const defaultCategories = selectedType === 'income' 
                ? ['Salary', 'Allowance', 'Bonus', 'Other'] 
                : ['Food', 'Travel', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Education', 'Grocery', 'Rent', 'Fuel', 'Other'];
            defaultCategories.forEach(catName => {
                const option = document.createElement('option');
                option.value = catName;
                option.textContent = catName;
                categorySelect.appendChild(option);
            });
        } else {
            filteredCats.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.name;
                option.textContent = cat.name;
                categorySelect.appendChild(option);
            });
        }
        if (currentVal) {
            const exists = Array.from(categorySelect.options).some(o => o.value === currentVal);
            if (exists) categorySelect.value = currentVal;
        }
    };

    if (categorySelect) {
        categoriesRef.orderBy('name').onSnapshot(snapshot => {
            allCategories = snapshot.docs.map(doc => doc.data());
            renderCategoryDropdown();
        });
        if (typeSelect) typeSelect.addEventListener('change', renderCategoryDropdown);
    }

    // --- 3. ADD TRANSACTION FORM ---
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

            const submitBtn = transactionForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "Saving...";
            submitBtn.disabled = true;

            try {
                const batch = db.batch();
                const newTxRef = transactionsRef.doc();
                batch.set(newTxRef, {
                    type, amount, category, description, date,
                    account: accountName, accountId: accountId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (saveAsTemplate) {
                    const newTempRef = templatesRef.doc();
                    batch.set(newTempRef, {
                        type, amount, category, description, account: accountName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                await batch.commit();

                transactionForm.reset();
                document.getElementById('save-template').checked = false;
                document.getElementById('date').valueAsDate = new Date();
                if (typeSelect) typeSelect.dispatchEvent(new Event('change'));

                if (navigator.vibrate) navigator.vibrate(50); // Haptic

                submitBtn.innerText = "Saved!";
                submitBtn.classList.replace('bg-indigo-600', 'bg-green-600');
                
                setTimeout(() => {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.classList.replace('bg-green-600', 'bg-indigo-600');
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

    // --- 4. REAL-TIME LIST (Refined UI) ---
    if (transactionList) {
        transactionList.innerHTML = getTransactionSkeleton() + getTransactionSkeleton();

        transactionsRef.orderBy('date', 'desc').orderBy('createdAt', 'desc').limit(20).onSnapshot(snapshot => {
            transactionList.innerHTML = '';
            
            if (snapshot.empty) {
                transactionList.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                        <i class="fas fa-receipt text-4xl mb-2 opacity-50"></i>
                        <p class="text-sm">No transactions yet.</p>
                    </div>`;
                return;
            }

            const currencySymbol = getAppCurrency();
            
            // Group By Date
            const groups = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const dateKey = data.date;
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push({ id: doc.id, ...data });
            });

            // Iterate Groups
            Object.keys(groups).forEach(date => {
                // FIXED: Increased z-index to 30 to stay above items
                // FIXED: Added backdrop blur and solid color for better readability
                const headerHtml = `
                    <div class="sticky top-0 bg-[#EAE5E1] dark:bg-gray-900 z-30 py-2 mb-2 px-1 border-b border-gray-200 dark:border-gray-700/50 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
                        <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                            <i class="fas fa-calendar-day mr-2 text-[10px]"></i>
                            ${formatDateHeader(date)}
                        </h4>
                    </div>
                `;
                transactionList.insertAdjacentHTML('beforeend', headerHtml);

                // Items in this group
                groups[date].forEach(t => {
                    const isIncome = t.type === 'income';
                    const amountColor = isIncome ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white';
                    const sign = isIncome ? '+' : '-';
                    const iconClass = getCategoryIcon(t.category, t.type);
                    const iconBg = isIncome ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400';

                    // FIXED: Used solid 'bg-white' and 'dark:bg-gray-800' to prevent see-through
                    // FIXED: Added 'min-w-0' to flex items to enforce truncation
                    const html = `
                    <div class="swipe-item-wrapper mb-3" id="wrap-${t.id}">
                        <div class="swipe-actions rounded-xl">
                            <span class="text-white font-bold flex items-center"><i class="fas fa-trash-alt mr-2"></i>Delete</span>
                        </div>
                        <div class="swipe-content flex items-center p-3.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative z-10" id="item-${t.id}">
                            
                            <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconBg} mr-3.5 shrink-0 text-lg shadow-inner">
                                <i class="fas ${iconClass}"></i>
                            </div>

                            <div class="flex-1 min-w-0 mr-3">
                                <p class="font-bold text-gray-800 dark:text-gray-100 text-sm truncate leading-snug">${t.description}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate flex items-center">
                                    <span class="truncate max-w-[100px]">${t.category}</span>
                                    <span class="mx-1.5 opacity-30">|</span> 
                                    <span class="truncate max-w-[100px]">${t.account}</span>
                                </p>
                            </div>

                            <div class="text-right shrink-0">
                                <p class="font-bold text-sm ${amountColor} whitespace-nowrap">${sign} ${currencySymbol}${t.amount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>`;
                    
                    transactionList.insertAdjacentHTML('beforeend', html);
                    
                    // Attach Swipe Listeners
                    const itemEl = document.getElementById(`item-${t.id}`);
                    if (itemEl) addSwipeListeners(itemEl, t.id, t.description, transactionsRef);
                });
            });

        }, error => {
             console.error("Error fetching transactions:", error);
             transactionList.innerHTML = '<p class="text-red-500 text-center py-4 text-sm">Unable to load history.</p>';
        });
    }
}

// --- SWIPE LOGIC HELPER ---
function addSwipeListeners(element, docId, description, ref) {
    let touchStartX = 0;
    let touchStartY = 0;
    let currentTranslate = 0;
    let isSwiping = false;
    const maxSwipe = -100; 

    element.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        document.querySelectorAll('.swipe-content').forEach(el => {
            if (el !== element) el.style.transform = 'translateX(0)';
        });
        element.classList.add('swiping'); 
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        const touchCurrentX = e.changedTouches[0].screenX;
        const touchCurrentY = e.changedTouches[0].screenY;
        const diffX = touchCurrentX - touchStartX;
        const diffY = touchCurrentY - touchStartY;

        if (Math.abs(diffY) > Math.abs(diffX)) return;

        if (diffX < 0) {
            isSwiping = true;
            currentTranslate = Math.max(diffX, -150); 
            element.style.transform = `translateX(${currentTranslate}px)`;
        }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        element.classList.remove('swiping'); 
        const touchEndX = e.changedTouches[0].screenX;
        
        if (currentTranslate < -60) {
            element.style.transform = `translateX(${maxSwipe}px)`;
            if (currentTranslate < -200) {
                confirmDelete(docId, description, ref);
            }
        } else {
            element.style.transform = 'translateX(0)';
        }
        
        isSwiping = false;
        currentTranslate = 0;
    });
    
    const wrapper = document.getElementById(`wrap-${docId}`);
    if(wrapper) {
        const deleteBtn = wrapper.querySelector('.swipe-actions');
        // Prevent multiple listeners
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
        
        newBtn.addEventListener('click', () => {
             confirmDelete(docId, description, ref);
        });
    }
}

function confirmDelete(docId, description, ref) {
    if (navigator.vibrate) navigator.vibrate(50);
    if (confirm(`Delete transaction "${description}"?`)) {
        ref.doc(docId).delete().catch(err => alert("Error deleting"));
    } else {
        const el = document.getElementById(`item-${docId}`);
        if(el) el.style.transform = 'translateX(0)';
    }
}