import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { visibleGroups } from '../../store/access';
import { moduleById } from '../../config/modules';
import { relative } from '../../lib/format';
import { Empty } from '../../components/ui';

const RANK = { Critical: 0, Warning: 1, Info: 2 } as const;
const SEV_LABEL = { Critical: 'Critical', Warning: 'High', Info: 'Medium' } as const;

export const SeverityTag = ({ s }: { s: keyof typeof RANK }) => <span className={`sev sev-${s.toLowerCase()}`}>{SEV_LABEL[s]}</span>;

export function useMyExceptions() {
  const store = useStore();
  const groups = visibleGroups(store.session);
  return store.state.exceptions
    .filter((e) => e.groups.some((g) => groups.includes(g) || g === store.session.groupId))
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || RANK[a.severity] - RANK[b.severity] || a.tier - b.tier || b.createdAt.localeCompare(a.createdAt));
}

/** Compact alerts & exceptions list: only the most important unresolved business exceptions. */
export function AlertsPanel({ limit = 4 }: { limit?: number }) {
  const navigate = useNavigate();
  const items = useMyExceptions().filter((e) => !e.resolved);
  const critical = items.filter((e) => e.severity === 'Critical').length;
  return (
    <section className="panel alerts2" aria-labelledby="alerts-title">
      <div className="panel-head">
        <div>
          <h2 id="alerts-title">Alerts &amp; Exceptions</h2>
          <div className="desc">
            {items.length ? <>{items.length} unresolved{critical > 0 && <> · <span className="al-desc-critical">{critical} critical</span></>}</> : 'Nothing needs attention'}
          </div>
        </div>
        <Link to="/exceptions" className="link-pill">View all <ArrowRight size={13} aria-hidden /></Link>
      </div>
      {items.length === 0 ? (
        <Empty compact title="No open alerts" icon={<CheckCircle2 size={14} />} />
      ) : (
        <div className="al-list">
          {items.slice(0, limit).map((e) => (
            <button key={e.id} className={`al-row sev-${e.severity.toLowerCase()}`} onClick={() => navigate(`/exceptions?focus=${e.id}`)} title={e.title}>
              <span className="al-dot" aria-hidden />
              <span className="al-body">
                <span className="al-title"><span className="sr-only">{SEV_LABEL[e.severity]} severity: </span>{e.title}</span>
                <span className="al-meta">
                  <span className="al-module">{moduleById(e.module).name}</span>
                  <span className="al-time">{relative(e.createdAt)}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
