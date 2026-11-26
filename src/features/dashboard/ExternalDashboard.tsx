import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FilePlus2, FileText, Inbox, MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { POLICIES } from '../../data/policies';
import { greeting, money } from '../../lib/format';
import { Empty, Panel, TaskStatus } from '../../components/ui';
import { isAgent } from '../../store/access';
import { DashboardHero } from '../../components/DashboardHero';
import { useShell } from '../../layout/AppShell';
import { useOpenTask } from '../work/TaskDetail';

/** Group 6 — controlled, read-mostly digital channel experience. */
export function ExternalDashboard() {
  const store = useStore();
  const navigate = useNavigate();
  const { openNewRequest } = useShell();
  const openTask = useOpenTask();
  const policies = POLICIES.filter((p) => store.scope?.includes(p.id));
  const requests = store.visibleTasks;
  const open = requests.filter((t) => t.status !== 'Completed');

  return (
    <div className="page dash">
      <DashboardHero
        title={`${greeting()}, ${store.me.name.split(' ')[0]}`}
        subtitle="View your policies and track service requests securely."
        actions={[
          ...(!isAgent(store.me) && store.can('self-service', 'view') ? [{ label: 'My Portal', icon: <MonitorSmartphone size={15} />, onClick: () => navigate('/customer/portal') }] : []),
          ...(store.can('work', 'create') ? [{ label: 'New Service Request', icon: <FilePlus2 size={15} />, onClick: () => openNewRequest({ typeId: 'service-request' }), primary: true }] : []),
        ]}
        stats={[
          { label: 'Policies', icon: <FileText size={18} />, hint: 'Linked to your profile', value: policies.length, onClick: () => navigate('/policies') },
          { label: 'Open Requests', icon: <Inbox size={18} />, hint: 'With the servicing team', value: open.length, onClick: () => navigate('/work?view=requests') },
          { label: 'Completed', icon: <CheckCircle2 size={18} />, hint: 'Last 90 days', value: requests.length - open.length, onClick: () => navigate('/work?view=requests&status=Completed') },
          { label: 'Identity', icon: <ShieldCheck size={18} />, value: 'Verified', tone: 'success', hint: 'Authority on file' },
        ]}
      />
      <div className="dash-grid">
        <Panel title="My policies" flush actions={<Link to="/policies" className="small strong">View all</Link>}>
          {policies.length === 0 ? <Empty compact title="No linked policies" /> : (
            <div className="list">
              {policies.slice(0, 6).map((p) => (
                <Link key={p.id} to={`/policies/${p.id}`} className="list-row">
                  <span className="grow">
                    <span className="title" style={{ display: 'block' }}>{p.owner.name}</span>
                    <span className="meta">{p.id} · {p.product}</span>
                  </span>
                  <span className="small muted mono">{money(p.faceAmount)}</span>
                  <ArrowRight size={14} className="subtle" />
                </Link>
              ))}
            </div>
          )}
        </Panel>
        <div className="side-stack">
          <Panel title="My requests" flush>
            {requests.length === 0 ? <Empty compact title="No requests yet" /> : (
              <div className="list">
                {requests.slice(0, 4).map((t) => (
                  <button key={t.id} className="list-row" onClick={() => openTask(t.id)}>
                    <span className="grow"><span className="title" style={{ display: 'block' }}>{t.title}</span><span className="meta">{t.id}</span></span>
                    <TaskStatus task={t} />
                  </button>
                ))}
              </div>
            )}
          </Panel>
          <div className="notice"><ShieldCheck size={15} /><span>Policy information is protected. Sensitive values are masked in this channel.</span></div>
        </div>
      </div>
    </div>
  );
}
