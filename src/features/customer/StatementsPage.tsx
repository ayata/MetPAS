import { useState } from 'react';
import { FilePlus2, RefreshCw } from 'lucide-react';
import { useStore, type Rec } from '../../store/AppStore';
import { LETTERS, STATEMENTS, STATEMENT_CONFIG, type Statement } from '../../data/customer';
import { POLICIES } from '../../data/policies';
import { date } from '../../lib/format';
import { Modal } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, ModulePage, PolicyLink, RestrictedSection, Status, TabPanel, Toolbar, useSearch, useTabParam } from '../../components/module';

type Tab = 'statements' | 'letters' | 'delivery' | 'configuration';

export function StatementsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('statements');
  const [request, setRequest] = useState(false);
  const scoped = (id: string) => !store.scope || store.scope.includes(id);
  const statements = [...store.recordsOf<Statement & Rec>('statements'), ...STATEMENTS].filter((s) => scoped(s.policyId)).map((s) => ({ ...s, status: store.statusOf(s.id, s.status) as Statement['status'] }));
  const { q, setQ, filtered } = useSearch(statements, (s) => `${s.id} ${s.policyId} ${s.kind}`);
  const letters = LETTERS.filter((l) => scoped(l.policyId)).map((l) => ({ ...l, status: store.statusOf(l.id, l.status) }));
  const failed = [...statements.filter((s) => s.status === 'Failed' || s.status === 'Returned').map((s) => ({ id: s.id, policyId: s.policyId, item: `${s.kind} (${s.period})`, channel: s.delivery, status: s.status })), ...letters.filter((l) => l.status === 'Failed').map((l) => ({ id: l.id, policyId: l.policyId, item: l.template, channel: 'Print & mail', status: l.status }))];
  const external = !!store.scope;
  const retry = (id: string) => store.setRecordStatus(id, 'Queued', { target: `Correspondence ${id}`, module: 'statements', message: 'Re-sent to delivery queue' });

  return (
    <ModulePage
      module="statements"
      lead={external ? 'Your policy statements and correspondence.' : 'Policy statements, statement history, letter generation and delivery tracking.'}
      actions={<GatedButton module="statements" level={external ? 'view' : 'create'} className="btn btn-primary" onClick={() => setRequest(true)}><FilePlus2 size={15} />Request statement</GatedButton>}
      kpis={[
        { label: 'Statements this cycle', value: statements.length, onClick: () => setTab('statements') },
        { label: 'Delivered digitally', value: statements.filter((s) => s.delivery !== 'Print & mail' && s.status === 'Delivered').length, tone: 'success' },
        { label: 'Failed or returned', value: failed.length, tone: failed.length ? 'critical' : 'success', onClick: () => setTab('delivery') },
        { label: 'Letters in progress', value: letters.filter((l) => l.status !== 'Delivered').length, onClick: () => setTab('letters') },
      ]}
      notice={!external ? <AccessNote module="statements" /> : undefined}
    >
      <TabPanel<Tab> label="Statement sections" value={tab} onChange={setTab} tabs={[{ id: 'statements', label: 'Statements' }, { id: 'letters', label: 'Letters' }, { id: 'delivery', label: 'Delivery tracking', count: failed.length }, ...(!external ? [{ id: 'configuration' as Tab, label: 'Configuration' }] : [])]}>
        {tab === 'statements' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search statement or policy" count={`${filtered.length} statements`} />
            <DataTable rows={filtered} rowKey={(s) => s.id} label="Statements"
              cols={[
                { key: 'k', label: 'Statement', render: (s) => <><div className="primary-cell">{s.kind}</div><div className="id-cell">{s.id} · {s.period}</div></> },
                { key: 'p', label: 'Policy', render: (s) => <PolicyLink id={s.policyId} /> },
                { key: 'd', label: 'Delivery', className: 'hide-md', render: (s) => <span className="small">{s.delivery}</span> },
                { key: 'g', label: 'Generated', className: 'hide-md', render: (s) => <span className="small">{date(s.generated)}</span> },
                { key: 's', label: 'Status', render: (s) => <Status s={s.status} /> },
                { key: 'v', label: '', className: 'num', render: (s) => s.status === 'Delivered' ? <button className="btn btn-ghost btn-sm" onClick={() => store.toast(`Opened ${s.kind} ${s.id} (synthetic preview)`, 'info')}>View</button> : null },
              ]} />
          </>
        )}
        {tab === 'letters' && (
          <DataTable rows={letters} rowKey={(l) => l.id} label="Letters"
            cols={[
              { key: 't', label: 'Letter', render: (l) => <><div className="primary-cell">{l.template}</div><div className="id-cell">{l.id} · {l.trigger}</div></> },
              { key: 'p', label: 'Policy', render: (l) => <PolicyLink id={l.policyId} /> },
              { key: 'c', label: 'Created', render: (l) => <span className="small">{date(l.created)}</span> },
              { key: 's', label: 'Status', render: (l) => <Status s={l.status} /> },
              { key: 'x', label: '', className: 'num', render: (l) => l.status === 'Queued' || l.status === 'Generated' ? <GatedButton module="statements" level="edit" onClick={() => store.setRecordStatus(l.id, 'Sent to mailhouse', { target: `Letter ${l.id}`, module: 'statements', message: 'Letter released to mailhouse (simulated)' })}>Release</GatedButton> : null },
            ]} />
        )}
        {tab === 'delivery' && (
          <DataTable rows={failed} rowKey={(f) => f.id} empty="No failed correspondence" label="Failed correspondence"
            cols={[
              { key: 'i', label: 'Item', render: (f) => <><div className="primary-cell">{f.item}</div><div className="id-cell">{f.id}</div></> },
              { key: 'p', label: 'Policy', render: (f) => <PolicyLink id={f.policyId} /> },
              { key: 'c', label: 'Channel', render: (f) => <span className="small">{f.channel}</span> },
              { key: 's', label: 'Status', render: (f) => <Status s={f.status} /> },
              { key: 'x', label: '', className: 'num', render: (f) => <GatedButton module="statements" level="edit" onClick={() => retry(f.id)}><RefreshCw size={13} />Retry</GatedButton> },
            ]} />
        )}
        {tab === 'configuration' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="config" title="Statement configuration" summary="Statement frequency and delivery are shown on each statement. Configuration and templates are restricted.">
              <DataTable rows={STATEMENT_CONFIG} rowKey={(c) => c.product} cols={[{ key: 'p', label: 'Product', render: (c) => c.product }, { key: 'f', label: 'Frequency', render: (c) => c.frequency }, { key: 'c', label: 'Delivery', render: (c) => c.channel }, { key: 't', label: 'Template', render: (c) => <span className="mono small">{c.template}</span> }]} />
            </RestrictedSection>
            <RestrictedSection cat="config" title="Print and mailhouse integration settings" summary="Integration settings are restricted to system administrators.">
              <p className="small mono">endpoint: sim://mailhouse.demo/print-stream · batch window 04:00 · SFTP ack timeout 30m (simulated)</p>
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
      {request && <RequestStatement onClose={() => setRequest(false)} />}
    </ModulePage>
  );
}

