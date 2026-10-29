import React, { useRef, useState, useEffect, useCallback } from 'react';
import { SendIcon, MicIcon, AttachIcon, StopIcon } from './icons';
import type { AttachmentMeta } from '../types/chat';

interface ComposerProps {
  onSend: (text: string, attachments: AttachmentMeta[]) => void;
  onAttachClick: () => void;
  isGenerating: boolean;
  onStop: () => void;
  pendingAttachments: AttachmentMeta[];
  onRemoveAttachment: (id: string) => void;
  disabled?: boolean;
}

type VoiceState = 'idle' | 'requesting' | 'recording' | 'denied';

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  onAttachClick,
  isGenerating,
  onStop,
  pendingAttachments,
  onRemoveAttachment,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    if (isGenerating) return;
    onSend(trimmed, pendingAttachments);
    setText('');
  }, [text, pendingAttachments, isGenerating, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoice = async () => {
    if (voiceState === 'recording') {
      recognitionRef.current?.stop();
      setVoiceState('idle');
      return;
    }

    const SpeechRecognitionCtor =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    setVoiceState('requesting');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceState('denied');
      setTimeout(() => setVoiceState('idle'), 3000);
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    recognitionRef.current = rec;

    rec.onstart = () => setVoiceState('recording');
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('');
      setText(transcript);
    };
    rec.onend = () => setVoiceState('idle');
    rec.onerror = () => setVoiceState('idle');
    rec.start();
  };

  const canSend = (text.trim().length > 0 || pendingAttachments.length > 0) && !disabled;

  return (
    <div className="composer" role="form" aria-label="Message composer">
      {pendingAttachments.length > 0 && (
        <div className="composer__attachments" aria-label="Pending attachments">
          {pendingAttachments.map((att) => (
            <div key={att.id} className="composer__attachment-chip">
              {att.previewUrl ? (
                <img src={att.previewUrl} alt={att.name} className="composer__attachment-preview" />
              ) : (
                <span className="composer__attachment-icon" aria-hidden="true">📎</span>
              )}
              <span className="composer__attachment-name">{att.name}</span>
              <button
                className="composer__attachment-remove"
                onClick={() => onRemoveAttachment(att.id)}
                aria-label={`Remove ${att.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="composer__row">
        <button
          className="composer__icon-btn"
          onClick={onAttachClick}
          aria-label="Add attachment"
          title="Attach"
          type="button"
          disabled={disabled}
        >
          <AttachIcon size={20} />
        </button>

        <textarea
          ref={textareaRef}
          className="composer__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          rows={1}
          aria-label="Message input"
          aria-multiline="true"
          disabled={disabled}
        />

        {isGenerating ? (
          <button
            className="composer__icon-btn composer__icon-btn--stop"
            onClick={onStop}
            aria-label="Stop generating"
            title="Stop"
            type="button"
          >
            <StopIcon size={18} />
          </button>
        ) : canSend ? (
          <button
            className="composer__send-btn"
            onClick={handleSend}
            aria-label="Send message"
            title="Send"
            type="button"
          >
            <SendIcon size={18} />
          </button>
        ) : (
          <button
            className={`composer__icon-btn composer__icon-btn--mic${voiceState === 'recording' ? ' composer__icon-btn--recording' : ''}`}
            onClick={handleVoice}
            aria-label={voiceState === 'recording' ? 'Stop recording' : 'Use voice input'}
            title={voiceState === 'denied' ? 'Microphone access denied' : 'Voice input'}
            type="button"
            disabled={disabled || voiceState === 'requesting'}
          >
            <MicIcon size={20} />
          </button>
        )}
      </div>

      {voiceState === 'recording' && (
        <p className="composer__voice-status" role="status" aria-live="polite">
          🔴 Listening… tap the mic to stop
        </p>
      )}
      {voiceState === 'denied' && (
        <p className="composer__voice-status composer__voice-status--error" role="alert">
          Microphone access denied. Check browser settings.
        </p>
      )}

      <p className="composer__disclaimer">
        AstraChat is an independent demo — responses may be inaccurate.
      </p>
    </div>
  );
};
