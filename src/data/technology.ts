import { POLICIES } from './policies';
import { isoAgo, isoDay } from './seed';

/* ---------------- Data extracts ---------------- */
export interface Extract {
  id: string;
  name: string;
  dataset: string;
  requestedBy: string;
  requested: string;
  sensitive: boolean;
  rows: number;
  status: 'Requested' | 'Pending Approval' | 'Approved' | 'Running' | 'Completed' | 'Failed';
}
export const DATASETS = [
  { id: 'inforce', name: 'In-force policy summary', sensitive: false },
  { id: 'transactions', name: 'Financial transactions', sensitive: false },
  { id: 'claims', name: 'Claims and beneficiaries', sensitive: true },
  { id: 'customers', name: 'Customer contact details', sensitive: true },
  { id: 'valuation', name: 'Valuation seriatim file', sensitive: true },
  { id: 'workflow', name: 'Workflow and SLA metrics', sensitive: false },
];
export const EXTRACTS: Extract[] = [
  { id: 'EXT-5521', name: 'Monthly in-force for reinsurance bordereau', dataset: 'In-force policy summary', requestedBy: 'Grace Kim', requested: isoDay(0), sensitive: false, rows: 412300, status: 'Pending Approval' },
  { id: 'EXT-5518', name: 'Q3 claims register for audit', dataset: 'Claims and beneficiaries', requestedBy: 'Andre Wallace', requested: isoDay(-1), sensitive: true, rows: 1840, status: 'Approved' },
  { id: 'EXT-5514', name: 'Premium receipts — October', dataset: 'Financial transactions', requestedBy: 'Samuel Ortiz', requested: isoDay(-2), sensitive: false, rows: 61220, status: 'Completed' },
  { id: 'EXT-5509', name: 'Customer mailing list — privacy notice', dataset: 'Customer contact details', requestedBy: 'Aisha Coleman', requested: isoDay(-3), sensitive: true, rows: 0, status: 'Requested' },
  { id: 'EXT-5502', name: 'Seriatim valuation file Sep 30', dataset: 'Valuation seriatim file', requestedBy: 'Nikhil Varma', requested: isoDay(-6), sensitive: true, rows: 412300, status: 'Failed' },
  { id: 'EXT-5498', name: 'SLA metrics by workflow', dataset: 'Workflow and SLA metrics', requestedBy: 'Robert Hayes', requested: isoDay(-8), sensitive: false, rows: 9300, status: 'Completed' },
];
export const WORKBENCH_REPORTS = [
  { name: 'Policies by status and product', area: 'Policy Administration', rows: 48 },
  { name: 'Claims cycle time', area: 'Claims & Benefits', rows: 8 },
  { name: 'Receipts by payment method', area: 'Financial Management', rows: 24 },
  { name: 'Underwriting decisions by class', area: 'Product & Actuarial', rows: 14 },
  { name: 'Service requests by channel', area: 'Customer Services', rows: 12 },
  { name: 'Open compliance checks', area: 'Compliance & Control', rows: 16 },
];

/* ---------------- Real-time feeds ---------------- */
export interface Feed {
  id: string;
  name: string;
  protocol: 'REST API' | 'Event stream' | 'Webhook' | 'Message queue';
  direction: 'Inbound' | 'Outbound' | 'Bidirectional';
  counterpart: string;
  rate: number;
  lagMs: number;
  status: 'Streaming' | 'Degraded' | 'Paused';
}
export const FEEDS: Feed[] = [
  { id: 'FD-PAY', name: 'Payment status events', protocol: 'Event stream', direction: 'Inbound', counterpart: 'Payments hub (simulated)', rate: 42, lagMs: 1820, status: 'Degraded' },
  { id: 'FD-POL', name: 'Policy change events', protocol: 'Event stream', direction: 'Outbound', counterpart: 'Data & analytics suite', rate: 18, lagMs: 140, status: 'Streaming' },
  { id: 'FD-CRM', name: 'Customer interaction sync', protocol: 'REST API', direction: 'Bidirectional', counterpart: 'Customer service layer', rate: 26, lagMs: 310, status: 'Streaming' },
  { id: 'FD-AGT', name: 'Agent portal quotes', protocol: 'REST API', direction: 'Inbound', counterpart: 'Agent & broker portal', rate: 9, lagMs: 260, status: 'Streaming' },
  { id: 'FD-CLM', name: 'Claim notifications', protocol: 'Webhook', direction: 'Inbound', counterpart: 'Claims layer', rate: 2, lagMs: 90, status: 'Streaming' },
  { id: 'FD-GL', name: 'General ledger postings', protocol: 'Message queue', direction: 'Outbound', counterpart: 'Finance ledger (simulated)', rate: 31, lagMs: 480, status: 'Streaming' },
];
export const EVENT_TEMPLATES = [
  (p: string) => ({ feed: 'FD-PAY', text: `payment.received · ${p} · ACH` }),
  (p: string) => ({ feed: 'FD-POL', text: `policy.updated · ${p} · address` }),
  (p: string) => ({ feed: 'FD-CRM', text: `interaction.closed · ${p} · chat` }),
  (p: string) => ({ feed: 'FD-GL', text: `ledger.posted · ${p} · premium income` }),
  (p: string) => ({ feed: 'FD-AGT', text: `quote.requested · ${p} · term 20` }),
  (p: string) => ({ feed: 'FD-CLM', text: `claim.notified · ${p}` }),
];
export const samplePolicy = (i: number) => POLICIES[i % POLICIES.length].id;

