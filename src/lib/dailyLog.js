// src/lib/dailyLog.js

export function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function dailyStorageKey(petId, dateStr) {
  return `pawtrack:daily:${petId}:${dateStr}`;
}

export function loadDailyLog(petId, dateStr) {
  const raw = localStorage.getItem(dailyStorageKey(petId, dateStr));
  return raw ? JSON.parse(raw) : null;
}

export function saveDailyLog(petId, dateStr, data) {
  localStorage.setItem(dailyStorageKey(petId, dateStr), JSON.stringify(data));
}

export function getDailyLogsForPet(petId) {
  const logs = [];

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(`pawtrack:daily:${petId}:`)) {
      const date = key.split(":").pop();
      const data = JSON.parse(localStorage.getItem(key));
      logs.push({ date, ...data });
    }
  }

  return logs.sort((a, b) => b.date.localeCompare(a.date));
}
