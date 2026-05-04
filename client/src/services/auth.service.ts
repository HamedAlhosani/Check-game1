export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const data = await post('/api/auth/login', { email, password });
  localStorage.setItem('auth_token', data.token);
  return { uid: data.uid, email, displayName: null };
}

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<AuthUser> {
  const data = await post('/api/auth/register', { email, password, displayName });
  localStorage.setItem('auth_token', data.token);
  return { uid: data.uid, email, displayName };
}

export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const data = await post('/api/auth/google', { idToken });
  localStorage.setItem('auth_token', data.token);
  return { uid: data.uid, email: data.email, displayName: data.displayName };
}

export async function logout(): Promise<void> {
  localStorage.removeItem('auth_token');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
}
