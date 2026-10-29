import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TopBar } from '../components/TopBar';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { ConversationView } from '../components/ConversationView';
import { AttachmentSheet } from '../components/AttachmentSheet';
import { ProfileMenu } from '../components/ProfileMenu';
import { SettingsDialog } from '../components/SettingsDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Toast } from '../components/Toast';
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
} from '../lib/storage';
import type { Conversation, AppSettings, AttachmentMeta, ToastMessage } from '../types/chat';

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentMeta[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Apply theme on mount and changes
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective =
      settings.theme === 'system' ? (prefersDark ? 'dark' : 'light') : settings.theme;
    root.setAttribute('data-theme', effective);
  }, [settings.theme]);

  // Persist conversations (when saveHistory is on)
  useEffect(() => {
    if (settings.saveHistory) {
      saveConversations(conversations);
    }
  }, [conversations, settings.saveHistory]);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const handleConversationUpdate = useCallback((updated: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
  }, []);

  const handleNewConversation = useCallback((convo: Conversation) => {
    setConversations((prev) => [convo, ...prev]);
    setActiveId(convo.id);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveId(null);
    setDrawerOpen(false);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveId(id);
    setDrawerOpen(false);
  }, []);

  const handleRenameConversation = useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    addToast('Conversation renamed', 'success');
  }, [addToast]);

  const handleDeleteRequest = useCallback((id: string) => {
    setConfirmDelete(id);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!confirmDelete) return;
    setConversations((prev) => prev.filter((c) => c.id !== confirmDelete));
    if (activeId === confirmDelete) setActiveId(null);
    addToast('Conversation deleted', 'info');
    setConfirmDelete(null);
  }, [confirmDelete, activeId, addToast]);

  const handleSaveSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    saveSettings(s);
    addToast('Settings saved', 'success');
  }, [addToast]);

  const handleSignOut = useCallback(() => {
    addToast('Demo mode: no real account to sign out from.', 'info');
  }, [addToast]);

  const handleUpgrade = () => {
    addToast('Upgrade is a demo feature — no billing is connected.', 'info');
  };

  const handleAddAttachments = useCallback((atts: AttachmentMeta[]) => {
    setPendingAttachments((prev) => [...prev, ...atts]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleClearAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  const deleteTarget = confirmDelete
    ? conversations.find((c) => c.id === confirmDelete)
    : null;

  return (
    <div className="app-shell">
      <TopBar
        onMenuClick={() => setDrawerOpen(true)}
        onNewChat={handleNewChat}
        onProfileClick={() => setProfileOpen(true)}
        userAvatar={settings.userAvatar}
        userName={settings.userName}
      />

      <div className="app-shell__body">
        {/* Desktop sidebar (≥ 900px) rendered as persistent panel */}
        <HistoryDrawer
          open={drawerOpen}
          conversations={conversations}
          activeId={activeId}
          settings={settings}
          onClose={() => setDrawerOpen(false)}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteRequest}
          onSettingsClick={() => { setSettingsOpen(true); setDrawerOpen(false); }}
          onProfileClick={() => { setProfileOpen(true); setDrawerOpen(false); }}
          onUpgradeClick={handleUpgrade}
        />

        <main className="app-shell__main" id="main-content" role="main">
          <ConversationView
            conversation={activeConversation}
            onConversationUpdate={handleConversationUpdate}
            onNewConversation={handleNewConversation}
            pendingAttachments={pendingAttachments}
            onAttachClick={() => setAttachSheetOpen(true)}
            onRemoveAttachment={handleRemoveAttachment}
            onClearAttachments={handleClearAttachments}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
          />
        </main>
      </div>

      <AttachmentSheet
        open={attachSheetOpen}
        onClose={() => setAttachSheetOpen(false)}
        onAttach={handleAddAttachments}
      />

      <ProfileMenu
        open={profileOpen}
        settings={settings}
        onClose={() => setProfileOpen(false)}
        onSettingsClick={() => setSettingsOpen(true)}
        onSignOut={handleSignOut}
      />

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete conversation?"
        message={`"${deleteTarget?.title ?? ''}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
