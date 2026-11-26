import type { GroupId } from '../config/groups';
import type { Tier } from '../config/tiers';
import type { ModuleId } from '../config/modules';
import { POLICIES } from './policies';

const now = Date.now();
const ago = (minutes: number) => new Date(now - minutes * 60000).toISOString();

/* ---------- Alerts & exceptions (business) ---------- */
export type Severity = 'Critical' | 'Warning' | 'Info';
export interface ExceptionItem {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  /** Internal criticality metadata (never displayed). */
  tier: Tier;
  module: ModuleId;
  groups: GroupId[];
  source: string;
  policyId?: string;
  createdAt: string;
  resolved: boolean;
}

export const SEED_EXCEPTIONS: ExceptionItem[] = [
  { id: 'EXC-30112', title: 'Grace period notices due today', detail: '3 policies in grace period have notices due before 17:00 local time.', severity: 'Critical', tier: 1, module: 'statements', groups: ['G1', 'G4'], source: 'Correspondence engine', policyId: POLICIES[3].id, createdAt: ago(48), resolved: false },
  { id: 'EXC-30108', title: 'Premium posted to closed policy', detail: 'Payment of $412.50 posted to a surrendered policy and moved to suspense.', severity: 'Warning', tier: 2, module: 'billing', groups: ['G1', 'G2'], source: 'Premium posting batch', policyId: POLICIES[8].id, createdAt: ago(130), resolved: false },
  { id: 'EXC-30104', title: 'Beneficiary shares do not total 100%', detail: 'Primary beneficiary allocation totals 90% after a partial update.', severity: 'Critical', tier: 1, module: 'policy-changes', groups: ['G1'], source: 'Policy validation rules', policyId: POLICIES[12].id, createdAt: ago(210), resolved: false },
  { id: 'EXC-30099', title: 'Address returned as undeliverable', detail: 'Annual statement returned by the postal service.', severity: 'Info', tier: 2, module: 'statements', groups: ['G1'], source: 'Mailroom', policyId: POLICIES[15].id, createdAt: ago(380), resolved: false },
  { id: 'EXC-30097', title: 'Disbursement above delegated authority', detail: 'Death claim payout of $1.25M requires second-level approval.', severity: 'Critical', tier: 1, module: 'death-claims', groups: ['G2', 'G4'], source: 'Disbursement controls', policyId: POLICIES[20].id, createdAt: ago(95), resolved: false },
  { id: 'EXC-30093', title: 'Suspense items aging over 30 days', detail: '14 unapplied cash items older than 30 days.', severity: 'Warning', tier: 2, module: 'billing', groups: ['G2', 'G4'], source: 'Suspense ledger', createdAt: ago(600), resolved: false },
  { id: 'EXC-30090', title: '1099-R cost basis mismatch', detail: 'Reported taxable amount differs from recalculated basis.', severity: 'Warning', tier: 1, module: 'tax-compliance', groups: ['G3'], source: 'Tax reporting', policyId: POLICIES[6].id, createdAt: ago(720), resolved: false },
  { id: 'EXC-30087', title: 'Reinsurance cession over treaty limit', detail: 'Face amount exceeds automatic binding limit.', severity: 'Warning', tier: 2, module: 'reinsurance', groups: ['G3'], source: 'Reinsurance admin', policyId: POLICIES[17].id, createdAt: ago(900), resolved: false },
  { id: 'EXC-30081', title: 'Unusual access pattern detected', detail: 'Bulk policy lookups from a single session outside business hours.', severity: 'Critical', tier: 1, module: 'monitoring', groups: ['G4', 'G5'], source: 'Security monitoring', createdAt: ago(55), resolved: false },
  { id: 'EXC-30076', title: 'Complaint response nearing deadline', detail: 'Regulatory complaint response due in 2 business days.', severity: 'Warning', tier: 2, module: 'customer-service', groups: ['G4'], source: 'Complaints register', createdAt: ago(1500), resolved: false },
  { id: 'EXC-30070', title: 'Identity verification pending', detail: 'Authorized representative awaiting verification before access.', severity: 'Info', tier: 1, module: 'self-service', groups: ['G6', 'G1'], source: 'Digital portal', createdAt: ago(240), resolved: false },
  { id: 'EXC-30120', title: 'Premium payment rejected: bank reference mismatch', detail: 'ACH receipt could not be matched to the policy bank reference on file.', severity: 'Critical', tier: 1, module: 'billing', groups: ['G1', 'G2'], source: 'Payment receipts', policyId: POLICIES[2].id, createdAt: ago(70), resolved: false },
  { id: 'EXC-30118', title: 'Death claim missing proof of death', detail: 'Claim registered 12 days ago without a certified death certificate.', severity: 'Warning', tier: 1, module: 'death-claims', groups: ['G1', 'G2'], source: 'Claims requirements', policyId: POLICIES[16].id, createdAt: ago(160), resolved: false },
  { id: 'EXC-30061', title: 'Duplicate service request', detail: 'Same address change submitted twice through the portal.', severity: 'Info', tier: 2, module: 'self-service', groups: ['G1', 'G6'], source: 'Digital portal', createdAt: ago(2000), resolved: true },
];

