import { FileBarChart, Play } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { PRODUCT_PERFORMANCE, SCENARIOS, VALUATION_BY_LINE, VALUATION_REPORTS } from '../../data/product';
import { BarList, DataTable, GatedButton, Indicative, KV, ModulePage, RestrictedSection, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'summary' | 'scenarios' | 'performance' | 'reports' | 'assumptions';

export function ValuationPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('summary');
  const total = VALUATION_BY_LINE.reduce((a, l) => a + l.reserve, 0);
  const scenarios = SCENARIOS.map((s) => ({ ...s, status: store.statusOf(`SCN-${s.name}`, s.status) }));

  return (
    <ModulePage
      module="valuation"
      lead="Illustrative valuation summaries, scenario and sensitivity analysis, and product performance."
      kpis={[
        { label: 'Total reserves', value: `$${(total / 1000).toFixed(2)}B`, sub: 'Statutory · synthetic', onClick: () => setTab('summary') },
        { label: 'Valuation date', value: 'Sep 30', sub: 'Q3 close in progress' },
        { label: 'Scenarios run', value: scenarios.filter((s) => s.status === 'Completed').length, sub: `${scenarios.length - scenarios.filter((s) => s.status === 'Completed').length} running or queued`, onClick: () => setTab('scenarios') },
        { label: 'Product lines', value: VALUATION_BY_LINE.length, onClick: () => setTab('performance') },
      ]}
    >
      <TabPanel<Tab> label="Valuation sections" value={tab} onChange={setTab} tabs={[{ id: 'summary', label: 'Valuation summary' }, { id: 'scenarios', label: 'Scenarios & sensitivity' }, { id: 'performance', label: 'Product performance' }, { id: 'reports', label: 'Reports' }, { id: 'assumptions', label: 'Assumptions' }]}>
        {tab === 'summary' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-3">
              <div className="row between"><h3>Reserves by product line ($M)</h3><Indicative label="Illustrative" /></div>
              <BarList items={VALUATION_BY_LINE.map((l) => ({ label: l.line, value: l.reserve }))} format={(n) => `$${n.toLocaleString()}M`} />
            </div>
            <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              <table className="table">
                <thead><tr><th>Product line</th><th className="num">Policies</th><th className="num">A/E mortality</th></tr></thead>
                <tbody>{VALUATION_BY_LINE.map((l) => <tr key={l.line}><td>{l.line}</td><td className="num">{l.policies.toLocaleString()}</td><td className="num">{l.ae}%</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'scenarios' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <div className="row between"><h3>Reserve impact by scenario (%)</h3><GatedButton module="valuation" level="create" onClick={() => { store.createTask({ typeId: 'scenario-model', policyId: '—', priority: 'Low', description: 'Run combined adverse scenario on the UL block.', assignToMe: true }); store.setRecordStatus('SCN-Combined adverse', 'Running', { target: 'Scenario: Combined adverse', module: 'valuation', message: 'Scenario run started' }); }}><Play size={13} />Run queued scenario</GatedButton></div>
            <BarList items={scenarios.map((s) => ({ label: `${s.name} · ${s.status}`, value: s.impact, tone: s.impact > 5 ? 'bad' : s.impact > 0 ? 'warn' : undefined }))} format={(n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`} />
            <p className="xs subtle">Positive values increase reserves. Illustrative results on synthetic data.</p>
          </div>
        )}
        {tab === 'performance' && (
          <DataTable rows={PRODUCT_PERFORMANCE} rowKey={(r) => r.product} label="Product performance"
            cols={[
              { key: 'p', label: 'Product', render: (r) => <span className="primary-cell">{r.product}</span> },
              { key: 'n', label: 'New policies YTD', className: 'num', render: (r) => r.newBusiness.toLocaleString() },
              { key: 'l', label: 'Lapse rate', className: 'num', render: (r) => `${r.lapse}%` },
              { key: 'm', label: 'Margin vs plan', render: (r) => <Status s={r.margin === 'Below plan' ? 'Below plan — review' : r.margin === 'Above plan' ? 'Above plan — met' : 'On plan'} /> },
              { key: 't', label: 'Trend', render: (r) => <span className="small">{r.trend}</span> },
            ]} />
        )}
        {tab === 'reports' && (
          <div className="list">
            {VALUATION_REPORTS.map((r) => (
              <div key={r} className="list-row"><FileBarChart size={16} className="subtle" /><span className="grow title">{r}</span>
                <GatedButton module="valuation" level="create" onClick={() => { store.logActivity('Generated report', r, '/product/valuation?tab=reports', 'valuation'); store.toast(`${r} generated (synthetic)`); }}>Generate</GatedButton></div>
            ))}
          </div>
        )}
        {tab === 'assumptions' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="formulas" title="Valuation assumptions" summary="Valuation outputs are shown; assumptions are restricted to actuarial staff.">
              <KV items={[['Valuation interest rate', '3.50% (statutory max)'], ['Mortality table', '2017 CSO composite'], ['Lapse (UL)', '5.0% years 1–10, 3.0% after'], ['Expense', '$62 per policy, 2% inflation'], ['Discount curve (GAAP)', 'Upper-medium grade, Sep 30']]} />
            </RestrictedSection>
            <RestrictedSection cat="formulas" title="Methodology" summary="Methodology documentation is restricted.">
              <p className="small">Principle-based reserves (VM-20) for UL with secondary guarantees; net premium reserve floor; stochastic exclusion test passed for term.</p>
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
    </ModulePage>
  );
}
