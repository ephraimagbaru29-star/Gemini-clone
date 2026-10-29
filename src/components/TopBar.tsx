import React from 'react';
import { SparkleIcon } from './icons';

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
      <button
        className="topbar__icon-btn"
        onClick={onMenuClick}
        aria-label="Open navigation drawer"
        title="Menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
      </button>

      <div className="topbar__brand">
        <SparkleIcon size={22} />
        <span className="topbar__brand-name">AstraChat</span>
      </div>

      <div className="topbar__actions">
        <button
          className="topbar__icon-btn"
          onClick={onNewChat}
          aria-label="New chat"
          title="New chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
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
