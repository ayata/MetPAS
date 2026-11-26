import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, ShieldCheck } from 'lucide-react';
import { GROUPS, groupById, type GroupId } from '../../config/groups';
import { roleById } from '../../config/roles';
import { PROFILES, profileById, type ProfileId } from '../../config/profiles';
import { useStore } from '../../store/AppStore';
import type { User } from '../../data/users';
import { relative } from '../../lib/format';
import { Avatar, Drawer, Empty, Notice, StateChip, Tabs } from '../../components/ui';

type Tab = 'users' | 'requests';

export function AccessManagementPage() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'users';
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const admin = store.can('access', 'admin');
  const approver = store.can('access', 'approve');

  const users = store.state.users.filter(
    (u) => (!q || u.name.toLowerCase().includes(q.toLowerCase()) || u.title.toLowerCase().includes(q.toLowerCase())) && (!group || u.groupId === group) && (!role || u.profileId === role),
  );
  const pending = store.state.access.filter((a) => a.status === 'Pending').length;
  const sel = store.state.users.find((u) => u.id === selected);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>User &amp; Access Management</h1>
          <p className="lead">Synthetic users, their group and permission-profile assignments, and pending access requests.</p>
        </div>
        {store.can('permissions', 'view') && (
          <div className="row wrap">
            <Link to="/admin/permissions" className="btn btn-secondary"><ShieldCheck size={15} />Role &amp; Permissions</Link>
          </div>
        )}
      </div>
      {!admin && <Notice tone="warning">View only. User administration requires Administrative access on User &amp; Access.</Notice>}
      <section className="panel">
        <div style={{ padding: '0 var(--s5)' }}>
          <Tabs<Tab> label="Access sections" value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[{ id: 'users', label: 'Users', count: store.state.users.length }, { id: 'requests', label: 'Access requests', count: pending }]} />
        </div>
        {tab === 'users' ? (
          <>
            <div className="filters">
              <div className="input-icon" style={{ width: 240 }}>
                <Search size={14} />
                <input className="input" placeholder="Search name or title" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className="select" aria-label="Group" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">All groups</option>
                {GROUPS.map((g) => <option key={g.id} value={g.id}>Group {g.number} — {g.short}</option>)}
              </select>
              <select className="select" aria-label="Profile" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">All profiles</option>
                {PROFILES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <span className="small subtle" style={{ marginLeft: 'auto' }}>{users.length} users</span>
            </div>
            {users.length === 0 ? <Empty title="No users match" /> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>User</th><th>Group</th><th>Profile</th><th className="hide-md">Last active</th><th>Status</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="clickable" tabIndex={0} onClick={() => setSelected(u.id)} onKeyDown={(e) => e.key === 'Enter' && setSelected(u.id)}>
                        <td><span className="row"><Avatar name={u.name} size="sm" /><span><span className="primary-cell" style={{ display: 'block' }}>{u.name}</span><span className="id-cell">{u.title}</span></span></span></td>
                        <td className="small"><span className="strong">Group {groupById(u.groupId).number}</span> <span className="muted">· {groupById(u.groupId).short}</span>{groupById(u.groupId).external && <span className="chip" style={{ marginLeft: 6 }}>External</span>}</td>
                        <td className="small">{profileById(u.profileId).name}<div className="xs subtle">{roleById(u.role).name} experience</div></td>
                        <td className="small muted hide-md">{u.lastActive}</td>
                        <td><StateChip tone={u.status === 'Active' ? 'ok' : 'neutral'}>{u.status}</StateChip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Request</th><th className="hide-md">Justification</th><th>Raised</th><th className="num">Decision</th></tr></thead>
              <tbody>
                {store.state.access.map((r) => (
                  <tr key={r.id}>
                    <td><div className="primary-cell">{r.userName}</div><div className="small muted">{r.requested}</div><div className="id-cell">{r.id}</div></td>
                    <td className="small muted hide-md" style={{ maxWidth: 320 }}>{r.justification}</td>
                    <td className="small muted nowrap">{relative(r.requestedAt)}</td>
                    <td className="num">
                      {r.status !== 'Pending' ? <StateChip tone={r.status === 'Approved' ? 'ok' : 'bad'}>{r.status}</StateChip> : approver ? (
                        <span className="row" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => store.decideAccess(r.id, false)}>Reject</button>
                          <button className="btn btn-primary btn-sm" onClick={() => store.decideAccess(r.id, true)}>Approve</button>
                        </span>
                      ) : <StateChip tone="warn">Pending</StateChip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {sel && <UserDrawer user={sel} admin={admin} onClose={() => setSelected(null)} />}
    </div>
  );
}

function UserDrawer({ user, admin, onClose }: { user: User; admin: boolean; onClose: () => void }) {
  const store = useStore();
  const [role, setRole] = useState<ProfileId>(user.profileId);
  const [group, setGroup] = useState<GroupId>(user.groupId);
  const [status, setStatus] = useState(user.status);
  const dirty = role !== user.profileId || group !== user.groupId || status !== user.status;
  const open = store.state.tasks.filter((t) => t.assigneeId === user.id && t.status !== 'Completed').length;

  return (
    <Drawer label={`User ${user.name}`} onClose={onClose}
      header={<div className="row gap-3"><Avatar name={user.name} size="lg" /><div><h2>{user.name}</h2><div className="small muted">{user.title}</div></div></div>}
      footer={admin ? <><button className="btn btn-primary" disabled={!dirty} onClick={() => { store.updateUser(user.id, { profileId: role, groupId: group, status }); onClose(); }}>Save changes</button><button className="btn btn-secondary" onClick={onClose}>Cancel</button></> : undefined}>
      <dl className="kv two">
        <div><dt>User ID</dt><dd className="mono">{user.id}</dd></div>
        <div><dt>Email</dt><dd className="small">{user.email}</dd></div>
        <div><dt>Open tasks</dt><dd>{open}</dd></div>
        <div><dt>Last active</dt><dd>{user.lastActive}</dd></div>
      </dl>
      <div className="stack gap-4">
        <h3>Assignment</h3>
        <div className="field">
          <label htmlFor="u-group">User group</label>
          <select id="u-group" className="select" value={group} disabled={!admin} onChange={(e) => setGroup(e.target.value as GroupId)}>
            {GROUPS.map((g) => <option key={g.id} value={g.id}>Group {g.number} — {g.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="u-role">Permission profile</label>
          <select id="u-role" className="select" value={role} disabled={!admin} onChange={(e) => setRole(e.target.value as ProfileId)}>
            {PROFILES.map((r) => <option key={r.id} value={r.id}>{r.name} ({roleById(r.role).name})</option>)}
          </select>
          <span className="hint">Profile and group are independent — people in the same group can hold different profiles.</span>
        </div>
        <div className="field">
          <span className="field-label">Account status</span>
          <div className="seg" role="group" aria-label="Account status">
            {(['Active', 'Inactive'] as const).map((s) => <button key={s} aria-pressed={status === s} disabled={!admin} onClick={() => setStatus(s)}>{s}</button>)}
          </div>
        </div>
        {!admin && <Notice>Read-only. Administrative access is required to change assignments.</Notice>}
      </div>
    </Drawer>
  );
}
