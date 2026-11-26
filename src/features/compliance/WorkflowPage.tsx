import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { teamGroups } from '../../store/access';
import { taskActions } from '../../store/taskRules';
import { ROUTING_CONFIG, WORKFLOWS } from '../../data/compliance';
import { taskModule } from '../../data/tasks';
import { userById } from '../../data/users';
import { byUrgency, isOverdue } from '../../lib/format';
import { Sla, TaskStatus } from '../../components/ui';
import { BarList, DataTable, GatedButton, ModulePage, RestrictedSection, Status, TabPanel, useTabParam } from '../../components/module';
import { PriorityTag } from '../dashboard/PriorityWork';
import { useOpenTask } from '../work/TaskDetail';

type Tab = 'approvals' | 'mine' | 'workflows' | 'workload' | 'configuration';

export function WorkflowPage() {
  const store = useStore();
  const navigate = useNavigate();
  const openTask = useOpenTask();
  const manager = store.session.role === 'manager';
  const [tab, setTab] = useTabParam<Tab>(manager ? 'approvals' : 'mine');
  const open = store.visibleTasks.filter((t) => t.status !== 'Completed');
  const approvals = open.filter((t) => t.status === 'Requires Approval').sort(byUrgency);
  const mine = open.filter((t) => t.assigneeId === store.session.userId).sort(byUrgency);
  const team = open.filter((t) => teamGroups(store.session).includes(t.groupId));
  const people = store.state.users.filter((u) => team.some((t) => t.assigneeId === u.id)).map((u) => ({ label: u.name, value: team.filter((t) => t.assigneeId === u.id).length, tone: team.some((t) => t.assigneeId === u.id && isOverdue(t)) ? 'warn' as const : undefined })).sort((a, b) => b.value - a.value).slice(0, 8);
  const canConfigure = store.can('workflow', 'configure');

  return (
    <ModulePage
      module="workflow"
      lead="Transaction workflows and stages, task routing, approvals, escalations and workflow performance."
      kpis={[
        { label: 'Active workflows', value: WORKFLOWS.reduce((a, w) => a + w.active, 0), onClick: () => setTab('workflows') },
        { label: 'Awaiting approval', value: approvals.length, tone: 'warning', onClick: () => setTab('approvals') },
        { label: 'Escalated', value: open.filter((t) => t.escalated).length, tone: 'critical', onClick: () => navigate('/work?view=all') },
        { label: 'Overdue', value: open.filter(isOverdue).length, onClick: () => navigate('/work?view=overdue') },
      ]}
    >
      <TabPanel<Tab> label="Workflow sections" value={tab} onChange={setTab} tabs={[{ id: 'approvals', label: 'Approvals', count: approvals.length }, { id: 'mine', label: 'My workflow status', count: mine.length }, { id: 'workflows', label: 'Workflows & stages' }, ...(manager ? [{ id: 'workload' as Tab, label: 'Workload & escalation' }] : []), { id: 'configuration', label: 'Routing configuration' }]}>
        {(tab === 'approvals' || tab === 'mine') && (
          <DataTable rows={tab === 'approvals' ? approvals : mine} rowKey={(t) => t.id} onRow={(t) => openTask(t.id)} empty={tab === 'approvals' ? 'No approvals waiting' : 'No open work'} label="Workflow tasks"
            cols={[
              { key: 't', label: 'Task', render: (t) => <><div className="primary-cell">{t.title}</div><div className="id-cell">{t.id} · {taskModule(t).name}</div></> },
              { key: 'p', label: 'Priority', render: (t) => <PriorityTag p={t.priority} /> },
              { key: 'sb', label: tab === 'approvals' ? 'Submitted by' : 'Assigned', className: 'hide-md', render: (t) => <span className="small">{userById(tab === 'approvals' ? t.submittedBy : t.assigneeId)?.name ?? '—'}</span> },
              { key: 'sla', label: 'SLA', render: (t) => <Sla task={t} /> },
              { key: 's', label: 'Status', render: (t) => <TaskStatus task={t} /> },
              { key: 'a', label: 'Permitted action', className: 'hide-md', render: (t) => { const a = taskActions(store, t); return <span className="small muted">{a.approve ? 'Approve / Reject' : a.selfApprovalBlocked ? 'Awaiting another approver' : a.submit ? 'Submit' : a.complete ? 'Complete' : a.start ? 'Start' : 'View'}</span>; } },
            ]} />
        )}
        {tab === 'workflows' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            {WORKFLOWS.map((w) => (
              <div key={w.id} className="case-card">
                <div className="row between wrap"><span className="strong">{w.name}</span><span className="small muted">{w.active} active · avg {w.avgCycle} · SLA {w.sla}%</span></div>
                <div className="steps">{w.stages.map((s, i) => <span key={s} className="step"><b>{i + 1}</b>{s}</span>)}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'workload' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-3"><h3>Open work by person</h3><BarList items={people} /></div>
            <div className="stack gap-3">
              <h3>Escalation candidates</h3>
              <div className="list" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                {team.filter((t) => isOverdue(t) && !t.escalated).slice(0, 6).map((t) => (
                  <div key={t.id} className="list-row">
                    <span className="grow"><span className="title" style={{ display: 'block' }}>{t.title}</span><span className="meta">{userById(t.assigneeId)?.name ?? 'Unassigned'} · <Sla task={t} /></span></span>
                    <GatedButton module="work" level="edit" onClick={() => store.escalateTask(t.id)}><ArrowUpRight size={13} />Escalate</GatedButton>
                  </div>
                ))}
              </div>
              <h3>Workflow performance</h3>
              <BarList max={100} items={WORKFLOWS.map((w) => ({ label: w.name, value: w.sla, tone: w.sla < 90 ? 'warn' : undefined }))} format={(n) => `${n}% SLA`} />
            </div>
          </div>
        )}
        {tab === 'configuration' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="config" title="Assignment and routing rules" summary="Routing outcomes are visible on each task. Configuration is restricted to authorized administrators.">
              <div className="stack gap-2">
                {ROUTING_CONFIG.map((r) => {
                  const on = store.statusOf(r.id, r.enabled ? 'Enabled' : 'Disabled') === 'Enabled';
                  return (
                    <div key={r.id} className="row between"><span className="small">{r.rule}</span>
                      <span className="row" style={{ gap: 8 }}><Status s={on ? 'Active' : 'Disabled'} />
                        <GatedButton module="workflow" level="configure" onClick={() => store.setRecordStatus(r.id, on ? 'Disabled' : 'Enabled', { target: `Routing rule ${r.id}`, module: 'workflow', message: `Rule ${on ? 'disabled' : 'enabled'}` })}>{on ? 'Disable' : 'Enable'}</GatedButton>
                      </span>
                    </div>
                  );
                })}
                {!canConfigure && <p className="xs subtle">Changing workflow configuration requires the Configure permission.</p>}
              </div>
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
    </ModulePage>
  );
}
