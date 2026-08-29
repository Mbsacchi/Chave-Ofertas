import React from 'react';

interface KeyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const KeyLogo: React.FC<KeyLogoProps> = ({ size = 'md', className = '' }) => {
  const iconBaseSize = size === 'sm' ? 24 : size === 'lg' ? 40 : 30;
  const textSize = size === 'sm' ? 'text-base sm:text-lg' : size === 'lg' ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl';
  const subtitleSize = size === 'sm' ? 'text-[8px] sm:text-[9px]' : size === 'lg' ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[10px]';

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 select-none cursor-pointer group ${className}`}>
      {/* SVG Key Icon with Golden Conversion Accents */}
      <div className="relative flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shrink-0">
        <svg
          width={iconBaseSize}
          height={iconBaseSize}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] w-7 h-7 sm:w-8 sm:h-8"
        >
          <defs>
            <linearGradient id="logoKeyGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="logoGlowGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
          
          {/* Key Head Ring */}
          <circle
            cx="36"
            cy="38"
            r="24"
            stroke="url(#logoKeyGradGold)"
            strokeWidth="7.5"
            className="transition-all duration-300 group-hover:stroke-[#FDE68A]"
          />
          {/* Key Core Dot */}
          <circle cx="36" cy="38" r="8" fill="url(#logoGlowGold)" />
          
          {/* Key Shaft */}
          <path
            d="M53 43 L84 74"
            stroke="url(#logoKeyGradGold)"
            strokeWidth="7.5"
            strokeLinecap="round"
          />
          
          {/* Modern Notch Bits */}
          <path
            d="M70 60 L78 52"
            stroke="url(#logoKeyGradGold)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <path
            d="M79 69 L87 61"
            stroke="url(#logoKeyGradGold)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          
          {/* Savings Sparkle Star in Gold */}
          <path
            d="M36 18 L38 24 L44 26 L38 28 L36 34 L34 28 L28 26 L34 24 Z"
            fill="#FBBF24"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Typography with Pristine Contrast */}
      <div className="flex flex-col leading-tight">
        <div className={`font-black tracking-tight font-sans flex items-center ${textSize}`}>
          <span className="text-amber-500 dark:text-amber-400">CHAVE</span>
          <span className="text-gray-900 dark:text-white ml-1">OFERTAS</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1 inline-block animate-ping"></span>
        </div>
        <span className={`font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 ${subtitleSize}`}>
          Comparador & Cupons
        </span>
      </div>
    </div>
  );
};
