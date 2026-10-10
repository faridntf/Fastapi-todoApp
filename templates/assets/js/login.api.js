import { request, jsonRequest } from "./api-client.js";

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
