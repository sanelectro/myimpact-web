import {
  getAccessToken,
  getCurrentUserId,
  refreshSession,
} from "../auth/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8000";
const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8001";

async function requestAt<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const sendRequest = (accessToken: string) => {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(`${baseUrl}${path}`, { ...options, headers });
  };

  let response = await sendRequest(getAccessToken());
  if (response.status === 401) {
    const session = await refreshSession();
    if (!session) throw new Error("Your session has expired. Sign in again.");
    response = await sendRequest(session.accessToken);
  }

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
        detail?: string;
      };
      message = body.error?.message ?? body.detail ?? message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function apiRequest<T>(path: string, options: RequestInit = {}) {
  return requestAt<T>(API_BASE_URL, path, options);
}

export function authRequest<T>(path: string, options: RequestInit = {}) {
  return requestAt<T>(AUTH_BASE_URL, path, options);
}

export async function apiFileRequest(url: string): Promise<Blob> {
  const sendRequest = (accessToken: string) => {
    const headers = new Headers({ Authorization: `Bearer ${accessToken}` });
    return fetch(url, { headers });
  };

  let response = await sendRequest(getAccessToken());
  if (response.status === 401) {
    const session = await refreshSession();
    if (!session) throw new Error("Your session has expired. Sign in again.");
    response = await sendRequest(session.accessToken);
  }
  if (!response.ok) {
    let message = `File request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.blob();
}

export function getCurrentUserIdForApi() {
  return getCurrentUserId();
}
