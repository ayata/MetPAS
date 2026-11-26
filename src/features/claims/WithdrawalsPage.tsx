import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, ThumbsDown, ThumbsUp, Wallet } from 'lucide-react';
import { useStore, type Rec } from '../../store/AppStore';
import { SEED_WITHDRAWALS, withdrawalQuote, type Withdrawal, type WithdrawalStatus, type WithdrawalType } from '../../data/claims';
import { POLICIES, policyById } from '../../data/policies';
import { date, money } from '../../lib/format';
import { Drawer, Notice } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, Indicative, KV, ModulePage, PolicyLink, RestrictedSection, Stages, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'requests' | 'new' | 'payments';
const STAGES = ['Requested', 'Approval', 'Payment processing', 'Paid'];
const stage = (s: WithdrawalStatus) => ({ Draft: 0, 'Pending Approval': 1, Approved: 2, 'Payment Processing': 2, Paid: 4, Rejected: 1 }[s]);

export function WithdrawalsPage() {
  const store = useStore();
  const [params] = useSearchParams();
  const [tab, setTab] = useTabParam<Tab>(params.get('policy') ? 'new' : 'requests');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const all = useMemo(() => [...store.recordsOf<Withdrawal & Rec>('withdrawals'), ...SEED_WITHDRAWALS].map((w) => ({ ...w, status: store.statusOf(w.id, w.status) as WithdrawalStatus })), [store]);
  const rows = all.filter((w) => (!q || `${w.id} ${w.policyId}`.toLowerCase().includes(q.toLowerCase())) && (!status || w.status === status));
  const selected = all.find((w) => w.id === sel);

  return (
    <ModulePage
      module="withdrawals"
      lead="Full, partial and percentage-based withdrawals with indicative amounts, charges and remaining policy value."
      actions={<GatedButton module="withdrawals" level="create" className="btn btn-primary" onClick={() => setTab('new')}><Wallet size={15} />New withdrawal</GatedButton>}
      kpis={[
        { label: 'Pending approval', value: all.filter((w) => w.status === 'Pending Approval').length, tone: 'warning', onClick: () => { setTab('requests'); setStatus('Pending Approval'); } },
        { label: 'Payment processing', value: all.filter((w) => w.status === 'Payment Processing' || w.status === 'Approved').length, onClick: () => setTab('payments') },
        { label: 'Paid (30 days)', value: money(all.filter((w) => w.status === 'Paid').reduce((a, w) => a + w.amount, 0)), tone: 'success', onClick: () => { setTab('requests'); setStatus('Paid'); } },
        { label: 'Requests', value: all.length, sub: 'Last 30 days', onClick: () => { setTab('requests'); setStatus(''); } },
      ]}
      notice={<AccessNote module="withdrawals" />}
    >
      <TabPanel<Tab> label="Withdrawal sections" value={tab} onChange={setTab} tabs={[{ id: 'requests', label: 'Requests' }, { id: 'new', label: 'New withdrawal' }, { id: 'payments', label: 'Payment tracking' }]}>
        {tab === 'requests' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search request or policy" count={`${rows.length} requests`} filters={[{ label: 'All statuses', value: status, onChange: setStatus, options: ['Pending Approval', 'Approved', 'Payment Processing', 'Paid', 'Rejected'] }]} />
            <DataTable rows={rows} rowKey={(w) => w.id} onRow={(w) => setSel(w.id)} selected={sel} label="Withdrawal requests"
              cols={[
                { key: 'i', label: 'Request', render: (w) => <><div className="primary-cell">{w.type} withdrawal{w.percent ? ` · ${w.percent}%` : ''}</div><div className="id-cell">{w.id} · {date(w.requested)}</div></> },
                { key: 'p', label: 'Policy', render: (w) => <><PolicyLink id={w.policyId} /><div className="id-cell">{policyById(w.policyId)?.owner.name}</div></> },
                { key: 'a', label: 'Gross amount', className: 'num', render: (w) => money(w.amount) },
                { key: 'm', label: 'Method', className: 'hide-md', render: (w) => <span className="small">{w.method}</span> },
                { key: 's', label: 'Status', render: (w) => <Status s={w.status} /> },
              ]} />
          </>
        )}
        {tab === 'new' && <NewWithdrawal initialPolicy={params.get('policy') ?? ''} onDone={() => setTab('requests')} />}
        {tab === 'payments' && (
          <DataTable rows={all.filter((w) => ['Approved', 'Payment Processing', 'Paid'].includes(w.status))} rowKey={(w) => w.id} onRow={(w) => setSel(w.id)} label="Withdrawal payments"
            cols={[
              { key: 'i', label: 'Request', render: (w) => <><div className="primary-cell">{w.id}</div><div className="id-cell">{w.policyId}</div></> },
              { key: 'n', label: 'Net payment', className: 'num', render: (w) => money(withdrawalQuote(policyById(w.policyId)!, w.type, w.percent ?? w.amount).net) },
              { key: 'm', label: 'Method', render: (w) => <span className="small">{w.method}</span> },
              { key: 's', label: 'Payment status', render: (w) => <Status s={w.status === 'Approved' ? 'Scheduled' : w.status} /> },
            ]} />
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Withdrawal ${selected.id}`} onClose={() => setSel(null)}
          header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Redemptions & Withdrawals</div><h2 style={{ fontSize: 18 }}>{selected.type} withdrawal</h2></div>}
          footer={
            selected.status === 'Pending Approval' ? (store.can('withdrawals', 'approve') ? <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => store.setRecordStatus(selected.id, 'Payment Processing', { target: `Withdrawal ${selected.id}`, module: 'withdrawals', message: 'Withdrawal approved — payment processing' })}><ThumbsUp size={14} />Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => store.setRecordStatus(selected.id, 'Rejected', { target: `Withdrawal ${selected.id}`, module: 'withdrawals', message: 'Withdrawal rejected', tone: 'warning' })}><ThumbsDown size={14} />Reject</button>
            </div> : <span className="small muted">Awaiting approval by an authorized approver.</span>)
              : selected.status === 'Payment Processing' || selected.status === 'Approved' ? <GatedButton module="withdrawals" level="edit" className="btn btn-primary btn-sm" onClick={() => store.setRecordStatus(selected.id, 'Paid', { target: `Withdrawal ${selected.id}`, module: 'withdrawals', message: 'Payment confirmed' })}>Confirm payment</GatedButton> : undefined
          }>
          <Stages stages={STAGES} current={stage(selected.status)} failed={selected.status === 'Rejected'} />
          <QuoteView policyId={selected.policyId} type={selected.type} input={selected.percent ?? selected.amount} />
          <KV two items={[['Status', <Status s={selected.status} />], ['Payment method', selected.method], ['Requested', date(selected.requested)], ['Policy', <PolicyLink id={selected.policyId} />]]} />
        </Drawer>
      )}
    </ModulePage>
  );
}

function QuoteView({ policyId, type, input }: { policyId: string; type: WithdrawalType; input: number }) {
  const p = policyById(policyId)!;
  const qt = withdrawalQuote(p, type, input);
  return (
    <section className="stack">
      <div className="row between"><h3>Indicative amounts</h3><Indicative /></div>
      <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
        <table className="table">
          <tbody>
            <tr><td>Available withdrawal value</td><td className="num">{money(qt.available)}</td></tr>
            <tr><td className="strong">Gross withdrawal</td><td className="num strong">{money(qt.gross)}</td></tr>
            <tr><td>Applicable penalty (surrender charge)</td><td className="num">−{money(qt.penalty)}</td></tr>
            <tr><td>Processing charge</td><td className="num">−{money(qt.fee)}</td></tr>
            <tr><td>Federal tax withholding (10%)</td><td className="num">−{money(qt.tax)}</td></tr>
            <tr className="changed"><td className="strong">Net payment</td><td className="num strong">{money(qt.net)}</td></tr>
            <tr><td>Remaining policy value</td><td className="num">{money(qt.remaining)}</td></tr>
            <tr><td>Death benefit after withdrawal</td><td className="num">{qt.faceAfter ? money(qt.faceAfter) : 'Policy terminates'}</td></tr>
          </tbody>
        </table>
      </div>
      <RestrictedSection cat="formulas" title="Charge and tax calculation methodology" target={policyId} summary="Penalties and withholding are calculation outputs; the methodology is restricted.">
        <p className="small mono">charge = max(0, gross − 10% free amount) × max(0, 7% − 0.7% × policyYear) · withholding = 10% × max(0, gross − costBasis)</p>
      </RestrictedSection>
    </section>
  );
}

function NewWithdrawal({ initialPolicy, onDone }: { initialPolicy: string; onDone: () => void }) {
  const store = useStore();
  const [policyId, setPolicyId] = useState(initialPolicy);
  const [type, setType] = useState<WithdrawalType>('Partial');
  const [amount, setAmount] = useState(5000);
  const [pct, setPct] = useState(20);
  const [method, setMethod] = useState<'ACH' | 'Check' | 'Wire'>('ACH');
  const candidates = POLICIES.filter((p) => p.cashValue > 0 && (!store.scope || store.scope.includes(p.id)));
  const p = policyById(policyId);
  const qt = p ? withdrawalQuote(p, type, type === 'Percentage' ? pct : amount) : null;
  const canCreate = store.can('withdrawals', 'create');

  const submit = () => {
    if (!p || !qt) return;
    const id = store.nextId('WDR', 39000);
    store.createTask({ typeId: type === 'Full' ? 'surrender' : 'redemption', policyId: p.id, priority: type === 'Full' ? 'High' : 'Medium', description: `${type} withdrawal of ${money(qt.gross)} (net ${money(qt.net)}) by ${method}.`, assignToMe: true, submit: true, title: type === 'Full' ? 'Full Surrender Payout' : `Redemption Request — ${type}` }, { silent: true });
    store.addRecord('withdrawals', { id, policyId: p.id, type, amount: qt.gross, percent: type === 'Percentage' ? pct : undefined, requested: new Date().toISOString().slice(0, 10), status: 'Pending Approval', method },
      { action: 'Submitted withdrawal for approval', target: `${id} · ${money(qt.gross)}`, link: '/claims/withdrawals', module: 'withdrawals' }, `${id} submitted for approval`);
    onDone();
  };

  return (
    <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
      <div className="stack gap-4">
        <div className="field">
          <label htmlFor="wd-policy">Policy</label>
          <select id="wd-policy" className="select" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
            <option value="">Select a policy with cash value</option>
            {candidates.map((x) => <option key={x.id} value={x.id}>{x.id} — {x.owner.name} ({money(x.cashValue)})</option>)}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Withdrawal type</span>
          <div className="seg" role="group" aria-label="Withdrawal type">
            {(['Partial', 'Percentage', 'Full'] as WithdrawalType[]).map((t) => <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t}</button>)}
          </div>
        </div>
        {type === 'Partial' && <div className="field"><label htmlFor="wd-amt">Amount</label><input id="wd-amt" className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)} /></div>}
        {type === 'Percentage' && <div className="field"><label htmlFor="wd-pct">Percentage of available value</label><input id="wd-pct" className="input" inputMode="numeric" value={pct} onChange={(e) => setPct(Math.min(100, Number(e.target.value.replace(/[^0-9]/g, '')) || 0))} /></div>}
        <div className="field"><label htmlFor="wd-m">Payment method</label><select id="wd-m" className="select" value={method} onChange={(e) => setMethod(e.target.value as 'ACH')}>{['ACH', 'Check', 'Wire'].map((m) => <option key={m}>{m}</option>)}</select></div>
        {p && qt && !qt.eligible && <Notice tone="warning">This policy is not eligible for a withdrawal ({p.status}).</Notice>}
        {p && type === 'Full' && <Notice tone="warning">A full withdrawal surrenders the policy and terminates all coverage.</Notice>}
        <div><GatedButton module="withdrawals" level="create" className="btn btn-primary" disabled={!p || !qt?.eligible || !qt.gross} reason="Select an eligible policy and amount" onClick={submit}><Send size={14} />Submit for approval</GatedButton></div>
        {!canCreate && <p className="xs subtle">Your access allows viewing indicative amounts only.</p>}
      </div>
      <div>{p ? <QuoteView policyId={p.id} type={type} input={type === 'Percentage' ? pct : amount} /> : <p className="small muted">Select a policy to see the available value, charges and policy impact.</p>}</div>
    </div>
  );
}
