const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

/**
 * Thin fetch wrapper that:
 * - Prefixes the API base URL
 * - Attaches the JWT from localStorage as a Bearer token
 * - Parses the JSON response
 * - Throws an Error with the server's message on non-2xx responses
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("pawtrack_token");

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data;
}
