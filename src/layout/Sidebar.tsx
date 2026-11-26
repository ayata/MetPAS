import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Lock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { DASHBOARD_ITEM, NAVIGATION, type NavItem } from '../config/navigation';
import { useStore } from '../store/AppStore';
import { isExternal } from '../store/access';

/**
 * Client logo slot. The official MetLife logo supplied by the user lives in public/brand/.
 * metlife-logo.png is a cleaned copy of brand/1.png (baked-in checkerboard removed).
 * If the file is missing, the neutral MetPAS mark is shown.
 */
const CLIENT_LOGO = '/brand/metlife-logo.png';

export function Logo() {
  const [clientLogo, setClientLogo] = useState(true);
  if (clientLogo) {
    return (
      <span className="client-logo">
        <img src={CLIENT_LOGO} alt="MetLife" onError={() => setClientLogo(false)} />
      </span>
    );
  }
  return (
    <span className="brand-mark" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3.5 4.5l5.5 9 5.5-9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14.6" cy="13.6" r="2" fill="var(--metlife-green)" />
      </svg>
    </span>
  );
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const h = () => setMatch(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, [query]);
  return match;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const store = useStore();
  const { pathname, search } = useLocation();
  /** Explicit open/closed choices; every group starts expanded so the full menu is visible. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const unread = store.myNotifications.some((n) => !n.read);
  // The rail is collapsed by the user's choice, or automatically on tablet widths.
  const autoRail = useMedia('(max-width: 1100px) and (min-width: 641px)');
  const collapsed = store.state.sidebarCollapsed || autoRail;

  const showTip = (label: string) => (e: React.MouseEvent | React.FocusEvent) => {
    if (!collapsed) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hideTip = () => setTip(null);

  /* The scrollbar is hidden, so fades and a "More" button show when menu entries sit above or below the visible area. */
  const navRef = useRef<HTMLElement>(null);
  const [overflow, setOverflow] = useState({ above: false, below: false });
  const measure = useCallback(() => {
    const n = navRef.current;
    if (!n) return;
    const above = n.scrollTop > 4;
    const below = n.scrollTop + n.clientHeight < n.scrollHeight - 4;
    setOverflow((o) => (o.above === above && o.below === below ? o : { above, below }));
  }, []);
  // Re-check after every render (groups opened/closed, rail toggled, persona changed) and on window resize.
  useEffect(() => { measure(); });
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const isActive = (item: NavItem) => (item.match ? item.match(pathname, search) : pathname.startsWith(item.to.split('?')[0]));

  /**
   * Internal staff see the full menu; entries outside their access are shown locked
   * (the route guard explains why). External users only see what they can use.
   */
  const internalUser = !isExternal(store.session.groupId);
  const allowed = (i: NavItem) => i.visible(store);
  const listed = (i: NavItem) => !i.hidden && (allowed(i) || (internalUser && i.id !== 'my-requests'));
  const groups = NAVIGATION.map((g) => ({ ...g, visibleItems: g.items.filter(listed) })).filter((g) => g.visibleItems.length);

  // Keep the group of the current page open when navigating into it.
  const activeGroup = groups.find((g) => g.visibleItems.some(isActive))?.id;
  useEffect(() => {
    if (activeGroup) setToggled((t) => (t[activeGroup] === false ? { ...t, [activeGroup]: true } : t));
  }, [activeGroup]);

  const renderItem = (item: NavItem, label = item.label, to = item.to, active = isActive(item), Icon = item.icon, locked = !allowed(item)) => (
    <Link
      key={item.id}
      to={to}
      className={`nav-item ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
      aria-disabled={locked || undefined}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      onClick={() => { hideTip(); onNavigate?.(); }}
      onMouseEnter={showTip(label)}
      onMouseLeave={hideTip}
      onFocus={showTip(label)}
      onBlur={hideTip}
      title={collapsed ? undefined : locked ? `${label} — not included in your access` : label}
    >
      <Icon size={18} strokeWidth={1.8} />
      <span className="nav-label">{label}</span>
      {item.id === 'notifications' && unread && <span className="nav-dot" aria-label="Unread notifications" />}
      {locked && !collapsed && <Lock className="nav-lock" size={12} aria-label="No access" />}
    </Link>
  );

  return (
    <aside className="sidebar" aria-label="Primary">
      <Link to="/" className="brand" onClick={onNavigate} onMouseEnter={showTip('Dashboard')} onMouseLeave={hideTip} aria-label="MetPAS — go to dashboard">
        <Logo />
        <span className="brand-name"><span className="brand-title">MetPAS</span><span className="brand-sub">powered by AYATA</span></span>
      </Link>
      <div className={`nav-wrap ${overflow.above ? 'fade-top' : ''} ${overflow.below ? 'fade-bottom' : ''}`}>
      <nav className="nav" ref={navRef} onScroll={() => { hideTip(); measure(); }}>
        <div className="nav-items nav-top">{renderItem(DASHBOARD_ITEM)}</div>
        {groups.map((group) => {
          const items = group.visibleItems;
          if (collapsed) {
            // Rail: My Work shows its items; every other business area collapses to one icon.
            if (group.id === 'work') return <div key={group.id} className="nav-items">{items.map((i) => renderItem(i))}</div>;
            const active = items.some(isActive);
            const first = items.find(allowed) ?? items[0];
            return (
              <div key={group.id} className="nav-items">
                {renderItem({ ...first, id: `area-${group.id}` }, group.label, first.to, active, group.icon, !items.some(allowed))}
              </div>
            );
          }
          const open = toggled[group.id] ?? true;
          return (
            <div key={group.id} className="nav-group">
              <button className="nav-group-btn" aria-expanded={open} onClick={() => setToggled((t) => ({ ...t, [group.id]: !open }))}>
                <span>{group.label}</span>
                <ChevronDown size={12} />
              </button>
              {open && <div className="nav-items">{items.map((i) => renderItem(i))}</div>}
            </div>
          );
        })}
      </nav>
      {overflow.below && (
        <button
          type="button"
          className="nav-more"
          onClick={() => navRef.current?.scrollBy({ top: navRef.current.clientHeight * 0.7, behavior: 'smooth' })}
          aria-label="Scroll menu to see more"
          title="More menu options below"
        >
          {!collapsed && <span>More</span>}
          <ChevronDown size={14} />
        </button>
      )}
      </div>
      {!autoRail && (
        <div className="sidebar-foot">
          <button
            className="collapse-btn"
            onClick={() => { hideTip(); store.toggleSidebar(); }}
            aria-label={store.state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onMouseEnter={showTip('Expand sidebar')}
            onMouseLeave={hideTip}
          >
            {store.state.sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>Collapse</span>
          </button>
        </div>
      )}
      {tip && collapsed && (
        <div className="nav-tip" role="tooltip" style={{ top: tip.top, left: tip.left }}>{tip.label}</div>
      )}
    </aside>
  );
}
