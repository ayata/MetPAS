import { POLICIES } from './policies';
import { gen, isoDay } from './seed';

export interface ComplianceCheck {
  id: string;
  policyId: string;
  party: string;
  check: 'AML risk rating' | 'Sanctions screening' | 'PEP screening' | 'Tax classification (W-9 / FATCA)' | 'Source of funds';
  jurisdiction: string;
  raised: string;
  status: 'Clear' | 'Potential match' | 'Under Review' | 'Missing Information' | 'Escalated';
}
const g = gen(4040);
const CHECKS: ComplianceCheck['check'][] = ['Sanctions screening', 'AML risk rating', 'PEP screening', 'Tax classification (W-9 / FATCA)', 'Source of funds'];
const CSTATUS: ComplianceCheck['status'][] = ['Clear', 'Potential match', 'Clear', 'Missing Information', 'Under Review', 'Clear', 'Escalated', 'Clear'];
export const COMPLIANCE_CHECKS: ComplianceCheck[] = Array.from({ length: 16 }, (_, i) => {
  const p = POLICIES[(i * 3 + 7) % POLICIES.length];
  return {
    id: `CMP-${73300 + i * 6}`,
    policyId: p.id,
    party: i % 3 === 1 ? p.beneficiaries[0].name : p.owner.name,
    check: CHECKS[i % CHECKS.length],
    jurisdiction: `${p.state} · Federal`,
    raised: isoDay(-g.int(0, 20)),
    status: CSTATUS[i % CSTATUS.length],
  };
});

export const TAX_CLASSIFICATIONS = POLICIES.slice(0, 14).map((p, i) => ({
  policyId: p.id,
  qualification: p.product === 'Fixed Annuity' ? (['Traditional IRA', 'Roth IRA', 'Non-qualified'] as const)[i % 3] : 'Non-qualified',
  state: p.state,
  federal: i % 6 === 3 ? 'Modified endowment contract (MEC)' : '7702 compliant',
  withholding: i % 4 === 0 ? 'Elected 10%' : 'Default',
  status: i % 5 === 2 ? 'Missing Information' : 'Current',
}));

export const STATE_RULES = [
  { state: 'NY', rule: 'Regulation 187 best-interest documentation', offset: 'No premium tax offset', notice: '30-day grace notice by first-class mail' },
  { state: 'CA', rule: 'Annual lapse notice to designee', offset: 'Premium tax 2.35%', notice: '60-day grace notice' },
  { state: 'FL', rule: 'Interest on death claims after 20 days', offset: 'Premium tax 1.75%', notice: '31-day grace notice' },
  { state: 'TX', rule: 'Unclaimed property dormancy 3 years', offset: 'Premium tax 1.75%', notice: '31-day grace notice' },
  { state: 'CT', rule: 'Replacement disclosure within 10 days', offset: 'Premium tax 1.50%', notice: '31-day grace notice' },
];

