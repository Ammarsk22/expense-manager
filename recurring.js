document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Check process on every page load (Automation)
            checkAndProcessRecurring(user.uid);

            // UI Init only if on recurring page
            if (window.location.pathname.endsWith('recurring.html')) {
                initializeRecurringUI(user.uid);
            }
        }
    });
});

// --- UI FUNCTIONS ---
function initializeRecurringUI(userId) {
    const form = document.getElementById('recurring-form');
    const list = document.getElementById('recurring-list');
    const recurringRef = db.collection('users').doc(userId).collection('recurring');

    // 1. Add Subscription
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('rec-name').value;
        const amount = parseFloat(document.getElementById('rec-amount').value);
        const category = document.getElementById('rec-category').value;
        const frequency = document.getElementById('rec-frequency').value;
        const nextDate = document.getElementById('rec-date').value;

        try {
            await recurringRef.add({
                name, amount, category, frequency, nextDate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            form.reset();
            alert("Subscription added! We'll auto-deduct it on the due date.");
        } catch (err) {
            console.error(err);
            alert("Error adding subscription.");
        }
    });

    // 2. Load List
    recurringRef.orderBy('nextDate', 'asc').onSnapshot(snapshot => {
        list.innerHTML = '';
        if (snapshot.empty) {
            list.innerHTML = '<p class="text-gray-500 text-center py-4">No active subscriptions.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const r = doc.data();
            const dateObj = new Date(r.nextDate);
            const isDueSoon = (dateObj - new Date()) < (3 * 24 * 60 * 60 * 1000); // 3 days

            list.innerHTML += `
                <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow border-l-4 ${isDueSoon ? 'border-yellow-500' : 'border-indigo-500'}">
                    <div>
                        <h4 class="font-bold text-gray-800 dark:text-white">${r.name}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-300">${r.category} • ${r.frequency}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-800 dark:text-white">₹${r.amount}</p>
                        <p class="text-xs ${isDueSoon ? 'text-yellow-600 font-bold' : 'text-gray-500'}">Due: ${r.nextDate}</p>
                    </div>
                    <button onclick="deleteRecurring('${userId}', '${doc.id}')" class="ml-4 text-red-400 hover:text-red-600">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    });
}

// Global scope for delete function
window.deleteRecurring = (userId, docId) => {
    if(confirm('Stop this subscription?')) {
        db.collection('users').doc(userId).collection('recurring').doc(docId).delete();
    }
};

// --- AUTOMATION LOGIC (Core Feature) ---
async function checkAndProcessRecurring(userId) {
    const today = new Date().toISOString().split('T')[0];
    const recurringRef = db.collection('users').doc(userId).collection('recurring');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    
    // Find due items
    const snapshot = await recurringRef.where('nextDate', '<=', today).get();

    if (snapshot.empty) return;

    const batch = db.batch();
    let processedCount = 0;

    snapshot.forEach(doc => {
        const r = doc.data();
        
        // 1. Add to Transactions
        const newTxRef = transactionsRef.doc();
        batch.set(newTxRef, {
            description: `Auto: ${r.name}`,
            amount: r.amount,
            category: r.category,
            type: 'expense',
            account: 'Bank', // Default account
            date: today, // Transaction happens today
            isAuto: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Calculate New Date
        let nextDateObj = new Date(r.nextDate);
        if (r.frequency === 'monthly') nextDateObj.setMonth(nextDateObj.getMonth() + 1);
        else if (r.frequency === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
        else if (r.frequency === 'yearly') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);

        const newNextDate = nextDateObj.toISOString().split('T')[0];

        // 3. Update Recurring Doc
        batch.update(doc.ref, { nextDate: newNextDate });
        processedCount++;
    });

    if (processedCount > 0) {
        await batch.commit();
        console.log(`Processed ${processedCount} recurring transactions.`);
        
        // Show Alert on Dashboard if element exists
        const alertBox = document.getElementById('budget-alert');
        if (alertBox) {
            alertBox.classList.remove('hidden');
            alertBox.classList.add('bg-indigo-100', 'text-indigo-800');
            alertBox.innerHTML = `<i class="fas fa-check-circle mr-2"></i> ${processedCount} subscription(s) auto-deducted today.`;
        }
    }
}