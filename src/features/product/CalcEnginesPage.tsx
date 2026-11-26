import { useState } from 'react';
import { Play, Settings2 } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { ENGINES, runEngine } from '../../data/product';
import { POLICIES, policyById } from '../../data/policies';
import { money } from '../../lib/format';
import { DataTable, GatedButton, Indicative, KV, ModulePage, RestrictedSection, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'run' | 'engines' | 'tables' | 'config';

export function CalcEnginesPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('run');
  const [engineId, setEngineId] = useState(ENGINES[0].id);
  const [policyId, setPolicyId] = useState(POLICIES.find((p) => p.cashValue > 0)!.id);
  const engine = ENGINES.find((e) => e.id === engineId)!;
  const [scenario, setScenario] = useState(engine.scenarios[0]);
  const [result, setResult] = useState<{ rows: [string, number][]; label: string } | null>(null);
  const canConfigure = store.can('calc-engines', 'configure');

  const run = () => {
    const p = policyById(policyId)!;
    setResult({ rows: runEngine(engine, p, scenario), label: `${engine.name} · ${p.id} · ${scenario}` });
    store.logActivity('Ran calculation scenario', `${engine.name} · ${scenario} · ${p.id}`, '/product/calculations', 'calc-engines');
    store.toast('Calculation completed (synthetic)', 'info');
  };
  const fmt = (label: string, v: number) => (/(%|rate|months|per \$1,000)/i.test(label) ? String(v) : money(v));

  return (
    <ModulePage module="calc-engines" lead="Run permitted calculation scenarios and view authorized results. Formula management and model configuration are restricted.">
      <TabPanel<Tab> label="Calculation engine sections" value={tab} onChange={setTab} tabs={[{ id: 'run', label: 'Run scenario' }, { id: 'engines', label: 'Engines' }, { id: 'tables', label: 'Calculation tables' }, { id: 'config', label: 'Model configuration' }]}>
        {tab === 'run' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-4">
              <div className="field"><label htmlFor="ce-e">Calculation engine</label>
                <select id="ce-e" className="select" value={engineId} onChange={(e) => { const en = ENGINES.find((x) => x.id === e.target.value)!; setEngineId(en.id); setScenario(en.scenarios[0]); setResult(null); }}>
                  {ENGINES.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select><span className="hint">{engine.purpose}</span></div>
              <div className="field"><label htmlFor="ce-p">Policy</label>
                <select id="ce-p" className="select" value={policyId} onChange={(e) => { setPolicyId(e.target.value); setResult(null); }}>
                  {POLICIES.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.owner.name} ({p.product})</option>)}
                </select></div>
              <div className="field"><span className="field-label">Permitted scenario</span>
                <div className="seg" role="group" aria-label="Scenario">{engine.scenarios.map((s) => <button key={s} aria-pressed={scenario === s} onClick={() => { setScenario(s); setResult(null); }}>{s}</button>)}</div></div>
              <div className="row"><GatedButton module="calc-engines" level="view" className="btn btn-primary" disabled={engine.status === 'Maintenance'} reason="Engine is in maintenance" onClick={run}><Play size={14} />Run calculation</GatedButton>{engine.status !== 'Available' && <Status s={engine.status} />}</div>
            </div>
            <div className="stack gap-3">
              <div className="row between"><h3>Results</h3><Indicative /></div>
              {result ? <><p className="xs subtle">{result.label}</p><KV items={result.rows.map(([k, v]) => [k, fmt(k, v)] as [string, string])} /></> : <p className="small muted">Choose an engine, policy and permitted scenario, then run the calculation.</p>}
              <RestrictedSection cat="formulas" title="Detailed calculation trace" summary="Results are authorized outputs. Source data, assumptions and the formula trace are restricted.">
                <p className="small mono">trace: AV₀ → +premium − COI(age, class) − expense load → ×(1 + i_cred)^(1/12) → −SC(t) → result</p>
              </RestrictedSection>
            </div>
          </div>
        )}
        {tab === 'engines' && (
          <DataTable rows={ENGINES} rowKey={(e) => e.id} label="Calculation engines"
            cols={[
              { key: 'n', label: 'Engine', render: (e) => <><div className="primary-cell">{e.name}</div><div className="small muted">{e.purpose}</div></> },
              { key: 'v', label: 'Version', render: (e) => <span className="mono small">{e.version}</span> },
              { key: 'l', label: 'Last run', render: (e) => <span className="small muted">{e.lastRun}</span> },
              { key: 's', label: 'Status', render: (e) => <Status s={e.status} /> },
            ]} />
        )}
        {tab === 'tables' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="formulas" title="Detailed calculation tables" summary="Surrender charge schedules, COI tables and dividend scales are restricted.">
              <DataTable rows={[[1, '7.0%', 0.21, '4.10%'], [5, '4.2%', 0.34, '4.10%'], [10, '0.7%', 0.62, '4.00%'], [15, '0.0%', 1.08, '3.90%']] as [number, string, number, string][]} rowKey={(r) => String(r[0])}
                cols={[{ key: 'y', label: 'Policy year', render: (r) => r[0] }, { key: 's', label: 'Surrender charge', render: (r) => r[1] }, { key: 'c', label: 'COI per $1,000', className: 'num', render: (r) => r[2].toFixed(2) }, { key: 'i', label: 'Credited rate', render: (r) => r[3] }]} />
            </RestrictedSection>
            <RestrictedSection cat="formulas" title="Actuarial assumptions and pricing sensitivities" summary="Assumptions and sensitivities are restricted.">
              <KV items={[['Mortality', '2017 CSO, 90% select factor'], ['Lapse', '6.5% → 4.0% ultimate'], ['Interest', 'Portfolio yield 5.15%, spread 105bp'], ['Sensitivity: +100bp', 'Reserve −3.8%']]} />
            </RestrictedSection>
          </div>
        )}
        {tab === 'config' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="config" title="Model configuration" summary="Model parameters are managed by product owners and system administrators.">
              <div className="stack gap-3">
                {[['Surrender charge grading', 'Linear, 10 years'], ['Interest crediting frequency', 'Monthly'], ['Dividend option default', 'Paid-up additions']].map(([k, v]) => (
                  <div key={k} className="row between"><span className="small">{k}</span><span className="row" style={{ gap: 8 }}><span className="small strong">{v}</span>{canConfigure && <button className="btn btn-ghost btn-sm" onClick={() => store.toast(`${k} change drafted — requires approval`, 'info')}><Settings2 size={13} />Edit</button>}</span></div>
                ))}
                {!canConfigure && <p className="xs subtle">Changing model configuration requires the Configure permission.</p>}
              </div>
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
    </ModulePage>
  );
}
