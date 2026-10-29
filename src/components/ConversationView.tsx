import React, { useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MessageList } from './MessageList';
import { WelcomeScreen } from './WelcomeScreen';
import { Composer } from './Composer';
import { isDemoMode, sendMessage } from '../lib/chatApi';
import type { ChatMessage, Conversation, AttachmentMeta } from '../types/chat';

interface ConversationViewProps {
  conversation: Conversation | null;
  onConversationUpdate: (convo: Conversation) => void;
  onNewConversation: (convo: Conversation) => void;
  pendingAttachments: AttachmentMeta[];
  onAttachClick: () => void;
  onRemoveAttachment: (id: string) => void;
  onClearAttachments: () => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversation,
  onConversationUpdate,
  onNewConversation,
  pendingAttachments,
  onAttachClick,
  onRemoveAttachment,
  onClearAttachments,
  isGenerating,
  setIsGenerating,
}) => {
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(
    async (text: string, attachments: AttachmentMeta[]) => {
      if (!text.trim() && attachments.length === 0) return;

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
        status: 'complete',
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'sending',
      };

      let currentConvo: Conversation;

      if (!conversation) {
        currentConvo = {
          id: uuidv4(),
          title: text.slice(0, 60) || 'New conversation',
          messages: [userMsg, assistantMsg],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onNewConversation(currentConvo);
      } else {
        currentConvo = {
          ...conversation,
          messages: [...conversation.messages, userMsg, assistantMsg],
          updatedAt: Date.now(),
        };
        onConversationUpdate(currentConvo);
      }

      onClearAttachments();
      setIsGenerating(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const allMsgs = currentConvo.messages.slice(0, -1); // exclude placeholder
        let accumulated = '';

        await sendMessage({
          messages: allMsgs,
          signal: ctrl.signal,
          onChunk: (chunk) => {
            accumulated += chunk;
            const updatedAssistant: ChatMessage = {
              ...assistantMsg,
              content: accumulated,
              status: 'sending',
            };
            const updatedConvo = {
              ...currentConvo,
              messages: currentConvo.messages.map((m) =>
                m.id === assistantMsg.id ? updatedAssistant : m,
              ),
              updatedAt: Date.now(),
            };
            currentConvo = updatedConvo;
            onConversationUpdate(updatedConvo);
          },
        });

        const finalAssistant: ChatMessage = {
          ...assistantMsg,
          content: accumulated,
          status: 'complete',
        };

        // Add demo label if in demo mode
        const demoNote = isDemoMode()
          ? '\n\n---\n*⚠ Demo mode — no real AI provider configured.*'
          : '';

        const finalConvo = {
          ...currentConvo,
          messages: currentConvo.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...finalAssistant, content: accumulated + demoNote }
              : m,
          ),
          updatedAt: Date.now(),
        };
        onConversationUpdate(finalConvo);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;

        const errorAssistant: ChatMessage = {
          ...assistantMsg,
          content: 'Sorry, something went wrong. Please try again.',
          status: 'error',
        };
        onConversationUpdate({
          ...currentConvo,
          messages: currentConvo.messages.map((m) =>
            m.id === assistantMsg.id ? errorAssistant : m,
          ),
        });
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [conversation, onConversationUpdate, onNewConversation, onClearAttachments, setIsGenerating],
  );

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRegenerate = useCallback(() => {
    if (!conversation) return;
    const msgs = conversation.messages;
    // Remove last assistant message and resend
    const lastAssistantIdx = [...msgs].reverse().findIndex((m) => m.role === 'assistant');
    if (lastAssistantIdx === -1) return;
    const realIdx = msgs.length - 1 - lastAssistantIdx;
    const trimmed = { ...conversation, messages: msgs.slice(0, realIdx) };
    onConversationUpdate(trimmed);
    const lastUserMsg = [...trimmed.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.content, lastUserMsg.attachments ?? []);
    }
  }, [conversation, handleSend, onConversationUpdate]);

  const messages = conversation?.messages ?? [];
  const showWelcome = messages.length === 0;

  return (
    <div className="conversation-view">
      {showWelcome ? (
        <WelcomeScreen onSuggestionClick={(s) => handleSend(s, [])} />
      ) : (
        <MessageList messages={messages} onRegenerate={handleRegenerate} />
      )}

      <Composer
        onSend={handleSend}
        onAttachClick={onAttachClick}
        isGenerating={isGenerating}
        onStop={handleStop}
        pendingAttachments={pendingAttachments}
        onRemoveAttachment={onRemoveAttachment}
      />
    </div>
  );
};
