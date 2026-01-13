/**
 * FinTrack Goals Manager
 * Handles creating, updating, and deleting savings goals.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const goalsList = document.getElementById('goals-list');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const modal = document.getElementById('goal-modal');
    const form = document.getElementById('goal-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Add Money Modal Elements
    const addMoneyModal = document.getElementById('add-money-modal');
    const addMoneyForm = document.getElementById('add-money-form');
    const closeAddModal = document.getElementById('close-add-modal');
    const addMoneyGoalName = document.getElementById('add-money-goal-name');
    const addMoneyGoalId = document.getElementById('add-money-goal-id');

    // Color Selection
    const colorOptions = document.querySelectorAll('.color-option');
    const colorInput = document.getElementById('goal-color');

    // 1. Initialize & Listen for Auth
    // Use window.auth as defined in updated firebase.js
    const auth = window.auth || firebase.auth();
    const db = window.db || firebase.firestore();

    auth.onAuthStateChanged(user => {
        if (user) {
            loadGoals(user.uid);
        } else {
            goalsList.innerHTML = '<p class="text-center text-gray-500 col-span-3">Please login to view goals.</p>';
        }
    });

    // 2. Load Goals (Real-time)
    function loadGoals(uid) {
        db.collection('users').doc(uid).collection('goals')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    goalsList.innerHTML = `
                        <div class="col-span-full text-center py-10">
                            <i class="fas fa-bullseye text-4xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500 dark:text-gray-400">No goals found. Create one to start saving!</p>
                        </div>`;
                    return;
                }

                goalsList.innerHTML = '';
                snapshot.forEach(doc => {
                    const goal = doc.data();
                    renderGoalCard(doc.id, goal);
                });
            }, error => {
                console.error("Error loading goals:", error);
                goalsList.innerHTML = '<p class="text-red-500">Error loading goals.</p>';
            });
    }

    // 3. Render Single Goal Card
    function renderGoalCard(id, goal) {
        const percentage = Math.min(100, Math.round((goal.saved / goal.target) * 100));
        
        // Colors map
        const colors = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            pink: 'bg-pink-500',
            yellow: 'bg-yellow-500'
        };
        const colorClass = colors[goal.color] || 'bg-indigo-500';

        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-colors duration-200 relative group';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-bold text-gray-800 dark:text-white">${goal.name}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Target: ₹${goal.target.toLocaleString()}</p>
                </div>
                <div class="w-10 h-10 rounded-full ${colorClass} bg-opacity-20 flex items-center justify-center text-${goal.color}-600">
                    <i class="fas fa-bullseye text-${goal.color}-500"></i>
                </div>
            </div>

            <div class="mb-2 flex justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">₹${goal.saved.toLocaleString()}</span>
                <span class="text-gray-500">${percentage}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
                <div class="${colorClass} h-2.5 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
            </div>

            <div class="flex gap-2">
                <button class="add-money-btn flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium" 
                    data-id="${id}" data-name="${goal.name}">
                    <i class="fas fa-plus mr-1"></i> Add Money
                </button>
                <button class="delete-goal-btn p-2 text-red-400 hover:text-red-600 transition-colors" data-id="${id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        goalsList.appendChild(card);
    }

    // 4. Handle "Create Goal" Form
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const saved = parseFloat(document.getElementById('goal-saved').value) || 0;
        const color = colorInput.value;

        try {
            await db.collection('users').doc(user.uid).collection('goals').add({
                name,
                target,
                saved,
                color,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            toggleModal(false);
            form.reset();
        } catch (error) {
            console.error("Error creating goal:", error);
            alert("Failed to create goal.");
        }
    });

    // 5. Handle "Add Money" Form
    addMoneyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const id = addMoneyGoalId.value;
        const amount = parseFloat(document.getElementById('add-amount').value);

        if (id && amount > 0) {
            try {
                // Get current goal to update
                const goalRef = db.collection('users').doc(user.uid).collection('goals').doc(id);
                
                await db.runTransaction(async (transaction) => {
                    const goalDoc = await transaction.get(goalRef);
                    if (!goalDoc.exists) throw "Goal does not exist!";
                    
                    const newSaved = (goalDoc.data().saved || 0) + amount;
                    transaction.update(goalRef, { saved: newSaved });
                });

                toggleAddMoneyModal(false);
                addMoneyForm.reset();
            } catch (error) {
                console.error("Error adding money:", error);
                alert("Failed to update goal.");
            }
        }
    });

    // 6. Event Delegation for Buttons (Add Money / Delete)
    goalsList.addEventListener('click', (e) => {
        // Add Money Button
        const addBtn = e.target.closest('.add-money-btn');
        if (addBtn) {
            const id = addBtn.dataset.id;
            const name = addBtn.dataset.name;
            addMoneyGoalId.value = id;
            addMoneyGoalName.textContent = name;
            toggleAddMoneyModal(true);
        }

        // Delete Button
        const delBtn = e.target.closest('.delete-goal-btn');
        if (delBtn) {
            if (confirm('Are you sure you want to delete this goal?')) {
                const id = delBtn.dataset.id;
                const user = auth.currentUser;
                if (user) {
                    db.collection('users').doc(user.uid).collection('goals').doc(id).delete();
                }
            }
        }
    });

    // 7. UI Helpers (Modals & Color Picker)
    function toggleModal(show) {
        if (show) modal.classList.remove('hidden');
        else modal.classList.add('hidden');
    }

    function toggleAddMoneyModal(show) {
        if (show) addMoneyModal.classList.remove('hidden');
        else addMoneyModal.classList.add('hidden');
    }

    addGoalBtn.addEventListener('click', () => toggleModal(true));
    closeModalBtn.addEventListener('click', () => toggleModal(false));
    closeAddModal.addEventListener('click', () => toggleAddMoneyModal(false));

    // Color Picker Logic
    colorOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // Remove border from all
            colorOptions.forEach(o => o.classList.remove('border-gray-500', 'scale-110'));
            // Add border to selected
            opt.classList.add('border-gray-500', 'scale-110');
            // Set value
            colorInput.value = opt.dataset.color;
        });
    });
});