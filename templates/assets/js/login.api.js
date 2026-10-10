import { request, jsonRequest } from "./api-client.js";

export async function hasActiveSession() {
  try {
    const user = await request("/users/user_detail", { cache: "no-store" });
    return typeof user?.username === "string" && user.username.length > 0;
  } catch (error) {
    if (error.status === 401 || error.status === 403) return false;
    throw error;
  }
}

export function login({ username, password }) {
  return request("/users/login", {
    method: "POST",
    body: new URLSearchParams({ username, password }),
  });
}

export function register({ username, email, password, re_password, phone_number }) {
  const data = { username, email, password, re_password };
  if (phone_number) data.phone_number = phone_number;
  return jsonRequest("/users/register", "POST", data);
}
