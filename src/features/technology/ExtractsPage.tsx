import { useState } from 'react';
import { Database, FileBarChart, Play } from 'lucide-react';
import { useStore, type Rec } from '../../store/AppStore';
import { DATASETS, EXTRACTS, WORKBENCH_REPORTS, type Extract } from '../../data/technology';
import { POLICIES } from '../../data/policies';
import { date } from '../../lib/format';
import { Modal, Notice } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, ModulePage, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'extracts' | 'dashboards' | 'workbench';

export function ExtractsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('extracts');
  const [request, setRequest] = useState(false);
  const extracts = [...store.recordsOf<Extract & Rec>('extracts'), ...EXTRACTS].map((e) => ({ ...e, status: store.statusOf(e.id, e.status) as Extract['status'] }));
  const sensitiveAccess = store.data('pii') === 'full';
  const set = (e: Extract, s: Extract['status'], m: string) => store.setRecordStatus(e.id, s, { target: `Extract ${e.id}`, module: 'data-extracts', message: m });

  const action = (e: Extract) => {
    if (e.status === 'Pending Approval' || (e.status === 'Requested' && e.sensitive)) return <GatedButton module="data-extracts" level="approve" onClick={() => set(e, 'Approved', 'Extract approved')}>Approve</GatedButton>;
    if (e.status === 'Requested' || e.status === 'Approved' || e.status === 'Failed') {
      const blocked = e.sensitive && !sensitiveAccess;
      return <GatedButton module="data-extracts" level="edit" disabled={blocked} reason="Sensitive extracts require full access to restricted data" onClick={() => set(e, 'Completed', 'Extract executed (synthetic file produced)')}><Play size={12} />Execute</GatedButton>;
    }
    if (e.status === 'Completed') return <GatedButton module="data-extracts" level="configure" className="btn btn-ghost btn-sm" onClick={() => { set(e, 'Requested', 'Extract definition modified — re-run required'); }}>Modify</GatedButton>;
    return null;
  };

  return (
    <ModulePage
      module="data-extracts"
      lead="Request, execute and track data extracts; workbench reports and dashboard summaries. Sensitive extracts need approval and data access."
      actions={<GatedButton module="data-extracts" level="create" className="btn btn-primary" onClick={() => setRequest(true)}><Database size={15} />Request extract</GatedButton>}
      kpis={[
        { label: 'Extract requests', value: extracts.length, onClick: () => setTab('extracts') },
        { label: 'Awaiting approval', value: extracts.filter((e) => e.status === 'Pending Approval' || (e.status === 'Requested' && e.sensitive)).length, tone: 'warning' },
        { label: 'Failed', value: extracts.filter((e) => e.status === 'Failed').length, tone: 'critical' },
        { label: 'Workbench reports', value: WORKBENCH_REPORTS.length, onClick: () => setTab('workbench') },
      ]}
      notice={<AccessNote module="data-extracts" />}
    >
      <TabPanel<Tab> label="Data sections" value={tab} onChange={setTab} tabs={[{ id: 'extracts', label: 'Extract requests' }, { id: 'dashboards', label: 'Dashboard summaries' }, { id: 'workbench', label: 'Workbench reports' }]}>
        {tab === 'extracts' && (
          <DataTable rows={extracts} rowKey={(e) => e.id} label="Extract requests"
            cols={[
              { key: 'n', label: 'Extract', render: (e) => <><div className="primary-cell">{e.name}</div><div className="id-cell">{e.id} · {e.dataset}</div></> },
              { key: 'r', label: 'Requested by', className: 'hide-md', render: (e) => <span className="small">{e.requestedBy}<div className="id-cell">{date(e.requested)}</div></span> },
              { key: 's', label: 'Sensitivity', render: (e) => <span className={`chip ${e.sensitive ? '' : 'blue'}`}>{e.sensitive ? 'Sensitive' : 'Standard'}</span> },
              { key: 'w', label: 'Rows', className: 'num hide-md', render: (e) => (e.rows ? e.rows.toLocaleString() : '—') },
              { key: 'st', label: 'Status', render: (e) => <Status s={e.status} /> },
              { key: 'x', label: '', className: 'num', render: action },
            ]} />
        )}
        {tab === 'dashboards' && (
          <div className="calc-grid" style={{ padding: 'var(--s5)' }}>
            {[['Policies in force', POLICIES.filter((p) => p.status === 'In Force').length.toString()], ['Open tasks', store.state.tasks.filter((t) => t.status !== 'Completed').length.toString()], ['Claims in progress', '6'], ['Receipts today', '24'], ['Extracts this month', extracts.length.toString()], ['Data feeds streaming', '5 of 6']].map(([k, v]) => (
              <div key={k} className="calc-card"><span className="small muted">{k}</span><span className="kpi-value">{v}</span></div>
            ))}
          </div>
        )}
        {tab === 'workbench' && (
          <DataTable rows={WORKBENCH_REPORTS} rowKey={(r) => r.name} label="Workbench reports"
            cols={[
              { key: 'n', label: 'Report', render: (r) => <span className="row" style={{ gap: 8 }}><FileBarChart size={15} className="subtle" /><span className="primary-cell">{r.name}</span></span> },
              { key: 'a', label: 'Business area', render: (r) => <span className="small">{r.area}</span> },
              { key: 'x', label: '', className: 'num', render: (r) => <GatedButton module="data-extracts" level="view" onClick={() => { store.logActivity('Generated workbench report', r.name, '/tech/extracts?tab=workbench', 'data-extracts'); store.toast(`${r.name}: ${r.rows} rows (synthetic)`, 'info'); }}>Generate</GatedButton> },
            ]} />
        )}
      </TabPanel>
      {request && <RequestExtract onClose={() => setRequest(false)} />}
    </ModulePage>
  );
}

function RequestExtract({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [name, setName] = useState('');
  const [dataset, setDataset] = useState(DATASETS[0].id);
  const [filter, setFilter] = useState('Status = In Force');
  const ds = DATASETS.find((d) => d.id === dataset)!;
  const submit = () => {
    const id = store.nextId('EXT', 5600);
    store.addRecord('extracts', { id, name: name || ds.name, dataset: ds.name, requestedBy: store.me.name, requested: new Date().toISOString().slice(0, 10), sensitive: ds.sensitive, rows: 0, status: ds.sensitive ? 'Pending Approval' : 'Requested' },
      { action: 'Requested data extract', target: `${id} · ${ds.name}`, link: '/tech/extracts', module: 'data-extracts' }, `${id} requested${ds.sensitive ? ' — approval required' : ''}`);
    if (ds.sensitive) store.createTask({ typeId: 'extract-request', policyId: '—', priority: 'Medium', description: `Approve sensitive extract ${id}: ${ds.name} (${filter}).`, assignToMe: false, submit: true }, { silent: true });
    onClose();
  };
  return (
    <Modal title="Request data extract" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}>Submit request</button></>}>
      <div className="field"><label htmlFor="rx-n">Extract name</label><input id="rx-n" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. October in-force for finance" /></div>
      <div className="field"><label htmlFor="rx-d">Dataset</label><select id="rx-d" className="select" value={dataset} onChange={(e) => setDataset(e.target.value)}>{DATASETS.map((d) => <option key={d.id} value={d.id}>{d.name}{d.sensitive ? ' (sensitive)' : ''}</option>)}</select></div>
      <div className="field"><label htmlFor="rx-f">Filter</label><input id="rx-f" className="input" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
      {ds.sensitive && <Notice tone="warning">This dataset contains restricted information. It needs approval, and only users with full access to the relevant data can execute it.</Notice>}
    </Modal>
  );
}
