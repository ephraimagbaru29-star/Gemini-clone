import React from 'react';
import { SparkleIcon } from './icons';

interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSuggestionClick: _unused }) => {
  void _unused; // kept for API compatibility
  return (
    <div className="welcome">
      <div className="welcome__hero">
        <SparkleIcon size={52} className="welcome__sparkle" />
        <h1 className="welcome__greeting">Where should we start?</h1>
      </div>
    </div>
  );
};
