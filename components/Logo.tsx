'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark' | 'white';
  showText?: boolean;
}

export function Logo({ size = 'md', variant = 'light', showText = true }: LogoProps) {
  const containerSizes = {
    sm: 'w-7 h-7 rounded-lg text-sm',
    md: 'w-9 h-9 rounded-xl text-lg',
    lg: 'w-12 h-12 rounded-2xl text-2xl',
    xl: 'w-16 h-16 rounded-2xl text-3xl',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Icon: Deep Blue (#1d4ed8) container with bold white B & sky blue sparkle */}
      <div
        className={`${containerSizes[size]} bg-blue-600 flex items-center justify-center text-white shadow-md relative shrink-0 border border-blue-500/30`}
      >
        <span className="font-extrabold font-sans leading-none tracking-tighter">B</span>
        {/* Sparkle accent */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-sky-400 border border-blue-600" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span
            className={`font-extrabold tracking-tight leading-none ${textSizes[size]} ${
              variant === 'white'
                ? 'text-white'
                : variant === 'dark'
                ? 'text-slate-900'
                : 'text-blue-900'
            }`}
          >
            Businiche
          </span>
          <span
            className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 ${
              variant === 'white' ? 'text-blue-200' : 'text-blue-500'
            }`}
          >
            Lead Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
