import React, { useState } from 'react';
import { renderMarkdown } from '../lib/markdown';
import { CopyIcon, RefreshIcon, CheckIcon, SparkleIcon } from './icons';
import type { ChatMessage } from '../types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLast?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRegenerate,
  isLast,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  const handleDownloadImage = () => {
    if (!message.imageUrl) return;
    const a = document.createElement('a');
    a.href = message.imageUrl;
    a.download = `nova-image-${Date.now()}.png`;
    a.click();
  };

  // ─── Thinking / loading state ─────────────────────────────────────────────
  if (message.status === 'sending' && message.content === '') {
    return (
      <div className="message message--assistant" aria-live="polite" aria-label="Assistant is thinking">
        <div className="message__avatar" aria-hidden="true">
          <SparkleIcon size={18} />
        </div>
        <div className="message__body">
          <div className="message__thinking">
            <span className="message__dot" />
            <span className="message__dot" />
            <span className="message__dot" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Generating image state ───────────────────────────────────────────────
  if (message.status === 'sending' && message.content === '🎨 Generating image…') {
    return (
      <div className="message message--assistant" aria-live="polite" aria-label="Generating image">
        <div className="message__avatar" aria-hidden="true">
          <SparkleIcon size={18} />
        </div>
        <div className="message__body">
          <div className="message__image-generating">
            <span className="message__image-spinner" aria-hidden="true" />
            <span>Generating image…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`message message--${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message__avatar" aria-hidden="true">
          <SparkleIcon size={18} />
        </div>
      )}

      <div className="message__body">
        {/* Uploaded file attachments (user messages) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message__attachments">
            {message.attachments.map((att) => (
              <div key={att.id} className="message__attachment">
                {att.previewUrl && att.mimeType.startsWith('image/') ? (
                  <img src={att.previewUrl} alt={att.name} className="message__attachment-img" />
                ) : (
                  <span className="message__attachment-file">📎 {att.name}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Generated image (assistant messages) */}
        {message.imageUrl && !imgError && (
          <div className="message__generated-image-wrap">
            <img
              src={message.imageUrl}
              alt={message.imagePrompt ?? 'Generated image'}
              className="message__generated-image"
              onError={() => setImgError(true)}
              loading="lazy"
            />
            <button
              className="message__image-download-btn"
              onClick={handleDownloadImage}
              aria-label="Download image"
              title="Download"
            >
              ⬇ Download
            </button>
          </div>
        )}

        {imgError && (
          <p className="message__error" role="alert">
            ⚠ Image could not be displayed.
          </p>
        )}

        {/* Message text */}
        {message.content && message.content !== '🎨 Generating image…' && (
          isUser ? (
            <p className="message__text">{message.content}</p>
          ) : (
            <div
              className="message__markdown"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )
        )}

        {/* Error indicator */}
        {message.status === 'error' && !message.content && (
          <p className="message__error" role="alert">
            ⚠ Something went wrong. Please try again.
          </p>
        )}

        {/* Action buttons */}
        {!isUser && message.status !== 'sending' && (message.content || message.imageUrl) && (
          <div className="message__actions" role="group" aria-label="Message actions">
            {message.content && (
              <button
                className="message__action-btn"
                onClick={handleCopy}
                aria-label={copied ? 'Copied!' : 'Copy response'}
                title={copied ? 'Copied!' : 'Copy'}
              >
                {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {isLast && onRegenerate && (
              <button
                className="message__action-btn"
                onClick={onRegenerate}
                aria-label="Regenerate response"
                title="Regenerate"
              >
                <RefreshIcon size={16} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
