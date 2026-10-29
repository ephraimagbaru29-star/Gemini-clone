import React from 'react';
import { SparkleIcon } from './icons';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  'Explain how neural networks learn',
  'Write a short poem about the ocean',
  'Help me debug a React component',
  'Summarise the history of the internet',
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick }) => {
  return (
    <div className="welcome">
      <div className="welcome__hero">
        <SparkleIcon size={48} className="welcome__sparkle" />
        <h1 className="welcome__greeting">How can I help you today?</h1>
      </div>

      <ul className="welcome__suggestions" role="list" aria-label="Suggested prompts">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              className="welcome__suggestion-btn"
              onClick={() => onSuggestionClick(s)}
              aria-label={`Try: ${s}`}
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