export interface RegReport {
  id: string;
  name: string;
  regulator: string;
  jurisdiction: string;
  frequency: 'Annual' | 'Quarterly' | 'Monthly' | 'Event-driven';
  due: string;
  owner: 'Compliance' | 'Finance' | 'Actuarial' | 'Legal' | 'Risk' | 'Audit';
  status: 'Not Started' | 'In Progress' | 'Ready for Review' | 'Submitted' | 'Overdue';
}
export const REG_REPORTS: RegReport[] = [
  { id: 'REG-301', name: 'Statutory annual statement', regulator: 'State insurance department', jurisdiction: 'CT (domiciliary)', frequency: 'Annual', due: isoDay(110), owner: 'Finance', status: 'Not Started' },
  { id: 'REG-305', name: 'Quarterly statutory statement Q3', regulator: 'State insurance department', jurisdiction: 'CT', frequency: 'Quarterly', due: isoDay(4), owner: 'Finance', status: 'Ready for Review' },
  { id: 'REG-309', name: 'Actuarial opinion & memorandum', regulator: 'State insurance department', jurisdiction: 'All states', frequency: 'Annual', due: isoDay(110), owner: 'Actuarial', status: 'In Progress' },
  { id: 'REG-312', name: 'Unclaimed property report', regulator: 'State treasurer', jurisdiction: 'TX', frequency: 'Annual', due: isoDay(-2), owner: 'Compliance', status: 'Overdue' },
  { id: 'REG-316', name: 'Suspicious activity report', regulator: 'Federal financial crimes unit', jurisdiction: 'Federal', frequency: 'Event-driven', due: isoDay(9), owner: 'Compliance', status: 'In Progress' },
  { id: 'REG-318', name: 'Form 1099-R filing', regulator: 'Federal tax authority', jurisdiction: 'Federal', frequency: 'Annual', due: isoDay(80), owner: 'Finance', status: 'Not Started' },
  { id: 'REG-321', name: 'Market conduct data call', regulator: 'State insurance department', jurisdiction: 'NY', frequency: 'Event-driven', due: isoDay(18), owner: 'Legal', status: 'In Progress' },
  { id: 'REG-324', name: 'Own risk & solvency assessment', regulator: 'State insurance department', jurisdiction: 'CT', frequency: 'Annual', due: isoDay(35), owner: 'Risk', status: 'In Progress' },
];
export const SUBMISSIONS = [
  { id: 'SUB-8812', report: 'Quarterly statutory statement Q2', submitted: isoDay(-95), by: 'Finance', ref: 'ACK-55120' },
  { id: 'SUB-8790', report: 'Unclaimed property report (FL)', submitted: isoDay(-140), by: 'Compliance', ref: 'ACK-54418' },
  { id: 'SUB-8771', report: 'Form 1099-R filing 2025', submitted: isoDay(-250), by: 'Finance', ref: 'ACK-50213' },
  { id: 'SUB-8760', report: 'Actuarial opinion 2025', submitted: isoDay(-245), by: 'Actuarial', ref: 'ACK-50119' },
];
export const EVIDENCE = [
  { id: 'EVD-4410', report: 'REG-305', item: 'Trial balance tie-out', status: 'Attached' },
  { id: 'EVD-4411', report: 'REG-305', item: 'Reserve roll-forward', status: 'Attached' },
  { id: 'EVD-4412', report: 'REG-312', item: 'Due-diligence letters sent', status: 'Missing' },
  { id: 'EVD-4413', report: 'REG-316', item: 'Case investigation summary', status: 'Missing' },
  { id: 'EVD-4414', report: 'REG-321', item: 'Complaint register extract', status: 'Attached' },
];
export const GOV_NOTIFICATIONS = [
  { id: 'GNT-210', notice: 'Change of officer notification', regulator: 'State insurance department', due: isoDay(12), status: 'In Progress' },
  { id: 'GNT-207', notice: 'Product filing — Term 20 rate revision', regulator: 'Interstate compact', due: isoDay(26), status: 'Not Started' },
  { id: 'GNT-203', notice: 'Data breach notification (none required — assessed)', regulator: 'State attorney general', due: isoDay(-5), status: 'Submitted' },
];

export const WORKFLOWS = [
  { id: 'WF-BEN', name: 'Beneficiary change', stages: ['Intake', 'Verify identity', 'Process', 'Approve', 'Confirm'], active: 14, avgCycle: '2.1 days', sla: 96 },
  { id: 'WF-CLM', name: 'Death claim', stages: ['Notify', 'Register', 'Documents', 'Assess', 'Approve', 'Pay'], active: 9, avgCycle: '11.4 days', sla: 88 },
  { id: 'WF-WDR', name: 'Withdrawal / redemption', stages: ['Request', 'Quote', 'Approve', 'Pay'], active: 7, avgCycle: '3.2 days', sla: 94 },
  { id: 'WF-UW', name: 'Underwriting review', stages: ['Application', 'Requirements', 'Assess', 'Decide'], active: 11, avgCycle: '6.8 days', sla: 90 },
  { id: 'WF-PEX', name: 'Payment exception', stages: ['Detect', 'Investigate', 'Correct', 'Approve'], active: 6, avgCycle: '1.6 days', sla: 92 },
];
export const ROUTING_CONFIG = [
  { id: 'RT-01', rule: 'Beneficiary changes → Policy Servicing queue; approval by team lead', enabled: true },
  { id: 'RT-02', rule: 'Disbursements over $250,000 → second-level approval', enabled: true },
  { id: 'RT-03', rule: 'Claims with minor beneficiaries → Claims specialist + Legal review', enabled: true },
  { id: 'RT-04', rule: 'Auto-assign by least workload within skill group', enabled: false },
];

export const CONTROL_RECORDS = [
  { id: 'CTL-AP-01', control: 'Dual approval for disbursements above authority', type: 'Financial control', evidence: '128 approvals sampled, 0 exceptions', period: 'Q3 2026', status: 'Effective' },
  { id: 'CTL-RC-04', control: 'Daily cash reconciliation', type: 'Reconciliation', evidence: 'GL-4110 break $412 open 2 days', period: 'Nov 2026', status: 'Exception noted' },
  { id: 'CTL-RG-02', control: 'Grace notices issued within statutory timeframe', type: 'Regulatory control', evidence: '3 notices due today', period: 'Nov 2026', status: 'Effective' },
  { id: 'CTL-AC-07', control: 'Quarterly privileged access certification', type: 'Access control', evidence: 'Certification 92% complete', period: 'Q4 2026', status: 'In Progress' },
  { id: 'CTL-RG-05', control: 'Sanctions screening on all payees before payment', type: 'Regulatory control', evidence: '100% screened, 1 potential match', period: 'Nov 2026', status: 'Effective' },
];
