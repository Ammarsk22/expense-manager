// --- TRANSACTION TEMPLATES ---
// Save frequent transactions for 1-click entry

const TemplateManager = {
    
    // 1. INITIALIZE (Load templates into horizontal scroll list)
    init: function(userId) {
        const list = document.getElementById('template-list');
        if (!list) return;

        // Fetch templates
        db.collection('users').doc(userId).collection('templates').orderBy('frequency', 'desc').limit(10)
            .onSnapshot(snapshot => {
                list.innerHTML = '';
                
                if (snapshot.empty) {
                    list.innerHTML = `
                        <button onclick="TemplateManager.createDefault()" class="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-xs font-medium text-gray-400 hover:text-indigo-500 hover:border-indigo-500 transition-all shrink-0">
                            <i class="fas fa-plus"></i> Save frequent txns here
                        </button>
                    `;
                    return;
                }

                snapshot.forEach(doc => {
                    const t = doc.data();
                    const el = document.createElement('button');
                    el.className = 'flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 transition-all shrink-0 active:scale-95';
                    
                    // Icon logic
                    let icon = 'fas fa-bookmark';
                    if (t.category === 'Food') icon = 'fas fa-utensils';
                    if (t.category === 'Travel') icon = 'fas fa-car';
                    if (t.category === 'Shopping') icon = 'fas fa-shopping-bag';
                    if (t.category === 'Bills') icon = 'fas fa-file-invoice';

                    el.innerHTML = `<i class="${icon} text-indigo-500"></i> ${t.name}`;
                    
                    el.addEventListener('click', () => {
                        this.applyTemplate(t);
                    });
                    
                    list.appendChild(el);
                });
            });
    },

    // 2. APPLY TEMPLATE TO FORM
    applyTemplate: function(t) {
        if(window.triggerHaptic) window.triggerHaptic(20);

        document.getElementById('amount').value = t.amount || '';
        document.getElementById('description').value = t.name;
        document.getElementById('type').value = t.type;
        
        // Handle Category Select
        const catSelect = document.getElementById('category');
        for (let i = 0; i < catSelect.options.length; i++) {
            if (catSelect.options[i].value === t.category || catSelect.options[i].text === t.category) {
                catSelect.selectedIndex = i;
                break;
            }
        }

        // Show toast
        if(typeof showToast === 'function') showToast("Template applied!", "info");
    },

    // 3. SAVE NEW TEMPLATE (Called when submitting form if checkbox checked)
    save: async function(userId, data) {
        try {
            // Check if exists
            const existing = await db.collection('users').doc(userId).collection('templates')
                .where('name', '==', data.description)
                .limit(1).get();

            if (!existing.empty) {
                // Update frequency
                const docId = existing.docs[0].id;
                await db.collection('users').doc(userId).collection('templates').doc(docId).update({
                    frequency: firebase.firestore.FieldValue.increment(1),
                    amount: data.amount // Update amount to latest
                });
            } else {
                // Create New
                await db.collection('users').doc(userId).collection('templates').add({
                    name: data.description,
                    amount: data.amount,
                    category: data.category,
                    type: data.type,
                    frequency: 1,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) {
            console.error("Error saving template", e);
        }
    },

    // 4. HELPER: CREATE DEFAULT TEMPLATE
    createDefault: function() {
        if(typeof showToast === 'function') showToast("Tip: Check 'Save as Template' when adding a transaction.", "info");
    }
};

// Auto-init on load if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            TemplateManager.init(user.uid);
        }
    });
});

// Expose
window.TemplateManager = TemplateManager;