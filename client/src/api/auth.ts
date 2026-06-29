const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  name: string;
  firstName: string;
  lastName: string;
};

type AuthResponse = {
  message?: string;
  user: SessionUser;
};

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Something went wrong.";
    throw new Error(message);
  }

  return data as T;
}

export const authApi = {
  login(payload: LoginPayload) {
    return request<AuthResponse>("/users/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  register(payload: RegisterPayload) {
    return request<AuthResponse>("/users/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return request<{ user: SessionUser }>("/users/me");
  },
  logout() {
    return request<{ message: string }>("/users/logout", { method: "POST" });
  },
};
