import { useStore } from '../../store/AppStore';
import { FIN_CONTROLS, FIN_MOVEMENTS, GL_ACCOUNTS } from '../../data/finance';
import { SEED_BATCH } from '../../data/operations';
import { relative } from '../../lib/format';
import { money } from '../../lib/format';
import { date } from '../../lib/format';
import { AccessNote, BarList, DataTable, GatedButton, KV, ModulePage, RestrictedSection, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'movements' | 'gl' | 'batch' | 'controls' | 'discrepancies';

export function ReconciliationPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('movements');
  const accounts = GL_ACCOUNTS.map((a) => ({ ...a, status: store.statusOf(a.id, a.status) }));
  const breaks = accounts.filter((a) => a.status !== 'Reconciled');
  const financialJobs = SEED_BATCH.filter((b) => ['JOB-PRM-01', 'JOB-DIS-04', 'JOB-REI-07', 'JOB-TAX-06', 'JOB-BIL-02'].includes(b.id));

  return (
    <ModulePage
      module="finance-recon"
      lead="Financial movements, general ledger reconciliation, batch processing and financial controls."
      kpis={[
        { label: 'GL accounts reconciled', value: `${Math.round(((accounts.length - breaks.length) / accounts.length) * 100)}%`, sub: `${accounts.length - breaks.length} of ${accounts.length}`, tone: breaks.length ? 'warning' : 'success', onClick: () => setTab('gl') },
        { label: 'Open discrepancies', value: breaks.length, tone: breaks.length ? 'critical' : 'success', onClick: () => setTab('discrepancies') },
        { label: 'Financial batches today', value: financialJobs.length, sub: `${financialJobs.filter((j) => j.status === 'Failed').length} failed`, onClick: () => setTab('batch') },
        { label: 'Controls tested', value: FIN_CONTROLS.length, sub: `${FIN_CONTROLS.filter((c) => c.result !== 'Passed').length} with exceptions`, onClick: () => setTab('controls') },
      ]}
      notice={<AccessNote module="finance-recon" />}
    >
      <TabPanel<Tab> label="Finance sections" value={tab} onChange={setTab} tabs={[{ id: 'movements', label: 'Financial movements' }, { id: 'gl', label: 'GL reconciliation' }, { id: 'batch', label: 'Batch processing' }, { id: 'controls', label: 'Controls & testing' }, { id: 'discrepancies', label: 'Discrepancies', count: breaks.length }]}>
        {tab === 'movements' && (
          <div className="stack gap-4" style={{ padding: 'var(--s5)' }}>
            <div className="row between"><h3>Month-to-date movements by transaction type</h3><span className="xs subtle">Synthetic amounts</span></div>
            <BarList items={FIN_MOVEMENTS.map((m) => ({ label: `${m.type} (${m.count.toLocaleString()})`, value: m.amount, tone: m.amount < 0 ? 'muted' : undefined }))} format={(n) => money(n)} />
          </div>
        )}
        {tab === 'gl' && (
          <DataTable rows={accounts} rowKey={(a) => a.id} label="GL reconciliation"
            cols={[
              { key: 'a', label: 'Account', render: (a) => <><div className="primary-cell">{a.name}</div><div className="id-cell">{a.id} · {a.owner}</div></> },
              { key: 'p', label: 'PAS balance', className: 'num', render: (a) => money(a.pas) },
              { key: 'g', label: 'GL balance', className: 'num', render: (a) => money(a.gl) },
              { key: 'v', label: 'Variance', className: 'num', render: (a) => <span className={a.pas - a.gl ? 'strong' : 'muted'} style={{ color: a.pas - a.gl ? 'var(--critical)' : undefined }}>{money(a.pas - a.gl)}</span> },
              { key: 's', label: 'Status', render: (a) => <Status s={a.status} /> },
              { key: 'x', label: '', className: 'num', render: (a) => a.status === 'Reconciled' ? null : <GatedButton module="finance-recon" level="edit" onClick={() => store.setRecordStatus(a.id, a.status === 'Break' ? 'Under Review' : 'Reconciled', { target: `GL ${a.id}`, module: 'finance-recon', message: a.status === 'Break' ? 'Break assigned for review' : 'Account marked reconciled' })}>{a.status === 'Break' ? 'Investigate' : 'Mark reconciled'}</GatedButton> },
            ]} />
        )}
        {tab === 'batch' && (
          <DataTable rows={financialJobs} rowKey={(j) => j.id} label="Financial batch jobs"
            cols={[
              { key: 'n', label: 'Job', render: (j) => <><div className="primary-cell">{j.name}</div><div className="id-cell">{j.id} · {j.schedule}</div></> },
              { key: 'l', label: 'Last run', render: (j) => <span className="small muted">{relative(j.lastRun)}</span> },
              { key: 'r', label: 'Records', className: 'num hide-md', render: (j) => j.records.toLocaleString() },
              { key: 'e', label: 'Errors', className: 'num', render: (j) => j.errors },
              { key: 's', label: 'Status', render: (j) => <Status s={j.status} /> },
            ]} />
        )}
        {tab === 'controls' && (
          <div className="stack gap-3">
            <DataTable rows={FIN_CONTROLS} rowKey={(c) => c.id} label="Financial controls"
              cols={[
                { key: 'n', label: 'Control', render: (c) => <><div className="primary-cell">{c.name}</div><div className="id-cell">{c.id}</div></> },
                { key: 'f', label: 'Frequency', render: (c) => <span className="small">{c.frequency}</span> },
                { key: 't', label: 'Last tested', render: (c) => <span className="small">{date(c.lastTested)}</span> },
                { key: 'r', label: 'Result', render: (c) => <Status s={c.result} /> },
              ]} />
            <div style={{ padding: '0 var(--s5) var(--s5)' }}>
              <RestrictedSection cat="financial" title="Control test workpapers" summary="Test results are visible. Detailed workings and sample selections are restricted to finance and audit.">
                <KV items={[['FC-07 sample', '25 suspense items > 30 days; 3 lacked documented follow-up'], ['FC-12 finding', 'Loan interest accrued at 5.5% vs contractual 6.0% on 14 policies'], ['Tolerance', '$500 or 0.01% of balance, whichever is lower']]} />
              </RestrictedSection>
            </div>
          </div>
        )}
        {tab === 'discrepancies' && (
          <DataTable rows={breaks} rowKey={(a) => a.id} empty="No open discrepancies" label="Discrepancies"
            cols={[
              { key: 'a', label: 'Discrepancy', render: (a) => <><div className="primary-cell">{a.name}</div><div className="id-cell">{a.id}</div></> },
              { key: 'v', label: 'Variance', className: 'num', render: (a) => money(a.pas - a.gl) },
              { key: 'o', label: 'Owner', render: (a) => <span className="small">{a.owner}</span> },
              { key: 's', label: 'Status', render: (a) => <Status s={a.status} /> },
              { key: 'x', label: '', className: 'num', render: (a) => <GatedButton module="finance-recon" level="create" onClick={() => store.createTask({ typeId: 'billing-recon', policyId: '—', priority: 'High', description: `Investigate variance of ${money(a.pas - a.gl)} on ${a.id} ${a.name}.`, assignToMe: true })}>Raise task</GatedButton> },
            ]} />
        )}
      </TabPanel>
    </ModulePage>
  );
}
