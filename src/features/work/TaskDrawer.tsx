import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { canSeeTask } from '../../store/access';
import { Drawer, Empty } from '../../components/ui';
import { TaskActionBar, TaskDocuments, TaskFacts, TaskHeader, TaskHistory } from './TaskDetail';

export function TaskDrawer({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const store = useStore();
  const task = store.state.tasks.find((t) => t.id === taskId);
  const allowed = task && canSeeTask(store.session, task, store.scope);

  if (!task || !allowed) {
    return (
      <Drawer label="Task" onClose={onClose} header={<h2>Task unavailable</h2>}>
        <Empty title={task ? 'Not authorized' : 'Task not found'} text={task ? 'Your current role and group do not include access to this task.' : `No task matches ${taskId}.`} />
      </Drawer>
    );
  }

  return (
    <Drawer
      label={`Task ${task.id}`}
      onClose={onClose}
      header={<TaskHeader task={task} />}
      footer={
        <div className="stack" style={{ width: '100%' }}>
          <TaskActionBar task={task} compact />
        </div>
      }
    >
      <TaskFacts task={task} />
      <section className="stack">
        <h3>Description</h3>
        <p className="muted" style={{ fontSize: 'var(--fs-md)' }}>{task.description}</p>
      </section>
      <section className="stack">
        <h3>Documents</h3>
        <TaskDocuments task={task} />
      </section>
      <section className="stack gap-3">
        <div className="row between">
          <h3>Activity</h3>
          <Link to={`/work/tasks/${task.id}`} className="small row" style={{ gap: 5 }}><Maximize2 size={13} />Open full page</Link>
        </div>
        <TaskHistory task={task} limit={5} />
      </section>
    </Drawer>
  );
}
