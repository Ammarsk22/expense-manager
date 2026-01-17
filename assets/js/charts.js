/**
 * Charts Logic for FinTrack
 * Handles: Dashboard Donut Chart & Analysis Line Chart
 */

// --- 1. DASHBOARD EXPENSE CHART (Donut) ---
function renderExpenseChart(data) {
    const ctx = document.getElementById('expense-pie-chart');
    const placeholder = document.getElementById('chart-placeholder');
    const centerText = document.getElementById('chart-center-text');
    const totalEl = document.getElementById('chart-total');
    
    if (!ctx) return;

    // Check if data is essentially empty
    const values = Object.values(data);
    const totalAmount = values.reduce((acc, curr) => acc + curr, 0);
    const isEmpty = totalAmount === 0;

    // HANDLE EMPTY STATE
    if (isEmpty) {
        // Destroy existing chart to clear canvas events
        if (window.myExpenseChart) {
            window.myExpenseChart.destroy();
            window.myExpenseChart = null;
        }
        
        // Clear visually
        const context = ctx.getContext('2d');
        context.clearRect(0, 0, ctx.width, ctx.height);
        
        // Show Placeholder / Hide Text
        if (placeholder) placeholder.classList.remove('hidden');
        if (centerText) centerText.classList.add('hidden');
        return;
    } else {
        // Show Text / Hide Placeholder
        if (placeholder) placeholder.classList.add('hidden');
        if (centerText) centerText.classList.remove('hidden');
    }

    // Destroy previous instance to avoid glitches
    if (window.myExpenseChart) {
        window.myExpenseChart.destroy();
    }

    // Update Center Total Text
    if(totalEl) {
        const currency = typeof getCurrency === 'function' ? getCurrency() : '₹';
        totalEl.textContent = `${currency}${totalAmount.toLocaleString()}`;
    }

    // Modern Color Palette (Matches Dashboard UI)
    const colors = [
        '#6366F1', // Indigo
        '#EC4899', // Pink
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#3B82F6', // Blue
        '#8B5CF6', // Violet
        '#F43F5E', // Rose
        '#06B6D4'  // Cyan
    ];

    // CREATE CHART
    window.myExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, values.length),
                borderWidth: 0,
                hoverOffset: 4,
                borderRadius: 4, // Rounded segments
                spacing: 2       // Slight gap between segments
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // Thinner modern ring
            animation: {
                animateScale: true,
                animateRotate: true
            },
            plugins: {
                legend: {
                    position: 'right', // Legend on right is cleaner
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        boxWidth: 6,
                        padding: 15,
                        font: {
                            size: 11,
                            family: "'Inter', sans-serif"
                        },
                        // Dynamic color for Dark Mode
                        color: document.body.classList.contains('dark') ? '#94a3b8' : '#64748b'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', // Dark Slate
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: { family: "'Inter', sans-serif", size: 13 },
                    bodyFont: { family: "'Inter', sans-serif", size: 12 },
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const currency = typeof getCurrency === 'function' ? getCurrency() : '₹';
                            return ` ${label}: ${currency}${value.toLocaleString()}`;
                        }
                    }
                }
            },
            layout: {
                padding: 10
            }
        }
    });
}

// --- 2. ANALYSIS LINE CHART (For Analysis Page) ---
function renderAnalysisChart(canvasId, labels, incomeData, expenseData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (window.myAnalysisChart) {
        window.myAnalysisChart.destroy();
    }

    const isDark = document.body.classList.contains('dark');

    window.myAnalysisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#10B981', // Emerald
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 2
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#F43F5E', // Rose
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderWidth: 2
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
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        color: isDark ? '#94a3b8' : '#64748b',
                        font: { family: "'Inter', sans-serif", size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDark ? '#fff' : '#1e293b',
                    bodyColor: isDark ? '#fff' : '#1e293b',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8,
                    titleFont: { family: "'Inter', sans-serif" },
                    bodyFont: { family: "'Inter', sans-serif" }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: isDark ? '#64748b' : '#94a3b8',
                        font: { size: 10 }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: isDark ? '#64748b' : '#94a3b8',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}