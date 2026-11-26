import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, EyeOff, FlaskConical, Lock, Search, ShieldCheck, Unlock } from 'lucide-react';
import { areaById, moduleById, type ModuleId } from '../config/modules';
import { dataCategoryById, type DataCat } from '../config/dataAccess';
import { LEVELS, type Level } from '../config/permissions';
import { maskValue, type MaskKind } from '../lib/mask';
import { useStore } from '../store/AppStore';
import { KpiRow, StateChip, Tabs } from './ui';

/** Breadcrumb trail shown above a page title: business area › page. */
export function Crumbs({ items }: { items: string[] }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((t, i) => (
        <span key={t} className="row" style={{ gap: 6 }}>
          {i > 0 && <ChevronRight size={12} />}
          <span aria-current={i === items.length - 1 ? 'page' : undefined}>{t}</span>
        </span>
      ))}
    </nav>
  );
}

/* ---------- Module page frame ---------- */
export function ModulePage({ module, lead, actions, kpis, notice, children }: {
  module: ModuleId;
  lead: string;
  actions?: ReactNode;
  kpis?: Parameters<typeof KpiRow>[0]['items'];
  notice?: ReactNode;
  children: ReactNode;
}) {
  const m = moduleById(module);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <nav className="crumbs" aria-label="Breadcrumb"><span>{areaById(m.area).name}</span><ChevronRight size={12} /><span>{m.name}</span></nav>
          <h1>{m.name}</h1>
          <p className="lead">{lead}</p>
        </div>
        {actions && <div className="row wrap">{actions}</div>}
      </div>
      {kpis && <KpiRow items={kpis} />}
      {notice}
      {children}
    </div>
  );
}

/** Tabbed panel whose active tab lives in the URL (?tab=). */
export function useTabParam<T extends string>(fallback: T, allowed?: T[]): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') as T | null;
  const tab = raw && (!allowed || allowed.includes(raw)) ? raw : fallback;
  const set = (t: T) => {
    const p = new URLSearchParams(params);
    p.set('tab', t);
    p.delete('focus');
    setParams(p, { replace: true });
  };
  return [tab, set];
}

export function TabPanel<T extends string>({ tabs, value, onChange, label, children }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void; label: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div style={{ padding: '0 var(--s5)' }}>
        <Tabs<T> tabs={tabs} value={value} onChange={onChange} label={label} />
      </div>
      <div role="tabpanel">{children}</div>
    </section>
  );
}

/* ---------- Tables ---------- */
export interface Col<T> {
  key: string;
  label: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

/* ---------- Pagination ---------- */

export const PAGE_SIZES = [10, 15, 25, 50];

/**
 * Splits rows into pages. Returns to page 1 whenever the result set changes
 * (search, filter, sort or tab), so a new search never opens on an empty page.
 */
export function usePaged<T>(rows: T[], signature: string, initialSize = 15) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);
  const [lastSig, setLastSig] = useState(signature);
  if (lastSig !== signature) { setLastSig(signature); setPage(1); }
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages);
  const slice = rows.slice((current - 1) * size, current * size);
  return { slice, page: current, pages, size, total: rows.length, setPage, setSize: (n: number) => { setSize(n); setPage(1); } };
}

/** Page numbers shown around the current page, with gaps marked as null. */
function pageList(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const out: (number | null)[] = [];
  [...keep].sort((a, b) => a - b).forEach((n, i, arr) => { if (i && n - arr[i - 1] > 1) out.push(null); out.push(n); });
  return out;
}

