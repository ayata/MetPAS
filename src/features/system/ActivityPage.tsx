import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { visibleGroups } from '../../store/access';
import { userById } from '../../data/users';
import { dateTime, relative } from '../../lib/format';
import { Avatar, Empty } from '../../components/ui';
import { Pager, usePaged } from '../../components/module';
import { MODULE_CATALOG, moduleById, type ModuleId } from '../../config/modules';

export function ActivityPage() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const actor = params.get('actor') ?? '';
  const area = params.get('module') ?? '';
  const q = params.get('q') ?? '';
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    setParams(p, { replace: true });
  };
  const groups = visibleGroups(store.session);

  const rows = useMemo(
    () =>
      store.state.activity.filter(
        (a) =>
          (!a.groupId || groups.includes(a.groupId) || a.actorId === store.session.userId) &&
          (!actor || (actor === 'me' ? a.actorId === store.session.userId : a.actorId === actor)) &&
          (!area || a.module === area) &&
          (!q || `${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [store.state.activity, groups, actor, area, q, store.session.userId],
  );
  const paged = usePaged(rows, `${actor}|${area}|${q}`);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Activity History</h1>
          <p className="lead">An audit trail of actions taken in MetPAS, including your demonstration changes.</p>
        </div>
      </div>
      <section className="panel">
        <div className="filters">
          <div className="input-icon" style={{ width: 240 }}>
            <Search size={14} />
            <input className="input" placeholder="Search actions" aria-label="Search activity" value={q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <div className="seg" role="group" aria-label="Actor">
            <button aria-pressed={actor !== 'me'} onClick={() => set('actor', '')}>Everyone</button>
            <button aria-pressed={actor === 'me'} onClick={() => set('actor', 'me')}>My activity</button>
          </div>
          <select className="select" aria-label="Business area" value={area} onChange={(e) => set('module', e.target.value)}>
            <option value="">All business areas</option>
            {MODULE_CATALOG.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <span className="small subtle" style={{ marginLeft: 'auto' }}>{rows.length} entries</span>
        </div>
        {rows.length === 0 ? <Empty title="No activity found" text="Actions you take in the demo appear here instantly." /> : (
          <>
          <div className="table-wrap sticky-head">
            <table className="table">
              <thead><tr><th>When</th><th>User</th><th>Action</th><th className="hide-md">Business area</th></tr></thead>
              <tbody>
                {paged.slice.map((a) => {
                  const u = userById(a.actorId);
                  return (
                    <tr key={a.id}>
                      <td className="small nowrap" title={dateTime(a.at)}>{relative(a.at)}</td>
                      <td><span className="row small"><Avatar name={u?.name ?? 'System'} size="sm" />{u?.name ?? 'System'}</span></td>
                      <td><span className="muted">{a.action}</span> {a.link ? <Link to={a.link} className="strong">{a.target}</Link> : <span className="strong">{a.target}</span>}</td>
                      <td className="hide-md small muted">{a.module ? moduleById(a.module as ModuleId).name : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager {...paged} noun="entries" />
          </>
        )}
      </section>
    </div>
  );
}
