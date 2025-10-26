'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface JobNekoLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function JobNekoLogo({
  size = 50,
  className = '',
  showText = true,
  textClassName = ''
}: JobNekoLogoProps) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch('/neko/black-cat.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading cat animation:', error));
  }, []);

  if (!animationData) {
    // Fallback to text while loading
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div style={{ width: size, height: size }} className="bg-gray-200 rounded animate-pulse" />
        {showText && (
          <span className={`font-bold text-2xl ${textClassName}`}>
            JobNeko
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div style={{ width: size, height: size }}>
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {showText && (
        <span className={`font-bold text-xl ${textClassName}`}>
          JobNeko
        </span>
      )}
    </div>
  );
}

interface JobNekoErrorProps {
  size?: number;
  className?: string;
  message?: string;
}

export function JobNekoError({
  size = 120,
  className = '',
  message = 'Oops! Something went wrong'
}: JobNekoErrorProps) {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch('/neko/connection-error.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading error cat animation:', error));
  }, []);

  if (!animationData) {
    // Fallback while loading
    return (
      <div className={`text-center ${className}`}>
        <div style={{ width: size, height: size }} className="bg-gray-200 rounded animate-pulse mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`}>
      <div style={{ width: size, height: size }} className="mx-auto mb-4">
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  );
}