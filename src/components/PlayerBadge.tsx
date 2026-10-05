/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { getTierByPoints } from '../utils/tiers';

interface PlayerBadgeProps {
  points?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showPoints?: boolean;
  onClick?: () => void;
  className?: string;
  shortLabel?: boolean;
}

export const PlayerBadge: React.FC<PlayerBadgeProps> = ({
  points = 0,
  size = 'xs',
  showIcon = true,
  showPoints = false,
  onClick,
  className = '',
  shortLabel = false
}) => {
  const tier = getTierByPoints(points);

  let sizeClasses = 'text-[7.5px] px-1.5 py-0.5 gap-1';
  if (size === 'sm') {
    sizeClasses = 'text-[8.5px] px-2 py-0.5 gap-1.5';
  } else if (size === 'md') {
    sizeClasses = 'text-[10px] px-2.5 py-1 gap-1.5 font-bold';
  } else if (size === 'lg') {
    sizeClasses = 'text-xs px-3.5 py-1.5 gap-2 font-black';
  }

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      title={`${tier.name} (${tier.badgeStyle}) - ${tier.description} [${points.toLocaleString()} pts]`}
      className={`inline-flex items-center rounded-full border uppercase tracking-wider font-extrabold select-none transition-all ${
        tier.badgeBg
      } ${tier.badgeBorder} ${tier.badgeText} ${tier.glowClass || ''} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:brightness-125 active:scale-95' : ''
      } ${className}`}
    >
      {showIcon && <span className="text-[1.05em] leading-none shrink-0">{tier.icon}</span>}
      <span className="truncate max-w-[130px] font-sans">
        {shortLabel ? tier.shortName : tier.name}
      </span>
      {showPoints && (
        <span className="opacity-80 font-mono text-[0.9em] border-l border-current/25 pl-1 ml-0.5 shrink-0">
          {points.toLocaleString()}p
        </span>
      )}
    </Component>
  );
};
