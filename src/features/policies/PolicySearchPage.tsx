import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { POLICIES, POLICY_STATUSES, PRODUCT_TYPES, type Policy } from '../../data/policies';
import { money } from '../../lib/format';
import { Empty, StateChip } from '../../components/ui';
import { Crumbs, Pager, usePaged } from '../../components/module';

export const policyTone = (s: Policy['status']) =>
  (s === 'In Force' || s === 'Paid-Up' ? 'ok' : s === 'Grace Period' || s === 'Claim Pending' ? 'warn' : s === 'Pending Issue' ? 'info' : 'neutral') as 'ok' | 'warn' | 'info' | 'neutral';

export function PolicySearchPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(!!(params.get('status') || params.get('product') || params.get('customer')));
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const product = params.get('product') ?? '';
  const customer = params.get('customer') ?? '';
  const [draft, setDraft] = useState(q);

  const set = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    setParams(p, { replace: true });
  };

  const book = POLICIES.filter((p) => !store.scope || store.scope.includes(p.id));
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const cust = customer.trim().toLowerCase();
    return book.filter(
      (p) =>
        (!term || p.id.toLowerCase().includes(term) || p.owner.name.toLowerCase().includes(term) || p.owner.id.toLowerCase().includes(term) || p.insured.toLowerCase().includes(term)) &&
        (!cust || p.owner.id.toLowerCase().includes(cust)) &&
        (!status || p.status === status) &&
        (!product || p.product === product),
    );
  }, [book, q, status, product, customer]);

  const recent = store.state.recentPolicies.map((id) => POLICIES.find((p) => p.id === id)!).filter((p) => p && book.includes(p));
  const filtersActive = [status, product, customer].filter(Boolean).length;
  const paged = usePaged(results, `${q}|${status}|${product}|${customer}|${results.length}`);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Crumbs items={['Policy Administration', 'Policy Master File']} />
          <h1>Policy Search</h1>
          <p className="lead">Search by policy number, customer name or customer ID.</p>
        </div>
      </div>

      <section className="panel">
        <form className="stack gap-3" style={{ padding: 'var(--s5)' }} onSubmit={(e) => { e.preventDefault(); set({ q: draft.trim() }); }} role="search">
          <div className="row gap-3 wrap">
            <div className="input-icon grow" style={{ minWidth: 260 }}>
              <Search size={16} />
              <input className="input" style={{ height: 40, fontSize: 'var(--fs-base)' }} placeholder="e.g. ML-40218376, Sarah Alvarez or CUS-104230" aria-label="Policy number, customer name or customer ID" value={draft} onChange={(e) => { setDraft(e.target.value); if (!e.target.value) set({ q: '' }); }} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 40 }}>Search</button>
            <button type="button" className="btn btn-ghost" style={{ height: 40 }} aria-expanded={showFilters} onClick={() => setShowFilters((s) => !s)}>
              <SlidersHorizontal size={15} />Filters{filtersActive ? ` (${filtersActive})` : ''}<ChevronDown size={14} style={{ transform: showFilters ? 'rotate(180deg)' : undefined }} />
            </button>
          </div>
          {showFilters && (
            <div className="row gap-3 wrap">
              <div className="field" style={{ width: 200 }}>
                <label htmlFor="f-cust">Customer ID</label>
                <input id="f-cust" className="input" placeholder="CUS-…" value={customer} onChange={(e) => set({ customer: e.target.value })} />
              </div>
              <div className="field" style={{ width: 200 }}>
                <label htmlFor="f-status">Policy status</label>
                <select id="f-status" className="select" value={status} onChange={(e) => set({ status: e.target.value })}>
                  <option value="">Any status</option>
                  {POLICY_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="field" style={{ width: 220 }}>
                <label htmlFor="f-prod">Product type</label>
                <select id="f-prod" className="select" value={product} onChange={(e) => set({ product: e.target.value })}>
                  <option value="">Any product</option>
                  {PRODUCT_TYPES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              {filtersActive > 0 && (
                <div className="field" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => set({ status: '', product: '', customer: '' })}><X size={14} />Clear</button>
                </div>
              )}
            </div>
          )}
          {!q && !filtersActive && recent.length > 0 && (
            <div className="row wrap small">
              <span className="subtle">Recently viewed:</span>
              {recent.map((p) => (
                <button type="button" key={p.id} className="chip" style={{ border: 0, cursor: 'pointer' }} onClick={() => navigate(`/policies/${p.id}`)}>{p.id} · {p.owner.name}</button>
              ))}
            </div>
          )}
        </form>

        <div className="divider" />
        <div className="row between" style={{ padding: '10px var(--s5)' }}>
          <span className="small muted">{q || filtersActive ? `${results.length} ${results.length === 1 ? 'policy' : 'policies'} found` : `Showing all ${book.length} policies in your book`}</span>
        </div>
        {results.length === 0 ? (
          <Empty title="No policies found" text="Check the policy number or try the customer's name or ID." icon={<Search size={18} />} />
        ) : (
          <>
          <div className="table-wrap sticky-head">
            <table className="table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Policyholder</th>
                  <th className="hide-md">Product</th>
                  <th className="num hide-md">Face amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.slice.map((p) => (
                  <tr key={p.id} className="clickable" tabIndex={0} onClick={() => navigate(`/policies/${p.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/policies/${p.id}`)} aria-label={`Open policy ${p.id}`}>
                    <td><div className="primary-cell"><Link to={`/policies/${p.id}`} className="mono id-link" onClick={(e) => e.stopPropagation()}>{p.id}</Link></div><div className="id-cell">Issued {p.issueDate.slice(0, 4)}</div></td>
                    <td><div className="primary-cell">{p.owner.name}</div><div className="id-cell">{p.owner.id}</div></td>
                    <td className="hide-md"><div>{p.product}</div><div className="id-cell">{p.plan}</div></td>
                    <td className="num hide-md">{money(p.faceAmount)}</td>
                    <td><StateChip tone={policyTone(p.status)}>{p.status}</StateChip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...paged} noun="policies" />
          </>
        )}
      </section>
    </div>
  );
}
