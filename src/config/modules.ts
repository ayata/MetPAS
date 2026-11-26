import {
  ArrowRightLeft, Activity, AlertOctagon, BarChart3, Bell, Briefcase, Calculator, ClipboardCheck, Cpu, Database,
  FileCheck2, FilePen, FileText, Gavel, Globe, Headset, HeartHandshake, History, Inbox, Landmark, LayoutDashboard,
  LifeBuoy, ListChecks, Mail, MonitorSmartphone, Network, Puzzle, Radio, Receipt, Route, Scale, Search, Settings,
  ShieldCheck, Stethoscope, TrendingUp, UserCog, Users, Wallet, Workflow, type LucideIcon,
} from 'lucide-react';

/**
 * Business module catalog — the functional architecture of the Policy Administration System.
 * Navigation, permissions, task routing and the permission matrix are all derived from this list.
 */
export type ModuleId =
  | 'work'
  | 'policy-master' | 'policy-changes' | 'riders'
  | 'death-claims' | 'withdrawals' | 'benefit-calcs'
  | 'billing' | 'finance-recon' | 'reinsurance' | 'commissions'
  | 'calc-engines' | 'valuation' | 'pricing' | 'underwriting'
  | 'customer-service' | 'statements' | 'self-service'
  | 'tax-compliance' | 'regulatory' | 'workflow' | 'audit'
  | 'data-extracts' | 'data-feeds' | 'integrations' | 'routing' | 'monitoring'
  | 'access' | 'permissions';

export type AreaId = 'work' | 'policy' | 'claims' | 'financial' | 'product' | 'customer' | 'compliance' | 'technology' | 'admin';

export interface AreaDef {
  id: AreaId;
  name: string;
  icon: LucideIcon;
}

export const AREAS: AreaDef[] = [
  { id: 'work', name: 'My Work', icon: LayoutDashboard },
  { id: 'policy', name: 'Policy Administration', icon: FileText },
  { id: 'claims', name: 'Claims & Benefits', icon: HeartHandshake },
  { id: 'financial', name: 'Financial Management', icon: Landmark },
  { id: 'product', name: 'Product & Actuarial', icon: Calculator },
  { id: 'customer', name: 'Customer Services', icon: Headset },
  { id: 'compliance', name: 'Compliance & Control', icon: Scale },
  { id: 'technology', name: 'Technology', icon: Cpu },
  { id: 'admin', name: 'Administration', icon: Settings },
];

export interface ModuleDef {
  id: ModuleId;
  name: string;
  area: AreaId;
  path: string;
  icon: LucideIcon;
  description: string;
}

