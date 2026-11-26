import type { Task } from '../data/tasks';

const H = 3600000;

export const money = (n: number, cents = false) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 });

export const date = (iso: string) =>
  new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d}d ago`;
}

export const isOpen = (t: Task) => t.status !== 'Completed';
export const isOverdue = (t: Task) => isOpen(t) && new Date(t.dueAt).getTime() < Date.now();

/** "Due today" = due within the next 24 hours (operations run on rolling SLAs, not calendar days). */
export function isDueToday(t: Task) {
  if (!isOpen(t) || isOverdue(t)) return false;
  return new Date(t.dueAt).getTime() - Date.now() <= 24 * H;
}

export type SlaState = 'overdue' | 'today' | 'ok' | 'met' | 'missed';

export function sla(t: Task): { state: SlaState; label: string } {
  const due = new Date(t.dueAt).getTime();
  if (t.status === 'Completed') {
    const done = new Date(t.completedAt ?? t.dueAt).getTime();
    return done <= due ? { state: 'met', label: 'Met' } : { state: 'missed', label: 'Missed' };
  }
  const diff = due - Date.now();
  const abs = Math.abs(diff);
  const span = abs < H ? `${Math.max(1, Math.round(abs / 60000))}m` : abs < 48 * H ? `${Math.round(abs / H)}h` : `${Math.round(abs / (24 * H))}d`;
  if (diff < 0) return { state: 'overdue', label: `${span} overdue` };
  if (isDueToday(t)) return { state: 'today', label: `Due in ${span}` };
  return { state: 'ok', label: `Due in ${span}` };
}

export const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

/**
 * Urgency ordering: overdue → due within 24h → later; inside each band by priority, then due time.
 * Internal business criticality only breaks remaining ties and is never shown.
 */
export function byUrgency(a: Task, b: Task) {
  const rank = (t: Task) => (isOverdue(t) ? 0 : isDueToday(t) ? 1 : 2);
  return (
    rank(a) - rank(b) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() ||
    a.tier - b.tier
  );
}

/**
 * Status shown to users is the workflow state only. Lateness is an SLA fact and is shown in the SLA column,
 * so "Overdue" is never repeated as a status.
 */
export type DisplayStatus = 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Requires Approval' | 'Rejected';
export function displayStatus(t: Task): DisplayStatus {
  return t.status;
}

export const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
