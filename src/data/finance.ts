import { POLICIES } from './policies';
import { PEOPLE_FIRST, PEOPLE_LAST, STATES, gen, isoDay } from './seed';

/* ---------------- Billing & receipts ---------------- */
export interface Receipt {
  id: string;
  policyId: string;
  received: string;
  amount: number;
  source: 'Bank draft' | 'Lockbox' | 'Online portal' | 'Payroll deduction' | 'Agent remittance';
  method: 'ACH' | 'Check' | 'Card' | 'Wire';
  institution: string;
  bankRef: string;
  status: 'Posted' | 'Pending' | 'Suspense' | 'Rejected';
  recon: 'Reconciled' | 'Unreconciled' | 'Break';
}
const b = gen(3301);
const BANKS = ['First Harbor Bank', 'Summit National', 'Keystone Savings', 'Bayview Credit Union', 'Union Ridge Bank'];
const R_STATUS: Receipt['status'][] = ['Posted', 'Posted', 'Posted', 'Pending', 'Posted', 'Suspense', 'Posted', 'Rejected', 'Posted', 'Posted'];
export const RECEIPTS: Receipt[] = Array.from({ length: 24 }, (_, i) => {
  const p = POLICIES[(i * 5 + 1) % POLICIES.length];
  const status = R_STATUS[i % R_STATUS.length];
  return {
    id: `RCT-${880100 + i * 7}`,
    policyId: p.id,
    received: isoDay(-Math.floor(i / 4)),
    amount: p.premium || b.int(150, 900),
    source: b.pick(['Bank draft', 'Lockbox', 'Online portal', 'Payroll deduction', 'Agent remittance'] as const),
    method: b.pick(['ACH', 'ACH', 'Check', 'Card', 'Wire'] as const),
    institution: b.pick(BANKS),
    bankRef: `${b.int(100000000, 999999999)}${b.int(1000, 9999)}`,
    status,
    recon: status === 'Posted' ? (b.chance(0.85) ? 'Reconciled' : 'Unreconciled') : status === 'Rejected' ? 'Break' : 'Unreconciled',
  };
});

export interface BillingItem {
  id: string;
  policyId: string;
  mode: string;
  due: string;
  amount: number;
  status: 'Billed' | 'Paid' | 'Overdue' | 'Waived' | 'Grace Period';
  waiver?: string;
}
export const BILLING: BillingItem[] = POLICIES.filter((p) => p.premium > 0).slice(0, 20).map((p, i) => ({
  id: `BIL-${41200 + i * 3}`,
  policyId: p.id,
  mode: p.mode,
  due: p.nextDue,
  amount: p.premium,
  status: p.status === 'Grace Period' ? 'Grace Period' : i % 9 === 4 ? 'Waived' : i % 7 === 3 ? 'Overdue' : i % 3 === 0 ? 'Paid' : 'Billed',
  waiver: i % 9 === 4 ? 'Waiver of premium — disability' : undefined,
}));

export const AR_AGING = [
  { bucket: 'Current', amount: 1842300, count: 6120 },
  { bucket: '1–30 days', amount: 318400, count: 1032 },
  { bucket: '31–60 days', amount: 96200, count: 288 },
  { bucket: '61–90 days', amount: 41800, count: 117 },
  { bucket: '90+ days', amount: 22900, count: 64 },
];

export interface PaymentException {
  id: string;
  policyId: string;
  type: string;
  amount: number;
  raised: string;
  status: 'Open' | 'Investigating' | 'Resolved';
}
export const PAYMENT_EXCEPTIONS: PaymentException[] = [
  { id: 'PEX-7710', policyId: POLICIES[2].id, type: 'Bank reference mismatch', amount: 412.5, raised: isoDay(0), status: 'Open' },
  { id: 'PEX-7706', policyId: POLICIES[11].id, type: 'Payment returned — insufficient funds', amount: 228.14, raised: isoDay(-1), status: 'Investigating' },
  { id: 'PEX-7701', policyId: POLICIES[18].id, type: 'Overpayment — refund required', amount: 960, raised: isoDay(-2), status: 'Open' },
  { id: 'PEX-7695', policyId: POLICIES[24].id, type: 'Payment to closed policy', amount: 305.2, raised: isoDay(-3), status: 'Open' },
  { id: 'PEX-7690', policyId: POLICIES[31].id, type: 'Duplicate payment', amount: 145.88, raised: isoDay(-6), status: 'Resolved' },
];

