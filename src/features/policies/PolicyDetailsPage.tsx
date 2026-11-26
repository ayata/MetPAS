import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, ChevronRight, EyeOff, FilePen, FilePlus2, FileText, Lock, Minus, Pencil, Plus, Users } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { isExternal } from '../../store/access';
import { POLICIES, policyById, type Beneficiary, type Policy } from '../../data/policies';
import { userById } from '../../data/users';
import { taskModule } from '../../data/tasks';
import { date, dateTime, money } from '../../lib/format';
import { syntheticSsn } from '../../lib/mask';
import { Empty, Panel, Sla, StateChip, TaskStatus, Tabs, Notice } from '../../components/ui';
import { Indicative, RestrictedSection, Sensitive, Status } from '../../components/module';
import { useShell } from '../../layout/AppShell';
import { useOpenTask } from '../work/TaskDetail';
import { policyTone } from './PolicySearchPage';
import { changeTypeById, effectiveRiders, isLiveRider, isRiderChange, policyHistory, riderHasAmount, type EffectiveRider } from '../../data/policyChanges';
import { useChangeRequests } from '../policyAdmin/PolicyChangesPage';
import { riderSummary } from '../policyAdmin/RiderChangeEditor';

type Requests = ReturnType<typeof useChangeRequests>;
const isApplied = (r: Requests[number]) => r.status === 'Approved' || r.status === 'Completed';
/** Latest approved/completed value of a change type on this policy, if any. */
const appliedValue = (reqs: Requests, type: string) => reqs.filter((r) => r.type === type && isApplied(r)).sort((a, b) => a.requested.localeCompare(b.requested)).pop()?.value;
/**
 * Primary beneficiaries from a beneficiary change, e.g. "Jordan Ellison (Spouse) — 60%; Sam Ellison (Son) — 40%".
 * Entries without a share split whatever is left of 100%.
 */
function parseBeneficiaries(text: string): Beneficiary[] {
  const items = text.split(';').map((x) => x.trim()).filter(Boolean).map((part) => {
    const m = part.match(/^(.*?)\s*(?:\(([^)]*)\))?\s*(?:[—–-]\s*(\d+(?:\.\d+)?)\s*%)?\s*$/);
    const name = (m?.[1] || part).trim();
    return { name, relationship: m?.[2]?.trim() || '—', type: 'Primary' as const, share: m?.[3] ? Number(m[3]) : NaN };
  });
  const given = items.filter((b) => !Number.isNaN(b.share)).reduce((a, b) => a + b.share, 0);
  const open = items.filter((b) => Number.isNaN(b.share)).length;
  return items.map((b) => (Number.isNaN(b.share) ? { ...b, share: Math.max(0, Math.round(((100 - given) / open) * 100) / 100) } : b));
}
const changeText = (r: Requests[number]) => {
  const t = changeTypeById(r.type);
  if (isRiderChange(r.type) && r.riders?.length) return riderSummary(r.type, r.riders);
  if (!t?.input) return '';
  return typeof r.value === 'number' && t.input.kind === 'amount' ? money(r.value) : String(r.value) + (t.input.kind === 'percent' && typeof r.value === 'number' && t.id !== 'unemployment' ? '%' : '');
};

type Tab = 'overview' | 'holder' | 'coverage' | 'beneficiaries' | 'financial' | 'transactions' | 'history' | 'documents';

export function PolicyRecentRedirect() {
  const store = useStore();
  const id = store.state.recentPolicies.find((x) => !store.scope || store.scope.includes(x)) ?? (store.scope ? store.scope[0] : POLICIES[0].id);
  return <Navigate to={`/policies/${id}`} replace />;
}

