import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, CheckCircle2, Circle, CircleDot, Clock, Info, Inbox, Loader, X, XCircle, ShieldCheck,
  Activity, ArrowRight, BadgeCheck, BarChart3, CalendarClock, CircleDollarSign, FileText, Gauge, Hourglass, Layers, ListChecks,
  Mail, Network, Package, Scale, Timer, Users,
} from 'lucide-react';
import { CountUp } from './DashboardHero';
import { displayStatus, sla, type DisplayStatus } from '../lib/format';
import type { Task } from '../data/tasks';
import { useStore } from '../store/AppStore';

/* ---------- Badges ---------- */
const STATUS_META: Record<DisplayStatus, { cls: string; icon: ReactNode }> = {
  Pending: { cls: 's-pending', icon: <Circle size={11} strokeWidth={2.4} /> },
  'In Progress': { cls: 's-progress', icon: <CircleDot size={11} strokeWidth={2.4} /> },
  Completed: { cls: 's-completed', icon: <CheckCircle2 size={11} strokeWidth={2.4} /> },
  Overdue: { cls: 's-overdue', icon: <AlertTriangle size={11} strokeWidth={2.4} /> },
  'Requires Approval': { cls: 's-approval', icon: <ShieldCheck size={11} strokeWidth={2.4} /> },
  Rejected: { cls: 's-rejected', icon: <XCircle size={11} strokeWidth={2.4} /> },
};

export function StatusBadge({ status, quiet }: { status: DisplayStatus; quiet?: boolean }) {
  const m = STATUS_META[status];
  return (
    <span className={`badge ${m.cls} ${quiet ? 'quiet' : ''}`}>
      {m.icon}
      {status}
    </span>
  );
}
export const TaskStatus = ({ task, quiet }: { task: Task; quiet?: boolean }) => <StatusBadge status={displayStatus(task)} quiet={quiet} />;

export function Sla({ task }: { task: Task }) {
  const s = sla(task);
  return (
    <span className={`sla ${s.state}`}>
      {s.state === 'overdue' ? <AlertTriangle size={12} /> : <Clock size={12} />}
      {s.label}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: string }) {
  const map: Record<string, string> = { Critical: 'critical', 'Sev 1': 'critical', 'Sev 2': 'critical', Warning: 'warning', 'Sev 3': 'warning', Info: 'info', 'Sev 4': 'info' };
  return <span className={`dot ${map[severity] ?? ''}`} aria-hidden />;
}

/** Generic state chip with icon + text (never color alone). */
export function StateChip({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
  const cls = { ok: 's-completed', warn: 's-approval', bad: 's-overdue', info: 's-progress', neutral: 's-pending' }[tone];
  const icon = { ok: <CheckCircle2 size={11} />, warn: <AlertTriangle size={11} />, bad: <XCircle size={11} />, info: <Loader size={11} />, neutral: <Circle size={11} /> }[tone];
  // Only exceptions (warn / bad) get a coloured badge; normal states read as plain text so problems stand out.
  if (tone === 'ok' || tone === 'info' || tone === 'neutral') return <span className="status-text">{children}</span>;
  return <span className={`badge ${cls}`}>{icon}{children}</span>;
}

export function Avatar({ name, size }: { name: string; size?: 'sm' | 'lg' }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  return <span className={`avatar ${size ?? ''}`} aria-hidden>{ini}</span>;
}

/* ---------- Panel ---------- */
export function Panel({ title, desc, actions, children, className = '', flush, id }: { title?: ReactNode; desc?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean; id?: string }) {
  return (
    <section className={`panel ${className}`} aria-labelledby={id}>
      {title && (
        <div className="panel-head">
          <div>
            <h2 id={id}>{title}</h2>
            {desc && <div className="desc">{desc}</div>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      <div className={flush ? 'panel-body flush' : 'panel-body'}>{children}</div>
    </section>
  );
}

/* ---------- Empty ---------- */
export function Empty({ title, text, icon, compact, action }: { title: string; text?: string; icon?: ReactNode; compact?: boolean; action?: ReactNode }) {
  return (
    <div className={`empty ${compact ? 'compact' : ''}`}>
      <div className="empty-icon">{icon ?? <Inbox size={compact ? 14 : 18} />}</div>
      <div>
        <h3>{title}</h3>
        {text && <p>{text}</p>}
      </div>
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

export function Notice({ children, tone }: { children: ReactNode; tone?: 'warning' }) {
  return (
    <div className={`notice ${tone ?? ''}`} role="note">
      {tone === 'warning' ? <AlertTriangle size={15} /> : <Info size={15} />}
      <div>{children}</div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    refs.current[n]?.focus();
    onChange(tabs[n].id);
  };
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => (refs.current[i] = el)}
          role="tab"
          className="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Overlays ---------- */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

function useFocusTrap<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])') ?? el;
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !el) return;
      const f = Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, select, textarea, [tabindex="0"]'));
      if (!f.length) return;
      const [a, b] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    el?.addEventListener('keydown', trap);
    return () => { el?.removeEventListener('keydown', trap); prev?.focus?.(); };
  }, []);
  return ref;
}

