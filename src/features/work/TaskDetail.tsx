import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, Lock, Play, Send, ShieldCheck, ThumbsDown, ThumbsUp, UserPlus, Undo2, RotateCcw } from 'lucide-react';
import { taskModule, taskTypeById, type Task } from '../../data/tasks';
import { policyById } from '../../data/policies';
import { userById } from '../../data/users';
import { groupById } from '../../config/groups';
import { dateTime } from '../../lib/format';
import { useStore } from '../../store/AppStore';
import { taskActions } from '../../store/taskRules';
import { teamGroups } from '../../store/access';
import { Avatar, Modal, Notice, Sla, TaskStatus } from '../../components/ui';
import { PriorityTag } from '../dashboard/PriorityWork';

export function useOpenTask() {
  const [params, setParams] = useSearchParams();
  return (id: string) => {
    const p = new URLSearchParams(params);
    p.set('task', id);
    setParams(p);
  };
}

export function TaskFacts({ task }: { task: Task }) {
  const store = useStore();
  const policy = policyById(task.policyId);
  const type = taskTypeById(task.typeId);
  const assignee = userById(task.assigneeId);
  const external = !!store.scope;
  return (
    <dl className="kv two">
      <div><dt>Policy number</dt><dd>{store.can('policy-master', 'view') && (!store.scope || store.scope.includes(task.policyId)) ? <Link to={`/policies/${task.policyId}`}>{task.policyId}</Link> : task.policyId}</dd></div>
      <div><dt>Customer</dt><dd>{policy?.owner.name}<div className="xs subtle">{external ? policy?.product : `${policy?.owner.id} · ${policy?.product}`}</div></dd></div>
      <div><dt>Business area</dt><dd>{store.can(type.module, 'view') ? <Link to={taskModule(task).path}>{taskModule(task).name}</Link> : taskModule(task).name}</dd></div>
      <div><dt>Task type</dt><dd>{type.category}</dd></div>
      <div><dt>Priority</dt><dd><PriorityTag p={task.priority} /></dd></div>
      <div><dt>SLA</dt><dd><Sla task={task} /><div className="xs subtle">Due {dateTime(task.dueAt)} · {type.slaHours}h target</div></dd></div>
      <div><dt>Assigned user</dt><dd>{assignee ? <span className="row"><Avatar name={assignee.name} size="sm" />{assignee.name}</span> : <span className="subtle">Unassigned</span>}</dd></div>
      <div><dt>Current status</dt><dd><TaskStatus task={task} /></dd></div>
      <div><dt>Queue</dt><dd>{groupById(task.groupId).short}</dd></div>
      <div><dt>Approval</dt><dd>{type.requiresApproval ? 'Required before completion' : 'Not required'}</dd></div>
    </dl>
  );
}

export function TaskDocuments({ task }: { task: Task }) {
  const { toast } = useStore();
  if (!task.documents.length) return <p className="small subtle">No documents attached.</p>;
  return (
    <div className="stack gap-1">
      {task.documents.map((d) => (
        <button key={d} className="list-row" style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 12px' }} onClick={() => toast(`Opened ${d} (synthetic preview)`, 'info')}>
          <FileText size={15} className="subtle" />
          <span className="grow ellipsis">{d}</span>
          <span className="xs subtle">View</span>
        </button>
      ))}
    </div>
  );
}