export const WAIVERS = [
  { id: 'WVR-310', policyId: POLICIES[4].id, kind: 'Waiver of premium — disability', from: isoDay(-120), status: 'Active' },
  { id: 'WVR-306', policyId: POLICIES[13].id, kind: 'Loyalty discount 5%', from: isoDay(-300), status: 'Active' },
  { id: 'WVR-302', policyId: POLICIES[22].id, kind: 'Late fee waiver — hardship', from: isoDay(-14), status: 'Pending Approval' },
  { id: 'WVR-298', policyId: POLICIES[35].id, kind: 'Multi-policy discount 3%', from: isoDay(-500), status: 'Active' },
];

/* ---------------- Finance & reconciliation ---------------- */
export const FIN_MOVEMENTS = [
  { type: 'Premium income', count: 18420, amount: 6214300 },
  { type: 'Death benefit payments', count: 41, amount: -9820000 },
  { type: 'Surrenders & withdrawals', count: 312, amount: -4410200 },
  { type: 'Policy loans issued', count: 96, amount: -812400 },
  { type: 'Loan repayments', count: 241, amount: 655300 },
  { type: 'Commission payments', count: 1180, amount: -742600 },
  { type: 'Reinsurance premiums ceded', count: 1802, amount: -1104500 },
  { type: 'Reinsurance recoveries', count: 9, amount: 2650000 },
];

export interface GlAccount {
  id: string;
  name: string;
  pas: number;
  gl: number;
  status: 'Reconciled' | 'Break' | 'Under Review';
  owner: string;
}
export const GL_ACCOUNTS: GlAccount[] = [
  { id: 'GL-4100', name: 'Premium income — individual life', pas: 4182300, gl: 4182300, status: 'Reconciled', owner: 'Finance Ops' },
  { id: 'GL-4110', name: 'Premium income — annuities', pas: 2032000, gl: 2031588, status: 'Break', owner: 'Finance Ops' },
  { id: 'GL-2200', name: 'Premium suspense', pas: 186400, gl: 192210, status: 'Under Review', owner: 'Billing' },
  { id: 'GL-5100', name: 'Death benefits paid', pas: 9820000, gl: 9820000, status: 'Reconciled', owner: 'Claims Finance' },
  { id: 'GL-5200', name: 'Surrender benefits paid', pas: 4410200, gl: 4410200, status: 'Reconciled', owner: 'Claims Finance' },
  { id: 'GL-1400', name: 'Policy loans receivable', pas: 18240000, gl: 18239120, status: 'Break', owner: 'Finance Ops' },
  { id: 'GL-6100', name: 'Commission expense', pas: 742600, gl: 742600, status: 'Reconciled', owner: 'Distribution Finance' },
  { id: 'GL-2600', name: 'Reinsurance payable', pas: 1104500, gl: 1104500, status: 'Reconciled', owner: 'Reinsurance' },
];

export const FIN_CONTROLS = [
  { id: 'FC-01', name: 'Daily cash-to-premium reconciliation', frequency: 'Daily', lastTested: isoDay(-1), result: 'Passed' },
  { id: 'FC-04', name: 'Disbursement dual approval above authority', frequency: 'Per transaction', lastTested: isoDay(-3), result: 'Passed' },
  { id: 'FC-07', name: 'Suspense aging review', frequency: 'Weekly', lastTested: isoDay(-5), result: 'Exception noted' },
  { id: 'FC-09', name: 'GL interface completeness', frequency: 'Daily', lastTested: isoDay(0), result: 'Passed' },
  { id: 'FC-12', name: 'Policy loan interest accrual', frequency: 'Monthly', lastTested: isoDay(-11), result: 'Failed' },
];

