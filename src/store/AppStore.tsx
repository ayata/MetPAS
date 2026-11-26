import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GroupId } from '../config/groups';
import { DEFAULT_MATRIX, type Level, type ModuleId, type PermissionMatrix } from '../config/permissions';
import type { RoleId } from '../config/roles';
import { DEFAULT_DATA_MATRIX, dataCategoryById, type DataCat, type DataLevel, type DataMatrix } from '../config/dataAccess';
import { PROFILES, defaultProfileFor, profileById, type DataCeiling, type ProfileId } from '../config/profiles';
import type { Tier } from '../config/tiers';
import { SEED_ACTIVITY, SEED_NOTIFICATIONS, type ActivityEntry, type Notification } from '../data/feed';
import {
  SEED_ACCESS, SEED_CHANGES, SEED_EXCEPTIONS, SEED_INCIDENTS,
  type AccessRequest, type ChangeItem, type ExceptionItem, type Incident, type IncidentStatus,
} from '../data/operations';
import { buildSeedTasks, taskTypeById, type Priority, type Task, type TaskStatus } from '../data/tasks';
import { USERS, userById, type User } from '../data/users';
import { canDo, canSeeTask, dataLevel, isExternal, policyScope, type ProfileCaps, type ProfileData, type Session } from './access';

export type Platform = 'LCFS' | 'ULS';

const STORAGE_KEY = 'virtual-pas.demo.v2';

/** A record created during the demo inside a business module (claims, withdrawals, extracts…). */
export type Rec = { id: string } & Record<string, unknown>;

interface State {
  session: Session;
  tasks: Task[];
  exceptions: ExceptionItem[];
  incidents: Incident[];
  access: AccessRequest[];
  changes: ChangeItem[];
  notifications: Notification[];
  activity: ActivityEntry[];
  matrix: PermissionMatrix;
  dataMatrix: DataMatrix;
  profileCaps: ProfileCaps;
  profileData: ProfileData;
  users: User[];
  recentPolicies: string[];
  /** Status overrides for seeded module records, keyed by record id. */
  recordStatus: Record<string, string>;
  /** Records created during the session, keyed by collection. */
  records: Record<string, Rec[]>;
  sidebarCollapsed: boolean;
  /** Demonstration sign-in flag; not real authentication. */
  signedIn: boolean;
  /** Administration system chosen after sign-in (demonstration only; the experience is identical). */
  platform: Platform | null;
  seq: number;
}

const defaultCaps = (): ProfileCaps => Object.fromEntries(PROFILES.map((p) => [p.id, [...p.capabilities]])) as ProfileCaps;
const defaultData = (): ProfileData => Object.fromEntries(PROFILES.map((p) => [p.id, p.dataCeiling])) as ProfileData;

function freshState(): State {
  const u = USERS[0];
  return {
    session: { userId: u.id, role: u.role, groupId: u.groupId, profileId: u.profileId },
    tasks: buildSeedTasks(),
    exceptions: SEED_EXCEPTIONS,
    incidents: SEED_INCIDENTS,
    access: SEED_ACCESS,
    changes: SEED_CHANGES,
    notifications: SEED_NOTIFICATIONS,
    activity: SEED_ACTIVITY,
    matrix: structuredClone(DEFAULT_MATRIX),
    dataMatrix: structuredClone(DEFAULT_DATA_MATRIX),
    profileCaps: defaultCaps(),
    profileData: defaultData(),
    users: USERS.map((x) => ({ ...x })),
    recentPolicies: [],
    recordStatus: {},
    records: {},
    sidebarCollapsed: false,
    signedIn: false,
    platform: null,
    seq: 1,
  };
}

function loadState(): State {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt demo state */
  }
  return freshState();
}

export interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'warning';
}

export interface NewTaskInput {
  typeId: string;
  policyId: string;
  priority: Priority;
  description: string;
  assignToMe: boolean;
  /** Create the task directly in "Requires Approval" (module flows that submit for approval). */
  submit?: boolean;
  /** Optional title override, e.g. "Partial Withdrawal — 25%". */
  title?: string;
}