function RequestStatement({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const book = POLICIES.filter((p) => !store.scope || store.scope.includes(p.id));
  const [policyId, setPolicyId] = useState(book[0]?.id ?? '');
  const [kind, setKind] = useState<Statement['kind']>('Annual statement');
  const [delivery, setDelivery] = useState<Statement['delivery']>('Digital portal');
  const submit = () => {
    const id = store.nextId('STM', 67000);
    store.addRecord('statements', { id, policyId, period: 'On request', kind, delivery, generated: new Date().toISOString().slice(0, 10), status: 'Generating' }, { action: 'Requested statement', target: `${id} · ${kind}`, link: '/customer/statements', module: 'statements' }, `${id} requested — generating`);
    store.createTask({ typeId: store.scope ? 'service-request' : 'statement-request', policyId, priority: 'Low', description: `${kind} requested for delivery by ${delivery.toLowerCase()}.`, assignToMe: false }, { silent: true });
    onClose();
  };
  return (
    <Modal title="Request statement" desc="Generate a statement copy or history." onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!policyId} onClick={submit}>Request</button></>}>
      <div className="field"><label htmlFor="rs-p">Policy</label><select id="rs-p" className="select" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>{book.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.owner.name}</option>)}</select></div>
      <div className="cols-2">
        <div className="field"><label htmlFor="rs-k">Statement</label><select id="rs-k" className="select" value={kind} onChange={(e) => setKind(e.target.value as Statement['kind'])}>{['Annual statement', 'Quarterly statement', 'Transaction confirmation', 'Tax statement'].map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="field"><label htmlFor="rs-d">Delivery</label><select id="rs-d" className="select" value={delivery} onChange={(e) => setDelivery(e.target.value as Statement['delivery'])}>{['Digital portal', 'Email', 'Print & mail'].map((x) => <option key={x}>{x}</option>)}</select></div>
      </div>
    </Modal>
  );
}