/* ---------------- Reinsurance ---------------- */
export interface Treaty {
  id: string;
  name: string;
  reinsurer: string;
  type: 'YRT' | 'Coinsurance' | 'Modified coinsurance';
  retention: number;
  autoLimit: number;
  quotaShare: number;
  status: 'In force' | 'Under renegotiation';
}
export const TREATIES: Treaty[] = [
  { id: 'TRT-A12', name: 'Individual Life YRT 2019', reinsurer: 'Northbridge Re (synthetic)', type: 'YRT', retention: 1000000, autoLimit: 10000000, quotaShare: 50, status: 'In force' },
  { id: 'TRT-B07', name: 'Universal Life Coinsurance', reinsurer: 'Atlas Life Re (synthetic)', type: 'Coinsurance', retention: 750000, autoLimit: 7500000, quotaShare: 40, status: 'In force' },
  { id: 'TRT-C03', name: 'Annuity Modco Block', reinsurer: 'Meridian Re (synthetic)', type: 'Modified coinsurance', retention: 0, autoLimit: 0, quotaShare: 30, status: 'Under renegotiation' },
];

export interface Cession {
  id: string;
  policyId: string;
  treatyId: string;
  face: number;
  retained: number;
  ceded: number;
  percent: number;
  premium: number;
  status: 'Ceded' | 'Pending Approval' | 'Facultative Review' | 'Recovered';
}
const rg = gen(8811);
export const CESSIONS: Cession[] = POLICIES.filter((p) => p.faceAmount >= 600000 && p.product !== 'Fixed Annuity').slice(0, 12).map((p, i) => {
  const t = p.product.includes('Universal') ? TREATIES[1] : TREATIES[0];
  const retained = Math.min(p.faceAmount, t.retention);
  const ceded = Math.round(Math.max(p.faceAmount - retained, p.faceAmount * t.quotaShare / 100));
  return {
    id: `CES-${20400 + i * 11}`,
    policyId: p.id,
    treatyId: t.id,
    face: p.faceAmount,
    retained: p.faceAmount - ceded,
    ceded,
    percent: Math.round((ceded / p.faceAmount) * 100),
    premium: Math.round(ceded / 1000 * rg.int(9, 18) / 10 * 12),
    status: p.status === 'Claim Pending' || p.status === 'Claim Paid' ? 'Recovered' : i % 5 === 2 ? 'Pending Approval' : i % 7 === 4 ? 'Facultative Review' : 'Ceded',
  };
});

