document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeAccounts(user.uid);
        }
    });
});

function initializeAccounts(userId) {
    const accountsRef = db.collection('users').doc(userId).collection('accounts');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    
    const grid = document.getElementById('accounts-grid');
    const modal = document.getElementById('account-modal');
    const form = document.getElementById('account-form');
    const addBtn = document.getElementById('add-account-btn');
    const closeBtn = document.getElementById('close-modal');
    const totalEl = document.getElementById('total-net-worth');

    // --- 1. FETCH & RENDER ---
    // Fetch accounts logic (Note: To get accurate balance, we need transactions too,
    // but for this simplified view, we assume 'openingBalance' is updated or we calculate live)
    
    // For a robust system, we fetch accounts AND transactions to calculate live balance
    // Here we will do a simpler version: Fetch Accounts, then calculate balance from transactions locally
    
    let allAccounts = [];
    let allTransactions = [];

    const loadData = async () => {
        try {
            const [accSnap, txSnap] = await Promise.all([
                accountsRef.get(),
                transactionsRef.get()
            ]);

            allAccounts = accSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allTransactions = txSnap.docs.map(doc => doc.data());

            renderGrid();
        } catch (error) {
            console.error("Error loading data:", error);
            grid.innerHTML = '<p class="text-red-500 text-center col-span-full">Failed to load accounts.</p>';
        }
    };

    loadData();

    function renderGrid() {
        grid.innerHTML = '';
        let globalNetWorth = 0;

        if (allAccounts.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-university text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">No accounts added yet.</p>
                </div>`;
            totalEl.innerText = '₹0.00';
            return;
        }

        allAccounts.forEach(acc => {
            // Calculate Live Balance
            let balance = parseFloat(acc.openingBalance) || 0;
            // Note: If you want to sync balance, you can add logic here.
            // Assuming transactions have 'accountId' field.
            allTransactions.forEach(t => {
                if (t.accountId === acc.id) {
                    if (t.type === 'income') balance += t.amount;
                    else if (t.type === 'expense') balance -= t.amount;
                }
            });

            globalNetWorth += balance;

            // Determine Card Style
            const colorId = acc.color || '1'; // Default to 1
            const gradientClass = `card-gradient-${colorId}`;

            const html = `
                <div class="relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl ${gradientClass} group">
                    <div class="absolute inset-0 card-pattern opacity-30"></div>
                    
                    <div class="relative z-10 flex flex-col h-full justify-between min-h-[180px]">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-bold text-lg tracking-wide">${acc.name}</h3>
                                <p class="text-white/70 text-xs uppercase tracking-wider font-medium">FinTrack Card</p>
                            </div>
                            <i class="fas fa-wifi rotate-90 opacity-70"></i>
                        </div>

                        <div class="flex items-center gap-2 my-4">
                            <div class="w-10 h-8 bg-yellow-400/80 rounded-md border border-yellow-300/50 flex items-center justify-center overflow-hidden relative">
                                <div class="absolute w-[1px] h-full bg-black/10 left-1/3"></div>
                                <div class="absolute w-[1px] h-full bg-black/10 right-1/3"></div>
                                <div class="absolute h-[1px] w-full bg-black/10 top-1/3"></div>
                                <div class="absolute h-[1px] w-full bg-black/10 bottom-1/3"></div>
                            </div>
                            <i class="fas fa-rss text-white/50 text-xl rotate-45"></i>
                        </div>

                        <div class="flex justify-between items-end">
                            <div>
                                <p class="text-xs text-white/80 mb-1 uppercase font-medium">Balance</p>
                                <p class="text-2xl font-bold font-mono-num tracking-tight">₹${balance.toLocaleString()}</p>
                            </div>
                            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="editAccount('${acc.id}')" class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center backdrop-blur-md transition-colors"><i class="fas fa-pen text-xs"></i></button>
                                <button onclick="deleteAccount('${acc.id}')" class="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500/80 flex items-center justify-center backdrop-blur-md transition-colors"><i class="fas fa-trash text-xs"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });

        totalEl.innerText = `₹${globalNetWorth.toLocaleString()}`;
    }

    // --- 2. ADD/EDIT LOGIC ---
    addBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('acc-id').value = '';
        document.getElementById('modal-title').innerText = 'Add Account';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('acc-id').value;
        const name = document.getElementById('acc-name').value;
        const bal = parseFloat(document.getElementById('acc-balance').value);
        const color = document.querySelector('input[name="acc-color"]:checked').value;

        // Button Loading
        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        try {
            const data = {
                name: name,
                openingBalance: bal, // Note: Changing this in edit won't recount old transactions, keeping it simple
                color: color,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (id) {
                await accountsRef.doc(id).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await accountsRef.add(data);
            }

            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
            loadData(); // Refresh grid
            if(window.triggerHaptic) window.triggerHaptic(50);

        } catch (error) {
            console.error("Error:", error);
            alert("Failed to save.");
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });

    // --- 3. GLOBAL ACTIONS ---
    window.editAccount = (id) => {
        const acc = allAccounts.find(a => a.id === id);
        if (acc) {
            document.getElementById('acc-id').value = id;
            document.getElementById('acc-name').value = acc.name;
            document.getElementById('acc-balance').value = acc.openingBalance;
            // Select Color
            const radio = document.querySelector(`input[name="acc-color"][value="${acc.color || '1'}"]`);
            if(radio) radio.checked = true;

            document.getElementById('modal-title').innerText = 'Edit Account';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.deleteAccount = async (id) => {
        if(window.triggerHaptic) window.triggerHaptic(50);
        if (confirm('Delete this account? Associated transaction history might remain but show unknown account.')) {
            try {
                await accountsRef.doc(id).delete();
                loadData();
            } catch (error) {
                alert("Error deleting.");
            }
        }
    };
}