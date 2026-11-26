import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, FilePen, Send, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { POLICIES, policyById } from '../../data/policies';
import { CHANGE_TYPES, SEED_CHANGE_REQUESTS, changeImpact, changeTypeById, effectiveRiders, eligibilityChecks, isLiveRider, isRiderChange, riderHasAmount, type ChangeRequest, type ChangeStatus, type RiderChangeItem } from '../../data/policyChanges';
import { RIDER_CATALOG } from '../../data/product';
import { RiderChangeEditor, riderItemsValid, riderSummary } from './RiderChangeEditor';
import { date, money } from '../../lib/format';
import { Drawer, Modal, Notice } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, Indicative, KV, ModulePage, PolicyLink, RestrictedSection, Stages, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'requests' | 'types' | 'rules';
const STAGES = ['Requested', 'Eligibility', 'Documents', 'Approval', 'Completed'];
const stageOf = (s: ChangeStatus) => ({ 'Eligibility Review': 1, 'Awaiting Documents': 2, 'Pending Approval': 3, Approved: 4, Completed: 5, Rejected: 3 }[s]);

/** Approval task raised for a change request (linked by id, or by the request id in the task description). */
export const linkedTask = <T extends { id: string; description: string }>(r: Pick<ChangeRequest, 'id' | 'taskId'>, tasks: T[]) =>
  (r.taskId ? tasks.find((t) => t.id === r.taskId) : undefined) ?? tasks.find((t) => t.description.includes(`(${r.id})`));

export function useChangeRequests() {
  const store = useStore();
  return [...store.recordsOf<ChangeRequest & { id: string }>('changes'), ...SEED_CHANGE_REQUESTS].map((r) => {
    const own = store.statusOf(r.id, r.status) as ChangeStatus;
    const task = own === 'Completed' ? undefined : linkedTask(r, store.state.tasks);
    // The approval task is the source of truth once a request has been routed for approval.
    const status: ChangeStatus = !task ? own
      : task.status === 'Completed' ? 'Approved'
      : task.status === 'Rejected' ? 'Rejected'
      : task.status === 'Requires Approval' ? 'Pending Approval'
      : own;
    return { ...r, taskId: task?.id ?? r.taskId, status };
  });
}

