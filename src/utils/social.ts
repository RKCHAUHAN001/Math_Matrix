/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SocialPlatform = 'facebook' | 'x' | 'instagram' | 'linkedin' | 'youtube';

export interface SocialInfo {
  platform: SocialPlatform;
  label: string;
  url: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Validates and formats a social media URL.
 * Only allows: Facebook, X, Instagram, LinkedIn, and YouTube.
 * Supports full URLs with query parameters, protocol prefixes, etc.
 */
export function parseAndValidateSocialUrl(rawInput: string): { 
  valid: boolean; 
  error?: string; 
  cleanUrl?: string; 
  platform?: SocialPlatform;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: true, cleanUrl: '' }; // Allow clearing
  }

  let candidate = trimmed;
  // If user pasted without protocol (e.g. instagram.com/username), prepend https://
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const urlObj = new URL(candidate);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');

    // 1. Facebook
    if (host === 'facebook.com' || host === 'fb.com' || host.endsWith('.facebook.com')) {
      return { valid: true, cleanUrl: urlObj.toString(), platform: 'facebook' };
    }

    // 2. X / Twitter
    if (host === 'x.com' || host === 'twitter.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
      return { valid: true, cleanUrl: urlObj.toString(), platform: 'x' };
    }

    // 3. Instagram
    if (host === 'instagram.com' || host === 'instagr.am' || host.endsWith('.instagram.com')) {
      return { valid: true, cleanUrl: urlObj.toString(), platform: 'instagram' };
    }

    // 4. LinkedIn
    if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
      return { valid: true, cleanUrl: urlObj.toString(), platform: 'linkedin' };
    }

    // 5. YouTube
    if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
      return { valid: true, cleanUrl: urlObj.toString(), platform: 'youtube' };
    }

    return {
      valid: false,
      error: 'Allowed links: Facebook, X, Instagram, LinkedIn, or YouTube.'
    };
  } catch {
    return {
      valid: false,
      error: 'Invalid web URL. Please paste a valid link.'
    };
  }
}

/**
 * Returns platform details, branding colors, and formatted URL.
 */
export function getSocialInfo(rawUrl?: string): SocialInfo | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const parsed = parseAndValidateSocialUrl(rawUrl);
  if (!parsed.valid || !parsed.platform || !parsed.cleanUrl) return null;

  switch (parsed.platform) {
    case 'instagram':
      return {
        platform: 'instagram',
        label: 'Instagram',
        url: parsed.cleanUrl,
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/10 hover:bg-pink-500/25',
        borderColor: 'border-pink-500/40'
      };
    case 'x':
      return {
        platform: 'x',
        label: 'X',
        url: parsed.cleanUrl,
        color: 'text-zinc-200',
        bgColor: 'bg-white/10 hover:bg-white/20',
        borderColor: 'border-white/25'
      };
    case 'facebook':
      return {
        platform: 'facebook',
        label: 'Facebook',
        url: parsed.cleanUrl,
        color: 'text-blue-400',
        bgColor: 'bg-blue-600/15 hover:bg-blue-600/30',
        borderColor: 'border-blue-500/40'
      };
    case 'linkedin':
      return {
        platform: 'linkedin',
        label: 'LinkedIn',
        url: parsed.cleanUrl,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/15 hover:bg-sky-500/30',
        borderColor: 'border-sky-500/40'
      };
    case 'youtube':
      return {
        platform: 'youtube',
        label: 'YouTube',
        url: parsed.cleanUrl,
        color: 'text-red-400',
        bgColor: 'bg-red-500/15 hover:bg-red-500/30',
        borderColor: 'border-red-500/40'
      };
  }
}
