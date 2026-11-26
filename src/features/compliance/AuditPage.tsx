import { Download, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/AppStore';
import { CONTROL_RECORDS } from '../../data/compliance';
import { GL_ACCOUNTS } from '../../data/finance';
import { moduleById, type ModuleId } from '../../config/modules';
import { userById } from '../../data/users';
import { dateTime, money, relative } from '../../lib/format';
import { Notice } from '../../components/ui';
import { DataTable, ModulePage, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'trail' | 'sensitive' | 'approvals' | 'controls' | 'reconciliation' | 'access';

/** Scoped, read-only audit access. No actions change data here. */
export function AuditPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('trail');
  const activity = store.state.activity;
  const sensitive = activity.filter((a) => /restricted|permission|access|data access|approved|rejected|capabilit|ceiling/i.test(a.action));
  const approvals = store.state.tasks.flatMap((t) => t.history.filter((h) => /^(Approved|Rejected)/.test(h.text)).map((h) => ({ id: `${t.id}-${h.at}`, task: t, ...h })));
  const exportEvidence = () => { store.logActivity('Exported audit evidence', tab, '/compliance/audit', 'audit'); store.toast('Evidence pack exported (synthetic)', 'info'); };

  return (
    <ModulePage
      module="audit"
      lead="Read-only audit trails, approval records and control evidence. Access is scoped to your profile and group."
      actions={<button className="btn btn-secondary" onClick={exportEvidence}><Download size={15} />Export evidence</button>}
      kpis={[
        { label: 'Audit events', value: activity.length, onClick: () => setTab('trail') },
        { label: 'Sensitive actions', value: sensitive.length, onClick: () => setTab('sensitive') },
        { label: 'Approval records', value: approvals.length, onClick: () => setTab('approvals') },
        { label: 'Control exceptions', value: CONTROL_RECORDS.filter((c) => c.status !== 'Effective').length, tone: 'warning', onClick: () => setTab('controls') },
      ]}
      notice={<Notice><span className="row" style={{ gap: 6 }}><Lock size={13} />Read-only. Audit records cannot be changed from this screen.</span></Notice>}
    >
      <TabPanel<Tab> label="Audit sections" value={tab} onChange={setTab} tabs={[{ id: 'trail', label: 'Audit trail' }, { id: 'sensitive', label: 'Sensitive actions' }, { id: 'approvals', label: 'Approval records' }, { id: 'controls', label: 'Control evidence' }, { id: 'reconciliation', label: 'Reconciliation evidence' }, { id: 'access', label: 'Access activity' }]}>
        {(tab === 'trail' || tab === 'sensitive') && (
          <DataTable rows={tab === 'trail' ? activity : sensitive} rowKey={(a) => a.id} label="Audit trail"
            cols={[
              { key: 'w', label: 'When', render: (a) => <span className="small nowrap" title={dateTime(a.at)}>{relative(a.at)}</span> },
              { key: 'u', label: 'User', render: (a) => <span className="small">{userById(a.actorId)?.name ?? 'System'}</span> },
              { key: 'a', label: 'Action', render: (a) => <span className="small"><span className="muted">{a.action}</span> {a.link ? <Link to={a.link} className="strong">{a.target}</Link> : <span className="strong">{a.target}</span>}</span> },
              { key: 'm', label: 'Business area', className: 'hide-md', render: (a) => <span className="small muted">{a.module ? moduleById(a.module as ModuleId).name : '—'}</span> },
            ]} />
        )}
        {tab === 'approvals' && (
          <DataTable rows={approvals} rowKey={(a) => a.id} empty="No approval decisions recorded yet" label="Approval records"
            cols={[
              { key: 't', label: 'Decision', render: (a) => <><div className="primary-cell">{a.text}</div><div className="id-cell">{a.task.title} · {a.task.id}</div></> },
              { key: 'u', label: 'Approver', render: (a) => <span className="small">{userById(a.actorId)?.name}</span> },
              { key: 's', label: 'Submitted by', className: 'hide-md', render: (a) => <span className="small">{userById(a.task.submittedBy)?.name ?? '—'}</span> },
              { key: 'w', label: 'When', render: (a) => <span className="small">{dateTime(a.at)}</span> },
            ]} />
        )}
        {tab === 'controls' && (
          <DataTable rows={CONTROL_RECORDS} rowKey={(c) => c.id} label="Control evidence"
            cols={[
              { key: 'c', label: 'Control', render: (c) => <><div className="primary-cell">{c.control}</div><div className="id-cell">{c.id} · {c.type}</div></> },
              { key: 'e', label: 'Evidence', render: (c) => <span className="small">{c.evidence}</span> },
              { key: 'p', label: 'Period', className: 'hide-md', render: (c) => <span className="small">{c.period}</span> },
              { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
            ]} />
        )}
        {tab === 'reconciliation' && (
          <DataTable rows={GL_ACCOUNTS.map((a) => ({ ...a, status: store.statusOf(a.id, a.status) }))} rowKey={(a) => a.id} label="Reconciliation evidence"
            cols={[
              { key: 'a', label: 'Account', render: (a) => <><div className="primary-cell">{a.name}</div><div className="id-cell">{a.id}</div></> },
              { key: 'v', label: 'Variance', className: 'num', render: (a) => money(a.pas - a.gl) },
              { key: 's', label: 'Status', render: (a) => <Status s={a.status} /> },
              { key: 'o', label: 'Owner', className: 'hide-md', render: (a) => <span className="small">{a.owner}</span> },
            ]} />
        )}
        {tab === 'access' && (
          <DataTable rows={store.state.access} rowKey={(r) => r.id} label="Access activity"
            cols={[
              { key: 'r', label: 'Access request', render: (r) => <><div className="primary-cell">{r.userName}</div><div className="id-cell">{r.id} · {r.requested}</div></> },
              { key: 'j', label: 'Justification', className: 'hide-md', render: (r) => <span className="small muted">{r.justification}</span> },
              { key: 'w', label: 'Raised', render: (r) => <span className="small">{relative(r.requestedAt)}</span> },
              { key: 's', label: 'Status', render: (r) => <Status s={r.status} /> },
            ]} />
        )}
      </TabPanel>
    </ModulePage>
  );
}
