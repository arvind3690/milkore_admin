'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { use, useState } from 'react';
import { api, type VendorDetail } from '@/lib/api';
import { ActionDialog, Button, Card, ErrorNote, Loading, StatusPill, Table, fmtDate } from '@/components/ui';

type Action = 'approve' | 'reject' | 'suspend' | 'reactivate';

const apiBase = (process.env.NEXT_PUBLIC_MILKORE_API_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
const media = (url: string | null) => (url ? (url.startsWith('http') ? url : `${apiBase}${url}`) : null);

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [action, setAction] = useState<Action | null>(null);
  const { data: v, error, isLoading } = useQuery({ queryKey: ['vendor', id], queryFn: () => api.get<VendorDetail>(`vendors/${id}`) });

  if (isLoading) return <Loading />;
  if (error || !v) return <ErrorNote error={error} />;

  const run = async (a: Action, reason: string) => {
    await api.post(`vendors/${id}/${a}`, a === 'reject' || a === 'suspend' ? { reason } : {});
    await Promise.all([qc.invalidateQueries({ queryKey: ['vendor', id] }), qc.invalidateQueries({ queryKey: ['vendors'] }), qc.invalidateQueries({ queryKey: ['stats'] })]);
  };

  const can = {
    approve: v.approvalStatus === 'PENDING' || v.approvalStatus === 'REJECTED',
    reject: v.approvalStatus === 'PENDING' || v.approvalStatus === 'APPROVED',
    suspend: v.approvalStatus !== 'SUSPENDED' && v.approvalStatus !== 'DRAFT',
    reactivate: v.approvalStatus === 'SUSPENDED',
  };

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/vendors" className="text-sm text-blue-700 hover:underline">
            ← Vendors
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold">{v.businessName ?? '(no name yet)'}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
            <StatusPill status={v.approvalStatus} /> <span>{v.completion.percent}% complete</span>
            {v.submittedAt && <span>Submitted {fmtDate(v.submittedAt)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can.approve && <Button variant="success" onClick={() => setAction('approve')}>Approve</Button>}
          {can.reject && <Button variant="secondary" onClick={() => setAction('reject')}>Reject</Button>}
          {can.suspend && <Button variant="danger" onClick={() => setAction('suspend')}>Suspend</Button>}
          {can.reactivate && <Button variant="success" onClick={() => setAction('reactivate')}>Reactivate</Button>}
        </div>
      </div>

      {(v.rejectionReason || v.suspensionReason) && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {v.suspensionReason ? `Suspended: ${v.suspensionReason}` : `Rejected: ${v.rejectionReason}`}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Photos" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Owner', v.profilePhotoUrl],
              ['Shop', v.shopPhotoUrl],
            ].map(([label, url]) => (
              <figure key={label} className="space-y-1">
                {media(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media(url)!} alt={`${label} photo`} className="aspect-square w-full rounded-lg border object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed text-xs text-slate-400">No photo</div>
                )}
                <figcaption className="text-xs text-slate-500">{label}</figcaption>
              </figure>
            ))}
          </div>
        </Card>
        <Card title="Owner & contact" className="lg:col-span-1">
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Owner</dt><dd className="font-semibold">{v.ownerName ?? '—'}</dd></div>
            <div><dt className="text-slate-500">Phone</dt><dd className="font-semibold">{v.contactPhone ?? '—'}</dd></div>
            <div><dt className="text-slate-500">Account</dt><dd>{v.user ? `${v.user.status} · joined ${fmtDate(v.user.createdAt)}` : '—'}</dd></div>
            <div><dt className="text-slate-500">Activity</dt><dd>{v.counts.conversations} chats · {v.counts.calls} calls · {v.counts.reports} reports</dd></div>
          </dl>
        </Card>
        <Card title="Location & service area" className="lg:col-span-1">
          {v.location ? (
            <div className="space-y-2 text-sm">
              <p>{[v.location.addressLine, v.location.locality, v.location.city, v.location.district, v.location.state, v.location.pincode].join(', ')}</p>
              <a
                className="text-blue-700 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${v.location.lat},${v.location.lng}`}
              >
                Open map pin ({v.location.lat.toFixed(5)}, {v.location.lng.toFixed(5)})
              </a>
              <p className="text-slate-600">
                Radius: {v.serviceAreas.radiusMeters ? `${v.serviceAreas.radiusMeters / 1000} km` : '—'}
                <br />
                PIN codes: {v.serviceAreas.pincodes.join(', ') || '—'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not set yet.</p>
          )}
        </Card>
      </div>

      {v.description && (
        <Card title="Description">
          <p className="text-sm">{v.description}</p>
        </Card>
      )}

      {v.operatingHours && (
        <Card title="Timings">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d) => {
              const h = v.operatingHours![d];
              return (
                <div key={d} className="rounded-lg bg-slate-50 p-2">
                  <p className="font-semibold uppercase text-slate-500">{d}</p>
                  <p>{h?.closed ? 'Closed' : `${h?.open}–${h?.close}`}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title={`Products (${v.products.length})`} actions={<Link className="text-sm text-blue-700 hover:underline" href={`/products?vendorId=${v.id}`}>Moderate</Link>}>
        <Table head={['Product', 'Category', 'Price', 'Stock', 'Status']} empty={!v.products.length}>
          {v.products.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-semibold">{p.name}</td>
              <td className="px-3 py-2">{p.category.nameEn}</td>
              <td className="px-3 py-2">{p.priceDisplay}</td>
              <td className="px-3 py-2">{p.isAvailable ? 'In stock' : 'Out of stock'}</td>
              <td className="px-3 py-2"><StatusPill status={p.moderationStatus} /></td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Approval history">
        <Table head={['When', 'From', 'To', 'Note']} empty={!v.history.length}>
          {v.history.map((h) => (
            <tr key={h.id}>
              <td className="px-3 py-2 text-slate-600">{fmtDate(h.createdAt)}</td>
              <td className="px-3 py-2"><StatusPill status={h.fromStatus} /></td>
              <td className="px-3 py-2"><StatusPill status={h.toStatus} /></td>
              <td className="px-3 py-2">{h.note ?? '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>

      {action && (
        <ActionDialog
          title={{ approve: 'Approve this vendor?', reject: 'Reject this registration?', suspend: 'Suspend this vendor?', reactivate: 'Reactivate this vendor?' }[action]}
          description={
            {
              approve: 'The shop becomes visible to customers in its service area.',
              reject: 'The vendor sees your reason and can edit and resubmit.',
              suspend: 'The shop is hidden immediately. The vendor sees your reason.',
              reactivate: 'The shop becomes visible again.',
            }[action]
          }
          confirmLabel={{ approve: 'Approve', reject: 'Reject', suspend: 'Suspend', reactivate: 'Reactivate' }[action]}
          variant={action === 'suspend' ? 'danger' : action === 'reject' ? 'secondary' : 'success'}
          requireReason={action === 'reject' || action === 'suspend'}
          onConfirm={(reason) => run(action, reason)}
          onClose={() => setAction(null)}
        />
      )}
    </div>
  );
}
