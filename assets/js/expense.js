document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeExpenseTracking(user.uid);
            updateGreeting(); 
        }
    });
});

// --- UI: SMART GREETING ---
function updateGreeting() {
    const hours = new Date().getHours();
    const titleEl = document.getElementById('greeting-title');
    if (!titleEl) return;

    let greeting = "Welcome Back!";
    if (hours >= 5 && hours < 12) greeting = "Good Morning!";
    else if (hours >= 12 && hours < 17) greeting = "Good Afternoon!";
    else if (hours >= 17 && hours < 22) greeting = "Good Evening!";
    else greeting = "Late Night Hustle?";

    titleEl.innerText = greeting;
}

// --- HELPER FUNCTIONS ---

function getTransactionSkeleton() {
    return `
        <div class="flex items-center p-3 mb-2 bg-white dark:bg-gray-800 rounded-2xl animate-pulse border border-gray-100 dark:border-gray-700">
            <div class="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
            <div class="flex-1 space-y-2">
                <div class="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div class="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    `;
}

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
    const key = category ? category.toLowerCase() : 'others';
    const defaultIcon = type === 'income' ? 'fa-wallet' : 'fa-receipt';
    return map[key] || defaultIcon;
}

function formatDateHeader(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    date.setHours(0,0,0,0); today.setHours(0,0,0,0); yesterday.setHours(0,0,0,0);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    
    return new Date(dateString).toLocaleDateString('en-US', { 
        day: 'numeric', month: 'short', year: 'numeric' 
    });
}