/* ---------- Support / Service ---------- */
export type IncidentStatus = 'Investigating' | 'Identified' | 'Monitoring' | 'Resolved';
export interface Incident {
  id: string;
  title: string;
  severity: 'Sev 1' | 'Sev 2' | 'Sev 3' | 'Sev 4';
  service: string;
  team: string;
  status: IncidentStatus;
  openedAt: string;
  owner: string;
}
export const SEED_INCIDENTS: Incident[] = [
  { id: 'INC-7741', title: 'Premium posting batch partially failed', severity: 'Sev 2', service: 'Billing & Collections', team: 'Batch Operations', status: 'Identified', openedAt: ago(140), owner: 'U12' },
  { id: 'INC-7739', title: 'Payments gateway latency above threshold', severity: 'Sev 3', service: 'Payments Interface', team: 'Integration Support', status: 'Investigating', openedAt: ago(65), owner: 'U12' },
  { id: 'INC-7735', title: 'Correspondence PDFs rendering blank page', severity: 'Sev 3', service: 'Document Generation', team: 'Application Support', status: 'Monitoring', openedAt: ago(400), owner: 'U14' },
  { id: 'INC-7731', title: 'Agent portal login intermittently slow', severity: 'Sev 4', service: 'Digital Portal', team: 'Digital Channels', status: 'Investigating', openedAt: ago(800), owner: 'U12' },
  { id: 'INC-7720', title: 'Nightly valuation extract delayed', severity: 'Sev 3', service: 'Actuarial Extracts', team: 'Data Engineering', status: 'Resolved', openedAt: ago(2400), owner: 'U12' },
];

export type JobStatus = 'Succeeded' | 'Failed' | 'Running' | 'Delayed';
export interface BatchJob {
  id: string;
  name: string;
  schedule: string;
  lastRun: string;
  duration: string;
  records: number;
  errors: number;
  status: JobStatus;
}
export const SEED_BATCH: BatchJob[] = [
  { id: 'JOB-PRM-01', name: 'Premium posting', schedule: 'Daily 01:00', lastRun: ago(520), duration: '42m', records: 18420, errors: 37, status: 'Failed' },
  { id: 'JOB-BIL-02', name: 'Billing notice generation', schedule: 'Daily 02:30', lastRun: ago(430), duration: '18m', records: 6230, errors: 0, status: 'Succeeded' },
  { id: 'JOB-VAL-03', name: 'Valuation extract', schedule: 'Daily 03:00', lastRun: ago(400), duration: '1h 05m', records: 412300, errors: 0, status: 'Succeeded' },
  { id: 'JOB-DIS-04', name: 'Disbursement file to bank', schedule: 'Daily 06:00', lastRun: ago(15), duration: '—', records: 0, errors: 0, status: 'Running' },
  { id: 'JOB-COR-05', name: 'Correspondence print stream', schedule: 'Daily 04:00', lastRun: ago(350), duration: '27m', records: 2140, errors: 3, status: 'Delayed' },
  { id: 'JOB-TAX-06', name: '1099-R regeneration', schedule: 'On demand', lastRun: ago(1440), duration: '12m', records: 311, errors: 0, status: 'Succeeded' },
  { id: 'JOB-REI-07', name: 'Reinsurance cession feed', schedule: 'Weekly Mon', lastRun: ago(3000), duration: '9m', records: 1802, errors: 0, status: 'Succeeded' },
];

