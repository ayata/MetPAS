import type { Level } from './permissions';
import type { RoleId } from './roles';

export type ProfileId = 'operator' | 'senior' | 'manager' | 'product-owner' | 'specialist' | 'superuser' | 'audit';

/** Highest data visibility a profile can ever receive, regardless of group grants. */
export type DataCeiling = 'masked' | 'full';

export interface ProfileDefinition {
  id: ProfileId;
  name: string;
  /** Which of the three role-based experiences this profile uses. */
  role: RoleId;
  description: string;
  /** Upper bound of actions. Effective access = profile capability ∩ group module grant. */
  capabilities: Level[];
  dataCeiling: DataCeiling;
}

export const PROFILES: ProfileDefinition[] = [
  { id: 'operator', name: 'Operator', role: 'operator', description: 'Completes assigned business tasks within standard authority.', capabilities: ['view', 'create', 'edit'], dataCeiling: 'masked' },
  { id: 'senior', name: 'Senior Operator / Specialist', role: 'operator', description: 'Experienced operator who may approve routine work within team limits.', capabilities: ['view', 'create', 'edit', 'approve'], dataCeiling: 'masked' },
  { id: 'specialist', name: 'Finance / Actuarial / Compliance Specialist', role: 'operator', description: 'Specialist with access to the detailed information of their discipline.', capabilities: ['view', 'create', 'edit', 'approve'], dataCeiling: 'full' },
  { id: 'manager', name: 'Manager / Supervisor', role: 'manager', description: 'Oversees team workload, approvals, escalations and performance.', capabilities: ['view', 'create', 'edit', 'approve'], dataCeiling: 'full' },
  { id: 'product-owner', name: 'Product / Pricing Owner', role: 'manager', description: 'Owns product, pricing and rule configuration.', capabilities: ['view', 'create', 'edit', 'approve', 'configure'], dataCeiling: 'full' },
  { id: 'audit', name: 'Audit / Risk', role: 'manager', description: 'Scoped, read-only access for assurance and investigations.', capabilities: ['view'], dataCeiling: 'full' },
  { id: 'superuser', name: 'Super User / System Administrator', role: 'support', description: 'Administers the platform, configuration and access.', capabilities: ['view', 'create', 'edit', 'approve', 'configure', 'admin'], dataCeiling: 'full' },
];

export const profileById = (id: ProfileId) => PROFILES.find((p) => p.id === id)!;
export const profilesForRole = (role: RoleId) => PROFILES.filter((p) => p.role === role);
export const defaultProfileFor = (role: RoleId): ProfileId => (role === 'manager' ? 'manager' : role === 'support' ? 'superuser' : 'operator');
