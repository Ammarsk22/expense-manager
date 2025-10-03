document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.endsWith('analysis.html')) {
            initializeAnalysisPage(user.uid);
        }
    });
});

let expenseChart = null;
let currentDate = new Date();
// --- Settings State ---
let settings = {
    viewMode: 'monthly',
    showTotal: true,
    carryOver: false
};

function initializeAnalysisPage(userId) {
    const periodDisplay = document.getElementById('period-display');
    const prevPeriodBtn = document.getElementById('prev-period-btn');
    const nextPeriodBtn = document.getElementById('next-period-btn');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('balance');
    const summaryCards = document.getElementById('summary-cards');
    const expenseListEl = document.getElementById('expense-list');
    const chartCanvas = document.getElementById('expense-overview-chart')?.getContext('2d');
    const optionsModal = document.getElementById('options-modal');
    const displayOptionsBtn = document.getElementById('display-options-btn');
    const closeOptionsBtn = document.getElementById('close-options-btn');
    const viewModeOptions = document.getElementById('view-mode-options');
    const showTotalOptions = document.getElementById('show-total-options');
    const carryOverOptions = document.getElementById('carry-over-options');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');

    const fetchAndDisplayData = async () => {
        let startDate, endDate;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Date range calculation (same as before)
        // [omitted for brevity - it's the same logic as the previous JS code]
        switch (settings.viewMode) {
            case 'daily':
                startDate = new Date(year, month, currentDate.getDate());
                endDate = new Date(year, month, currentDate.getDate());
                periodDisplay.textContent = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                break;
            case 'weekly':
                const dayOfWeek = currentDate.getDay();
                const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is sunday
                startDate = new Date(currentDate.setDate(diff));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                periodDisplay.textContent = `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                break;
            case 'yearly':
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31);
                periodDisplay.textContent = year;
                break;
            case '3-months':
                const quarter = Math.floor(month / 3);
                startDate = new Date(year, quarter * 3, 1);
                endDate = new Date(year, (quarter * 3) + 3, 0);
                periodDisplay.textContent = `${startDate.toLocaleString('default', { month: 'short' })} - ${endDate.toLocaleString('default', { month: 'short' })} ${year}`;
                break;
            default: // monthly
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0);
                periodDisplay.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                break;
        }

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        // --- Carry Over Logic ---
        let carryOverAmount = 0;
        if (settings.carryOver && settings.viewMode === 'monthly') {
            const prevMonthDate = new Date(year, month - 1, 1);
            const prevMonthStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1).toISOString().split('T')[0];
            const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).toISOString().split('T')[0];
            const prevSnapshot = await transactionsRef.where('date', '>=', prevMonthStart).where('date', '<=', prevMonthEnd).get();
            prevSnapshot.forEach(doc => {
                const t = doc.data();
                carryOverAmount += (t.type === 'income' ? t.amount : -t.amount);
            });
        }
        
        const snapshot = await transactionsRef.where('date', '>=', startStr).where('date', '<=', endStr).get();
        let totalIncome = 0, totalExpense = 0, expenseByCategory = {};
        snapshot.forEach(doc => {
            const t = doc.data();
            if (t.type === 'income') totalIncome += t.amount;
            else if (t.type === 'expense') {
                totalExpense += t.amount;
                expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
            }
        });

        // Update UI
        totalIncomeEl.textContent = `₹${totalIncome.toFixed(2)}`;
        totalExpenseEl.textContent = `₹${totalExpense.toFixed(2)}`;
        const balance = totalIncome - totalExpense + carryOverAmount;
        balanceEl.textContent = `₹${balance.toFixed(2)}`;
        balanceEl.classList.toggle('text-red-500', balance < 0);
        
        renderExpenseList(expenseByCategory, totalExpense);
        if (chartCanvas) renderExpenseChart(chartCanvas, expenseByCategory);
    };
    
    // (renderExpenseList and renderExpenseChart functions are unchanged)
    const renderExpenseList = (data, total) => {
        expenseListEl.innerHTML = '';
        if (Object.keys(data).length === 0) {
            expenseListEl.innerHTML = '<p class="text-gray-500">No expense data for this period.</p>';
            return;
        }
        const sortedCategories = Object.entries(data).sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([category, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(2) : 0;
            expenseListEl.innerHTML += `<div class="flex items-center justify-between"><div><p class="font-bold">${category}</p><div class="w-full bg-gray-200 rounded-full h-2.5 mt-1"><div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${percentage}%"></div></div></div><div class="text-right"><p class="font-semibold text-red-500">- ₹${amount.toFixed(2)}</p><p class="text-sm text-gray-500">${percentage}%</p></div></div>`;
        });
    };
    const renderExpenseChart = (ctx, data) => {
        if (expenseChart) expenseChart.destroy();
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{ data: Object.values(data), backgroundColor: ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'], borderColor: '#FFFFFF', borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    };

    const updateOptionsUI = () => {
        // View Mode
        viewModeOptions.querySelectorAll('p').forEach(p => {
            p.classList.remove('font-bold', 'text-indigo-600');
            p.innerHTML = p.dataset.mode.replace('-', ' ').toUpperCase();
            if (p.dataset.mode === settings.viewMode) {
                p.classList.add('font-bold', 'text-indigo-600');
                p.innerHTML = `<i class="fas fa-check mr-2"></i>${p.innerHTML}`;
            }
        });
        // Show Total
        showTotalOptions.querySelectorAll('p').forEach(p => {
            p.classList.remove('font-bold', 'text-indigo-600');
            p.innerHTML = p.dataset.option === 'true' ? 'YES' : 'NO';
            if (String(settings.showTotal) === p.dataset.option) {
                p.classList.add('font-bold', 'text-indigo-600');
                p.innerHTML = `<i class="fas fa-check mr-2"></i>${p.innerHTML}`;
            }
        });
        // Carry Over
        carryOverOptions.querySelectorAll('p').forEach(p => {
            p.classList.remove('font-bold', 'text-indigo-600');
            p.innerHTML = p.dataset.option === 'true' ? 'ON' : 'OFF';
            if (String(settings.carryOver) === p.dataset.option) {
                p.classList.add('font-bold', 'text-indigo-600');
                p.innerHTML = `<i class="fas fa-check mr-2"></i>${p.innerHTML}`;
            }
        });
        summaryCards.style.display = settings.showTotal ? 'grid' : 'none';
    };

    // --- Event Listeners ---
    prevPeriodBtn.addEventListener('click', () => {
        if (settings.viewMode === 'daily') currentDate.setDate(currentDate.getDate() - 1);
        else if (settings.viewMode === 'weekly') currentDate.setDate(currentDate.getDate() - 7);
        else if (settings.viewMode === 'monthly') currentDate.setMonth(currentDate.getMonth() - 1);
        else if (settings.viewMode === 'yearly') currentDate.setFullYear(currentDate.getFullYear() - 1);
        else if (settings.viewMode === '3-months') currentDate.setMonth(currentDate.getMonth() - 3);
        fetchAndDisplayData();
    });

    nextPeriodBtn.addEventListener('click', () => {
        if (settings.viewMode === 'daily') currentDate.setDate(currentDate.getDate() + 1);
        else if (settings.viewMode === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
        else if (settings.viewMode === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
        else if (settings.viewMode === 'yearly') currentDate.setFullYear(currentDate.getFullYear() + 1);
        else if (settings.viewMode === '3-months') currentDate.setMonth(currentDate.getMonth() + 3);
        fetchAndDisplayData();
    });

    displayOptionsBtn.addEventListener('click', () => {
        updateOptionsUI();
        optionsModal.classList.remove('hidden');
    });
    closeOptionsBtn.addEventListener('click', () => optionsModal.classList.add('hidden'));
    
    viewModeOptions.addEventListener('click', (e) => {
        const target = e.target.closest('p');
        if (target && target.dataset.mode) {
            settings.viewMode = target.dataset.mode;
            fetchAndDisplayData();
            updateOptionsUI();
        }
    });
    showTotalOptions.addEventListener('click', (e) => {
        const target = e.target.closest('p');
        if (target && target.dataset.option) {
            settings.showTotal = target.dataset.option === 'true';
            updateOptionsUI();
        }
    });
    carryOverOptions.addEventListener('click', (e) => {
        const target = e.target.closest('p');
        if (target && target.dataset.option) {
            settings.carryOver = target.dataset.option === 'true';
            fetchAndDisplayData();
            updateOptionsUI();
        }
    });

    // Initial Load
    fetchAndDisplayData();
}