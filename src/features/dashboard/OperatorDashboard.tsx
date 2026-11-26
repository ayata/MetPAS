import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FilePlus2, Inbox, ListChecks, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { groupById } from '../../config/groups';
import { greeting, isDueToday, isOverdue } from '../../lib/format';
import { DashboardHero, type HeroAction, type HeroFocus } from '../../components/DashboardHero';
import { useOpenTask } from '../work/TaskDetail';
import { useShell } from '../../layout/AppShell';
import { byPriorityWork, PriorityWork } from './PriorityWork';
import { AlertsPanel } from './AlertsPanel';

export function OperatorDashboard() {
  const store = useStore();
  const navigate = useNavigate();
  const { openNewRequest } = useShell();
  const mine = store.visibleTasks.filter((t) => t.assigneeId === store.session.userId && t.status !== 'Completed');
  const overdue = mine.filter(isOverdue).length;
  const dueToday = mine.filter(isDueToday).length;
  const awaiting = mine.filter((t) => t.status === 'Requires Approval').length;
  const canCreate = store.can('work', 'create');
  const openTask = useOpenTask();

  // One clear "what to do first" message, driven by the same ordering as My Priority Work.
  const next = [...mine].sort(byPriorityWork)[0];
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const focus: HeroFocus | undefined = !next
    ? { tone: 'calm', icon: <CheckCircle2 size={18} />, text: <>You're all caught up — no open tasks assigned to you.</> }
    : overdue
      ? { tone: 'critical', icon: <AlertTriangle size={18} />, text: <><strong>{plural(overdue, 'task')} {overdue === 1 ? 'is' : 'are'} overdue.</strong> Start with <strong>{next.title}</strong> <span className="hf-ref">{next.policyId}</span></>, action: { label: 'Start now', onClick: () => openTask(next.id) } }
      : dueToday
        ? { tone: 'warning', icon: <Clock size={18} />, text: <><strong>{plural(dueToday, 'task')} due today.</strong> Next up: <strong>{next.title}</strong> <span className="hf-ref">{next.policyId}</span></>, action: { label: 'Open task', onClick: () => openTask(next.id) } }
        : { tone: 'calm', icon: <CheckCircle2 size={18} />, text: <><strong>You're on track</strong> — nothing is overdue or due today. Next up: <strong>{next.title}</strong></>, action: { label: 'Open task', onClick: () => openTask(next.id) } };

  const actions: HeroAction[] = [
    { label: 'My Work Queue', icon: <Inbox size={15} />, onClick: () => navigate('/work?view=mine') },
    ...(canCreate ? [{ label: 'New Request', icon: <FilePlus2 size={15} />, onClick: () => openNewRequest(), primary: true }] : []),
  ];

  return (
    <div className="page dash">
      <DashboardHero
        title={<>{greeting()}, <span className="hero-name">{store.me.name.split(' ')[0]}</span></>}
        focus={focus}
        subtitle={<>{store.me.name} · {groupById(store.session.groupId).name}</>}
        actions={actions}
        stats={[
          { label: 'My Open Tasks', icon: <ListChecks size={18} />, hint: 'Assigned to you', value: mine.length, onClick: () => navigate('/work?view=mine') },
          { label: 'Due Today', icon: <Clock size={18} />, hint: 'Within the next 24 hours', value: dueToday, tone: dueToday ? 'warning' : undefined, onClick: () => navigate('/work?view=mine&sla=today') },
          { label: 'Overdue', icon: <AlertTriangle size={18} />, hint: overdue ? 'Past SLA — act now' : 'Nothing past SLA', value: overdue, tone: overdue ? 'critical' : 'success', onClick: () => navigate('/work?view=mine&sla=overdue') },
          { label: 'Awaiting Approval', icon: <ShieldCheck size={18} />, hint: 'Submitted by you', value: awaiting, tone: 'info', onClick: () => navigate('/work?view=mine&status=Requires%20Approval') },
        ]}
      />

      <div className="dash-grid calm pw-matched dash-enter" style={{ '--i': 5 } as CSSProperties}>
        <PriorityWork tasks={mine} viewAll="/work?view=mine" limit={3} />
        <div className="side-stack">
          <AlertsPanel />
        </div>
      </div>
      <footer className="dash-foot">
        <span>All policies, customers and amounts are synthetic.</span>
        <Link to="/help">How work is prioritized</Link>
      </footer>
    </div>
  );
}