/* ---------------- Agents & commissions ---------------- */
export interface Agent {
  id: string;
  name: string;
  dealerGroup: string;
  commenced: string;
  email: string;
  phone: string;
  states: string[];
  licenseNo: string;
  licenseExpiry: string;
  regulatoryApproval: 'Approved' | 'Pending' | 'Expired';
  status: 'Active' | 'Suspended' | 'Pending Appointment';
  agreement: string;
}
const ag = gen(2290);
export const AGENTS: Agent[] = [
  { id: 'AGT-1001', name: 'Olivia Grant', dealerGroup: 'Independent', commenced: '2016-04-01', email: 'olivia.grant@example.com', phone: '(555) 410-2231', states: ['CT', 'NY', 'NC'], licenseNo: 'LIC-CT-448102', licenseExpiry: isoDay(410), regulatoryApproval: 'Approved', status: 'Active', agreement: 'Independent Producer Agreement v4 — FYC 55%, renewal 5% yrs 2–10' },
  { id: 'AGT-1002', name: 'Benson Advisory Group', dealerGroup: 'Benson Advisory Group', commenced: '2012-09-15', email: 'ops@bensonadvisory.example', phone: '(555) 220-7781', states: ['FL', 'TX', 'AZ'], licenseNo: 'LIC-FL-210377', licenseExpiry: isoDay(60), regulatoryApproval: 'Approved', status: 'Active', agreement: 'Dealer Group Agreement — FYC 60%, override 8%' },
  { id: 'AGT-1003', name: 'Northpoint Brokerage', dealerGroup: 'Northpoint Brokerage', commenced: '2019-01-07', email: 'licensing@northpoint.example', phone: '(555) 908-1144', states: ['OH', 'IL', 'CO'], licenseNo: 'LIC-OH-993104', licenseExpiry: isoDay(240), regulatoryApproval: 'Pending', status: 'Pending Appointment', agreement: 'Brokerage Agreement — FYC 50%, renewal 4%' },
  { id: 'AGT-1004', name: 'Crestline Partners', dealerGroup: 'Crestline Partners', commenced: '2014-06-30', email: 'admin@crestline.example', phone: '(555) 650-3390', states: ['CA', 'AZ'], licenseNo: 'LIC-CA-551908', licenseExpiry: isoDay(-12), regulatoryApproval: 'Expired', status: 'Suspended', agreement: 'Dealer Group Agreement — FYC 58%, override 6%' },
  ...Array.from({ length: 4 }, (_, i): Agent => ({
    id: `AGT-10${10 + i}`, name: `${PEOPLE_FIRST[i + 4]} ${PEOPLE_LAST[i + 9]}`, dealerGroup: ag.pick(['Benson Advisory Group', 'Northpoint Brokerage', 'Independent']), commenced: isoDay(-ag.int(400, 3000)),
    email: `${PEOPLE_FIRST[i + 4].toLowerCase()}@agents.example`, phone: `(555) ${ag.int(200, 899)}-${ag.int(1000, 9999)}`, states: [ag.pick(STATES), ag.pick(STATES)], licenseNo: `LIC-${ag.pick(STATES)}-${ag.int(100000, 999999)}`,
    licenseExpiry: isoDay(ag.int(30, 700)), regulatoryApproval: 'Approved', status: 'Active', agreement: 'Career Agent Agreement — FYC 50%, renewal 5%',
  })),
];

export interface Commission {
  id: string;
  agentId: string;
  policyId: string;
  kind: 'First-year' | 'Renewal' | 'Override' | 'Chargeback';
  amount: number;
  period: string;
  status: 'Pending Approval' | 'Approved' | 'Paid' | 'On Hold';
}
const cg = gen(1919);
const AGENT_BY_NAME: Record<string, string> = { 'Olivia Grant': 'AGT-1001', 'Benson Advisory Group': 'AGT-1002', 'Northpoint Brokerage': 'AGT-1003', 'Crestline Partners': 'AGT-1004' };
export const COMMISSIONS: Commission[] = POLICIES.slice(0, 26).map((p, i) => {
  const kind = i % 6 === 0 ? 'First-year' : i % 11 === 5 ? 'Chargeback' : i % 8 === 3 ? 'Override' : 'Renewal';
  const base = (p.premium || 200) * 12;
  return {
    id: `COM-${51800 + i * 5}`,
    agentId: AGENT_BY_NAME[p.agent] ?? 'AGT-1010',
    policyId: p.id,
    kind,
    amount: Math.round((kind === 'First-year' ? base * 0.55 : kind === 'Override' ? base * 0.08 : kind === 'Chargeback' ? -base * 0.3 : base * 0.05) * 100) / 100,
    period: cg.pick(['Oct 2026', 'Nov 2026']),
    status: i % 5 === 0 ? 'Pending Approval' : i % 7 === 2 ? 'On Hold' : i % 2 ? 'Paid' : 'Approved',
  };
});
export const COMMISSION_RUNS = [
  { id: 'CRUN-2611', period: 'Nov 2026 (1st cycle)', agents: 412, amount: 381200, status: 'Scheduled', date: isoDay(3) },
  { id: 'CRUN-2610B', period: 'Oct 2026 (2nd cycle)', agents: 398, amount: 362940, status: 'Paid', date: isoDay(-12) },
  { id: 'CRUN-2610A', period: 'Oct 2026 (1st cycle)', agents: 405, amount: 379660, status: 'Paid', date: isoDay(-27) },
];
