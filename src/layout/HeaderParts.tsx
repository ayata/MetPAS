import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, FileText, History, ListChecks, Search, Settings2, SlidersHorizontal, LogOut, User as UserIcon, Eye } from 'lucide-react';
import { GROUPS, groupById, type GroupId } from '../config/groups';
import { ROLES, roleById, type RoleId } from '../config/roles';
import { profileById, profilesForRole, type ProfileId } from '../config/profiles';
import { MODULE_CATALOG } from '../config/modules';
import { taskModule } from '../data/tasks';
import { POLICIES } from '../data/policies';
import { DEMO_PERSONAS } from '../data/users';
import { relative } from '../lib/format';
import { useStore } from '../store/AppStore';
import { Avatar, Empty, Modal, useDismiss } from '../components/ui';

/* ---------------- Global search ---------------- */
export function GlobalSearch() {
  const store = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  const results = useMemo((): { key: string; kind: string; title: string; meta: string; to: string }[] => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const canPolicy = store.can('policy-master', 'view');
    const pols = canPolicy
      ? POLICIES.filter((p) => (!store.scope || store.scope.includes(p.id)) && (p.id.toLowerCase().includes(term) || p.owner.name.toLowerCase().includes(term) || p.owner.id.toLowerCase().includes(term))).slice(0, 5)
      : [];
    const tasks = store.visibleTasks.filter((t) => t.id.toLowerCase().includes(term) || t.title.toLowerCase().includes(term)).slice(0, 5);
    return [
      ...pols.map((p) => ({ key: p.id, kind: 'Policy', title: `${p.id} · ${p.owner.name}`, meta: `${p.product} · ${p.status}`, to: `/policies/${p.id}` })),
      ...tasks.map((t) => ({ key: t.id, kind: 'Task', title: t.title, meta: `${t.id} · ${taskModule(t).name}`, to: `?task=${t.id}` })),
      ...MODULE_CATALOG.filter((m) => m.id !== 'work' && store.can(m.id, 'view') && m.name.toLowerCase().includes(term)).slice(0, 4).map((m) => ({ key: m.id, kind: 'Module', title: m.name, meta: m.description, to: m.path })),
    ];
  }, [q, store]);

  const go = (to: string) => {
    if (to.startsWith('?')) navigate({ search: to }, { replace: false });
    else navigate(to);
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter') {
      if (results[active]) go(results[active].to);
      else if (q.trim()) go(`/policies?q=${encodeURIComponent(q.trim())}`);
    }
  };

  // "/" focuses search from anywhere
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="search-wrap" ref={ref}>
      <div className="input-icon">
        <Search size={15} />
        <input
          ref={inputRef}
          className="input"
          placeholder="Search policies, customers, tasks"
          aria-label="Global search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={open && q.length >= 2}
          aria-controls="global-search-results"
        />
        {!q && <span className="kbd hide-md">/</span>}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="search-results" id="global-search-results" role="listbox">
          {results.length === 0 ? (
            <Empty compact title="No matches" text="Press Enter to open Policy Search." icon={<Search size={14} />} />
          ) : (
            results.map((r, i) => (
              <button key={r.key} role="option" aria-selected={i === active} className={`menu-item ${i === active ? 'focused' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(r.to)}>
                {r.kind === 'Policy' ? <FileText size={15} /> : <ListChecks size={15} />}
                <span className="grow">
                  <span className="row"><span className="strong ellipsis">{r.title}</span></span>
                  <span className="xs subtle">{r.meta}</span>
                </span>
                <span className="xs subtle">{r.kind}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Notifications ---------------- */
export function NotificationsMenu() {
  const store = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const items = store.myNotifications.slice(0, 5);
  const unread = store.myNotifications.filter((n) => !n.read);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="icon-btn" aria-label={`Notifications, ${unread.length} unread`} aria-expanded={open} onClick={() => setOpen((o) => !o)} data-tip={open ? undefined : 'Notifications'}>
        <Bell size={18} strokeWidth={1.8} />
        {unread.length > 0 && <span className="badge-dot" />}
      </button>
      {open && (
        <div className="popover" style={{ width: 360 }}>
          <div className="row between" style={{ padding: '12px 14px 8px' }}>
            <h3>Notifications</h3>
            {unread.length > 0 && (
              <button className="link-btn small" onClick={() => store.markAllRead(unread.map((n) => n.id))}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <Empty compact title="You're all caught up" />
          ) : (
            <div className="list">
              {items.map((n) => (
                <button
                  key={n.id}
                  className="list-row"
                  style={{ alignItems: 'flex-start', padding: '10px 14px' }}
                  onClick={() => { store.markRead(n.id); setOpen(false); if (n.link) navigate(n.link); }}
                >
                  <span className={`dot ${n.read ? '' : n.kind === 'alert' ? 'critical' : 'info'}`} style={{ marginTop: 7, opacity: n.read ? 0.3 : 1 }} />
                  <span className="grow">
                    <span className="title" style={{ display: 'block', fontWeight: n.read ? 500 : 600 }}>{n.title}</span>
                    <span className="meta" style={{ display: 'block' }}>{n.body}</span>
                  </span>
                  <span className="xs subtle nowrap">{relative(n.at)}</span>
                </button>
              ))}
            </div>
          )}
          <div className="panel-foot" style={{ justifyContent: 'center' }}>
            <Link to="/notifications" onClick={() => setOpen(false)} className="small strong">View all notifications</Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Demo role switcher ---------------- */
export function RoleSwitcher() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const { session } = store;

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="icon-btn"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Preview another role (currently ${roleById(session.role).name})`}
        title="Preview another role"
        onClick={() => setOpen((o) => !o)}
      >
        <Eye size={18} strokeWidth={1.8} />
      </button>
      {open && (
        <div className="popover switcher" role="dialog" aria-label="Demonstration role switcher">
          <div className="switcher-section">
            <div className="row between">
              <h3>Demonstration preview</h3>
              <span className="demo-pill"><i />Demo only</span>
            </div>
            <p className="xs subtle">Switch perspectives to preview each experience. This is not production sign-in or security.</p>
          </div>
          <div className="switcher-section">
            <span className="field-label">Role</span>
            <div className="seg" role="group" aria-label="Role">
              {ROLES.map((r) => (
                <button key={r.id} aria-pressed={session.role === r.id} onClick={() => store.setRole(r.id as RoleId)}>
                  {r.id === 'support' ? 'Support' : r.name}
                </button>
              ))}
            </div>
            <label className="field-label" htmlFor="switch-profile">Permission profile</label>
            <select id="switch-profile" className="select" value={session.profileId} onChange={(e) => store.setProfile(e.target.value as ProfileId)}>
              {profilesForRole(session.role).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <label className="field-label" htmlFor="switch-group">User group <span className="subtle">(independent of role)</span></label>
            <select id="switch-group" className="select" value={session.groupId} onChange={(e) => store.setGroup(e.target.value as GroupId)}>
              {GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{`Group ${g.number} — ${g.name}`}</option>
              ))}
            </select>
          </div>
          <div className="switcher-section" style={{ padding: '8px 0' }}>
            <div className="menu-section" style={{ paddingTop: 2 }}>Sample personas</div>
            {DEMO_PERSONAS.map((id) => {
              const u = store.state.users.find((x) => x.id === id)!;
              const active = session.userId === id && session.profileId === u.profileId && session.groupId === u.groupId;
              return (
                <button key={id} className={`menu-item ${active ? 'focused' : ''}`} onClick={() => { store.setPersona(id); setOpen(false); }}>
                  <Avatar name={u.name} size="sm" />
                  <span className="grow">
                    <span className="strong" style={{ display: 'block' }}>{u.name}</span>
                    <span className="xs subtle">{profileById(u.profileId).name} · {groupById(u.groupId).short}</span>
                  </span>
                  {active && <span className="chip blue">Active</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Profile ---------------- */
export function ProfileMenu({ onSettings }: { onSettings: () => void }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const { me, session } = store;
  const group = groupById(session.groupId);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button className="persona-btn" aria-expanded={open} aria-label={`Profile: ${me.name}, ${roleById(session.role).name}, ${group.name}`} onClick={() => setOpen((o) => !o)}>
        <Avatar name={me.name} />
        <span className="persona-meta">
          <span className="n">{me.name}</span>
          <span className="r">{roleById(session.role).name} · {group.short}</span>
        </span>
        <ChevronDown size={14} className="subtle" />
      </button>
      {open && (
        <div className="popover" style={{ width: 290 }}>
          <div className="row" style={{ padding: 14, gap: 12 }}>
            <Avatar name={me.name} size="lg" />
            <div className="grow">
              <div className="strong">{me.name}</div>
              <div className="xs subtle">{me.title}</div>
            </div>
          </div>
          <dl className="kv two" style={{ padding: '0 14px 14px', gap: 10 }}>
            <div><dt>Experience</dt><dd>{roleById(session.role).name}</dd></div>
            <div><dt>User group</dt><dd>Group {group.number}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}><dt>Permission profile</dt><dd>{profileById(session.profileId).name}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}><dt>Group name</dt><dd>{group.name}</dd></div>
          </dl>
          <div className="divider" />
          <div style={{ padding: '6px 0' }}>
            <Link to="/activity?actor=me" className="menu-item" onClick={() => setOpen(false)}><History size={15} />My activity</Link>
            <Link to="/admin/permissions?tab=preview" className="menu-item" onClick={() => setOpen(false)}><UserIcon size={15} />My effective access</Link>
            <button className="menu-item" onClick={() => { setOpen(false); onSettings(); }}><SlidersHorizontal size={15} />Settings</button>
          </div>
          <div className="divider" />
          <div style={{ padding: '6px 0' }}>
            <button className="menu-item" onClick={() => { setOpen(false); store.signOut(); }}><LogOut size={15} />Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Settings ---------------- */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Settings" desc="Preferences for this demonstration session." onClose={onClose} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <SettingsContent onReset={onClose} />
    </Modal>
  );
}

export function SettingsContent({ onReset }: { onReset?: () => void }) {
  const store = useStore();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="stack gap-3">
        <h3>Display</h3>
        <label className="check">
          <input type="checkbox" checked={store.state.sidebarCollapsed} onChange={store.toggleSidebar} />
          Compact sidebar (icons only)
        </label>
      </div>
      <hr className="divider" />
      <div className="stack gap-3">
        <h3>Demonstration data</h3>
        <p className="small muted">All data is synthetic. Changes you make (assignments, approvals, permissions) persist until the browser tab is closed.</p>
        {!confirm ? (
          <div><button className="btn btn-danger" onClick={() => setConfirm(true)}><Settings2 size={14} />Reset demonstration data</button></div>
        ) : (
          <div className="notice warning">
            <div className="stack">
              <span>This restores all tasks, approvals and permissions to their original state.</span>
              <div className="row">
                <button className="btn btn-danger-solid btn-sm" onClick={() => { store.resetDemo(); setConfirm(false); onReset?.(); }}>Reset now</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
