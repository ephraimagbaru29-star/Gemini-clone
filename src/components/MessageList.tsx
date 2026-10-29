import React, { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChevronDownIcon } from './icons';
import type { ChatMessage } from '../types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  onRegenerate: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onRegenerate }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const userScrolledUpRef = useRef(false);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distFromBottom > 120;
      setShowScrollBtn(distFromBottom > 120);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="message-list" ref={containerRef} role="log" aria-label="Conversation" aria-live="polite">
      <div className="message-list__inner">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={idx === messages.length - 1}
            onRegenerate={msg.role === 'assistant' ? onRegenerate : undefined}
          />
        ))}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {showScrollBtn && (
        <button
          className="message-list__scroll-btn"
          onClick={() => {
            userScrolledUpRef.current = false;
            scrollToBottom('smooth');
          }}
          aria-label="Scroll to latest message"
          title="Scroll to bottom"
        >
          <ChevronDownIcon size={20} />
        </button>
      )}
    </div>
  );
};
