import { useState } from 'react';
import { Send, ThumbsUp } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { PRICING_COMPARISON, PRICING_OUTCOMES, PRICING_SCENARIOS, type PricingScenario } from '../../data/product';
import { date } from '../../lib/format';
import { Drawer } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, Indicative, KV, ModulePage, RestrictedSection, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'scenarios' | 'comparisons' | 'outcomes' | 'configuration';

export function PricingPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('scenarios');
  const [sel, setSel] = useState<string | null>(null);
  const scenarios = PRICING_SCENARIOS.map((s) => ({ ...s, status: store.statusOf(s.id, s.status) as PricingScenario['status'] }));
  const selected = scenarios.find((s) => s.id === sel);
  const set = (id: string, s: string, m: string) => store.setRecordStatus(id, s, { target: `Pricing scenario ${id}`, module: 'pricing', message: m });

  return (
    <ModulePage
      module="pricing"
      lead="Pricing scenarios, product pricing comparisons and outcomes. Pricing formulas and configuration are restricted."
      kpis={[
        { label: 'Active scenarios', value: scenarios.filter((s) => s.status !== 'Approved').length, onClick: () => setTab('scenarios') },
        { label: 'Pending approval', value: scenarios.filter((s) => s.status === 'Pending Approval').length, tone: 'warning', onClick: () => setTab('scenarios') },
        { label: 'Products compared', value: PRICING_COMPARISON.length, onClick: () => setTab('comparisons') },
        { label: 'Approved this quarter', value: scenarios.filter((s) => s.status === 'Approved').length, tone: 'success' },
      ]}
      notice={<AccessNote module="pricing" />}
    >
      <TabPanel<Tab> label="Pricing sections" value={tab} onChange={setTab} tabs={[{ id: 'scenarios', label: 'Pricing scenarios' }, { id: 'comparisons', label: 'Pricing comparisons' }, { id: 'outcomes', label: 'Pricing outcomes' }, { id: 'configuration', label: 'Configuration & sensitivities' }]}>
        {tab === 'scenarios' && (
          <DataTable rows={scenarios} rowKey={(s) => s.id} onRow={(s) => setSel(s.id)} selected={sel} label="Pricing scenarios"
            cols={[
              { key: 'n', label: 'Scenario', render: (s) => <><div className="primary-cell">{s.name}</div><div className="id-cell">{s.id} · {s.product}</div></> },
              { key: 'o', label: 'Owner', className: 'hide-md', render: (s) => <span className="small">{s.owner}</span> },
              { key: 'c', label: 'Premium change', className: 'num', render: (s) => `${s.change > 0 ? '+' : ''}${s.change}%` },
              { key: 'u', label: 'Updated', className: 'hide-md', render: (s) => <span className="small">{date(s.updated)}</span> },
              { key: 's', label: 'Status', render: (s) => <Status s={s.status} /> },
            ]} />
        )}
        {tab === 'comparisons' && (
          <div className="stack gap-2">
            <div className="row between" style={{ padding: '12px var(--s5) 0' }}><span className="small muted">Annual premium per $1,000 of coverage, sample risk class</span><Indicative /></div>
            <DataTable rows={PRICING_COMPARISON} rowKey={(r) => r.product} label="Pricing comparison"
              cols={[
                { key: 'p', label: 'Product', render: (r) => <span className="primary-cell">{r.product}</span> },
                { key: 'c', label: 'Current', className: 'num', render: (r) => `$${r.current.toFixed(2)}` },
                { key: 'n', label: 'Proposed', className: 'num', render: (r) => `$${r.proposed.toFixed(2)}` },
                { key: 'd', label: 'Change', className: 'num', render: (r) => { const d = ((r.proposed - r.current) / r.current) * 100; return <span className={d ? 'strong' : 'muted'}>{d > 0 ? '+' : ''}{d.toFixed(1)}%</span>; } },
                { key: 'm', label: 'Market index', className: 'num hide-md', render: (r) => `$${r.market.toFixed(2)}` },
              ]} />
          </div>
        )}
        {tab === 'outcomes' && (
          <DataTable rows={PRICING_OUTCOMES} rowKey={(r) => r.product} label="Pricing outcomes"
            cols={[
              { key: 'p', label: 'Product', render: (r) => <span className="primary-cell">{r.product}</span> },
              { key: 'i', label: 'Projected IRR', className: 'num', render: (r) => r.irr },
              { key: 'm', label: 'Profit margin', className: 'num', render: (r) => r.margin },
              { key: 'b', label: 'Breakeven', render: (r) => <span className="small">{r.breakeven}</span> },
            ]} />
        )}
        {tab === 'configuration' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="config" title="Pricing configuration" summary="Rate tables and pricing parameters are configured by product and pricing owners.">
              <KV items={[['Active rate version', 'Term 2026.2'], ['Rate effective date', 'Jan 1, 2027 (proposed)'], ['Risk classes', '6 non-tobacco, 2 tobacco'], ['Band breakpoints', '$250K, $500K, $1M']]} />
            </RestrictedSection>
            <RestrictedSection cat="formulas" title="Pricing formulas and methodology" summary="Confidential pricing formulas and methodology are restricted.">
              <p className="small mono">grossPremium = (PV(benefits) + PV(expenses) + targetProfit) / PV(annuity factor) × (1 + commission load)</p>
            </RestrictedSection>
            <RestrictedSection cat="formulas" title="Pricing sensitivities" summary="Sensitivity analysis is restricted.">
              <KV items={[['Mortality −5%', 'IRR +0.9pt'], ['Lapse +20%', 'IRR −0.6pt'], ['Interest −50bp', 'IRR −1.2pt']]} />
            </RestrictedSection>
          </div>
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Pricing scenario ${selected.id}`} onClose={() => setSel(null)} header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Pricing</div><h2 style={{ fontSize: 18 }}>{selected.name}</h2></div>}
          footer={
            selected.status === 'Draft' || selected.status === 'In Review' ? <GatedButton module="pricing" level="edit" className="btn btn-primary btn-sm" onClick={() => { store.createTask({ typeId: 'rate-table', policyId: '—', priority: 'High', description: `Approve pricing scenario ${selected.id}: ${selected.name}`, assignToMe: true, submit: true, title: 'Rate Table Update' }, { silent: true }); set(selected.id, 'Pending Approval', 'Scenario submitted for approval'); }}><Send size={14} />Submit for approval</GatedButton>
              : selected.status === 'Pending Approval' ? <GatedButton module="pricing" level="approve" className="btn btn-primary btn-sm" onClick={() => set(selected.id, 'Approved', 'Pricing scenario approved')}><ThumbsUp size={14} />Approve</GatedButton> : undefined
          }>
          <KV two items={[['Product', selected.product], ['Owner', selected.owner], ['Premium change', `${selected.change > 0 ? '+' : ''}${selected.change}%`], ['Status', <Status s={selected.status} />]]} />
          <RestrictedSection cat="formulas" title="Scenario assumptions" target={selected.id} summary="Assumptions behind the scenario are restricted."><p className="small">Mortality improvement 1.0% p.a.; lapse unchanged; target margin 7%.</p></RestrictedSection>
        </Drawer>
      )}
    </ModulePage>
  );
}
