document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeCategories(user.uid);
        }
    });
});

function initializeCategories(userId) {
    const categoriesRef = db.collection('users').doc(userId).collection('categories');
    
    const grid = document.getElementById('category-grid');
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    const addBtn = document.getElementById('add-category-btn');
    const closeBtn = document.getElementById('close-modal');
    const iconGrid = document.getElementById('icon-grid');
    
    // Tabs
    const tabExpense = document.getElementById('tab-expense');
    const tabIncome = document.getElementById('tab-income');
    
    let currentType = 'expense'; // 'expense' or 'income'
    let allCategories = [];

    // Predefined Icons
    const icons = [
        'fa-utensils', 'fa-shopping-bag', 'fa-car', 'fa-home', 'fa-film', 
        'fa-medkit', 'fa-graduation-cap', 'fa-plane', 'fa-gamepad', 'fa-gift',
        'fa-dumbbell', 'fa-paw', 'fa-child', 'fa-mobile-alt', 'fa-wifi',
        'fa-lightbulb', 'fa-water', 'fa-tshirt', 'fa-book', 'fa-briefcase',
        'fa-wallet', 'fa-money-bill-wave', 'fa-piggy-bank', 'fa-chart-line'
    ];

    // --- 1. RENDER ICONS IN MODAL ---
    icons.forEach(icon => {
        const div = document.createElement('div');
        div.className = 'w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-gray-200 dark:border-gray-600 icon-option';
        div.innerHTML = `<i class="fas ${icon} text-gray-600 dark:text-gray-300"></i>`;
        div.onclick = () => selectIcon(icon, div);
        iconGrid.appendChild(div);
    });

    function selectIcon(icon, el) {
        document.getElementById('cat-icon').value = icon;
        document.querySelectorAll('.icon-option').forEach(e => {
            e.classList.remove('bg-indigo-600', 'border-indigo-600');
            e.querySelector('i').classList.remove('text-white');
            e.querySelector('i').classList.add('text-gray-600', 'dark:text-gray-300');
        });
        el.classList.add('bg-indigo-600', 'border-indigo-600');
        el.classList.remove('bg-white', 'dark:bg-gray-700');
        el.querySelector('i').classList.remove('text-gray-600', 'dark:text-gray-300');
        el.querySelector('i').classList.add('text-white');
    }

    // --- 2. FETCH & RENDER CATEGORIES ---
    categoriesRef.onSnapshot(snapshot => {
        allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGrid();
    });

    function renderGrid() {
        grid.innerHTML = '';
        const filtered = allCategories.filter(c => c.type === currentType);

        // Add "Add New" Card as first item (Optional, but user prefers FAB)
        // We will just stick to rendering cards

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 text-sm">No ${currentType} categories yet.</div>`;
            return;
        }

        filtered.forEach(cat => {
            // Color Mapping
            const colors = {
                'blue': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                'green': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                'red': 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
                'yellow': 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
                'purple': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                'pink': 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
            };
            const colorClass = colors[cat.color] || colors['blue'];

            const html = `
                <div class="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-3 relative group hover-lift cursor-default h-32">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm ${colorClass}">
                        <i class="fas ${cat.icon || 'fa-tag'}"></i>
                    </div>
                    <span class="font-bold text-gray-700 dark:text-gray-200 text-sm text-center truncate w-full px-2">${cat.name}</span>
                    
                    <div class="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                        <button onclick="editCategory('${cat.id}')" class="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40"><i class="fas fa-pen text-xs"></i></button>
                        <button onclick="deleteCategory('${cat.id}')" class="w-8 h-8 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500"><i class="fas fa-trash text-xs"></i></button>
                    </div>
                </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });
    }

    // --- 3. TAB SWITCHING ---
    function switchTab(type) {
        currentType = type;
        
        // Update UI
        if(type === 'expense') {
            tabExpense.className = 'px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md bg-indigo-600 text-white';
            tabIncome.className = 'px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all';
        } else {
            tabIncome.className = 'px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md bg-indigo-600 text-white';
            tabExpense.className = 'px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all';
        }
        
        renderGrid();
        if(window.triggerHaptic) window.triggerHaptic(10);
    }

    tabExpense.addEventListener('click', () => switchTab('expense'));
    tabIncome.addEventListener('click', () => switchTab('income'));

    // --- 4. FORM HANDLING ---
    addBtn.addEventListener('click', () => {
        form.reset();
        document.getElementById('cat-id').value = '';
        document.getElementById('modal-title').innerText = 'Add Category';
        // Reset icons
        document.querySelectorAll('.icon-option').forEach(e => {
            e.classList.remove('bg-indigo-600', 'border-indigo-600');
            e.querySelector('i').classList.remove('text-white');
            e.querySelector('i').classList.add('text-gray-600', 'dark:text-gray-300');
        });
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cat-id').value;
        const name = document.getElementById('cat-name').value;
        const icon = document.getElementById('cat-icon').value || 'fa-tag';
        const color = document.querySelector('input[name="cat-color"]:checked')?.value || 'blue';

        const btn = form.querySelector('button');
        const oldText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        try {
            const data = { name, icon, color, type: currentType }; // Use current active tab

            if (id) {
                await categoriesRef.doc(id).update(data);
            } else {
                await categoriesRef.add(data);
            }

            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
            if(window.triggerHaptic) window.triggerHaptic(50);

        } catch (error) {
            console.error("Error:", error);
            alert("Failed to save.");
        } finally {
            btn.innerText = oldText;
            btn.disabled = false;
        }
    });

    // --- 5. GLOBAL ACTIONS ---
    window.editCategory = (id) => {
        const cat = allCategories.find(c => c.id === id);
        if (cat) {
            document.getElementById('cat-id').value = id;
            document.getElementById('cat-name').value = cat.name;
            document.getElementById('cat-icon').value = cat.icon;
            
            // Highlight Icon
            // (Simplified logic: finding icon div by matching class might be tricky without ID, 
            // but user can just re-select)
            
            // Select Color
            const radio = document.querySelector(`input[name="cat-color"][value="${cat.color}"]`);
            if(radio) radio.checked = true;

            document.getElementById('modal-title').innerText = 'Edit Category';
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.deleteCategory = async (id) => {
        if(window.triggerHaptic) window.triggerHaptic(50);
        if (confirm('Delete this category?')) {
            await categoriesRef.doc(id).delete();
        }
    };
}