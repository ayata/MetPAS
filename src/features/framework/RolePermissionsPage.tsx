import { Fragment, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, EyeOff, Minus, RotateCcw } from 'lucide-react';
import { GROUPS, groupById, type GroupId } from '../../config/groups';
import { LEVELS, type Level } from '../../config/permissions';
import { AREAS, MODULE_CATALOG, type ModuleId } from '../../config/modules';
import { PROFILES, profileById, type DataCeiling, type ProfileId } from '../../config/profiles';
import { roleById } from '../../config/roles';
import { DATA_CATEGORIES, DATA_LEVELS, NEVER_DISPLAYED, type DataCat, type DataLevel } from '../../config/dataAccess';
import { useStore } from '../../store/AppStore';
import { canDo, dataLevel } from '../../store/access';
import { Modal, Notice, Tabs } from '../../components/ui';

type Tab = 'profiles' | 'modules' | 'data' | 'preview';

function LevelSet({ levels, allowed = LEVELS.map((l) => l.id) }: { levels: Level[]; allowed?: Level[] }) {
  return (
    <span className="lv-set" aria-label={levels.length ? levels.join(', ') : 'No access'}>
      {LEVELS.filter((l) => allowed.includes(l.id)).map((l) => (
        <span key={l.id} className={`lv ${levels.includes(l.id) ? `on ${l.id}` : ''}`} title={`${l.label}: ${levels.includes(l.id) ? 'granted' : 'not granted'}`}>{l.short}</span>
      ))}
    </span>
  );
}

const DataChip = ({ level }: { level: DataLevel }) => <span className={`dl dl-${level}`}>{DATA_LEVELS.find((d) => d.id === level)!.label}</span>;

interface EditTarget {
  title: string;
  levels: Level[];
  save: (l: Level[]) => void;
}

