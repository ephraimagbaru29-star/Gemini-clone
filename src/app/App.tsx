import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Session } from '@supabase/supabase-js';
import { TopBar } from '../components/TopBar';
import { HistoryDrawer } from '../components/HistoryDrawer';
import { ConversationView } from '../components/ConversationView';
import { AttachmentSheet } from '../components/AttachmentSheet';
import { ProfileMenu } from '../components/ProfileMenu';
import { SettingsDialog } from '../components/SettingsDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Toast } from '../components/Toast';
import { AuthScreen } from '../components/AuthScreen';
import { AuthCallback } from '../components/AuthCallback';
import { supabase, signOut, isSupabaseConfigured } from '../lib/supabase';
import {
  loadConversations,
  saveConversations,
  loadSettings,
  saveSettings,
} from '../lib/storage';
import type {
  Conversation,
  AppSettings,
  AttachmentMeta,
  ToastMessage,
  AuthUser,
} from '../types/chat';

// ─── Simple client-side routing ─────────────────────────────────────────────
function getRoute(): 'callback' | 'app' {
  return window.location.pathname === '/auth/callback' ? 'callback' : 'app';
}

export const App: React.FC = () => {
  const route = getRoute();

  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading
  const [conversations, setConversations] = useState<Conversation[]>([]);
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

  // ─── Auth state ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // No Supabase — go straight to sign-in screen (no infinite loading)
      setSession(null);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) setConversations(loadConversations());
    }).catch(() => {
      // If Supabase fails for any reason, unblock the UI
      setSession(null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setConversations(loadConversations());
      if (!s) setConversations([]);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Build AuthUser from Supabase session
  const authUser: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? undefined,
        name:
          (session.user.user_metadata?.full_name as string | undefined) ??
          (session.user.user_metadata?.name as string | undefined) ??
          session.user.email?.split('@')[0] ??
          'User',
        avatarUrl:
          (session.user.user_metadata?.avatar_url as string | undefined) ??
          (session.user.user_metadata?.picture as string | undefined) ??
          undefined,
        provider: session.user.app_metadata?.provider as string | undefined,
      }
    : null;

  // Sync authUser name/avatar into settings so drawer + topbar show real info
  useEffect(() => {
    if (!authUser) return;
    setSettings((prev) => ({
      ...prev,
      userName: authUser.name ?? prev.userName,
      userEmail: authUser.email ?? prev.userEmail,
      userAvatar: authUser.avatarUrl ?? prev.userAvatar,
    }));
  }, [authUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Theme ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective =
      settings.theme === 'system' ? (prefersDark ? 'dark' : 'light') : settings.theme;
    root.setAttribute('data-theme', effective);
  }, [settings.theme]);

  // ─── Persist conversations ───────────────────────────────────────────────
  useEffect(() => {
    if (settings.saveHistory && session) {
      saveConversations(conversations);
    }
  }, [conversations, settings.saveHistory, session]);

  // ─── Toasts ─────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Conversation handlers ───────────────────────────────────────────────
  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const handleConversationUpdate = useCallback((updated: Conversation) => {
    setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
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
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
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

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      addToast('Signed out successfully', 'success');
    } catch {
      addToast('Sign out failed. Please try again.', 'error');
    }
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

  // ─── Routing ────────────────────────────────────────────────────────────
  if (route === 'callback') return <AuthCallback />;

  // Loading state — wait for Supabase to check session
  if (session === undefined) {
    return (
      <div className="auth-loading" aria-label="Loading">
        <div className="auth-loading__dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  // Not signed in — show auth screen
  if (!session) return <AuthScreen />;

  // ─── Main app ────────────────────────────────────────────────────────────
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
