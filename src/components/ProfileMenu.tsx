import React, { useEffect, useRef } from 'react';
import { CloseIcon, SettingsIcon } from './icons';
import type { AppSettings } from '../types/chat';

interface ProfileMenuProps {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  open,
  settings,
  onClose,
  onSettingsClick,
  onSignOut,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const menuItems = [
    {
      label: 'Settings',
      icon: <SettingsIcon size={18} />,
      onClick: () => { onSettingsClick(); onClose(); },
      ref: firstItemRef,
    },
    {
      label: 'Help & feedback',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
        </svg>
      ),
      onClick: () => { alert('Help & feedback — coming soon in a real deployment.'); onClose(); },
    },
    {
      label: 'Sign out / Reset demo',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
        </svg>
      ),
      onClick: () => { onSignOut(); onClose(); },
    },
  ];

  return (
    <>
      <div className="profile-menu__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="profile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Account menu"
      >
        <div className="profile-menu__header">
          <div className="profile-menu__identity">
            <span className="profile-menu__avatar" aria-hidden="true">
              {settings.userName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="profile-menu__name">{settings.userName}</p>
              <p className="profile-menu__email">{settings.userEmail}</p>
              <span className="profile-menu__badge">Demo account</span>
            </div>
          </div>
          <button className="profile-menu__close" onClick={onClose} aria-label="Close account menu">
            <CloseIcon size={18} />
          </button>
        </div>

        <hr className="profile-menu__divider" />

        <ul className="profile-menu__list" role="list">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                ref={'ref' in item ? (item.ref as React.RefObject<HTMLButtonElement>) : undefined}
                className="profile-menu__item"
                onClick={item.onClick}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <p className="profile-menu__disclaimer">
          Nova'sChat is an independent demo, not an official Google product.
        </p>
      </div>
    </>
  );
};