export function RolePermissionsPage() {
  const store = useStore();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'profiles';
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [draft, setDraft] = useState<Level[]>([]);
  const [fields, setFields] = useState<DataCat | null>(null);
  const [pg, setPg] = useState<GroupId>(store.session.groupId);
  const [pp, setPp] = useState<ProfileId>(store.session.profileId);
  const canConfigure = store.can('permissions', 'admin');
  const { matrix, dataMatrix, profileCaps, profileData } = store.state;

  const openEdit = (t: EditTarget) => { if (!canConfigure) return; setEdit(t); setDraft(t.levels); };
  const Cell = ({ levels, title, save }: { levels: Level[]; title: string; save: (l: Level[]) => void }) => (
    <button className="lv-cell" disabled={!canConfigure} onClick={() => openEdit({ title, levels, save })} aria-label={`${title}: ${levels.join(', ') || 'no access'}${canConfigure ? '. Edit' : ''}`}>
      <LevelSet levels={levels} />
    </button>
  );
  const previewSession = { userId: '', role: profileById(pp).role, groupId: pg, profileId: pp };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Role &amp; Permissions</h1>
          <p className="lead">Effective access = permission profile ∩ user-group module grant. Restricted information is granted separately by data category.</p>
        </div>
        {canConfigure && <button className="btn btn-secondary" onClick={store.resetPermissions}><RotateCcw size={14} />Restore defaults</button>}
      </div>

      {canConfigure ? (
        <Notice>Configuration mode. Changes apply immediately across the interface for affected users and are recorded in the audit trail.</Notice>
      ) : (
        <Notice tone="warning">View only. Changing permissions requires Administrative access — preview as <strong>James Whitfield</strong> (Super User, Group 5) to configure.</Notice>
      )}

      <section className="panel">
        <div style={{ padding: '0 var(--s5)' }}>
          <Tabs<Tab>
            label="Permission views"
            value={tab}
            onChange={(t) => setParams({ tab: t }, { replace: true })}
            tabs={[
              { id: 'profiles', label: 'Permission profiles' },
              { id: 'modules', label: 'Group × Module' },
              { id: 'data', label: 'Data access' },
              { id: 'preview', label: 'Effective access' },
            ]}
          />
        </div>
        {tab !== 'data' && (
          <div className="row wrap small muted" style={{ padding: '12px var(--s5)', gap: 14 }}>
            {LEVELS.map((l) => <span key={l.id} className="row" style={{ gap: 6 }}><span className={`lv on ${l.id}`}>{l.short}</span>{l.label}</span>)}
          </div>
        )}

        {tab === 'profiles' && (
          <div className="table-wrap">
            <table className="table matrix">
              <thead><tr><th>Profile</th><th>Experience</th>{LEVELS.map((l) => <th key={l.id}>{l.label}</th>)}<th>Restricted data ceiling</th></tr></thead>
              <tbody>
                {PROFILES.map((p) => (
                  <tr key={p.id}>
                    <td><div className="primary-cell">{p.name}</div><div className="small muted">{p.description}</div></td>
                    <td className="small">{roleById(p.role).name}</td>
                    {LEVELS.map((l) => {
                      const on = profileCaps[p.id].includes(l.id);
                      return (
                        <td key={l.id}>
                          <label className="check" style={{ justifyContent: 'center' }}>
                            <input type="checkbox" checked={on} disabled={!canConfigure} aria-label={`${p.name} ${l.label}`} onChange={() => store.setProfileCaps(p.id, on ? profileCaps[p.id].filter((x) => x !== l.id) : [...profileCaps[p.id], l.id])} />
                          </label>
                        </td>
                      );
                    })}
                    <td>
                      {canConfigure ? (
                        <select className="select" style={{ height: 30, width: 110, fontSize: 'var(--fs-sm)' }} aria-label={`${p.name} data ceiling`} value={profileData[p.id]} onChange={(e) => store.setProfileData(p.id, e.target.value as DataCeiling)}>
                          <option value="masked">Masked</option><option value="full">Full</option>
                        </select>
                      ) : <DataChip level={profileData[p.id]} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted" style={{ padding: '12px var(--s5) var(--s5)' }}>A profile is the ceiling: an Operator never approves, even in a group that holds approval rights. The data ceiling caps restricted information — Operators see masked values at most.</p>
          </div>
        )}

        {tab === 'modules' && (
          <div className="table-wrap">
            <table className="table matrix">
              <thead><tr><th>Business module</th>{GROUPS.map((g) => <th key={g.id} title={g.name}>Group {g.number}<div className="xs" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{g.short}</div></th>)}</tr></thead>
              <tbody>
                {AREAS.map((a) => (
                  <Fragment key={a.id}>
                    <tr className="matrix-area"><td colSpan={GROUPS.length + 1}>{a.name}</td></tr>
                    {MODULE_CATALOG.filter((m) => m.area === a.id).map((m) => (
                      <tr key={m.id}>
                        <td><div className="primary-cell">{m.name}</div><div className="small muted">{m.description}</div></td>
                        {GROUPS.map((g) => (
                          <td key={g.id}><Cell levels={matrix[g.id].modules[m.id as ModuleId]} title={`Group ${g.number} · ${m.name}`} save={(l) => store.setGrant(g.id, m.id as ModuleId, l)} /></td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'data' && (
          <div className="stack gap-4" style={{ paddingTop: 'var(--s4)' }}>
            <div style={{ padding: '0 var(--s5)' }}>
              <Notice>Access to a business module never grants access to restricted information. Each category is granted per user group as <strong>Hidden</strong>, <strong>Masked</strong> or <strong>Full</strong>, then capped by the user's permission profile.</Notice>
            </div>
            <div className="table-wrap">
              <table className="table matrix">
                <thead><tr><th>Data category</th>{GROUPS.map((g) => <th key={g.id} title={g.name}>Group {g.number}<div className="xs" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{g.short}</div></th>)}</tr></thead>
                <tbody>
                  {DATA_CATEGORIES.map((d) => (
                    <Fragment key={d.id}>
                      <tr>
                        <td>
                          <button className="link-btn row" style={{ gap: 4 }} aria-expanded={fields === d.id} onClick={() => setFields(fields === d.id ? null : d.id)}>
                            <ChevronDown size={13} style={{ transform: fields === d.id ? undefined : 'rotate(-90deg)' }} />{d.name}
                          </button>
                          <div className="small muted">{d.description}</div>
                        </td>
                        {GROUPS.map((g) => (
                          <td key={g.id}>
                            {canConfigure ? (
                              <select className="select" style={{ height: 30, width: 96, fontSize: 'var(--fs-sm)' }} aria-label={`Group ${g.number} ${d.name}`} value={dataMatrix[g.id][d.id]} onChange={(e) => store.setDataGrant(g.id, d.id, e.target.value as DataLevel)}>
                                {DATA_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                              </select>
                            ) : <DataChip level={dataMatrix[g.id][d.id]} />}
                          </td>
                        ))}
                      </tr>
                      {fields === d.id && (
                        <tr className="matrix-fields"><td colSpan={GROUPS.length + 1}><span className="small muted">Fields in this category: </span><span className="small">{d.fields.join(' · ')}</span></td></tr>
                      )}
                    </Fragment>
                  ))}
                  <tr className="matrix-area"><td colSpan={GROUPS.length + 1}>Never displayed — for any profile or group</td></tr>
                  <tr>
                    <td><div className="row small" style={{ gap: 6 }}><EyeOff size={14} />{NEVER_DISPLAYED.join(' · ')}</div><div className="xs subtle">These values are not stored in MetPAS demonstration data and cannot be granted.</div></td>
                    {GROUPS.map((g) => <td key={g.id}><span className="dl dl-hidden">Never</span></td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'preview' && (
          <div className="stack gap-4" style={{ padding: '0 var(--s5) var(--s5)' }}>
            <div className="row gap-3 wrap">
              <div className="field" style={{ width: 300 }}>
                <label htmlFor="pv-group">User group</label>
                <select id="pv-group" className="select" value={pg} onChange={(e) => setPg(e.target.value as GroupId)}>
                  {GROUPS.map((g) => <option key={g.id} value={g.id}>Group {g.number} — {g.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ width: 300 }}>
                <label htmlFor="pv-profile">Permission profile</label>
                <select id="pv-profile" className="select" value={pp} onChange={(e) => setPp(e.target.value as ProfileId)}>
                  {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <p className="small muted">{profileById(pp).name} ({roleById(profileById(pp).role).name} experience) in {groupById(pg).name}</p>
            <div className="cols-2" style={{ alignItems: 'start' }}>
              <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                <table className="table matrix">
                  <thead><tr><th>Business module</th>{LEVELS.map((l) => <th key={l.id} title={l.label}>{l.short}</th>)}</tr></thead>
                  <tbody>
                    {MODULE_CATALOG.map((m) => (
                      <tr key={m.id}>
                        <td className="small">{m.name}</td>
                        {LEVELS.map((l) => <td key={l.id}><Yes on={canDo(matrix, profileCaps, previewSession, m.id as ModuleId, l.id)} /></td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap" style={{ border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
                <table className="table">
                  <thead><tr><th>Restricted information</th><th>Visibility</th></tr></thead>
                  <tbody>
                    {DATA_CATEGORIES.map((d) => (
                      <tr key={d.id}><td className="small">{d.name}</td><td><DataChip level={dataLevel(dataMatrix, profileData, previewSession, d.id)} /></td></tr>
                    ))}
                    <tr><td className="small">{NEVER_DISPLAYED.join(', ')}</td><td><span className="dl dl-hidden">Never</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {edit && (
        <Modal title="Edit permissions" desc={edit.title} onClose={() => setEdit(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={() => { edit.save(draft); setEdit(null); }}>Save changes</button></>}>
          <div className="stack gap-3">
            {LEVELS.map((l) => (
              <label key={l.id} className="check">
                <input type="checkbox" checked={draft.includes(l.id)} onChange={() => setDraft((d) => (d.includes(l.id) ? d.filter((x) => x !== l.id) : [...d, l.id]))} />
                <span className="strong">{l.label}</span>
              </label>
            ))}
          </div>
          <Notice>Approve / Reject and Configure are granted explicitly. Module access never includes restricted information.</Notice>
        </Modal>
      )}
    </div>
  );
}

const Yes = ({ on }: { on: boolean }) =>
  on ? <span aria-label="Allowed" style={{ color: 'var(--metlife-blue)' }}><Check size={15} strokeWidth={2.4} /></span> : <span aria-label="Not allowed" style={{ color: 'var(--medium-gray)' }}><Minus size={15} /></span>;
