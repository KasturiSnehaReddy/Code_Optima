import React, { useState, useEffect } from 'react';

const TypewriterText = ({ text, speed = 100, delay = 0 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setIsStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, speed, isStarted]);

  return (
    <span className="typewriter">
      {displayedText}
      {currentIndex < text.length && (
        <span className="cursor animate-pulse">|</span>
      )}
    </span>
  );
};

export default TypewriterText;
