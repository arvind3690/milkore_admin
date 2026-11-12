'use client';

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

/** Small, dependency-free UI kit for the admin (Tailwind). */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const styles: Record<Variant, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-700 text-white hover:bg-red-800',
    success: 'bg-green-700 text-white hover:bg-green-800',
    ghost: 'text-slate-700 hover:bg-slate-100',
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100',
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx('rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600', props.className)}
    />
  );
}

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

const pillColors: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-green-100 text-green-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-900',
  OPEN: 'bg-amber-100 text-amber-900',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-slate-100 text-slate-700',
  DISMISSED: 'bg-slate-100 text-slate-700',
  REJECTED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REMOVED_BY_ADMIN: 'bg-red-100 text-red-800',
  DELETED: 'bg-slate-200 text-slate-600',
  DISABLED: 'bg-slate-200 text-slate-600',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={cx('inline-block rounded-full px-2.5 py-0.5 text-xs font-bold', pillColors[status] ?? 'bg-slate-100 text-slate-700')}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="py-10 text-center text-sm text-slate-500">Nothing here yet.</p>}
    </div>
  );
}

export function Pagination({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        {total} total · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm font-semibold',
            value === o.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 text-xs">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
      {error instanceof Error ? error.message : 'Something went wrong.'}
    </p>
  );
}

export function Loading() {
  return <div className="py-16 text-center text-sm text-slate-500">Loading…</div>;
}

/**
 * Confirmation dialog with an optional required reason (reject / suspend / remove).
 */
export function ActionDialog({
  title,
  description,
  confirmLabel,
  variant = 'primary',
  requireReason,
  onConfirm,
  onClose,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  variant?: Variant;
  requireReason?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        {requireReason && (
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Reason (the vendor will see this)"
            className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
          />
        )}
        <div className="mt-3">
          <ErrorNote error={error} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={variant}
            loading={busy}
            disabled={requireReason && reason.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm(reason.trim());
                onClose();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