// --- AI: SMART SHORTEN ---
function smartShorten(text) {
    if (!text) return 'Unknown';
    let clean = text.trim();

    const junkPatterns = [
        /^payment to\s+/i, /^transfer to\s+/i, /^money sent to\s+/i, 
        /^bill for\s+/i, /^recharge of\s+/i, /^paid at\s+/i, /^purchase at\s+/i,
        /\s+via upi.*/i, /\s+using.*/i, /upi-\d+/i
    ];
    junkPatterns.forEach(regex => clean = clean.replace(regex, ''));
    clean = clean.replace(/[#:]\s*\d+/g, '').trim(); 

    const lower = clean.toLowerCase();
    if (lower.includes('uber') || lower.includes('ola')) return 'Cab Ride';
    if (lower.includes('zomato') || lower.includes('swiggy')) return 'Food Order';
    if (lower.includes('netflix')) return 'Netflix Sub';
    if (lower.includes('spotify')) return 'Spotify Sub';
    if (lower.includes('amazon') || lower.includes('flipkart')) return 'Shopping';
    if (lower.includes('jio') || lower.includes('airtel') || lower.includes('vi ')) return 'Recharge';
    if (lower.includes('petrol') || lower.includes('shell') || lower.includes('hp ')) return 'Fuel';

    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    return clean.length > 20 ? clean.substring(0, 18) + '..' : clean;
}

// --- MAIN LOGIC ---

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
    let allCategories = [];

    // --- 1. ACCOUNT DROPDOWN ---
    const accountSelect = document.getElementById('account');
    
    const renderAccountDropdown = (transactions = []) => {
        if (!accountSelect) return;
        const currentVal = accountSelect.value; 
        
        if (allAccounts.length === 0) {
            accountSelect.innerHTML = '<option value="" disabled selected>No accounts found.</option>';
            return;
        }

        accountSelect.innerHTML = '<option value="" disabled selected>Select Account</option>';
        const currencySymbol = getAppCurrency();

        allAccounts.forEach(acc => {
            let liveBalance = (acc.openingBalance !== undefined) ? acc.openingBalance : 0;
            transactions.forEach(t => {
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

    // --- 2. CATEGORY DROPDOWN ---
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

    // Load Initial Data
    if (accountSelect) {
        accountsRef.orderBy('name').onSnapshot(snapshot => {
            allAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    }

    if (categorySelect) {
        categoriesRef.orderBy('name').onSnapshot(snapshot => {
            allCategories = snapshot.docs.map(doc => doc.data());
            renderCategoryDropdown();
        });
        if (typeSelect) typeSelect.addEventListener('change', renderCategoryDropdown);
    }

    // --- 3. AI INPUT LOGIC ---
    const descInput = document.getElementById('description');
    if (descInput) {
        descInput.addEventListener('input', (e) => {
            if (typeof AI !== 'undefined') {
                const predictedCat = AI.predictCategory(e.target.value);
                if (predictedCat && categorySelect) {
                    const options = Array.from(categorySelect.options);
                    const match = options.find(opt => opt.value.toLowerCase() === predictedCat.toLowerCase());
                    if (match) {
                        categorySelect.value = match.value;
                        categorySelect.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');
                        setTimeout(() => categorySelect.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500'), 1000);
                    }
                }
            }
        });

        descInput.addEventListener('change', (e) => {
            if (typeof AI !== 'undefined') {
                const original = e.target.value;
                const translated = AI.translate(original);
                if (original.toLowerCase() !== translated.toLowerCase()) {
                    e.target.value = translated;
                    if (window.triggerHaptic) window.triggerHaptic(10);
                }
            }
        });
    }

    // --- 4. REAL-TIME LIST & DASHBOARD ---
    if (transactionList) {
        transactionList.innerHTML = getTransactionSkeleton() + getTransactionSkeleton();

        transactionsRef.orderBy('date', 'desc').orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
            transactionList.innerHTML = '';
            
            const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            renderAccountDropdown(transactions);
            updateDashboardSummary(transactions);

            if (transactions.length === 0) {
                transactionList.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                        <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                            <i class="fas fa-receipt text-2xl opacity-50"></i>
                        </div>
                        <p class="text-sm font-medium">No transactions yet.</p>
                    </div>`;
                return;
            }

            const currencySymbol = getAppCurrency();
            const groups = {};
            transactions.forEach(t => { const k = t.date; if(!groups[k]) groups[k]=[]; groups[k].push(t); });

            Object.keys(groups).forEach(date => {
                // Header
                transactionList.insertAdjacentHTML('beforeend', `
                    <div class="sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md z-30 py-2 px-1 border-b border-gray-100 dark:border-gray-800">
                        <h4 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                            <i class="far fa-calendar mr-2"></i> ${formatDateHeader(date)}
                        </h4>
                    </div>
                `);

                // Items
                groups[date].forEach(t => {
                    const isIncome = t.type === 'income';
                    const amountColor = isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white';
                    const sign = isIncome ? '+' : '-';
                    const iconClass = getCategoryIcon(t.category, t.type);
                    const iconBg = isIncome ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400';
                    const displayTitle = smartShorten(t.description);

                    // FIX: Replaced 'dark:bg-gray-800/60' with 'dark:bg-gray-800' (SOLID COLOR)
                    const html = `
                    <div class="swipe-item-wrapper mb-2 group" id="wrap-${t.id}">
                        <div class="swipe-actions rounded-2xl">
                            <span class="text-white font-bold flex items-center text-xs"><i class="fas fa-trash-alt mr-2"></i>DELETE</span>
                        </div>
                        <div class="swipe-content flex items-center p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 relative z-10 transition-transform active:scale-[0.99]" id="item-${t.id}">
                            
                            <div class="w-10 h-10 rounded-full flex items-center justify-center ${iconBg} mr-3 shrink-0 text-sm">
                                <i class="fas ${iconClass}"></i>
                            </div>

                            <div class="flex-1 min-w-0 mr-3">
                                <p class="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">${displayTitle}</p>
                                <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    ${t.category} <span class="mx-1 opacity-30">|</span> ${t.account}
                                </p>
                            </div>

                            <div class="text-right shrink-0">
                                <p class="font-bold text-sm ${amountColor}">${sign} ${currencySymbol}${t.amount.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>`;
                    
                    transactionList.insertAdjacentHTML('beforeend', html);
                    const itemEl = document.getElementById(`item-${t.id}`);
                    if (itemEl) addSwipeListeners(itemEl, t.id, t.description, transactionsRef);
                });
            });

        }, error => console.error(error));
    }

    // --- 5. ADD TRANSACTION SUBMIT ---
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

                if (window.triggerHaptic) window.triggerHaptic(50);

                submitBtn.innerText = "Saved!";
                setTimeout(() => {
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                }, 1500);

            } catch (error) {
                console.error("Error saving:", error);
                alert("Failed to save.");
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
}

// --- UPDATED SUMMARY & BUDGET BAR LOGIC ---
function updateDashboardSummary(transactions) {
    let inc = 0, exp = 0;
    transactions.forEach(t => {
        if(t.type === 'income') inc += t.amount;
        else if(t.type === 'expense') exp += t.amount;
    });

    const bal = inc - exp;
    const currency = typeof getCurrency === 'function' ? getCurrency() : '₹';

    const elInc = document.getElementById('total-income');
    const elExp = document.getElementById('total-expense');
    const elBal = document.getElementById('balance');
    
    // Budget Bar Elements
    const progBar = document.getElementById('expense-progress');
    const progText = document.getElementById('budget-text');

    if(elInc) elInc.textContent = `${currency}${inc.toLocaleString()}`;
    if(elExp) elExp.textContent = `${currency}${exp.toLocaleString()}`;
    if(elBal) elBal.textContent = `${currency}${bal.toLocaleString()}`;

    // Smart Bar Logic
    if (progBar && progText) {
        if (inc === 0) {
            progBar.style.width = '0%';
            progText.textContent = 'No income yet';
        } else {
            const percentage = Math.min((exp / inc) * 100, 100);
            progBar.style.width = `${percentage}%`;
            
            // Color Shift (Green -> Yellow -> Red)
            if (percentage < 50) progBar.className = "h-1.5 rounded-full transition-all duration-700 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
            else if (percentage < 80) progBar.className = "h-1.5 rounded-full transition-all duration-700 bg-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]";
            else progBar.className = "h-1.5 rounded-full transition-all duration-700 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]";

            progText.textContent = `${Math.round(percentage)}% of income used`;
        }
    }
    
    // Render Chart
    if (typeof renderExpenseChart === 'function') {
        const categoryData = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            categoryData[t.category] = (categoryData[t.category] || 0) + t.amount;
        });
        renderExpenseChart(categoryData);
    }
}

// --- SWIPE LOGIC ---
function addSwipeListeners(element, docId, description, ref) {
    let touchStartX = 0; let touchStartY = 0;
    let currentTranslate = 0; let isSwiping = false;
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
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffY) > Math.abs(diffX)) return;

        if (diffX < 0) {
            isSwiping = true;
            currentTranslate = Math.max(diffX, -150); 
            element.style.transform = `translateX(${currentTranslate}px)`;
        }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        element.classList.remove('swiping'); 
        if (currentTranslate < -60) {
            element.style.transform = `translateX(${maxSwipe}px)`;
            if (currentTranslate < -200) confirmDelete(docId, description, ref);
        } else {
            element.style.transform = 'translateX(0)';
        }
        isSwiping = false; currentTranslate = 0;
    });
    
    const wrapper = document.getElementById(`wrap-${docId}`);
    if(wrapper) {
        const deleteBtn = wrapper.querySelector('.swipe-actions');
        const newBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);
        newBtn.addEventListener('click', () => confirmDelete(docId, description, ref));
    }
}

// --- UNDO DELETE ---
function confirmDelete(docId, description, ref) {
    if (window.triggerHaptic) window.triggerHaptic(50);
    
    ref.doc(docId).get().then(doc => {
        if (doc.exists) {
            const backupData = doc.data();
            ref.doc(docId).delete().then(() => {
                if (window.showUndoToast) {
                    window.showUndoToast(`Deleted "${description}"`, () => {
                        ref.doc(docId).set(backupData).then(() => console.log("Restored"));
                    });
                }
            }).catch(err => alert("Error deleting"));
        }
    }).catch(err => console.error(err));
}