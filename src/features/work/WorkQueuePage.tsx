import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, FilePlus2, Search, X } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { isExternal, teamGroups } from '../../store/access';
import { TASK_TYPES, taskModule, type Task } from '../../data/tasks';
import { MODULE_CATALOG } from '../../config/modules';
import { PriorityTag } from '../dashboard/PriorityWork';
import { userById } from '../../data/users';
import { byUrgency, displayStatus, isDueToday, isOverdue } from '../../lib/format';
import { Avatar, Empty, Sla, TaskStatus } from '../../components/ui';
import { useShell } from '../../layout/AppShell';
import { useOpenTask } from './TaskDetail';
import { Crumbs, Pager, PolicyLink, usePaged } from '../../components/module';

type View = 'mine' | 'all' | 'team' | 'unassigned' | 'pending' | 'overdue' | 'completed' | 'requests';
const PR = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

export function WorkQueuePage() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const openTask = useOpenTask();
  const { openNewRequest } = useShell();
  const external = isExternal(store.session.groupId);
  const me = store.session.userId;

  const views: { id: View; label: string; test: (t: Task) => boolean }[] = external
    ? [{ id: 'requests', label: 'My Requests', test: () => true }]
    : [
        { id: 'mine', label: 'My Tasks', test: (t) => t.assigneeId === me && t.status !== 'Completed' },
        { id: 'all', label: 'All Open', test: (t) => t.status !== 'Completed' },
        ...(store.session.role === 'manager'
          ? [{ id: 'team' as View, label: 'Team Queue', test: (t: Task) => t.status !== 'Completed' && !!t.assigneeId && teamGroups(store.session).includes(t.groupId) }]
          : []),
        { id: 'unassigned', label: 'Unassigned', test: (t) => t.status !== 'Completed' && !t.assigneeId },
        { id: 'pending', label: 'Pending', test: (t) => t.status === 'Pending' || t.status === 'Requires Approval' },
        { id: 'overdue', label: 'Overdue', test: isOverdue },
        { id: 'completed', label: 'Completed', test: (t) => t.status === 'Completed' },
      ];

  const view = (views.find((v) => v.id === params.get('view'))?.id ?? views[0].id) as View;
  const f = {
    module: params.get('module') ?? '',
    type: params.get('type') ?? '',
    priority: params.get('priority') ?? '',
    status: params.get('status') ?? '',
    sla: params.get('sla') ?? '',
    assignee: params.get('assignee') ?? '',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? 'sla',
    dir: params.get('dir') ?? 'asc',
  };

  const set = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  const base = store.visibleTasks;
  const counts = Object.fromEntries(views.map((v) => [v.id, base.filter(v.test).length]));
  const assignees = useMemo(() => Array.from(new Set(base.map((t) => t.assigneeId).filter(Boolean))) as string[], [base]);
  const types = TASK_TYPES.filter((t) => base.some((x) => x.typeId === t.id));
  const areas = MODULE_CATALOG.filter((m) => base.some((x) => taskModule(x).id === m.id));

  const rows = useMemo(() => {
    const v = views.find((x) => x.id === view)!;
    const q = f.q.toLowerCase();
    const list = base.filter(
      (t) =>
        v.test(t) &&
        (!f.module || taskModule(t).id === f.module) &&
        (!f.type || t.typeId === f.type) &&
        (!f.priority || t.priority === f.priority) &&
        (!f.status || displayStatus(t) === f.status || t.status === f.status) &&
        (!f.sla || (f.sla === 'overdue' ? isOverdue(t) : f.sla === 'today' ? isDueToday(t) : !isOverdue(t) && !isDueToday(t))) &&
        (!f.assignee || (f.assignee === 'none' ? !t.assigneeId : t.assigneeId === f.assignee)) &&
        (!q || t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || t.policyId.toLowerCase().includes(q)),
    );
    const dir = f.dir === 'desc' ? -1 : 1;
    const cmp: Record<string, (a: Task, b: Task) => number> = {
      sla: byUrgency,
      module: (a, b) => taskModule(a).name.localeCompare(taskModule(b).name) || byUrgency(a, b),
      priority: (a, b) => PR[a.priority] - PR[b.priority] || byUrgency(a, b),
      title: (a, b) => a.title.localeCompare(b.title),
      assignee: (a, b) => (userById(a.assigneeId)?.name ?? 'zz').localeCompare(userById(b.assigneeId)?.name ?? 'zz'),
    };
    return [...list].sort((a, b) => (cmp[f.sort] ?? byUrgency)(a, b) * dir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, view, params]);

  const activeFilters = ['module', 'type', 'priority', 'status', 'sla', 'assignee', 'q'].filter((k) => (f as Record<string, string>)[k]);
  // Opening a task (?task=) keeps the current page; changing view, filters or sort returns to page 1.
  const paged = usePaged(rows, `${view}|${JSON.stringify(f)}|${rows.length}`);

  const SortTh = ({ id, label, className }: { id: string; label: string; className?: string }) => (
    <th className={className} aria-sort={f.sort === id ? (f.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => set({ sort: id, dir: f.sort === id && f.dir === 'asc' ? 'desc' : 'asc' })}>
        {label}
        {f.sort === id && (f.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  const heading = external
    ? { title: 'My Requests', lead: 'Track the status of service requests you have submitted.' }
    : view === 'mine'
      ? { title: 'My Tasks', lead: 'Work assigned to you, most urgent first. Select a task to open its details.' }
      : view === 'team'
        ? { title: 'Team Queue', lead: "Your team's assigned work, so you can balance workload and step in on SLA risks." }
        : { title: 'Work Queue', lead: 'Find, prioritize and act on work. Select a task to open its details.' };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          {/* Breadcrumb and title follow the sidebar entry that is highlighted for this view. */}
          <Crumbs items={['My Work', heading.title]} />
          <h1>{heading.title}</h1>
          <p className="lead">{heading.lead}</p>
        </div>
        {store.can('work', 'create') && (
          <button className="btn btn-primary" onClick={() => openNewRequest(external ? { typeId: 'service-request' } : undefined)}><FilePlus2 size={15} />{external ? 'New Service Request' : 'New Request'}</button>
        )}
      </div>

      <section className="panel">
        {views.length > 1 && (
          <div style={{ padding: '0 var(--s5)' }}>
            <div className="tabs" role="tablist" aria-label="Queue views">
              {views.map((v) => (
                <button key={v.id} role="tab" className="tab" aria-selected={view === v.id} onClick={() => set({ view: v.id })}>
                  {v.label}<span className="count">{counts[v.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="filters" role="search" aria-label="Filter tasks">
          <div className="input-icon" style={{ width: 220 }}>
            <Search size={14} />
            <input className="input" placeholder="Search task, ID or policy" aria-label="Search tasks" value={f.q} onChange={(e) => set({ q: e.target.value })} />
          </div>
          <select className="select" aria-label="Business area" value={f.module} onChange={(e) => set({ module: e.target.value })}>
            <option value="">All business areas</option>
            {areas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="select" aria-label="Task type" value={f.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="">All task types</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="select" aria-label="Priority" value={f.priority} onChange={(e) => set({ priority: e.target.value })}>
            <option value="">Any priority</option>
            {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="select" aria-label="Status" value={f.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Any status</option>
            {['Pending', 'In Progress', 'Requires Approval', 'Rejected', 'Completed'].map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="select" aria-label="SLA" value={f.sla} onChange={(e) => set({ sla: e.target.value })}>
            <option value="">Any SLA</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="later">Due later</option>
          </select>
          {!external && view !== 'mine' && (
            <select className="select" aria-label="Assigned user" value={f.assignee} onChange={(e) => set({ assignee: e.target.value })}>
              <option value="">Anyone</option>
              <option value="none">Unassigned</option>
              {assignees.map((id) => <option key={id} value={id}>{userById(id)?.name}</option>)}
            </select>
          )}
          {activeFilters.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => set(Object.fromEntries(activeFilters.map((k) => [k, ''])))}><X size={13} />Clear filters</button>
          )}
          <span className="small subtle" style={{ marginLeft: 'auto' }}>{rows.length} {rows.length === 1 ? 'task' : 'tasks'}</span>
        </div>

        {rows.length === 0 ? (
          <Empty title="No tasks match" text={activeFilters.length ? 'Try clearing filters or choosing another view.' : 'Nothing in this view right now.'} />
        ) : (
          <>
          <div className="table-wrap sticky-head">
            <table className="table">
              <thead>
                <tr>
                  <SortTh id="title" label="Task" />
                  <SortTh id="module" label="Business area" className="hide-md" />
                  <th className="hide-md">Policy</th>
                  <SortTh id="priority" label="Priority" className="hide-md" />
                  <SortTh id="sla" label="SLA" />
                  {!external && <SortTh id="assignee" label="Assigned" className="hide-md" />}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((t) => {
                  const u = userById(t.assigneeId);
                  return (
                    <tr key={t.id} className={`clickable ${isOverdue(t) ? 'is-overdue' : ''} ${params.get('task') === t.id ? 'selected' : ''}`} onClick={() => openTask(t.id)} onKeyDown={(e) => e.key === 'Enter' && openTask(t.id)} tabIndex={0} aria-label={`Open ${t.title} ${t.id}`}>
                      <td>
                        <div className="primary-cell">{t.title}</div>
                        <Link
                          to={`/work/tasks/${t.id}`}
                          className="mono id-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // allow open in new tab
                            e.preventDefault();
                            openTask(t.id);
                          }}
                        >{t.id}</Link>
                      </td>
                      <td className="hide-md small">{taskModule(t).name}</td>
                      <td className="hide-md small">{t.policyId ? <PolicyLink id={t.policyId} /> : <span className="subtle">—</span>}</td>
                      <td className="hide-md"><PriorityTag p={t.priority} /></td>
                      <td><Sla task={t} /></td>
                      {!external && (
                        <td className="hide-md">
                          {u ? <span className="row small"><Avatar name={u.name} size="sm" />{u.id === me ? 'You' : u.name}</span> : <span className="small subtle">Unassigned</span>}
                        </td>
                      )}
                      <td><TaskStatus task={t} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager {...paged} noun="tasks" />
          </>
        )}
      </section>
    </div>
  );
}
