import type { GroupId } from '../config/groups';
import type { RoleId } from '../config/roles';
import type { Tier } from '../config/tiers';
import type { ModuleId } from '../config/modules';

export interface Notification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  kind: 'task' | 'approval' | 'alert' | 'system';
  link?: string;
  /** Audience filters — empty means everyone */
  groups?: GroupId[];
  roles?: RoleId[];
  userId?: string;
}

export interface ActivityEntry {
  id: string;
  at: string;
  actorId: string;
  action: string;
  target: string;
  link?: string;
  /** Internal criticality metadata (never displayed). */
  tier?: Tier;
  module?: ModuleId;
  groupId?: GroupId;
}

const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: 'N-1', title: 'Grace period notice deadline today', body: 'Grace period notices for 3 policies must be issued before 17:00.', at: ago(20), read: false, kind: 'alert', link: '/exceptions', groups: ['G1', 'G4'] },
  { id: 'N-2', title: 'Task rejected — rework needed', body: 'Coverage Reinstatement was returned by Marcus Chen.', at: ago(240), read: false, kind: 'task', link: '/work?view=mine', userId: 'U02' },
  { id: 'N-3', title: 'New task assigned to you', body: 'Beneficiary Change has been routed to your queue.', at: ago(55), read: false, kind: 'task', link: '/work?view=mine', userId: 'U01' },
  { id: 'N-4', title: '4 items awaiting your approval', body: 'Beneficiary, withdrawal and coverage changes are waiting for your decision.', at: ago(35), read: false, kind: 'approval', link: '/work?view=pending', roles: ['manager'] },
  { id: 'N-5', title: 'Premium posting batch failed', body: '37 records rejected. Incident INC-7741 raised.', at: ago(140), read: false, kind: 'system', link: '/operations', groups: ['G5', 'G2'] },
  { id: 'N-6', title: 'Release 4.12 enters testing', body: 'Regression window opens Saturday 22:00.', at: ago(600), read: true, kind: 'system', link: '/operations?tab=changes', groups: ['G5', 'G4'] },
  { id: 'N-7', title: 'Disbursement above authority', body: 'A $1.25M claim payout requires second-level approval.', at: ago(95), read: false, kind: 'alert', link: '/exceptions', groups: ['G2', 'G4'] },
  { id: 'N-8', title: 'Your service request was received', body: 'We will respond within 2 business days.', at: ago(300), read: false, kind: 'task', groups: ['G6'] },
  { id: 'N-10', title: 'Death claim documents received', body: 'Certified death certificate uploaded for claim CLM-60412.', at: ago(75), read: false, kind: 'task', link: '/claims/death', groups: ['G2', 'G1'] },
  { id: 'N-11', title: 'Sanctions screening match', body: 'Potential name match on a new beneficiary needs review.', at: ago(45), read: false, kind: 'alert', link: '/compliance/tax', groups: ['G4'] },
  { id: 'N-12', title: 'Rate table update awaiting approval', body: 'COI rate table v2027 submitted by Sophie Laurent.', at: ago(180), read: false, kind: 'approval', link: '/product/pricing', groups: ['G3', 'G4'], roles: ['manager'] },
  { id: 'N-9', title: 'Scheduled maintenance', body: 'MetPAS demo environment refresh on Sunday 06:00.', at: ago(1600), read: true, kind: 'system' },
];

export const SEED_ACTIVITY: ActivityEntry[] = [
  { id: 'A-1', at: ago(12), actorId: 'U01', action: 'Started work on', target: 'Beneficiary Change', module: 'policy-changes', tier: 1, groupId: 'G1' },
  { id: 'A-2', at: ago(38), actorId: 'U04', action: 'Approved', target: 'Policy Address Change', module: 'policy-changes', tier: 2, groupId: 'G1' },
  { id: 'A-3', at: ago(64), actorId: 'U05', action: 'Calculated death benefit for', target: 'Death Claim Review', module: 'death-claims', tier: 1, groupId: 'G2' },
  { id: 'A-4', at: ago(90), actorId: 'U12', action: 'Raised incident', target: 'INC-7741 Premium posting batch', module: 'monitoring', tier: 2, groupId: 'G5' },
  { id: 'A-5', at: ago(130), actorId: 'U13', action: 'Approved access request', target: 'ACR-5510 Tom Becker', module: 'access', tier: 2, groupId: 'G5' },
  { id: 'A-6', at: ago(200), actorId: 'U01', action: 'Completed', target: 'Policy Inquiry', module: 'customer-service', tier: 2, groupId: 'G1' },
  { id: 'A-7', at: ago(260), actorId: 'U04', action: 'Rejected', target: 'Coverage Reinstatement', module: 'policy-changes', tier: 1, groupId: 'G1' },
  { id: 'A-8', at: ago(330), actorId: 'U11', action: 'Viewed restricted record', target: 'Audit evidence pack', module: 'audit', tier: 1, groupId: 'G4' },
  { id: 'A-9', at: ago(420), actorId: 'U08', action: 'Submitted for approval', target: 'Reserve Valuation Sign-off', module: 'valuation', tier: 1, groupId: 'G3' },
  { id: 'A-10', at: ago(700), actorId: 'U15', action: 'Submitted service request', target: 'Online Service Request', module: 'self-service', tier: 2, groupId: 'G6' },
];
