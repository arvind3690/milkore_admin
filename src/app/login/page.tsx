'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { Button, ErrorNote, Input } from '@/components/ui';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needTotp, setNeedTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email.trim(), password, totp || undefined);
      const next = params.get('next');
      router.replace(next && next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && /authenticator/i.test(err.message)) setNeedTotp(true);
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-2xl font-extrabold text-blue-800">Milkore</p>
        <p className="text-sm text-slate-500">Admin dashboard</p>
      </div>
      <label className="block space-y-1 text-sm font-semibold">
        <span>Email</span>
        <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        <span>Password</span>
        <Input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {needTotp && (
        <label className="block space-y-1 text-sm font-semibold">
          <span>Authenticator code</span>
          <Input inputMode="numeric" pattern="\d{6}" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value)} />
        </label>
      )}
      <ErrorNote error={error} />
      <Button type="submit" loading={busy} className="w-full">
        Log in
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
