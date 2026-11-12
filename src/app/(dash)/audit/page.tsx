'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type AuditEntry, type Page } from '@/lib/api';
import { Card, ErrorNote, Input, Loading, Pagination, Select, Table, fmtDate } from '@/components/ui';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const { data, error, isLoading } = useQuery({
    queryKey: ['audit', page, entityType, entityId],
    queryFn: () => api.get<Page<AuditEntry>>('audit-logs', { page, limit: 50, entityType: entityType || undefined, entityId: entityId || undefined }),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Audit log</h1>
      <div className="flex flex-wrap gap-3">
        <Select value={entityType} onChange={(e) => { setPage(1); setEntityType(e.target.value); }}>
          <option value="">All entities</option>
          {['vendor', 'user', 'product', 'category', 'report', 'ticket', 'admin'].map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input className="max-w-xs" placeholder="Entity id" value={entityId} onChange={(e) => { setPage(1); setEntityId(e.target.value.trim()); }} />
      </div>
      <Card>
        {isLoading ? <Loading /> : error ? <ErrorNote error={error} /> : (
          <>
            <Table head={['When', 'Actor', 'Action', 'Entity', 'Details', 'IP']} empty={!data?.items.length}>
              {data?.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmtDate(a.createdAt)}</td>
                  <td className="px-3 py-2"><span className="text-xs font-bold">{a.actorType}</span><div className="font-mono text-xs text-slate-500">{a.actorId?.slice(0, 8)}</div></td>
                  <td className="px-3 py-2 font-semibold">{a.action}</td>
                  <td className="px-3 py-2">{a.entityType}<div className="font-mono text-xs text-slate-500">{a.entityId?.slice(0, 8)}</div></td>
                  <td className="max-w-xs truncate px-3 py-2 font-mono text-xs text-slate-600">{a.metadata ? JSON.stringify(a.metadata) : ''}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{a.ip}</td>
                </tr>
              ))}
            </Table>
            {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
          </>
        )}
      </Card>
    </div>
  );
}
