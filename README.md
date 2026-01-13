# 💰 FinTrack - Personal Expense Manager

A modern, responsive, and cloud-powered **Progressive Web App (PWA)** for tracking personal finances. Built with **HTML**, **Tailwind CSS**, **Vanilla JavaScript**, and **Firebase**, FinTrack offers a native app-like experience on both mobile and desktop.

It helps users manage income, expenses, subscriptions, and debts while providing deep insights through interactive charts and calendar views.

🔗 **Live Demo:** https://ammarsk22.github.io/expense-manager/login.html

---

## ✨ Key Features

### 🚀 Advanced & New Features

- **📱 PWA Support:** Install FinTrack as a native app on iOS/Android. Works offline!
- **📅 Smart Calendar View:** Visualize your daily spending and income on an interactive calendar.
- **🔄 Subscriptions & Recurring:** Set up auto-deducting transactions for Rent, Netflix, EMI, etc.
- **📄 PDF Reports:** Generate and download professional transaction statements.
- **📉 Trend Analysis:** View Line Charts to track Income vs. Expense trends over time.
- **🔔 Smart Budgeting:** Set monthly limits per category (e.g., ₹5000 for Food) and get alerts.

### 🌟 Core Features

- **🎙️ Smart Voice Input:** Add transactions via voice commands like "200 for Lunch".
- **☁️ Cloud Sync (Firebase):** Real-time data storage accessible from any device.
- **🔐 Secure Authentication:** Email/Password login via Firebase Auth.
- **📊 Interactive Dashboard:** Category breakdown with dynamic charts.
- **🏦 Multi-Account Management:** Handle Cash, Bank, Wallet, and transfer funds.
- **🎯 Savings Goals:** Set financial targets (Laptop, Vacation) and track progress.
- **🤝 Debt Manager:** Keep track of money borrowed or lent.
- **🌙 Dark Mode:** Fully optimized dark theme for night usage.
- **🧮 Built-in Calculator:** Perform calculations directly inside the amount field.

---

## 📂 Project Structure

| File / Page          | Description |
|----------------------|-------------|
| **login.html** | User login & signup with frosted glass UI. |
| **index.html** | Dashboard with charts, quick fill, and voice input. |
| **calendar.html** | **New:** Day-wise visual expense tracking. |
| **recurring.html** | **New:** Manage automated subscriptions. |
| **analysis.html** | Trend charts, Expense breakdown, and time filters. |
| **history.html** | Transaction list with Search, Filter & PDF Export. |
| **accounts.html** | Add accounts & Transfer funds. |
| **goals.html** | Savings goals with visual progress bars. |
| **debt.html** | Manage pending payments (Receivable/Payable). |
| **settings.html** | Dark Mode toggle, Monthly & Category Budgets. |
| **service-worker.js**| PWA Caching logic for offline support. |
| **manifest.json** | App metadata for mobile installation. |

---

## 🚀 How to Use

### **1. Install the App**
- Open in Chrome/Safari on Mobile.
- Tap "Add to Home Screen" or click the "Install" button in the dashboard header.

### **2. Add a Transaction**
- Use the **Dashboard** form to enter details manually.
- Or tap the **Mic** button and say: *"Spent 500 on Groceries"*.

### **3. Automate Expenses**
- Go to **Subscriptions**, add your Rent or Netflix bill, and set the frequency.
- FinTrack will automatically add these transactions on the due date.

### **4. Analyze Finances**
- Check the **Calendar** to see which days you spent the most.
- Go to **Analysis** to compare Income vs Expense trends.
- Download a **PDF Report** from the History page.

---

## 🧰 Technologies Used

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript  
- **Backend:** Google Firebase (Firestore & Auth)  
- **PWA:** Service Workers, Web Manifest  
- **Charts:** Chart.js  
- **PDF Generation:** jsPDF  
- **Icons:** FontAwesome

---

## 👨‍💻 Developed By

**Ammar Shaikh** 📧 Email: **ammarsk200422@gmail.com** 🌐 GitHub: **@Ammarsk22**

---

## 📜 License

This project is open-source and free to use under the **MIT License**.
