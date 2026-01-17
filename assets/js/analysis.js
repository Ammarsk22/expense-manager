document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeAnalysis(user.uid);
        }
    });
});

function initializeAnalysis(userId) {
    const filterSelect = document.getElementById('time-filter');
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    
    // Initial Load
    fetchAndRender(userId, 'month');

    // Filter Change Listener
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            fetchAndRender(userId, e.target.value);
            if(window.triggerHaptic) window.triggerHaptic(10);
        });
    }
}

function fetchAndRender(userId, timeRange) {
    const transactionsRef = db.collection('users').doc(userId).collection('transactions');
    
    // Calculate Date Range
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'last_month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        // Note: For simplicity in this query we usually just filter >= start date in client or simple range
    } else if (timeRange === '3_months') {
        startDate.setMonth(now.getMonth() - 3);
    } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Since Firebase range queries can be complex with multiple fields, 
    // we'll fetch last 300 transactions and filter in JS for this simple app
    // for better performance in production, use composed indexes.
    transactionsRef.orderBy('date', 'desc').limit(300).get().then(snapshot => {
        const allTx = snapshot.docs.map(doc => doc.data());
        
        // Filter by Date
        const filteredTx = allTx.filter(t => new Date(t.date) >= startDate);

        // 1. Update Cards
        updateSummaryCards(filteredTx);

        // 2. Prepare & Render Line Chart (Trend)
        prepareTrendChart(filteredTx, timeRange);

        // 3. Prepare & Render Donut Chart (Category)
        prepareCategoryChart(filteredTx);

    }).catch(err => console.error("Error fetching analysis:", err));
}

function updateSummaryCards(transactions) {
    let inc = 0, exp = 0;
    transactions.forEach(t => {
        if(t.type === 'income') inc += t.amount;
        else if(t.type === 'expense') exp += t.amount;
    });

    const savings = inc - exp;
    const savePerc = inc > 0 ? ((savings / inc) * 100).toFixed(1) : 0;
    const currency = '₹';

    document.getElementById('ana-income').innerText = `${currency}${inc.toLocaleString()}`;
    document.getElementById('ana-expense').innerText = `${currency}${exp.toLocaleString()}`;
    
    const savEl = document.getElementById('ana-savings');
    savEl.innerText = `${currency}${savings.toLocaleString()}`;
    savEl.className = `text-2xl font-bold mt-1 ${savings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'}`;
    
    document.getElementById('ana-savings-perc').innerText = `${savePerc}% saved`;
}

function prepareTrendChart(transactions, range) {
    // Group by Date
    const grouped = {};
    transactions.forEach(t => {
        // Format date label (e.g. "12 Jan")
        const d = new Date(t.date);
        const key = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
        
        if(!grouped[key]) grouped[key] = { inc: 0, exp: 0, dateObj: d };
        
        if(t.type === 'income') grouped[key].inc += t.amount;
        else grouped[key].exp += t.amount;
    });

    // Sort by Date
    const sortedKeys = Object.keys(grouped).sort((a, b) => grouped[a].dateObj - grouped[b].dateObj);

    // Limit data points for readability
    // (If too many points, maybe group by week? Keeping it simple for now)
    
    const labels = sortedKeys;
    const incData = labels.map(k => grouped[k].inc);
    const expData = labels.map(k => grouped[k].exp);

    // Call shared function from charts.js
    if(typeof renderAnalysisChart === 'function') {
        renderAnalysisChart('analysis-line-chart', labels, incData, expData);
    }
}

function prepareCategoryChart(transactions) {
    const catData = {};
    const expenses = transactions.filter(t => t.type === 'expense');
    
    expenses.forEach(t => {
        catData[t.category] = (catData[t.category] || 0) + t.amount;
    });

    // Render Donut (Shared function)
    if(typeof renderExpenseChart === 'function') {
        renderExpenseChart(catData);
    }

    // Render Top List
    const listEl = document.getElementById('top-categories-list');
    listEl.innerHTML = '';
    
    const sortedCats = Object.entries(catData).sort((a, b) => b[1] - a[1]);
    
    if(sortedCats.length === 0) {
        listEl.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">No expense data found.</p>';
        return;
    }

    sortedCats.forEach(([cat, amount]) => {
        const currency = '₹';
        // Icon logic (Simple mapping)
        const iconMap = {
            'food': 'fa-utensils', 'travel': 'fa-car', 'shopping': 'fa-shopping-bag',
            'bills': 'fa-file-invoice-dollar', 'entertainment': 'fa-film', 'health': 'fa-medkit',
            'grocery': 'fa-carrot', 'fuel': 'fa-gas-pump', 'rent': 'fa-home'
        };
        const icon = iconMap[cat.toLowerCase()] || 'fa-tag';

        const html = `
            <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center text-xs">
                        <i class="fas ${icon}"></i>
                    </div>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-200 capitalize">${cat}</span>
                </div>
                <span class="text-sm font-bold text-gray-900 dark:text-white">${currency}${amount.toLocaleString()}</span>
            </div>
        `;
        listEl.insertAdjacentHTML('beforeend', html);
    });
}