document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeCalendar(user.uid);
        }
    });
});

function initializeCalendar(userId) {
    const calendarDays = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('current-month-year');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    const selectedDateTitle = document.getElementById('selected-date-title');
    const dayTransactionsList = document.getElementById('day-transactions');
    
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    let transactionsMap = {}; // Stores transactions by date: "2024-03-12": [tx1, tx2]

    // Initial Load
    renderCalendar();

    // Event Listeners for Nav
    prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    });

    nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    });

    function renderCalendar() {
        // Update Header
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearText.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        calendarDays.innerHTML = '<div class="col-span-7 flex justify-center p-4"><div class="skeleton h-10 w-full"></div></div>'; // Loading state

        // Fetch Data for this month
        fetchMonthData(userId, currentYear, currentMonth).then(data => {
            transactionsMap = data;
            generateGrid();
        });
    }

    function generateGrid() {
        calendarDays.innerHTML = '';
        
        const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Empty slots for previous month days
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day bg-transparent';
            calendarDays.appendChild(emptyDiv);
        }

        const todayStr = new Date().toISOString().split('T')[0];

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            // Format date string YYYY-MM-DD (ensuring 0 padding)
            const monthStr = (currentMonth + 1).toString().padStart(2, '0');
            const dayStr = day.toString().padStart(2, '0');
            const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
            
            const dayEl = document.createElement('div');
            dayEl.className = `calendar-day relative bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all border border-gray-100 dark:border-gray-600 flex flex-col items-center justify-start pt-1 sm:pt-2 h-16 sm:h-24`;
            
            // Highlight Today
            if (dateKey === todayStr) {
                dayEl.classList.add('ring-2', 'ring-indigo-500');
            }

            // Day Number
            dayEl.innerHTML = `<span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${day}</span>`;

            // Indicators
            if (transactionsMap[dateKey]) {
                const dayTxs = transactionsMap[dateKey];
                const hasExpense = dayTxs.some(t => t.type === 'expense');
                const hasIncome = dayTxs.some(t => t.type === 'income');
                
                const indicatorContainer = document.createElement('div');
                indicatorContainer.className = 'flex gap-1 mt-1 sm:mt-2';
                
                if (hasExpense) {
                    indicatorContainer.innerHTML += `<div class="w-2 h-2 rounded-full bg-red-500"></div>`;
                }
                if (hasIncome) {
                    indicatorContainer.innerHTML += `<div class="w-2 h-2 rounded-full bg-green-500"></div>`;
                }
                dayEl.appendChild(indicatorContainer);
                
                // Show amount for desktop view only
                const total = dayTxs.reduce((sum, t) => t.type === 'expense' ? sum - t.amount : sum + t.amount, 0);
                const totalEl = document.createElement('span');
                totalEl.className = `text-[10px] mt-auto mb-1 hidden sm:block font-medium ${total >= 0 ? 'text-green-600' : 'text-red-500'}`;
                totalEl.textContent = total !== 0 ? Math.abs(total).toLocaleString() : '';
                dayEl.appendChild(totalEl);
            }

            // Click Event
            dayEl.addEventListener('click', () => {
                // Remove active class from others
                document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/30'));
                dayEl.classList.add('bg-indigo-50', 'dark:bg-indigo-900/30');
                
                showTransactionsForDate(dateKey, day);
            });

            calendarDays.appendChild(dayEl);
        }
    }

    async function fetchMonthData(uid, year, month) {
        // Construct date range strings
        const startStr = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
        // Last day of month calculation
        const lastDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay}`;

        const snapshot = await db.collection('users').doc(uid).collection('transactions')
            .where('date', '>=', startStr)
            .where('date', '<=', endStr)
            .orderBy('date', 'desc')
            .get();

        const map = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!map[data.date]) map[data.date] = [];
            map[data.date].push(data);
        });
        return map;
    }

    function showTransactionsForDate(dateKey, day) {
        // Format readable date
        const dateObj = new Date(dateKey);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        selectedDateTitle.textContent = dateObj.toLocaleDateString('en-US', options);
        
        dayTransactionsList.innerHTML = '';
        
        const txs = transactionsMap[dateKey];
        
        if (!txs || txs.length === 0) {
            dayTransactionsList.innerHTML = `
                <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                    <i class="fas fa-calendar-minus text-3xl mb-2"></i>
                    <p>No transactions on this day.</p>
                </div>`;
            return;
        }

        txs.forEach(t => {
            const isIncome = t.type === 'income';
            const colorClass = isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            const icon = isIncome ? 'fa-arrow-down' : 'fa-shopping-cart';
            
            const html = `
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${isIncome ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} flex items-center justify-center">
                            <i class="fas ${icon} text-xs"></i>
                        </div>
                        <div>
                            <p class="font-bold text-sm text-gray-800 dark:text-gray-200">${t.description}</p>
                            <p class="text-xs text-gray-500">${t.category}</p>
                        </div>
                    </div>
                    <p class="font-bold ${colorClass}">₹${t.amount.toLocaleString()}</p>
                </div>
            `;
            dayTransactionsList.innerHTML += html;
        });
    }
}