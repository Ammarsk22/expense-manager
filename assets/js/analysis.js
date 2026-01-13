document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(user => {
        if (user && window.location.pathname.endsWith('analysis.html')) {
            initializeAnalysisPage(user.uid);
        }
    });
});

let expenseChart = null; // Pie chart
let trendChart = null;   // Line chart (New)
let currentDate = new Date();
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
    
    // Canvas Contexts
    const chartCanvas = document.getElementById('expense-overview-chart')?.getContext('2d');
    const trendCanvas = document.getElementById('trend-chart')?.getContext('2d');

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
        
        // --- 1. Date Logic ---
        switch (settings.viewMode) {
            case 'daily':
                startDate = new Date(year, month, currentDate.getDate());
                endDate = new Date(year, month, currentDate.getDate());
                periodDisplay.textContent = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
                break;
            case 'weekly':
                const dayOfWeek = currentDate.getDay();
                const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
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

        // --- 2. Carry Over Logic ---
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
        
        // --- 3. Fetch Data ---
        const snapshot = await transactionsRef.where('date', '>=', startStr).where('date', '<=', endStr).get();
        let totalIncome = 0, totalExpense = 0;
        let expenseByCategory = {};
        
        // Trend Data Structures
        let trendLabels = [];
        let trendIncome = [];
        let trendExpense = [];
        let trendDataMap = {}; // Key: "YYYY-MM-DD" or "Month" -> {income: 0, expense: 0}

        // Initialize Trend Map based on View Mode
        if (settings.viewMode === 'yearly') {
            for(let i=0; i<12; i++) {
                // Key: "0", "1", ... "11" (Month Index)
                trendDataMap[i] = { income: 0, expense: 0 };
                trendLabels.push(new Date(year, i).toLocaleString('default', { month: 'short' }));
            }
        } else {
            // For Weekly, Monthly, 3-Months: We categorize by Day
            // Generate all days in range to ensure empty days are shown on chart (Optional, but looks better)
            // Simplified: Just use the transaction dates found or loop range. 
            // Better: Iterate from startDate to endDate
            let tempDate = new Date(startDate);
            while(tempDate <= endDate) {
                const key = tempDate.toISOString().split('T')[0];
                trendDataMap[key] = { income: 0, expense: 0 };
                // For labels: show Day number or Short date
                trendLabels.push(settings.viewMode === 'weekly' ? tempDate.toLocaleDateString('en-GB', {weekday: 'short'}) : tempDate.getDate());
                tempDate.setDate(tempDate.getDate() + 1);
            }
        }

        snapshot.forEach(doc => {
            const t = doc.data();
            
            // Total Sums
            if (t.type === 'income') totalIncome += t.amount;
            else if (t.type === 'expense') {
                totalExpense += t.amount;
                expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
            }

            // Trend Data Aggregation
            let key;
            if (settings.viewMode === 'yearly') {
                key = new Date(t.date).getMonth(); // 0-11
            } else {
                key = t.date; // YYYY-MM-DD
            }

            if(trendDataMap[key]) {
                if (t.type === 'income') trendDataMap[key].income += t.amount;
                else trendDataMap[key].expense += t.amount;
            }
        });

        // Convert Map to Arrays for Chart
        if (settings.viewMode === 'yearly') {
             trendIncome = Object.values(trendDataMap).map(d => d.income);
             trendExpense = Object.values(trendDataMap).map(d => d.expense);
        } else {
             // Re-map keys to match the generated labels/keys order
             // Note: In non-yearly loop above, we inserted keys in order.
             trendIncome = Object.values(trendDataMap).map(d => d.income);
             trendExpense = Object.values(trendDataMap).map(d => d.expense);
        }

        // Update UI Text
        totalIncomeEl.textContent = `₹${totalIncome.toLocaleString('en-IN')}`;
        totalExpenseEl.textContent = `₹${totalExpense.toLocaleString('en-IN')}`;
        const balance = totalIncome - totalExpense + carryOverAmount;
        balanceEl.textContent = `₹${balance.toLocaleString('en-IN')}`;
        balanceEl.classList.toggle('text-red-500', balance < 0);
        
        // Render Visuals
        renderExpenseList(expenseByCategory, totalExpense);
        if (chartCanvas) renderExpenseChart(chartCanvas, expenseByCategory);
        if (trendCanvas) renderTrendChart(trendCanvas, trendLabels, trendIncome, trendExpense);
    };
    
    // --- Render Expense List ---
    const renderExpenseList = (data, total) => {
        expenseListEl.innerHTML = '';
        if (Object.keys(data).length === 0) {
            expenseListEl.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No expense data.</p>';
            return;
        }
        const sortedCategories = Object.entries(data).sort((a, b) => b[1] - a[1]);
        sortedCategories.forEach(([category, amount]) => {
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            expenseListEl.innerHTML += `
                <div class="flex items-center justify-between p-2 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${category}</p>
                        <div class="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                            <div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-red-500 text-sm">- ₹${amount.toLocaleString('en-IN')}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${percentage}%</p>
                    </div>
                </div>`;
        });
    };

    // --- Render Pie Chart ---
    const renderExpenseChart = (ctx, data) => {
        if (expenseChart) expenseChart.destroy();
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{ 
                    data: Object.values(data), 
                    backgroundColor: ['#EF4444', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#6366F1'], 
                    borderColor: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF', 
                    borderWidth: 2 
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'right', labels: { color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151', font: {size: 10} } } 
                } 
            }
        });
    };

    // --- Render Trend Chart (NEW) ---
    const renderTrendChart = (ctx, labels, incomeData, expenseData) => {
        if (trendChart) trendChart.destroy();
        const isDark = document.documentElement.classList.contains('dark');
        
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomeData,
                        borderColor: '#10B981', // Green
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2
                    },
                    {
                        label: 'Expense',
                        data: expenseData,
                        borderColor: '#EF4444', // Red
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { labels: { color: isDark ? '#e5e7eb' : '#374151' } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += '₹' + context.parsed.y.toLocaleString('en-IN');
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: isDark ? '#9CA3AF' : '#4B5563', maxTicksLimit: 10 },
                        grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }
                    },
                    y: {
                        ticks: { color: isDark ? '#9CA3AF' : '#4B5563' },
                        grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                        beginAtZero: true
                    }
                }
            }
        });
    };

    // --- Event Listeners (Navigation & Options) ---
    const updateOptionsUI = () => {
        viewModeOptions.querySelectorAll('p').forEach(p => {
            p.classList.remove('font-bold', 'text-indigo-600', 'dark:text-indigo-400');
            p.innerHTML = p.dataset.mode.replace('-', ' ').toUpperCase();
            if (p.dataset.mode === settings.viewMode) {
                p.classList.add('font-bold', 'text-indigo-600', 'dark:text-indigo-400');
                p.innerHTML = `<i class="fas fa-check mr-2"></i>${p.innerHTML}`;
            }
        });
        showTotalOptions.querySelectorAll('p').forEach(p => {
            p.classList.remove('font-bold', 'text-indigo-600', 'dark:text-indigo-400');
            p.innerHTML = p.dataset.option === 'true' ? 'YES' : 'NO';
            if (String(settings.showTotal) === p.dataset.option) {
                p.classList.add('font-bold', 'text-indigo-600', 'dark:text-indigo-400');
                p.innerHTML = `<i class="fas fa-check mr-2"></i>${p.innerHTML}`;
            }
        });
        carryOverOptions.querySelectorAll('p').forEach(p => {
            p.classList.remove('font-bold', 'text-indigo-600', 'dark:text-indigo-400');
            p.innerHTML = p.dataset.option === 'true' ? 'ON' : 'OFF';
            if (String(settings.carryOver) === p.dataset.option) {
                p.classList.add('font-bold', 'text-indigo-600', 'dark:text-indigo-400');
                p.innerHTML = `<i class="fas fa-check mr-2"></i>${p.innerHTML}`;
            }
        });
        summaryCards.style.display = settings.showTotal ? 'grid' : 'none';
    };

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