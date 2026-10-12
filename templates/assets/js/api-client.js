export class ApiError extends Error {
  constructor(message, { status, detail, code } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

let refreshRequestInFlight = null;

async function refreshAccessToken() {
  if (refreshRequestInFlight) return refreshRequestInFlight;

  refreshRequestInFlight = fetch("/api/v1/users/refresh-token", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }).then(async (response) => {
    const raw = await response.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      // The backend may return a plain-text or empty response, so treat it as non-blocking.
    }

    if (!response.ok) {
      throw new ApiError(data?.detail || "Refresh token failed", {
        status: response.status,
        detail: data?.detail,
        code: "REFRESH_TOKEN_FAILED",
      });
    }

    return true;
  }).finally(() => {
    refreshRequestInFlight = null;
  });

  return refreshRequestInFlight;
}

export function jsonRequest(path, method, data) {
  return request(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function request(path, options = {}) {
  const isRetry = Boolean(options._retry);
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
    const isAuthError = response.status === 401 || response.status === 403;
    const isRefreshRequest = path === "/users/refresh-token";

    if (isAuthError && !isRefreshRequest && !isRetry) {
      try {
        await refreshAccessToken();
        return request(path, { ...options, _retry: true });
      } catch (error) {
        throw error;
      }
    }

    throw new ApiError(data?.detail || "Request failed", {
      status: response.status,
      detail: data?.detail,
    });
  }

  return data;
}
