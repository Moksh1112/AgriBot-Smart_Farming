import { API_BASE_URL } from '@/constants/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
};

type AuthResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
};

async function requestAuth<T extends AuthResponse>(path: string, options: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Unable to reach the AgriBot server. Check that it is running and connected to the same network.');
  }

  let body: T | null = null;
  try {
    body = (await response.json()) as T;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    throw new Error(body?.message || 'The AgriBot server returned an unexpected response.');
  }

  return body;
}

export async function signupRequest(name: string, email: string, password: string) {
  return requestAuth<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function loginRequest(email: string, password: string) {
  const response = await requestAuth<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!response.token) {
    throw new Error('Login succeeded, but no authentication token was returned.');
  }

  return { token: response.token, user: response.user };
}

export async function getCurrentUser(token: string) {
  const response = await requestAuth<AuthResponse>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.user;
}
