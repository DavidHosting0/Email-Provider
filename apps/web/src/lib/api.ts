// In the browser, use same-origin /api/v1 (proxied by Nginx in production).
// Falls back to env/localhost for local dev.
const API_URL =
  typeof window !== 'undefined'
    ? '/api/v1'
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1');

export interface ApiError {
  error: string;
  details?: unknown;
}

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    let res = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        headers.Authorization = `Bearer ${this.accessToken}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
      }
    }

    if (res.status === 204) return undefined as T;

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Request failed');
    return data as T;
  }

  private async tryRefresh(): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) {
        this.clearTokens();
        return false;
      }
      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  login(email: string, password: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string | null; role: string; organizationId: string; organizationName: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  logout() {
    return this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });
  }

  me() {
    return this.request<{ id: string; email: string; name: string | null; role: string; organizationId: string; organizationName: string }>('/auth/me');
  }

  getOrg() {
    return this.request<{ id: string; name: string; slug: string; _count: { users: number; domains: number } }>('/org');
  }

  getDomains() {
    return this.request<Array<{ id: string; name: string; verificationStatus: string; _count: { mailboxes: number } }>>('/domains');
  }

  createDomain(name: string) {
    return this.request('/domains', { method: 'POST', body: JSON.stringify({ name }) });
  }

  deleteDomain(id: string) {
    return this.request(`/domains/${id}`, { method: 'DELETE' });
  }

  getDnsInstructions(id: string) {
    return this.request<{ domain: string; verificationStatus: string; records: Array<{ type: string; name: string; value: string; purpose: string }>; webhookUrl: string }>(`/domains/${id}/dns-instructions`);
  }

  getMailboxes() {
    return this.request<Array<{ id: string; localPart: string; displayName: string | null; isEnabled: boolean; address: string; domain: { name: string } }>>('/mailboxes');
  }

  createMailbox(data: { domainId: string; localPart: string; displayName?: string }) {
    return this.request('/mailboxes', { method: 'POST', body: JSON.stringify(data) });
  }

  deleteMailbox(id: string) {
    return this.request(`/mailboxes/${id}`, { method: 'DELETE' });
  }

  getInbox(mailboxId: string) {
    return this.request<Array<{ id: string; subject: string; lastMessageAt: string; preview: { fromAddr: string; bodyText: string | null; isRead: boolean }; unread: boolean }>>(`/mailboxes/${mailboxId}/inbox`);
  }

  getSent(mailboxId: string) {
    return this.request<Array<{ id: string; subject: string; toAddrs: string[]; status: string; createdAt: string; bodyText: string | null }>>(`/mailboxes/${mailboxId}/sent`);
  }

  getTrash(mailboxId: string) {
    return this.request(`/mailboxes/${mailboxId}/trash`);
  }

  getThread(threadId: string) {
    return this.request<{ id: string; subject: string; inboxEmails: Array<{ id: string; fromAddr: string; toAddrs: string[]; subject: string; bodyText: string | null; bodyHtml: string | null; receivedAt: string }> }>(`/threads/${threadId}`);
  }

  sendEmail(mailboxId: string, data: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; bodyText?: string; bodyHtml?: string; threadId?: string }) {
    return this.request<{ id: string; status: string }>(`/mailboxes/${mailboxId}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getUsers() {
    return this.request<Array<{ id: string; email: string; name: string | null; role: string; mailboxAccess: Array<{ mailboxId: string }> }>>('/users');
  }

  createUser(data: { email: string; password: string; role?: string; name?: string }) {
    return this.request('/users', { method: 'POST', body: JSON.stringify(data) });
  }

  deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  assignMailboxes(userId: string, mailboxIds: string[]) {
    return this.request(`/users/${userId}/mailboxes`, {
      method: 'POST',
      body: JSON.stringify({ mailboxIds }),
    });
  }
}

export const api = new ApiClient();
