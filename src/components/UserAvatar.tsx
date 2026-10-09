/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface UserAvatarProps {
  photoURL?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBorder?: boolean;
}

const SIZE_MAP = {
  xs: 'w-5 h-5 text-[9px] rounded-full',
  sm: 'w-7 h-7 text-xs rounded-full',
  md: 'w-9 h-9 text-sm rounded-xl',
  lg: 'w-12 h-12 text-base rounded-2xl',
  xl: 'w-16 h-16 text-xl rounded-2xl'
};

// Distinct pastel-tinted backgrounds for initial fallbacks
const GRADIENTS = [
  'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white',
  'bg-gradient-to-tr from-amber-500 to-orange-600 text-white',
  'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white',
  'bg-gradient-to-tr from-violet-500 to-purple-600 text-white',
  'bg-gradient-to-tr from-rose-500 to-pink-600 text-white',
  'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white'
];

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoURL,
  name = 'Player',
  size = 'md',
  className = '',
  showBorder = true
}) => {
  const [imgError, setImgError] = useState(false);

  const cleanName = (name || 'P').trim();
  const firstLetter = cleanName.charAt(0).toUpperCase() || 'P';

  // Deterministic background gradient choice based on name
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradientClass = GRADIENTS[Math.abs(hash) % GRADIENTS.length];

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const borderClass = showBorder ? 'border border-zinc-200/90 shadow-xs' : '';

  if (photoURL && !imgError) {
    return (
      <div className={`relative shrink-0 overflow-hidden bg-zinc-100 ${sizeClass} ${borderClass} ${className}`}>
        <img
          src={photoURL}
          alt={cleanName}
          className="w-full h-full object-cover select-none"
          onError={() => setImgError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center font-black select-none ${sizeClass} ${gradientClass} ${borderClass} ${className}`}
      title={cleanName}
    >
      <span>{firstLetter}</span>
    </div>
  );
};
