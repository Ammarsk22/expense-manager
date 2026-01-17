document.addEventListener('DOMContentLoaded', () => {
    // Initial State: 2 People
    addPerson('You');
    addPerson('Friend');
});

function addPerson(nameValue = '') {
    const list = document.getElementById('people-list');
    const id = Date.now();
    
    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 animate-fade-in';
    div.id = `person-${id}`;
    
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <i class="fas fa-user"></i>
        </div>
        <input type="text" class="person-name flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Name" value="${nameValue}">
        <button onclick="removePerson('${id}')" class="w-10 h-10 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    list.appendChild(div);
}

function removePerson(id) {
    const el = document.getElementById(`person-${id}`);
    if (el) el.remove();
}

function calculateSplit() {
    if(window.triggerHaptic) window.triggerHaptic(50);

    const amountInput = parseFloat(document.getElementById('total-amount').value);
    const tipPercent = parseFloat(document.getElementById('tip-percent').value) || 0;
    const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
    
    const peopleInputs = document.querySelectorAll('.person-name');
    const people = [];
    peopleInputs.forEach(input => {
        if(input.value.trim() !== '') people.push(input.value.trim());
    });

    if (isNaN(amountInput) || amountInput <= 0) {
        alert("Please enter a valid bill amount.");
        return;
    }

    if (people.length === 0) {
        alert("Please add at least one person.");
        return;
    }

    // Calculations
    const tipAmount = amountInput * (tipPercent / 100);
    const taxAmount = amountInput * (taxPercent / 100);
    const totalBill = amountInput + tipAmount + taxAmount;
    const splitAmount = totalBill / people.length;

    // Update UI
    document.getElementById('split-per-person').innerText = `₹${formatMoney(splitAmount)}`;
    document.getElementById('final-total').innerText = `₹${formatMoney(totalBill)}`;
    document.getElementById('total-people').innerText = people.length;

    const resultList = document.getElementById('result-list');
    resultList.innerHTML = '';

    people.forEach(person => {
        const html = `
            <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 text-xs font-bold">
                        ${person.charAt(0).toUpperCase()}
                    </div>
                    <span class="font-medium text-gray-800 dark:text-white text-sm">${person}</span>
                </div>
                <span class="font-bold text-gray-900 dark:text-white">₹${formatMoney(splitAmount)}</span>
            </div>
        `;
        resultList.insertAdjacentHTML('beforeend', html);
    });
}

function resetSplit() {
    document.getElementById('total-amount').value = '';
    document.getElementById('tip-percent').value = '';
    document.getElementById('tax-percent').value = '';
    document.getElementById('people-list').innerHTML = '';
    addPerson('You');
    addPerson('Friend');
    document.getElementById('split-per-person').innerText = '₹0';
    document.getElementById('final-total').innerText = '₹0';
    document.getElementById('result-list').innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Enter amount and people to see results.</p>';
}

function formatMoney(amount) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}