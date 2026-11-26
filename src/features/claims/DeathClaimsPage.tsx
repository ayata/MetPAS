import { useMemo, useState } from 'react';
import { CheckCircle2, Gavel, PhoneCall, Send, ShieldCheck, ThumbsUp, Wallet, XCircle } from 'lucide-react';
import { useStore, type Rec } from '../../store/AppStore';
import { CLAIM_STAGES, DEATH_CLAIMS, claimStage, deathBenefit, type ClaimStatus, type DeathClaim } from '../../data/claims';
import { POLICIES, policyById } from '../../data/policies';
import { date, money } from '../../lib/format';
import { Drawer, Modal, Notice } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, Indicative, KV, ModulePage, PolicyLink, RestrictedSection, Sensitive, Stages, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'claims' | 'notifications' | 'disputes' | 'payments';

interface Notification extends Rec {
  id: string;
  policyId: string;
  deceased: string;
  reportedBy: string;
  received: string;
  channel: string;
}

const SEED_NOTIFS: Notification[] = [
  { id: 'DNT-9031', policyId: POLICIES[40].id, deceased: POLICIES[40].insured, reportedBy: 'Daughter', received: new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10), channel: 'Phone' },
  { id: 'DNT-9028', policyId: POLICIES[26].id, deceased: POLICIES[26].insured, reportedBy: 'Funeral home', received: new Date(Date.now() - 26 * 3600000).toISOString().slice(0, 10), channel: 'Fax' },
];

