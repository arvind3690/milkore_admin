'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { api, type Page, type Report } from '@/lib/api';
import { Button, Card, ErrorNote, Loading, Pagination, StatusPill, Table, Tabs, fmtDate } from '@/components/ui';

type Status = 'OPEN' | 'RESOLVED' | 'DISMISSED';

function targetLink(r: Report) {
  if (r.targetType === 'VENDOR') return `/vendors/${r.targetId}`;
  if (r.targetType === 'PRODUCT') return `/products`;
  if (r.targetType === 'USER') return `/customers`;
  return null;
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>('OPEN');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<unknown>(null);
  const { data, error: loadError, isLoading } = useQuery({
    queryKey: ['reports', status, page],
    queryFn: () => api.get<Page<Report>>('reports', { status, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  async function resolve(r: Report, next: Status) {
    setError(null);
    try {
      const note = next === 'OPEN' ? undefined : window.prompt('Note (optional)') ?? undefined;
      await api.patch(`reports/${r.id}`, { status: next, ...(note ? { note } : {}) });
      await Promise.all([qc.invalidateQueries({ queryKey: ['reports'] }), qc.invalidateQueries({ queryKey: ['stats'] })]);
    } catch (e) {
      setError(e);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Reports</h1>
      <Tabs value={status} options={[{ value: 'OPEN', label: 'Open' }, { value: 'RESOLVED', label: 'Resolved' }, { value: 'DISMISSED', label: 'Dismissed' }]} onChange={(s) => { setPage(1); setStatus(s); }} />
      <ErrorNote error={error} />
      <Card>
        {isLoading ? <Loading /> : loadError ? <ErrorNote error={loadError} /> : (
          <>
            <Table head={['When', 'Reported', 'Reason', 'By', 'Status', '']} empty={!data?.items.length}>
              {data?.items.map((r) => {
                const href = targetLink(r);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-bold text-slate-500">{r.targetType}</span>
                      <div>{href ? <Link className="text-blue-700 hover:underline" href={href}>{r.targetLabel ?? r.targetId}</Link> : r.targetLabel ?? r.targetId}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-semibold">{r.reason.replaceAll('_', ' ')}</span>
                      {r.details && <div className="max-w-sm text-xs text-slate-600">{r.details}</div>}
                      {r.resolutionNote && <div className="text-xs text-green-800">Note: {r.resolutionNote}</div>}
                    </td>
                    <td className="px-3 py-2">{r.reporter?.name ?? r.reporter?.phone ?? '—'}</td>
                    <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                    <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                      {r.status === 'OPEN' ? (
                        <>
                          <Button variant="success" onClick={() => resolve(r, 'RESOLVED')}>Resolve</Button>
                          <Button variant="secondary" onClick={() => resolve(r, 'DISMISSED')}>Dismiss</Button>
                        </>
                      ) : (
                        <Button variant="ghost" onClick={() => resolve(r, 'OPEN')}>Reopen</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
            {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
          </>
        )}
      </Card>
    </div>
  );
}
