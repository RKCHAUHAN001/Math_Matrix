/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile } from '../context/FirebaseContext';

export interface TopPlayerEntry {
  userId: string;
  displayName: string;
  socialLink?: string;
  tierPoints: number;
  sticks: number;
  trophies: number;
  highScore?: number;
  rank?: number;
  flag?: string;
}

/**
 * Validates if an account belongs to a real signed-in player rather than an unknown/guest placeholder.
 */
export const isRealSignedInPlayer = (userId?: string, displayName?: string): boolean => {
  if (!userId || !displayName) return false;
  
  // 1. Must be a genuine Firebase Auth account ID (not an offline guest or temp ID)
  const cleanId = userId.trim().toLowerCase();
  if (
    cleanId.startsWith('guest') ||
    cleanId.startsWith('anon') ||
    cleanId.startsWith('temp') ||
    cleanId.startsWith('offline') ||
    cleanId.startsWith('local') ||
    cleanId === 'current_user' ||
    cleanId === 'unknown' ||
    cleanId.length < 8
  ) {
    return false;
  }

  // 2. Validate Display Name: Must be a genuine human username / player name
  const name = displayName.trim().toLowerCase();
  if (name.length < 2 || name.length > 30) return false;

  // Reject any name containing placeholder or unknown substrings
  const blockedSubstrings = [
    'unknown',
    'anonymous',
    'matrix explorer',
    'unnamed',
    'guest',
    'placeholder',
    'undefined',
    'null'
  ];

  for (const blocked of blockedSubstrings) {
    if (name.includes(blocked)) {
      return false;
    }
  }

  // Reject generic standalone names or number suffixes (e.g. "player", "player 1", "user", "user 1")
  if (/^player(\s*|\d*|_|-)*$/i.test(name)) return false;
  if (/^user(\s*|\d*|_|-)*$/i.test(name)) return false;
  if (/^test(\s*|\d*|_|-)*$/i.test(name)) return false;
  if (name === 'you' || name === 'me' || name === 'n/a' || name === 'none') return false;

  // Must contain at least one alphanumeric character
  if (!/[a-z0-9]/i.test(name)) return false;

  return true;
};

/**
 * Builds the Stick Ranking list using ONLY real signed-in players.
 */
export function getTop50StickRanking(
  profile: UserProfile | null,
  cloudUsers: Partial<TopPlayerEntry>[] = [],
  isSignedInUser: boolean = false
): TopPlayerEntry[] {
  const map = new Map<string, TopPlayerEntry>();

  // 1. Add genuine signed-in users from Firestore
  cloudUsers.forEach(cu => {
    if (cu.userId && cu.displayName && isRealSignedInPlayer(cu.userId, cu.displayName)) {
      map.set(cu.userId, {
        userId: cu.userId,
        displayName: cu.displayName,
        socialLink: cu.socialLink || '',
        tierPoints: cu.tierPoints || 0,
        sticks: cu.sticks || 0,
        trophies: cu.trophies || cu.highScore || 0
      });
    }
  });

  // 2. Add current player ONLY if she has signed into an account and has a real name
  if (profile && isSignedInUser && isRealSignedInPlayer(profile.uid, profile.displayName)) {
    map.set(profile.uid, {
      userId: profile.uid,
      displayName: profile.displayName,
      socialLink: profile.socialLink || '',
      tierPoints: profile.tierPoints || 0,
      sticks: profile.streak || profile.sticks || 0,
      trophies: profile.trophies ?? profile.highScore ?? 0
    });
  }

  // 3. Sort strictly by sticks descending
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.sticks !== a.sticks) {
      return b.sticks - a.sticks;
    }
    return b.tierPoints - a.tierPoints;
  });

  // 4. Return genuine players with ranks
  return sorted.slice(0, 50).map((player, idx) => ({
    ...player,
    rank: idx + 1
  }));
}

/**
 * Builds the Trophy Ranking list using ONLY real signed-in players.
 */
export function getTop50TrophyRanking(
  profile: UserProfile | null,
  cloudUsers: Partial<TopPlayerEntry>[] = [],
  isSignedInUser: boolean = false
): TopPlayerEntry[] {
  const map = new Map<string, TopPlayerEntry>();

  // 1. Add genuine signed-in users from Firestore
  cloudUsers.forEach(cu => {
    if (cu.userId && cu.displayName && isRealSignedInPlayer(cu.userId, cu.displayName)) {
      map.set(cu.userId, {
        userId: cu.userId,
        displayName: cu.displayName,
        socialLink: cu.socialLink || '',
        tierPoints: cu.tierPoints || 0,
        sticks: cu.sticks || 0,
        trophies: cu.trophies || cu.highScore || 0
      });
    }
  });

  // 2. Add current player ONLY if she has signed into an account and has a real name
  if (profile && isSignedInUser && isRealSignedInPlayer(profile.uid, profile.displayName)) {
    map.set(profile.uid, {
      userId: profile.uid,
      displayName: profile.displayName,
      socialLink: profile.socialLink || '',
      tierPoints: profile.tierPoints || 0,
      sticks: profile.streak || profile.sticks || 0,
      trophies: profile.trophies ?? profile.highScore ?? 0
    });
  }

  // 3. Sort strictly by trophies descending
  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.trophies !== a.trophies) {
      return b.trophies - a.trophies;
    }
    return b.tierPoints - a.tierPoints;
  });

  // 4. Return genuine players with ranks
  return sorted.slice(0, 50).map((player, idx) => ({
    ...player,
    rank: idx + 1
  }));
}

/**
 * Returns top real player scores sorted descending without any dummy/bot scores.
 */
export function getEnsuredTop10Scores<T extends {
  id?: string;
  userId: string;
  displayName: string;
  socialLink?: string;
  tierPoints?: number;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  matrixSize: number;
  createdAt?: string;
}>(
  realScores: T[],
  _difficulty?: 'easy' | 'medium' | 'hard'
): T[] {
  return [...realScores]
    .filter(entry => entry.userId && !entry.userId.startsWith('bot_') && !entry.id?.startsWith('def_'))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

