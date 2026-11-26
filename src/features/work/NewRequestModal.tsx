import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { TASK_TYPES, type Priority } from '../../data/tasks';
import { AREAS, moduleById } from '../../config/modules';
import { POLICIES } from '../../data/policies';
import { useStore } from '../../store/AppStore';
import { isExternal, visibleGroups } from '../../store/access';
import { Modal, Notice, Empty } from '../../components/ui';

export interface NewRequestPrefill {
  typeId?: string;
  policyId?: string;
}

export function NewRequestModal({ prefill, onClose }: { prefill: NewRequestPrefill; onClose: () => void }) {
  const store = useStore();
  const navigate = useNavigate();
  const external = isExternal(store.session.groupId);

  const types = useMemo(() => {
    const groups = visibleGroups(store.session);
    return TASK_TYPES.filter((t) => (external ? t.group === 'G6' : groups.includes(t.group) && t.group !== 'G6') && store.can('work', 'create', t.tier) && (external || store.can(t.module, 'view')));
  }, [store, external]);
  const policies = POLICIES.filter((p) => !store.scope || store.scope.includes(p.id));

  const [typeId, setTypeId] = useState(prefill.typeId && types.some((t) => t.id === prefill.typeId) ? prefill.typeId : '');
  const [policyId, setPolicyId] = useState(prefill.policyId ?? '');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [description, setDescription] = useState('');
  const [assignToMe, setAssignToMe] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selected = types.find((t) => t.id === typeId);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!typeId) e.type = 'Choose a request type.';
    if (!policyId) e.policy = 'Choose the policy this request relates to.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const id = store.createTask({ typeId, policyId, priority, description: description.trim(), assignToMe });
    onClose();
    navigate({ search: `?task=${id}` });
  };

  if (!types.length) {
    return (
      <Modal title="New request" onClose={onClose} footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
        <Empty title="No request types available" text="Your current role and group do not include permission to create requests." />
      </Modal>
    );
  }

  return (
    <Modal
      title={external ? 'Submit a service request' : 'New request'}
      desc={external ? 'Your request is routed to the servicing team.' : 'Create a work item. It is routed to the owning business area and prioritized by SLA.'}
      onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit}><Plus size={15} />{external ? 'Submit request' : 'Create request'}</button></>}
    >
      <div className="field">
        <label htmlFor="nr-type">Request type</label>
        <select id="nr-type" className="select" value={typeId} onChange={(e) => { setTypeId(e.target.value); setErrors((x) => ({ ...x, type: '' })); }} aria-invalid={!!errors.type}>
          <option value="">Select a request type</option>
          {AREAS.map((area) => {
            const list = types.filter((t) => moduleById(t.module).area === area.id);
            if (!list.length) return null;
            return (
              <optgroup key={area.id} label={area.name}>
                {list.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            );
          })}
        </select>
        {errors.type && <span className="error">{errors.type}</span>}
        {selected && (
          <span className="hint row" style={{ gap: 6 }}>
            {moduleById(selected.module).name} · SLA {selected.slaHours}h{selected.requiresApproval ? ' · Requires approval' : ''}
          </span>
        )}
      </div>
      <div className="field">
        <label htmlFor="nr-policy">Policy</label>
        <select id="nr-policy" className="select" value={policyId} onChange={(e) => { setPolicyId(e.target.value); setErrors((x) => ({ ...x, policy: '' })); }} aria-invalid={!!errors.policy}>
          <option value="">Select a policy</option>
          {policies.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.owner.name} ({p.product})</option>)}
        </select>
        {errors.policy && <span className="error">{errors.policy}</span>}
      </div>
      {!external && (
        <div className="field">
          <span className="field-label">Priority</span>
          <div className="seg" role="group" aria-label="Priority">
            {(['Low', 'Medium', 'High', 'Critical'] as Priority[]).map((p) => (
              <button key={p} type="button" aria-pressed={priority === p} onClick={() => setPriority(p)}>{p}</button>
            ))}
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="nr-desc">Details <span className="subtle">(optional)</span></label>
        <textarea id="nr-desc" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context for the person handling this request" />
      </div>
      {!external ? (
        <label className="check"><input type="checkbox" checked={assignToMe} onChange={(e) => setAssignToMe(e.target.checked)} />Assign to me</label>
      ) : (
        <Notice>For your security, identity and authority are verified before any change is processed.</Notice>
      )}
    </Modal>
  );
}
