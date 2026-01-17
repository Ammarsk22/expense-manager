document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeGoals(user.uid);
        }
    });
});

function initializeGoals(userId) {
    const goalsRef = db.collection('users').doc(userId).collection('goals');
    
    const grid = document.getElementById('goals-grid');
    const modal = document.getElementById('goal-modal');
    const form = document.getElementById('goal-form');
    const addBtn = document.getElementById('add-goal-btn');
    const closeBtn = document.getElementById('close-modal');
    const totalEl = document.getElementById('total-saved');

    // --- 1. FETCH & RENDER (OLD DATA COMPATIBLE) ---
    // Removed .orderBy() to prevent issues with missing fields in old data
    goalsRef.onSnapshot(snapshot => {
        if (!grid) return;
        
        grid.innerHTML = '';
        let totalSaved = 0;

        if (snapshot.empty) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-flag text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">Set your first financial goal!</p>
                </div>`;
            totalEl.innerText = '₹0';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            // --- FIX: SUPPORT OLD DATA FIELDS ---
            const targetAmt = data.targetAmount || data.target || 0;
            const currentAmt = data.currentAmount || data.saved || data.amount || 0;
            const goalName = data.name || "Unnamed Goal";
            // Default to today if date is missing
            const goalDate = data.deadline || data.date || new Date().toISOString().split('T')[0]; 
            const goalColor = data.color || 'blue';

            totalSaved += currentAmt;
            
            // Calculations
            const percent = targetAmt > 0 ? Math.min((currentAmt / targetAmt) * 100, 100).toFixed(1) : 0;
            const today = new Date();
            const targetDate = new Date(goalDate);
            const diffTime = targetDate - today;
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let statusText = `${daysLeft} days left`;
            let statusColor = "text-gray-500";
            if (daysLeft < 0) { statusText = "Overdue"; statusColor = "text-red-500"; }
            if (percent >= 100) { statusText = "Completed!"; statusColor = "text-green-500"; }

            // Color Map
            const colorMap = {
                'blue': 'text-blue-600 bg-blue-500',
                'purple': 'text-purple-600 bg-purple-500',
                'pink': 'text-pink-600 bg-pink-500',
                'emerald': 'text-emerald-600 bg-emerald-500',
                'amber': 'text-amber-600 bg-amber-500'
            };
            const theme = colorMap[goalColor] || colorMap['blue'];
            const textColor = theme.split(' ')[0];
            const bgColor = theme.split(' ')[1];

            const html = `
                <div class="glass-card p-6 rounded-3xl relative overflow-hidden group hover-lift transition-all">
                    <div class="flex justify-between items-start mb-4">
                        <div class="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm">
                            <i class="fas fa-bullseye text-xl ${textColor}"></i>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="addFunds('${id}', ${currentAmt})" class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-200 transition-colors"><i class="fas fa-plus text-xs"></i></button>
                            <button onclick="editGoal('${id}')" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"><i class="fas fa-pen text-xs"></i></button>
                            <button onclick="deleteGoal('${id}')" class="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"><i class="fas fa-trash text-xs"></i></button>
                        </div>
                    </div>

                    <h3 class="font-bold text-lg text-gray-900 dark:text-white mb-1">${goalName}</h3>
                    <div class="flex justify-between items-end mb-3">
                        <span class="text-2xl font-bold text-gray-900 dark:text-white">₹${currentAmt.toLocaleString()}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 mb-1">of ₹${targetAmt.toLocaleString()}</span>
                    </div>

                    <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
                        <div class="h-2.5 rounded-full ${bgColor} progress-bar-fill shadow-[0_0_10px_currentColor]" style="width: ${percent}%"></div>
                    </div>

                    <div class="flex justify-between items-center text-xs font-medium">
                        <span class="${statusColor}">${statusText}</span>
                        <span class="${textColor}">${percent}%</span>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });

        totalEl.innerText = `₹${totalSaved.toLocaleString()}`;
    });

    // --- 2. ADD/EDIT LOGIC ---
    let allGoals = [];
    goalsRef.onSnapshot(snap => { 
        // Also handling old fields here for edit modal pre-filling
        allGoals = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id, 
                ...data,
                targetAmount: data.targetAmount || data.target,
                currentAmount: data.currentAmount || data.saved || data.amount,
                deadline: data.deadline || data.date
            };
        }); 
    });

    addBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('goal-id').value = '';
        document.getElementById('modal-title').innerText = 'New Goal';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('goal-id').value;
        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const current = parseFloat(document.getElementById('goal-saved').value) || 0;
        const date = document.getElementById('goal-date').value;
        const color = document.querySelector('input[name="goal-color"]:checked')?.value || 'blue';

        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        try {
            const data = {
                name, targetAmount: target, currentAmount: current, deadline: date, color
            };

            if (id) {
                await goalsRef.doc(id).update(data);
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await goalsRef.add(data);
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
    window.addFunds = async (id, current) => {
        const amount = prompt("Enter amount to add to this goal:");
        if (amount && !isNaN(amount)) {
            const val = parseFloat(amount);
            if (val > 0) {
                try {
                    await goalsRef.doc(id).update({
                        currentAmount: current + val
                    });
                    if(window.triggerHaptic) window.triggerHaptic(50);
                } catch (e) {
                    alert("Error updating.");
                }
            }
        }
    };

    window.editGoal = (id) => {
        const goal = allGoals.find(g => g.id === id);
        if (goal) {
            document.getElementById('goal-id').value = id;
            document.getElementById('goal-name').value = goal.name;
            document.getElementById('goal-target').value = goal.targetAmount;
            document.getElementById('goal-saved').value = goal.currentAmount;
            document.getElementById('goal-date').value = goal.deadline;
            
            const radio = document.querySelector(`input[name="goal-color"][value="${goal.color}"]`);
            if(radio) radio.checked = true;

            document.getElementById('modal-title').innerText = 'Edit Goal';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.deleteGoal = async (id) => {
        if(window.triggerHaptic) window.triggerHaptic(50);
        if (confirm('Delete this goal?')) {
            await goalsRef.doc(id).delete();
        }
    };
}