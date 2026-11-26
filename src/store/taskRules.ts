import { taskTypeById, type Task } from '../data/tasks';
import type { Store } from './AppStore';
import { isExternal } from './access';

/** Which workflow actions the current session may take on a task. All UI buttons read from this. */
export function taskActions(store: Store, t: Task) {
  const { session, can } = store;
  const me = session.userId;
  const type = taskTypeById(t.typeId);
  const external = isExternal(session.groupId);
  const edit = !external && can('work', 'edit', t.tier);
  const approveRight = can('work', 'approve', t.tier);
  const mine = t.assigneeId === me;
  const open = t.status !== 'Completed';

  return {
    claim: edit && open && !t.assigneeId && t.status !== 'Requires Approval',
    assign: edit && open && session.role === 'manager',
    release: edit && mine && (t.status === 'Pending' || t.status === 'In Progress'),
    start: edit && mine && (t.status === 'Pending' || t.status === 'Rejected'),
    submit: edit && mine && t.status === 'In Progress' && type.requiresApproval,
    complete: edit && mine && t.status === 'In Progress' && !type.requiresApproval,
    approve: approveRight && t.status === 'Requires Approval' && t.submittedBy !== me,
    /** Segregation of duties: you can never approve your own submission */
    selfApprovalBlocked: approveRight && t.status === 'Requires Approval' && t.submittedBy === me,
    note: edit && open,
    escalate: edit && open && session.role === 'manager' && !t.escalated,
    requiresApproval: type.requiresApproval,
    readOnlyReason: external
      ? 'External users can track requests but not process them.'
      : !can('work', 'edit', t.tier)
        ? 'Your profile allows viewing this work only.'
        : null,
  };
}
