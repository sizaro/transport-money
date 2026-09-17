import { getAuth, saveAuth, type AuthState } from "@/db/indexedDb";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const auth = await getAuth();

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export interface ApiLoginInput {
  phone: string;
  pin: string;
  deviceName?: string;
}

export interface ApiRegisterInput {
  phone: string;
  name: string;
  pin: string;
  vehicleType: "BODA" | "VEHICLE";
}

export interface ApiAuthResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    tenantId: string;
    phone: string;
    name: string;
  };
  device: {
    id: string;
    name: string | null;
  };
  authSessionId: string;
  vehicle: {
    id: string;
    type: "BODA" | "VEHICLE";
  };
}

export async function apiLogin(input: ApiLoginInput): Promise<ApiAuthResponse> {
  const result = await request<ApiAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });

  await saveAuth({
    token: result.token,
    authSessionId: result.authSessionId,
    userId: result.user.id,
    tenantId: result.user.tenantId,
    deviceId: result.device.id,
    phone: result.user.phone,
    name: result.user.name,
  });

  return result;
}

export async function apiRegister(
  input: ApiRegisterInput,
): Promise<ApiAuthResponse> {
  return request<ApiAuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutAccount(): Promise<void> {
  try {
    await request("/auth/logout", {
      method: "POST",
    });
  } finally {
    await import("@/db/indexedDb").then(({ clearAuth }) => clearAuth());
  }
}

export async function saveAuthResponse(
  response: ApiAuthResponse,
): Promise<AuthState> {
  const auth: AuthState = {
    token: response.token,
    userId: response.user.id,
    tenantId: response.user.tenantId,
    deviceId: response.device.id,
    authSessionId: response.authSessionId,
    phone: response.user.phone,
    name: response.user.name,
  };

  await saveAuth(auth);

  return auth;
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
