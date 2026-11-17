'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import {
  api,
  type Audience,
  type AudiencePreview,
  type AudienceType,
  type Campaign,
  type CampaignTarget,
  type Page,
  type UserRow,
  type VendorRow,
  type VendorStatus,
} from '@/lib/api';
import { ActionDialog, Button, Card, ErrorNote, Input, Loading, Pagination, Select, StatusPill, Table, fmtDate } from '@/components/ui';

const TITLE_MAX = 65;
const BODY_MAX = 240;

const AUDIENCES: { value: AudienceType; label: string; superOnly?: boolean }[] = [
  { value: 'USERS', label: 'Selected users' },
  { value: 'LOCATION', label: 'City or PIN code' },
  { value: 'VENDOR_STATUS', label: 'Vendors by status' },
  { value: 'ROLE', label: 'Everyone in a role', superOnly: true },
  { value: 'ALL', label: 'All users', superOnly: true },
];

const TARGETS: { value: CampaignTarget; label: string; vendorOnly?: boolean }[] = [
  { value: 'NOTIFICATIONS', label: 'Notifications inbox' },
  { value: 'HOME', label: 'Home (nearby sellers)' },
  { value: 'VENDOR_DETAILS', label: 'A seller’s page' },
  { value: 'SUPPORT', label: 'Help & support' },
  { value: 'VENDOR_DASHBOARD', label: 'My shop (vendors only)', vendorOnly: true },
  { value: 'VENDOR_PRODUCTS', label: 'My products (vendors only)', vendorOnly: true },
];

const VENDOR_STATUSES: VendorStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];

/** Mirrors the API rule: vendor-only screens need an audience that contains only vendors. */
const isVendorOnly = (a: Audience) =>
  (a.type === 'ROLE' && a.role === 'VENDOR') || a.type === 'VENDOR_STATUS' || (a.type === 'LOCATION' && a.role === 'VENDOR');

/** Debounce a value so typing doesn't fire a request per key. */
function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-baseline justify-between text-sm font-semibold text-slate-800">
        {label}
        {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
    />
  );
}

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Push notifications</h1>
        <p className="text-sm text-slate-600">
          Send a message to app users. Everyone in the audience gets it in their in-app inbox; people who allow
          announcements also get a phone notification. Automatic notifications (chat, shop status, support) are sent by the system.
        </p>
      </div>
      <Composer />
      <History />
    </div>
  );
}

// ─────────────────────────────── compose ───────────────────────────────

