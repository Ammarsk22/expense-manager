// This script handles updating the summary cards and rendering the dynamic expense pie chart.

let expensePieChart = null; // Global variable to hold the chart instance

document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        // Run this script only if the user is logged in and on the dashboard page
        if (user && (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/'))) {
            initializeCharts(user.uid);
        }
    });
});

function initializeCharts(userId) {
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');
    const pieChartCanvas = document.getElementById('expense-pie-chart')?.getContext('2d');

    if (!pieChartCanvas) { return; } // Exit if canvas not found

    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    const categoriesRef = db.collection('users').doc(userId).collection('categories');

    // This function will refresh all dashboard data
    const refreshDashboard = () => {
        Promise.all([
            transactionsRef.get(),
            categoriesRef.where('type', '==', 'expense').get()
        ]).then(([transactionsSnapshot, categoriesSnapshot]) => {
            let totalIncome = 0;
            let totalExpense = 0;
            const expenseData = {};

            // Initialize all user-defined expense categories with a value of 0
            categoriesSnapshot.forEach(doc => {
                expenseData[doc.data().name] = 0;
            });

            // Calculate totals and aggregate expenses by category
            transactionsSnapshot.forEach(doc => {
                const transaction = doc.data();
                if (transaction.type === 'income') {
                    totalIncome += transaction.amount;
                } else if (transaction.type === 'expense') {
                    totalExpense += transaction.amount;
                    // Only add to expenseData if the category exists
                    if (expenseData.hasOwnProperty(transaction.category)) {
                        expenseData[transaction.category] += transaction.amount;
                    }
                }
            });

            const balance = totalIncome - totalExpense;

            // --- Update Summary Cards ---
            totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
            totalExpenseEl.textContent = `₹${totalExpense.toFixed(2)}`;
            balanceEl.textContent = `₹${balance.toFixed(2)}`;
            balanceEl.classList.toggle('text-red-500', balance < 0);
            balanceEl.classList.toggle('text-blue-500', balance >= 0);

            // --- Update Pie Chart ---
            updatePieChart(pieChartCanvas, expenseData);
        });
    };

    // Refresh dashboard data whenever transactions or categories change
    transactionsRef.onSnapshot(refreshDashboard);
    categoriesRef.onSnapshot(refreshDashboard);
}

function updatePieChart(ctx, data) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    if (expensePieChart) {
        expensePieChart.destroy(); // Destroy old chart before drawing new one
    }

    expensePieChart = new Chart(ctx, {
        type: 'doughnut', // Doughnut chart looks a bit more modern
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses by Category',
                data: values,
                backgroundColor: [
                    '#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6',
                    '#EC4899', '#6366F1', '#F97316', '#06B6D4', '#D946EF'
                ],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: false }
            }
        }
    });
}

