'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, type Page, type Product } from '@/lib/api';
import { ActionDialog, Button, Card, ErrorNote, Input, Loading, Pagination, Select, StatusPill, Table } from '@/components/ui';

function ProductsList() {
  const qc = useQueryClient();
  const vendorId = useSearchParams().get('vendorId') ?? undefined;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'REMOVED_BY_ADMIN'>('');
  const [target, setTarget] = useState<Product | null>(null);
  const { data, error, isLoading } = useQuery({
    queryKey: ['products', page, search, status, vendorId],
    queryFn: () => api.get<Page<Product>>('products', { page, limit: 25, search: search || undefined, status: status || undefined, vendorId }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Products</h1>
      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Search product or shop" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as typeof status); }}>
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="REMOVED_BY_ADMIN">Removed</option>
        </Select>
        {vendorId && <Link href="/products" className="self-center text-sm text-blue-700 hover:underline">Clear vendor filter</Link>}
      </div>
      <Card>
        {isLoading ? <Loading /> : error ? <ErrorNote error={error} /> : (
          <>
            <Table head={['Product', 'Shop', 'Category', 'Price', 'Stock', 'Status', '']} empty={!data?.items.length}>
              {data?.items.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{p.name}</span>
                    {p.description && <div className="max-w-xs truncate text-xs text-slate-500">{p.description}</div>}
                    {p.removedReason && <div className="text-xs text-red-700">Removed: {p.removedReason}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {p.vendor ? <Link className="text-blue-700 hover:underline" href={`/vendors/${p.vendor.id}`}>{p.vendor.businessName}</Link> : '—'}
                  </td>
                  <td className="px-3 py-2">{p.category.nameEn}</td>
                  <td className="px-3 py-2 tabular-nums">{p.priceDisplay}</td>
                  <td className="px-3 py-2">{p.isAvailable ? 'In stock' : 'Out'}</td>
                  <td className="px-3 py-2"><StatusPill status={p.moderationStatus} /></td>
                  <td className="px-3 py-2 text-right">
                    <Button variant={p.moderationStatus === 'ACTIVE' ? 'danger' : 'success'} onClick={() => setTarget(p)}>
                      {p.moderationStatus === 'ACTIVE' ? 'Remove' : 'Restore'}
                    </Button>
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
          title={target.moderationStatus === 'ACTIVE' ? `Remove "${target.name}"?` : `Restore "${target.name}"?`}
          description={target.moderationStatus === 'ACTIVE' ? 'Customers stop seeing it. The vendor sees your reason.' : undefined}
          confirmLabel={target.moderationStatus === 'ACTIVE' ? 'Remove' : 'Restore'}
          variant={target.moderationStatus === 'ACTIVE' ? 'danger' : 'success'}
          requireReason={target.moderationStatus === 'ACTIVE'}
          onConfirm={async (reason) => {
            await api.post(`products/${target.id}/${target.moderationStatus === 'ACTIVE' ? 'remove' : 'restore'}`, reason ? { reason } : {});
            await qc.invalidateQueries({ queryKey: ['products'] });
          }}
          onClose={() => setTarget(null)}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsList />
    </Suspense>
  );
}
