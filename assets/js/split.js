/**
 * Split Bill Logic
 * Calculates shares and adds to Debt Manager
 */

document.addEventListener('DOMContentLoaded', () => {
    const totalInput = document.getElementById('total-amount');
    const peopleList = document.getElementById('people-list');
    const addPersonBtn = document.getElementById('add-person-btn');
    const includeMeCheckbox = document.getElementById('include-me');
    const perPersonDisplay = document.getElementById('per-person-amount');
    const splitSummary = document.getElementById('split-summary');
    const form = document.getElementById('split-form');

    // 1. Add New Person Field
    addPersonBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'flex gap-2';
        div.innerHTML = `
            <input type="text" class="person-name w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white text-sm" placeholder="Friend's Name" required>
            <button type="button" class="text-red-500 hover:text-red-700 px-2 remove-btn"><i class="fas fa-trash"></i></button>
        `;
        peopleList.appendChild(div);
        
        // Add delete event to new button
        div.querySelector('.remove-btn').addEventListener('click', () => {
            div.remove();
            calculateSplit();
        });

        calculateSplit();
    });

    // 2. Real-time Calculation
    function calculateSplit() {
        const total = parseFloat(totalInput.value) || 0;
        const friendsCount = document.querySelectorAll('.person-name').length;
        const includeMe = includeMeCheckbox.checked ? 1 : 0;
        const totalPeople = friendsCount + includeMe;

        if (totalPeople === 0) {
            perPersonDisplay.textContent = '₹0.00';
            splitSummary.textContent = '0 people total';
            return;
        }

        const share = total / totalPeople;
        perPersonDisplay.textContent = `₹${share.toFixed(2)}`;
        
        let summaryText = `${friendsCount} friend${friendsCount !== 1 ? 's' : ''}`;
        if (includeMe) summaryText += ' + You';
        splitSummary.textContent = `${summaryText} = ${totalPeople} total`;
    }

    // Event Listeners for Calculation
    totalInput.addEventListener('input', calculateSplit);
    includeMeCheckbox.addEventListener('change', calculateSplit);
    peopleList.addEventListener('input', calculateSplit); // Re-calc if typing (optional, but good for validation)

    // 3. Save to Debts
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = firebase.auth().currentUser;
        if (!user) return alert('Please login first');

        const total = parseFloat(totalInput.value);
        const description = document.getElementById('split-desc').value;
        const friendInputs = document.querySelectorAll('.person-name');
        const includeMe = includeMeCheckbox.checked ? 1 : 0;
        const totalPeople = friendInputs.length + includeMe;

        if (totalPeople <= 1 && includeMe) {
            return alert('Add at least one friend to split with.');
        }

        const shareAmount = parseFloat((total / totalPeople).toFixed(2));
        const date = new Date().toISOString().split('T')[0]; // Today YYYY-MM-DD

        const batch = db.batch(); // Use batch for multiple writes

        // Create Debt Record for each friend
        friendInputs.forEach(input => {
            const name = input.value.trim();
            if (name) {
                const docRef = db.collection('users').doc(user.uid).collection('debts').doc();
                batch.set(docRef, {
                    type: 'lent', // "I Lent" (To Receive)
                    person: name,
                    amount: shareAmount,
                    description: `Split: ${description}`,
                    date: date,
                    status: 'pending', // Optional status
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });

        // Optional: Add "My Expense" to Transaction History (if included)
        if (includeMe) {
            const expenseRef = db.collection('users').doc(user.uid).collection('transactions').doc();
            batch.set(expenseRef, {
                type: 'expense',
                category: 'Food', // Default or ask user
                amount: shareAmount,
                description: `My Share: ${description}`,
                account: 'Cash', // Default or ask user
                date: date,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        try {
            await batch.commit();
            alert(`Split successful! Added ₹${shareAmount} to Debt Manager for each friend.`);
            window.location.href = 'debt.html'; // Redirect to Debts page
        } catch (error) {
            console.error("Error splitting bill: ", error);
            alert('Error saving data. Please try again.');
        }
    });
});