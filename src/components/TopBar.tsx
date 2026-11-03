import React from 'react';

interface TopBarProps {
  onMenuClick: () => void;
  onNewChat: () => void;
  onProfileClick: () => void;
  userAvatar: string;
  userName: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  onNewChat,
  onProfileClick,
  userAvatar,
  userName,
}) => {
  return (
    <header className="topbar" role="banner">
      {/* Left: hamburger */}
      <button
        className="topbar__icon-btn"
        onClick={onMenuClick}
        aria-label="Open navigation drawer"
        title="Menu"
      >
        <svg width="22" height="18" viewBox="0 0 22 18" fill="none" aria-hidden="true">
          <rect y="0"  width="22" height="2" rx="1" fill="currentColor"/>
          <rect y="8"  width="22" height="2" rx="1" fill="currentColor"/>
          <rect y="16" width="22" height="2" rx="1" fill="currentColor"/>
        </svg>
      </button>

      {/* Center: brand name + Auto dropdown */}
      <div className="topbar__brand">
        <span className="topbar__brand-name">Nova'sChat</span>
        <button className="topbar__model-pill" aria-label="Select model" title="Model selector">
          <span>Auto</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      {/* Right: edit icon + avatar */}
      <div className="topbar__actions">
        <button
          className="topbar__icon-btn"
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
        >
          {/* Pen/edit icon matching Gemini's pencil-with-sparkle */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
        </button>

        <button
          className="topbar__avatar-btn"
          onClick={onProfileClick}
          aria-label={`Account: ${userName}`}
          title="Account"
        >
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="topbar__avatar-img" />
          ) : (
            <span className="topbar__avatar-initials" aria-hidden="true">
              {userName.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
