import React, { useState, useEffect } from 'react';

interface LoadingIndicatorProps {
  text: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ text }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prevDots => {
        if (prevDots.length >= 3) {
          return '';
        }
        return prevDots + '.';
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-gray-700">
      <span>🤖</span>
      <span className="font-medium">{text}{dots}</span>
    </div>
  );
};
