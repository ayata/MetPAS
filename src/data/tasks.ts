import type { GroupId } from '../config/groups';
import type { Tier } from '../config/tiers';
import { moduleById, type ModuleId } from '../config/modules';
import { POLICIES } from './policies';
import { userById } from './users';

export type TaskStatus = 'Pending' | 'In Progress' | 'Requires Approval' | 'Completed' | 'Rejected';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface TaskTypeDef {
  id: string;
  name: string;
  /** Internal business-criticality classification. Used for prioritization only — never displayed. */
  tier: Tier;
  group: GroupId;
  /** Business component that owns this work. */
  module: ModuleId;
  slaHours: number;
  requiresApproval: boolean;
  category: string;
}

/** Extension point: add task types here and they flow through queues, dashboards and New Request. */
export const TASK_TYPES: TaskTypeDef[] = [
  // Policy Administration
  { id: 'beneficiary-change', name: 'Beneficiary Change', tier: 1, group: 'G1', module: 'policy-changes', slaHours: 72, requiresApproval: true, category: 'Policy Change' },
  { id: 'ownership-transfer', name: 'Ownership Transfer', tier: 1, group: 'G1', module: 'policy-changes', slaHours: 120, requiresApproval: true, category: 'Policy Change' },
  { id: 'reinstatement', name: 'Coverage Reinstatement', tier: 1, group: 'G1', module: 'policy-changes', slaHours: 96, requiresApproval: true, category: 'Policy Change' },
  { id: 'coverage-change', name: 'Coverage Change', tier: 1, group: 'G1', module: 'policy-changes', slaHours: 96, requiresApproval: true, category: 'Policy Change' },
  { id: 'address-change', name: 'Policy Address Change', tier: 2, group: 'G1', module: 'policy-changes', slaHours: 48, requiresApproval: false, category: 'Service Request' },
  { id: 'rider-change', name: 'Rider Change', tier: 2, group: 'G1', module: 'riders', slaHours: 96, requiresApproval: true, category: 'Policy Change' },
  // Claims & Benefits
  { id: 'death-claim', name: 'Death Claim Review', tier: 1, group: 'G2', module: 'death-claims', slaHours: 120, requiresApproval: true, category: 'Claim' },
  { id: 'death-notification', name: 'Death Notification Intake', tier: 1, group: 'G1', module: 'death-claims', slaHours: 24, requiresApproval: false, category: 'Claim' },
  { id: 'redemption', name: 'Redemption Request', tier: 1, group: 'G2', module: 'withdrawals', slaHours: 72, requiresApproval: true, category: 'Disbursement' },
  { id: 'surrender', name: 'Full Surrender Payout', tier: 1, group: 'G2', module: 'withdrawals', slaHours: 96, requiresApproval: true, category: 'Disbursement' },
  { id: 'loan-approval', name: 'Policy Loan Approval', tier: 2, group: 'G2', module: 'benefit-calcs', slaHours: 48, requiresApproval: true, category: 'Transaction' },
  // Financial Management
  { id: 'premium-correction', name: 'Premium Payment Exception', tier: 1, group: 'G2', module: 'billing', slaHours: 48, requiresApproval: true, category: 'Financial' },
  { id: 'suspense', name: 'Suspense Item Resolution', tier: 2, group: 'G2', module: 'billing', slaHours: 48, requiresApproval: false, category: 'Financial' },
  { id: 'billing-recon', name: 'GL Reconciliation Break', tier: 2, group: 'G2', module: 'finance-recon', slaHours: 72, requiresApproval: false, category: 'Financial' },
  { id: 'reinsurance', name: 'Reinsurance Cession Review', tier: 2, group: 'G3', module: 'reinsurance', slaHours: 96, requiresApproval: false, category: 'Reinsurance' },
  { id: 'commission-adjustment', name: 'Commission Adjustment', tier: 2, group: 'G2', module: 'commissions', slaHours: 72, requiresApproval: true, category: 'Financial' },
  // Product & Actuarial
  { id: 'valuation-signoff', name: 'Reserve Valuation Sign-off', tier: 1, group: 'G3', module: 'valuation', slaHours: 120, requiresApproval: true, category: 'Actuarial' },
  { id: 'rate-table', name: 'Rate Table Update', tier: 2, group: 'G3', module: 'pricing', slaHours: 120, requiresApproval: true, category: 'Pricing' },
  { id: 'scenario-model', name: 'Scenario Model Run', tier: 3, group: 'G3', module: 'valuation', slaHours: 240, requiresApproval: false, category: 'Analytics' },
  { id: 'underwriting-review', name: 'Underwriting Review', tier: 1, group: 'G1', module: 'underwriting', slaHours: 72, requiresApproval: true, category: 'Underwriting' },
  // Customer Services
  { id: 'policy-inquiry', name: 'Policy Inquiry', tier: 2, group: 'G1', module: 'customer-service', slaHours: 48, requiresApproval: false, category: 'Inquiry' },
  { id: 'complaint', name: 'Customer Complaint Review', tier: 2, group: 'G4', module: 'customer-service', slaHours: 72, requiresApproval: false, category: 'Complaint' },
  { id: 'guided-servicing', name: 'Servicing Script Update', tier: 3, group: 'G1', module: 'customer-service', slaHours: 168, requiresApproval: false, category: 'Service Improvement' },
  { id: 'statement-request', name: 'Statement Request', tier: 2, group: 'G1', module: 'statements', slaHours: 48, requiresApproval: false, category: 'Correspondence' },
  { id: 'contract-notice', name: 'Grace Period Notice', tier: 1, group: 'G1', module: 'statements', slaHours: 24, requiresApproval: false, category: 'Correspondence' },
  { id: 'correspondence', name: 'Customer Correspondence', tier: 2, group: 'G1', module: 'statements', slaHours: 72, requiresApproval: false, category: 'Correspondence' },
  // Compliance & Control
  { id: 'tax-1099', name: '1099-R Tax Form Correction', tier: 1, group: 'G3', module: 'tax-compliance', slaHours: 72, requiresApproval: true, category: 'Tax' },
  { id: 'aml-review', name: 'AML Screening Review', tier: 1, group: 'G4', module: 'tax-compliance', slaHours: 48, requiresApproval: true, category: 'Compliance' },
  { id: 'regulatory-filing', name: 'Regulatory Filing', tier: 1, group: 'G4', module: 'regulatory', slaHours: 120, requiresApproval: true, category: 'Regulatory' },
  { id: 'audit-evidence', name: 'Audit Evidence Request', tier: 1, group: 'G4', module: 'audit', slaHours: 72, requiresApproval: false, category: 'Control' },
  { id: 'process-analytics', name: 'Workflow Performance Review', tier: 3, group: 'G4', module: 'workflow', slaHours: 240, requiresApproval: false, category: 'Analytics' },
  // Technology
  { id: 'extract-request', name: 'Data Extract Request', tier: 2, group: 'G5', module: 'data-extracts', slaHours: 48, requiresApproval: true, category: 'Data' },
  { id: 'batch-followup', name: 'Batch Failure Follow-up', tier: 2, group: 'G5', module: 'monitoring', slaHours: 12, requiresApproval: false, category: 'Operations' },
  { id: 'release-test', name: 'Release Test Sign-off', tier: 2, group: 'G5', module: 'monitoring', slaHours: 72, requiresApproval: true, category: 'Change' },
  { id: 'observability', name: 'Monitoring Enhancement', tier: 3, group: 'G5', module: 'monitoring', slaHours: 336, requiresApproval: false, category: 'Operations' },
  { id: 'stp-rule', name: 'Straight-Through Rule Review', tier: 3, group: 'G2', module: 'routing', slaHours: 240, requiresApproval: true, category: 'Automation' },
  { id: 'routing-rule', name: 'Exception Routing Proposal', tier: 3, group: 'G1', module: 'routing', slaHours: 240, requiresApproval: false, category: 'Automation' },
  { id: 'access-integrity', name: 'Privileged Access Review', tier: 1, group: 'G5', module: 'access', slaHours: 48, requiresApproval: true, category: 'Security' },
  // Digital channels
  { id: 'identity-verification', name: 'Identity & Authority Verification', tier: 1, group: 'G6', module: 'self-service', slaHours: 24, requiresApproval: false, category: 'Verification' },
  { id: 'service-request', name: 'Online Service Request', tier: 2, group: 'G6', module: 'self-service', slaHours: 48, requiresApproval: false, category: 'Service Request' },
  { id: 'portal-feedback', name: 'Digital Portal Feedback', tier: 3, group: 'G6', module: 'self-service', slaHours: 336, requiresApproval: false, category: 'Digital' },
];
export const taskTypeById = (id: string) => TASK_TYPES.find((t) => t.id === id)!;
/** Business component that owns a task (shown instead of any internal classification). */
export const taskModule = (t: { typeId: string }) => moduleById(taskTypeById(t.typeId).module);