export function PolicyChangesPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useTabParam<Tab>('requests');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const all = useChangeRequests();
  const rows = useMemo(() => all.filter((r) => {
    const t = q.toLowerCase();
    return (!t || `${r.id} ${r.policyId} ${changeTypeById(r.type)?.name}`.toLowerCase().includes(t)) && (!status || r.status === status) && (!type || r.type === type);
  }), [all, q, status, type]);
  const wizard = params.get('new') === '1';
  const closeWizard = () => { const p = new URLSearchParams(params); ['new', 'policy', 'type'].forEach((k) => p.delete(k)); setParams(p, { replace: true }); };
  const openWizard = () => { const p = new URLSearchParams(params); p.set('new', '1'); setParams(p, { replace: true }); };
  const selected = all.find((r) => r.id === sel);
  const open = all.filter((r) => !['Completed', 'Rejected'].includes(r.status));

  return (
    <ModulePage
      module="policy-changes"
      lead="Initiate and track changes to existing policies, review eligibility and see the indicative impact before submitting for approval."
      actions={<GatedButton module="policy-changes" level="create" className="btn btn-primary" onClick={openWizard}><FilePen size={15} />New policy change</GatedButton>}
      kpis={[
        { label: 'Open requests', value: open.length, sub: 'All change types', onClick: () => setStatus('') },
        { label: 'Pending approval', value: all.filter((r) => r.status === 'Pending Approval').length, tone: 'warning', onClick: () => setStatus('Pending Approval') },
        { label: 'Awaiting documents', value: all.filter((r) => r.status === 'Awaiting Documents').length, onClick: () => setStatus('Awaiting Documents') },
        { label: 'Completed', value: all.filter((r) => r.status === 'Completed' || r.status === 'Approved').length, sub: 'Last 30 days', tone: 'success', onClick: () => setStatus('Completed') },
      ]}
      notice={<AccessNote module="policy-changes" />}
    >
      <TabPanel<Tab> label="Policy change sections" value={tab} onChange={setTab} tabs={[{ id: 'requests', label: 'Change requests', count: open.length }, { id: 'types', label: 'Change types' }, { id: 'rules', label: 'Product rules' }]}>
        {tab === 'requests' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search request, policy or type" count={`${rows.length} requests`}
              filters={[
                { label: 'All statuses', value: status, onChange: setStatus, options: ['Eligibility Review', 'Awaiting Documents', 'Pending Approval', 'Approved', 'Completed', 'Rejected'] },
                { label: 'All change types', value: type, onChange: setType, options: CHANGE_TYPES.map((c) => ({ value: c.id, label: c.group ? `${c.group} — ${c.name}` : c.name })) },
              ]} />
            <DataTable rows={rows} rowKey={(r) => r.id} onRow={(r) => setSel(r.id)} selected={sel} label="Change requests"
              cols={[
                { key: 'id', label: 'Request', render: (r) => <><div className="primary-cell">{changeTypeById(r.type)?.name}</div><div className="id-cell">{r.id}{r.riders?.length ? ` · ${riderSummary(r.type, r.riders).replace(/^\w+: /, '')}` : ''}</div></> },
                { key: 'pol', label: 'Policy', render: (r) => <><PolicyLink id={r.policyId} /><div className="id-cell">{policyById(r.policyId)?.owner.name}</div></> },
                { key: 'by', label: 'Requested', className: 'hide-md', render: (r) => <span className="small">{date(r.requested)}<div className="id-cell">{r.requestedBy}</div></span> },
                { key: 'impact', label: 'Values affected', className: 'hide-md', render: (r) => <span className="small">{changeTypeById(r.type)?.affectsValues ? 'Yes' : 'No'}</span> },
                { key: 'st', label: 'Status', render: (r) => <Status s={r.status} /> },
              ]} />
          </>
        )}
        {tab === 'types' && (
          <DataTable rows={CHANGE_TYPES} rowKey={(c) => c.id} label="Change types"
            cols={[
              { key: 'n', label: 'Change type', render: (c) => <><div className="primary-cell">{c.group && <span className="chip blue" style={{ marginRight: 6, height: 20 }}>{c.group}</span>}{c.name}</div><div className="small muted">{c.description}</div></> },
              { key: 'e', label: 'Eligibility (summary)', className: 'hide-md', render: (c) => <span className="small">{c.eligibility}</span> },
              { key: 'd', label: 'Supporting documents', className: 'hide-md', render: (c) => <span className="small muted">{c.documents.join(', ')}</span> },
              { key: 'a', label: 'Approval', render: (c) => <span className="small">{c.requiresApproval ? 'Required' : 'Not required'}</span> },
            ]} />
        )}
        {tab === 'rules' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="formulas" title="Internal policy rules and calculation methodology" summary="Rule outcomes are shown on each request as eligibility checks. The rules, formulas and assumptions behind them are restricted.">
              <DataTable rows={RULES} rowKey={(r) => r[0]} cols={[{ key: 'r', label: 'Rule', render: (r) => <span className="strong">{r[0]}</span> }, { key: 'd', label: 'Definition (synthetic)', render: (r) => <span className="small mono">{r[1]}</span> }]} />
            </RestrictedSection>
            <RestrictedSection cat="formulas" title="Pricing and valuation assumptions" summary="Assumptions are maintained by Product & Actuarial.">
              <KV items={[['Credited rate assumption', '4.10% (synthetic)'], ['Lapse assumption', '6.5% yr 1–5, 4.0% thereafter'], ['Mortality basis', '2017 CSO, select & ultimate'], ['Expense load', '$85 per policy + 3.5% premium']]} />
            </RestrictedSection>
          </div>
        )}
      </TabPanel>

      {selected && <ChangeDrawer req={selected} onClose={() => setSel(null)} />}
      {wizard && <ChangeWizard onClose={closeWizard} initialPolicy={params.get('policy') ?? ''} initialType={params.get('type') ?? ''} />}
    </ModulePage>
  );
}

const RULES: [string, string][] = [
  ['Face decrease minimum', 'newFace >= max(planMinimum, 0.25 × originalFace)'],
  ['Contribution limit', 'ytdContributions + amount <= guidelinePremiumLimit(attainedAge)'],
  ['Increase underwriting trigger', 'increase > 0.10 × face OR attainedAge > 60 → full evidence'],
  ['Beneficiary share check', 'sum(primary.share) == 100 AND sum(contingent.share) ∈ {0, 100}'],
];

