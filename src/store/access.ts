import type { GroupId } from '../config/groups';
import { GROUPS } from '../config/groups';
import type { Level, ModuleId, PermissionMatrix } from '../config/permissions';
import type { RoleId } from '../config/roles';
import type { DataCat, DataLevel, DataMatrix } from '../config/dataAccess';
import type { DataCeiling, ProfileId } from '../config/profiles';
import type { Tier } from '../config/tiers';
import { HOLDER_IDX, POLICIES } from '../data/policies';
import type { Task } from '../data/tasks';
import type { User } from '../data/users';

export interface Session {
  userId: string;
  /** The role-based experience (Operator / Manager / Support). */
  role: RoleId;
  groupId: GroupId;
  /** Permission profile — the action ceiling within the experience. */
  profileId: ProfileId;
}

export type ProfileCaps = Record<ProfileId, Level[]>;
export type ProfileData = Record<ProfileId, DataCeiling>;

/**
 * Effective permission = profile capability ∩ group module grant.
 * The internal criticality grant is also honoured when a tier is supplied, but it is never shown.
 */
export function canDo(matrix: PermissionMatrix, caps: ProfileCaps, s: Session, module: ModuleId, level: Level, tier?: Tier) {
  if (!caps[s.profileId]?.includes(level)) return false;
  const grant = matrix[s.groupId];
  if (!grant.modules[module]?.includes(level)) return false;
  if (tier && !['configure', 'admin'].includes(level) && !grant.tiers[tier].includes(level)) return false;
  return true;
}

const RANK: Record<DataLevel, number> = { hidden: 0, masked: 1, full: 2 };

/** Restricted data visibility = group data grant capped by the profile's data ceiling. */
export function dataLevel(matrix: DataMatrix, ceilings: ProfileData, s: Session, cat: DataCat): DataLevel {
  const g = matrix[s.groupId][cat];
  const c = ceilings[s.profileId] ?? 'masked';
  return RANK[g] <= RANK[c] ? g : c;
}

export const isExternal = (g: GroupId) => !!GROUPS.find((x) => x.id === g)?.external;
export const isAgent = (u: User | undefined) => u?.title === 'Independent Agent';

/** Policies owned by the synthetic policyholder persona. */
export const POLICYHOLDER_POLICIES = HOLDER_IDX.map((i) => POLICIES[i].id);

/** External users are limited to the policies they are linked to. */
export function policyScope(s: Session, user: User | undefined): string[] | null {
  if (!isExternal(s.groupId)) return null;
  if (isAgent(user)) return POLICIES.filter((p) => p.agent === 'Olivia Grant').map((p) => p.id);
  return POLICYHOLDER_POLICIES;
}

/** Groups whose work the session can see. Oversight groups see wider. */
export function visibleGroups(s: Session): GroupId[] {
  if (s.groupId === 'G4' || s.groupId === 'G5') return ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'];
  if (s.groupId === 'G6') return ['G6'];
  return s.role === 'manager' ? [s.groupId, 'G6'] : [s.groupId];
}

export function canSeeTask(s: Session, t: Task, scope: string[] | null) {
  if (scope) return t.requestedBy === s.userId || t.assigneeId === s.userId || (t.groupId === 'G6' && scope.includes(t.policyId));
  return visibleGroups(s).includes(t.groupId) || t.assigneeId === s.userId;
}

/** Team = people whose workload the manager oversees. */
export function teamGroups(s: Session): GroupId[] {
  if (s.groupId === 'G4') return ['G1', 'G2', 'G3', 'G4'];
  return [s.groupId];
}
