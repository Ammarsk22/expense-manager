document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeDebtManager(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });
});

function initializeDebtManager(userId) {
    const debtsRef = db.collection('users').doc(userId).collection('debts');
    
    const debtList = document.getElementById('debt-list');
    const debtModal = document.getElementById('debt-modal');
    const debtForm = document.getElementById('debt-form');
    
    const addBtn = document.getElementById('add-debt-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    
    const totalPayEl = document.getElementById('total-pay');
    const totalReceiveEl = document.getElementById('total-receive');

    // --- 1. REAL-TIME LISTENER ---
    debtsRef.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        if (!debtList) return;
        
        debtList.innerHTML = '';
        let payTotal = 0;
        let receiveTotal = 0;

        if (snapshot.empty) {
            debtList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                        <i class="fas fa-check-circle text-2xl text-emerald-500"></i>
                    </div>
                    <p class="text-sm">All settled up!</p>
                </div>`;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            if (data.type === 'pay') payTotal += data.amount;
            else receiveTotal += data.amount;

            renderDebtItem(id, data, debtList, debtsRef);
        });

        if(totalPayEl) totalPayEl.innerText = `₹${payTotal.toLocaleString()}`;
        if(totalReceiveEl) totalReceiveEl.innerText = `₹${receiveTotal.toLocaleString()}`;
    }, error => console.error(error));

    // --- 2. RENDER ITEM ---
    function renderDebtItem(id, data, container, ref) {
        const isPay = data.type === 'pay';
        const colorClass = isPay ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
        const bgClass = isPay ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800';
        const icon = isPay ? 'fa-arrow-up' : 'fa-arrow-down';
        
        // Initials for Avatar
        const initials = data.person ? data.person.charAt(0).toUpperCase() : '?';
        // Random Avatar Color
        const colors = ['bg-orange-100 text-orange-600', 'bg-blue-100 text-blue-600', 'bg-purple-100 text-purple-600', 'bg-pink-100 text-pink-600'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const html = `
            <div class="flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                <div class="w-12 h-12 rounded-full ${randomColor} flex items-center justify-center font-bold text-lg mr-4 shrink-0 shadow-inner">
                    ${initials}
                </div>

                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-gray-900 dark:text-white truncate">${data.person}</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <i class="far fa-calendar-alt"></i> ${data.dueDate}
                        <span class="mx-1">•</span>
                        ${data.description || 'No note'}
                    </p>
                </div>

                <div class="text-right">
                    <p class="font-bold text-lg ${colorClass}">₹${data.amount.toLocaleString()}</p>
                    <div class="mt-1 flex justify-end items-center gap-2 text-xs">
                        <span class="px-2 py-0.5 rounded-full ${bgClass} ${colorClass} font-semibold flex items-center">
                            <i class="fas ${icon} mr-1 text-[10px]"></i> ${isPay ? 'Owe' : 'Get'}
                        </span>
                        <button class="settle-btn w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center text-gray-400" data-id="${id}" data-name="${data.person}">
                            <i class="fas fa-check"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);

        // Attach Listener
        const btn = container.querySelector(`.settle-btn[data-id="${id}"]`);
        if(btn) {
            btn.addEventListener('click', () => {
                if(window.triggerHaptic) window.triggerHaptic(50);
                if(confirm(`Mark debt with ${data.person} as settled?`)) {
                    ref.doc(id).delete();
                }
            });
        }
    }

    // --- 3. ADD DEBT ---
    if (debtForm) {
        debtForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const type = document.getElementById('debt-type').value;
            const person = document.getElementById('person-name').value;
            const amount = parseFloat(document.getElementById('amount').value);
            const date = document.getElementById('due-date').value;
            const desc = document.getElementById('description').value;

            if (!person || isNaN(amount)) return;

            const btn = debtForm.querySelector('button[type="submit"]');
            const oldText = btn.innerText;
            btn.innerText = "Saving...";
            btn.disabled = true;

            debtsRef.add({
                type, person, amount, dueDate: date, description: desc,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            }).then(() => {
                toggleModal(false);
                debtForm.reset();
                document.getElementById('due-date').valueAsDate = new Date();
                if(window.triggerHaptic) window.triggerHaptic(50);
            }).catch(err => alert("Error adding debt")).finally(() => {
                btn.innerText = oldText;
                btn.disabled = false;
            });
        });
    }

    // --- 4. MODAL LOGIC ---
    function toggleModal(show) {
        if (!debtModal) return;
        if (show) {
            debtModal.classList.remove('hidden');
            debtModal.classList.add('flex');
        } else {
            debtModal.classList.add('hidden');
            debtModal.classList.remove('flex');
        }
    }

    if (addBtn) addBtn.addEventListener('click', () => toggleModal(true));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleModal(false));
}