export function ImpactTable({ rows }: { rows: ReturnType<typeof changeImpact> }) {
  return (
    <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
      <table className="table compare">
        <thead><tr><th>Value</th><th className="num">Before</th><th aria-hidden /><th className="num">After</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className={r.changed ? 'changed' : ''}>
              <td>{r.label}</td>
              <td className="num muted">{r.before}</td>
              <td style={{ width: 24, textAlign: 'center' }}><ArrowRight size={13} className="subtle" /></td>
              <td className="num strong">{r.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeDrawer({ req, onClose }: { req: ChangeRequest; onClose: () => void }) {
  const store = useStore();
  const type = changeTypeById(req.type)!;
  const policy = policyById(req.policyId)!;
  const checks = eligibilityChecks(policy, type);
  const [docs, setDocs] = useState(req.documents);
  const canEdit = store.can('policy-changes', 'edit');
  const canApprove = store.can('policy-changes', 'approve');
  const done = ['Completed', 'Rejected', 'Approved'].includes(req.status);
  const set = (s: ChangeStatus, message: string) => store.setRecordStatus(req.id, s, { target: `${type.name} · ${req.id}`, module: 'policy-changes', link: '/policy-changes', message });
  const task = req.taskId ? store.state.tasks.find((t) => t.id === req.taskId) : undefined;
  /** Approve/reject the request and its approval task together, so the policy and work queue agree. */
  const decide = (approve: boolean) => {
    if (task?.status === 'Requires Approval') store.decideTask(task.id, approve, approve ? `Approved from change request ${req.id}` : `Rejected from change request ${req.id}`, { silent: true });
    set(approve ? 'Approved' : 'Rejected', approve ? 'Change approved — applied to the policy' : 'Change rejected');
  };

  const submit = () => {
    if (type.requiresApproval) {
      store.createTask({ typeId: type.taskType, policyId: req.policyId, priority: 'High', description: `${type.name} on ${req.policyId} (${req.id}): ${req.riders?.length ? riderSummary(req.type, req.riders) : String(req.value)}`, assignToMe: true, submit: true, title: type.name }, { silent: true });
      set('Pending Approval', `${req.id} submitted for approval`);
    } else set('Completed', `${req.id} completed`);
  };

  return (
    <Drawer label={`Change request ${req.id}`} onClose={onClose}
      header={<div className="stack gap-1"><div className="xs subtle mono">{req.id} · Policy Changes</div><h2 style={{ fontSize: 18 }}>{type.name}</h2></div>}
      footer={!done ? (
        <div className="row wrap">
          {req.status === 'Pending Approval' ? (
            canApprove ? <>
              <button className="btn btn-primary btn-sm" onClick={() => decide(true)}><ThumbsUp size={14} />Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => decide(false)}><ThumbsDown size={14} />Reject</button>
            </> : <span className="small muted">Awaiting approval by an authorized approver.</span>
          ) : (
            <GatedButton module="policy-changes" level="edit" className="btn btn-primary btn-sm" onClick={submit} disabled={docs.some((d) => !d.received) || checks.some((c) => !c.ok)} reason="All eligibility checks and documents must be complete">
              <Send size={14} />{type.requiresApproval ? 'Submit for approval' : 'Complete change'}
            </GatedButton>
          )}
        </div>
      ) : undefined}>
      <Stages stages={STAGES} current={stageOf(req.status)} failed={req.status === 'Rejected'} />
      <KV two items={[['Policy', <PolicyLink id={req.policyId} />], ['Owner', policy.owner.name], ['Status', <Status s={req.status} />], ['Requested', `${date(req.requested)} · ${req.requestedBy}`], ...(type.input ? [[type.input.label, typeof req.value === 'number' && type.input.kind === 'amount' ? money(req.value) : String(req.value) + (type.input.kind === 'percent' && typeof req.value === 'number' ? (type.id === 'unemployment' ? '' : '%') : '')] as [string, string]] : [])]} />
      {req.riders?.length ? <RiderLines type={req.type} items={req.riders} applied={req.status === 'Approved' || req.status === 'Completed'} /> : null}
      <section className="stack">
        <h3>Eligibility review</h3>
        <ul className="checklist">{checks.map((c) => <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}<span className="grow">{c.label}</span><span className="xs subtle">{c.note}</span></li>)}</ul>
      </section>
      <section className="stack">
        <h3>Supporting documents</h3>
        <ul className="checklist">
          {docs.map((d, i) => (
            <li key={d.name} className={d.received ? 'ok' : 'warn'}>
              {d.received ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span className="grow">{d.name}</span>
              {!d.received && canEdit && !done ? <button className="btn btn-ghost btn-sm" onClick={() => { setDocs(docs.map((x, k) => (k === i ? { ...x, received: true } : x))); store.toast(`${d.name} attached (synthetic)`); }}><Check size={13} />Attach</button> : <span className="xs subtle">{d.received ? 'Received' : 'Outstanding'}</span>}
            </li>
          ))}
        </ul>
      </section>
      {type.affectsValues && (
        <section className="stack">
          <div className="row between"><h3>Financial impact</h3><Indicative /></div>
          <ImpactTable rows={changeImpact(policy, type, req.value, req.riders)} />
          <RestrictedSection cat="formulas" title="Calculation detail" target={req.id} summary="Indicative values are calculation outputs. The methodology is restricted to Product & Actuarial.">
            <p className="small mono">premiumΔ = (newFace − face) / 1000 × COI(attainedAge, class) × modalFactor(mode)</p>
          </RestrictedSection>
        </section>
      )}
    </Drawer>
  );
}

function ChangeWizard({ onClose, initialPolicy, initialType }: { onClose: () => void; initialPolicy: string; initialType: string }) {
  const store = useStore();
  const [step, setStep] = useState(0);
  const [policyId, setPolicyId] = useState(initialPolicy);
  const [typeId, setTypeId] = useState(initialType);
  const type = changeTypeById(typeId);
  const policy = policyById(policyId);
  const [value, setValue] = useState<number | string>(type?.input?.default ?? '');
  const [docs, setDocs] = useState<string[]>([]);
  const [riders, setRiders] = useState<RiderChangeItem[]>([]);
  const allRequests = useChangeRequests();
  const policyRiders = policy ? effectiveRiders(policy.id, allRequests) : [];
  const riderMode = !!type && isRiderChange(type.id);
  const checks = policy && type ? eligibilityChecks(policy, type) : [];
  const eligible = checks.every((c) => c.ok);
  const steps = ['Policy & change', 'Eligibility', 'Documents', 'Review & submit'];

  const pickType = (id: string) => {
    setTypeId(id);
    const t = changeTypeById(id);
    const p = policyById(policyId);
    setValue(t?.id === 'coverage' && p ? Math.round(p.faceAmount * 0.75) : t?.input?.default ?? '');
    setDocs([]);
    setRiders([]);
  };
  const riderText = riderMode ? riderSummary(type!.id, riders) : '';

  const submit = () => {
    if (!type || !policy) return;
    const id = store.nextId('PCR', 72000);
    const needsApproval = type.requiresApproval;
    let taskId: string | undefined;
    if (needsApproval) taskId = store.createTask({ typeId: type.taskType, policyId, priority: 'High', description: `${type.name} on ${policyId} (${id}): ${riderMode ? riderText : String(value)}`, assignToMe: true, submit: true, title: type.name }, { silent: true });
    store.addRecord('changes', {
      id, policyId, type: type.id, requested: new Date().toISOString().slice(0, 10), requestedBy: store.me.name,
      status: needsApproval ? 'Pending Approval' : 'Completed', value: riderMode ? riderText : value, ...(riderMode ? { riders } : {}), documents: type.documents.map((d) => ({ name: d, received: docs.includes(d) })), taskId,
    }, { action: needsApproval ? 'Submitted policy change for approval' : 'Completed policy change', target: `${type.name} · ${id}`, link: '/policy-changes', module: 'policy-changes' },
    needsApproval ? `${id} submitted for approval${taskId ? ` · ${taskId}` : ''}` : `${id} completed`);
    onClose();
  };

  const canNext = step === 0 ? !!policy && !!type && (!riderMode || riderItemsValid(type!.id, riders)) : step === 1 ? eligible : step === 2 ? type!.documents.every((d) => docs.includes(d)) : true;

  return (
    <Modal wide title="New policy change" desc={steps.map((s, i) => `${i + 1}. ${s}`).join('   ')} onClose={onClose}
      footer={<>
        {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
        {step < 3 ? <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</button>
          : <button className="btn btn-primary" onClick={submit}><Send size={14} />{type?.requiresApproval ? 'Submit for approval' : 'Submit change'}</button>}
      </>}>
      <Stages stages={steps} current={step} />
      {step === 0 && (
        <>
          <div className="field">
            <label htmlFor="pc-policy">Policy</label>
            <select id="pc-policy" className="select" value={policyId} onChange={(e) => { setPolicyId(e.target.value); setRiders([]); }}>
              <option value="">Select a policy</option>
              {POLICIES.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.owner.name} ({p.product}, {p.status})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pc-type">Change type</label>
            <select id="pc-type" className="select" value={typeId} onChange={(e) => pickType(e.target.value)}>
              <option value="">Select a change type</option>
              {CHANGE_TYPES.filter((c) => !c.group).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <optgroup label="Rider">
                {CHANGE_TYPES.filter((c) => c.group === 'Rider').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            </select>
            {type && <span className="hint">{type.description}</span>}
          </div>
          {riderMode && policy && <RiderChangeEditor mode={type!.id as 'rider-add'} policy={policy} riders={policyRiders} items={riders} onChange={setRiders} />}
          {riderMode && !policy && <p className="small muted">Select a policy to see its riders.</p>}
          {type?.input && (
            <div className="field">
              <label htmlFor="pc-val">{type.input.label}</label>
              <input id="pc-val" className="input" value={value} onChange={(e) => setValue(type.input!.kind === 'text' ? e.target.value : Number(e.target.value.replace(/[^0-9.-]/g, '')) || 0)} />
            </div>
          )}
        </>
      )}
      {step === 1 && policy && type && (
        <>
          <ul className="checklist">{checks.map((c) => <li key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}<span className="grow">{c.label}</span><span className="xs subtle">{c.note}</span></li>)}</ul>
          {eligible ? <Notice>Eligible. {type.eligibility}</Notice> : <Notice tone="warning">This policy is not eligible for {type.name.toLowerCase()}. Review the failed check before continuing.</Notice>}
        </>
      )}
      {step === 2 && type && (
        <div className="stack gap-3">
          <p className="small muted">Attach the supporting documents required for this change (synthetic attachments).</p>
          {type.documents.map((d) => (
            <label key={d} className="check"><input type="checkbox" checked={docs.includes(d)} onChange={() => setDocs(docs.includes(d) ? docs.filter((x) => x !== d) : [...docs, d])} />{d}</label>
          ))}
        </div>
      )}
      {step === 3 && policy && type && (
        <div className="stack gap-4">
          <KV two items={[['Policy', policy.id], ['Owner', policy.owner.name], ['Change', type.name], ['Approval', type.requiresApproval ? 'Required — routed to approver' : 'Not required']]} />
          {riderMode && <RiderLines type={type.id} items={riders} />}
          {type.affectsValues ? (
            <section className="stack">
              <div className="row between"><h3>Before and after</h3><Indicative /></div>
              <ImpactTable rows={changeImpact(policy, type, value, riders, riderMode ? policyRiders.filter(isLiveRider) : undefined)} />
              <p className="xs subtle">Indicative synthetic values for demonstration. Final values are confirmed on processing.</p>
            </section>
          ) : <Notice>This change does not affect policy values or benefits.</Notice>}
        </div>
      )}
    </Modal>
  );
}

/** Rider lines of an add / delete / modify request. */
function RiderLines({ type, items, applied }: { type: string; items: RiderChangeItem[]; applied?: boolean }) {
  const mode = type === 'rider-add' ? 'add' : type === 'rider-delete' ? 'del' : 'mod';
  const verb = { add: applied ? 'Added' : 'To add', del: applied ? 'Deleted' : 'To delete', mod: applied ? 'Modified' : 'To modify' }[mode];
  return (
    <section className="stack">
      <h3>Riders {mode === 'add' ? 'to add' : mode === 'del' ? 'to delete' : 'to modify'}</h3>
      <ul className="rider-lines">
        {items.map((i) => {
          const d = RIDER_CATALOG.find((x) => x.id === i.catalogId);
          const amt = (n?: number) => (d && riderHasAmount(d) ? money(n ?? 0) : 'Included');
          return (
            <li key={`${i.catalogId}-${i.riderId ?? ''}`}>
              <span className={`rider-tag ${mode}`}>{verb}</span>
              <span className="grow strong">{d?.name ?? i.catalogId}</span>
              <span className="small">
                {mode === 'add' && amt(i.benefit)}
                {mode === 'del' && <s className="muted">{amt(i.benefit)}</s>}
                {mode === 'mod' && <>{amt(i.previousBenefit)} <ArrowRight size={12} className="subtle" /> <strong>{amt(i.benefit)}</strong></>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
