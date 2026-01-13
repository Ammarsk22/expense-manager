/**
 * AI Budget Forecasting Logic
 * Projects future spending based on historical data
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only run if we are on the Analysis page and logged in
    const forecastContainer = document.getElementById('forecast-container');
    if (!forecastContainer) return;

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initForecast(user);
        }
    });
});

async function initForecast(user) {
    const container = document.getElementById('forecast-container');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysPassed = today.getDate();

    try {
        // 1. Fetch Expenses from Last 3 Months
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setDate(1); // Start from 1st of 3 months ago

        const snapshot = await db.collection('users').doc(user.uid).collection('transactions')
            .where('type', '==', 'expense')
            .where('date', '>=', startDate.toISOString().split('T')[0])
            .get();

        if (snapshot.empty) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500 italic">Not enough data to generate forecasts yet. Keep adding transactions!</p>`;
            return;
        }

        // 2. Process Data
        let categoryTotals = {};
        let currentMonthTotals = {};
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.date);
            const amount = parseFloat(data.amount);
            
            // If transaction is from current month
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                if (!currentMonthTotals[data.category]) currentMonthTotals[data.category] = 0;
                currentMonthTotals[data.category] += amount;
            } 
            // If historical data (previous 3 months)
            else {
                if (!categoryTotals[data.category]) categoryTotals[data.category] = { total: 0, count: 0 };
                categoryTotals[data.category].total += amount;
                categoryTotals[data.category].count++; // We use months count, simplified here
            }
        });

        // 3. Generate Insights
        container.innerHTML = ''; // Clear loader
        let alertsGenerated = 0;

        // Analyze Categories with significant spending
        for (const [category, currentAmount] of Object.entries(currentMonthTotals)) {
            
            // Calculate Historical Average (Simplified: Total / 3 months approx)
            // Ideally, track distinct months. Here assuming 3 months data roughly available.
            const history = categoryTotals[category];
            const avgMonthly = history ? (history.total / 3) : 0;

            if (avgMonthly > 0) {
                // Project current month end
                const projectedAmount = (currentAmount / daysPassed) * daysInMonth;
                const percentChange = ((projectedAmount - avgMonthly) / avgMonthly) * 100;

                // Logic: If projected to exceed average by > 15%
                if (percentChange > 15) {
                    createAlertCard(container, category, currentAmount, projectedAmount, avgMonthly, 'warning');
                    alertsGenerated++;
                } 
                // Logic: If projected to save > 15%
                else if (percentChange < -15) {
                    createAlertCard(container, category, currentAmount, projectedAmount, avgMonthly, 'success');
                    alertsGenerated++;
                }
            }
        }

        // 4. Default Message if everything is normal
        if (alertsGenerated === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center border border-green-200 dark:border-green-800">
                    <p class="text-green-700 dark:text-green-400 font-medium"><i class="fas fa-check-circle mr-2"></i>You are on track!</p>
                    <p class="text-sm text-green-600 dark:text-green-500 mt-1">No unusual spending spikes detected this month.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error("Forecast Error:", error);
        container.innerHTML = `<p class="text-red-500 text-center">Error generating forecast.</p>`;
    }
}

function createAlertCard(container, category, current, projected, average, type) {
    const isWarning = type === 'warning';
    const colorClass = isWarning ? 'red' : 'green';
    const icon = isWarning ? 'exclamation-triangle' : 'piggy-bank';
    const title = isWarning ? 'High Spending Alert' : 'Savings Opportunity';
    const message = isWarning 
        ? `You might spend <b>₹${Math.round(projected)}</b> on ${category} this month.`
        : `Great job! You are projected to spend only <b>₹${Math.round(projected)}</b> on ${category}.`;

    const diff = Math.abs(projected - average);

    const html = `
        <div class="bg-${colorClass}-50 dark:bg-${colorClass}-900/20 p-4 rounded-lg border border-${colorClass}-200 dark:border-${colorClass}-800 shadow-sm relative overflow-hidden">
            <div class="flex items-start justify-between">
                <div>
                    <h4 class="font-bold text-${colorClass}-700 dark:text-${colorClass}-400 text-sm uppercase tracking-wide mb-1">
                        <i class="fas fa-${icon} mr-1"></i> ${category}
                    </h4>
                    <p class="text-gray-700 dark:text-gray-300 text-sm mb-2">${message}</p>
                    <p class="text-xs text-${colorClass}-600 dark:text-${colorClass}-500">
                        ${isWarning ? '▲' : '▼'} ₹${Math.round(diff)} vs 3-month avg
                    </p>
                </div>
                <div class="text-right">
                    <span class="block text-2xl font-bold text-${colorClass}-600 dark:text-${colorClass}-400">₹${Math.round(current)}</span>
                    <span class="text-[10px] text-gray-500 uppercase">Spent So Far</span>
                </div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}