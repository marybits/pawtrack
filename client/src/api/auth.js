const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function request(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}

export const registerUser = (username, email, password) =>
  request("/api/users/register", { username, email, password });

export const loginUser = (username, password) =>
  request("/api/users/login", { username, password });
