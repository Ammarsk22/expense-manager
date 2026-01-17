// --- BUDGET MANAGER ---

const BudgetManager = {
    
    // 1. SET BUDGET (Normally this would be a user setting, here we simulate a default or fetch from DB)
    // For simplicity, let's assume monthly budget is 80% of Income or a fixed value.
    // In a full app, you would have a Budget Page to set this.
    
    getMonthlyBudget: async function(userId) {
        // Fetch budget settings from Firebase (if implemented)
        // For now, we'll return a default placeholder or calculate dynamic
        // Let's assume a dynamic budget: 80% of total income
        
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const incomeSnapshot = await db.collection('users').doc(userId).collection('transactions')
                .where('type', '==', 'income')
                .where('date', '>=', startOfMonth.toISOString().split('T')[0])
                .get();

            let totalIncome = 0;
            incomeSnapshot.forEach(doc => {
                totalIncome += doc.data().amount;
            });

            // If no income, set a safe default or 0
            return totalIncome > 0 ? totalIncome : 0; 
        } catch (error) {
            console.error("Error fetching budget info:", error);
            return 0;
        }
    },

    // 2. CHECK BUDGET HEALTH
    checkHealth: async function(userId, currentExpense) {
        const totalIncome = await this.getMonthlyBudget(userId);
        
        if (totalIncome === 0) return { status: 'unknown', percent: 0 };

        const percent = (currentExpense / totalIncome) * 100;
        let status = 'good';
        let message = 'On Track';

        if (percent >= 100) {
            status = 'critical';
            message = 'Budget Exceeded!';
        } else if (percent >= 85) {
            status = 'warning';
            message = 'Approaching Limit';
        }

        return { status, percent, message };
    },

    // 3. SHOW ALERT (UI)
    showAlert: function(status, message) {
        const alertBox = document.getElementById('budget-alert');
        if (!alertBox) return;

        // Reset classes
        alertBox.className = 'p-4 mb-6 rounded-2xl border shadow-sm flex justify-between items-center transition-all animate-fade-in';
        
        if (status === 'critical') {
            alertBox.classList.add('bg-red-50', 'border-red-100', 'text-red-700', 'dark:bg-red-900/20', 'dark:border-red-800', 'dark:text-red-300');
            alertBox.innerHTML = `<div><strong class="block font-bold">⚠️ Warning</strong><span class="text-sm">${message}</span></div> <i class="fas fa-exclamation-triangle text-2xl opacity-50"></i>`;
            alertBox.classList.remove('hidden');
            if(window.triggerHaptic) window.triggerHaptic(50); // Haptic feedback on warning
        } else if (status === 'warning') {
            alertBox.classList.add('bg-yellow-50', 'border-yellow-100', 'text-yellow-700', 'dark:bg-yellow-900/20', 'dark:border-yellow-800', 'dark:text-yellow-300');
            alertBox.innerHTML = `<div><strong class="block font-bold">⚡ Caution</strong><span class="text-sm">${message}</span></div> <i class="fas fa-info-circle text-2xl opacity-50"></i>`;
            alertBox.classList.remove('hidden');
        } else {
            alertBox.classList.add('hidden');
        }
    }
};

// Expose to window
window.BudgetManager = BudgetManager;