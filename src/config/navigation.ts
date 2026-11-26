import { LayoutDashboard, ListChecks, Inbox, Users, AlertOctagon, Search, Bell, History, Settings, LifeBuoy, type LucideIcon } from 'lucide-react';
import type { Store } from '../store/AppStore';
import { isAgent, isExternal } from '../store/access';
import { AREAS, moduleById, type AreaId, type ModuleId } from './modules';

export interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Business module behind this entry (drives permissions). */
  module?: ModuleId;
  /** Visibility is driven by profile + group permissions — never by internal classification. */
  visible: (s: Store) => boolean;
  match?: (path: string, search: string) => boolean;
  /**
   * Routable and permission-guarded, but not listed in the sidebar.
   * Reached from inside a module, the header or the user menu instead.
   */
  hidden?: boolean;
}
export interface NavGroup {
  id: AreaId;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const internal = (s: Store) => !isExternal(s.session.groupId);
const viewable = (m: ModuleId) => (s: Store) => s.can(m, 'view');

/** Entry for a business module, using the catalog's name, icon and path. */
const mod = (id: ModuleId, extra?: Partial<NavItem>): NavItem => {
  const m = moduleById(id);
  return { id, label: m.name, to: m.path, icon: m.icon, module: id, visible: viewable(id), ...extra };
};

const area = (id: AreaId, items: NavItem[]): NavGroup => {
  const def = AREAS.find((a) => a.id === id)!;
  return { id, label: def.name, icon: def.icon, items };
};

/** Top-level entry above all groups. */
export const DASHBOARD_ITEM: NavItem = { id: 'dashboard', label: 'Dashboard', to: '/', icon: LayoutDashboard, visible: () => true, match: (p) => p === '/' };

export const NAVIGATION: NavGroup[] = [
  area('work', [
    { id: 'my-tasks', label: 'My Tasks', to: '/work?view=mine', icon: ListChecks, visible: (s) => internal(s) && s.can('work', 'view'), match: (p, q) => p === '/work' && q.includes('view=mine') },
    { id: 'my-requests', label: 'My Requests', to: '/work?view=requests', icon: ListChecks, visible: (s) => !internal(s), match: (p, q) => p === '/work' && q.includes('view=requests') },
    { id: 'queue', label: 'Work Queue', to: '/work?view=all', icon: Inbox, visible: (s) => internal(s) && s.can('work', 'view'), match: (p, q) => p.startsWith('/work') && !q.includes('view=mine') && !q.includes('view=team') && !q.includes('view=requests') },
    { id: 'team', label: 'Team Queue', to: '/work?view=team', icon: Users, visible: (s) => s.session.role === 'manager' && s.can('work', 'view'), match: (p, q) => p === '/work' && q.includes('view=team') },
    { id: 'exceptions', label: 'Exceptions', to: '/exceptions', icon: AlertOctagon, visible: (s) => internal(s) && s.can('work', 'view') },
  ]),
  area('policy', [
    // Policy search lives inside the Policy Master File (and the header search), not as its own entry.
    mod('policy-master', { match: (p) => p.startsWith('/policies') }),
    mod('policy-changes'),
    mod('riders'),
    { id: 'policy-search', label: 'Policy Search', to: '/policies', icon: Search, module: 'policy-master', visible: viewable('policy-master'), hidden: true },
  ]),
  area('claims', [mod('death-claims'), mod('withdrawals'), mod('benefit-calcs')]),
  area('financial', [
    mod('billing'),
    mod('finance-recon'),
    mod('reinsurance'),
    // Agents see their own commission records; policyholders do not.
    mod('commissions', { visible: (s) => s.can('commissions', 'view') && (internal(s) || isAgent(s.me)) }),
  ]),
  area('product', [mod('calc-engines'), mod('valuation'), mod('pricing'), mod('underwriting')]),
  area('customer', [mod('customer-service'), mod('statements'), mod('self-service')]),
  area('compliance', [mod('tax-compliance'), mod('regulatory'), mod('workflow'), mod('audit')]),
  area('technology', [mod('data-extracts'), mod('integrations'), mod('data-feeds'), mod('routing'), mod('monitoring')]),
  area('admin', [
    mod('access'),
    { id: 'notifications', label: 'Notifications', to: '/notifications', icon: Bell, visible: () => true },
    { id: 'settings', label: 'Settings', to: '/settings', icon: Settings, visible: () => true },
    // Reached from User & Access Management, the user menu and the header.
    mod('permissions', { hidden: true }),
    { id: 'activity', label: 'Activity History', to: '/activity', icon: History, visible: (s) => internal(s), hidden: true },
    { id: 'help', label: 'Help & Support', to: '/help', icon: LifeBuoy, visible: () => true, hidden: true },
  ]),
];

export const navItemById = (id: string) => [DASHBOARD_ITEM, ...NAVIGATION.flatMap((g) => g.items)].find((i) => i.id === id);
