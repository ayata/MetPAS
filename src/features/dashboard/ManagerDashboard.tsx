import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowUpRight, Users, Clock, Gauge } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { teamGroups } from '../../store/access';
import { taskActions } from '../../store/taskRules';
import { MODULE_CATALOG } from '../../config/modules';
import { groupById } from '../../config/groups';
import { SLA_TREND } from '../../data/operations';
import { userById } from '../../data/users';
import { byUrgency, greeting, isDueToday, isOverdue, relative } from '../../lib/format';
import { Empty, Panel, Sla, TaskStatus } from '../../components/ui';
import { DashboardHero } from '../../components/DashboardHero';
import { StackedBars, TrendLine } from '../../components/charts';
import { useOpenTask } from '../work/TaskDetail';
import { SeverityTag, useMyExceptions } from './AlertsPanel';
import { PriorityTag } from './PriorityWork';
import { taskModule } from '../../data/tasks';

type Tab = 'approvals' | 'escalations' | 'exceptions';

export function ManagerDashboard() {
  const store = useStore();
  const navigate = useNavigate();
  const openTask = useOpenTask();
  const [tab, setTab] = useState<Tab>('approvals');
  const groups = teamGroups(store.session);
  const team = store.state.tasks.filter((t) => groups.includes(t.groupId));
  const open = team.filter((t) => t.status !== 'Completed');
  const overdue = open.filter(isOverdue);
  const dueToday = open.filter(isDueToday).length;
  const sla7 = Math.round((SLA_TREND.reduce((a, p) => a + p.sla, 0) / SLA_TREND.length) * 10) / 10;

  const approvals = open.filter((t) => t.status === 'Requires Approval').sort(byUrgency);
  const escalations = open.filter((t) => t.escalated || (isOverdue(t) && (t.priority === 'Critical' || t.priority === 'High'))).sort(byUrgency);
  const exceptions = useMyExceptions().filter((e) => !e.resolved && e.severity === 'Critical');

  const members = store.state.users.filter((u) => groups.includes(u.groupId) && u.status === 'Active' && u.id !== store.session.userId);
  const rows = members
    .map((u) => ({
      id: u.id,
      label: u.name,
      a: team.filter((t) => t.assigneeId === u.id && t.status !== 'Completed').length,
      b: team.filter((t) => t.assigneeId === u.id && t.status === 'Completed').length,
    }))
    .filter((r) => r.a + r.b > 0)
    .sort((x, y) => y.a - x.a)
    .slice(0, 7);
  const unassigned = open.filter((t) => !t.assigneeId).length;

  const byArea = MODULE_CATALOG.map((m) => {
    const list = open.filter((t) => taskModule(t).id === m.id);
    return { id: m.id, name: m.name, count: list.length, overdue: list.filter(isOverdue).length, approvals: list.filter((t) => t.status === 'Requires Approval').length };
  }).filter((a) => a.count > 0).sort((a, b) => b.overdue - a.overdue || b.count - a.count);
  const maxArea = Math.max(1, ...byArea.map((a) => a.count));

  const scopeLabel = groups.length > 1 ? 'Groups 1–4' : groupById(groups[0]).name;
  const lists: Record<Tab, JSX.Element> = {
    approvals: approvals.length ? (
      <div className="list">
        {approvals.slice(0, 5).map((t) => {
          const can = taskActions(store, t).approve;
          return (
            <button key={t.id} className="list-row" onClick={() => openTask(t.id)}>
              <PriorityTag p={t.priority} />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="title ellipsis" style={{ display: 'block' }}>{t.title}</span>
                <span className="meta">{taskModule(t).name} · Submitted by {userById(t.submittedBy)?.name ?? '—'}</span>
              </span>
              <span className="hide-sm"><Sla task={t} /></span>
              <span className={`chip ${can ? 'blue' : ''}`}>{can ? 'Review' : 'View'}</span>
            </button>
          );
        })}
      </div>
    ) : <Empty compact title="No approvals waiting" icon={<CheckCircle2 size={14} />} />,
    escalations: escalations.length ? (
      <div className="list">
        {escalations.slice(0, 5).map((t) => (
          <button key={t.id} className="list-row" onClick={() => openTask(t.id)}>
            <PriorityTag p={t.priority} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="title ellipsis" style={{ display: 'block' }}>{t.title}</span>
              <span className="meta">{taskModule(t).name} · {userById(t.assigneeId)?.name ?? 'Unassigned'}</span>
            </span>
            <span className="hide-sm"><Sla task={t} /></span>
            <TaskStatus task={t} />
          </button>
        ))}
      </div>
    ) : <Empty compact title="No escalations" icon={<CheckCircle2 size={14} />} />,
    exceptions: exceptions.length ? (
      <div className="list">
        {exceptions.slice(0, 5).map((e) => (
          <button key={e.id} className="list-row" onClick={() => navigate(`/exceptions?focus=${e.id}`)}>
            <SeverityTag s={e.severity} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="title ellipsis" style={{ display: 'block' }}>{e.title}</span>
              <span className="meta">{e.source} · {relative(e.createdAt)}</span>
            </span>
          </button>
        ))}
      </div>
    ) : <Empty compact title="No critical exceptions" icon={<CheckCircle2 size={14} />} />,
  };

  return (
    <div className="page dash">
      <DashboardHero
        title={`${greeting()}, ${store.me.name.split(' ')[0]}`}
        subtitle={<>Team overview · {scopeLabel}</>}
        actions={[
          { label: `Unassigned (${unassigned})`, onClick: () => navigate('/work?view=unassigned') },
          { label: 'Open Team Queue', icon: <Users size={15} />, onClick: () => navigate('/work?view=team'), primary: true },
        ]}
        stats={[
          { label: 'Team Open Tasks', icon: <Users size={18} />, hint: `${unassigned} unassigned`, value: open.length, onClick: () => navigate('/work?view=team') },
          { label: 'Due Today', icon: <Clock size={18} />, hint: 'Within the next 24 hours', value: dueToday, tone: dueToday ? 'warning' : undefined, onClick: () => navigate('/work?view=team&sla=today') },
          { label: 'Overdue', icon: <AlertTriangle size={18} />, hint: `${overdue.filter((t) => t.priority === 'Critical' || t.priority === 'High').length} high priority`, value: overdue.length, tone: overdue.length ? 'critical' : 'success', onClick: () => navigate('/work?view=overdue') },
          { label: 'SLA Compliance', icon: <Gauge size={18} />, value: `${sla7}%`, hint: '7-day avg · target 95%', tone: sla7 >= 95 ? 'success' : 'warning', onClick: () => navigate('/work?view=completed') },
        ]}
      />

      <div className="dash-grid calm stretch">
        <section className="panel" aria-labelledby="ae-title">
          <div className="panel-head">
            <div>
              <h2 id="ae-title">Approvals & Escalations</h2>
              <div className="desc">Decisions and interventions that need you</div>
            </div>
            <div className="seg" role="tablist" aria-label="Approvals and escalations">
              {([['approvals', 'Approvals', approvals.length], ['escalations', 'Escalated', escalations.length], ['exceptions', 'Critical', exceptions.length]] as const).map(([id, label, n]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}<span className="count">{n}</span></button>
              ))}
            </div>
          </div>
          {lists[tab]}
        </section>

        <Panel title="Workload by Business Area" desc="Open team work by business component" flush>
          <div className="list">
            {byArea.slice(0, 6).map((a) => (
              <Link key={a.id} to={`/work?view=team&module=${a.id}`} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <span className="row">
                  <span className="title grow">{a.name}</span>
                  <span className="mono strong">{a.count}</span>
                </span>
                <span className="meter" aria-hidden>
                  <span style={{ width: `${((a.count - a.overdue) / maxArea) * 100}%`, background: 'var(--metlife-dark-blue)' }} />
                  {a.overdue > 0 && <span style={{ width: `${(a.overdue / maxArea) * 100}%`, background: 'var(--critical)' }} />}
                </span>
                <span className="meta row" style={{ gap: 6 }}>
                  {a.overdue > 0 ? <span className="overdue-flag" style={{ fontSize: 'var(--fs-xs)' }}><AlertTriangle size={12} />{a.overdue} overdue</span> : <span>None overdue</span>}
                  <span>· {a.approvals} awaiting approval</span>
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="dash-grid even">
        <Panel title="Team Workload" desc="Open vs completed tasks by person" actions={<Link to="/work?view=team" className="small strong row" style={{ gap: 4 }}>Team Queue<ArrowUpRight size={13} /></Link>}>
          {rows.length ? (
            <StackedBars rows={rows} aLabel="Open" bLabel="Completed" onSelect={(id) => navigate(`/work?view=team&assignee=${id}`)} />
          ) : <Empty compact title="No assigned work" />}
        </Panel>
        <Panel title="Team Performance" desc="SLA compliance, last 7 working days" actions={<span className="small muted">{SLA_TREND.reduce((a, p) => a + p.completed, 0)} completed</span>}>
          <TrendLine points={SLA_TREND.map((p) => ({ x: p.day, y: p.sla }))} target={95} min={88} max={100} label="SLA compliance percentage by day" />
        </Panel>
      </div>
    </div>
  );
}
