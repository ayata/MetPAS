import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, AlertOctagon, CheckCircle2, Check, KeyRound, Server, X, XCircle } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { SEED_BATCH, SEED_INTEGRATIONS } from '../../data/operations';
import { greeting, relative } from '../../lib/format';
import { Empty, Panel, StateChip } from '../../components/ui';
import { DashboardHero } from '../../components/DashboardHero';

export const jobTone = (s: string) => (s === 'Succeeded' ? 'ok' : s === 'Failed' ? 'bad' : s === 'Running' ? 'info' : 'warn') as 'ok' | 'bad' | 'info' | 'warn';
export const integrationTone = (s: string) => (s === 'Healthy' ? 'ok' : s === 'Down' ? 'bad' : 'warn') as 'ok' | 'bad' | 'warn';
export const sevTone = (s: string) => (s === 'Sev 1' || s === 'Sev 2' ? 'bad' : s === 'Sev 3' ? 'warn' : 'neutral') as 'bad' | 'warn' | 'neutral';

type Tab = 'access' | 'changes';

export function SupportDashboard() {
  const store = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('access');
  const active = store.state.incidents.filter((i) => i.status !== 'Resolved');
  const failed = SEED_BATCH.filter((b) => b.status === 'Failed');
  const pendingAccess = store.state.access.filter((a) => a.status === 'Pending');
  const pendingChanges = store.state.changes.filter((c) => c.status === 'Awaiting approval' || c.status === 'In testing');
  const degraded = SEED_INTEGRATIONS.filter((i) => i.status !== 'Healthy');
  const canAccess = store.can('access', 'approve');
  const canChange = store.can('monitoring', 'approve');

  return (
    <div className="page dash">
      <DashboardHero
        title={`${greeting()}, ${store.me.name.split(' ')[0]}`}
        subtitle={<>Platform status · {active.length} active incidents, {failed.length} failed {failed.length === 1 ? 'job' : 'jobs'}</>}
        actions={[
          { label: 'Integrations', onClick: () => navigate('/tech/integrations') },
          { label: 'System Monitoring', icon: <Activity size={15} />, onClick: () => navigate('/operations'), primary: true },
        ]}
        stats={[
          { label: 'Active Incidents', icon: <AlertOctagon size={18} />, hint: `${active.filter((i) => i.severity === 'Sev 1' || i.severity === 'Sev 2').length} high severity`, value: active.length, tone: active.length ? 'warning' : 'success', onClick: () => navigate('/operations?tab=incidents') },
          { label: 'Failed Jobs', icon: <XCircle size={18} />, hint: 'Last 24 hours', value: failed.length, tone: failed.length ? 'critical' : 'success', onClick: () => navigate('/operations?tab=batch') },
          { label: 'Pending Access Requests', icon: <KeyRound size={18} />, hint: 'Awaiting review', value: pendingAccess.length, onClick: () => navigate('/access?tab=requests') },
          { label: 'System Availability', icon: <Server size={18} />, value: '99.92%', hint: '30-day · target 99.9%', tone: 'success', onClick: () => navigate('/operations?tab=health') },
        ]}
      />

      <div className="dash-grid even">
        <Panel title="System Health" flush actions={<Link to="/tech/integrations" className="small strong">Integrations</Link>}>
          <div className="health">
            <span className={`health-icon ${degraded.length ? 'warning' : 'ok'}`}>{degraded.length ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span>
            <div className="grow">
              <div className="strong">{degraded.length ? 'Operational — degraded performance' : 'All systems operational'}</div>
              <div className="small muted">{degraded.length ? `${degraded.map((d) => d.name).join(', ')} above latency threshold` : 'No active alerts'}</div>
            </div>
          </div>
          <div className="list">
            {SEED_INTEGRATIONS.slice(0, 5).map((i) => (
              <div key={i.name} className="list-row">
                <span className="grow title">{i.name}</span>
                <span className="small subtle mono hide-sm">{i.latency}</span>
                <StateChip tone={integrationTone(i.status)}>{i.status}</StateChip>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Incident Management" flush actions={<Link to="/operations?tab=incidents" className="small strong">View all</Link>}>
          {active.length === 0 ? <Empty compact title="No active incidents" icon={<CheckCircle2 size={14} />} /> : (
            <div className="list">
              {active.slice(0, 4).map((i) => (
                <button key={i.id} className="list-row" onClick={() => navigate(`/operations?tab=incidents&focus=${i.id}`)}>
                  <StateChip tone={sevTone(i.severity)}>{i.severity}</StateChip>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="title ellipsis" style={{ display: 'block' }}>{i.title}</span>
                    <span className="meta">{i.id} · {i.team} · {relative(i.openedAt)}</span>
                  </span>
                  <span className="small muted nowrap">{i.status}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Batch & Interface Monitoring" flush actions={<Link to="/operations?tab=batch" className="small strong">View all</Link>}>
          <div className="list">
            {SEED_BATCH.slice(0, 5).map((b) => (
              <div key={b.id} className="list-row">
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="title" style={{ display: 'block' }}>{b.name}</span>
                  <span className="meta">{b.schedule} · {relative(b.lastRun)}{b.errors ? ` · ${b.errors} errors` : ''}</span>
                </span>
                <StateChip tone={jobTone(b.status)}>{b.status}</StateChip>
              </div>
            ))}
          </div>
          <div className="panel-foot" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">{SEED_INTEGRATIONS.reduce((a, i) => a + i.pending, 0)} messages pending across integrations</span>
            <Link to="/tech/feeds" className="small strong">Real-time feeds</Link>
          </div>
        </Panel>

        <section className="panel" aria-labelledby="acm-title">
          <div className="panel-head">
            <h2 id="acm-title">Access & Change Management</h2>
            <div className="seg" role="tablist" aria-label="Access and change">
              <button role="tab" aria-selected={tab === 'access'} onClick={() => setTab('access')}>Access<span className="count">{pendingAccess.length}</span></button>
              <button role="tab" aria-selected={tab === 'changes'} onClick={() => setTab('changes')}>Changes<span className="count">{pendingChanges.length}</span></button>
            </div>
          </div>
          {tab === 'access' ? (
            pendingAccess.length === 0 ? <Empty compact title="No pending access requests" icon={<CheckCircle2 size={14} />} /> : (
              <div className="list">
                {pendingAccess.map((r) => (
                  <div key={r.id} className="list-row">
                    <span className="grow" style={{ minWidth: 0 }}>
                      <span className="title ellipsis" style={{ display: 'block' }}>{r.userName}</span>
                      <span className="meta ellipsis" style={{ display: 'block' }}>{r.requested}</span>
                    </span>
                    {canAccess ? (
                      <span className="row" style={{ gap: 4 }}>
                        <button className="icon-btn sm" aria-label={`Approve ${r.id}`} data-tip="Approve" onClick={() => store.decideAccess(r.id, true)}><Check size={15} color="var(--metlife-dark-blue)" /></button>
                        <button className="icon-btn sm" aria-label={`Reject ${r.id}`} data-tip="Reject" onClick={() => store.decideAccess(r.id, false)}><X size={15} color="var(--critical)" /></button>
                      </span>
                    ) : <span className="xs subtle">View only</span>}
                  </div>
                ))}
              </div>
            )
          ) : pendingChanges.length === 0 ? <Empty compact title="No pending changes" icon={<CheckCircle2 size={14} />} /> : (
            <div className="list">
              {pendingChanges.map((c) => (
                <div key={c.id} className="list-row">
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="title ellipsis" style={{ display: 'block' }}>{c.title}</span>
                    <span className="meta">{c.id} · {c.window} · {c.risk} risk{c.affectsContractualValues ? ' · Affects contractual values' : ''}</span>
                  </span>
                  {c.status === 'Awaiting approval' && canChange ? (
                    <span className="row" style={{ gap: 4 }}>
                      <button className="icon-btn sm" aria-label={`Approve ${c.id}`} data-tip="Approve" onClick={() => store.decideChange(c.id, true)}><Check size={15} color="var(--metlife-dark-blue)" /></button>
                      <button className="icon-btn sm" aria-label={`Reject ${c.id}`} data-tip="Reject" onClick={() => store.decideChange(c.id, false)}><X size={15} color="var(--critical)" /></button>
                    </span>
                  ) : <StateChip tone="info">{c.status}</StateChip>}
                </div>
              ))}
            </div>
          )}
          <div className="panel-foot" style={{ justifyContent: 'space-between' }}>
            <Link to="/access" className="small strong">User administration</Link>
            <Link to="/operations?tab=changes" className="small strong">Release calendar</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
