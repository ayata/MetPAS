import { useState } from 'react';
import { Headset, MessageSquare, Phone, Mail, Printer, MonitorSmartphone, Route } from 'lucide-react';
import { useStore, type Rec } from '../../store/AppStore';
import { CHANNEL_VOLUME, INTERACTIONS, SERVICE_CASES, type Channel, type ServiceCase } from '../../data/customer';
import { LETTERS } from '../../data/customer';
import { POLICIES, policyById } from '../../data/policies';
import { date, relative } from '../../lib/format';
import { Drawer, Modal } from '../../components/ui';
import { AccessNote, BarList, DataTable, GatedButton, KV, ModulePage, PolicyLink, Status, TabPanel, Toolbar, useSearch, useTabParam } from '../../components/module';

type Tab = 'interactions' | 'requests' | 'correspondence' | 'analytics';
const ICON: Record<Channel, JSX.Element> = { Chat: <MessageSquare size={14} />, Telephone: <Phone size={14} />, Email: <Mail size={14} />, Letter: <Printer size={14} />, Portal: <MonitorSmartphone size={14} /> };
const QUEUES = ['Policy Servicing', 'Billing', 'Financial Transactions', 'Complaints', 'Claims'];

export function CustomerServicePage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('interactions');
  const [channel, setChannel] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [create, setCreate] = useState(false);
  const { q, setQ, filtered } = useSearch(INTERACTIONS.filter((i) => !channel || i.channel === channel), (i) => `${i.id} ${i.policyId} ${i.subject} ${policyById(i.policyId)?.owner.name}`);
  const cases = [...store.recordsOf<ServiceCase & Rec>('service-cases'), ...SERVICE_CASES].map((c) => ({ ...c, status: store.statusOf(c.id, c.status) as ServiceCase['status'], queue: store.statusOf(`${c.id}:queue`, c.queue) }));
  const selected = INTERACTIONS.find((i) => i.id === sel);
  const isManager = store.session.role === 'manager';

  return (
    <ModulePage
      module="customer-service"
      lead="Customer interactions across chat, telephone, email and print; service requests, inquiries and routing."
      actions={<GatedButton module="customer-service" level="create" className="btn btn-primary" onClick={() => setCreate(true)}><Headset size={15} />New service request</GatedButton>}
      kpis={[
        { label: 'Interactions today', value: CHANNEL_VOLUME.reduce((a, c) => a + c.today, 0).toLocaleString(), onClick: () => setTab('interactions') },
        { label: 'Open service requests', value: cases.filter((c) => c.status !== 'Resolved').length, onClick: () => setTab('requests') },
        { label: 'Awaiting customer', value: cases.filter((c) => c.status === 'Awaiting Customer').length, tone: 'warning', onClick: () => setTab('requests') },
        { label: 'Service level', value: '93%', sub: 'Answered within target', tone: 'success', onClick: () => setTab('analytics') },
      ]}
      notice={<AccessNote module="customer-service" />}
    >
      <TabPanel<Tab> label="Customer service sections" value={tab} onChange={setTab} tabs={[{ id: 'interactions', label: 'Interactions' }, { id: 'requests', label: 'Service requests', count: cases.filter((c) => c.status !== 'Resolved').length }, { id: 'correspondence', label: 'Correspondence' }, { id: 'analytics', label: isManager ? 'Operational analytics' : 'Channel overview' }]}>
        {tab === 'interactions' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search customer, policy or subject" count={`${filtered.length} interactions`} filters={[{ label: 'All channels', value: channel, onChange: setChannel, options: ['Chat', 'Telephone', 'Email', 'Letter', 'Portal'] }]} />
            <DataTable rows={filtered} rowKey={(i) => i.id} onRow={(i) => setSel(i.id)} selected={sel} label="Customer interactions"
              cols={[
                { key: 'c', label: 'Customer', render: (i) => <><div className="primary-cell">{policyById(i.policyId)?.owner.name}</div><div className="id-cell">{i.id}</div></> },
                { key: 'ch', label: 'Channel', render: (i) => <span className="row small" style={{ gap: 6 }}>{ICON[i.channel]}{i.channel}</span> },
                { key: 's', label: 'Subject', render: (i) => <span className="small">{i.subject}</span> },
                { key: 'a', label: 'Handled by', className: 'hide-md', render: (i) => <span className="small">{i.agent}</span> },
                { key: 't', label: 'When', className: 'hide-md', render: (i) => <span className="small muted">{relative(i.at)}</span> },
                { key: 'o', label: 'Outcome', render: (i) => <Status s={i.outcome} /> },
              ]} />
          </>
        )}
        {tab === 'requests' && (
          <DataTable rows={cases} rowKey={(c) => c.id} label="Service requests"
            cols={[
              { key: 'i', label: 'Request', render: (c) => <><div className="primary-cell">{c.type}</div><div className="id-cell">{c.id} · {date(c.opened)} · {c.channel}</div></> },
              { key: 'p', label: 'Policy', render: (c) => <PolicyLink id={c.policyId} /> },
              { key: 'q', label: 'Routed to', render: (c) => <span className="small">{c.queue}</span> },
              { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
              { key: 'x', label: '', className: 'num', render: (c) => c.status === 'Resolved' ? null : (
                <span className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                  <GatedButton module="customer-service" level="edit" className="btn btn-ghost btn-sm" onClick={() => { const next = QUEUES[(QUEUES.indexOf(c.queue) + 1) % QUEUES.length]; store.setRecordStatus(`${c.id}:queue`, next, { target: `Service request ${c.id}`, module: 'customer-service', message: `Routed to ${next}` }); }}><Route size={13} />Route</GatedButton>
                  <GatedButton module="customer-service" level="edit" onClick={() => store.setRecordStatus(c.id, 'Resolved', { target: `Service request ${c.id}`, module: 'customer-service', message: 'Service request resolved' })}>Resolve</GatedButton>
                </span>) },
            ]} />
        )}
        {tab === 'correspondence' && (
          <DataTable rows={LETTERS.map((l) => ({ ...l, status: store.statusOf(l.id, l.status) }))} rowKey={(l) => l.id} label="Customer correspondence"
            cols={[
              { key: 't', label: 'Correspondence', render: (l) => <><div className="primary-cell">{l.template}</div><div className="id-cell">{l.id} · {l.trigger}</div></> },
              { key: 'p', label: 'Policy', render: (l) => <PolicyLink id={l.policyId} /> },
              { key: 'c', label: 'Created', render: (l) => <span className="small">{date(l.created)}</span> },
              { key: 's', label: 'Status', render: (l) => <Status s={l.status} /> },
            ]} />
        )}
        {tab === 'analytics' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-3"><h3>Interactions by channel (today)</h3><BarList items={CHANNEL_VOLUME.map((c) => ({ label: c.channel, value: c.today }))} /></div>
            <div className="stack gap-3"><h3>Service level by channel</h3><BarList max={100} items={CHANNEL_VOLUME.map((c) => ({ label: c.channel, value: c.sla, tone: c.sla < 90 ? 'warn' : undefined }))} format={(n) => `${n}%`} /></div>
          </div>
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Interaction ${selected.id}`} onClose={() => setSel(null)} header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Customer Service</div><h2 style={{ fontSize: 18 }}>{selected.subject}</h2></div>}
          footer={<GatedButton module="customer-service" level="create" className="btn btn-primary btn-sm" onClick={() => { setSel(null); setCreate(true); }}>Create service request</GatedButton>}>
          <KV two items={[['Customer', policyById(selected.policyId)?.owner.name], ['Policy', <PolicyLink id={selected.policyId} />], ['Channel', selected.channel], ['Handled by', selected.agent], ['When', relative(selected.at)], ['Outcome', <Status s={selected.outcome} />]]} />
          <section className="stack"><h3>Summary</h3><p className="small">{selected.summary}</p></section>
          <section className="stack"><h3>Request history</h3>
            <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              {INTERACTIONS.filter((i) => i.policyId === selected.policyId).map((i) => <div key={i.id} className="list-row"><span className="row small" style={{ gap: 6 }}>{ICON[i.channel]}</span><span className="grow small">{i.subject}</span><span className="xs subtle">{relative(i.at)}</span></div>)}
            </div>
          </section>
        </Drawer>
      )}
      {create && <NewCaseModal onClose={() => setCreate(false)} />}
    </ModulePage>
  );
}

function NewCaseModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [policyId, setPolicyId] = useState('');
  const [type, setType] = useState('Policy inquiry');
  const [channel, setChannel] = useState<Channel>('Telephone');
  const [queue, setQueue] = useState('Policy Servicing');
  const submit = () => {
    if (!policyId) return;
    const id = store.nextId('SRV', 31600);
    store.addRecord('service-cases', { id, policyId, type, opened: new Date().toISOString().slice(0, 10), channel, queue, status: 'Open' }, { action: 'Created service request', target: `${id} · ${type}`, link: '/customer/service?tab=requests', module: 'customer-service' }, `${id} created and routed to ${queue}`);
    store.createTask({ typeId: 'policy-inquiry', policyId, priority: 'Medium', description: `${type} received by ${channel.toLowerCase()} (${id}).`, assignToMe: false, title: type === 'Policy inquiry' ? undefined : type }, { silent: true });
    onClose();
  };
  return (
    <Modal title="New service request" desc="Log the request and route it to the right team." onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!policyId} onClick={submit}>Create request</button></>}>
      <div className="field"><label htmlFor="sr-p">Policy</label><select id="sr-p" className="select" value={policyId} onChange={(e) => setPolicyId(e.target.value)}><option value="">Select a policy</option>{POLICIES.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.owner.name}</option>)}</select></div>
      <div className="cols-2">
        <div className="field"><label htmlFor="sr-t">Request type</label><select id="sr-t" className="select" value={type} onChange={(e) => setType(e.target.value)}>{['Policy inquiry', 'Address change', 'Duplicate statement', 'Beneficiary inquiry', 'Payment method change', 'Complaint'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label htmlFor="sr-c">Channel</label><select id="sr-c" className="select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>{['Telephone', 'Chat', 'Email', 'Letter', 'Portal'].map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="sr-q">Route to</label><select id="sr-q" className="select" value={queue} onChange={(e) => setQueue(e.target.value)}>{QUEUES.map((x) => <option key={x}>{x}</option>)}</select><span className="hint">Automated routing suggests a queue; you can override it.</span></div>
    </Modal>
  );
}
