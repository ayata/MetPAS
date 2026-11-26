import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { taskModule, type Task } from '../../data/tasks';
import { displayStatus, isDueToday, isOverdue, PRIORITY_RANK, sla } from '../../lib/format';
import { Empty } from '../../components/ui';
import { useOpenTask } from '../work/TaskDetail';

const PRIORITY_CLASS: Record<Task['priority'], string> = { Critical: 'p-critical', High: 'p-high', Medium: 'p-medium', Low: 'p-low' };
export const PriorityTag = ({ p }: { p: Task['priority'] }) => <span className={`prio ${PRIORITY_CLASS[p]}`}>{p}</span>;

/** Work bands, in the order they are shown. */
type Band = 'overdue' | 'soon' | 'pending' | 'other';
const BAND_RANK: Record<Band, number> = { overdue: 0, soon: 1, pending: 2, other: 3 };

const band = (t: Task): Band => (isOverdue(t) ? 'overdue' : isDueToday(t) ? 'soon' : t.status === 'Pending' ? 'pending' : 'other');

/**
 * Overdue → due soon (next 24h) → pending → other assigned work.
 * Inside each band: business urgency first, then the nearest SLA.
 */
export function byPriorityWork(a: Task, b: Task) {
  return (
    BAND_RANK[band(a)] - BAND_RANK[band(b)] ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
}

const STATUS_CLASS: Record<string, string> = {
  Overdue: 's-overdue',
  Pending: 's-pending',
  'In Progress': 's-progress',
  'Requires Approval': 's-approval',
  Completed: 's-completed',
  Rejected: 's-rejected',
};

/**
 * My Priority Work — the user's real business tasks, most urgent first.
 * Four columns (Task · Policy · SLA · Status) sized to fit the panel with no horizontal scroll.
 */
export function PriorityWork({ tasks, viewAll, limit = 6 }: { tasks: Task[]; viewAll: string; limit?: number }) {
  const openTask = useOpenTask();
  const rows = [...tasks].sort(byPriorityWork).slice(0, limit);
  const overdue = tasks.filter(isOverdue).length;
  const soon = tasks.filter(isDueToday).length;

  return (
    <section className="panel pw" aria-labelledby="pw-title">
      <div className="panel-head">
        <div>
          <h2 id="pw-title">My Priority Work</h2>
          <div className="desc">
            {tasks.length} open
            {overdue > 0 && <> · <span className="pw-desc-overdue">{overdue} overdue</span></>}
            {soon > 0 && <> · <span className="pw-desc-soon">{soon} due today</span></>}
          </div>
        </div>
        <Link to={viewAll} className="link-pill">View all {tasks.length} <ArrowRight size={13} aria-hidden /></Link>
      </div>

      {rows.length === 0 ? (
        <Empty compact title="No open tasks — you're all caught up" icon={<CheckCircle2 size={14} />} />
      ) : (
        <table className="pw-table" aria-label="My priority work">
          <colgroup>
            <col className="pw-col-task" />
            <col className="pw-col-policy" />
            <col className="pw-col-sla" />
            <col className="pw-col-status" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Policy</th>
              <th scope="col">SLA</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const b = band(t);
              const s = sla(t);
              const status = displayStatus(t);
              const module = taskModule(t).name;
              return (
                <tr
                  key={t.id}
                  className={`pw-row band-${b}`}
                  tabIndex={0}
                  onClick={() => openTask(t.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTask(t.id); } }}
                  aria-label={`Open ${t.title}, ${module}, policy ${t.policyId}, ${s.label}, ${status}`}
                >
                  <td className="pw-task" title={`${t.title} — ${module}`}>
                    <span className="pw-task-name">{t.title}</span>
                    <span className="pw-task-module">{module}</span>
                  </td>
                  <td className="pw-policy"><span className="pw-policy-id">{t.policyId || '—'}</span></td>
                  <td className="pw-sla"><span className={`pw-sla-pill sla-${b}`}><i aria-hidden />{s.label}</span></td>
                  <td className="pw-status">
                    <span className="pw-status-wrap">
                      <span className={`pw-state ${STATUS_CLASS[status] ?? 's-pending'}`}><i aria-hidden />{status}</span>
                      <ChevronRight className="pw-chev" size={16} aria-hidden />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {tasks.length > rows.length && (
        <div className="pw-foot">
          <span className="pw-foot-count">Showing {rows.length} of {tasks.length} tasks</span>
          <span className="pw-foot-count">Sorted by urgency</span>
        </div>
      )}
    </section>
  );
}
