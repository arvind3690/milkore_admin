'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, type Page, type VendorRow, type VendorStatus } from '@/lib/api';
import { Card, ErrorNote, Input, Loading, Pagination, StatusPill, Table, Tabs, fmtDate } from '@/components/ui';

const STATUSES: Array<VendorStatus | 'ALL'> = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DRAFT', 'ALL'];

function VendorsList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = (params.get('status') as VendorStatus | 'ALL' | null) ?? 'PENDING';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, error, isLoading } = useQuery({
    queryKey: ['vendors', status, page, search],
    queryFn: () => api.get<Page<VendorRow>>('vendors', { status: status === 'ALL' ? undefined : status, page, limit: 20, search: search || undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Vendors</h1>
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={status}
          options={STATUSES.map((s) => ({ value: s, label: s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase() }))}
          onChange={(s) => {
            setPage(1);
            router.replace(`/vendors?status=${s}`);
          }}
        />
        <Input
          placeholder="Search name, phone or PIN"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>
      <Card>
        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorNote error={error} />
        ) : (
          <>
            <Table head={['Shop', 'Owner / phone', 'Area', 'Products', 'Status', status === 'PENDING' ? 'Submitted' : 'Created']} empty={!data?.items.length}>
              {data?.items.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <Link href={`/vendors/${v.id}`} className="font-semibold text-blue-700 hover:underline">
                      {v.businessName ?? '(no name yet)'}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {v.ownerName ?? '—'}
                    <div className="text-xs text-slate-500">{v.contactPhone}</div>
                  </td>
                  <td className="px-3 py-3">
                    {[v.locality, v.city].filter(Boolean).join(', ') || '—'}
                    <div className="text-xs text-slate-500">{v.pincode}</div>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{v.productCount}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={v.approvalStatus} />
                  </td>
                  <td className="px-3 py-3 text-slate-600">{fmtDate(status === 'PENDING' ? v.submittedAt : v.createdAt)}</td>
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

export default function VendorsPage() {
  return (
    <Suspense>
      <VendorsList />
    </Suspense>
  );
}
