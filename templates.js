document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeTemplates(user.uid);
        }
    });
});

function initializeTemplates(userId) {
    const templateList = document.getElementById('template-list');
    const templatesRef = db.collection('users').doc(userId).collection('templates');

    // --- REAL-TIME LISTENER ---
    templatesRef.orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        templateList.innerHTML = '';

        if (snapshot.empty) {
            templateList.innerHTML = '<p class="text-xs text-gray-400 dark:text-gray-500 italic whitespace-nowrap">No templates yet. Check "Save as Template" when adding a transaction.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const t = doc.data();
            const isIncome = t.type === 'income';
            
            // Icon and Colors based on type
            const iconClass = isIncome ? 'fa-arrow-up text-green-500' : 'fa-arrow-down text-red-500';
            const borderClass = isIncome ? 'hover:border-green-400' : 'hover:border-red-400';
            
            // Create Template Chip
            const btn = document.createElement('div');
            btn.className = `group flex items-center shrink-0 cursor-pointer bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1.5 text-sm shadow-sm ${borderClass} transition-all select-none`;
            
            btn.innerHTML = `
                <i class="fas ${iconClass} mr-2 text-xs"></i>
                <span class="text-gray-700 dark:text-gray-200 font-medium mr-2 whitespace-nowrap">${t.description}</span>
                <span class="text-xs text-gray-400 group-hover:text-red-500 delete-template-btn ml-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" data-id="${doc.id}" title="Delete Template">
                    <i class="fas fa-times"></i>
                </span>
            `;

            // 1. Click on the chip body -> Fills the form
            btn.addEventListener('click', (e) => {
                // Don't trigger fill if the delete button was clicked
                if (e.target.closest('.delete-template-btn')) return; 
                fillTransactionForm(t);
            });

            // 2. Click on 'x' -> Deletes the template
            const deleteBtn = btn.querySelector('.delete-template-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop bubble up
                if(confirm('Delete this template?')) {
                    templatesRef.doc(doc.id).delete().catch(err => {
                        console.error("Error removing template: ", err);
                    });
                }
            });

            templateList.appendChild(btn);
        });
    });
}

function fillTransactionForm(data) {
    // Fill basic text/number fields
    const descInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const typeSelect = document.getElementById('type');
    
    if(descInput) descInput.value = data.description;
    if(amountInput) amountInput.value = data.amount;
    if(typeSelect) typeSelect.value = data.type;
    
    // Handle Select Dropdowns (Account & Category)
    // We need to match values even if they aren't exactly the same string/value pair
    setSelectValue('account', data.account);
    setSelectValue('category', data.category);

    // Visual Feedback (Flash Effect)
    const form = document.getElementById('transaction-form');
    if(form) {
        // Add a flash class
        form.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'dark:bg-gray-700');
        
        // Remove it after animation
        setTimeout(() => {
            form.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50', 'dark:bg-gray-700');
        }, 600);
    }
}

// Helper to set select box values robustly
function setSelectValue(id, value) {
    const select = document.getElementById(id);
    if (!select) return;

    // Try setting directly
    select.value = value;

    // If that didn't work (e.g. value mismatch), try matching text content
    if (select.selectedIndex === -1) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].text.includes(value)) {
                select.selectedIndex = i;
                break;
            }
        }
    }
}