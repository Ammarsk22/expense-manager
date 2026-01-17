# 💰 FinTrack - Personal Expense Manager

A modern, smart, and cloud-powered progressive web application (PWA) for tracking personal finances. Built with **HTML**, **Tailwind CSS**, **Vanilla JavaScript**, and **Firebase**, it features AI capabilities, OCR scanning, and advanced security.

🔗 **Live Demo:** [https://fintrack-expense-manager.netlify.app/](https://fintrack-expense-manager.netlify.app/)

---

## ✨ Key Features

### 🚀 Smart & Advanced Features
- **📸 OCR Bill Scanning:** Scan receipts using Tesseract.js to automatically extract amount, date, and merchant name.
- **🤖 AI-Powered Categorization:** Smartly detects categories based on your description (e.g., "Uber" -> Travel).
- **🎙️ Voice Commands:** Add transactions naturally using voice (e.g., "Paid 200 for Burger").
- **📱 PWA Support:** Installable as a native app on Android, iOS, and Desktop with offline capabilities.
- **🔒 Advanced Security:**
  - **App Lock:** Secure the app with a 4-digit PIN.
  - **Privacy Mode:** Blur sensitive amounts when in public.
- **🌍 Multi-Language Support:** Fully localized in **English** and **Hindi**.

### 🌟 Core Management
- **🔄 Recurring Templates:** Save frequent transactions for 1-click entry.
- **🎯 Financial Goals:** Set savings targets (e.g., New Phone) and track progress visually.
- **🤝 Debt Manager:** Track money borrowed from or lent to friends.
- **💸 Split Bill:** Calculate shared expenses easily.
- **🌙 Dark Mode:** Beautiful glassmorphism UI with system-sync dark mode.
- **📥 Data Export:** Download full transaction history as CSV or PDF.
- **🧮 In-Built Calculator:** Perform calculations directly inside the input fields.

---

## 📂 Project Structure

| File / Page       | Description |
|------------------|-------------|
| **index.html** | Main Dashboard with OCR, Voice, and Quick Actions. |
| **login.html** | Secure Email/Password authentication. |
| **analysis.html** | Visual charts (Pie/Line) to analyze spending trends. |
| **goals.html** | Create and track savings goals. |
| **debt.html** | Manage debts and loans. |
| **scan.js** | Logic for OCR receipt scanning (Tesseract.js). |
| **ai.js** | Logic for auto-categorization and smart formatting. |
| **security.js** | Logic for PIN Lock, Biometrics, and Privacy Mode. |
| **lang.js** | Localization engine (English/Hindi). |
| **voice.js** | Web Speech API integration for voice input. |

---

## 🚀 How to Use

### **1. Install the App**
- Open the link in Chrome/Safari.
- Click **"Add to Home Screen"** or **"Install"** to use it as a native app.

### **2. Add Transactions Smartly**
- **Scan:** Click the Camera icon to snap a bill.
- **Voice:** Click the Mic icon and say "Lunch 500".
- **Manual:** Type details and let AI auto-select the category.

### **3. Secure Your Data**
- Go to **Settings > Security**.
- Enable **App Lock** to set a PIN.
- Toggle **Privacy Mode** to hide balances in public.

### **4. Analyze & Grow**
- Check **Analysis** for monthly breakdowns.
- Use **Goals** to save for your dreams.

---

## 🧰 Technologies Used

- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript  
- **Backend:** Google Firebase (Firestore, Auth)
- **AI/ML:** Tesseract.js (OCR), Web Speech API (Voice)
- **Visualization:** Chart.js
- **Icons:** FontAwesome

---

## 👨‍💻 Developed By

**Ammar Shaikh** 📧 Email: **ammarsk200422@gmail.com** 🌐 GitHub: **[@Ammarsk22](https://github.com/Ammarsk22)**

---

## 📜 License

This project is open-source and free to use under the **MIT License**.
