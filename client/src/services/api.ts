const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function apiRequest(endpoint: string, method = "GET", body?: any) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return res.json();
}
