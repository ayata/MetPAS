import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { isAgent } from '../../store/access';
import { AGENTS, COMMISSIONS, COMMISSION_RUNS, type Commission } from '../../data/finance';
import { date, money } from '../../lib/format';
import { Drawer, Notice } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, KV, ModulePage, PolicyLink, RestrictedSection, Sensitive, Status, TabPanel, Toolbar, useSearch, useTabParam } from '../../components/module';

type Tab = 'agents' | 'commissions' | 'payments' | 'approvals';

export function CommissionsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('agents');
  const [sel, setSel] = useState<string | null>(null);
  const agentSelf = isAgent(store.me);
  // External agents see only their own records.
  const agents = agentSelf ? AGENTS.filter((a) => a.name === store.me.name) : AGENTS;
  const comms = COMMISSIONS.filter((c) => agents.some((a) => a.id === c.agentId)).map((c) => ({ ...c, status: store.statusOf(c.id, c.status) as Commission['status'] }));
  const { q, setQ, filtered } = useSearch(agents, (a) => `${a.name} ${a.dealerGroup} ${a.licenseNo}`);
  const selected = AGENTS.find((a) => a.id === sel);
  const pending = comms.filter((c) => c.status === 'Pending Approval');
  const expiring = agents.filter((a) => new Date(a.licenseExpiry).getTime() - Date.now() < 90 * 86400000);

  return (
    <ModulePage
      module="commissions"
      lead={agentSelf ? 'Your agent record, commission statements and payments (read-only).' : 'Agent records, licensing, commission calculations, payments and approvals.'}
      kpis={[
        { label: agentSelf ? 'Your status' : 'Active agents', value: agentSelf ? agents[0]?.status ?? '—' : agents.filter((a) => a.status === 'Active').length, onClick: () => setTab('agents') },
        { label: 'Commissions this period', value: money(comms.reduce((a, c) => a + c.amount, 0)), onClick: () => setTab('commissions') },
        { label: 'Pending approval', value: pending.length, tone: pending.length ? 'warning' : undefined, onClick: () => setTab('approvals') },
        { label: 'Licenses expiring (90 days)', value: expiring.length, tone: expiring.length ? 'critical' : 'success', onClick: () => setTab('agents') },
      ]}
      notice={agentSelf ? <Notice>You are viewing your own commission records. Other agents' data is not visible.</Notice> : <AccessNote module="commissions" />}
    >
      <TabPanel<Tab> label="Agent and commission sections" value={tab} onChange={setTab} tabs={[{ id: 'agents', label: agentSelf ? 'My agent record' : 'Agents' }, { id: 'commissions', label: 'Commissions' }, { id: 'payments', label: 'Payments' }, ...(!agentSelf ? [{ id: 'approvals' as Tab, label: 'Approvals', count: pending.length }] : [])]}>
        {tab === 'agents' && (
          <>
            {!agentSelf && <Toolbar search={q} onSearch={setQ} placeholder="Search agent, dealer group or license" count={`${filtered.length} agents`} />}
            <DataTable rows={filtered} rowKey={(a) => a.id} onRow={(a) => setSel(a.id)} selected={sel} label="Agents"
              cols={[
                { key: 'n', label: 'Agent', render: (a) => <><div className="primary-cell">{a.name}</div><div className="id-cell">{a.id} · since {date(a.commenced)}</div></> },
                { key: 'd', label: 'Dealer group', className: 'hide-md', render: (a) => <span className="small">{a.dealerGroup}</span> },
                { key: 'l', label: 'License', render: (a) => <span className="small">{a.states.join(', ')}<div className="id-cell">Expires {date(a.licenseExpiry)}</div></span> },
                { key: 'r', label: 'Regulatory approval', className: 'hide-md', render: (a) => <Status s={a.regulatoryApproval} /> },
                { key: 's', label: 'Status', render: (a) => <Status s={a.status} /> },
              ]} />
          </>
        )}
        {tab === 'commissions' && (
          <DataTable rows={comms} rowKey={(c) => c.id} label="Commissions"
            cols={[
              { key: 'i', label: 'Commission', render: (c) => <><div className="primary-cell">{c.kind}</div><div className="id-cell">{c.id} · {c.period}</div></> },
              { key: 'a', label: 'Agent', className: 'hide-md', render: (c) => <span className="small">{AGENTS.find((a) => a.id === c.agentId)?.name}</span> },
              { key: 'p', label: 'Policy', render: (c) => <PolicyLink id={c.policyId} /> },
              { key: 'm', label: 'Amount', className: 'num', render: (c) => money(c.amount, true) },
              { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
            ]} />
        )}
        {tab === 'payments' && (
          <div className="stack gap-3">
            <DataTable rows={COMMISSION_RUNS} rowKey={(r) => r.id} label="Commission payment runs"
              cols={[
                { key: 'i', label: 'Payment run', render: (r) => <><div className="primary-cell">{r.period}</div><div className="id-cell">{r.id}</div></> },
                { key: 'd', label: 'Payment date', render: (r) => <span className="small">{date(r.date)}</span> },
                { key: 'a', label: agentSelf ? 'Your amount' : 'Agents', className: 'num', render: (r) => (agentSelf ? money(Math.round(r.amount / r.agents * 1.8)) : r.agents) },
                ...(!agentSelf ? [{ key: 't', label: 'Total', className: 'num', render: (r: typeof COMMISSION_RUNS[number]) => money(r.amount) }] : []),
                { key: 's', label: 'Status', render: (r) => <Status s={r.status} /> },
              ]} />
          </div>
        )}
        {tab === 'approvals' && (
          <DataTable rows={pending} rowKey={(c) => c.id} empty="No commissions awaiting approval" label="Commission approvals"
            cols={[
              { key: 'i', label: 'Commission', render: (c) => <><div className="primary-cell">{c.kind} · {AGENTS.find((a) => a.id === c.agentId)?.name}</div><div className="id-cell">{c.id}</div></> },
              { key: 'p', label: 'Policy', render: (c) => <PolicyLink id={c.policyId} /> },
              { key: 'm', label: 'Amount', className: 'num', render: (c) => money(c.amount, true) },
              { key: 'x', label: '', className: 'num', render: (c) => <GatedButton module="commissions" level="approve" onClick={() => store.setRecordStatus(c.id, 'Approved', { target: `Commission ${c.id}`, module: 'commissions', message: 'Commission approved for payment' })}>Approve</GatedButton> },
            ]} />
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Agent ${selected.name}`} onClose={() => setSel(null)} header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Agent & Commission</div><h2 style={{ fontSize: 18 }}>{selected.name}</h2></div>}>
          <KV two items={[['Dealer group', selected.dealerGroup], ['Commencement date', date(selected.commenced)], ['Status', <Status s={selected.status} />], ['Regulatory approval', <Status s={selected.regulatoryApproval} />], ['Email', <Sensitive cat="pii" kind="email" value={selected.email} />], ['Phone', <Sensitive cat="pii" kind="phone" value={selected.phone} />]]} />
          <section className="stack"><h3>License details</h3><KV two items={[['License number', selected.licenseNo], ['Expiry', date(selected.licenseExpiry)], ['Licensed states', selected.states.join(', ')], ['Appointment', selected.status === 'Pending Appointment' ? 'Awaiting state approval' : 'Appointed']]} /></section>
          <section className="stack"><h3>Commission summary</h3><KV two items={[['This period', money(COMMISSIONS.filter((c) => c.agentId === selected.id).reduce((a, c) => a + c.amount, 0), true)], ['Policies', COMMISSIONS.filter((c) => c.agentId === selected.id).length]]} /></section>
          <section className="stack"><h3>Documents</h3>
            <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              {['Producer agreement (signed)', 'State appointment confirmation', 'E&O insurance certificate', 'AML training certificate'].map((d) => <button key={d} className="list-row" onClick={() => store.toast(`Opened ${d} (synthetic preview)`, 'info')}><FileText size={15} className="subtle" /><span className="grow small">{d}</span></button>)}
            </div>
          </section>
          <RestrictedSection cat="commercial" title="Commercial agreement" target={selected.id} summary="Agreement terms and commission schedules are confidential."><p className="small">{selected.agreement}</p></RestrictedSection>
          <RestrictedSection cat="formulas" title="Commission calculation" target={selected.id} summary="Commission amounts are calculation outputs."><p className="small mono">commission = targetPremium × rate(kind, policyYear) + excessPremium × 2% − chargebacks</p></RestrictedSection>
        </Drawer>
      )}
    </ModulePage>
  );
}
