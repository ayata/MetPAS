import { Link } from 'react-router-dom';
import { ChevronRight, Clock, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useStore } from '../store/AppStore';
import { isExternal } from '../store/access';
import { NAVIGATION, navItemById } from '../config/navigation';
import { moduleById } from '../config/modules';
import { groupById } from '../config/groups';
import { profileById } from '../config/profiles';
import { Panel } from './ui';

/**
 * Shown when a user opens a page outside their access. Names the page, explains which part of
 * their access blocks it, says who can grant it and lets them raise an access request.
 */
export function NoAccess({ nav }: { nav: string }) {
  const store = useStore();
  const { session, me, state } = store;
  const item = navItemById(nav);
  const label = item?.label ?? 'This page';
  const area = NAVIGATION.find((g) => g.items.some((i) => i.id === nav))?.label;
  const mod = item?.module ? moduleById(item.module) : undefined;
  const profile = profileById(session.profileId);
  const group = groupById(session.groupId);
  const external = isExternal(session.groupId);

  // Work out which part of the user's access blocks this page.
  let reason: string;
  let needed: string;
  if (external) {
    reason = `${label} is used by MetLife staff and is not part of the external digital channel.`;
    needed = 'Internal staff access';
  } else if (nav === 'team') {
    reason = `Team Queue is part of the Manager experience. Your permission profile, ${profile.name}, uses the ${profile.role === 'support' ? 'Support / Service' : 'Operator'} experience.`;
    needed = 'Manager / Supervisor profile';
  } else if (mod && !state.profileCaps[session.profileId]?.includes('view')) {
    reason = `Your permission profile, ${profile.name}, does not include View access.`;
    needed = `View access to ${mod.name}`;
  } else if (mod) {
    reason = `Your user group, ${group.name}, is not granted ${mod.name}.`;
    needed = `View access to ${mod.name} for ${group.short}`;
  } else {
    reason = 'Your permission profile and user group do not include this business area.';
    needed = `Access to ${label}`;
  }

  const requested = `${label} — View`;
  const pending = state.access.find((r) => r.userName === me.name && r.requested === requested && r.status === 'Pending');
  const admins = state.users.filter((u) => u.profileId === 'superuser' && u.status === 'Active' && u.id !== me.id).map((u) => u.name);
  const canConfigure = store.can('permissions', 'configure');

  return (
    <div className="page">
      <div className="page-head">
        <div>
          {area && <nav className="crumbs" aria-label="Breadcrumb"><span>{area}</span><ChevronRight size={12} /><span>{label}</span></nav>}
          <h1>{label}</h1>
          {mod && <p className="lead">{mod.description}</p>}
        </div>
      </div>

      <Panel>
        <div className="noaccess">
          <div className="noaccess-icon"><Lock size={22} /></div>
          <div className="noaccess-body">
            <h2>You don't have access to {label}</h2>
            <p className="noaccess-reason">{reason}</p>

            <dl className="noaccess-facts">
              <div><dt>Your permission profile</dt><dd>{profile.name}</dd></div>
              <div><dt>Your user group</dt><dd>{group.name}</dd></div>
              <div><dt>Access needed</dt><dd>{needed}</dd></div>
              <div>
                <dt>Who can grant it</dt>
                <dd>{external ? 'Your MetLife servicing team' : `Access administrators${admins.length ? ` (${admins.join(', ')})` : ''}`}</dd>
              </div>
            </dl>

            <div className="row wrap noaccess-actions">
              {canConfigure ? (
                <Link to="/admin/permissions?tab=modules" className="btn btn-primary"><ShieldCheck size={15} />Open Role & Permissions</Link>
              ) : pending ? (
                <span className="chip blue noaccess-pending"><Clock size={13} />Request {pending.id} is awaiting review</span>
              ) : !external ? (
                <button className="btn btn-primary" onClick={() => store.requestAccess(requested, `Requested from the ${label} page.`)}>
                  <KeyRound size={15} />Request access
                </button>
              ) : null}
              <Link to="/" className="btn btn-secondary">Go to dashboard</Link>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
