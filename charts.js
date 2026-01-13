// This script handles updating the summary cards and rendering the dynamic expense pie chart.

let expensePieChart = null; // Global variable to hold the chart instance

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        // Run this script only if the user is logged in and on the dashboard page
        if (user && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
            initializeDashboard(user.uid);
        }
    });
});

function initializeDashboard(userId) {
    // --- Elements for Summary Cards ---
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');
    
    // --- Element for Pie Chart (can be optional) ---
    const pieChartCanvas = document.getElementById('expense-pie-chart')?.getContext('2d');

    // --- Firestore References ---
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');

    // --- Real-time listener for transactions ---
    transactionsRef.onSnapshot(transactionsSnapshot => {
        let totalIncome = 0;
        let totalExpense = 0;
        const expenseData = {}; // Data for the pie chart

        // Loop through all transactions to calculate totals
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            if (transaction.type === 'income') {
                totalIncome += transaction.amount;
            } else if (transaction.type === 'expense') {
                totalExpense += transaction.amount;
                // Aggregate data for the pie chart
                if (transaction.category) {
                    expenseData[transaction.category] = (expenseData[transaction.category] || 0) + transaction.amount;
                }
            }
        });

        const balance = totalIncome - totalExpense;

        // --- Update Summary Cards (Hardcoded Rupee) ---
        totalIncomeEl.textContent = `₹${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        totalExpenseEl.textContent = `₹${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        balanceEl.textContent = `₹${balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        balanceEl.classList.toggle('text-red-500', balance < 0);
        balanceEl.classList.toggle('text-blue-500', balance >= 0);

        // --- Update Pie Chart (only if the canvas exists) ---
        if (pieChartCanvas) {
            updatePieChart(pieChartCanvas, expenseData);
        }
    });
}

function updatePieChart(ctx, data) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    if (expensePieChart) {
        expensePieChart.destroy(); // Destroy old chart before drawing new one
    }

    // Determine text color based on Dark Mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#e5e7eb' : '#374151';

    expensePieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses by Category',
                data: values,
                backgroundColor: [
                    '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6',
                    '#EC4899', '#6366F1', '#F97316', '#06B6D4', '#D946EF'
                ],
                borderColor: isDarkMode ? '#1f2937' : '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right',
                    labels: {
                        color: textColor
                    }
                },
                title: { display: false }
            }
        }
    });
}