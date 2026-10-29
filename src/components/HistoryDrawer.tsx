import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SparkleIcon, SearchIcon, CloseIcon, MoreVertIcon, EditIcon, DeleteIcon } from './icons';
import { SettingsIcon } from './icons';
import { groupByDate } from '../lib/dateFormat';
import type { Conversation, AppSettings } from '../types/chat';

interface HistoryDrawerProps {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  settings: AppSettings;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
  onUpgradeClick: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  open,
  conversations,
  activeId,
  settings,
  onClose,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onSettingsClick,
  onProfileClick,
  onUpgradeClick,
}) => {
  const [query, setQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  // Trap focus & keyboard dismiss
  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.history-drawer__overflow-menu')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingId) renameRef.current?.focus();
  }, [renamingId]);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );
  const groups = groupByDate(filtered);

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setOpenMenuId(null);
  };

  const commitRename = useCallback(
    (id: string) => {
      const trimmed = renameValue.trim();
      if (trimmed) onRenameConversation(id, trimmed);
      setRenamingId(null);
    },
    [renameValue, onRenameConversation],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`history-drawer__backdrop${open ? ' history-drawer__backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={drawerRef}
        className={`history-drawer${open ? ' history-drawer--open' : ''}`}
        aria-label="Navigation drawer"
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="history-drawer__header">
          <div className="history-drawer__header-brand">
            <SparkleIcon size={22} />
            <span className="history-drawer__title">AstraChat</span>
          </div>
          <div className="history-drawer__header-actions">
            <button
              className="history-drawer__icon-btn"
              onClick={onClose}
              aria-label="Close navigation drawer"
              title="Close"
            >
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* New chat */}
        <button className="history-drawer__new-chat" onClick={() => { onNewChat(); onClose(); }}>
          <span aria-hidden="true">＋</span> New chat
        </button>

        {/* Search */}
        <div className="history-drawer__search">
          <SearchIcon size={16} className="history-drawer__search-icon" />
          <input
            ref={searchRef}
            type="search"
            className="history-drawer__search-input"
            placeholder="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search conversations"
          />
        </div>

        {/* Conversation list */}
        <div className="history-drawer__list-container" role="navigation" aria-label="Conversation history">
          {conversations.length === 0 ? (
            <p className="history-drawer__empty">No conversations yet.</p>
          ) : filtered.length === 0 ? (
            <p className="history-drawer__empty">No results for "{query}"</p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="history-drawer__group">
                <p className="history-drawer__group-label">{group.label}</p>
                <ul className="history-drawer__list" role="list">
                  {group.items.map((convo) => (
                    <li
                      key={convo.id}
                      className={`history-drawer__item${convo.id === activeId ? ' history-drawer__item--active' : ''}`}
                    >
                      {renamingId === convo.id ? (
                        <input
                          ref={renameRef}
                          className="history-drawer__rename-input"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(convo.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(convo.id);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          aria-label="Rename conversation"
                        />
                      ) : (
                        <button
                          className="history-drawer__item-btn"
                          onClick={() => { onSelectConversation(convo.id); onClose(); }}
                          aria-label={`Open conversation: ${convo.title}`}
                          aria-current={convo.id === activeId ? 'page' : undefined}
                        >
                          <span className="history-drawer__item-title">{convo.title}</span>
                        </button>
                      )}

                      <div className="history-drawer__overflow-menu">
                        <button
                          className="history-drawer__overflow-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === convo.id ? null : convo.id);
                          }}
                          aria-label={`More options for ${convo.title}`}
                          aria-expanded={openMenuId === convo.id}
                          aria-haspopup="menu"
                        >
                          <MoreVertIcon size={16} />
                        </button>

                        {openMenuId === convo.id && (
                          <div className="history-drawer__dropdown" role="menu" aria-label="Conversation options">
                            <button
                              className="history-drawer__dropdown-item"
                              role="menuitem"
                              onClick={() => startRename(convo.id, convo.title)}
                            >
                              <EditIcon size={15} /> Rename
                            </button>
                            <button
                              className="history-drawer__dropdown-item history-drawer__dropdown-item--danger"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                onDeleteConversation(convo.id);
                              }}
                            >
                              <DeleteIcon size={15} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="history-drawer__footer">
          <button className="history-drawer__upgrade-btn" onClick={onUpgradeClick}>
            ✦ Upgrade plan
          </button>

          <div className="history-drawer__profile-row">
            <button className="history-drawer__profile-btn" onClick={onProfileClick} aria-label="Account and profile">
              <span className="history-drawer__profile-avatar" aria-hidden="true">
                {settings.userName.charAt(0).toUpperCase()}
              </span>
              <span className="history-drawer__profile-name">{settings.userName}</span>
            </button>
            <button
              className="history-drawer__icon-btn"
              onClick={onSettingsClick}
              aria-label="Settings"
              title="Settings"
            >
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
