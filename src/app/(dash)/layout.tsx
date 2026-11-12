'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { AdminContext } from '@/components/admin-context';
import { Button } from '@/components/ui';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/customers', label: 'Customers' },
  { href: '/products', label: 'Products' },
  { href: '/categories', label: 'Categories' },
  { href: '/reports', label: 'Reports' },
  { href: '/support', label: 'Support' },
  { href: '/audit', label: 'Audit log' },
  { href: '/admins', label: 'Admins', superOnly: true },
];

export default function DashLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: admin } = useQuery({ queryKey: ['me'], queryFn: api.me, staleTime: 5 * 60_000 });

  return (
    <AdminContext.Provider value={admin ?? null}>
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
          <div className="px-6 py-5">
            <p className="text-xl font-extrabold text-blue-800">Milkore</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV.filter((n) => !n.superOnly || admin?.role === 'SUPER_ADMIN').map((n) => {
              const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-semibold ${active ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
            <nav className="flex gap-3 overflow-x-auto text-sm md:hidden">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap font-semibold text-slate-700">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3 text-sm">
              {admin && (
                <span className="text-slate-600">
                  {admin.name} · <span className="font-semibold">{admin.role === 'SUPER_ADMIN' ? 'Super admin' : 'Moderator'}</span>
                </span>
              )}
              <Button
                variant="secondary"
                onClick={async () => {
                  await api.logout().catch(() => undefined);
                  router.replace('/login');
                  router.refresh();
                }}
              >
                Log out
              </Button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