/* ---------------- Integration layers ---------------- */
export interface Layer {
  id: string;
  name: string;
  purpose: string;
  protocol: string;
  endpoint: string;
  sync: string;
  throughput: string;
  status: 'Healthy' | 'Degraded' | 'Down';
  owner: string;
}
export const LAYERS: Layer[] = [
  { id: 'csl', name: 'Customer Service Layer', purpose: 'Contact centre, chat and CRM interactions', protocol: 'REST API + events', endpoint: 'sim://customer-service.demo/v2', sync: 'Real time', throughput: '26 msg/min', status: 'Healthy', owner: 'Digital Channels' },
  { id: 'uwl', name: 'Underwriting Layer', purpose: 'Application intake, evidence and decisions', protocol: 'REST API', endpoint: 'sim://underwriting.demo/v1', sync: 'Real time', throughput: '4 msg/min', status: 'Healthy', owner: 'New Business IT' },
  { id: 'clm', name: 'Claims Layer', purpose: 'Claim notification, assessment and payment', protocol: 'Webhook + REST', endpoint: 'sim://claims.demo/v3', sync: 'Real time', throughput: '2 msg/min', status: 'Healthy', owner: 'Claims IT' },
  { id: 'prc', name: 'Pricing Layer', purpose: 'Rates and quotations', protocol: 'REST API', endpoint: 'sim://pricing.demo/v1', sync: 'On request', throughput: '9 msg/min', status: 'Healthy', owner: 'Product IT' },
  { id: 'dat', name: 'Data / Analytics Suite', purpose: 'Reporting, extracts and analytics', protocol: 'Event stream + batch', endpoint: 'sim://analytics.demo/stream', sync: 'Near real time', throughput: '18 msg/min', status: 'Healthy', owner: 'Data Engineering' },
  { id: 'bnl', name: 'Benefits & Loan Calculations', purpose: 'Benefit, surrender and loan values', protocol: 'REST API', endpoint: 'sim://calc.demo/benefits', sync: 'On request', throughput: '35 msg/min', status: 'Degraded', owner: 'Actuarial Systems' },
  { id: 'div', name: 'Dividend Systems', purpose: 'Dividend scale and allocation', protocol: 'Batch file + API', endpoint: 'sim://dividends.demo/v1', sync: 'Nightly', throughput: 'Batch', status: 'Healthy', owner: 'Actuarial Systems' },
];

