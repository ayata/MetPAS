import type { GroupId } from '../config/groups';
import type { RoleId } from '../config/roles';
import { profileById, type ProfileId } from '../config/profiles';

export interface User {
  id: string;
  name: string;
  title: string;
  groupId: GroupId;
  role: RoleId;
  /** Permission profile (sets the action ceiling within the role's experience). */
  profileId: ProfileId;
  email: string;
  status: 'Active' | 'Inactive';
  lastActive: string; // relative label
  /** External users only see these policies */
  policyScope?: string[];
}

const mk = (id: string, name: string, title: string, groupId: GroupId, profile: ProfileId | 'support', lastActive = 'Today', status: User['status'] = 'Active'): User => {
  const profileId: ProfileId = profile === 'support' ? 'superuser' : profile;
  return {
    id, name, title, groupId, role: profileById(profileId).role, profileId, lastActive, status,
    email: `${name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').join('.')}@demo.virtualpas.example`,
  };
};

export const USERS: User[] = [
  mk('U01', 'Priya Raman', 'Policy Servicing Specialist', 'G1', 'operator'),
  mk('U02', 'Daniel Brooks', 'Policy Processor', 'G1', 'operator'),
  mk('U03', 'Aisha Coleman', 'Customer Service Representative', 'G1', 'operator'),
  mk('U04', 'Marcus Chen', 'Servicing Team Lead', 'G1', 'manager'),
  mk('U05', 'Elena Petrova', 'Claims & Payments Specialist', 'G2', 'senior'),
  mk('U06', 'Samuel Ortiz', 'Billing Specialist', 'G2', 'operator', 'Yesterday'),
  mk('U07', 'Grace Kim', 'Financial Operations Manager', 'G2', 'manager'),
  mk('U08', 'Nikhil Varma', 'Actuarial Analyst', 'G3', 'specialist'),
  mk('U09', 'Laura Mendes', 'Tax Reporting Specialist', 'G3', 'specialist', '2 days ago'),
  mk('U10', 'Robert Hayes', 'Head of Policy Operations', 'G4', 'manager'),
  mk('U11', 'Fatima Noor', 'Compliance Analyst', 'G4', 'specialist'),
  mk('U12', 'James Whitfield', 'Application Support Lead', 'G5', 'support'),
  mk('U13', 'Mei Lin', 'Access Administrator', 'G5', 'support'),
  mk('U14', 'Tom Becker', 'QA Analyst', 'G5', 'operator', 'Yesterday'),
  mk('U15', 'Olivia Grant', 'Independent Agent', 'G6', 'operator'),
  mk('U16', 'Hannah Wright', 'Policyholder', 'G6', 'operator', '5 days ago'),
  mk('U17', 'Kevin Doyle', 'Underwriting Support', 'G1', 'operator', '3 weeks ago', 'Inactive'),
  mk('U18', 'Sophie Laurent', 'Product & Pricing Owner', 'G3', 'product-owner'),
  mk('U19', 'Andre Wallace', 'Internal Audit Lead', 'G4', 'audit'),
];

// external scopes are filled once policies exist (see data/index)
export const userById = (id: string | null | undefined) => USERS.find((u) => u.id === id);

/** Personas offered in the demonstration switcher */
export const DEMO_PERSONAS = ['U01', 'U05', 'U08', 'U04', 'U18', 'U19', 'U12', 'U15', 'U16'];
