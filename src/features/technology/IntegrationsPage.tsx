import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { LAYERS, type Layer } from '../../data/technology';
import { Drawer } from '../../components/ui';
import { DataTable, GatedButton, KV, ModulePage, RestrictedSection, SimTag, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'architecture' | 'connections' | 'settings';

const W = 760, H = 420, CX = W / 2, CY = H / 2, R = 165;
const tone = (s: Layer['status']) => (s === 'Healthy' ? 'var(--metlife-green)' : s === 'Degraded' ? 'var(--warning-dot)' : 'var(--critical)');

/** Hub-and-spoke view of the capability layers connected to MetPAS (simulated). */
function Architecture({ layers, onSelect }: { layers: Layer[]; onSelect: (id: string) => void }) {
  return (
    <div className="arch">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Integration architecture: MetPAS connected to seven capability layers">
        {layers.map((l, i) => {
          const a = (i / layers.length) * Math.PI * 2 - Math.PI / 2;
          const x = CX + Math.cos(a) * R * 1.55, y = CY + Math.sin(a) * R;
          return <line key={l.id} x1={CX} y1={CY} x2={x} y2={y} stroke={l.status === 'Healthy' ? 'var(--blue-tint-20)' : tone(l.status)} strokeWidth={2} strokeDasharray={l.sync === 'Nightly' ? '5 5' : undefined} />;
        })}
        <g>
          <rect x={CX - 78} y={CY - 30} width={156} height={60} rx={12} fill="var(--metlife-dark-blue)" />
          <text x={CX} y={CY - 4} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="650">MetPAS</text>
          <text x={CX} y={CY + 15} textAnchor="middle" fill="rgba(255,255,255,.8)" fontSize="11">Policy Administration</text>
        </g>
        {layers.map((l, i) => {
          const a = (i / layers.length) * Math.PI * 2 - Math.PI / 2;
          const x = CX + Math.cos(a) * R * 1.55, y = CY + Math.sin(a) * R;
          return (
            <g key={l.id} className="arch-node" tabIndex={0} role="button" aria-label={`${l.name}, ${l.status}`} onClick={() => onSelect(l.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(l.id)}>
              <rect x={x - 104} y={y - 24} width={208} height={48} rx={10} fill="#fff" stroke="var(--border)" />
              <circle cx={x - 88} cy={y} r={5} fill={tone(l.status)} />
              <text x={x - 76} y={y - 3} fontSize="12" fontWeight="600" fill="var(--text)">{l.name}</text>
              <text x={x - 76} y={y + 13} fontSize="10.5" fill="var(--text-3)">{l.sync} · {l.status}</text>
            </g>
          );
        })}
      </svg>
      <div className="list arch-list">
        {layers.map((l) => <button key={l.id} className="list-row" onClick={() => onSelect(l.id)}><span className="grow title">MetPAS ↔ {l.name}</span><Status s={l.status} /></button>)}
      </div>
      <div className="legend" style={{ justifyContent: 'center' }}><span><i style={{ background: 'var(--metlife-green)' }} />Healthy</span><span><i style={{ background: 'var(--warning-dot)' }} />Degraded</span><span><i style={{ background: 'var(--critical)' }} />Down</span><span>— — Batch / nightly</span></div>
    </div>
  );
}

export function IntegrationsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('architecture');
  const [sel, setSel] = useState<string | null>(null);
  const layers = LAYERS.map((l) => ({ ...l, status: store.statusOf(l.id, l.status) as Layer['status'] }));
  const selected = layers.find((l) => l.id === sel);

  return (
    <ModulePage
      module="integrations"
      lead="How the connected capability layers exchange data with MetPAS. All connections are simulated for demonstration."
      actions={<SimTag />}
      kpis={[
        { label: 'Connected layers', value: layers.length },
        { label: 'Healthy', value: layers.filter((l) => l.status === 'Healthy').length, tone: 'success' },
        { label: 'Degraded', value: layers.filter((l) => l.status === 'Degraded').length, tone: 'warning', onClick: () => setTab('connections') },
        { label: 'Real-time connections', value: layers.filter((l) => l.sync === 'Real time').length },
      ]}
    >
      <TabPanel<Tab> label="Integration sections" value={tab} onChange={setTab} tabs={[{ id: 'architecture', label: 'Architecture' }, { id: 'connections', label: 'Connections' }, { id: 'settings', label: 'Integration settings' }]}>
        {tab === 'architecture' && <div style={{ padding: 'var(--s5)' }}><Architecture layers={layers} onSelect={setSel} /><p className="xs subtle" style={{ textAlign: 'center' }}>Select a layer for details.</p></div>}
        {tab === 'connections' && (
          <DataTable rows={layers} rowKey={(l) => l.id} onRow={(l) => setSel(l.id)} selected={sel} label="Integration connections"
            cols={[
              { key: 'n', label: 'Capability layer', render: (l) => <><div className="primary-cell">{l.name}</div><div className="id-cell">{l.purpose}</div></> },
              { key: 'p', label: 'Protocol', className: 'hide-md', render: (l) => <span className="small">{l.protocol}</span> },
              { key: 'y', label: 'Synchronization', render: (l) => <span className="small">{l.sync}</span> },
              { key: 't', label: 'Throughput', className: 'hide-md', render: (l) => <span className="small mono">{l.throughput}</span> },
              { key: 's', label: 'Status', render: (l) => <Status s={l.status} /> },
            ]} />
        )}
        {tab === 'settings' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="config" title="Integration settings" summary="Endpoints, credentials references and retry policies are restricted to system administrators.">
              <DataTable rows={layers} rowKey={(l) => l.id} cols={[{ key: 'n', label: 'Layer', render: (l) => l.name }, { key: 'e', label: 'Endpoint (simulated)', render: (l) => <span className="mono small">{l.endpoint}</span> }, { key: 'r', label: 'Retry policy', render: () => <span className="small">3 retries, exponential backoff</span> }, { key: 'c', label: 'Credential', render: () => <span className="small subtle">Vault reference — never displayed</span> }]} />
            </RestrictedSection>
          </div>
        )}
      </TabPanel>

      {selected && (
        <Drawer label={selected.name} onClose={() => setSel(null)} header={<div className="stack gap-1"><div className="xs subtle">Integration Management · <SimTag /></div><h2 style={{ fontSize: 18 }}>{selected.name}</h2></div>}
          footer={<GatedButton module="integrations" level="edit" className="btn btn-secondary btn-sm" onClick={() => store.setRecordStatus(selected.id, 'Healthy', { target: `Integration ${selected.name}`, module: 'integrations', message: 'Connection test passed (simulated)' })}><RefreshCw size={14} />Test connection</GatedButton>}>
          <KV two items={[['Status', <Status s={selected.status} />], ['Owner', selected.owner], ['Protocol', selected.protocol], ['Synchronization', selected.sync], ['Throughput', selected.throughput], ['Endpoint', <span className="mono small">{selected.endpoint}</span>]]} />
          <section className="stack"><h3>Purpose</h3><p className="small">{selected.purpose}</p></section>
          <p className="xs subtle">Simulated connection for demonstration. MetPAS does not connect to production systems.</p>
        </Drawer>
      )}
    </ModulePage>
  );
}
