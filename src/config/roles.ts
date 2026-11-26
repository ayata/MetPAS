export type RoleId = 'operator' | 'manager' | 'support';

/** The three role-based experiences. Permissions come from the user's profile and group, not the role. */
export interface RoleDefinition {
  id: RoleId;
  name: string;
  description: string;
}

export const ROLES: RoleDefinition[] = [
  { id: 'operator', name: 'Operator', description: 'Assigned business tasks, policy servicing, claims, payments, customer requests and exceptions.' },
  { id: 'manager', name: 'Manager', description: 'Team workload, approvals, business performance, SLA compliance and operational oversight.' },
  { id: 'support', name: 'Support / Service', description: 'System health, batch, integrations, incidents, access management and technical support.' },
];

export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id)!;
