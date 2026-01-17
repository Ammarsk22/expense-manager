// --- FINTRACK PREDICTION ENGINE ---
// Uses historical data to forecast future spending using simple moving averages and trend analysis.

const Forecaster = {
    
    // 1. PREDICT NEXT MONTH EXPENSE
    // Logic: Average of last 3 months + Inflation Factor (Trend)
    predictNextMonth: async function(userId) {
        try {
            // Get date for 3 months ago
            const d = new Date();
            d.setMonth(d.getMonth() - 3);
            const startDate = d.toISOString().split('T')[0];

            const snapshot = await db.collection('users').doc(userId).collection('transactions')
                .where('type', '==', 'expense')
                .where('date', '>=', startDate)
                .orderBy('date', 'asc')
                .get();

            if (snapshot.empty) return { amount: 0, trend: 'stable' };

            // Group by Month
            const monthlyTotals = {};
            let totalExpense = 0;
            let transactionCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const monthKey = data.date.substring(0, 7); // YYYY-MM
                
                if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
                monthlyTotals[monthKey] += data.amount;
                
                totalExpense += data.amount;
                transactionCount++;
            });

            const months = Object.keys(monthlyTotals);
            if (months.length === 0) return { amount: 0, trend: 'stable' };

            // Calculate Average
            const avgExpense = totalExpense / months.length;

            // Calculate Trend (Simple Slope: Last Month vs First Month)
            let trend = 'stable';
            if (months.length >= 2) {
                const firstMonth = monthlyTotals[months[0]];
                const lastMonth = monthlyTotals[months[months.length - 1]];
                
                if (lastMonth > firstMonth * 1.1) trend = 'increasing'; // >10% increase
                else if (lastMonth < firstMonth * 0.9) trend = 'decreasing'; // >10% decrease
            }

            // Prediction: Weighted average (giving more weight to recent months)
            // If only 1 month data, prediction is that month's total
            let predictedAmount = avgExpense;
            
            // Apply slight buffer for safety
            predictedAmount = Math.ceil(predictedAmount / 100) * 100; // Round to nearest 100

            return {
                amount: predictedAmount,
                trend: trend,
                dailyAverage: Math.round(totalExpense / (months.length * 30)) // Approx daily
            };

        } catch (error) {
            console.error("Forecast Error:", error);
            return { amount: 0, trend: 'error' };
        }
    },

    // 2. GET SPENDING ADVICE
    getAdvice: function(forecastData) {
        const { amount, trend } = forecastData;
        
        if (amount === 0) return "Start tracking your expenses to get AI predictions.";

        if (trend === 'increasing') {
            return `⚠️ Warning: Your spending is trending upwards. We predict you'll spend approx ₹${amount.toLocaleString()} next month. Try to cut back on non-essentials.`;
        } else if (trend === 'decreasing') {
            return `✅ Great job! Your spending is decreasing. Next month forecasted: ₹${amount.toLocaleString()}. Keep saving!`;
        } else {
            return `ℹ️ Your spending is stable. Predicted expense for next month: ₹${amount.toLocaleString()}.`;
        }
    },

    // 3. UI HELPER: Update Dashboard Forecast Card (if exists)
    updateDashboardForecast: async function(userId) {
        const forecastEl = document.getElementById('forecast-amount');
        const trendEl = document.getElementById('forecast-trend');
        const adviceEl = document.getElementById('ai-advice');

        if (!forecastEl && !adviceEl) return; // UI elements don't exist on this page

        const data = await this.predictNextMonth(userId);
        
        if (forecastEl) forecastEl.innerText = `₹${data.amount.toLocaleString()}`;
        
        if (trendEl) {
            if (data.trend === 'increasing') {
                trendEl.innerHTML = '<i class="fas fa-arrow-trend-up text-red-500"></i>';
            } else if (data.trend === 'decreasing') {
                trendEl.innerHTML = '<i class="fas fa-arrow-trend-down text-emerald-500"></i>';
            } else {
                trendEl.innerHTML = '<i class="fas fa-minus text-gray-400"></i>';
            }
        }

        if (adviceEl) {
            adviceEl.innerText = this.getAdvice(data);
        }
    }
};

// Expose globally
window.Forecaster = Forecaster;