export function DeathClaimsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('claims');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const claims = useMemo(() => [...store.recordsOf<DeathClaim & Rec>('claims'), ...DEATH_CLAIMS].map((c) => ({ ...c, status: store.statusOf(c.id, c.status) as ClaimStatus })), [store]);
  const notifs = [...store.recordsOf<Notification>('death-notifications'), ...SEED_NOTIFS].filter((n) => store.statusOf(n.id, 'Open') === 'Open');
  const rows = claims.filter((c) => (!q || `${c.id} ${c.policyId} ${c.deceased}`.toLowerCase().includes(q.toLowerCase())) && (!status || c.status === status));
  const selected = claims.find((c) => c.id === sel);
  const open = claims.filter((c) => c.status !== 'Paid');

  return (
    <ModulePage
      module="death-claims"
      lead="Register death notifications, assess claims, verify beneficiaries and track benefit payments."
      actions={<GatedButton module="death-claims" level="create" className="btn btn-primary" onClick={() => setRegister(true)}><PhoneCall size={15} />Register death notification</GatedButton>}
      kpis={[
        { label: 'Open claims', value: open.length, onClick: () => { setTab('claims'); setStatus(''); } },
        { label: 'Outstanding requirements', value: open.reduce((a, c) => a + c.requirements.filter((r) => !r.received).length, 0), tone: 'warning', onClick: () => setStatus('Documents Pending') },
        { label: 'Disputed', value: claims.filter((c) => c.status === 'Disputed').length, tone: 'critical', onClick: () => setTab('disputes') },
        { label: 'Paid (30 days)', value: claims.filter((c) => c.status === 'Paid').length, tone: 'success', onClick: () => setTab('payments') },
      ]}
      notice={<AccessNote module="death-claims" />}
    >
      <TabPanel<Tab> label="Death claim sections" value={tab} onChange={setTab} tabs={[{ id: 'claims', label: 'Claims', count: open.length }, { id: 'notifications', label: 'New notifications', count: notifs.length }, { id: 'disputes', label: 'Disputes & legal' }, { id: 'payments', label: 'Payments' }]}>
        {tab === 'claims' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search claim, policy or deceased" count={`${rows.length} claims`}
              filters={[{ label: 'All statuses', value: status, onChange: setStatus, options: ['Notified', 'Registered', 'Documents Pending', 'Under Assessment', 'Disputed', 'Pending Approval', 'Approved', 'Paid'] }]} />
            <DataTable rows={rows} rowKey={(c) => c.id} onRow={(c) => setSel(c.id)} selected={sel} label="Death claims"
              cols={[
                { key: 'c', label: 'Claim', render: (c) => <><div className="primary-cell">{c.deceased}</div><div className="id-cell">{c.id} · notified {date(c.notified)}</div></> },
                { key: 'p', label: 'Policy', render: (c) => <PolicyLink id={c.policyId} /> },
                { key: 'b', label: 'Calculated benefit', className: 'num hide-md', render: (c) => money(deathBenefit(policyById(c.policyId)!, c.cause === 'Accident').total) },
                { key: 'r', label: 'Outstanding', className: 'hide-md', render: (c) => { const n = c.requirements.filter((r) => !r.received).length; return <span className={`small ${n ? 'strong' : 'muted'}`}>{n ? `${n} requirement${n > 1 ? 's' : ''}` : 'None'}</span>; } },
                { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
              ]} />
          </>
        )}
        {tab === 'notifications' && (
          <DataTable rows={notifs} rowKey={(n) => n.id} empty="No unregistered notifications" label="Death notifications"
            cols={[
              { key: 'd', label: 'Notification', render: (n) => <><div className="primary-cell">{n.deceased}</div><div className="id-cell">{n.id} · {n.channel} · reported by {n.reportedBy}</div></> },
              { key: 'p', label: 'Policy', render: (n) => <PolicyLink id={n.policyId} /> },
              { key: 'r', label: 'Received', render: (n) => <span className="small">{date(n.received)}</span> },
              { key: 'a', label: '', className: 'num', render: (n) => <GatedButton module="death-claims" level="create" onClick={() => {
                const id = store.nextId('CLM', 61000);
                store.addRecord('claims', { id, policyId: n.policyId, deceased: n.deceased, dateOfDeath: n.received, notified: n.received, notifiedBy: n.reportedBy, cause: 'Natural causes', status: 'Registered', requirements: [{ name: 'Claimant statement', received: false }, { name: 'Certified death certificate (proof of death)', received: false }, { name: 'Beneficiary identification', received: false }], disputed: false, payment: { method: '—', status: 'Not started' } },
                  { action: 'Initiated death claim', target: `${id} · ${n.deceased}`, link: '/claims/death', module: 'death-claims' }, `${id} initiated from ${n.id}`);
                store.setRecordStatus(n.id, 'Converted', { target: n.id, module: 'death-claims', message: 'Notification converted to a claim' });
              }}>Initiate claim</GatedButton> },
            ]} />
        )}
        {tab === 'disputes' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <p className="small muted">Disputed and legally complex claims: beneficiary disputes, disputed estates and claims with underage beneficiaries.</p>
            {claims.filter((c) => c.legal || c.status === 'Disputed' || policyById(c.policyId)?.beneficiaries.some((b) => b.minor)).map((c) => {
              const p = policyById(c.policyId)!;
              const minors = p.beneficiaries.filter((b) => b.minor);
              return (
                <div key={c.id} className="case-card">
                  <div className="row between wrap"><div><span className="strong">{c.deceased}</span> <span className="xs subtle mono">{c.id}</span></div><Status s={c.status} /></div>
                  <div className="row wrap small muted" style={{ gap: 12 }}>
                    {c.status === 'Disputed' && <span className="row" style={{ gap: 4 }}><Gavel size={13} />Beneficiary dispute</span>}
                    {minors.length > 0 && <span className="row" style={{ gap: 4 }}><ShieldCheck size={13} />{minors.length} underage beneficiar{minors.length > 1 ? 'ies' : 'y'}</span>}
                    {c.legal && c.status !== 'Disputed' && <span>Additional evidence required</span>}
                  </div>
                  {c.legal && <RestrictedSection cat="legal" title="Legal and dispute records" target={c.id} summary="A legal matter is open on this claim. Details are restricted to authorized claims and legal staff."><p className="small">{c.legal}</p></RestrictedSection>}
                  {minors.length > 0 && <RestrictedSection cat="minor" title="Minor beneficiary information" target={c.id} summary={`${minors.length} beneficiary(ies) under 18 — payment to a guardian or custodial account is required.`}><KV items={minors.map((m) => [m.name, `${m.relationship} · ${m.share}% · guardian: ${p.beneficiaries[0].name} · UTMA account ••••4471`] as [string, string])} /></RestrictedSection>}
                  <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => setSel(c.id)}>Open claim</button></div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'payments' && (
          <DataTable rows={claims.filter((c) => c.payment.status !== 'Not started' || c.status === 'Approved')} rowKey={(c) => c.id} onRow={(c) => setSel(c.id)} label="Claim payments"
            cols={[
              { key: 'c', label: 'Claim', render: (c) => <><div className="primary-cell">{c.deceased}</div><div className="id-cell">{c.id}</div></> },
              { key: 'a', label: 'Amount', className: 'num', render: (c) => money(deathBenefit(policyById(c.policyId)!, c.cause === 'Accident').total) },
              { key: 'm', label: 'Method', render: (c) => <span className="small">{c.payment.method}</span> },
              { key: 'd', label: 'Paid', className: 'hide-md', render: (c) => <span className="small">{c.payment.date ? date(c.payment.date) : '—'}</span> },
              { key: 's', label: 'Payment status', render: (c) => <Status s={c.status === 'Paid' ? 'Paid' : c.status === 'Approved' ? 'Released' : c.payment.status} /> },
            ]} />
        )}
      </TabPanel>

      {selected && <ClaimDrawer claim={selected} onClose={() => setSel(null)} />}
      {register && <RegisterModal onClose={() => setRegister(false)} />}
    </ModulePage>
  );
}

function ClaimDrawer({ claim, onClose }: { claim: DeathClaim; onClose: () => void }) {
  const store = useStore();
  const p = policyById(claim.policyId)!;
  const calc = deathBenefit(p, claim.cause === 'Accident');
  const [reqs, setReqs] = useState(claim.requirements);
  const outstanding = reqs.filter((r) => !r.received);
  const set = (s: ClaimStatus, message: string) => store.setRecordStatus(claim.id, s, { target: `Death claim ${claim.id}`, module: 'death-claims', link: '/claims/death', message });
  const canApprove = store.can('death-claims', 'approve');

  const next = (() => {
    switch (claim.status) {
      case 'Notified': case 'Registered': case 'Documents Pending':
        return <GatedButton module="death-claims" level="edit" className="btn btn-primary btn-sm" disabled={outstanding.length > 0} reason="All requirements must be received" onClick={() => set('Under Assessment', 'Documents validated — claim moved to assessment')}><CheckCircle2 size={14} />Validate documentation</GatedButton>;
      case 'Under Assessment':
        return <>
          <GatedButton module="death-claims" level="edit" className="btn btn-primary btn-sm" onClick={() => { store.createTask({ typeId: 'death-claim', policyId: claim.policyId, priority: 'Critical', description: `Approve death benefit ${money(calc.total)} for ${claim.id}`, assignToMe: true, submit: true }, { silent: true }); set('Pending Approval', 'Claim submitted for approval'); }}><Send size={14} />Submit for approval</GatedButton>
          <GatedButton module="death-claims" level="edit" className="btn btn-ghost btn-sm" onClick={() => set('Disputed', 'Claim routed to disputes')}><Gavel size={14} />Route as disputed</GatedButton>
        </>;
      case 'Disputed':
        return <GatedButton module="death-claims" level="edit" className="btn btn-secondary btn-sm" onClick={() => set('Under Assessment', 'Dispute resolved — returned to assessment')}>Dispute resolved</GatedButton>;
      case 'Pending Approval':
        return canApprove ? <button className="btn btn-primary btn-sm" onClick={() => set('Approved', 'Claim approved — payment released')}><ThumbsUp size={14} />Approve claim</button> : <span className="small muted">Awaiting approval by a claims approver.</span>;
      case 'Approved':
        return <GatedButton module="death-claims" level="edit" className="btn btn-primary btn-sm" onClick={() => set('Paid', 'Payment confirmed')}><Wallet size={14} />Confirm payment</GatedButton>;
      default: return null;
    }
  })();

  return (
    <Drawer label={`Claim ${claim.id}`} onClose={onClose}
      header={<div className="stack gap-1"><div className="xs subtle mono">{claim.id} · Death Claims</div><h2 style={{ fontSize: 18 }}>{claim.deceased}</h2></div>}
      footer={next ? <div className="row wrap">{next}</div> : undefined}>
      <Stages stages={CLAIM_STAGES} current={claimStage(claim.status)} failed={claim.status === 'Disputed'} />
      <KV two items={[['Policy', <PolicyLink id={claim.policyId} />], ['Claim status', <Status s={claim.status} />], ['Date of death', date(claim.dateOfDeath)], ['Notified', `${date(claim.notified)} · ${claim.notifiedBy}`], ['Cause', claim.cause], ['Product', p.product]]} />
      <section className="stack">
        <h3>Eligibility criteria</h3>
        <ul className="checklist">
          <li className="ok"><CheckCircle2 size={14} /><span className="grow">Policy in force at date of death</span></li>
          <li className={new Date().getFullYear() - Number(p.issueDate.slice(0, 4)) >= 2 ? 'ok' : 'warn'}>{new Date().getFullYear() - Number(p.issueDate.slice(0, 4)) >= 2 ? <CheckCircle2 size={14} /> : <XCircle size={14} />}<span className="grow">Outside contestability period (2 years)</span></li>
          <li className={claim.cause === 'Under investigation' ? 'warn' : 'ok'}>{claim.cause === 'Under investigation' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}<span className="grow">No applicable exclusion</span></li>
        </ul>
      </section>
      <section className="stack">
        <h3>Required documents</h3>
        <ul className="checklist">
          {reqs.map((r, i) => (
            <li key={r.name} className={r.received ? 'ok' : 'warn'}>
              {r.received ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              <span className="grow">{r.name}</span>
              {!r.received && store.can('death-claims', 'edit') ? <button className="btn btn-ghost btn-sm" onClick={() => { setReqs(reqs.map((x, k) => (k === i ? { ...x, received: true } : x))); store.toast(`${r.name} received (synthetic)`); }}>Mark received</button> : <span className="xs subtle">{r.received ? 'Received' : 'Outstanding'}</span>}
            </li>
          ))}
        </ul>
      </section>
      <section className="stack">
        <h3>Beneficiaries</h3>
        <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
          <table className="table">
            <thead><tr><th>Beneficiary</th><th>Verification</th><th className="num">Share</th></tr></thead>
            <tbody>
              {p.beneficiaries.filter((b) => b.type === 'Primary').map((b) => (
                <tr key={b.name}>
                  <td>{b.minor ? <><Sensitive cat="minor" kind="name" value={b.name} /> <span className="chip">Minor</span></> : <Sensitive cat="pii" kind="name" value={b.name} />}<div className="id-cell">{b.relationship}</div></td>
                  <td><Status s={claimStage(claim.status) >= 3 ? 'Verified' : 'Pending'} /></td>
                  <td className="num">{b.share}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="stack">
        <div className="row between"><h3>Calculated benefit</h3><Indicative /></div>
        <KV two items={[['Total benefit payable', <span className="strong">{money(calc.total)}</span>], ['Payment status', <Status s={claim.status === 'Paid' ? 'Paid' : claim.payment.status} />]]} />
        <RestrictedSection cat="formulas" title="Detailed benefit calculation" target={claim.id} summary="The total is an authorized calculation output. Component formulas are restricted.">
          <KV items={calc.rows.map(([k, v]) => [k, money(v)] as [string, string])} />
        </RestrictedSection>
      </section>
      {claim.legal && <RestrictedSection cat="legal" title="Legal and dispute records" target={claim.id} summary="A legal matter is open on this claim."><p className="small">{claim.legal}</p></RestrictedSection>}
    </Drawer>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [policyId, setPolicyId] = useState('');
  const [reportedBy, setReportedBy] = useState('Spouse');
  const [channel, setChannel] = useState('Phone');
  const [error, setError] = useState('');
  const eligible = POLICIES.filter((p) => ['In Force', 'Paid-Up', 'Grace Period'].includes(p.status));
  const submit = () => {
    if (!policyId) { setError('Select the policy of the deceased insured.'); return; }
    const p = policyById(policyId)!;
    const id = store.nextId('DNT', 9100);
    store.addRecord('death-notifications', { id, policyId, deceased: p.insured, reportedBy, channel, received: new Date().toISOString().slice(0, 10) },
      { action: 'Registered death notification', target: `${id} · ${p.insured}`, link: '/claims/death?tab=notifications', module: 'death-claims' }, `${id} registered — proof of death requested`);
    store.createTask({ typeId: 'death-notification', policyId, priority: 'High', description: `Death of ${p.insured} reported by ${reportedBy.toLowerCase()} via ${channel.toLowerCase()}. Request certified death certificate.`, assignToMe: true }, { silent: true });
    onClose();
  };
  return (
    <Modal title="Register death notification" desc="Record the notification and request proof of death. A claim is initiated from the notification." onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Register notification</button></>}>
      <div className="field">
        <label htmlFor="dn-policy">Policy of the deceased</label>
        <select id="dn-policy" className="select" value={policyId} onChange={(e) => { setPolicyId(e.target.value); setError(''); }} aria-invalid={!!error}>
          <option value="">Select a policy</option>
          {eligible.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.insured} ({p.product})</option>)}
        </select>
        {error && <span className="error">{error}</span>}
      </div>
      <div className="cols-2">
        <div className="field"><label htmlFor="dn-by">Reported by</label><select id="dn-by" className="select" value={reportedBy} onChange={(e) => setReportedBy(e.target.value)}>{['Spouse', 'Child', 'Executor', 'Funeral home', 'Agent'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label htmlFor="dn-ch">Channel</label><select id="dn-ch" className="select" value={channel} onChange={(e) => setChannel(e.target.value)}>{['Phone', 'Email', 'Letter', 'Portal'].map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <Notice>Sensitive family information shared during notification is recorded in the restricted legal and dispute category, not in general notes.</Notice>
    </Modal>
  );
}
