'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type Category } from '@/lib/api';
import { useAdmin } from '@/components/admin-context';
import { Button, Card, ErrorNote, Input, Loading, StatusPill, Table } from '@/components/ui';

const empty = { slug: '', nameEn: '', nameHi: '', iconKey: 'milk', sortOrder: 50 };

export default function CategoriesPage() {
  const admin = useAdmin();
  const qc = useQueryClient();
  const isSuper = admin?.role === 'SUPER_ADMIN';
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { data, error: loadError, isLoading } = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('categories') });

  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('categories', { ...form, sortOrder: Number(form.sortOrder) });
      setForm(empty);
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Categories</h1>
      {!isSuper && <p className="text-sm text-slate-600">Only a super admin can change categories.</p>}
      <Card>
        {isLoading ? <Loading /> : loadError ? <ErrorNote error={loadError} /> : (
          <Table head={['Order', 'English', 'Hindi', 'Slug', 'Icon', 'Products', 'Status', '']} empty={!data?.length}>
            {data?.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 tabular-nums">{c.sortOrder}</td>
                <td className="px-3 py-2 font-semibold">{c.nameEn}</td>
                <td className="px-3 py-2">{c.nameHi}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.slug}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.iconKey}</td>
                <td className="px-3 py-2 tabular-nums">{c._count.products}</td>
                <td className="px-3 py-2"><StatusPill status={c.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
                <td className="px-3 py-2 text-right">
                  {isSuper && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await api.patch(`categories/${c.id}`, { isActive: !c.isActive });
                        await refresh();
                      }}
                    >
                      {c.isActive ? 'Hide' : 'Show'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {isSuper && (
        <Card title="Add category">
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-5">
            <Input required placeholder="slug (e.g. lassi)" pattern="[a-z0-9-]{2,40}" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <Input required placeholder="English name" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
            <Input required placeholder="हिंदी नाम" value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} />
            <Input required placeholder="icon key" value={form.iconKey} onChange={(e) => setForm({ ...form, iconKey: e.target.value })} />
            <Button type="submit" loading={busy}>Add</Button>
          </form>
          <div className="mt-3"><ErrorNote error={error} /></div>
        </Card>
      )}
    </div>
  );
}
