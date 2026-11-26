import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { relative } from '../../lib/format';
import { Empty, StateChip } from '../../components/ui';
import { SeverityTag, useMyExceptions } from '../dashboard/AlertsPanel';
import { MODULE_CATALOG, moduleById } from '../../config/modules';
import { Crumbs } from '../../components/module';

export function ExceptionsPage() {
  const store = useStore();
  const [params] = useSearchParams();
  const focus = params.get('focus');
  const [show, setShow] = useState<'open' | 'resolved'>('open');
  const [severity, setSeverity] = useState('');
  const [area, setArea] = useState('');
  const all = useMyExceptions();
  const rows = all.filter((e) => (show === 'open' ? !e.resolved : e.resolved) && (!severity || e.severity === severity) && (!area || e.module === area));
  const areas = MODULE_CATALOG.filter((m) => all.some((e) => e.module === m.id));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Crumbs items={['My Work', 'Exceptions']} />
          <h1>Alerts & Exceptions</h1>
          <p className="lead">Operational exceptions and alerts relevant to your group, most critical first.</p>
        </div>
      </div>
      <section className="panel">
        <div className="filters">
          <div className="seg" role="group" aria-label="Status">
            <button aria-pressed={show === 'open'} onClick={() => setShow('open')}>Open<span className="count">{all.filter((e) => !e.resolved).length}</span></button>
            <button aria-pressed={show === 'resolved'} onClick={() => setShow('resolved')}>Resolved<span className="count">{all.filter((e) => e.resolved).length}</span></button>
          </div>
          <select className="select" aria-label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">All severities</option>
            <option value="Critical">Critical</option><option value="Warning">High</option><option value="Info">Medium</option>
          </select>
          <select className="select" aria-label="Business area" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">All business areas</option>
            {areas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {rows.length === 0 ? (
          <Empty title={show === 'open' ? 'No open exceptions' : 'Nothing resolved yet'} icon={<CheckCircle2 size={18} />} text="Exceptions that match your filters will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Exception</th><th>Severity</th><th className="hide-md">Business area</th><th className="hide-md">Policy</th><th>Raised</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const canResolve = store.can('work', 'edit') && !e.resolved;
                  return (
                    <tr key={e.id} className={focus === e.id ? 'selected' : ''}>
                      <td>
                        <div className="row" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <div className="primary-cell">{e.title}</div>
                            <div className="small muted">{e.detail}</div>
                            <div className="id-cell">{e.id} · {e.source}</div>
                          </div>
                        </div>
                      </td>
                      <td><SeverityTag s={e.severity} /></td>
                      <td className="hide-md small">{moduleById(e.module).name}</td>
                      <td className="hide-md small mono">{e.policyId ? (store.can('policy-master', 'view') ? <Link to={`/policies/${e.policyId}`}>{e.policyId}</Link> : e.policyId) : '—'}</td>
                      <td className="small muted nowrap">{relative(e.createdAt)}</td>
                      <td className="num">
                        {e.resolved ? <StateChip tone="ok">Resolved</StateChip> : canResolve ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => store.resolveException(e.id)}>Mark resolved</button>
                        ) : <span className="xs subtle">View only</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