function Composer() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const isSuper = admin?.role === 'SUPER_ADMIN';

  const [titleEn, setTitleEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [bodyHi, setBodyHi] = useState('');
  const [type, setType] = useState<AudienceType>('USERS');
  const [role, setRole] = useState<'' | 'CUSTOMER' | 'VENDOR'>('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<VendorStatus>('PENDING');
  const [selected, setSelected] = useState<UserRow[]>([]);
  const [target, setTarget] = useState<CampaignTarget>('NOTIFICATIONS');
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<Campaign | null>(null);

  const audience: Audience = useMemo(() => {
    switch (type) {
      case 'ALL':
        return { type };
      case 'ROLE':
        return { type, role: role || 'CUSTOMER' };
      case 'USERS':
        return { type, userIds: selected.map((u) => u.id) };
      case 'LOCATION':
        return { type, ...(role ? { role } : {}), ...(city.trim() ? { city: city.trim() } : {}), ...(/^\d{6}$/.test(pincode) ? { pincode } : {}) };
      case 'VENDOR_STATUS':
        return { type, approvalStatus };
    }
  }, [type, role, selected, city, pincode, approvalStatus]);

  const audienceReady =
    (type !== 'USERS' || selected.length > 0) && (type !== 'LOCATION' || !!audience.city || !!audience.pincode);
  const debouncedAudience = useDebounced(audience);
  const preview = useQuery({
    queryKey: ['audience-preview', debouncedAudience],
    queryFn: () => api.post<AudiencePreview>('notifications/audience-preview', { audience: debouncedAudience }),
    enabled: audienceReady,
    placeholderData: keepPreviousData,
  });

  const vendorOnly = isVendorOnly(audience);
  const targets = TARGETS.filter((t) => !t.vendorOnly || vendorOnly);
  // Keep the chosen screen valid when the audience changes.
  useEffect(() => {
    if (!vendorOnly && TARGETS.find((t) => t.value === target)?.vendorOnly) setTarget('NOTIFICATIONS');
  }, [vendorOnly, target]);

  const hiPartial = (titleHi.trim() === '') !== (bodyHi.trim() === '');
  const textOk = titleEn.trim().length >= 3 && bodyEn.trim().length >= 3 && !hiPartial;
  const targetOk = target !== 'VENDOR_DETAILS' || !!vendor;
  const recipients = preview.data?.recipients ?? 0;
  const canSend = textOk && audienceReady && targetOk && recipients > 0 && !preview.isFetching;

  const reset = () => {
    setTitleEn('');
    setBodyEn('');
    setTitleHi('');
    setBodyHi('');
    setSelected([]);
    setVendor(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card title="New notification">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">English (required)</p>
              <Field label="Title" hint={`${titleEn.length}/${TITLE_MAX}`}>
                <Input value={titleEn} maxLength={TITLE_MAX} onChange={(e) => setTitleEn(e.target.value)} placeholder="Fresh paneer this Sunday" />
              </Field>
              <Field label="Message" hint={`${bodyEn.length}/${BODY_MAX}`}>
                <TextArea rows={3} value={bodyEn} maxLength={BODY_MAX} onChange={(e) => setBodyEn(e.target.value)} placeholder="Order from dairies near you before 9 am." />
              </Field>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hindi (optional, for Hindi users)</p>
              <Field label="शीर्षक" hint={`${titleHi.length}/${TITLE_MAX}`}>
                <Input lang="hi" value={titleHi} maxLength={TITLE_MAX} onChange={(e) => setTitleHi(e.target.value)} />
              </Field>
              <Field label="संदेश" hint={`${bodyHi.length}/${BODY_MAX}`}>
                <TextArea lang="hi" rows={3} value={bodyHi} maxLength={BODY_MAX} onChange={(e) => setBodyHi(e.target.value)} />
              </Field>
              {hiPartial && <p className="text-xs text-red-700">Fill both Hindi fields, or leave both empty.</p>}
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Who gets it</p>
            <div className="flex flex-wrap gap-3">
              <Select value={type} onChange={(e) => setType(e.target.value as AudienceType)}>
                {AUDIENCES.filter((a) => !a.superOnly || isSuper).map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </Select>
              {(type === 'ROLE' || type === 'LOCATION') && (
                <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                  {type === 'LOCATION' && <option value="">Customers and vendors</option>}
                  <option value="CUSTOMER">Customers</option>
                  <option value="VENDOR">Vendors</option>
                </Select>
              )}
              {type === 'LOCATION' && (
                <>
                  <Input className="max-w-48" placeholder="City (e.g. New Delhi)" value={city} onChange={(e) => setCity(e.target.value)} />
                  <Input
                    className="max-w-36"
                    inputMode="numeric"
                    placeholder="PIN code"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  />
                </>
              )}
              {type === 'VENDOR_STATUS' && (
                <Select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value as VendorStatus)}>
                  {VENDOR_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                  ))}
                </Select>
              )}
            </div>
            {type === 'USERS' && <UserPicker selected={selected} onChange={setSelected} />}
            {type === 'LOCATION' && (
              <p className="text-xs text-slate-500">
                Matches customers by their saved PIN/city and vendors by their shop PIN/city or a PIN they serve.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">When tapped, open</p>
            <div className="flex flex-wrap gap-3">
              <Select value={target} onChange={(e) => setTarget(e.target.value as CampaignTarget)}>
                {targets.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
              {target === 'VENDOR_DETAILS' && <VendorPicker value={vendor} onChange={setVendor} />}
            </div>
            {!vendorOnly && (
              <p className="text-xs text-slate-500">“My shop” and “My products” are available when the audience is vendors only.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <AudienceSummary ready={audienceReady} preview={preview.data} loading={preview.isFetching} error={preview.error} />
            <Button disabled={!canSend} onClick={() => setConfirming(true)}>
              Send now
            </Button>
          </div>
          {sent && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
              Sending to {sent.recipientCount} user(s). Progress is shown in the history below.
            </p>
          )}
        </div>
      </Card>

      <PhonePreview title={titleEn} body={bodyEn} titleHi={titleHi} bodyHi={bodyHi} />

      {confirming && preview.data && (
        <ActionDialog
          title={`Send to ${preview.data.recipients} user(s)?`}
          description={`${preview.data.label}. About ${preview.data.reachable} can get a phone notification right now; everyone gets it in their inbox. This can’t be undone.`}
          confirmLabel="Send now"
          onConfirm={async () => {
            const campaign = await api.post<Campaign>('notifications/campaigns', {
              titleEn: titleEn.trim(),
              bodyEn: bodyEn.trim(),
              ...(titleHi.trim() ? { titleHi: titleHi.trim(), bodyHi: bodyHi.trim() } : {}),
              audience,
              target,
              ...(target === 'VENDOR_DETAILS' && vendor ? { targetParams: { vendorId: vendor.id } } : {}),
            });
            setSent(campaign);
            reset();
            await qc.invalidateQueries({ queryKey: ['campaigns'] });
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function AudienceSummary({ ready, preview, loading, error }: { ready: boolean; preview?: AudiencePreview; loading: boolean; error: unknown }) {
  if (!ready) return <p className="text-sm text-slate-500">Choose who should get this.</p>;
  if (error) return <ErrorNote error={error} />;
  if (!preview) return <p className="text-sm text-slate-500">{loading ? 'Counting…' : ''}</p>;
  return (
    <p className="text-sm text-slate-700" aria-live="polite">
      <span className="font-bold">{preview.recipients}</span> user(s) · <span className="font-bold">{preview.reachable}</span> with notifications on
      {preview.recipients === 0 && <span className="ml-2 text-red-700">Nobody matches this audience.</span>}
      {loading && <span className="ml-2 text-slate-400">updating…</span>}
    </p>
  );
}

function UserPicker({ selected, onChange }: { selected: UserRow[]; onChange: (u: UserRow[]) => void }) {
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim());
  const { data, isFetching } = useQuery({
    queryKey: ['users-picker', term],
    queryFn: () => api.get<Page<UserRow>>('users', { page: 1, limit: 8, search: term, status: 'ACTIVE' }),
    enabled: term.length >= 2,
  });
  const chosen = new Set(selected.map((u) => u.id));
  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              {u.name ?? u.phone} · {u.role === 'VENDOR' ? 'Vendor' : 'Customer'}
              <button
                aria-label={`Remove ${u.name ?? u.phone}`}
                className="ml-1 rounded-full px-1 hover:bg-blue-100"
                onClick={() => onChange(selected.filter((x) => x.id !== u.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <Input className="max-w-sm" placeholder="Search active users by name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
      {term.length >= 2 && (
        <div className="max-w-sm rounded-lg border border-slate-200">
          {isFetching && !data ? (
            <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
          ) : data?.items.length ? (
            data.items.map((u) => (
              <button
                key={u.id}
                disabled={chosen.has(u.id)}
                onClick={() => onChange([...selected, u])}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <span>
                  <span className="font-semibold">{u.name ?? '—'}</span> <span className="tabular-nums text-slate-500">{u.phone}</span>
                </span>
                <span className="text-xs text-slate-500">{chosen.has(u.id) ? 'Added' : u.role === 'VENDOR' ? 'Vendor' : 'Customer'}</span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">No active users found.</p>
          )}
        </div>
      )}
    </div>
  );
}

function VendorPicker({ value, onChange }: { value: VendorRow | null; onChange: (v: VendorRow | null) => void }) {
  const [search, setSearch] = useState('');
  const term = useDebounced(search.trim());
  const { data } = useQuery({
    queryKey: ['vendors-picker', term],
    queryFn: () => api.get<Page<VendorRow>>('vendors', { page: 1, limit: 8, status: 'APPROVED', search: term || undefined }),
  });
  if (value) {
    return (
      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
        {value.businessName ?? 'Seller'} {value.city && <span className="text-slate-500">· {value.city}</span>}
        <button className="text-xs font-semibold text-blue-700 hover:underline" onClick={() => onChange(null)}>Change</button>
      </span>
    );
  }
  return (
    <div className="space-y-1">
      <Input className="max-w-xs" placeholder="Search approved sellers" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-w-xs rounded-lg border border-slate-200">
        {data?.items.length ? (
          data.items.map((v) => (
            <button key={v.id} onClick={() => onChange(v)} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
              <span className="font-semibold">{v.businessName ?? '—'}</span> <span className="text-slate-500">{[v.city, v.pincode].filter(Boolean).join(' · ')}</span>
            </button>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-slate-500">No approved sellers found.</p>
        )}
      </div>
    </div>
  );
}

function PhonePreview({ title, body, titleHi, bodyHi }: { title: string; body: string; titleHi: string; bodyHi: string }) {
  const [hi, setHi] = useState(false);
  const showHi = hi && titleHi.trim() && bodyHi.trim();
  return (
    <Card title="Preview" actions={
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
        <button className={`rounded px-2 py-1 ${!hi ? 'bg-white shadow-sm' : 'text-slate-600'}`} onClick={() => setHi(false)}>English</button>
        <button className={`rounded px-2 py-1 ${hi ? 'bg-white shadow-sm' : 'text-slate-600'}`} onClick={() => setHi(true)}>Hindi</button>
      </div>
    }>
      <div className="rounded-2xl bg-slate-800 p-4">
        <div className="rounded-xl bg-white/95 p-3 shadow">
          <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-block h-4 w-4 rounded bg-blue-600" aria-hidden /> Milkore · now
          </div>
          <p className="text-sm font-bold text-slate-900">{(showHi ? titleHi : title) || 'Your title'}</p>
          <p className="mt-0.5 line-clamp-4 text-sm text-slate-700">{(showHi ? bodyHi : body) || 'Your message appears here.'}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Lock screens show about 40 characters of the title and 100 of the message. Users whose app language is Hindi get the Hindi text when you give it.
      </p>
    </Card>
  );
}

// ─────────────────────────────── history ───────────────────────────────

function History() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ['campaigns', page],
    queryFn: () => api.get<Page<Campaign>>('notifications/campaigns', { page, limit: 20 }),
    placeholderData: keepPreviousData,
    // Poll while something is still sending.
    refetchInterval: (q) => (q.state.data?.items.some((c) => c.status === 'SENDING') ? 3000 : false),
  });

  return (
    <Card title="Sent notifications">
      {isLoading ? <Loading /> : error ? <ErrorNote error={error} /> : (
        <>
          <Table head={['Sent', 'Title', 'Audience', 'Opens', 'Status', 'Users', 'Delivered', 'Failed', 'No device', 'By', '']} empty={!data?.items.length}>
            {data?.items.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmtDate(c.sentAt ?? c.createdAt)}</td>
                <td className="max-w-64 px-3 py-2">
                  <p className="font-semibold">{c.titleEn}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{c.bodyEn}</p>
                </td>
                <td className="px-3 py-2">{c.audienceLabel}</td>
                <td className="px-3 py-2 text-slate-600">{TARGETS.find((t) => t.value === c.target)?.label ?? c.target}</td>
                <td className="px-3 py-2"><StatusPill status={c.status === 'SENT' ? 'APPROVED' : c.status === 'FAILED' ? 'REJECTED' : 'IN_PROGRESS'} /><span className="sr-only">{c.status}</span></td>
                <td className="px-3 py-2 tabular-nums">{c.recipientCount}</td>
                <td className="px-3 py-2 tabular-nums">{c.deliveredCount}</td>
                <td className="px-3 py-2 tabular-nums">{c.failedCount}</td>
                <td className="px-3 py-2 tabular-nums">{c.noDeviceCount}</td>
                <td className="px-3 py-2 text-slate-600">{c.createdBy?.name ?? '—'}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" onClick={() => setOpenId(openId === c.id ? null : c.id)}>{openId === c.id ? 'Hide' : 'Details'}</Button>
                </td>
              </tr>
            ))}
          </Table>
          {openId && <CampaignDetail id={openId} />}
          {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
        </>
      )}
    </Card>
  );
}

function CampaignDetail({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => api.get<Campaign>(`notifications/campaigns/${id}`),
    refetchInterval: (q) => (q.state.data?.status === 'SENDING' ? 3000 : false),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorNote error={error} />;
  if (!data) return null;
  const readPct = data.recipientCount ? Math.round(((data.readCount ?? 0) / data.recipientCount) * 100) : 0;
  return (
    <div className="mt-4 grid gap-4 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-2">
      <div className="space-y-1">
        <p className="font-bold">{data.titleEn}</p>
        <p className="text-slate-700">{data.bodyEn}</p>
        {data.titleHi && (
          <>
            <p className="pt-2 font-bold" lang="hi">{data.titleHi}</p>
            <p className="text-slate-700" lang="hi">{data.bodyHi}</p>
          </>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="text-slate-500">Status</dt><dd className="font-semibold">{data.status}</dd>
        <dt className="text-slate-500">Audience</dt><dd>{data.audienceLabel}</dd>
        <dt className="text-slate-500">Users</dt><dd className="tabular-nums">{data.recipientCount}</dd>
        <dt className="text-slate-500">Opened in app</dt><dd className="tabular-nums">{data.readCount ?? 0} ({readPct}%)</dd>
        <dt className="text-slate-500">Devices delivered / failed</dt><dd className="tabular-nums">{data.deliveredCount} / {data.failedCount}</dd>
        <dt className="text-slate-500">No device or opted out</dt><dd className="tabular-nums">{data.noDeviceCount}</dd>
        <dt className="text-slate-500">Created by</dt><dd>{data.createdBy ? `${data.createdBy.name} (${data.createdBy.email})` : '—'}</dd>
        <dt className="text-slate-500">Created</dt><dd>{fmtDate(data.createdAt)}</dd>
        {data.errorMessage && (<><dt className="text-slate-500">Error</dt><dd className="text-red-700">{data.errorMessage}</dd></>)}
      </dl>
    </div>
  );
}