export function Modal({ title, desc, onClose, children, footer, wide }: { title: string; desc?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEscape(onClose);
  const ref = useFocusTrap<HTMLDivElement>();
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {desc && <p>{desc}</p>}
          </div>
          <button className="icon-btn sm" onClick={onClose} aria-label="Close dialog" data-close>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}

export function Drawer({ onClose, header, children, footer, label }: { onClose: () => void; header: ReactNode; children: ReactNode; footer?: ReactNode; label: string }) {
  useEscape(onClose);
  const ref = useFocusTrap<HTMLDivElement>();
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1}>
        <div className="drawer-head">
          <div className="grow">{header}</div>
          <button className="icon-btn sm" onClick={onClose} aria-label="Close panel" data-close>
            <X size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}

/** Close a popover when clicking outside or pressing Escape. */
export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', click);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); };
  }, [open, onClose]);
  return ref;
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.tone === 'warning' ? <AlertTriangle size={16} /> : t.tone === 'info' ? <Info size={16} /> : <CheckCircle2 size={16} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export interface KpiItem {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: 'critical' | 'warning' | 'success';
  onClick?: () => void;
  icon?: ReactNode;
}

/** Picks a card icon from the tile label when the page does not supply one. */
function kpiIcon(label: string, tone?: KpiItem['tone']): ReactNode {
  const l = label.toLowerCase();
  const rules: [RegExp, ReactNode][] = [
    [/fail|error|incident|disput|discrepanc|exception|reject|returned|degraded|matches|escalat/, <AlertTriangle />],
    [/overdue|expir|due in|lag/, <CalendarClock />],
    [/pending|awaiting|approval/, <Hourglass />],
    [/receipt|receivable|commission|premium|paid|ceded|reserve|payment|face amount/, <CircleDollarSign />],
    [/availability|service level|straight-through/, <Gauge />],
    [/complet|accepted|cleared|healthy|reconciled|approved|submitted|delivered|tested/, <BadgeCheck />],
    [/statement|letter|document|report|extract|evidence|audit/, <FileText />],
    [/interaction|customer|license/, <Users />],
    [/feed|event|stream|real-time|decision/, <Activity />],
    [/connect|integration|layer/, <Network />],
    [/rider|product|treat|catalog/, <Package />],
    [/rule|check|control|workflow/, <ListChecks />],
    [/scenario|valuation|compared|line/, <BarChart3 />],
    [/batch|today|hour|24h/, <Timer />],
    [/regulat|compliance|tax/, <Scale />],
    [/request|claim|open|active/, <Layers />],
    [/mail/, <Mail />],
  ];
  const hit = rules.find(([re]) => re.test(l));
  if (hit) return hit[1];
  return tone === 'critical' ? <AlertTriangle /> : tone === 'success' ? <CheckCircle2 /> : <Info />;
}

/** Module-page indicator cards: same look as the dashboard cards. */
export function KpiRow({ items }: { items: KpiItem[] }) {
  return (
    <div className="stat-cards kpi-cards" role="list" aria-label="Summary indicators">
      {items.slice(0, 4).map((k) => (
          <button
            key={k.label}
            role="listitem"
            className={`stat-card sc2 kpi-card ${k.tone ?? ''}`}
            onClick={k.onClick}
            disabled={!k.onClick}
            aria-label={`${k.label}: ${typeof k.value === 'string' || typeof k.value === 'number' ? k.value : ''}${k.sub ? `. ${k.sub}` : ''}`}
          >
            <span className="sc2-top">
              <span className="sc2-label">{k.label}</span>
              <span className="sc2-icon" aria-hidden>{k.icon ?? kpiIcon(k.label, k.tone)}</span>
            </span>
            <span className="sc2-value">{typeof k.value === 'number' ? <CountUp value={k.value} /> : k.value}</span>
            {(k.sub || k.onClick) && (
              <span className="sc2-foot">
                <span className="sc2-hint kpi-sub-line">{k.sub}</span>
                {k.onClick && <span className="sc2-go" aria-hidden>View <ArrowRight size={13} /></span>}
              </span>
            )}
          </button>
      ))}
    </div>
  );
}
