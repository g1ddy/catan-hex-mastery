import React, { useEffect, useState } from 'react';
import { CoachFeedback } from '../game/types';
import './Toast.css';

interface ToastProps {
  feedback: CoachFeedback | null;
}

export const Toast: React.FC<ToastProps> = ({ feedback }) => {
  const [visible, setVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<CoachFeedback | null>(null);

  useEffect(() => {
    if (feedback) {
      setCurrentFeedback(feedback);
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000); // Linger for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!visible || !currentFeedback) return null;

  return (
    <div className={`toast toast-${currentFeedback.quality}`}>
      <div className="toast-message">{currentFeedback.message}</div>
    </div>
  );
};
