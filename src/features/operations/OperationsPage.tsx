import { useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { SEED_BATCH, SEED_INTEGRATIONS, SEED_LOGS, type IncidentStatus } from '../../data/operations';
import { userById } from '../../data/users';
import { dateTime, relative } from '../../lib/format';
import { Panel, StateChip, Tabs } from '../../components/ui';
import { BarList, KV, ModulePage, RestrictedSection, SimTag, Status } from '../../components/module';
import { ERROR_SUMMARY, PERFORMANCE, SECURITY_INDICATORS } from '../../data/technology';
import { FEEDS } from '../../data/technology';
import { Link } from 'react-router-dom';
import { integrationTone, jobTone, sevTone } from '../dashboard/SupportDashboard';

type Tab = 'health' | 'incidents' | 'batch' | 'integrations' | 'errors' | 'changes' | 'security';
const STATUSES: IncidentStatus[] = ['Investigating', 'Identified', 'Monitoring', 'Resolved'];

/** System Monitoring (formerly Operations Monitor). */
export function OperationsPage() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'health';
  const focus = params.get('focus');
  const canEdit = store.can('monitoring', 'edit');
  const canApprove = store.can('monitoring', 'approve');
  const { toast } = store;

  return (
    <ModulePage
      module="monitoring"
      lead="System health, availability, data feeds, integration status, processing performance, errors and operational alerts."
      actions={<SimTag />}
      kpis={[
        { label: 'System availability', value: '99.92%', sub: '30-day · target 99.9%', tone: 'success', onClick: () => setParams({ tab: 'health' }, { replace: true }) },
        { label: 'Active incidents', value: store.state.incidents.filter((i) => i.status !== 'Resolved').length, tone: 'warning', onClick: () => setParams({ tab: 'incidents' }, { replace: true }) },
        { label: 'Failed batch jobs', value: SEED_BATCH.filter((b) => b.status === 'Failed').length, tone: 'critical', onClick: () => setParams({ tab: 'batch' }, { replace: true }) },
        { label: 'Errors (24h)', value: ERROR_SUMMARY.reduce((a, e) => a + e.errors, 0), onClick: () => setParams({ tab: 'errors' }, { replace: true }) },
      ]}
    >
      <section className="panel">
        <div style={{ padding: '0 var(--s5)' }}>
          <Tabs<Tab>
            label="Operations sections"
            value={tab}
            onChange={(t) => setParams({ tab: t }, { replace: true })}
            tabs={[
              { id: 'health', label: 'Health overview' },
              { id: 'incidents', label: 'Incidents', count: store.state.incidents.filter((i) => i.status !== 'Resolved').length },
              { id: 'batch', label: 'Batch jobs' },
              { id: 'integrations', label: 'Integrations & feeds' },
              { id: 'errors', label: 'Errors & performance' },
              { id: 'changes', label: 'Changes & releases' },
              { id: 'security', label: 'Security' },
            ]}
          />
        </div>

        {tab === 'health' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-3">
              <h3>Component health</h3>
              <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                {[['Policy administration core', 'Healthy'], ['Calculation services', 'Degraded'], ['Workflow engine', 'Healthy'], ['Document generation', 'Healthy'], ['Digital portal', 'Healthy'], ['Batch scheduler', 'Degraded']].map(([n, st]) => (
                  <div key={n} className="list-row"><span className="grow title">{n}</span><Status s={st} /></div>
                ))}
              </div>
            </div>
            <div className="stack gap-3">
              <h3>Operational alerts</h3>
              <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                {[['Premium posting batch failed — 37 records', 'Critical'], ['Payments feed lag above 1.5s', 'Warning'], ['Benefit calculation p95 above target', 'Warning'], ['Correspondence print stream delayed', 'Warning']].map(([n, st]) => (
                  <div key={n} className="list-row"><span className="grow small">{n}</span><StateChip tone={st === 'Critical' ? 'bad' : 'warn'}>{st}</StateChip></div>
                ))}
              </div>
              <h3>Security indicators</h3>
              <KV two items={SECURITY_INDICATORS.map((i) => [i.name, <span className="row" style={{ gap: 6 }}>{i.value}<Status s={i.status} /></span>] as [string, JSX.Element])} />
            </div>
          </div>
        )}

        {tab === 'incidents' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Incident</th><th>Severity</th><th className="hide-md">Service</th><th className="hide-md">Support team</th><th>Opened</th><th>Resolution status</th></tr></thead>
              <tbody>
                {store.state.incidents.map((i) => (
                  <tr key={i.id} className={focus === i.id ? 'selected' : ''}>
                    <td><div className="primary-cell">{i.title}</div><div className="id-cell">{i.id} · Owner {userById(i.owner)?.name}</div></td>
                    <td><StateChip tone={sevTone(i.severity)}>{i.severity}</StateChip></td>
                    <td className="small hide-md">{i.service}</td>
                    <td className="small hide-md">{i.team}</td>
                    <td className="small muted nowrap">{relative(i.openedAt)}</td>
                    <td>
                      {canEdit ? (
                        <select className="select" style={{ height: 30, width: 150, fontSize: 'var(--fs-sm)' }} aria-label={`Status for ${i.id}`} value={i.status} onChange={(e) => store.setIncidentStatus(i.id, e.target.value as IncidentStatus)}>
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      ) : <StateChip tone={i.status === 'Resolved' ? 'ok' : 'info'}>{i.status}</StateChip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'batch' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Job</th><th className="hide-md">Schedule</th><th>Last run</th><th className="num hide-md">Records</th><th className="num">Errors</th><th>Status</th><th /></tr></thead>
              <tbody>
                {SEED_BATCH.map((b) => (
                  <tr key={b.id} className={b.status === 'Failed' ? 'is-overdue' : ''}>
                    <td><div className="primary-cell">{b.name}</div><div className="id-cell">{b.id} · {b.duration}</div></td>
                    <td className="small hide-md">{b.schedule}</td>
                    <td className="small muted nowrap">{relative(b.lastRun)}</td>
                    <td className="num hide-md">{b.records.toLocaleString()}</td>
                    <td className="num">{b.errors}</td>
                    <td><StateChip tone={jobTone(b.status)}>{b.status}</StateChip></td>
                    <td className="num">{canEdit && (b.status === 'Failed' || b.status === 'Delayed') && <button className="btn btn-secondary btn-sm" onClick={() => toast(`${b.name} re-run queued`)}>Re-run</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="table-wrap">
            <p className="small muted" style={{ padding: '12px var(--s5) 0' }}>Interface health. Real-time feed detail is in <Link to="/tech/feeds">Real-Time Data Feeds</Link>; capability layers in <Link to="/tech/integrations">Integration Management</Link>.</p>
            <table className="table">
              <thead><tr><th>Integration</th><th className="num">Latency</th><th className="num">Pending messages</th><th>Health</th></tr></thead>
              <tbody>
                {SEED_INTEGRATIONS.map((i) => (
                  <tr key={i.name}>
                    <td className="primary-cell">{i.name}</td>
                    <td className="num">{i.latency}</td>
                    <td className="num">{i.pending}</td>
                    <td><StateChip tone={integrationTone(i.status)}>{i.status}</StateChip></td>
                  </tr>
                ))}
                {FEEDS.map((f) => (
                  <tr key={f.id}>
                    <td className="primary-cell">{f.name} <span className="xs subtle">(real-time feed)</span></td>
                    <td className="num">{f.lagMs} ms</td>
                    <td className="num">—</td>
                    <td><Status s={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'errors' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-3"><h3>Errors by service (24h)</h3><BarList items={ERROR_SUMMARY.map((e) => ({ label: `${e.service} · ${e.trend}`, value: e.errors, tone: e.trend === 'Rising' ? 'bad' : undefined }))} /></div>
            <div className="stack gap-3"><h3>Processing performance (p95)</h3>
              <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                <table className="table"><thead><tr><th>Operation</th><th className="num">p95</th><th className="num">Target</th><th>Status</th></tr></thead>
                  <tbody>{PERFORMANCE.map((p) => <tr key={p.name}><td>{p.name}</td><td className="num">{p.p95}</td><td className="num muted">{p.target}</td><td><Status s={p.status} /></td></tr>)}</tbody></table>
              </div>
            </div>
          </div>
        )}

        {tab === 'changes' && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Change / release</th><th>Risk</th><th className="hide-md">Window</th><th>Status</th><th className="num">Decision</th></tr></thead>
              <tbody>
                {store.state.changes.map((c) => (
                  <tr key={c.id}>
                    <td><div className="primary-cell">{c.title}</div><div className="id-cell">{c.id} · {c.kind}{c.affectsContractualValues ? ' · Affects contractual values — business validation required' : ''}</div></td>
                    <td><StateChip tone={c.risk === 'High' ? 'bad' : c.risk === 'Medium' ? 'warn' : 'neutral'}>{c.risk}</StateChip></td>
                    <td className="small hide-md">{c.window}</td>
                    <td className="small">{c.status}</td>
                    <td className="num">
                      {c.status === 'Awaiting approval' && canApprove ? (
                        <span className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => store.decideChange(c.id, false)}><X size={13} />Reject</button>
                          <button className="btn btn-primary btn-sm" onClick={() => store.decideChange(c.id, true)}><Check size={13} />Approve</button>
                        </span>
                      ) : <span className="xs subtle">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'security' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <KV items={SECURITY_INDICATORS.map((i) => [i.name, <span className="row" style={{ gap: 6 }}>{i.value}<Status s={i.status} /></span>] as [string, JSX.Element])} />
            <RestrictedSection cat="security" title="Security and technical logs" summary="Security indicators are shown above. Detailed security logs are restricted to security and support administrators.">
              <div className="table-wrap">
                <table className="table" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5 }}>
                  <thead><tr><th>Timestamp</th><th>Level</th><th>Service</th><th>Message</th></tr></thead>
                  <tbody>
                    {SEED_LOGS.map((l, i) => (
                      <tr key={i}>
                        <td className="nowrap muted">{dateTime(l.at)}</td>
                        <td><StateChip tone={l.level === 'ERROR' ? 'bad' : l.level === 'WARN' ? 'warn' : 'neutral'}>{l.level}</StateChip></td>
                        <td>{l.service}</td>
                        <td>{l.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </RestrictedSection>
            <RestrictedSection cat="security" title="Administrative monitoring controls" summary="Alert thresholds and monitoring controls are restricted.">
              <KV items={[['Latency alert threshold', '1,500 ms'], ['Bulk lookup rate limit', '200 lookups / 5 min / session'], ['Log retention', '400 days']]} />
            </RestrictedSection>
          </div>
        )}
      </section>
      {tab === 'incidents' && !canEdit && <Panel><p className="small muted">You have view access to system monitoring. Updating incidents requires Edit permission.</p></Panel>}
    </ModulePage>
  );
}
