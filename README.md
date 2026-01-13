# 💰 FinTrack - Personal Expense Manager

A modern, responsive, and cloud-powered Personal Finance Management Web App (PWA) built to help you track expenses, manage budgets, and achieve financial goals.

🔗 **Live Demo:** [https://fintrack-expense-manager.netlify.app](https://fintrack-expense-manager.netlify.app)

---

## ✨ Key Features

### 🚀 New & Advanced Features

- **📷 OCR Receipt Scanning:** Scan bills/receipts to auto-fill transaction details using AI.
- **🎙️ Smart Voice Input:** Add transactions effortlessly using voice commands like “200 for Lunch” or “Salary 50000”.
- **🤝 Split Bill:** Manage shared expenses and track who owes whom.
- **📱 PWA Support:** Installable on mobile devices (Android/iOS) for a native app-like experience.
- **🔐 App Lock & Security:** Secure your financial data with a PIN code.
- **🌐 Multi-Language Support:** Available in English, Hindi, and Hinglish.
- **🔔 Bill Reminders:** Get notifications for upcoming or overdue bills.
- **🔄 Recurring Templates (Quick Fill):** Save frequent transactions (Rent, Netflix, etc.) and add them in one click.
- **🎯 Savings Goals:** Set financial targets (Laptop, Vacation, etc.) and track savings visually.
- **🤝 Debt Manager:** Maintain borrowed/lent money records so you never miss a pending payment.
- **🌙 Dark Mode Support:** Automatic (system default) and manual toggle support.
- **📥 CSV Export:** Download complete transaction history as a CSV file.
- **🧮 Built-in Calculator:** Perform quick calculations directly inside the Amount input.

---

## 🌟 Core Features

- **☁️ Cloud Sync (Firebase):** Real-time data storage accessible from any device.
- **🔐 Secure Authentication:** Email/Password login via Firebase Auth.
- **📊 Interactive Dashboard:** Category breakdown with dynamic pie charts.
- **🏦 Multi-Account Management:** Handle Cash, Bank, Wallet, and transfer funds easily.
- **📜 Advanced History & Search:** Filter by type, category, or keyword search.
- **📈 Financial Analysis:** Daily, weekly, monthly, and yearly insights with charts.

---

## 📂 Project Structure

| File / Page       | Description |
|------------------|-------------|
| **login.html** | User login & signup page. |
| **index.html** | Dashboard with charts, quick fill, OCR, and voice input. |
| **accounts.html** | Manage accounts (add/edit/delete/transfer). |
| **categories.html** | Manage custom income/expense categories. |
| **history.html** | View, filter, search, and export transactions. |
| **analysis.html** | Analyze spending with multiple time filters & forecasts. |
| **goals.html** | Savings goals with visual progress tracking. |
| **debt.html** | Manage borrowed/lent records. |
| **split-bill.html** | Split expenses among friends/groups. |
| **profile.html** | Update profile details and settings. |
| **settings.html** | App Lock, Language, Notifications & Budget settings. |
| **calendar.html** | View daily spending on a calendar view. |
| **service-worker.js**| Handles PWA caching and offline capabilities. |
| **manifest.json** | PWA configuration (Icons, Name, Theme Color). |
| **assets/js/** | Modular JavaScript for each feature. |
| **assets/css/** | Custom styles + Tailwind configs. |

---

## 🚀 How to Use

### **1. Sign Up / Login**
- Create an account using Email/Password.
- Default Accounts and Categories will be auto-created for you.

### **2. Add a Transaction**
- **Manual:** Enter details manually.
- **Voice:** Use the Mic button for voice input.
- **Scan:** Use the Camera button to scan a receipt.

### **3. Manage Your Finances**
- **Transfer:** Move money between accounts (e.g., Bank to Cash).
- **Debts:** Track borrowed/lent money in the Debt Manager.
- **Split:** Use the Split Bill feature for group expenses.
- **Goals:** Set and track savings for future purchases.

### **4. Analyze & Export**
- View detailed spending charts in the **Analysis** page.
- Export your full transaction history as CSV from the **History** page.

---

## 🧰 Technologies Used

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript  
- **Backend:** Google Firebase  
  - Firestore (Real-time NoSQL DB)  
  - Firebase Authentication  
- **Libraries:** - Chart.js (Visualizations)
  - Tesseract.js (OCR Scanning)
  - FontAwesome (Icons)

---

## 👨‍💻 Developed By

**Ammar Shaikh** 📧 Email: **ammarsk200422@gmail.com** 🌐 GitHub: **@Ammarsk22**

---

## 📜 License

This project is open-source and free to use under the **MIT License**.