export function Pager({ page, pages, size, total, setPage, setSize, noun = 'records' }: ReturnType<typeof usePaged<unknown>> & { noun?: string }) {
  if (total <= PAGE_SIZES[0]) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return (
    <div className="pager" role="navigation" aria-label="Pagination">
      <span className="pager-info">Showing <strong>{from}–{to}</strong> of <strong>{total}</strong> {noun}</span>
      <label className="pager-size">
        Rows per page
        <select className="select" value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Rows per page">
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>
      {pages > 1 && (
        <div className="pager-pages">
          <button className="pager-btn" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="Previous page"><ChevronLeft size={15} /></button>
          {pageList(page, pages).map((n, i) => n === null
            ? <span key={`gap${i}`} className="pager-gap">…</span>
            : <button key={n} className={`pager-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>)}
          <button className="pager-btn" onClick={() => setPage(page + 1)} disabled={page === pages} aria-label="Next page"><ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  );
}

export function DataTable<T>({ rows, cols, rowKey, onRow, empty = 'No records match', selected, rowClass, label, pageSize = 15, noun }: {
  rows: T[];
  cols: Col<T>[];
  rowKey: (r: T) => string;
  onRow?: (r: T) => void;
  empty?: string;
  selected?: string | null;
  rowClass?: (r: T) => string;
  label?: string;
  /** Rows per page; 0 shows every row (for short reference tables). */
  pageSize?: number;
  noun?: string;
}) {
  const signature = `${rows.length}:${rows.length ? rowKey(rows[0]) : ''}:${rows.length ? rowKey(rows[rows.length - 1]) : ''}`;
  const paged = usePaged(rows, signature, pageSize || rows.length || 1);
  if (!rows.length) return <div className="empty compact" style={{ padding: '18px var(--s5)' }}><div className="empty-icon"><Search size={14} /></div><div><h3>{empty}</h3></div></div>;
  const visible = pageSize ? paged.slice : rows;
  return (
    <>
    <div className="table-wrap sticky-head">
      <table className="table" aria-label={label}>
        <thead><tr>{cols.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr></thead>
        <tbody>
          {visible.map((r) => {
            const k = rowKey(r);
            return (
              <tr
                key={k}
                className={`${onRow ? 'clickable' : ''} ${selected === k ? 'selected' : ''} ${rowClass?.(r) ?? ''}`}
                tabIndex={onRow ? 0 : undefined}
                onClick={onRow ? () => onRow(r) : undefined}
                onKeyDown={onRow ? (e) => { if (e.key === 'Enter') onRow(r); } : undefined}
              >
                {cols.map((c) => <td key={c.key} className={c.className}>{c.render(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {pageSize > 0 && <Pager {...paged} noun={noun} />}
    </>
  );
}

export interface FilterDef {
  label: string;
  value: string;
  options: (string | { value: string; label: string })[];
  onChange: (v: string) => void;
}

export function Toolbar({ search, onSearch, placeholder = 'Search', filters = [], count, right }: { search?: string; onSearch?: (v: string) => void; placeholder?: string; filters?: FilterDef[]; count?: string; right?: ReactNode }) {
  return (
    <div className="filters">
      {onSearch && (
        <div className="input-icon" style={{ width: 240 }}>
          <Search size={14} />
          <input className="input" placeholder={placeholder} aria-label={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
      )}
      {filters.map((f) => (
        <select key={f.label} className="select" aria-label={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)}>
          <option value="">{f.label}</option>
          {f.options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      ))}
      {(count || right) && <span className="row" style={{ marginLeft: 'auto', gap: 10 }}>{count && <span className="small subtle">{count}</span>}{right}</span>}
    </div>
  );
}

/** Simple text search across selected fields. */
export function useSearch<T>(rows: T[], fields: (r: T) => string) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => fields(r).toLowerCase().includes(t)) : rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q]);
  return { q, setQ, filtered };
}

/* ---------- Status ---------- */
type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';
const TONES: [RegExp, Tone][] = [
  [/(fail|reject|declin|overdue|breach|break|missing|down|disput|returned|undeliver|lapsed|hit|error|critical|missed|suspended|expired)/i, 'bad'],
  [/(unreconcil|unmatched|suspense|pending|await|review|outstanding|hold|warning|degraded|delayed|exception|investigat|draft|conditions|expiring|potential|open|requested|due)/i, 'warn'],
  [/(progress|running|processing|scheduled|submitted|in force|assessment|registered|sent|generating|queued|live|streaming|monitoring|identified)/i, 'info'],
  [/(paid|complete|approved|accepted|active|healthy|posted|reconciled|delivered|clear|passed|filed|verified|met|resolved|success|valid|issued|current|licensed|received|ok)/i, 'ok'],
];
export const toneOf = (s: string): Tone => TONES.find(([re]) => re.test(s))?.[1] ?? 'neutral';
export const Status = ({ s }: { s: string }) => <StateChip tone={toneOf(s)}>{s}</StateChip>;

/* ---------- Synthetic labels ---------- */
export const Indicative = ({ label = 'Indicative' }: { label?: string }) => (
  <span className="tag-indicative" title="Synthetic, illustrative values — not a quote or contractual calculation"><FlaskConical size={11} />{label}</span>
);
export const SimTag = () => <span className="tag-indicative" title="Simulated for demonstration — no production connectivity"><FlaskConical size={11} />Simulated</span>;

/* ---------- Restricted information ---------- */
export function Sensitive({ cat, value, kind = 'text', full }: { cat: DataCat; value: string; kind?: MaskKind; full?: string }) {
  const store = useStore();
  const level = store.data(cat);
  const def = dataCategoryById(cat);
  if (level === 'full') return <>{full ?? value}</>;
  if (level === 'masked') return <span className="masked" title={`Masked — full value requires ${def.name} access`}>{maskValue(kind, value)}</span>;
  return <span className="restricted-inline" title={`Requires ${def.name} access`}><EyeOff size={12} />Restricted</span>;
}

/**
 * A section of restricted information. Full access → expandable details (viewing is audit-logged);
 * masked → summary only; hidden → lock panel with an access request option.
 */
export function RestrictedSection({ cat, title, summary, children, target }: { cat: DataCat; title: string; summary?: ReactNode; children: ReactNode; target?: string }) {
  const store = useStore();
  const level = store.data(cat);
  const def = dataCategoryById(cat);
  const [open, setOpen] = useState(false);
  const external = !!store.scope;

  return (
    <div className={`restricted ${level}`}>
      <button
        className="restricted-head"
        aria-expanded={level === 'full' ? open : undefined}
        disabled={level !== 'full'}
        onClick={() => {
          if (!open) store.logActivity('Viewed restricted information', `${title}${target ? ` · ${target}` : ''}`);
          setOpen(!open);
        }}
      >
        {level === 'full' ? <Unlock size={15} /> : <Lock size={15} />}
        <span className="grow">
          <span className="strong" style={{ display: 'block' }}>{title}</span>
          <span className="xs subtle">{def.name} · {level === 'full' ? 'Access granted — viewing is recorded' : level === 'masked' ? 'Summary only' : 'Restricted'}</span>
        </span>
        {level === 'full' && <ChevronDown size={15} className="chev" />}
      </button>
      {level === 'full' && open && <div className="restricted-body">{children}</div>}
      {level === 'masked' && (
        <div className="restricted-body small muted">{summary ?? 'Detailed information is restricted. A summary is not available for this item.'}</div>
      )}
      {level === 'hidden' && (
        <div className="restricted-body row between wrap small muted">
          <span>This information requires <strong>{def.name}</strong> access, which your profile and user group do not include.</span>
          {!external && <button className="btn btn-ghost btn-sm" onClick={() => store.requestAccess(`${def.name} — ${title}`, 'Needed to complete assigned work')}>Request access</button>}
        </div>
      )}
    </div>
  );
}

/* ---------- Permission-aware actions ---------- */
export function GatedButton({ module, level, onClick, children, className = 'btn btn-secondary btn-sm', disabled, reason }: {
  module: ModuleId;
  level: Level;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  reason?: string;
}) {
  const store = useStore();
  const allowed = store.can(module, level);
  const why = !allowed ? `Requires ${LEVELS.find((l) => l.id === level)!.label} permission on ${moduleById(module).name}` : reason;
  return (
    <button className={className} onClick={onClick} disabled={!allowed || disabled} title={!allowed || disabled ? why : undefined}>
      {!allowed && <Lock size={12} />}
      {children}
    </button>
  );
}

/** Small "read-only" notice when the user cannot act in a module. */
export function AccessNote({ module }: { module: ModuleId }) {
  const store = useStore();
  if (store.can(module, 'create') || store.can(module, 'edit') || store.can(module, 'approve')) return null;
  return (
    <div className="notice" role="note"><ShieldCheck size={15} /><div>View only. Your profile and user group allow viewing {moduleById(module).name}; actions are not available.</div></div>
  );
}

/* ---------- Small visual helpers ---------- */
export function KV({ items, two }: { items: [ReactNode, ReactNode][]; two?: boolean }) {
  return (
    <dl className={`kv ${two ? 'two' : ''}`}>
      {items.map(([k, v], i) => <div key={i}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export function Stages({ stages, current, failed }: { stages: string[]; current: number; failed?: boolean }) {
  return (
    <ol className="stages" aria-label="Progress">
      {stages.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? (failed ? 'failed' : 'current') : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="stage-dot" />
          <span className="stage-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export function BarList({ items, format = (n: number) => String(n), max }: { items: { label: string; value: number; tone?: 'bad' | 'warn' | 'muted' }[]; format?: (n: number) => string; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="barlist" role="table">
      {items.map((i) => (
        <div key={i.label} className="barlist-row" role="row">
          <span className="ellipsis small" role="cell">{i.label}</span>
          <span className="barlist-track" role="cell"><span className={i.tone ?? ''} style={{ width: `${Math.max(2, (Math.abs(i.value) / top) * 100)}%` }} /></span>
          <span className="mono small strong" role="cell" style={{ textAlign: 'right' }}>{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="row between" style={{ padding: '14px var(--s5) 6px' }}><h3>{children}</h3>{action}</div>;
}

export const PolicyLink = ({ id }: { id: string }) => {
  const store = useStore();
  const ok = store.can('policy-master', 'view') && (!store.scope || store.scope.includes(id));
  return ok ? <Link to={`/policies/${id}`} className="mono id-link" onClick={(e) => e.stopPropagation()}>{id}</Link> : <span className="mono">{id}</span>;
};
