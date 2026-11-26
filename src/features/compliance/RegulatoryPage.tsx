import { useState } from 'react';
import { Paperclip, Send } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { EVIDENCE, GOV_NOTIFICATIONS, REG_REPORTS, SUBMISSIONS, type RegReport } from '../../data/compliance';
import { date } from '../../lib/format';
import { AccessNote, DataTable, GatedButton, KV, ModulePage, RestrictedSection, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'calendar' | 'submissions' | 'evidence' | 'notifications' | 'assessments';

export function RegulatoryPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('calendar');
  const [owner, setOwner] = useState('');
  const reports = REG_REPORTS.map((r) => ({ ...r, status: store.statusOf(r.id, r.status) as RegReport['status'] })).sort((a, b) => a.due.localeCompare(b.due));
  const rows = reports.filter((r) => !owner || r.owner === owner);
  const evidence = EVIDENCE.map((e) => ({ ...e, status: store.statusOf(e.id, e.status) }));
  const soon = reports.filter((r) => r.status !== 'Submitted' && new Date(r.due).getTime() - Date.now() < 30 * 86400000);

  return (
    <ModulePage
      module="regulatory"
      lead="Mandatory government notifications, regulatory reports, deadlines, evidence and submission history."
      kpis={[
        { label: 'Due in 30 days', value: soon.length, tone: 'warning', onClick: () => setTab('calendar') },
        { label: 'Overdue', value: reports.filter((r) => r.status === 'Overdue').length, tone: 'critical', onClick: () => setTab('calendar') },
        { label: 'Submitted YTD', value: SUBMISSIONS.length + reports.filter((r) => r.status === 'Submitted').length, tone: 'success', onClick: () => setTab('submissions') },
        { label: 'Evidence gaps', value: evidence.filter((e) => e.status === 'Missing').length, onClick: () => setTab('evidence') },
      ]}
      notice={<AccessNote module="regulatory" />}
    >
      <TabPanel<Tab> label="Regulatory sections" value={tab} onChange={setTab} tabs={[{ id: 'calendar', label: 'Reporting calendar' }, { id: 'submissions', label: 'Submission history' }, { id: 'evidence', label: 'Evidence' }, { id: 'notifications', label: 'Government notifications' }, { id: 'assessments', label: 'Regulatory assessments' }]}>
        {tab === 'calendar' && (
          <>
            <Toolbar count={`${rows.length} reports`} filters={[{ label: 'All functions', value: owner, onChange: setOwner, options: ['Compliance', 'Finance', 'Actuarial', 'Legal', 'Risk', 'Audit'] }]} />
            <DataTable rows={rows} rowKey={(r) => r.id} label="Reporting calendar" rowClass={(r) => (r.status === 'Overdue' ? 'is-overdue' : '')}
              cols={[
                { key: 'n', label: 'Report', render: (r) => <><div className="primary-cell">{r.name}</div><div className="id-cell">{r.id} · {r.regulator}</div></> },
                { key: 'j', label: 'Jurisdiction', className: 'hide-md', render: (r) => <span className="small">{r.jurisdiction}</span> },
                { key: 'f', label: 'Frequency', className: 'hide-md', render: (r) => <span className="small">{r.frequency}</span> },
                { key: 'd', label: 'Deadline', render: (r) => <span className="small strong">{date(r.due)}</span> },
                { key: 'o', label: 'Owner', render: (r) => <span className="small">{r.owner}</span> },
                { key: 's', label: 'Status', render: (r) => <Status s={r.status} /> },
                { key: 'x', label: '', className: 'num', render: (r) => r.status === 'Submitted' ? null : r.status === 'Ready for Review' ? <GatedButton module="regulatory" level="approve" onClick={() => store.setRecordStatus(r.id, 'Submitted', { target: `${r.name} · ${r.id}`, module: 'regulatory', message: 'Report approved and submitted (simulated)' })}><Send size={13} />Approve & submit</GatedButton> : <GatedButton module="regulatory" level="edit" onClick={() => store.setRecordStatus(r.id, 'Ready for Review', { target: `${r.name} · ${r.id}`, module: 'regulatory', message: 'Report marked ready for review' })}>Mark ready</GatedButton> },
            ]} />
          </>
        )}
        {tab === 'submissions' && (
          <DataTable rows={[...reports.filter((r) => r.status === 'Submitted').map((r) => ({ id: r.id, report: r.name, submitted: new Date().toISOString().slice(0, 10), by: r.owner, ref: 'ACK-pending' })), ...SUBMISSIONS]} rowKey={(s) => s.id} label="Submission history"
            cols={[
              { key: 'r', label: 'Report', render: (s) => <><div className="primary-cell">{s.report}</div><div className="id-cell">{s.id}</div></> },
              { key: 'd', label: 'Submitted', render: (s) => <span className="small">{date(s.submitted)}</span> },
              { key: 'b', label: 'Function', render: (s) => <span className="small">{s.by}</span> },
              { key: 'a', label: 'Acknowledgement', render: (s) => <span className="mono small">{s.ref}</span> },
            ]} />
        )}
        {tab === 'evidence' && (
          <DataTable rows={evidence} rowKey={(e) => e.id} label="Reporting evidence"
            cols={[
              { key: 'i', label: 'Evidence', render: (e) => <><div className="primary-cell">{e.item}</div><div className="id-cell">{e.id} · for {e.report}</div></> },
              { key: 's', label: 'Status', render: (e) => <Status s={e.status === 'Missing' ? 'Missing — outstanding' : 'Attached — complete'} /> },
              { key: 'x', label: '', className: 'num', render: (e) => e.status === 'Missing' ? <GatedButton module="regulatory" level="edit" onClick={() => store.setRecordStatus(e.id, 'Attached', { target: `Evidence ${e.id}`, module: 'regulatory', message: 'Evidence attached (synthetic)' })}><Paperclip size={13} />Attach</GatedButton> : null },
            ]} />
        )}
        {tab === 'notifications' && (
          <DataTable rows={GOV_NOTIFICATIONS} rowKey={(n) => n.id} label="Government notifications"
            cols={[
              { key: 'n', label: 'Notification', render: (n) => <><div className="primary-cell">{n.notice}</div><div className="id-cell">{n.id} · {n.regulator}</div></> },
              { key: 'd', label: 'Due', render: (n) => <span className="small">{date(n.due)}</span> },
              { key: 's', label: 'Status', render: (n) => <Status s={n.status} /> },
            ]} />
        )}
        {tab === 'assessments' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="regulatory" title="Regulatory assessments and examination findings" summary="Assessments are restricted to Compliance, Legal, Finance, Actuarial, Risk and Audit.">
              <KV items={[['Market conduct exam (NY)', '2 findings: replacement form timeliness; complaint logging — remediation due Q1'], ['Financial exam (CT)', 'No material findings; 1 recommendation on reserve documentation'], ['Internal assessment', 'Unclaimed property process rated "Needs improvement"']]} />
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
    </ModulePage>
  );
}