interface LogInput {
  action: string;
  target: string;
  link?: string;
  module?: ModuleId;
  tier?: Tier;
}

function useStoreValue() {
  const [state, setState] = useState<State>(loadState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const { session } = state;
  const me = state.users.find((u) => u.id === session.userId) ?? state.users[0];
  const scope = policyScope(session, me);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const can = useCallback(
    (module: ModuleId, level: Level, tier?: Tier) => canDo(state.matrix, state.profileCaps, session, module, level, tier),
    [state.matrix, state.profileCaps, session],
  );
  const data = useCallback((cat: DataCat): DataLevel => dataLevel(state.dataMatrix, state.profileData, session, cat), [state.dataMatrix, state.profileData, session]);

  const now = () => new Date().toISOString();

  /** Apply a change, append an activity entry, optionally notify. */
  const commit = useCallback(
    (mutate: (s: State) => Partial<State>, log?: LogInput, notify?: Omit<Notification, 'id' | 'at' | 'read'>) => {
      setState((s) => {
        const patch = mutate(s);
        const next: State = { ...s, ...patch, seq: s.seq + 1 };
        if (log) next.activity = [{ id: `A-x${s.seq}`, at: now(), actorId: s.session.userId, groupId: s.session.groupId, ...log }, ...next.activity];
        if (notify) next.notifications = [{ id: `N-x${s.seq}`, at: now(), read: false, ...notify }, ...next.notifications];
        return next;
      });
    },
    [],
  );

  /* ----- session / demo ----- */
  const setPersona = (userId: string) => {
    const u = state.users.find((x) => x.id === userId)!;
    setState((s) => ({ ...s, session: { userId, role: u.role, groupId: u.groupId, profileId: u.profileId } }));
    toast(`Now previewing as ${u.name}`, 'info');
  };
  const setRole = (role: RoleId) => setState((s) => ({ ...s, session: { ...s.session, role, profileId: defaultProfileFor(role) } }));
  const setProfile = (profileId: ProfileId) => setState((s) => ({ ...s, session: { ...s.session, profileId, role: profileById(profileId).role } }));
  const setGroup = (groupId: GroupId) => setState((s) => ({ ...s, session: { ...s.session, groupId } }));
  const toggleSidebar = () => setState((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }));
  const signIn = (userId: string) => {
    const u = state.users.find((x) => x.id === userId)!;
    setState((s) => ({ ...s, signedIn: true, session: { userId, role: u.role, groupId: u.groupId, profileId: u.profileId } }));
    toast(`Welcome back, ${u.name.split(' ')[0]}`, 'info');
  };
  const signOut = () => setState((s) => ({ ...s, signedIn: false, platform: null }));
  const setPlatform = (platform: Platform) => setState((s) => ({ ...s, platform }));
  const resetDemo = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState((s) => ({ ...freshState(), signedIn: true, platform: s.platform }));
    toast('Demonstration data has been reset', 'info');
  };
  const viewPolicy = (id: string) =>
    setState((s) => (s.recentPolicies[0] === id ? s : { ...s, recentPolicies: [id, ...s.recentPolicies.filter((x) => x !== id)].slice(0, 6) }));

  /* ----- tasks ----- */
  const patchTask = (id: string, patch: Partial<Task>, event: string, s: State): Task[] =>
    s.tasks.map((t) =>
      t.id === id ? { ...t, ...patch, history: [...t.history, { at: now(), actorId: s.session.userId, text: event }] } : t,
    );
  const taskOf = (id: string) => state.tasks.find((t) => t.id === id)!;
  const name = (id: string | null) => (id ? userById(id)?.name ?? id : 'Unassigned');
  const taskLog = (t: Task, action: string): LogInput => ({ action, target: `${t.title} · ${t.id}`, link: `/work/tasks/${t.id}`, tier: t.tier, module: taskTypeById(t.typeId).module });

  const assignTask = (id: string, userId: string | null) => {
    const t = taskOf(id);
    commit(
      (s) => ({ tasks: patchTask(id, { assigneeId: userId }, userId ? `Assigned to ${name(userId)}` : 'Returned to queue', s) }),
      taskLog(t, userId === session.userId ? 'Claimed' : userId ? `Assigned to ${name(userId)}` : 'Unassigned'),
      userId && userId !== session.userId ? { title: 'New task assigned to you', body: `${t.title} (${t.id}) was assigned by ${me.name}.`, kind: 'task', link: `/work/tasks/${id}`, userId } : undefined,
    );
    toast(userId === session.userId ? 'Task claimed and added to My Tasks' : userId ? `Assigned to ${name(userId)}` : 'Task returned to the queue');
  };

  const escalateTask = (id: string) => {
    const t = taskOf(id);
    commit((s) => ({ tasks: patchTask(id, { escalated: true, priority: t.priority === 'Low' || t.priority === 'Medium' ? 'High' : t.priority }, 'Escalated by manager', s) }), taskLog(t, 'Escalated'));
    toast('Task escalated', 'warning');
  };

  const setTaskStatus = (id: string, status: TaskStatus, note?: string) => {
    const t = taskOf(id);
    const labels: Record<TaskStatus, string> = {
      Pending: 'Moved back to Pending',
      'In Progress': t.status === 'Rejected' ? 'Rework started' : 'Work started',
      'Requires Approval': 'Submitted for approval',
      Completed: 'Completed',
      Rejected: 'Rejected',
    };
    const event = note ? `${labels[status]}: ${note}` : labels[status];
    const patch: Partial<Task> = { status };
    if (status === 'Completed') patch.completedAt = now();
    if (status === 'Requires Approval') patch.submittedBy = session.userId;
    commit(
      (s) => ({ tasks: patchTask(id, patch, event, s) }),
      taskLog(t, labels[status]),
      status === 'Requires Approval'
        ? { title: 'Approval requested', body: `${me.name} submitted ${t.title} (${t.id}) for approval.`, kind: 'approval', link: `/work/tasks/${id}`, roles: ['manager'], groups: [t.groupId, 'G4'] }
        : undefined,
    );
    toast(labels[status]);
  };

  const decideTask = (id: string, approve: boolean, note: string, opts?: { silent?: boolean }) => {
    const t = taskOf(id);
    commit(
      (s) => ({
        tasks: patchTask(id, approve ? { status: 'Completed', completedAt: now() } : { status: 'Rejected' }, approve ? `Approved${note ? `: ${note}` : ''}` : `Rejected: ${note}`, s),
      }),
      taskLog(t, approve ? 'Approved' : 'Rejected'),
      t.assigneeId
        ? { title: approve ? 'Your request was approved' : 'Task rejected — rework needed', body: `${t.title} (${t.id}) ${approve ? 'approved' : 'rejected'} by ${me.name}.`, kind: 'approval', link: `/work/tasks/${id}`, userId: t.assigneeId }
        : undefined,
    );
    if (!opts?.silent) toast(approve ? 'Approved — task completed' : 'Rejected and returned to assignee', approve ? 'success' : 'warning');
  };

  const addNote = (id: string, text: string) => {
    commit((s) => ({ tasks: patchTask(id, {}, `Note: ${text}`, s) }));
    toast('Note added');
  };

  const createTask = (input: NewTaskInput, opts?: { silent?: boolean }) => {
    const type = taskTypeById(input.typeId);
    const id = `TSK-${249300 + state.seq}`;
    const external = isExternal(session.groupId);
    const title = input.title ?? type.name;
    const history = [{ at: now(), actorId: session.userId, text: external ? 'Submitted through digital channel' : 'Request created' }];
    if (input.submit) history.push({ at: now(), actorId: session.userId, text: 'Submitted for approval' });
    const task: Task = {
      id,
      typeId: type.id,
      title,
      tier: type.tier,
      groupId: type.group,
      priority: input.priority,
      status: input.submit ? 'Requires Approval' : 'Pending',
      policyId: input.policyId,
      assigneeId: (input.assignToMe || input.submit) && !external ? session.userId : null,
      createdAt: now(),
      dueAt: new Date(Date.now() + type.slaHours * 3600000).toISOString(),
      description: input.description || `${title} requested for policy ${input.policyId}.`,
      documents: [],
      history,
      submittedBy: input.submit ? session.userId : undefined,
      requestedBy: external ? session.userId : undefined,
    };
    commit(
      (s) => ({ tasks: [task, ...s.tasks] }),
      { ...taskLog(task, external ? 'Submitted service request' : input.submit ? 'Submitted for approval' : 'Created request') },
      input.submit ? { title: 'Approval requested', body: `${me.name} submitted ${title} (${id}) for approval.`, kind: 'approval', link: `/work/tasks/${id}`, roles: ['manager'], groups: [type.group, 'G4'] } : undefined,
    );
    if (!opts?.silent) toast(`${id} created — ${title}`);
    return id;
  };

  /* ----- business module records ----- */
  const setRecordStatus = (id: string, status: string, log?: { target?: string; module?: ModuleId; link?: string; message?: string; tone?: Toast['tone'] }) => {
    commit((s) => ({ recordStatus: { ...s.recordStatus, [id]: status } }), { action: `Set status to ${status}`, target: log?.target ?? id, link: log?.link, module: log?.module });
    toast(log?.message ?? `${id} updated to ${status}`, log?.tone ?? 'success');
  };
  const addRecord = (kind: string, rec: Rec, log?: { action: string; target: string; link?: string; module?: ModuleId }, message?: string) => {
    commit((s) => ({ records: { ...s.records, [kind]: [rec, ...(s.records[kind] ?? [])] } }), log);
    if (message) toast(message);
  };
  const nextId = (prefix: string, base: number) => `${prefix}-${base + state.seq}`;
  const logActivity = (action: string, target: string, link?: string, module?: ModuleId) => commit(() => ({}), { action, target, link, module });

  /* ----- exceptions / operations ----- */
  const resolveException = (id: string) => {
    const e = state.exceptions.find((x) => x.id === id)!;
    commit((s) => ({ exceptions: s.exceptions.map((x) => (x.id === id ? { ...x, resolved: true } : x)) }), { action: 'Resolved exception', target: `${e.id} ${e.title}`, tier: e.tier, module: e.module });
    toast('Exception marked as resolved');
  };
  const setIncidentStatus = (id: string, status: IncidentStatus) => {
    commit((s) => ({ incidents: s.incidents.map((x) => (x.id === id ? { ...x, status } : x)) }), { action: `Set incident to ${status}`, target: id, link: '/operations?tab=incidents', module: 'monitoring' });
    toast(`${id} updated to ${status}`);
  };
  const decideAccess = (id: string, approve: boolean) => {
    const r = state.access.find((x) => x.id === id)!;
    commit((s) => ({ access: s.access.map((x) => (x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected' } : x)) }), { action: approve ? 'Approved access request' : 'Rejected access request', target: `${id} ${r.userName}`, link: '/access?tab=requests', module: 'access' });
    toast(approve ? 'Access request approved' : 'Access request rejected', approve ? 'success' : 'warning');
  };
  const requestAccess = (requested: string, justification: string) => {
    const id = `ACR-${5530 + state.seq}`;
    const req: AccessRequest = { id, userName: me.name, requested, justification, requestedAt: now(), status: 'Pending', tier: 1 };
    commit((s) => ({ access: [req, ...s.access] }), { action: 'Requested access to', target: requested, link: '/access?tab=requests', module: 'access' },
      { title: 'Access request raised', body: `${me.name} requested ${requested}.`, kind: 'approval', link: '/access?tab=requests', groups: ['G5'] });
    toast(`${id} raised — access request sent to administrators`, 'info');
  };
  const decideChange = (id: string, approve: boolean) => {
    commit((s) => ({ changes: s.changes.map((x) => (x.id === id ? { ...x, status: approve ? 'Approved' : 'Rejected' } : x)) }), { action: approve ? 'Approved change' : 'Rejected change', target: id, link: '/operations?tab=changes', module: 'monitoring' });
    toast(approve ? 'Change approved' : 'Change rejected', approve ? 'success' : 'warning');
  };

  /* ----- permissions & users ----- */
  const setGrant = (groupId: GroupId, moduleId: ModuleId, levels: Level[]) => {
    commit(
      (s) => ({ matrix: { ...s.matrix, [groupId]: { ...s.matrix[groupId], modules: { ...s.matrix[groupId].modules, [moduleId]: levels } } } }),
      { action: 'Changed module permissions for', target: `${groupId} · ${moduleId}`, module: 'permissions', link: '/admin/permissions?tab=modules' },
    );
    toast('Permission configuration updated');
  };
  const setDataGrant = (groupId: GroupId, cat: DataCat, level: DataLevel) => {
    commit(
      (s) => ({ dataMatrix: { ...s.dataMatrix, [groupId]: { ...s.dataMatrix[groupId], [cat]: level } } }),
      { action: `Set data access to ${level} for`, target: `${groupId} · ${dataCategoryById(cat).name}`, module: 'permissions', link: '/admin/permissions?tab=data' },
    );
    toast('Data access updated');
  };
  const setProfileCaps = (profile: ProfileId, levels: Level[]) => {
    commit((s) => ({ profileCaps: { ...s.profileCaps, [profile]: levels } }), { action: 'Changed profile capabilities for', target: profileById(profile).name, module: 'permissions', link: '/admin/permissions?tab=profiles' });
    toast('Profile capabilities updated');
  };
  const setProfileData = (profile: ProfileId, ceiling: DataCeiling) => {
    commit((s) => ({ profileData: { ...s.profileData, [profile]: ceiling } }), { action: 'Changed data ceiling for', target: profileById(profile).name, module: 'permissions', link: '/admin/permissions?tab=profiles' });
    toast('Profile data ceiling updated');
  };
  const resetPermissions = () => {
    commit(() => ({ matrix: structuredClone(DEFAULT_MATRIX), dataMatrix: structuredClone(DEFAULT_DATA_MATRIX), profileCaps: defaultCaps(), profileData: defaultData() }), { action: 'Restored default permissions', target: 'Permission configuration', module: 'permissions' });
    toast('Default permissions restored', 'info');
  };
  const updateUser = (id: string, patch: Partial<User>) => {
    const u = state.users.find((x) => x.id === id)!;
    const next = patch.profileId ? { ...patch, role: profileById(patch.profileId).role } : patch;
    commit((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...next } : x)) }), { action: 'Updated user', target: u.name, link: '/access', module: 'access' });
    toast(`${u.name} updated`);
  };

  /* ----- notifications ----- */
  const markRead = (id: string) => setState((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  const markAllRead = (ids: string[]) => setState((s) => ({ ...s, notifications: s.notifications.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) }));

  /* ----- derived ----- */
  const visibleTasks = useMemo(() => state.tasks.filter((t) => canSeeTask(session, t, scope)), [state.tasks, session, scope]);
  const myNotifications = useMemo(
    () =>
      state.notifications.filter(
        (n) =>
          (!n.userId || n.userId === session.userId) &&
          (!n.groups || n.groups.includes(session.groupId)) &&
          (!n.roles || n.roles.includes(session.role)),
      ),
    [state.notifications, session],
  );
  const statusOf = (id: string, fallback: string) => state.recordStatus[id] ?? fallback;
  const recordsOf = <T,>(kind: string) => (state.records[kind] ?? []) as unknown as T[];

  return {
    state, session, me, scope, toasts, can, data, visibleTasks, myNotifications, statusOf, recordsOf,
    toast, signIn, signOut, setPlatform, setPersona, setRole, setProfile, setGroup, toggleSidebar, resetDemo, viewPolicy,
    assignTask, escalateTask, setTaskStatus, decideTask, addNote, createTask,
    setRecordStatus, addRecord, nextId, logActivity,
    resolveException, setIncidentStatus, decideAccess, requestAccess, decideChange,
    setGrant, setDataGrant, setProfileCaps, setProfileData, resetPermissions, updateUser,
    markRead, markAllRead,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
