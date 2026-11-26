import { useState } from 'react';
import { useStore } from '../../store/AppStore';
import { AR_AGING, BILLING, PAYMENT_EXCEPTIONS, RECEIPTS, WAIVERS, type Receipt } from '../../data/finance';
import { policyById } from '../../data/policies';
import { date, money } from '../../lib/format';
import { Drawer } from '../../components/ui';
import { AccessNote, BarList, DataTable, GatedButton, KV, ModulePage, PolicyLink, RestrictedSection, Sensitive, Status, TabPanel, Toolbar, useSearch, useTabParam } from '../../components/module';

type Tab = 'receipts' | 'billing' | 'receivables' | 'exceptions' | 'waivers';

export function BillingPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('receipts');
  const [status, setStatus] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const receipts = RECEIPTS.map((r) => ({ ...r, status: store.statusOf(r.id, r.status) as Receipt['status'] }));
  const { q, setQ, filtered } = useSearch(receipts.filter((r) => !status || r.status === status), (r) => `${r.id} ${r.policyId} ${r.institution}`);
  const exceptions = PAYMENT_EXCEPTIONS.map((e) => ({ ...e, status: store.statusOf(e.id, e.status) }));
  const today = receipts.filter((r) => r.received === new Date().toISOString().slice(0, 10));
  const selected = receipts.find((r) => r.id === sel);
  const outstanding = AR_AGING.slice(1).reduce((a, x) => a + x.amount, 0);

  return (
    <ModulePage
      module="billing"
      lead="Premium billing, incoming payments, receivables and payment exceptions."
      kpis={[
        { label: 'Receipts today', value: money(today.reduce((a, r) => a + r.amount, 0)), sub: `${today.length} payments`, onClick: () => setTab('receipts') },
        { label: 'Outstanding receivables', value: money(outstanding), sub: 'Past due', onClick: () => setTab('receivables') },
        { label: 'Payment exceptions', value: exceptions.filter((e) => e.status !== 'Resolved').length, tone: 'critical', onClick: () => setTab('exceptions') },
        { label: 'Unreconciled receipts', value: receipts.filter((r) => r.recon !== 'Reconciled').length, tone: 'warning', onClick: () => { setTab('receipts'); setStatus(''); } },
      ]}
      notice={<AccessNote module="billing" />}
    >
      <TabPanel<Tab> label="Billing sections" value={tab} onChange={setTab} tabs={[{ id: 'receipts', label: 'Payment receipts' }, { id: 'billing', label: 'Premium billing' }, { id: 'receivables', label: 'Accounts receivable' }, { id: 'exceptions', label: 'Payment exceptions', count: exceptions.filter((e) => e.status !== 'Resolved').length }, { id: 'waivers', label: 'Waivers & discounts' }]}>
        {tab === 'receipts' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search receipt, policy or bank" count={`${filtered.length} receipts`} filters={[{ label: 'All statuses', value: status, onChange: setStatus, options: ['Posted', 'Pending', 'Suspense', 'Rejected'] }]} />
            <DataTable rows={filtered} rowKey={(r) => r.id} onRow={(r) => setSel(r.id)} selected={sel} label="Payment receipts"
              cols={[
                { key: 'i', label: 'Receipt', render: (r) => <><div className="primary-cell">{r.id}</div><div className="id-cell">{date(r.received)}</div></> },
                { key: 'p', label: 'Policy', render: (r) => <PolicyLink id={r.policyId} /> },
                { key: 'a', label: 'Amount', className: 'num', render: (r) => money(r.amount, true) },
                { key: 's', label: 'Source / method', className: 'hide-md', render: (r) => <span className="small">{r.source}<div className="id-cell">{r.method}</div></span> },
                { key: 'b', label: 'Bank reference', className: 'hide-md', render: (r) => <span className="small mono"><Sensitive cat="pii" kind="account" value={r.bankRef} /></span> },
                { key: 'st', label: 'Status', render: (r) => <Status s={r.status} /> },
                { key: 'r', label: 'Reconciliation', className: 'hide-md', render: (r) => <Status s={r.recon} /> },
              ]} />
          </>
        )}
        {tab === 'billing' && (
          <DataTable rows={BILLING} rowKey={(b) => b.id} label="Premium billing"
            cols={[
              { key: 'i', label: 'Bill', render: (b) => <><div className="primary-cell">{b.id}</div><div className="id-cell">{b.mode}</div></> },
              { key: 'p', label: 'Policy', render: (b) => <><PolicyLink id={b.policyId} /><div className="id-cell">{policyById(b.policyId)?.owner.name}</div></> },
              { key: 'd', label: 'Due', render: (b) => <span className="small">{date(b.due)}</span> },
              { key: 'a', label: 'Amount due', className: 'num', render: (b) => money(b.amount, true) },
              { key: 's', label: 'Status', render: (b) => <Status s={b.status} /> },
            ]} />
        )}
        {tab === 'receivables' && (
          <div className="stack gap-4" style={{ padding: 'var(--s5)' }}>
            <h3>Aging of premiums receivable</h3>
            <BarList items={AR_AGING.map((a, i) => ({ label: `${a.bucket} (${a.count.toLocaleString()})`, value: a.amount, tone: i >= 3 ? 'bad' : i >= 1 ? 'warn' : undefined }))} format={(n) => money(n)} />
            <RestrictedSection cat="financial" title="Collection calculations and interest charges" summary="Collection outcomes are shown above; calculation workings are restricted.">
              <KV items={[['Late interest rate', '1.0% per month after grace (synthetic)'], ['Collection priority score', '0.4 × days past due + 0.6 × amount band'], ['Write-off threshold', '$25 after 180 days'], ['Interest charged MTD', money(18240)]]} />
            </RestrictedSection>
          </div>
        )}
        {tab === 'exceptions' && (
          <DataTable rows={exceptions} rowKey={(e) => e.id} label="Payment exceptions"
            cols={[
              { key: 'i', label: 'Exception', render: (e) => <><div className="primary-cell">{e.type}</div><div className="id-cell">{e.id} · {date(e.raised)}</div></> },
              { key: 'p', label: 'Policy', render: (e) => <PolicyLink id={e.policyId} /> },
              { key: 'a', label: 'Amount', className: 'num', render: (e) => money(e.amount, true) },
              { key: 's', label: 'Status', render: (e) => <Status s={e.status} /> },
              { key: 'x', label: '', className: 'num', render: (e) => e.status === 'Resolved' ? null : <GatedButton module="billing" level="edit" onClick={() => store.setRecordStatus(e.id, e.status === 'Open' ? 'Investigating' : 'Resolved', { target: `Payment exception ${e.id}`, module: 'billing', message: e.status === 'Open' ? 'Exception under investigation' : 'Exception resolved' })}>{e.status === 'Open' ? 'Investigate' : 'Resolve'}</GatedButton> },
            ]} />
        )}
        {tab === 'waivers' && (
          <div className="stack gap-3">
            <DataTable rows={WAIVERS.map((w) => ({ ...w, status: store.statusOf(w.id, w.status) }))} rowKey={(w) => w.id} label="Waivers and discounts"
              cols={[
                { key: 'i', label: 'Waiver / discount', render: (w) => <><div className="primary-cell">{w.kind}</div><div className="id-cell">{w.id} · since {date(w.from)}</div></> },
                { key: 'p', label: 'Policy', render: (w) => <PolicyLink id={w.policyId} /> },
                { key: 's', label: 'Status', render: (w) => <Status s={w.status} /> },
                { key: 'x', label: '', className: 'num', render: (w) => w.status === 'Pending Approval' ? <GatedButton module="billing" level="approve" onClick={() => store.setRecordStatus(w.id, 'Active', { target: `Waiver ${w.id}`, module: 'billing', message: 'Waiver approved' })}>Approve</GatedButton> : null },
              ]} />
            <div style={{ padding: '0 var(--s5) var(--s5)' }}>
              <RestrictedSection cat="financial" title="Waiver and discount rules" summary="Eligibility outcomes are visible; the rules are restricted to finance.">
                <KV items={[['Loyalty discount', '5% if continuously in force ≥ 10 years and no lapse'], ['Multi-policy discount', '3% when ≥ 2 active policies share an owner'], ['Hardship late-fee waiver', 'Max 2 per rolling 12 months, supervisor approval']]} />
              </RestrictedSection>
            </div>
          </div>
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Receipt ${selected.id}`} onClose={() => setSel(null)} header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Billing & Payments</div><h2 style={{ fontSize: 18 }}>{money(selected.amount, true)} payment</h2></div>}
          footer={selected.status === 'Suspense' || selected.status === 'Pending' ? <GatedButton module="billing" level="edit" className="btn btn-primary btn-sm" onClick={() => store.setRecordStatus(selected.id, 'Posted', { target: `Receipt ${selected.id}`, module: 'billing', message: 'Receipt applied and posted' })}>Apply to policy</GatedButton> : undefined}>
          <KV two items={[['Policy', <PolicyLink id={selected.policyId} />], ['Received', date(selected.received)], ['Payment source', selected.source], ['Payment method', selected.method], ['Financial institution', selected.institution], ['Bank reference', <span className="mono"><Sensitive cat="pii" kind="account" value={selected.bankRef} /></span>], ['Status', <Status s={selected.status} />], ['Reconciliation', <Status s={selected.recon} />]]} />
          <section className="stack"><h3>Transaction history</h3>
            <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              {policyById(selected.policyId)!.transactions.slice(0, 4).map((t) => <div key={t.id} className="list-row"><span className="grow small">{t.type}<div className="id-cell">{date(t.date)}</div></span><span className="small mono">{money(t.amount, true)}</span></div>)}
            </div>
          </section>
          <p className="xs subtle">Card security codes are never stored or displayed.</p>
        </Drawer>
      )}
    </ModulePage>
  );
}