export function PolicyDetailsPage() {
  const { id } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const { openNewRequest } = useShell();
  const openTask = useOpenTask();
  const [tab, setTab] = useState<Tab>('overview');
  const policy = policyById(id);
  const allChanges = useChangeRequests();
  const allowed = policy && store.can('policy-master', 'view') && (!store.scope || store.scope.includes(policy.id));

  useEffect(() => {
    if (allowed && policy) store.viewPolicy(policy.id);
    setTab('overview');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, allowed]);

  if (!policy || !allowed) {
    return (
      <div className="page">
        <Panel>
          <Empty icon={<Lock size={18} />} title={policy ? 'Not authorized' : 'Policy not found'} text={policy ? 'This policy is outside the information you are authorized to view.' : `No policy matches ${id}.`} action={<Link to="/policies" className="btn btn-secondary">Back to Policy Search</Link>} />
        </Panel>
      </div>
    );
  }

  const external = isExternal(store.session.groupId);
  const showFinancial = !external;
  const tasks = store.visibleTasks.filter((t) => t.policyId === policy.id);
  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const changes = allChanges.filter((r) => r.policyId === policy.id);
  const newFace = appliedValue(changes, 'coverage');
  const faceAmount = typeof newFace === 'number' && newFace > 0 ? newFace : policy.faceAmount;

  const actions = [
    !external && store.can('policy-changes', 'create') && { key: 'chg', label: 'Request policy change', icon: <FilePen size={15} />, go: () => navigate(`/policy-changes?new=1&policy=${policy.id}`) },
    !external && store.can('withdrawals', 'create') && policy.cashValue > 0 && { key: 'wd', label: 'Request withdrawal', icon: <ArrowRightLeft size={15} />, go: () => navigate(`/claims/withdrawals?tab=new&policy=${policy.id}`) },
    store.can('work', 'create') && { key: 'sr', label: external ? 'New service request' : 'New request', icon: <FilePlus2 size={15} />, go: () => openNewRequest({ policyId: policy.id, typeId: external ? 'service-request' : undefined }) },
  ].filter(Boolean) as { key: string; label: string; icon: JSX.Element; go: () => void }[];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'holder', label: 'Customer' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'beneficiaries', label: 'Beneficiaries' },
    ...(showFinancial ? [{ id: 'financial' as Tab, label: 'Values' }, { id: 'transactions' as Tab, label: 'Transactions' }] : []),
    { id: 'history', label: 'Policy History' },
    { id: 'documents', label: 'Documents', count: policy.documents.length },
  ];

  return (
    <div className="page">
      <section className="panel">
        <div className="policy-hero">
          <div className="stack gap-1">
            <nav className="crumbs" aria-label="Breadcrumb"><span>Policy Administration</span><ChevronRight size={12} /><Link to="/policies">Policy Master File</Link><ChevronRight size={12} /><span>{policy.id}</span></nav>
            <div className="row gap-3 wrap">
              <h1 className="mono">{policy.id}</h1>
              <StateChip tone={policyTone(policy.status)}>{policy.status}</StateChip>
            </div>
            <div className="muted" style={{ fontSize: 'var(--fs-md)' }}>{policy.owner.name} · {policy.product} · {policy.plan}</div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            {actions.map((a, i) => (
              <button key={a.key} className={`btn ${i === actions.length - 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={a.go}>{a.icon}{a.label}</button>
            ))}
          </div>
        </div>
        <dl className="hero-stats">
          <div><dt>{policy.product === 'Fixed Annuity' ? 'Contract value' : 'Face amount'}</dt><dd>{money(faceAmount)}</dd></div>
          <div><dt>Premium</dt><dd>{policy.premium ? `${money(policy.premium, true)}` : '—'} <span className="xs subtle" style={{ fontWeight: 500 }}>{policy.premium ? policy.mode : ''}</span></dd></div>
          <div><dt>Paid to</dt><dd>{date(policy.paidTo)}</dd></div>
          <div><dt>Open tasks</dt><dd>{openTasks.length}</dd></div>
        </dl>
        <div style={{ padding: '0 var(--s5)' }}>
          <Tabs tabs={tabs} value={tab} onChange={setTab} label="Policy sections" />
        </div>
        <div style={{ padding: 'var(--s5)' }} role="tabpanel">
          {tab === 'overview' && <Overview policy={policy} tasks={openTasks} changes={changes} onOpen={openTask} />}
          {tab === 'holder' && <Holder policy={policy} address={appliedValue(changes, 'address')} />}
          {tab === 'coverage' && <CoverageTab policy={policy} canEdit={actions.some((a) => a.key === 'chg')} onRider={(t) => navigate(`/policy-changes?new=1&policy=${policy.id}&type=${t}`)} />}
          {tab === 'beneficiaries' && <BeneficiariesTab policy={policy} changes={changes} canEdit={actions.some((a) => a.key === 'chg')} onChange={() => navigate(`/policy-changes?new=1&policy=${policy.id}&type=beneficiary`)} />}
          {tab === 'financial' && <Financial policy={policy} />}
          {tab === 'transactions' && <Transactions policy={policy} />}
          {tab === 'history' && <PolicyHistory policy={policy} changes={changes} />}
          {tab === 'documents' && <Documents policy={policy} />}
        </div>
      </section>
    </div>
  );
}

function Overview({ policy, tasks, changes, onOpen }: { policy: Policy; tasks: ReturnType<typeof useStore>['visibleTasks']; changes: Requests; onOpen: (id: string) => void }) {
  const navigate = useNavigate();
  return (
    <div className="cols-2">
      <div className="stack gap-4">
        <h3>Policy information</h3>
        <dl className="kv two">
          <div><dt>Insured</dt><dd>{policy.insured}</dd></div>
          <div><dt>Issue date</dt><dd>{date(policy.issueDate)}</dd></div>
          <div><dt>Product</dt><dd>{policy.product}</dd></div>
          <div><dt>Plan</dt><dd>{policy.plan}</dd></div>
          <div><dt>Issue state</dt><dd>{policy.state}</dd></div>
          <div><dt>Servicing agent</dt><dd>{policy.agent}</dd></div>
          <div><dt>Next premium due</dt><dd>{policy.premium ? date(policy.nextDue) : '—'}</dd></div>
          <div><dt>Billing mode</dt><dd>{policy.premium ? policy.mode : 'Single premium'}</dd></div>
        </dl>
        {policy.status === 'Grace Period' && <Notice tone="warning">Policy is in its grace period. A grace period notice is required before lapse.</Notice>}
      </div>
      <div className="stack gap-3">
        <h3>Open work on this policy</h3>
        {tasks.length === 0 ? (
          <Empty compact title="No open tasks" />
        ) : (
          <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
            {tasks.map((t) => (
              <button key={t.id} className="list-row" onClick={() => onOpen(t.id)}>
                <span className="grow" style={{ minWidth: 0 }}>
                  <span className="title ellipsis" style={{ display: 'block' }}>{t.title}</span>
                  <span className="meta">{taskModule(t).name} · <Sla task={t} /></span>
                </span>
                <TaskStatus task={t} />
              </button>
            ))}
          </div>
        )}
        {changes.length > 0 && (
          <>
            <h3 style={{ marginTop: 'var(--s3)' }}>Policy change requests</h3>
            <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              {changes.slice().sort((a, b) => b.requested.localeCompare(a.requested)).map((r) => (
                <button key={r.id} className="list-row" onClick={() => navigate('/policy-changes')}>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="title ellipsis" style={{ display: 'block' }}>{changeTypeById(r.type)?.name}{changeText(r) ? ` — ${changeText(r)}` : ''}</span>
                    <span className="meta">{r.id} · {date(r.requested)}{isApplied(r) ? ' · applied to policy' : ''}</span>
                  </span>
                  <Status s={r.status} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const Never = () => <span className="restricted-inline" title="Never displayed to any user"><EyeOff size={12} />Never displayed</span>;

function Holder({ policy, address }: { policy: Policy; address?: string | number }) {
  const o = policy.owner;
  return (
    <div className="stack gap-4">
      <h3>Authorized customer information</h3>
      <dl className="kv">
        <div><dt>Owner</dt><dd>{o.name}</dd></div>
        <div><dt>Customer ID</dt><dd className="mono">{o.id}</dd></div>
        <div><dt>Segment</dt><dd>{o.segment}</dd></div>
        <div><dt>Customer since</dt><dd>{o.since}</dd></div>
        <div><dt>Date of birth</dt><dd><Sensitive cat="pii" kind="dob" value={o.dob} full={date(o.dob)} /></dd></div>
        <div><dt>Tax ID</dt><dd className="mono"><Sensitive cat="pii" kind="ssn" value={syntheticSsn(o.ssnLast4)} /></dd></div>
        <div><dt>Email</dt><dd><Sensitive cat="pii" kind="email" value={o.email} /></dd></div>
        <div><dt>Phone</dt><dd><Sensitive cat="pii" kind="phone" value={o.phone} /></dd></div>
        <div style={{ gridColumn: 'span 2' }}><dt>Mailing address</dt><dd><Sensitive cat="pii" kind="address" value={address ? String(address) : o.address} /></dd></div>
      </dl>
      <div className="divider" />
      <h3>Credentials and card security</h3>
      <dl className="kv">
        <div><dt>Portal password</dt><dd><Never /></dd></div>
        <div><dt>Authentication secrets</dt><dd><Never /></dd></div>
        <div><dt>Card security code</dt><dd><Never /></dd></div>
      </dl>
      <div className="row xs subtle"><Lock size={12} />Sensitive values are masked or restricted according to your profile and user group. Credentials and card security codes are never stored or shown.</div>
    </div>
  );
}

function CoverageTab({ policy, canEdit, onRider }: { policy: Policy; canEdit: boolean; onRider: (type: 'rider-add' | 'rider-delete' | 'rider-modify') => void }) {
  const requests = useChangeRequests();
  const riders = effectiveRiders(policy.id, requests);
  const live = riders.filter(isLiveRider);
  const riderStatus = (r: EffectiveRider) => {
    if (r.pending?.kind === 'add') return <StateChip tone="warn">Addition pending</StateChip>;
    if (r.pending?.kind === 'delete') return <StateChip tone="warn">Removal pending</StateChip>;
    if (r.pending?.kind === 'modify') return <StateChip tone="warn">Change pending</StateChip>;
    if (r.status === 'Terminated') return <StateChip tone="neutral">Removed</StateChip>;
    return <StateChip tone={r.status === 'Pending' ? 'info' : r.status === 'Expiring' ? 'warn' : 'ok'}>{r.status}</StateChip>;
  };
  return (
    <div className="stack gap-3">
      <div className="row between wrap">
        <span className="small muted">{live.length} rider{live.length === 1 ? '' : 's'} on this policy</span>
        {canEdit && (
          <div className="row wrap" style={{ gap: 6 }}>
            <span className="small subtle">Rider:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => onRider('rider-add')}><Plus size={14} />Add</button>
            <button className="btn btn-secondary btn-sm" disabled={!live.length} onClick={() => onRider('rider-delete')}><Minus size={14} />Delete</button>
            <button className="btn btn-secondary btn-sm" disabled={!live.length} onClick={() => onRider('rider-modify')}><Pencil size={13} />Modify</button>
          </div>
        )}
      </div>
      <div className="table-wrap" style={{ margin: '0 calc(-1 * var(--s5))' }}>
        <table className="table">
          <thead><tr><th>Coverage</th><th>Type</th><th className="num">Benefit amount</th><th className="num">Annual premium</th><th>Status</th></tr></thead>
          <tbody>
            {policy.coverages.filter((c) => c.kind === 'Base').map((c) => (
              <tr key={c.name}>
                <td className="primary-cell">{c.name}</td>
                <td className="small">Base</td>
                <td className="num">{c.amount ? money(c.amount) : 'Included'}</td>
                <td className="num muted">—</td>
                <td><StateChip tone={c.status === 'Active' ? 'ok' : c.status === 'Pending' ? 'info' : 'neutral'}>{c.status}</StateChip></td>
              </tr>
            ))}
            {riders.map((r) => {
              const removed = r.status === 'Terminated';
              const amt = (n: number) => (riderHasAmount(r.rider) ? money(n) : 'Included');
              return (
                <tr key={r.id} className={removed ? 'row-removed' : r.pending ? 'row-pending' : ''}>
                  <td>
                    <div className="primary-cell">{removed ? <s>{r.rider.name}</s> : <Link to={`/riders?policy=${policy.id}`}>{r.rider.name}</Link>}</div>
                    <div className="id-cell">
                      {r.pending ? <>Request <Link to="/policy-changes">{r.pending.requestId}</Link> in progress</>
                        : r.changedBy ? <>{removed ? `Removed ${date(r.expires)}` : r.id.startsWith(`RDR-${r.changedBy.slice(4)}-`) ? `Added ${date(r.issued)}` : 'Updated'} via {r.changedBy}</>
                        : r.id}
                    </div>
                  </td>
                  <td className="small">Rider</td>
                  <td className="num">
                    {r.pending?.kind === 'modify' && r.pending.benefit !== undefined
                      ? <>{amt(r.benefit)} <span className="subtle">→</span> <strong>{amt(r.pending.benefit)}</strong></>
                      : amt(r.benefit)}
                  </td>
                  <td className="num">{removed ? '—' : money(r.annualPremium)}</td>
                  <td>{riderStatus(r)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BeneficiariesTab({ policy, changes, canEdit, onChange }: { policy: Policy; changes: Requests; canEdit: boolean; onChange: () => void }) {
  const latest = changes.filter((r) => r.type === 'beneficiary' && isApplied(r) && String(r.value).trim()).sort((a, b) => a.requested.localeCompare(b.requested)).pop();
  const pending = changes.find((r) => r.type === 'beneficiary' && r.status === 'Pending Approval');
  const newPrimary = latest ? parseBeneficiaries(String(latest.value)) : [];
  // An approved change replaces the primary designation; contingent beneficiaries stay as they were.
  const list: (Beneficiary & { via?: string })[] = newPrimary.length
    ? [...newPrimary.map((b) => ({ ...b, via: latest!.id })), ...policy.beneficiaries.filter((b) => b.type === 'Contingent')]
    : policy.beneficiaries;
  const primaryTotal = list.filter((b) => b.type === 'Primary').reduce((a, b) => a + b.share, 0);
  return (
    <div className="stack gap-4">
      <div className="row between wrap">
        <span className="small muted">Primary allocation totals {primaryTotal}%{primaryTotal === 100 ? ' — valid' : ' — requires correction'}</span>
        {canEdit && <button className="btn btn-secondary btn-sm" onClick={onChange}><Users size={14} />Request beneficiary change</button>}
      </div>
      {pending && <Notice>Beneficiary change {pending.id} is awaiting approval — the designation below updates once it is approved.</Notice>}
      <div className="table-wrap" style={{ margin: '0 calc(-1 * var(--s5))' }}>
        <table className="table">
          <thead><tr><th>Beneficiary</th><th>Relationship</th><th>Designation</th><th className="num">Share</th></tr></thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.name + b.type}>
                <td>
                  <div className="primary-cell">{b.minor ? <><Sensitive cat="minor" kind="name" value={b.name} /> <span className="chip">Minor</span></> : <Sensitive cat="pii" kind="name" value={b.name} />}</div>
                  {b.via && <div className="id-cell">Updated via {b.via}</div>}
                </td>
                <td className="small">{b.relationship}</td>
                <td><span className="chip">{b.type}</span></td>
                <td className="num">{b.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Financial({ policy }: { policy: Policy }) {
  const net = Math.max(0, policy.cashValue - policy.loanBalance);
  return (
    <div className="stack gap-4">
      <div className="row between"><h3>Policy values</h3><Indicative /></div>
      <dl className="kv">
        <div><dt>Cash value</dt><dd>{money(policy.cashValue)}</dd></div>
        <div><dt>Outstanding loan</dt><dd>{money(policy.loanBalance)}</dd></div>
        <div><dt>Net surrender value</dt><dd>{money(Math.round(net * 0.97))}</dd></div>
        <div><dt>Available loan value</dt><dd>{money(Math.round(net * 0.9))}</dd></div>
        <div><dt>Modal premium</dt><dd>{policy.premium ? money(policy.premium, true) : '—'}</dd></div>
        <div><dt>Annualized premium</dt><dd>{policy.premium ? money(policy.premium * (policy.mode === 'Monthly' ? 12 : policy.mode === 'Quarterly' ? 4 : 1), true) : '—'}</dd></div>
        <div><dt>Paid-to date</dt><dd>{date(policy.paidTo)}</dd></div>
        <div><dt>Cost basis (tax)</dt><dd>{money(Math.round(policy.cashValue * 0.62))}</dd></div>
      </dl>
      <RestrictedSection cat="formulas" title="Internal value calculations" target={policy.id} summary="Values above are calculation outputs. Methodology, factors and rate tables are restricted.">
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Component</th><th>Basis (synthetic)</th><th className="num">Amount</th></tr></thead>
            <tbody>
              <tr><td>Surrender charge</td><td className="small muted">3.0% of cash value, policy year {new Date().getFullYear() - Number(policy.issueDate.slice(0, 4))}</td><td className="num">{money(Math.round(net * 0.03))}</td></tr>
              <tr><td>Loan value factor</td><td className="small muted">90% of net cash value less 1 year interest at 6.0%</td><td className="num">{money(Math.round(net * 0.9))}</td></tr>
              <tr><td>Cost of insurance (monthly)</td><td className="small muted">COI table v2026, attained age band, preferred class</td><td className="num">{money(Math.round(policy.faceAmount * 0.00011), true)}</td></tr>
            </tbody>
          </table>
        </div>
      </RestrictedSection>
    </div>
  );
}

function Transactions({ policy }: { policy: Policy }) {
  return (
    <div className="table-wrap" style={{ margin: '0 calc(-1 * var(--s5))' }}>
      <table className="table">
        <thead><tr><th>Date</th><th>Transaction</th><th className="hide-md">Reference</th><th className="num">Amount</th><th>Status</th></tr></thead>
        <tbody>
          {policy.transactions.map((t) => (
            <tr key={t.id}>
              <td className="small nowrap">{date(t.date)}</td>
              <td className="primary-cell">{t.type}</td>
              <td className="hide-md id-cell">{t.id}</td>
              <td className="num">{money(t.amount, true)}</td>
              <td><StateChip tone={t.status === 'Posted' ? 'ok' : t.status === 'Pending' ? 'info' : 'neutral'}>{t.status}</StateChip></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Documents({ policy }: { policy: Policy }) {
  const { toast } = useStore();
  return (
    <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
      {policy.documents.map((d) => (
        <button key={d.name} className="list-row" onClick={() => toast(`Opened ${d.name} (synthetic preview)`, 'info')}>
          <FileText size={16} className="subtle" />
          <span className="grow"><span className="title" style={{ display: 'block' }}>{d.name}</span><span className="meta">{d.type} · {d.size}</span></span>
          <span className="small muted">{date(d.date)}</span>
        </button>
      ))}
    </div>
  );
}

function PolicyHistory({ policy, changes }: { policy: Policy; changes: Requests }) {
  const store = useStore();
  const taskEvents = store.visibleTasks
    .filter((t) => t.policyId === policy.id)
    .flatMap((t) => t.history.map((h) => ({ at: h.at, text: `${h.text} — ${t.title}`, meta: `${h.actorId === 'system' ? 'System' : userById(h.actorId)?.name} · ${t.id}` })));
  const changeEvents = changes.filter(isApplied).map((r) => ({ at: r.requested, text: `${changeTypeById(r.type)?.name} applied${changeText(r) ? ` — ${changeText(r)}` : ''}`, meta: `Policy change · ${r.id}` }));
  const events = [...taskEvents, ...changeEvents, ...policyHistory(policy).map((e) => ({ at: e.date, text: e.text, meta: e.meta }))].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="timeline">
      {events.map((e, i) => (
        <div key={i} className="tl-item">
          <span className="tl-dot" />
          <div>
            <div className="tl-text">{e.text}</div>
            <div className="tl-meta">{e.meta} · {e.at.length > 10 ? dateTime(e.at) : date(e.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
