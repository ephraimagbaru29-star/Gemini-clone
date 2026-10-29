import React, { useRef, useEffect } from 'react';
import { CameraIcon, ImageIcon, FileIcon, BrushIcon, CloseIcon } from './icons';
import { v4 as uuidv4 } from 'uuid';
import type { AttachmentMeta } from '../types/chat';

interface AttachmentSheetProps {
  open: boolean;
  onClose: () => void;
  onAttach: (attachments: AttachmentMeta[]) => void;
}

export const AttachmentSheet: React.FC<AttachmentSheetProps> = ({ open, onClose, onAttach }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const firstBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    firstBtnRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const attachments: AttachmentMeta[] = Array.from(files).map((file) => {
      const att: AttachmentMeta = {
        id: uuidv4(),
        name: file.name,
        mimeType: file.type,
        size: file.size,
      };
      if (file.type.startsWith('image/')) {
        att.previewUrl = URL.createObjectURL(file);
      }
      return att;
    });
    onAttach(attachments);
    onClose();
  };

  const handleCamera = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = () => processFiles(input.files);
    input.click();
    onClose();
  };

  const actions = [
    {
      icon: <CameraIcon size={24} />,
      label: 'Camera',
      description: 'Take a photo',
      onClick: handleCamera,
      ref: firstBtnRef,
    },
    {
      icon: <ImageIcon size={24} />,
      label: 'Photos',
      description: 'Choose from gallery',
      onClick: () => imageInputRef.current?.click(),
    },
    {
      icon: <FileIcon size={24} />,
      label: 'Files',
      description: 'Upload a document',
      onClick: () => fileInputRef.current?.click(),
    },
    {
      icon: <BrushIcon size={24} />,
      label: 'Create image',
      description: 'Generate an image (demo)',
      onClick: () => {
        alert('Image generation requires a real AI provider. Configure your API key in .env to enable this feature.');
        onClose();
      },
    },
  ];

  if (!open) return null;

  return (
    <>
      <div className="attachment-sheet__backdrop" onClick={onClose} aria-hidden="true" />

      <div
        className="attachment-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Attach content"
      >
        <div className="attachment-sheet__header">
          <h2 className="attachment-sheet__title">Attach</h2>
          <button
            className="attachment-sheet__close"
            onClick={onClose}
            aria-label="Close attachment sheet"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="attachment-sheet__grid" role="list">
          {actions.map((action) => (
            <div key={action.label} role="listitem">
              <button
                ref={'ref' in action ? (action.ref as React.RefObject<HTMLButtonElement>) : undefined}
                className="attachment-sheet__action"
                onClick={action.onClick}
                aria-label={`${action.label}: ${action.description}`}
              >
                <span className="attachment-sheet__action-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="attachment-sheet__action-label">{action.label}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-hidden="true"
          onChange={(e) => processFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          aria-hidden="true"
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>
    </>
  );
};