export const MODULE_CATALOG: ModuleDef[] = [
  { id: 'work', name: 'Work Queue & Tasks', area: 'work', path: '/work', icon: Inbox, description: 'Tasks, queues and exceptions' },

  { id: 'policy-master', name: 'Policy Master File', area: 'policy', path: '/policies', icon: FileText, description: 'Customer and policy records, coverage, beneficiaries and history' },
  { id: 'policy-changes', name: 'Policy Changes', area: 'policy', path: '/policy-changes', icon: FilePen, description: 'Changes to existing policies and their values' },
  { id: 'riders', name: 'Policy Riders', area: 'policy', path: '/riders', icon: Puzzle, description: 'Rider terms, eligibility, conditions and status' },

  { id: 'death-claims', name: 'Death Claims', area: 'claims', path: '/claims/death', icon: HeartHandshake, description: 'Death notifications, claim assessment and benefit payment' },
  { id: 'withdrawals', name: 'Redemptions & Withdrawals', area: 'claims', path: '/claims/withdrawals', icon: ArrowRightLeft, description: 'Full, partial and percentage-based withdrawals' },
  { id: 'benefit-calcs', name: 'Benefit Calculations', area: 'claims', path: '/claims/benefits', icon: Calculator, description: 'Authorized benefit calculation outputs' },

  { id: 'billing', name: 'Billing & Payments', area: 'financial', path: '/finance/billing', icon: Receipt, description: 'Premium billing, receipts, receivables and payment exceptions' },
  { id: 'finance-recon', name: 'Finance & Reconciliation', area: 'financial', path: '/finance/reconciliation', icon: Wallet, description: 'Financial movements, GL reconciliation and controls' },
  { id: 'reinsurance', name: 'Reinsurance', area: 'financial', path: '/finance/reinsurance', icon: ShieldCheck, description: 'Cessions, treaties, calculations and approvals' },
  { id: 'commissions', name: 'Agent & Commission', area: 'financial', path: '/finance/commissions', icon: Briefcase, description: 'Agents, licensing, commissions and payments' },

  { id: 'calc-engines', name: 'Calculation Engines', area: 'product', path: '/product/calculations', icon: Cpu, description: 'Surrender, lapse, guarantee, interest and dividend engines' },
  { id: 'valuation', name: 'Valuation & Analysis', area: 'product', path: '/product/valuation', icon: TrendingUp, description: 'Valuation, scenario and product performance analysis' },
  { id: 'pricing', name: 'Pricing', area: 'product', path: '/product/pricing', icon: BarChart3, description: 'Pricing scenarios, comparisons and outcomes' },
  { id: 'underwriting', name: 'Underwriting', area: 'product', path: '/product/underwriting', icon: Stethoscope, description: 'Underwriting decisions, conditions and requirements' },

  { id: 'customer-service', name: 'Customer Service', area: 'customer', path: '/customer/service', icon: Headset, description: 'Customer interactions, service requests and inquiries' },
  { id: 'statements', name: 'Statements & Correspondence', area: 'customer', path: '/customer/statements', icon: Mail, description: 'Statements, letters and delivery tracking' },
  { id: 'self-service', name: 'Self-Service', area: 'customer', path: '/customer/portal', icon: MonitorSmartphone, description: 'Policyholder portal and digital requests' },

  { id: 'tax-compliance', name: 'Tax & Compliance', area: 'compliance', path: '/compliance/tax', icon: Gavel, description: 'Tax classification, AML, sanctions and compliance checks' },
  { id: 'regulatory', name: 'Regulatory Reporting', area: 'compliance', path: '/compliance/regulatory', icon: FileCheck2, description: 'Regulatory reports, deadlines, evidence and submissions' },
  { id: 'workflow', name: 'Workflow & Approvals', area: 'compliance', path: '/compliance/workflow', icon: Workflow, description: 'Workflow stages, routing, approvals and escalations' },
  { id: 'audit', name: 'Audit & Controls', area: 'compliance', path: '/compliance/audit', icon: ClipboardCheck, description: 'Audit trails, control evidence and access activity' },

  { id: 'data-extracts', name: 'Data & Analytics', area: 'technology', path: '/tech/extracts', icon: Database, description: 'Extract requests, workbench reports and summaries' },
  { id: 'data-feeds', name: 'Real-Time Data Feeds', area: 'technology', path: '/tech/feeds', icon: Radio, description: 'API and event-driven feeds, synchronization status' },
  { id: 'integrations', name: 'Integration Management', area: 'technology', path: '/tech/integrations', icon: Network, description: 'Connected capability layers and integration health' },
  { id: 'routing', name: 'Automated Routing', area: 'technology', path: '/tech/routing', icon: Route, description: 'Automated triage, routing and decision support' },
  { id: 'monitoring', name: 'System Monitoring', area: 'technology', path: '/operations', icon: Activity, description: 'System health, batch, incidents, errors and alerts' },

  { id: 'access', name: 'User & Access Management', area: 'admin', path: '/access', icon: UserCog, description: 'Users, profiles and access requests' },
  { id: 'permissions', name: 'Role & Permissions', area: 'admin', path: '/admin/permissions', icon: ShieldCheck, description: 'Permission profiles, module and data access' },
];

export const moduleById = (id: ModuleId) => MODULE_CATALOG.find((m) => m.id === id)!;
export const areaById = (id: AreaId) => AREAS.find((a) => a.id === id)!;

/** Icons reused by navigation entries that are not business modules. */
export const NAV_ICONS = { LayoutDashboard, ListChecks, Inbox, Users, AlertOctagon, Search, Bell, History, Settings, LifeBuoy, Globe };
