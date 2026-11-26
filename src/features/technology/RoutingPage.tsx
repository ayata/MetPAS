import { useState } from 'react';
import { ArrowRight, Wand2 } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { ROUTING_DECISIONS, ROUTING_RULES, TRIAGE_SAMPLES } from '../../data/technology';
import { relative } from '../../lib/format';
import { DataTable, GatedButton, ModulePage, RestrictedSection, SimTag, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'outcomes' | 'triage' | 'payments' | 'rules';

export function RoutingPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('outcomes');
  const [kind, setKind] = useState('');
  const [sample, setSample] = useState(0);
  const [shown, setShown] = useState(0);
  const rows = ROUTING_DECISIONS.filter((d) => !kind || d.kind === kind);
  const payments = ROUTING_DECISIONS.filter((d) => /payment/i.test(d.kind));
  const run = () => {
    setShown(0);
    TRIAGE_SAMPLES[sample].steps.forEach((_, i) => setTimeout(() => setShown(i + 1), 450 * (i + 1)));
    store.logActivity('Ran routing simulation', TRIAGE_SAMPLES[sample].input.slice(0, 60), '/tech/routing?tab=triage', 'routing');
  };

  return (
    <ModulePage
      module="routing"
      lead="Automated service triage, workflow and payment routing, and decision support. Sample outcomes on synthetic data."
      actions={<SimTag />}
      kpis={[
        { label: 'Decisions today', value: '1,284', sub: 'Synthetic volume' },
        { label: 'Straight-through', value: '62%', tone: 'success' },
        { label: 'Routed to exceptions', value: ROUTING_DECISIONS.filter((d) => d.kind === 'Exception routing').length + 37, tone: 'warning' },
        { label: 'Active rules', value: ROUTING_RULES.filter((r) => store.statusOf(r.id, r.enabled ? 'Enabled' : 'Disabled') === 'Enabled').length, onClick: () => setTab('rules') },
      ]}
    >
      <TabPanel<Tab> label="Routing sections" value={tab} onChange={setTab} tabs={[{ id: 'outcomes', label: 'Routing outcomes' }, { id: 'triage', label: 'Triage simulator' }, { id: 'payments', label: 'Payment routing' }, { id: 'rules', label: 'Decision rules' }]}>
        {tab === 'outcomes' && (
          <>
            <Toolbar count={`${rows.length} decisions`} filters={[{ label: 'All decision types', value: kind, onChange: setKind, options: ['Service triage', 'Workflow routing', 'Payment routing', 'Third-party payment', 'Bank payment', 'Exception routing'] }]} />
            <DataTable rows={rows} rowKey={(d) => d.id} label="Routing outcomes"
              cols={[
                { key: 'i', label: 'Item', render: (d) => <><div className="primary-cell">{d.item}</div><div className="id-cell">{d.id} · {d.kind}</div></> },
                { key: 'r', label: 'Rule matched', className: 'hide-md', render: (d) => <span className="small">{d.rule}</span> },
                { key: 'o', label: 'Outcome', render: (d) => <span className="small strong">{d.outcome}</span> },
                { key: 'c', label: 'Confidence', className: 'num', render: (d) => `${d.confidence}%` },
                { key: 't', label: 'When', className: 'hide-md', render: (d) => <span className="small muted">{relative(d.at)}</span> },
              ]} />
          </>
        )}
        {tab === 'triage' && (
          <div className="cols-2" style={{ padding: 'var(--s5)', alignItems: 'start' }}>
            <div className="stack gap-3">
              <h3>Sample item</h3>
              {TRIAGE_SAMPLES.map((s, i) => <label key={i} className="check" style={{ alignItems: 'flex-start' }}><input type="radio" name="triage" checked={sample === i} onChange={() => { setSample(i); setShown(0); }} />{s.input}</label>)}
              <div><button className="btn btn-primary" onClick={run}><Wand2 size={14} />Run automated triage</button></div>
            </div>
            <div className="stack gap-3">
              <h3>Decision path</h3>
              {shown === 0 ? <p className="small muted">Run the triage to see each automated decision step.</p> : (
                <ol className="decision-path">{TRIAGE_SAMPLES[sample].steps.slice(0, shown).map((s, i) => <li key={i}><ArrowRight size={13} />{s}</li>)}</ol>
              )}
            </div>
          </div>
        )}
        {tab === 'payments' && (
          <DataTable rows={payments} rowKey={(d) => d.id} label="Payment routing"
            cols={[
              { key: 'i', label: 'Payment', render: (d) => <><div className="primary-cell">{d.item}</div><div className="id-cell">{d.kind}</div></> },
              { key: 'r', label: 'Rule', render: (d) => <span className="small">{d.rule}</span> },
              { key: 'o', label: 'Routed via', render: (d) => <span className="small strong">{d.outcome}</span> },
              { key: 's', label: 'Status', render: () => <Status s="Routed — complete" /> },
            ]} />
        )}
        {tab === 'rules' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="config" title="Routing and decision rules" summary="Routing outcomes are visible. Rule configuration is restricted to authorized administrators.">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Rule</th><th>Condition</th><th>Action</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {ROUTING_RULES.map((r) => {
                      const on = store.statusOf(r.id, r.enabled ? 'Enabled' : 'Disabled') === 'Enabled';
                      return (
                        <tr key={r.id}>
                          <td className="primary-cell">{r.name}</td>
                          <td className="mono small">{r.condition}</td>
                          <td className="small">{r.action}</td>
                          <td><Status s={on ? 'Active' : 'Disabled'} /></td>
                          <td className="num"><GatedButton module="routing" level="configure" onClick={() => store.setRecordStatus(r.id, on ? 'Disabled' : 'Enabled', { target: `Routing rule ${r.name}`, module: 'routing', message: `Rule ${on ? 'disabled' : 'enabled'}` })}>{on ? 'Disable' : 'Enable'}</GatedButton></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
    </ModulePage>
  );
}
