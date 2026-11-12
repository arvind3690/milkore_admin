'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type Admin } from '@/lib/api';
import { useAdmin } from '@/components/admin-context';
import { Button, Card, ErrorNote, Input, Loading, Select, StatusPill, Table, fmtDate } from '@/components/ui';

export default function AdminsPage() {
  const me = useAdmin();
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'MODERATOR' as Admin['role'] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { data, error: loadError, isLoading } = useQuery({ queryKey: ['admins'], queryFn: () => api.get<Admin[]>('admins'), enabled: me?.role === 'SUPER_ADMIN' });

  if (me && me.role !== 'SUPER_ADMIN') return <p className="text-sm text-slate-600">Only a super admin can manage admin accounts.</p>;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('admins', form);
      setForm({ email: '', name: '', password: '', role: 'MODERATOR' });
      await qc.invalidateQueries({ queryKey: ['admins'] });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Admin accounts</h1>
      <Card>
        {isLoading ? <Loading /> : loadError ? <ErrorNote error={loadError} /> : (
          <Table head={['Name', 'Email', 'Role', 'Last login', 'Status', '']} empty={!data?.length}>
            {data?.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2 font-semibold">{a.name}</td>
                <td className="px-3 py-2">{a.email}</td>
                <td className="px-3 py-2">{a.role === 'SUPER_ADMIN' ? 'Super admin' : 'Moderator'}</td>
                <td className="px-3 py-2 text-slate-600">{fmtDate(a.lastLoginAt)}</td>
                <td className="px-3 py-2"><StatusPill status={a.status} /></td>
                <td className="px-3 py-2 text-right">
                  {a.id !== me?.id && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await api.patch(`admins/${a.id}/status`, { status: a.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' });
                        await qc.invalidateQueries({ queryKey: ['admins'] });
                      }}
                    >
                      {a.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Add admin">
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-5">
          <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input required type="password" minLength={10} placeholder="Password (10+ chars)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Admin['role'] })}>
            <option value="MODERATOR">Moderator</option>
            <option value="SUPER_ADMIN">Super admin</option>
          </Select>
          <Button type="submit" loading={busy}>Create</Button>
        </form>
        <div className="mt-3"><ErrorNote error={error} /></div>
      </Card>
    </div>
  );
}