export interface TaskEvent {
  at: string;
  actorId: string;
  text: string;
}

export interface Task {
  id: string;
  typeId: string;
  title: string;
  /** Internal criticality metadata (never displayed). */
  tier: Tier;
  groupId: GroupId;
  priority: Priority;
  status: TaskStatus;
  policyId: string;
  assigneeId: string | null;
  createdAt: string;
  dueAt: string;
  completedAt?: string;
  description: string;
  documents: string[];
  history: TaskEvent[];
  submittedBy?: string;
  /** Set when an external user raised the request */
  requestedBy?: string;
  escalated?: boolean;
}

const H = 3600000;
const now = Date.now();
const iso = (hoursFromNow: number) => new Date(now + hoursFromNow * H).toISOString();

const DESCRIPTIONS: Record<string, string> = {
  'beneficiary-change': 'Owner requested replacement of primary beneficiary following a change in marital status. Signed designation form received through the secure portal.',
  'ownership-transfer': 'Absolute assignment of ownership to a family trust. Trust certification and owner signature require validation.',
  reinstatement: 'Policy lapsed for non-payment. Owner submitted a reinstatement application with evidence of insurability and back premium.',
  'contract-notice': 'Policy entered grace period. A contractually required notice must be issued to the owner and assignee before the statutory deadline.',
  'death-claim': 'Claim notification received from the primary beneficiary. Certified death certificate and claimant statement are on file.',
  surrender: 'Owner requested full surrender. Calculate net cash surrender value, tax withholding and prepare disbursement.',
  'premium-correction': 'Premium payment was applied to the wrong policy month. Re-apply and verify that the paid-to date is correct.',
  'tax-1099': 'Owner disputes the taxable amount reported on the 1099-R. Validate cost basis and issue a corrected form if required.',
  'valuation-signoff': 'Quarter-end statutory reserve valuation for the block requires actuarial sign-off before close.',
  'audit-evidence': 'Internal audit requested evidence of dual approval for disbursements above the delegated authority limit.',
  'access-integrity': 'Quarterly privileged access certification for production policy administration roles.',
  'identity-verification': 'Authorized representative requested access to policy information. Verify identity and authority documentation.',
  'policy-inquiry': 'Owner asked about current cash value, loan availability and premium schedule.',
  'address-change': 'Owner requested mailing address update. Confirm identity and update correspondence preferences.',
  correspondence: 'Respond to a written request for an in-force illustration and policy summary.',
  suspense: 'Unidentified premium payment held in suspense. Match the remitter to the correct policy or initiate a refund.',
  'billing-recon': 'Monthly list-bill reconciliation shows a variance between billed and received premium.',
  'loan-approval': 'Policy loan request within available loan value. Review and approve disbursement.',
  'rate-table': 'Controlled update of cost-of-insurance rate table for the next product year.',
  reinsurance: 'Review automatic cession for a large face amount policy against treaty limits.',
  complaint: 'Customer complaint regarding delay in processing a service request. Review handling and respond.',
  'batch-followup': 'Nightly premium posting batch completed with errors. Confirm re-run results with the business.',
  'release-test': 'Business sign-off for regression testing of release 4.12 affecting premium calculations.',
  'service-request': 'Service request submitted through the digital portal.',
  'stp-rule': 'Proposed straight-through rule for address changes under $0 financial impact.',
  'routing-rule': 'Proposal to auto-route suspense exceptions by remitter type.',
  'guided-servicing': 'Update guided servicing script for beneficiary inquiries.',
  'scenario-model': 'Run interest rate shock scenario for the universal life block.',
  'process-analytics': 'Review cycle-time analytics for policy changes over the last quarter.',
  observability: 'Add alerting thresholds for interface latency on the payments gateway.',
  'portal-feedback': 'Customer feedback on digital beneficiary change journey.',
  'coverage-change': 'Owner requested a reduction of the face amount. Review eligibility and the indicative premium impact.',
  'rider-change': 'Request to add an accidental death benefit rider. Confirm eligibility and premium conditions.',
  'death-notification': 'Call received from a family member reporting the death of the insured. Register the notification and request proof of death.',
  redemption: 'Owner requested a partial withdrawal. Confirm available withdrawal value, applicable charges and tax withholding.',
  'commission-adjustment': 'Agent disputes the renewal commission on a policy following a premium mode change.',
  'underwriting-review': 'Application referred for review: build and blood pressure readings outside standard limits. Decide outcome and conditions.',
  'statement-request': 'Owner requested a duplicate annual statement and transaction history for the last 12 months.',
  'aml-review': 'Sanctions screening returned a potential name match for a new beneficiary. Review and clear or escalate.',
  'regulatory-filing': 'Quarterly unclaimed property report must be filed with the state regulator.',
  'extract-request': 'Finance requested a monthly in-force extract for the reinsurance bordereau.',
};

