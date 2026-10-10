export class ApiError extends Error {
  constructor(message, { status, detail, code } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

export function jsonRequest(path, method, data) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function request(path, options = {}) {
  const response = await fetch("/api/v1" + path, {
    credentials: "same-origin",
    ...options,
  });
  if (response.status === 204) return null;
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new ApiError("Invalid JSON response", {
      status: response.status, code: "INVALID_JSON",
    });
  }
  if (!response.ok) {
    throw new ApiError("Request failed", {
      status: response.status, detail: data?.detail,
    });
  }
  return data;
}
