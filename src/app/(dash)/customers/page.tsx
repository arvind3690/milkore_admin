'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { api, type Page, type UserRow } from '@/lib/api';
import { ActionDialog, Button, Card, ErrorNote, Input, Loading, Pagination, Select, StatusPill, Table, fmtDate } from '@/components/ui';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | 'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'SUSPENDED'>('');
  const [target, setTarget] = useState<UserRow | null>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ['users', page, search, role, status],
    queryFn: () => api.get<Page<UserRow>>('users', { page, limit: 20, search: search || undefined, role: role || undefined, status: status || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Users</h1>
      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search name or phone" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <Select value={role} onChange={(e) => { setPage(1); setRole(e.target.value as typeof role); }}>
          <option value="">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="VENDOR">Vendors</option>
        </Select>
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as typeof status); }}>
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      <Card>
        {isLoading ? <Loading /> : error ? <ErrorNote error={error} /> : (
          <>
            <Table head={['Name', 'Phone', 'Role', 'Location', 'Joined', 'Last login', 'Status', '']} empty={!data?.items.length}>
              {data?.items.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-semibold">{u.name ?? '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{u.phone}</td>
                  <td className="px-3 py-2">
                    {u.role}
                    {u.vendorProfile && (
                      <Link href={`/vendors/${u.vendorProfile.id}`} className="ml-2 text-xs text-blue-700 hover:underline">shop</Link>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{u.customerProfile?.addressLabel ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-2 text-slate-600">{fmtDate(u.lastLoginAt)}</td>
                  <td className="px-3 py-2"><StatusPill status={u.status} /></td>
                  <td className="px-3 py-2 text-right">
                    {u.status !== 'DELETED' && (
                      <Button variant={u.status === 'ACTIVE' ? 'secondary' : 'success'} onClick={() => setTarget(u)}>
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
          </>
        )}
      </Card>
      {target && (
        <ActionDialog
          title={target.status === 'ACTIVE' ? `Suspend ${target.name ?? target.phone}?` : `Reactivate ${target.name ?? target.phone}?`}
          description={target.status === 'ACTIVE' ? 'They are logged out everywhere and cannot use Milkore until reactivated.' : undefined}
          confirmLabel={target.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
          variant={target.status === 'ACTIVE' ? 'danger' : 'success'}
          requireReason={target.status === 'ACTIVE'}
          onConfirm={async (reason) => {
            await api.patch(`users/${target.id}/status`, { status: target.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE', ...(reason ? { reason } : {}) });
            await qc.invalidateQueries({ queryKey: ['users'] });
          }}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}
