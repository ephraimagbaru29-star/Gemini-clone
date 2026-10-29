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

  return (
    <div className={`message message--${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message__avatar" aria-hidden="true">
          <SparkleIcon size={18} />
        </div>
      )}

      <div className="message__body">
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

        {isUser ? (
          <p className="message__text">{message.content}</p>
        ) : (
          <div
            className="message__markdown"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}

        {message.status === 'error' && (
          <p className="message__error" role="alert">
            ⚠ Something went wrong. Please try again.
          </p>
        )}

        {!isUser && message.status !== 'sending' && message.content && (
          <div className="message__actions" role="group" aria-label="Message actions">
            <button
              className="message__action-btn"
              onClick={handleCopy}
              aria-label={copied ? 'Copied!' : 'Copy response'}
              title={copied ? 'Copied!' : 'Copy'}
            >
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

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
