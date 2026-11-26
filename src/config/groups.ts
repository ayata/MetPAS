export type GroupId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6';

export interface GroupDefinition {
  id: GroupId;
  number: number;
  name: string;
  short: string;
  includes: string[];
  external?: boolean;
  /** Business responsibilities of the group (criticality classification is kept internally on task types). */
  responsibilities: string[];
}

export const GROUPS: GroupDefinition[] = [
  {
    id: 'G1', number: 1, name: 'Policy Servicing & Customer Support', short: 'Policy Servicing',
    includes: ['Customer service', 'Policy processors', 'Underwriting support'],
    responsibilities: [
      'Maintain ownership, beneficiaries, coverage and policy status', 'Process contractually required changes and notices',
      'Policy inquiries', 'Service requests', 'Correspondence', 'Queues and exception handling',
    ],
  },
  {
    id: 'G2', number: 2, name: 'Financial Transactions & Claims', short: 'Financial & Claims',
    includes: ['Premium accounting', 'Billing specialists', 'Loans and surrender specialists', 'Claims and payment specialists'],
    responsibilities: [
      'Correct premium application', 'Benefit calculations', 'Policy transactions', 'Disbursement controls',
      'Suspense resolution', 'Reconciliation', 'Case handling', 'Transaction approvals',
    ],
  },
  {
    id: 'G3', number: 3, name: 'Actuarial, Finance & Product Control', short: 'Actuarial & Finance',
    includes: ['Actuarial specialists', 'Product and rules specialists', 'Finance', 'Tax', 'Reinsurance'],
    responsibilities: [
      'Contractual calculations and guarantees', 'Required valuation, accounting and tax reporting',
      'Controlled rate-table maintenance', 'Financial extracts and analysis', 'Reinsurance administration',
    ],
  },
  {
    id: 'G4', number: 4, name: 'Management, Compliance & Assurance', short: 'Mgmt & Compliance',
    includes: ['Supervisors', 'Business management', 'Compliance', 'Legal', 'Audit'],
    responsibilities: [
      'Delegated authority', 'Restricted information protection', 'Evidence of sensitive actions',
      'Workload oversight', 'Control reviews', 'Complaints', 'Operational reporting',
    ],
  },
  {
    id: 'G5', number: 5, name: 'Technology, Security & Change Delivery', short: 'Technology & Change',
    includes: ['Application support', 'IT operations', 'Access administrators', 'Vendors', 'QA', 'Conversion teams'],
    responsibilities: [
      'Access and data integrity', 'Critical processing recovery', 'Validation of changes affecting contractual values',
      'Batch and interface monitoring', 'Incident management', 'Release testing', 'Access administration',
    ],
  },
  {
    id: 'G6', number: 6, name: 'External Users & Digital Channels', short: 'External & Digital', external: true,
    includes: ['Policyholders', 'Authorized representatives', 'Agents', 'Brokers'],
    responsibilities: [
      'Identity and authority verification', 'Protection of policy information',
      'Controlled policy inquiry', 'Service request submission',
    ],
  },
];

export const groupById = (id: GroupId) => GROUPS.find((g) => g.id === id)!;