export function TaskHistory({ task, limit }: { task: Task; limit?: number }) {
  const events = [...task.history].reverse().slice(0, limit ?? 99);
  return (
    <div className="timeline">
      {events.map((e, i) => (
        <div key={i} className="tl-item">
          <span className="tl-dot" />
          <div>
            <div className="tl-text">{e.text}</div>
            <div className="tl-meta">{e.actorId === 'system' ? 'System' : userById(e.actorId)?.name ?? e.actorId} · {dateTime(e.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Permission-aware workflow actions. */
export function TaskActionBar({ task, compact }: { task: Task; compact?: boolean }) {
  const store = useStore();
  const a = taskActions(store, task);
  const [modal, setModal] = useState<null | 'assign' | 'approve' | 'reject' | 'note'>(null);
  const [text, setText] = useState('');
  const [assignee, setAssignee] = useState(task.assigneeId ?? '');
  const [error, setError] = useState('');

  const groups = teamGroups(store.session);
  const candidates = store.state.users.filter((u) => u.status === 'Active' && (u.groupId === task.groupId || groups.includes(u.groupId)) && u.groupId !== 'G6');

  const close = () => { setModal(null); setText(''); setError(''); };
  const sm = compact ? 'btn-sm' : '';

  const buttons = [
    a.approve && <button key="ap" className={`btn btn-primary ${sm}`} onClick={() => setModal('approve')}><ThumbsUp size={14} />Approve</button>,
    a.approve && <button key="rj" className={`btn btn-danger ${sm}`} onClick={() => setModal('reject')}><ThumbsDown size={14} />Reject</button>,
    a.start && <button key="st" className={`btn btn-primary ${sm}`} onClick={() => store.setTaskStatus(task.id, 'In Progress')}>{task.status === 'Rejected' ? <RotateCcw size={14} /> : <Play size={14} />}{task.status === 'Rejected' ? 'Start rework' : 'Start work'}</button>,
    a.submit && <button key="sb" className={`btn btn-primary ${sm}`} onClick={() => store.setTaskStatus(task.id, 'Requires Approval')}><Send size={14} />Submit for approval</button>,
    a.complete && <button key="cp" className={`btn btn-primary ${sm}`} onClick={() => store.setTaskStatus(task.id, 'Completed')}><CheckCircle2 size={14} />Mark complete</button>,
    a.claim && <button key="cl" className={`btn ${a.start || a.approve ? 'btn-secondary' : 'btn-primary'} ${sm}`} onClick={() => store.assignTask(task.id, store.session.userId)}><UserPlus size={14} />Assign to me</button>,
    a.assign && <button key="as" className={`btn btn-secondary ${sm}`} onClick={() => setModal('assign')}><UserPlus size={14} />{task.assigneeId ? 'Reassign' : 'Assign'}</button>,
    a.release && <button key="rl" className={`btn btn-ghost ${sm}`} onClick={() => store.assignTask(task.id, null)}><Undo2 size={14} />Return to queue</button>,
    a.escalate && <button key="es" className={`btn btn-ghost ${sm}`} onClick={() => store.escalateTask(task.id)}>Escalate</button>,
    a.note && <button key="nt" className={`btn btn-ghost ${sm}`} onClick={() => setModal('note')}>Add note</button>,
  ].filter(Boolean);

  return (
    <>
      {a.selfApprovalBlocked && (
        <Notice>You submitted this task, so another authorized approver must review it (segregation of duties).</Notice>
      )}
      {task.status === 'Requires Approval' && !a.approve && !a.selfApprovalBlocked && !store.scope && (
        <div className="row small muted"><ShieldCheck size={14} />Awaiting approval from a user with approval authority for {taskModule(task).name}.</div>
      )}
      {buttons.length > 0 ? (
        <div className="row wrap">{buttons}</div>
      ) : (
        <div className="row small muted"><Lock size={14} />{a.readOnlyReason ?? (task.status === 'Completed' ? 'This task is complete.' : task.assigneeId && task.assigneeId !== store.session.userId ? `Assigned to ${userById(task.assigneeId)?.name}. You have view access.` : 'No actions available for your access.')}</div>
      )}

      {modal === 'assign' && (
        <Modal title="Assign task" desc={`${task.title} · ${task.id}`} onClose={close}
          footer={<><button className="btn btn-secondary" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={!assignee || assignee === task.assigneeId} onClick={() => { store.assignTask(task.id, assignee); close(); }}>Assign</button></>}>
          <div className="field">
            <label htmlFor="assignee">Assign to</label>
            <select id="assignee" className="select" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Select a team member</option>
              {candidates.map((u) => {
                const load = store.state.tasks.filter((t) => t.assigneeId === u.id && t.status !== 'Completed').length;
                return <option key={u.id} value={u.id}>{u.name} — {u.title} ({load} open)</option>;
              })}
            </select>
            <span className="hint">Open task counts help balance workload.</span>
          </div>
        </Modal>
      )}
      {modal === 'approve' && (
        <Modal title="Approve task" desc={`${task.title} · ${task.id}`} onClose={close}
          footer={<><button className="btn btn-secondary" onClick={close}>Cancel</button><button className="btn btn-primary" onClick={() => { store.decideTask(task.id, true, text.trim()); close(); }}><ThumbsUp size={14} />Approve</button></>}>
          <Notice>Approving completes the task and records your decision as audit evidence.</Notice>
          <div className="field">
            <label htmlFor="ap-note">Comment <span className="subtle">(optional)</span></label>
            <textarea id="ap-note" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Verified signature and beneficiary allocation" />
          </div>
        </Modal>
      )}
      {modal === 'reject' && (
        <Modal title="Reject task" desc={`${task.title} · ${task.id}`} onClose={close}
          footer={<><button className="btn btn-secondary" onClick={close}>Cancel</button><button className="btn btn-danger-solid btn" onClick={() => { if (!text.trim()) { setError('Please provide a reason so the assignee can correct the work.'); return; } store.decideTask(task.id, false, text.trim()); close(); }}><ThumbsDown size={14} />Reject</button></>}>
          <div className="field">
            <label htmlFor="rj-note">Reason for rejection</label>
            <textarea id="rj-note" className={`textarea ${error ? 'invalid' : ''}`} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} placeholder="Explain what needs to be corrected" aria-invalid={!!error} aria-describedby={error ? 'rj-err' : undefined} />
            {error && <span className="error" id="rj-err">{error}</span>}
          </div>
        </Modal>
      )}
      {modal === 'note' && (
        <Modal title="Add note" desc={`${task.title} · ${task.id}`} onClose={close}
          footer={<><button className="btn btn-secondary" onClick={close}>Cancel</button><button className="btn btn-primary" disabled={!text.trim()} onClick={() => { store.addNote(task.id, text.trim()); close(); }}>Add note</button></>}>
          <div className="field">
            <label htmlFor="note">Note</label>
            <textarea id="note" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Visible in the task's activity history" />
          </div>
        </Modal>
      )}
    </>
  );
}

export function TaskHeader({ task }: { task: Task }) {
  return (
    <div className="stack gap-1">
      <div className="row xs subtle mono">{task.id} · {taskModule(task).name}</div>
      <h2 style={{ fontSize: 18 }}>{task.title}</h2>
    </div>
  );
}
