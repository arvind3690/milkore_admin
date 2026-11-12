'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api, type Stats } from '@/lib/api';
import { Card, ErrorNote, Loading } from '@/components/ui';

function Tile({ label, value, href, tone = 'slate' }: { label: string; value: number; href?: string; tone?: 'slate' | 'amber' | 'red' | 'green' }) {
  const tones = { slate: 'text-slate-900', amber: 'text-amber-700', red: 'text-red-700', green: 'text-green-700' };
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tabular-nums ${tones[tone]}`}>{value.toLocaleString('en-IN')}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** 30-day signup bars (customers + vendors), plain SVG — no chart library needed. */
function SignupChart({ data }: { data: Stats['signupsByDay'] }) {
  const max = Math.max(1, ...data.map((d) => d.customers + d.vendors));
  const w = 720;
  const h = 160;
  const bw = w / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full" role="img" aria-label="Signups in the last 30 days">
      {data.map((d, i) => {
        const ch = (d.customers / max) * h;
        const vh = (d.vendors / max) * h;
        return (
          <g key={d.day}>
            <title>{`${d.day}: ${d.customers} customers, ${d.vendors} vendors`}</title>
            <rect x={i * bw + 2} y={h - ch} width={bw - 4} height={ch} rx={2} fill="#1769e0" />
            <rect x={i * bw + 2} y={h - ch - vh} width={bw - 4} height={vh} rx={2} fill="#16a34a" />
          </g>
        );
      })}
      <text x={0} y={h + 16} fontSize={11} fill="#64748b">
        {data[0]?.day}
      </text>
      <text x={w} y={h + 16} fontSize={11} fill="#64748b" textAnchor="end">
        {data[data.length - 1]?.day}
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { data, error, isLoading } = useQuery({ queryKey: ['stats'], queryFn: () => api.get<Stats>('stats') });
  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorNote error={error} />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Pending approvals" value={data.vendorsByStatus.PENDING} href="/vendors?status=PENDING" tone="amber" />
        <Tile label="Approved vendors" value={data.vendorsByStatus.APPROVED} href="/vendors?status=APPROVED" tone="green" />
        <Tile label="Customers" value={data.customers} href="/customers" />
        <Tile label="Active products" value={data.activeProducts} href="/products" />
        <Tile label="Open reports" value={data.openReports} href="/reports" tone={data.openReports ? 'red' : 'slate'} />
        <Tile label="Open support tickets" value={data.openTickets} href="/support" tone={data.openTickets ? 'amber' : 'slate'} />
        <Tile label="Messages (7 days)" value={data.messagesLast7Days} />
        <Tile label="Calls (7 days)" value={data.callsLast7Days} />
      </div>
      <Card title={`Signups · ${data.signupsLast7Days} in 7 days · ${data.signupsLast30Days} in 30 days`}>
        <div className="mb-2 flex gap-4 text-xs text-slate-600">
          <span><span className="mr-1 inline-block h-2 w-3 rounded bg-blue-600" />Customers</span>
          <span><span className="mr-1 inline-block h-2 w-3 rounded bg-green-600" />Vendors</span>
        </div>
        <SignupChart data={data.signupsByDay} />
      </Card>
      <Card title="Vendors by status">
        <div className="flex flex-wrap gap-6 text-sm">
          {Object.entries(data.vendorsByStatus).map(([s, n]) => (
            <Link key={s} href={`/vendors?status=${s}`} className="font-semibold text-slate-700 hover:text-blue-700">
              {s}: <span className="tabular-nums">{n}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
