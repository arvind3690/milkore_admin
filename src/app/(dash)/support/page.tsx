'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type Page, type Ticket } from '@/lib/api';
import { Button, Card, ErrorNote, Loading, Pagination, Select, StatusPill, Tabs, fmtDate } from '@/components/ui';

type Status = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';

function TicketCard({ ticket }: { ticket: Ticket }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(ticket.adminNote ?? '');
  const [status, setStatus] = useState<Status>(ticket.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold">{ticket.subject}</p>
          <p className="text-xs text-slate-500">
            {ticket.user ? `${ticket.user.name ?? 'Unnamed'} · ${ticket.user.phone} · ${ticket.user.role}` : 'Unknown user'} · {fmtDate(ticket.createdAt)}
          </p>
        </div>
        <StatusPill status={ticket.status} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{ticket.message}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder="Reply shown to the user in the app"
        className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
      />
      <div className="mt-2 flex items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Button
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api.patch(`support-tickets/${ticket.id}`, { status, adminNote: note });
              await qc.invalidateQueries({ queryKey: ['tickets'] });
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </Button>
      </div>
      <div className="mt-2"><ErrorNote error={error} /></div>
    </Card>
  );
}

export default function SupportPage() {
  const [status, setStatus] = useState<Status>('OPEN');
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useQuery({
    queryKey: ['tickets', status, page],
    queryFn: () => api.get<Page<Ticket>>('support-tickets', { status, page, limit: 10 }),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Support</h1>
      <Tabs value={status} options={[{ value: 'OPEN', label: 'Open' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'CLOSED', label: 'Closed' }]} onChange={(s) => { setPage(1); setStatus(s); }} />
      {isLoading ? <Loading /> : error ? <ErrorNote error={error} /> : (
        <>
          {!data?.items.length && <p className="py-10 text-center text-sm text-slate-500">No tickets here.</p>}
          <div className="space-y-4">{data?.items.map((t) => <TicketCard key={t.id} ticket={t} />)}</div>
          {data && data.total > data.limit && <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />}
        </>
      )}
    </div>
  );
}
