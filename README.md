# PawTrack 🐾

PawTrack is a pet care tracking app designed to help pet owners keep daily records of their pets’ routines, health, and activities in a simple and organized way.

This project is built as a learning-focused React application, emphasizing clean state management, reusable components, and real-world app structure.

---

## ✨ Features

### 🐶🐱 Pet Management
- View and select pets
- Separate profiles per pet
- Species-aware behavior (cats vs dogs)

### ✅ Daily Check
Each pet has a **daily care log** that includes:
- Water
- Food
  - Dry food (cups)
  - Wet food (can amount / spoon count)
- Medication
- Playtime (duration)
- Walks (for dogs only, with duration)
- Litter box (for cats only)
- Free-form daily notes

All daily logs are **saved automatically** and scoped by:
- Pet
- Date

### 📅 Daily History
- View past daily logs
- See summaries per day (food, playtime, walks, notes)
- Data persists using `localStorage`
  

## 🧠 Technical Highlights
- **React + Vite**
- **Tailwind CSS** for UI styling
- Local state management with `useState`, `useEffect`, and `useMemo`


## 📂 Project Structure
src/
├── components/
│ └── layout/
│ ├── AppShell.jsx
│ └── PetListItem.jsx
├── pages/
│ ├── Pets.jsx
│ ├── PetProfile.jsx
│ ├── DailyCheck.jsx
│ ├── DailyHistory.jsx
│ ├── PetRoutine.jsx
│ └── Emergency.jsx
├── lib/
│ └── dailyLog.js
├── App.jsx
├── main.jsx
└── index.css


## 🚀 Getting Started

```bash
npm install
npm run dev