/* ---------------- Routing & decisioning ---------------- */
export interface RoutingDecision {
  id: string;
  item: string;
  kind: 'Service triage' | 'Workflow routing' | 'Payment routing' | 'Third-party payment' | 'Bank payment' | 'Exception routing';
  rule: string;
  outcome: string;
  confidence: number;
  at: string;
}
export const ROUTING_DECISIONS: RoutingDecision[] = [
  { id: 'RD-91021', item: 'Withdrawal $62,400 · WDR-38129', kind: 'Workflow routing', rule: 'Disbursement > $50,000', outcome: 'Claims Manager approval queue', confidence: 100, at: isoAgo(4) },
  { id: 'RD-91019', item: 'Chat: "change my beneficiary"', kind: 'Service triage', rule: 'Intent: beneficiary change', outcome: 'Policy Servicing · beneficiary skill group', confidence: 94, at: isoAgo(9) },
  { id: 'RD-91016', item: 'Death claim payment · CLM-60472', kind: 'Bank payment', rule: 'Beneficiary bank verified', outcome: 'ACH via payments hub (simulated)', confidence: 100, at: isoAgo(15) },
  { id: 'RD-91012', item: 'Premium ACH return · PEX-7706', kind: 'Exception routing', rule: 'Return code R01', outcome: 'Billing exceptions queue · retry in 3 days', confidence: 100, at: isoAgo(22) },
  { id: 'RD-91008', item: 'Surrender to assignee · WDR-38147', kind: 'Third-party payment', rule: 'Collateral assignment on file', outcome: 'Pay assignee first, remainder to owner', confidence: 100, at: isoAgo(38) },
  { id: 'RD-91004', item: 'Email: "statement not received"', kind: 'Service triage', rule: 'Intent: statement copy', outcome: 'Auto-reply + Statement Request task', confidence: 88, at: isoAgo(51) },
  { id: 'RD-90998', item: 'Commission payment · CRUN-2611', kind: 'Payment routing', rule: 'Agent license active', outcome: 'Included in commission run', confidence: 100, at: isoAgo(70) },
  { id: 'RD-90991', item: 'Address change from portal', kind: 'Workflow routing', rule: 'No financial impact + verified identity', outcome: 'Straight-through processed', confidence: 97, at: isoAgo(95) },
];
export const ROUTING_RULES = [
  { id: 'RR-01', name: 'High-value disbursement approval', condition: 'amount > $50,000', action: 'Route to manager approval', enabled: true },
  { id: 'RR-02', name: 'Straight-through address change', condition: 'identity verified AND no financial impact', action: 'Auto-complete', enabled: true },
  { id: 'RR-03', name: 'Minor beneficiary claims', condition: 'beneficiary.age < 18', action: 'Route to claims specialist + legal', enabled: true },
  { id: 'RR-04', name: 'Sanctions hold on payments', condition: 'payee screening = potential match', action: 'Hold payment, route to compliance', enabled: true },
  { id: 'RR-05', name: 'Chat intent triage', condition: 'intent confidence ≥ 85%', action: 'Route to skill group', enabled: false },
];
export const TRIAGE_SAMPLES = [
  { input: 'Customer emails: "I want to take out $10,000 from my policy"', steps: ['Intent detected: withdrawal (91%)', 'Policy has cash value $48,200 → eligible', 'Amount ≤ $50,000 → standard approval', 'Created Redemption Request, routed to Financial Transactions queue'] },
  { input: 'Funeral home faxes a death certificate', steps: ['Document classified: proof of death (97%)', 'Matched to claim CLM-60412 by policy number', 'Requirement marked received', 'Claim moved to assessment, assigned to claims specialist'] },
  { input: 'ACH premium returned with code R01', steps: ['Return code R01 = insufficient funds', 'First return in 12 months → retry allowed', 'Retry scheduled in 3 business days', 'Customer notification letter queued'] },
];

/* ---------------- System monitoring extras ---------------- */
export const ERROR_SUMMARY = [
  { service: 'premium-post', errors: 37, trend: 'Rising' },
  { service: 'payments-gw', errors: 12, trend: 'Stable' },
  { service: 'corr-print', errors: 3, trend: 'Falling' },
  { service: 'calc-benefits', errors: 5, trend: 'Rising' },
  { service: 'portal', errors: 1, trend: 'Stable' },
];
export const SECURITY_INDICATORS = [
  { name: 'Failed sign-in attempts (24h)', value: '142', status: 'Normal' },
  { name: 'Privileged sessions active', value: '6', status: 'Normal' },
  { name: 'Unusual access patterns', value: '1', status: 'Under Review' },
  { name: 'Certificates expiring (30 days)', value: '2', status: 'Warning' },
];
export const PERFORMANCE = [
  { name: 'Policy search', p95: '420 ms', target: '800 ms', status: 'Met' },
  { name: 'Benefit calculation', p95: '2.1 s', target: '1.5 s', status: 'Breached' },
  { name: 'Task queue load', p95: '310 ms', target: '600 ms', status: 'Met' },
  { name: 'Portal sign-in', p95: '890 ms', target: '1.2 s', status: 'Met' },
];