const DOCS: Record<string, string[]> = {
  'beneficiary-change': ['Beneficiary designation form.pdf', 'Owner ID verification.pdf'],
  'ownership-transfer': ['Absolute assignment form.pdf', 'Trust certification.pdf'],
  reinstatement: ['Reinstatement application.pdf', 'Evidence of insurability.pdf'],
  'death-claim': ['Claimant statement.pdf', 'Certified death certificate.pdf'],
  surrender: ['Surrender request form.pdf', 'W-4R withholding election.pdf'],
  'tax-1099': ['1099-R 2025 original.pdf', 'Cost basis worksheet.xlsx'],
  'audit-evidence': ['Audit request memo.pdf'],
  'loan-approval': ['Loan request form.pdf'],
  'rate-table': ['COI rate table v2027.xlsx', 'Actuarial memo.pdf'],
  'release-test': ['Regression test summary.pdf'],
  redemption: ['Withdrawal request form.pdf', 'W-4R withholding election.pdf'],
  'underwriting-review': ['Application part A.pdf', 'Paramedical exam summary.pdf'],
  'death-notification': ['Call notes.pdf'],
  'coverage-change': ['Policy change request.pdf'],
};

/** Compact seed: [typeId, priority, status, assignee, hoursUntilDue, escalated?] */
type Seed = [string, Priority, TaskStatus, string | null, number, boolean?];
const SEEDS: Seed[] = [
  // Priya (U01) — operator demo persona: a realistic mix of servicing, claims, payments and customer work
  ['beneficiary-change', 'High', 'In Progress', 'U01', 5],
  ['death-claim', 'Critical', 'Pending', 'U01', 9],
  ['premium-correction', 'High', 'In Progress', 'U01', -2],
  ['redemption', 'High', 'Pending', 'U01', 20],
  ['underwriting-review', 'Medium', 'Pending', 'U01', 30],
  ['statement-request', 'Low', 'Pending', 'U01', 22],
  ['ownership-transfer', 'Medium', 'Pending', 'U01', 70],
  ['contract-notice', 'Critical', 'Pending', 'U01', -3],
  ['reinstatement', 'High', 'Requires Approval', 'U01', 30],
  ['policy-inquiry', 'Medium', 'In Progress', 'U01', -6],
  ['address-change', 'Low', 'Pending', 'U01', 8],
  ['correspondence', 'Medium', 'Pending', 'U01', 40],
  ['suspense', 'Medium', 'Pending', 'U01', 52],
  ['routing-rule', 'Low', 'In Progress', 'U01', 120],
  ['guided-servicing', 'Low', 'Pending', 'U01', 160],
  ['beneficiary-change', 'High', 'Completed', 'U01', -20],
  ['policy-inquiry', 'Low', 'Completed', 'U01', -30],
  // G1 team
  ['beneficiary-change', 'High', 'Requires Approval', 'U02', 20],
  ['address-change', 'Medium', 'In Progress', 'U02', -2],
  ['policy-inquiry', 'Medium', 'Pending', 'U02', 12],
  ['correspondence', 'Low', 'Completed', 'U02', -10],
  ['contract-notice', 'High', 'Pending', 'U03', 4],
  ['policy-inquiry', 'Medium', 'In Progress', 'U03', 26],
  ['correspondence', 'Medium', 'Pending', 'U03', -9, true],
  ['address-change', 'Low', 'Completed', 'U03', -40],
  ['ownership-transfer', 'High', 'Pending', null, 60],
  ['policy-inquiry', 'Medium', 'Pending', null, 18],
  ['correspondence', 'Low', 'Pending', null, 44],
  ['reinstatement', 'High', 'Rejected', 'U02', 10],
  ['ownership-transfer', 'High', 'Requires Approval', 'U03', 14],
  ['contract-notice', 'Critical', 'In Progress', 'U02', 3],
  // G2
  ['death-claim', 'Critical', 'In Progress', 'U05', 10],
  ['surrender', 'High', 'Requires Approval', 'U05', 22],
  ['premium-correction', 'High', 'Pending', 'U05', -4, true],
  ['suspense', 'Medium', 'In Progress', 'U05', 15],
  ['loan-approval', 'Medium', 'Requires Approval', 'U06', 9],
  ['billing-recon', 'Medium', 'Pending', 'U06', -12],
  ['suspense', 'Low', 'Pending', 'U06', 36],
  ['stp-rule', 'Low', 'Pending', 'U05', 200],
  ['death-claim', 'Critical', 'Pending', null, 30],
  ['billing-recon', 'Medium', 'Completed', 'U06', -15],
  ['surrender', 'High', 'Completed', 'U05', -50],
  // G3
  ['tax-1099', 'High', 'In Progress', 'U09', 14],
  ['valuation-signoff', 'Critical', 'Requires Approval', 'U08', 40],
  ['rate-table', 'Medium', 'Pending', 'U08', 90],
  ['reinsurance', 'Medium', 'Pending', 'U09', -5],
  ['scenario-model', 'Low', 'In Progress', 'U08', 180],
  ['rate-table', 'High', 'Requires Approval', 'U18', 60],
  ['coverage-change', 'High', 'Requires Approval', 'U02', 16],
  ['rider-change', 'Medium', 'Pending', 'U03', 50],
  ['death-notification', 'High', 'Pending', null, 6],
  ['redemption', 'High', 'Requires Approval', 'U06', 11],
  ['commission-adjustment', 'Medium', 'Pending', 'U06', 40],
  ['underwriting-review', 'High', 'Requires Approval', 'U02', 18],
  ['aml-review', 'Critical', 'In Progress', 'U11', 7],
  ['regulatory-filing', 'High', 'Pending', 'U11', 70],
  ['extract-request', 'Medium', 'Requires Approval', 'U14', 20],
  // G4
  ['audit-evidence', 'High', 'In Progress', 'U11', 20],
  ['complaint', 'High', 'Pending', 'U11', -1, true],
  ['process-analytics', 'Low', 'Pending', 'U10', 200],
  // G5
  ['batch-followup', 'Critical', 'In Progress', 'U12', 2],
  ['access-integrity', 'High', 'Requires Approval', 'U13', 26],
  ['release-test', 'Medium', 'In Progress', 'U14', 48],
  ['observability', 'Low', 'Pending', 'U12', 300],
  // G6 (external)
  ['service-request', 'Medium', 'Pending', null, 30],
  ['identity-verification', 'High', 'Pending', null, 6],
  ['portal-feedback', 'Low', 'Pending', null, 280],
];


