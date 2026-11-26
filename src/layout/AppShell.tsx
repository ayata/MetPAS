import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, HelpCircle, Menu, Settings } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { Toasts } from '../components/ui';
import { Sidebar } from './Sidebar';
import { GlobalSearch, NotificationsMenu, ProfileMenu, RoleSwitcher, SettingsModal } from './HeaderParts';
import { TaskDrawer } from '../features/work/TaskDrawer';
import { NewRequestModal, type NewRequestPrefill } from '../features/work/NewRequestModal';

interface ShellApi {
  openNewRequest: (prefill?: NewRequestPrefill) => void;
}
const ShellCtx = createContext<ShellApi>({ openNewRequest: () => {} });
export const useShell = () => useContext(ShellCtx);

export function AppShell() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const [settings, setSettings] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newReq, setNewReq] = useState<NewRequestPrefill | null>(null);
  const taskId = params.get('task');

  useEffect(() => {
    window.scrollTo(0, 0);
    setMobileOpen(false);
  }, [pathname]);

  const closeTask = () => {
    const p = new URLSearchParams(params);
    p.delete('task');
    setParams(p, { replace: true });
  };

  return (
    <ShellCtx.Provider value={{ openNewRequest: (prefill) => setNewReq(prefill ?? {}) }}>
      <a href="#main" className="sr-only">Skip to content</a>
      <div className={`app ${store.state.sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <Sidebar onNavigate={() => setMobileOpen(false)} />
        <header className="header">
          <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen((o) => !o)}>
            <Menu size={18} />
          </button>
          <GlobalSearch />
          {store.state.platform && (
            <Link to="/select-system" className="platform-chip" title="Switch administration system">
              <strong>{store.state.platform}</strong>
              <ArrowLeftRight size={13} />
            </Link>
          )}
          <div className="header-actions">
            <NotificationsMenu />
            <Link to="/help" className="icon-btn" aria-label="Help and support" data-tip="Help">
              <HelpCircle size={18} strokeWidth={1.8} />
            </Link>
            <Link to="/settings" className="icon-btn" aria-label="Settings" data-tip="Settings">
              <Settings size={18} strokeWidth={1.8} />
            </Link>
            <span className="header-sep" />
            <RoleSwitcher />
            <span className="header-sep" />
            <ProfileMenu onSettings={() => setSettings(true)} />
          </div>
        </header>
        <main className="main" id="main">
          <Outlet />
        </main>
      </div>
      {taskId && <TaskDrawer taskId={taskId} onClose={closeTask} />}
      {newReq && <NewRequestModal prefill={newReq} onClose={() => setNewReq(null)} />}
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      <Toasts />
    </ShellCtx.Provider>
  );
}
