import React, { useState } from 'react';
import { CloseIcon } from './icons';
import { clearHistory } from '../lib/storage';
import type { AppSettings, Theme } from '../types/chat';

interface SettingsDialogProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  settings,
  onClose,
  onSave,
}) => {
  const [local, setLocal] = useState<AppSettings>(settings);

  React.useEffect(() => {
    setLocal(settings);
  }, [settings, open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleTheme = (theme: Theme) => setLocal((s) => ({ ...s, theme }));
  const handleSave = () => { onSave(local); onClose(); };

  const handleClearHistory = () => {
    if (confirm('Delete all conversation history? This cannot be undone.')) {
      clearHistory();
      onSave({ ...local });
      onClose();
      window.location.reload();
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="settings-dialog__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="settings-dialog__header">
          <h2 id="settings-title" className="settings-dialog__title">Settings</h2>
          <button className="settings-dialog__close" onClick={onClose} aria-label="Close settings">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="settings-dialog__body">
          {/* Appearance */}
          <section className="settings-dialog__section" aria-labelledby="theme-label">
            <h3 id="theme-label" className="settings-dialog__section-title">Appearance</h3>
            <div className="settings-dialog__theme-group" role="group" aria-labelledby="theme-label">
              {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  className={`settings-dialog__theme-btn${local.theme === t ? ' settings-dialog__theme-btn--active' : ''}`}
                  onClick={() => handleTheme(t)}
                  aria-pressed={local.theme === t}
                >
                  {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '⚙️ System'}
                </button>
              ))}
            </div>
          </section>

          {/* Account */}
          <section className="settings-dialog__section">
            <h3 className="settings-dialog__section-title">Demo account</h3>
            <label className="settings-dialog__label" htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              className="settings-dialog__input"
              type="text"
              value={local.userName}
              onChange={(e) => setLocal((s) => ({ ...s, userName: e.target.value }))}
            />
            <label className="settings-dialog__label" htmlFor="settings-email">Email</label>
            <input
              id="settings-email"
              className="settings-dialog__input"
              type="email"
              value={local.userEmail}
              onChange={(e) => setLocal((s) => ({ ...s, userEmail: e.target.value }))}
            />
          </section>

          {/* History */}
          <section className="settings-dialog__section">
            <h3 className="settings-dialog__section-title">History</h3>
            <label className="settings-dialog__toggle">
              <input
                type="checkbox"
                checked={local.saveHistory}
                onChange={(e) => setLocal((s) => ({ ...s, saveHistory: e.target.checked }))}
                aria-label="Save conversation history"
              />
              <span>Save conversation history</span>
            </label>
            <button className="settings-dialog__danger-btn" onClick={handleClearHistory}>
              🗑 Delete all history
            </button>
          </section>

          {/* About */}
          <section className="settings-dialog__section">
            <h3 className="settings-dialog__section-title">About</h3>
            <p className="settings-dialog__about-text">
              AstraChat v0.1 — an independent AI chat demo built with React, TypeScript, and Vite.
              Not affiliated with Google. Conversations are stored locally in your browser.
            </p>
          </section>
        </div>

        <div className="settings-dialog__footer">
          <button className="settings-dialog__cancel-btn" onClick={onClose}>Cancel</button>
          <button className="settings-dialog__save-btn" onClick={handleSave}>Save changes</button>
        </div>
      </div>
    </>
  );
};
