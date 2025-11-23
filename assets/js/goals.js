document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeGoals(user.uid);
        }
    });
});

function initializeGoals(userId) {
    const goalsList = document.getElementById('goals-list');
    const goalsRef = db.collection('users').doc(userId).collection('goals');
    
    // UI Elements
    const goalModal = document.getElementById('goal-modal');
    const addMoneyModal = document.getElementById('add-money-modal');
    const goalForm = document.getElementById('goal-form');
    const addMoneyForm = document.getElementById('add-money-form');

    // --- REAL-TIME LISTENER ---
    goalsRef.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        goalsList.innerHTML = '';
        
        if (snapshot.empty) {
            goalsList.innerHTML = `
                <div class="col-span-full text-center py-10">
                    <div class="bg-gray-100 dark:bg-gray-800 rounded-full h-20 w-20 flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-bullseye text-3xl text-gray-400"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400">No savings goals yet. Create one to start saving!</p>
                </div>`;
            return;
        }

        snapshot.forEach(doc => {
            const goal = doc.data();
            const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
            
            // Color mapping for Tailwind classes
            const colors = {
                blue: 'bg-blue-500',
                green: 'bg-green-500',
                purple: 'bg-purple-500',
                pink: 'bg-pink-500',
                yellow: 'bg-yellow-500'
            };
            const barColor = colors[goal.color] || 'bg-indigo-500';

            const html = `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative group transition-colors duration-200">
                    <button class="delete-btn absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-id="${doc.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                    
                    <div class="flex justify-between items-end mb-2">
                        <h3 class="font-bold text-lg text-gray-800 dark:text-white">${goal.name}</h3>
                        <span class="text-sm font-semibold text-gray-600 dark:text-gray-300">${percent}%</span>
                    </div>
                    
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                        <div class="${barColor} h-3 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                    </div>
                    
                    <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-6">
                        <span>Saved: ₹${goal.saved.toLocaleString()}</span>
                        <span>Target: ₹${goal.target.toLocaleString()}</span>
                    </div>
                    
                    <button class="add-money-btn w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-colors flex items-center justify-center font-medium" 
                        data-id="${doc.id}" data-name="${goal.name}" data-saved="${goal.saved}">
                        <i class="fas fa-plus-circle mr-2"></i> Add Money
                    </button>
                </div>
            `;
            goalsList.innerHTML += html;
        });
        
        // Attach events to new buttons
        attachDynamicEvents();
    });

    // --- ADD NEW GOAL ---
    goalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
        const color = document.getElementById('goal-color').value;

        goalsRef.add({
            name, target, saved, color,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            goalModal.classList.add('hidden');
            goalForm.reset();
        });
    });

    // --- ADD MONEY TO GOAL ---
    addMoneyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('add-money-goal-id').value;
        const amountToAdd = parseFloat(document.getElementById('add-amount').value);
        
        if(!amountToAdd || amountToAdd <= 0) return;

        // Use Firestore transaction to safely update the saved amount
        const docRef = goalsRef.doc(id);
        
        db.runTransaction(async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists) throw "Document does not exist!";
            
            const newSaved = (sfDoc.data().saved || 0) + amountToAdd;
            transaction.update(docRef, { saved: newSaved });
        }).then(() => {
            addMoneyModal.classList.add('hidden');
            addMoneyForm.reset();
        }).catch(err => console.error("Transaction failed: ", err));
    });

    // --- HELPERS & EVENTS ---
    function attachDynamicEvents() {
        // Open "Add Money" Modal
        document.querySelectorAll('.add-money-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('add-money-goal-id').value = btn.dataset.id;
                document.getElementById('add-money-goal-name').textContent = btn.dataset.name;
                addMoneyModal.classList.remove('hidden');
                document.getElementById('add-amount').focus();
            });
        });

        // Delete Goal
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if(confirm('Delete this goal?')) {
                    goalsRef.doc(btn.dataset.id).delete();
                }
            });
        });
    }

    // Modal Toggles
    document.getElementById('add-goal-btn').addEventListener('click', () => {
        goalModal.classList.remove('hidden');
    });
    
    document.querySelectorAll('#close-modal-btn, #close-add-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            goalModal.classList.add('hidden');
            addMoneyModal.classList.add('hidden');
        });
    });

    // Color Selection Logic
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            // Remove border from all
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('border-gray-500'));
            // Add border to selected
            opt.classList.add('border-gray-500');
            // Set value
            document.getElementById('goal-color').value = opt.dataset.color;
        });
    });
}