import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { AppStoreProvider, useStore } from './store/AppStore';
import { navItemById } from './config/navigation';
import { AppShell } from './layout/AppShell';
import { Empty, Panel } from './components/ui';
import { NoAccess } from './components/NoAccess';
import { DashboardHome } from './features/dashboard/DashboardHome';
import { WorkQueuePage } from './features/work/WorkQueuePage';
import { TaskPage } from './features/work/TaskPage';
import { ExceptionsPage } from './features/work/ExceptionsPage';
import { PolicySearchPage } from './features/policies/PolicySearchPage';
import { PolicyDetailsPage, PolicyRecentRedirect } from './features/policies/PolicyDetailsPage';
import { PolicyChangesPage } from './features/policyAdmin/PolicyChangesPage';
import { RidersPage } from './features/policyAdmin/RidersPage';
import { DeathClaimsPage } from './features/claims/DeathClaimsPage';
import { WithdrawalsPage } from './features/claims/WithdrawalsPage';
import { BenefitCalcsPage } from './features/claims/BenefitCalcsPage';
import { BillingPage } from './features/finance/BillingPage';
import { ReconciliationPage } from './features/finance/ReconciliationPage';
import { ReinsurancePage } from './features/finance/ReinsurancePage';
import { CommissionsPage } from './features/finance/CommissionsPage';
import { CalcEnginesPage } from './features/product/CalcEnginesPage';
import { ValuationPage } from './features/product/ValuationPage';
import { PricingPage } from './features/product/PricingPage';
import { UnderwritingPage } from './features/product/UnderwritingPage';
import { CustomerServicePage } from './features/customer/CustomerServicePage';
import { StatementsPage } from './features/customer/StatementsPage';
import { SelfServicePage } from './features/customer/SelfServicePage';
import { TaxCompliancePage } from './features/compliance/TaxCompliancePage';
import { RegulatoryPage } from './features/compliance/RegulatoryPage';
import { WorkflowPage } from './features/compliance/WorkflowPage';
import { AuditPage } from './features/compliance/AuditPage';
import { ExtractsPage } from './features/technology/ExtractsPage';
import { DataFeedsPage } from './features/technology/DataFeedsPage';
import { IntegrationsPage } from './features/technology/IntegrationsPage';
import { RoutingPage } from './features/technology/RoutingPage';
import { RolePermissionsPage } from './features/framework/RolePermissionsPage';
import { AccessManagementPage } from './features/framework/AccessManagementPage';
import { NotificationsPage } from './features/system/NotificationsPage';
import { ActivityPage } from './features/system/ActivityPage';
import { HelpPage } from './features/system/HelpPage';
import { SettingsPage } from './features/system/SettingsPage';
import { OperationsPage } from './features/operations/OperationsPage';
import { LoginPage } from './features/auth/LoginPage';
import { SelectPlatformPage } from './features/auth/SelectPlatformPage';

/** Routes reuse the navigation visibility rules, so switching profile never strands a user on a forbidden page. */
function Guard({ nav, children }: { nav: string; children: ReactNode }) {
  const store = useStore();
  if (navItemById(nav)?.visible(store)) return <>{children}</>;
  return <NoAccess nav={nav} />;
}

/** Sends signed-out visitors to the demonstration sign-in page, remembering where they were going. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const { pathname, search } = useLocation();
  if (!state.signedIn) return <Navigate to="/login" replace state={{ from: pathname + search }} />;
  if (!state.platform) return <Navigate to="/select-system" replace state={{ from: pathname + search }} />;
  return <>{children}</>;
}

const g = (nav: string, el: ReactNode) => <Guard nav={nav}>{el}</Guard>;

/** The work views share one page; each sidebar view keeps its own access rule (e.g. Team Queue is manager-only). */
const WORK_VIEW_NAV: Record<string, string> = { mine: 'my-tasks', all: 'queue', team: 'team' };
function WorkRoute() {
  const [params] = useSearchParams();
  const nav = WORK_VIEW_NAV[params.get('view') ?? ''];
  return nav ? <Guard nav={nav}><WorkQueuePage /></Guard> : <WorkQueuePage />;
}

export default function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="select-system" element={<SelectPlatformPage />} />
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<DashboardHome />} />
            <Route path="work" element={<WorkRoute />} />
            <Route path="work/tasks/:id" element={<TaskPage />} />
            <Route path="exceptions" element={g('exceptions', <ExceptionsPage />)} />

            <Route path="policies" element={g('policy-search', <PolicySearchPage />)} />
            <Route path="policies/recent" element={g('policy-master', <PolicyRecentRedirect />)} />
            <Route path="policies/:id" element={<PolicyDetailsPage />} />
            <Route path="policy-changes" element={g('policy-changes', <PolicyChangesPage />)} />
            <Route path="riders" element={g('riders', <RidersPage />)} />

            <Route path="claims/death" element={g('death-claims', <DeathClaimsPage />)} />
            <Route path="claims/withdrawals" element={g('withdrawals', <WithdrawalsPage />)} />
            <Route path="claims/benefits" element={g('benefit-calcs', <BenefitCalcsPage />)} />

            <Route path="finance/billing" element={g('billing', <BillingPage />)} />
            <Route path="finance/reconciliation" element={g('finance-recon', <ReconciliationPage />)} />
            <Route path="finance/reinsurance" element={g('reinsurance', <ReinsurancePage />)} />
            <Route path="finance/commissions" element={g('commissions', <CommissionsPage />)} />

            <Route path="product/calculations" element={g('calc-engines', <CalcEnginesPage />)} />
            <Route path="product/valuation" element={g('valuation', <ValuationPage />)} />
            <Route path="product/pricing" element={g('pricing', <PricingPage />)} />
            <Route path="product/underwriting" element={g('underwriting', <UnderwritingPage />)} />

            <Route path="customer/service" element={g('customer-service', <CustomerServicePage />)} />
            <Route path="customer/statements" element={g('statements', <StatementsPage />)} />
            <Route path="customer/portal" element={g('self-service', <SelfServicePage />)} />

            <Route path="compliance/tax" element={g('tax-compliance', <TaxCompliancePage />)} />
            <Route path="compliance/regulatory" element={g('regulatory', <RegulatoryPage />)} />
            <Route path="compliance/workflow" element={g('workflow', <WorkflowPage />)} />
            <Route path="compliance/audit" element={g('audit', <AuditPage />)} />

            <Route path="tech/extracts" element={g('data-extracts', <ExtractsPage />)} />
            <Route path="tech/feeds" element={g('data-feeds', <DataFeedsPage />)} />
            <Route path="tech/integrations" element={g('integrations', <IntegrationsPage />)} />
            <Route path="tech/routing" element={g('routing', <RoutingPage />)} />
            <Route path="operations" element={g('monitoring', <OperationsPage />)} />

            <Route path="access" element={g('access', <AccessManagementPage />)} />
            <Route path="admin/permissions" element={g('permissions', <RolePermissionsPage />)} />
            <Route path="framework/permissions" element={<Navigate to="/admin/permissions" replace />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="activity" element={g('activity', <ActivityPage />)} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="*" element={<div className="page"><Panel><Empty title="Page not found" action={<Link to="/" className="btn btn-secondary">Go to dashboard</Link>} /></Panel></div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStoreProvider>
  );
}