export function buildSeedTasks(): Task[] {
  return SEEDS.map(([typeId, priority, status, assignee, dueH, escalated], i) => {
    const type = taskTypeById(typeId);
    const external = type.group === 'G6';
    const agentBook = POLICIES.filter((p) => p.agent === 'Olivia Grant');
    const policy = external ? agentBook[i % agentBook.length] : POLICIES[(i * 5 + 3) % POLICIES.length];
    const createdH = dueH - type.slaHours;
    const actor = assignee ?? 'system';
    const history: TaskEvent[] = [
      { at: iso(createdH), actorId: 'system', text: `Task created from ${type.category.toLowerCase()} intake and routed to the ${type.name} queue` },
    ];
    if (assignee) history.push({ at: iso(createdH + 1), actorId: 'system', text: `Assigned to ${userById(assignee)?.name}` });
    if (status !== 'Pending' && assignee) history.push({ at: iso(createdH + 3), actorId: actor, text: 'Work started' });
    if (status === 'Requires Approval') history.push({ at: iso(Math.min(-1, createdH + 8)), actorId: actor, text: 'Submitted for approval' });
    if (status === 'Rejected') history.push({ at: iso(-4), actorId: 'U04', text: 'Rejected: Evidence of insurability incomplete — medical questionnaire unsigned' });
    if (status === 'Completed') history.push({ at: iso(dueH - 2), actorId: actor, text: 'Completed' });
    if (escalated) history.push({ at: iso(-1), actorId: 'system', text: 'Escalated: SLA breached' });
    return {
      id: `TSK-${(248310 + i * 17).toString()}`,
      typeId,
      title: type.name,
      tier: type.tier,
      groupId: type.group,
      priority,
      status,
      policyId: policy.id,
      assigneeId: assignee,
      createdAt: iso(createdH),
      dueAt: iso(dueH),
      completedAt: status === 'Completed' ? iso(dueH - 2) : undefined,
      description: DESCRIPTIONS[typeId] ?? '',
      documents: DOCS[typeId] ?? [],
      history,
      submittedBy: status === 'Requires Approval' && assignee ? assignee : undefined,
      requestedBy: external ? 'U15' : undefined,
      escalated,
    };
  });
}
