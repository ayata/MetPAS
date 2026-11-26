import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { POLICIES, policyById } from '../../data/policies';
import { deathBenefit } from '../../data/claims';
import { money } from '../../lib/format';
import { DataTable, GatedButton, Indicative, KV, ModulePage, PolicyLink, RestrictedSection, TabPanel, useTabParam } from '../../components/module';

type Tab = 'outputs' | 'history';

interface CalcLog { id: string; policyId: string; at: string; by: string; total: number }

export function BenefitCalcsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('outputs');
  const book = POLICIES.filter((p) => !store.scope || store.scope.includes(p.id));
  const [policyId, setPolicyId] = useState(book[0]?.id ?? '');
  const p = policyById(policyId)!;
  const log = store.recordsOf<CalcLog & { id: string }>('benefit-calcs');

  const db = deathBenefit(p, false);
  const net = Math.max(0, p.cashValue - p.loanBalance);
  const years = new Date().getFullYear() - Number(p.issueDate.slice(0, 4));
  const sections: { title: string; rows: [string, number | string][] }[] = [
    { title: 'Death benefits', rows: [['Death benefit (current)', db.total], ['Accidental death benefit', p.coverages.filter((c) => c.name.startsWith('Accidental')).reduce((a, c) => a + c.amount, 0) || 'Not applicable']] },
    { title: 'Surrender values', rows: [['Cash surrender value', Math.round(net * 0.97)], ['Surrender charge', Math.round(net * 0.03)]] },
    { title: 'Guaranteed benefits', rows: [['Guaranteed death benefit', p.faceAmount], ['Guaranteed cash value (age 65)', Math.round(p.cashValue * 1.6)]] },
    { title: 'Policy-related benefits', rows: [['Reduced paid-up value', Math.round(p.faceAmount * Math.min(0.9, 0.04 * years))], ['Available loan value', Math.round(net * 0.9)]] },
    { title: 'Interest-related amounts', rows: [['Credited rate', '4.10%'], ['Interest credited YTD', Math.round(p.cashValue * 0.032)], ['Loan interest accrued', Math.round(p.loanBalance * 0.05)]] },
  ];

  return (
    <ModulePage module="benefit-calcs" lead="Authorized benefit calculation outputs for a policy. Detailed formulas and methodologies are restricted.">
      <TabPanel<Tab> label="Benefit calculation sections" value={tab} onChange={setTab} tabs={[{ id: 'outputs', label: 'Calculation outputs' }, { id: 'history', label: 'Recent calculations', count: log.length }]}>
        {tab === 'outputs' && (
          <div className="stack gap-4" style={{ padding: 'var(--s5)' }}>
            <div className="row wrap gap-3" style={{ alignItems: 'flex-end' }}>
              <div className="field" style={{ minWidth: 320 }}>
                <label htmlFor="bc-p">Policy</label>
                <select id="bc-p" className="select" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
                  {book.map((x) => <option key={x.id} value={x.id}>{x.id} — {x.owner.name} ({x.product})</option>)}
                </select>
              </div>
              <GatedButton module="benefit-calcs" level="create" className="btn btn-primary" onClick={() => {
                const id = store.nextId('BCL', 5000);
                store.addRecord('benefit-calcs', { id, policyId, at: new Date().toISOString(), by: store.me.name, total: db.total }, { action: 'Ran benefit calculation for', target: policyId, link: '/claims/benefits?tab=history', module: 'benefit-calcs' }, `Calculation ${id} recorded`);
              }}><Calculator size={14} />Record calculation</GatedButton>
              <Indicative label="Synthetic outputs" />
            </div>
            <div className="calc-grid">
              {sections.map((s) => (
                <div key={s.title} className="calc-card">
                  <h3>{s.title}</h3>
                  <KV items={s.rows.map(([k, v]) => [k, typeof v === 'number' ? money(v) : v] as [string, string])} />
                </div>
              ))}
            </div>
            <RestrictedSection cat="formulas" title="Formulas and methodology" target={policyId} summary="Outputs above are authorized results. Formulas, factors and methodologies are restricted to Product & Actuarial.">
              <div className="stack small mono">
                <span>deathBenefit = face + ΣriderDB − loan + face × i_pm × days/365 + unearnedPremium</span>
                <span>CSV = AV − SC(policyYear) · SC = AV × max(0, 7% − 0.7% × t)</span>
                <span>RPU = NSP⁻¹(attainedAge) × netCSV</span>
                <span>credited = max(guaranteedRate 2.0%, declaredRate 4.10%)</span>
              </div>
            </RestrictedSection>
          </div>
        )}
        {tab === 'history' && (
          <DataTable rows={log} rowKey={(r) => r.id} empty="No calculations recorded in this session" label="Recent calculations"
            cols={[
              { key: 'i', label: 'Calculation', render: (r) => <span className="mono">{r.id}</span> },
              { key: 'p', label: 'Policy', render: (r) => <PolicyLink id={r.policyId} /> },
              { key: 'b', label: 'By', render: (r) => <span className="small">{r.by}</span> },
              { key: 't', label: 'Death benefit', className: 'num', render: (r) => money(r.total) },
            ]} />
        )}
      </TabPanel>
    </ModulePage>
  );
}
