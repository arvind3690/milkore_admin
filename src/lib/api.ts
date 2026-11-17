'use client';

/** Browser-side API client. Talks only to our own /api routes (cookies carry the session). */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  statusCode: number;
  message: string;
  data: T | null;
  errors?: Record<string, string[]>;
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}) },
    credentials: 'same-origin',
  });
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (res.status === 401 && typeof window !== 'undefined' && !url.startsWith('/api/auth/login')) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok || !body) {
    throw new ApiError(body?.message ?? `Request failed (${res.status})`, res.status, body?.errors);
  }
  return body.data as T;
}

const q = (params?: Record<string, string | number | boolean | undefined | null>) => {
  if (!params) return '';
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

/** `path` is relative to /admin on the API (e.g. "vendors?status=PENDING"). */
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined | null>) =>
    request<T>(`/api/proxy/${path}${q(params)}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(`/api/proxy/${path}`, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(`/api/proxy/${path}`, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  login: (email: string, password: string, totp?: string) =>
    request<{ admin: Admin }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password, totp }) }),
  logout: () => request<null>('/api/auth/logout', { method: 'POST' }),
  me: () => request<Admin>('/api/auth/me'),
};

// ─────────────────────────────── shared types ───────────────────────────────

export type VendorStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MODERATOR';
  status: 'ACTIVE' | 'DISABLED';
  totpEnabled: boolean;
  lastLoginAt: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface Stats {
  customers: number;
  vendorUsers: number;
  vendorsByStatus: Record<VendorStatus, number>;
  activeProducts: number;
  conversations: number;
  messagesLast7Days: number;
  callsLast7Days: number;
  signupsLast7Days: number;
  signupsLast30Days: number;
  openReports: number;
  openTickets: number;
  signupsByDay: { day: string; customers: number; vendors: number }[];
}

export interface VendorRow {
  id: string;
  businessName: string | null;
  ownerName: string | null;
  contactPhone: string | null;
  approvalStatus: VendorStatus;
  isAvailable: boolean;
  city: string | null;
  locality: string | null;
  pincode: string | null;
  productCount: number;
  submittedAt: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: { id: string; slug: string; nameEn: string; nameHi: string };
  unit: { code: string; labelEn: string };
  pricePaise: number;
  priceDisplay: string;
  isAvailable: boolean;
  moderationStatus: 'ACTIVE' | 'REMOVED_BY_ADMIN';
  removedReason: string | null;
  imageUrl: string | null;
  vendor?: { id: string; businessName: string | null };
}

export interface VendorDetail {
  id: string;
  approvalStatus: VendorStatus;
  rejectionReason: string | null;
  suspensionReason: string | null;
  ownerName: string | null;
  businessName: string | null;
  description: string | null;
  operatingHours: Record<string, { open: string; close: string; closed: boolean }> | null;
  isAvailable: boolean;
  contactPhone: string | null;
  profilePhotoUrl: string | null;
  shopPhotoUrl: string | null;
  location: {
    addressLine: string;
    locality: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    lat: number;
    lng: number;
  } | null;
  serviceAreas: { radiusMeters: number | null; pincodes: string[]; localities: string[] };
  completion: { percent: number; missing: string[] };
  submittedAt: string | null;
  approvedAt: string | null;
  user: { id: string; phone: string; name: string | null; status: string; createdAt: string; lastLoginAt: string | null } | null;
  history: { id: string; fromStatus: VendorStatus; toStatus: VendorStatus; note: string | null; adminId: string | null; createdAt: string }[];
  products: Product[];
  counts: { reports: number; conversations: number; calls: number };
}

export interface UserRow {
  id: string;
  phone: string;
  name: string | null;
  role: 'CUSTOMER' | 'VENDOR';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  preferredLanguage: string;
  createdAt: string;
  lastLoginAt: string | null;
  customerProfile: { addressLabel: string | null; pincode: string | null } | null;
  vendorProfile: { id: string; approvalStatus: VendorStatus; businessName: string | null } | null;
}

export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameHi: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
  _count: { products: number };
}

export interface Report {
  id: string;
  targetType: 'VENDOR' | 'PRODUCT' | 'USER' | 'MESSAGE';
  targetId: string;
  targetLabel: string | null;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  resolutionNote: string | null;
  createdAt: string;
  reporter: { id: string; name: string | null; phone: string } | null;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  adminNote: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string; role: string } | null;
}

export interface AuditEntry {
  id: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
}

// ─────────────────────────────── notifications (ADR-022) ───────────────────────────────

export type AudienceType = 'ALL' | 'ROLE' | 'USERS' | 'LOCATION' | 'VENDOR_STATUS';

export interface Audience {
  type: AudienceType;
  role?: 'CUSTOMER' | 'VENDOR';
  userIds?: string[];
  city?: string;
  pincode?: string;
  approvalStatus?: VendorStatus;
}

/** Screen the app opens on tap. CHAT is automatic-only, so it isn't offered here. */
export type CampaignTarget = 'HOME' | 'NOTIFICATIONS' | 'VENDOR_DASHBOARD' | 'VENDOR_PRODUCTS' | 'SUPPORT' | 'VENDOR_DETAILS';

export interface AudiencePreview {
  recipients: number;
  reachable: number;
  label: string;
}

export interface Campaign {
  id: string;
  titleEn: string;
  bodyEn: string;
  titleHi: string | null;
  bodyHi: string | null;
  audience: Audience;
  audienceLabel: string;
  target: CampaignTarget | 'CHAT';
  targetParams: { vendorId?: string };
  status: 'SENDING' | 'SENT' | 'FAILED';
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  noDeviceCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string; email: string } | null;
  readCount?: number;
}
