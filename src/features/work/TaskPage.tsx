import { Link, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { canSeeTask } from '../../store/access';
import { policyById } from '../../data/policies';
import { money } from '../../lib/format';
import { Empty, Panel } from '../../components/ui';
import { TaskActionBar, TaskDocuments, TaskFacts, TaskHeader, TaskHistory } from './TaskDetail';

export function TaskPage() {
  const { id } = useParams();
  const store = useStore();
  const task = store.state.tasks.find((t) => t.id === id);

  if (!task || !canSeeTask(store.session, task, store.scope)) {
    return (
      <div className="page">
        <Panel><Empty title={task ? 'Not authorized' : 'Task not found'} text={task ? 'Your current role and group do not include access to this task.' : `No task matches ${id}.`} action={<Link to="/work" className="btn btn-secondary">Back to Work Queue</Link>} /></Panel>
      </div>
    );
  }
  const policy = policyById(task.policyId);
  const showPolicy = store.can('policy-master', 'view') && (!store.scope || store.scope.includes(task.policyId));

  return (
    <div className="page">
      <div>
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/work?view=all">Work Queue</Link><ChevronRight size={12} /><span>{task.id}</span>
        </nav>
        <div className="page-head">
          <TaskHeader task={task} />
        </div>
      </div>
      <Panel>
        <div style={{ paddingTop: 'var(--s5)' }} className="stack gap-3">
          <TaskActionBar task={task} />
        </div>
      </Panel>
      <div className="dash-grid">
        <div className="stack gap-5">
          <Panel title="Task details">
            <TaskFacts task={task} />
          </Panel>
          <Panel title="Description">
            <p className="muted">{task.description}</p>
          </Panel>
          <Panel title="Activity history">
            <TaskHistory task={task} />
          </Panel>
        </div>
        <div className="side-stack">
          <Panel title="Documents">
            <TaskDocuments task={task} />
          </Panel>
          {policy && showPolicy && (
            <Panel title="Related policy" actions={<Link to={`/policies/${policy.id}`} className="small strong">Open</Link>}>
              <dl className="kv two">
                <div><dt>Policy</dt><dd>{policy.id}</dd></div>
                <div><dt>Status</dt><dd>{policy.status}</dd></div>
                <div><dt>Product</dt><dd>{policy.product}</dd></div>
                <div><dt>Face amount</dt><dd>{money(policy.faceAmount)}</dd></div>
              </dl>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
