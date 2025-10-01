import React, { useEffect, useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';

interface SuccessAnimationProps {
  message: string;
  onAnimationComplete: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  message,
  onAnimationComplete,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Allow some time for fade-out before calling onAnimationComplete
      setTimeout(onAnimationComplete, 500); 
    }, 2000); // Display for 2 seconds

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className={`bg-white p-8 rounded-lg shadow-2xl flex flex-col items-center space-y-4 transition-all duration-500 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <FiCheckCircle className="text-green-500 text-6xl animate-bounce-once" />
        <p className="text-xl font-semibold text-gray-800 text-center">{message}</p>
      </div>
    </div>
  );
};