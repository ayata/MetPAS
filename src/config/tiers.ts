import type { GroupId } from './groups';

export type Tier = 1 | 2 | 3;

export interface TierDefinition {
  id: Tier;
  code: string;
  name: string;
  subtitle: string;
  description: string;
  purpose: string;
  activities: string[];
  groups: GroupId[];
  workflows: { name: string; steps: string[] }[];
}

/** Tier = business criticality only. It never grants access or authority. */
export const TIERS: TierDefinition[] = [
  {
    id: 1,
    code: 'T1',
    name: 'Non-Negotiable',
    subtitle: 'Contractual, Statutory, Tax',
    description:
      'Mandatory obligations that must be fulfilled accurately and within applicable contractual, regulatory, statutory and tax requirements.',
    purpose:
      'Protects policyholder contracts, regulatory standing and tax compliance. Errors or delays create legal, financial or reputational exposure.',
    activities: [
      'Ownership maintenance',
      'Beneficiary updates',
      'Coverage and policy status',
      'Contractually required policy changes',
      'Premium and benefit calculations',
      'Mandatory claims and disbursements',
      'Statutory and tax reporting',
      'Audit evidence and mandatory controls',
    ],
    groups: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    workflows: [
      { name: 'Beneficiary change', steps: ['Request received', 'Identity & authority verified', 'Change processed', 'Supervisor approval', 'Confirmation issued'] },
      { name: 'Death claim disbursement', steps: ['Claim notified', 'Documents validated', 'Benefit calculated', 'Disbursement approved', 'Payment released'] },
    ],
  },
  {
    id: 2,
    code: 'T2',
    name: 'Operational Imperative',
    subtitle: 'Essential day-to-day operations',
    description:
      'Essential day-to-day operational activities that keep servicing, financial processing and monitoring running smoothly.',
    purpose:
      'Sustains service levels, customer experience and operational stability. Backlogs here quickly become customer and control issues.',
    activities: [
      'Policy inquiries',
      'Service requests',
      'Customer correspondence',
      'Billing and reconciliation',
      'Suspense resolution',
      'Transaction approvals',
      'Exception management',
      'Work queue management',
      'Batch and interface monitoring',
    ],
    groups: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    workflows: [
      { name: 'Suspense resolution', steps: ['Item in suspense', 'Research payment source', 'Apply or refund', 'Reconcile ledger'] },
      { name: 'Batch failure follow-up', steps: ['Failure detected', 'Incident raised', 'Fix and re-run', 'Business confirmation'] },
    ],
  },
  {
    id: 3,
    code: 'T3',
    name: 'Optimization / Discretionary',
    subtitle: 'Improvements and efficiency',
    description:
      'Improvements, efficiency enhancements and discretionary activities that raise automation, insight and digital capability.',
    purpose:
      'Reduces cost-to-serve and manual effort over time. Scheduled around Tier 1 and Tier 2 commitments.',
    activities: [
      'Straight-through processing',
      'Automated exception routing',
      'Advanced analytics',
      'Scenario modelling',
      'Predictive dashboards',
      'Configurable business rules',
      'Process optimization',
      'Enhanced digital channels',
    ],
    groups: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'],
    workflows: [
      { name: 'STP rule proposal', steps: ['Opportunity identified', 'Rule drafted', 'Impact tested', 'Approved for release'] },
    ],
  },
];

export const tierById = (t: Tier) => TIERS[t - 1];