export interface Integration {
  name: string;
  status: 'Healthy' | 'Degraded' | 'Down';
  latency: string;
  pending: number;
}
export const SEED_INTEGRATIONS: Integration[] = [
  { name: 'Payments gateway', status: 'Degraded', latency: '1.8s', pending: 46 },
  { name: 'General ledger', status: 'Healthy', latency: '210ms', pending: 0 },
  { name: 'Agent & broker portal', status: 'Healthy', latency: '340ms', pending: 3 },
  { name: 'Document management', status: 'Healthy', latency: '280ms', pending: 0 },
  { name: 'Reinsurance exchange', status: 'Healthy', latency: '520ms', pending: 12 },
  { name: 'Identity verification', status: 'Healthy', latency: '190ms', pending: 0 },
];

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
export interface AccessRequest {
  id: string;
  userName: string;
  requested: string;
  justification: string;
  requestedAt: string;
  status: RequestStatus;
  /** Internal criticality metadata (never displayed). */
  tier: Tier;
}
export const SEED_ACCESS: AccessRequest[] = [
  { id: 'ACR-5521', userName: 'Daniel Brooks', requested: 'Financial & Claims — View', justification: 'Needs read-only premium history for inquiries.', requestedAt: ago(180), status: 'Pending', tier: 2 },
  { id: 'ACR-5519', userName: 'Laura Mendes', requested: 'Data & Analytics — Create', justification: 'Year-end tax extract preparation.', requestedAt: ago(420), status: 'Pending', tier: 1 },
  { id: 'ACR-5516', userName: 'Northpoint Brokerage (External)', requested: 'Self-Service — Policy inquiry', justification: 'New broker of record for 12 policies.', requestedAt: ago(900), status: 'Pending', tier: 1 },
  { id: 'ACR-5510', userName: 'Tom Becker', requested: 'System Monitoring — Edit', justification: 'Release 4.12 regression support.', requestedAt: ago(1800), status: 'Approved', tier: 2 },
];

export interface ChangeItem {
  id: string;
  title: string;
  kind: 'Release' | 'Change';
  risk: 'Low' | 'Medium' | 'High';
  window: string;
  status: 'Awaiting approval' | 'Scheduled' | 'In testing' | 'Approved' | 'Rejected' | 'Deployed';
  affectsContractualValues: boolean;
}
export const SEED_CHANGES: ChangeItem[] = [
  { id: 'REL-4.12', title: 'Release 4.12 — premium calculation fixes', kind: 'Release', risk: 'High', window: 'Sat 22:00–02:00', status: 'In testing', affectsContractualValues: true },
  { id: 'CHG-2290', title: 'Payments gateway connection pool tuning', kind: 'Change', risk: 'Medium', window: 'Thu 20:00–21:00', status: 'Awaiting approval', affectsContractualValues: false },
  { id: 'CHG-2287', title: 'Correspondence template update — grace notice', kind: 'Change', risk: 'Low', window: 'Wed 19:00–19:30', status: 'Awaiting approval', affectsContractualValues: false },
  { id: 'REL-4.11', title: 'Release 4.11 — portal enhancements', kind: 'Release', risk: 'Low', window: 'Completed', status: 'Deployed', affectsContractualValues: false },
];

export interface LogLine {
  at: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  service: string;
  message: string;
}
export const SEED_LOGS: LogLine[] = [
  { at: ago(3), level: 'WARN', service: 'payments-gw', message: 'Upstream response 1820ms exceeds 1500ms threshold' },
  { at: ago(9), level: 'INFO', service: 'disbursement', message: 'Disbursement file assembly started (batch 2026-11-10)' },
  { at: ago(14), level: 'ERROR', service: 'premium-post', message: 'Policy ML-40265890 closed — payment routed to suspense' },
  { at: ago(26), level: 'INFO', service: 'auth', message: 'Access review export generated for Q4 certification' },
  { at: ago(41), level: 'WARN', service: 'corr-print', message: 'Print vendor SFTP acknowledgement delayed' },
  { at: ago(60), level: 'ERROR', service: 'premium-post', message: '37 records rejected: invalid paid-to date sequence' },
  { at: ago(95), level: 'INFO', service: 'valuation', message: 'Extract completed: 412,300 records' },
  { at: ago(130), level: 'INFO', service: 'portal', message: 'Session pool scaled from 8 to 12 nodes' },
  { at: ago(220), level: 'WARN', service: 'security', message: 'Rate limit triggered: bulk lookup pattern (session 8f2c…)' },
  { at: ago(300), level: 'INFO', service: 'batch', message: 'Billing notice generation succeeded (6,230 notices)' },
];

/** 7-day SLA compliance and completions for team performance (synthetic). */
export const SLA_TREND = [
  { day: 'Wed', sla: 93.1, completed: 41 },
  { day: 'Thu', sla: 94.6, completed: 46 },
  { day: 'Fri', sla: 91.8, completed: 38 },
  { day: 'Mon', sla: 95.2, completed: 52 },
  { day: 'Tue', sla: 96.0, completed: 49 },
  { day: 'Wed', sla: 92.7, completed: 44 },
  { day: 'Today', sla: 94.1, completed: 23 },
];
