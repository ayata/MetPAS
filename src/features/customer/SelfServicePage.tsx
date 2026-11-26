import { Link } from 'react-router-dom';
import { Bell, CreditCard, FileText, Home, MonitorSmartphone, Users } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { POLICYHOLDER_POLICIES, isAgent } from '../../store/access';
import { policyById } from '../../data/policies';
import { STATEMENTS } from '../../data/customer';
import { date, money } from '../../lib/format';
import { Empty, Notice, TaskStatus } from '../../components/ui';
import { ModulePage, Sensitive, SimTag } from '../../components/module';
import { useOpenTask } from '../work/TaskDetail';

/** Future-state policyholder portal. Policyholders see only their own permitted information. */
export function SelfServicePage() {
  const store = useStore();
  const openTask = useOpenTask();
  const external = !!store.scope;
  const preview = !external || isAgent(store.me);
  const policyIds = external && !isAgent(store.me) ? store.scope! : POLICYHOLDER_POLICIES;
  const policies = policyIds.map((id) => policyById(id)!);
  const holder = policies[0]?.owner;
  const requests = store.state.tasks.filter((t) => policyIds.includes(t.policyId) && (t.requestedBy || t.typeId === 'service-request'));
  const docs = STATEMENTS.filter((s) => policyIds.includes(s.policyId));
  const canRequest = store.can('self-service', 'create');
  const notifications = store.myNotifications.filter((n) => !n.groups || n.groups.includes('G6')).slice(0, 3);

  const request = (label: string) => {
    store.createTask({ typeId: 'service-request', policyId: policies[0].id, priority: 'Medium', description: `${label} submitted through the policyholder portal.`, assignToMe: false, title: label });
  };

  return (
    <ModulePage module="self-service" lead={preview ? 'Preview of the policyholder portal as a synthetic customer sees it. Each policyholder sees only their own information.' : 'Your policies, documents, payments and requests in one place.'}>
      {preview && <Notice>Portal preview for the synthetic policyholder <strong>{holder?.name}</strong>. <SimTag /></Notice>}
      <section className="portal">
        <div className="portal-head">
          <div className="row" style={{ gap: 10 }}><MonitorSmartphone size={18} /><span className="strong">My Policies</span></div>
          <span className="small muted">Signed in as {holder?.name} · identity verified</span>
        </div>
        <div className="portal-grid">
          {policies.map((p) => (
            <div key={p.id} className="portal-card">
              <div className="row between"><span className="strong">{p.plan}</span><span className="chip">{p.status}</span></div>
              <div className="xs subtle mono">{p.id}</div>
              <dl className="kv two" style={{ marginTop: 10 }}>
                <div><dt>{p.product === 'Fixed Annuity' ? 'Contract value' : 'Coverage'}</dt><dd>{money(p.faceAmount)}</dd></div>
                <div><dt>Cash value</dt><dd>{p.cashValue ? money(p.cashValue) : '—'}</dd></div>
                <div><dt>Next payment</dt><dd>{p.premium ? `${money(p.premium, true)} on ${date(p.nextDue)}` : 'Single premium'}</dd></div>
                <div><dt>Payment method</dt><dd className="row" style={{ gap: 6 }}><CreditCard size={13} />Bank draft <Sensitive cat="pii" kind="account" value="000123457710" /></dd></div>
              </dl>
              {!preview && <Link to={`/policies/${p.id}`} className="small strong">View policy details</Link>}
            </div>
          ))}
        </div>
      </section>

      <div className="cols-2" style={{ alignItems: 'start' }}>
        <section className="panel">
          <div className="panel-head"><h2>Digital service requests</h2></div>
          <div className="list">
            {[{ l: 'Update my address', i: <Home size={15} /> }, { l: 'Change my beneficiary', i: <Users size={15} /> }, { l: 'Request a statement copy', i: <FileText size={15} /> }].map((a) => (
              <button key={a.l} className="list-row quick-action" disabled={!canRequest || preview} onClick={() => request(a.l)} title={preview ? 'Available to the policyholder in the portal' : undefined}>
                <span className="qa-icon">{a.i}</span><span className="grow title">{a.l}</span>
              </button>
            ))}
          </div>
          <div className="panel-foot"><span className="xs subtle">Beneficiary changes require identity and authority verification before processing.</span></div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Request tracking</h2></div>
          {requests.length === 0 ? <Empty compact title="No requests yet" /> : (
            <div className="list">
              {requests.slice(0, 5).map((t) => (
                <button key={t.id} className="list-row" onClick={() => openTask(t.id)} disabled={preview && !store.can('work', 'view')}>
                  <span className="grow"><span className="title" style={{ display: 'block' }}>{t.title}</span><span className="meta">{t.id} · {date(t.createdAt)}</span></span>
                  <TaskStatus task={t} />
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Documents</h2></div>
          <div className="list">
            {(docs.length ? docs : [{ id: 'DOC-1', kind: 'Annual statement', period: '2025 annual' }]).slice(0, 4).map((d) => (
              <button key={d.id} className="list-row" onClick={() => store.toast(`Opened ${d.kind} (synthetic preview)`, 'info')}><FileText size={15} className="subtle" /><span className="grow small">{d.kind} · {d.period}</span></button>
            ))}
            {policies.map((p) => <button key={p.id} className="list-row" onClick={() => store.toast('Opened policy contract (synthetic preview)', 'info')}><FileText size={15} className="subtle" /><span className="grow small">Policy contract · {p.id}</span></button>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Notifications</h2></div>
          <div className="list">
            {(notifications.length ? notifications : [{ id: 'x', title: 'Your annual statement is ready', body: 'View it in Documents.' }]).map((n) => (
              <div key={n.id} className="list-row" style={{ alignItems: 'flex-start' }}><Bell size={15} className="subtle" style={{ marginTop: 2 }} /><span className="grow"><span className="title" style={{ display: 'block' }}>{n.title}</span><span className="meta">{n.body}</span></span></div>
            ))}
          </div>
        </section>
      </div>
    </ModulePage>
  );
}
