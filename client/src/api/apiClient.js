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

/**
 * Like apiFetch but returns a Blob — used for file downloads (PDF, etc.).
 * Throws an Error with the server message if the response is not ok.
 */
export async function apiFetchBlob(path, options = {}) {
  const token = localStorage.getItem("pawtrack_token");

  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Request failed");
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "report.pdf";
  return { blob, filename };
}
