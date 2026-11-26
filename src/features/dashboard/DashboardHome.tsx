import { useStore } from '../../store/AppStore';
import { isExternal } from '../../store/access';
import { OperatorDashboard } from './OperatorDashboard';
import { ManagerDashboard } from './ManagerDashboard';
import { SupportDashboard } from './SupportDashboard';
import { ExternalDashboard } from './ExternalDashboard';

/** One entry point; the active role decides which dashboard renders. */
export function DashboardHome() {
  const { session } = useStore();
  if (isExternal(session.groupId)) return <ExternalDashboard />;
  if (session.role === 'manager') return <ManagerDashboard />;
  if (session.role === 'support') return <SupportDashboard />;
  return <OperatorDashboard />;
}
