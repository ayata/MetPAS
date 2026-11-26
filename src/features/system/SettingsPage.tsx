import { useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Panel } from '../../components/ui';
import { SettingsContent } from '../../layout/HeaderParts';
import { useStore } from '../../store/AppStore';
import { groupById } from '../../config/groups';
import { profileById } from '../../config/profiles';
import { roleById } from '../../config/roles';
import { Crumbs, KV } from '../../components/module';

export function SettingsPage() {
  const store = useStore();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Crumbs items={['Administration', 'Settings']} />
          <h1>Settings</h1>
          <p className="lead">Preferences for this demonstration session. This is a demonstration environment — all data is synthetic.</p>
        </div>
      </div>
      <Panel title="Your session">
        <KV two items={[['User', store.me.name], ['Experience', roleById(store.session.role).name], ['Permission profile', profileById(store.session.profileId).name], ['User group', groupById(store.session.groupId).name]]} />
      </Panel>
      <Panel title="Appearance" desc="Preview how MetPAS looks in each theme.">
        <ThemePreview />
      </Panel>
      <Panel title="Preferences and demonstration data">
        <div className="stack gap-4"><SettingsContent /></div>
      </Panel>
    </div>
  );
}

type ThemeId = 'light' | 'dark' | 'system';
const THEMES: { id: ThemeId; label: string; icon: typeof Sun; note: string }[] = [
  { id: 'light', label: 'Light', icon: Sun, note: 'Current theme' },
  { id: 'dark', label: 'Dark', icon: Moon, note: 'Coming soon' },
  { id: 'system', label: 'System', icon: Monitor, note: 'Coming soon · follows your device' },
];

/** Miniature app window (sidebar, header, cards, rows) drawn in the given theme. */
function MiniApp({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={`tp-mini tp-${theme}`} aria-hidden>
      <div className="tp-side"><i /><i /><i /><i /></div>
      <div className="tp-main">
        <div className="tp-head"><i /><b /></div>
        <div className="tp-cards"><span /><span className="warn" /><span className="bad" /></div>
        <div className="tp-rows"><i /><i /><i /></div>
      </div>
    </div>
  );
}

/** Theme picker with live miniature previews. Only Light is applied in this demonstration. */
function ThemePreview() {
  const [sel, setSel] = useState<ThemeId>('light');
  return (
    <div className="stack gap-3">
      <div className="tp-grid" role="radiogroup" aria-label="Theme">
        {THEMES.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} role="radio" aria-checked={sel === t.id} className={`tp-option ${sel === t.id ? 'on' : ''}`} onClick={() => setSel(t.id)}>
              {t.id === 'system' ? (
                <span className="tp-split"><MiniApp theme="light" /><MiniApp theme="dark" /></span>
              ) : <MiniApp theme={t.id} />}
              <span className="tp-label">
                <Icon size={15} />
                <span className="grow"><span className="strong">{t.label}</span><span className="xs subtle" style={{ display: 'block' }}>{t.note}</span></span>
                {sel === t.id && <Check size={16} className="tp-check" />}
              </span>
            </button>
          );
        })}
      </div>
      {sel !== 'light' && (
        <p className="small muted">This is a preview only. Dark and System themes are not available yet, so the app stays in the Light theme.</p>
      )}
    </div>
  );
}
