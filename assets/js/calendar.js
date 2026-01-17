document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeCalendar(user.uid);
        }
    });
});

function initializeCalendar(userId) {
    const calendarBody = document.getElementById('calendar-body');
    const monthDisplay = document.getElementById('current-month-display');
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    
    const detailsPanel = document.getElementById('date-details-panel');
    const detailsTitle = document.getElementById('selected-date-title');
    const detailsList = document.getElementById('selected-date-list');

    const incomeEl = document.getElementById('cal-income');
    const expenseEl = document.getElementById('cal-expense');

    let currentDate = new Date();
    let currentTransactions = [];

    // --- 1. FETCH DATA ---
    function fetchData() {
        // Range: Start to End of current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

        // Fetching slightly more to be safe, filtering client side for simplicity
        // Ideally use 'where' clauses for start/end date
        db.collection('users').doc(userId).collection('transactions')
            .orderBy('date', 'desc')
            .get()
            .then(snapshot => {
                const allData = snapshot.docs.map(doc => doc.data());
                
                // Filter for current month view
                currentTransactions = allData.filter(t => {
                    const d = new Date(t.date);
                    return d >= startOfMonth && d <= endOfMonth;
                });

                renderCalendar();
                updateStats();
            });
    }

    // --- 2. RENDER CALENDAR ---
    function renderCalendar() {
        calendarBody.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Update Header
        monthDisplay.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell bg-gray-50/30 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/50';
            calendarBody.appendChild(emptyCell);
        }

        // Days
        const today = new Date();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Find transactions for this day
            const dailyTx = currentTransactions.filter(t => t.date === dateStr);
            let dailyIncome = 0;
            let dailyExpense = 0;
            dailyTx.forEach(t => {
                if(t.type === 'income') dailyIncome += t.amount;
                else dailyExpense += t.amount;
            });

            // Cell Container
            const cell = document.createElement('div');
            // Base classes
            cell.className = 'calendar-cell border border-gray-100 dark:border-gray-800 p-1 relative hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex flex-col items-center md:items-start md:p-2';
            
            // Highlight Today
            if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                cell.classList.add('bg-indigo-50', 'dark:bg-indigo-900/20');
            }

            // Date Number
            const dateNum = document.createElement('span');
            dateNum.className = `text-xs md:text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-700 dark:text-gray-300'
            }`;
            dateNum.innerText = day;
            cell.appendChild(dateNum);

            // Indicators
            if (dailyTx.length > 0) {
                // MOBILE: Dots
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'flex gap-1 mt-1 md:hidden';
                if (dailyIncome > 0) dotsContainer.innerHTML += `<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>`;
                if (dailyExpense > 0) dotsContainer.innerHTML += `<div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div>`;
                cell.appendChild(dotsContainer);

                // DESKTOP: Text
                const textContainer = document.createElement('div');
                textContainer.className = 'hidden md:flex flex-col w-full mt-1 gap-0.5';
                if (dailyIncome > 0) {
                    textContainer.innerHTML += `<span class="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1 rounded truncate">+${dailyIncome}</span>`;
                }
                if (dailyExpense > 0) {
                    textContainer.innerHTML += `<span class="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-1 rounded truncate">-${dailyExpense}</span>`;
                }
                cell.appendChild(textContainer);
            }

            // Click Event
            cell.addEventListener('click', () => showDetails(dateStr, dailyTx));

            calendarBody.appendChild(cell);
        }
    }

    // --- 3. SHOW DETAILS ---
    function showDetails(dateStr, transactions) {
        if(window.triggerHaptic) window.triggerHaptic(10);
        
        detailsPanel.classList.remove('hidden');
        
        // Format Date Title
        const dateObj = new Date(dateStr);
        detailsTitle.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
        
        detailsList.innerHTML = '';

        if (transactions.length === 0) {
            detailsList.innerHTML = '<p class="text-sm text-gray-400 text-center py-2">No transactions.</p>';
            return;
        }

        transactions.forEach(t => {
            const isInc = t.type === 'income';
            const color = isInc ? 'text-emerald-600' : 'text-gray-900 dark:text-white';
            const sign = isInc ? '+' : '-';
            
            const html = `
                <div class="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div>
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">${t.description}</p>
                        <p class="text-xs text-gray-500">${t.category}</p>
                    </div>
                    <span class="font-bold text-sm ${color}">${sign}₹${t.amount}</span>
                </div>
            `;
            detailsList.insertAdjacentHTML('beforeend', html);
        });
    }

    // --- 4. UPDATE STATS ---
    function updateStats() {
        let totalInc = 0;
        let totalExp = 0;
        currentTransactions.forEach(t => {
            if(t.type === 'income') totalInc += t.amount;
            else totalExp += t.amount;
        });
        incomeEl.innerText = `₹${totalInc.toLocaleString()}`;
        expenseEl.innerText = `₹${totalExp.toLocaleString()}`;
    }

    // --- 5. NAVIGATION ---
    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        fetchData();
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        fetchData();
    });

    // Load initial
    fetchData();
}