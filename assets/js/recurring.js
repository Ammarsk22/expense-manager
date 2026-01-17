document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeRecurring(user.uid);
        }
    });
});

function initializeRecurring(userId) {
    const recurringRef = db.collection('users').doc(userId).collection('recurring');
    
    const list = document.getElementById('recurring-list');
    const modal = document.getElementById('recurring-modal');
    const form = document.getElementById('recurring-form');
    const addBtn = document.getElementById('add-recurring-btn');
    const closeBtn = document.getElementById('close-modal');
    const totalEl = document.getElementById('total-monthly');

    let allSubs = []; // Cache for edit

    // --- 1. FETCH & RENDER ---
    recurringRef.orderBy('nextDue', 'asc').onSnapshot(snapshot => {
        if (!list) return;
        
        list.innerHTML = '';
        let totalMonthly = 0;
        
        allSubs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (allSubs.length === 0) {
            list.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-sync-alt text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">No active subscriptions.</p>
                </div>`;
            totalEl.innerText = '₹0';
            return;
        }

        allSubs.forEach(sub => {
            // Calculate Monthly Equivalent for Total
            if (sub.active !== false) { // Default active true if undefined
                let monthlyAmount = sub.amount;
                if (sub.frequency === 'yearly') monthlyAmount = sub.amount / 12;
                if (sub.frequency === 'weekly') monthlyAmount = sub.amount * 4;
                totalMonthly += monthlyAmount;
            }

            // Days Left
            const today = new Date();
            const due = new Date(sub.nextDue);
            const diffTime = due - today;
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let statusText = `Due in ${daysLeft} days`;
            let statusClass = "text-gray-500";
            if (daysLeft < 0) { statusText = "Overdue"; statusClass = "text-red-500 font-bold"; }
            else if (daysLeft <= 3) { statusText = `Due soon (${daysLeft} days)`; statusClass = "text-orange-500 font-bold"; }

            // Icon & Colors
            const initial = sub.name.charAt(0).toUpperCase();
            const colorMap = {
                'red': 'bg-rose-100 text-rose-600',
                'green': 'bg-emerald-100 text-emerald-600',
                'blue': 'bg-blue-100 text-blue-600',
                'black': 'bg-gray-200 text-gray-800'
            };
            const iconClass = colorMap[sub.color] || colorMap['blue'];
            const isActive = sub.active !== false;

            const html = `
                <div class="glass-card p-5 rounded-3xl relative overflow-hidden group hover-lift transition-all ${!isActive ? 'opacity-60 grayscale' : ''}">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl ${iconClass} flex items-center justify-center text-xl font-bold shadow-sm">
                                ${initial}
                            </div>
                            <div>
                                <h3 class="font-bold text-lg text-gray-900 dark:text-white">${sub.name}</h3>
                                <p class="text-xs text-gray-500 capitalize">${sub.frequency}</p>
                            </div>
                        </div>
                        
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer" ${isActive ? 'checked' : ''} onchange="toggleActive('${sub.id}', this.checked)">
                            <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div class="flex justify-between items-end border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                        <div>
                            <p class="text-xs text-gray-400 uppercase font-bold mb-1">Next Payment</p>
                            <p class="text-sm font-medium ${statusClass}">${statusText}</p>
                            <p class="text-xs text-gray-400">${new Date(sub.nextDue).toLocaleDateString()}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">₹${sub.amount}</p>
                            <div class="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="editRec('${sub.id}')" class="text-gray-400 hover:text-indigo-500"><i class="fas fa-pen"></i></button>
                                <button onclick="deleteRec('${sub.id}')" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });

        totalEl.innerText = `₹${Math.round(totalMonthly).toLocaleString()}`;
    });

    // --- 2. ADD/EDIT LOGIC ---
    addBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('rec-id').value = '';
        document.getElementById('modal-title').innerText = 'New Subscription';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rec-id').value;
        const name = document.getElementById('rec-name').value;
        const amount = parseFloat(document.getElementById('rec-amount').value);
        const date = document.getElementById('rec-date').value;
        const freq = document.getElementById('rec-frequency').value;
        const color = document.querySelector('input[name="rec-color"]:checked')?.value || 'blue';

        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        try {
            const data = {
                name, amount, nextDue: date, frequency: freq, color, active: true
            };

            if (id) {
                await recurringRef.doc(id).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await recurringRef.add(data);
            }

            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
            if(window.triggerHaptic) window.triggerHaptic(50);

        } catch (error) {
            console.error(error);
            alert("Failed to save.");
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });

    // --- 3. GLOBAL ACTIONS ---
    window.toggleActive = async (id, isActive) => {
        if(window.triggerHaptic) window.triggerHaptic(10);
        try {
            await recurringRef.doc(id).update({ active: isActive });
        } catch(e) { console.error(e); }
    };

    window.editRec = (id) => {
        const sub = allSubs.find(s => s.id === id);
        if (sub) {
            document.getElementById('rec-id').value = id;
            document.getElementById('rec-name').value = sub.name;
            document.getElementById('rec-amount').value = sub.amount;
            document.getElementById('rec-date').value = sub.nextDue;
            document.getElementById('rec-frequency').value = sub.frequency;
            
            const radio = document.querySelector(`input[name="rec-color"][value="${sub.color}"]`);
            if(radio) radio.checked = true;

            document.getElementById('modal-title').innerText = 'Edit Subscription';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.deleteRec = async (id) => {
        if(window.triggerHaptic) window.triggerHaptic(50);
        if (confirm('Delete this subscription?')) {
            await recurringRef.doc(id).delete();
        }
    };
}