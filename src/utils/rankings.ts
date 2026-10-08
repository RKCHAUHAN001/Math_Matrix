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
 * Standard competitive fallback scores for each difficulty level
 * to ensure that exactly Top 10 players are always displayed in the leaderboard.
 */
export const DEFAULT_SCORES_BY_DIFFICULTY: Record<'easy' | 'medium' | 'hard', Array<{
  id: string;
  userId: string;
  displayName: string;
  score: number;
  tierPoints: number;
  difficulty: 'easy' | 'medium' | 'hard';
  matrixSize: number;
}>> = {
  easy: [
    { id: 'def_e_1', userId: 'bot_alex', displayName: 'Alex Mercer', score: 620, tierPoints: 85, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_2', userId: 'bot_elena', displayName: 'Elena Rostova', score: 540, tierPoints: 72, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_3', userId: 'bot_marcus', displayName: 'Marcus Vance', score: 480, tierPoints: 64, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_4', userId: 'bot_sarah', displayName: 'Sarah Connor', score: 420, tierPoints: 55, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_5', userId: 'bot_lucas', displayName: 'Lucas Sterling', score: 370, tierPoints: 48, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_6', userId: 'bot_aria', displayName: 'Aria Stark', score: 310, tierPoints: 40, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_7', userId: 'bot_david', displayName: 'David Kim', score: 260, tierPoints: 34, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_8', userId: 'bot_zack', displayName: 'Zack Taylor', score: 210, tierPoints: 28, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_9', userId: 'bot_maya', displayName: 'Maya Lin', score: 170, tierPoints: 22, difficulty: 'easy', matrixSize: 3 },
    { id: 'def_e_10', userId: 'bot_leo', displayName: 'Leo Walker', score: 130, tierPoints: 16, difficulty: 'easy', matrixSize: 3 },
  ],
  medium: [
    { id: 'def_m_1', userId: 'bot_victor', displayName: 'Victor Creed', score: 880, tierPoints: 120, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_2', userId: 'bot_nova', displayName: 'Nova Prime', score: 790, tierPoints: 108, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_3', userId: 'bot_chloe', displayName: 'Chloe Bennett', score: 710, tierPoints: 95, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_4', userId: 'bot_kenji', displayName: 'Kenji Sato', score: 630, tierPoints: 84, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_5', userId: 'bot_rachel', displayName: 'Rachel Green', score: 560, tierPoints: 75, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_6', userId: 'bot_dante', displayName: 'Dante Alighieri', score: 490, tierPoints: 65, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_7', userId: 'bot_sam', displayName: 'Sam Fisher', score: 420, tierPoints: 56, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_8', userId: 'bot_oliver', displayName: 'Oliver Queen', score: 360, tierPoints: 48, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_9', userId: 'bot_natasha', displayName: 'Natasha Roman', score: 300, tierPoints: 40, difficulty: 'medium', matrixSize: 4 },
    { id: 'def_m_10', userId: 'bot_peter', displayName: 'Peter Parker', score: 240, tierPoints: 32, difficulty: 'medium', matrixSize: 4 },
  ],
  hard: [
    { id: 'def_h_1', userId: 'bot_cipher', displayName: 'Cipher Master', score: 1450, tierPoints: 190, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_2', userId: 'bot_quantum', displayName: 'Quantum Fox', score: 1320, tierPoints: 175, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_3', userId: 'bot_apex', displayName: 'Apex Solver', score: 1190, tierPoints: 160, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_4', userId: 'bot_ghost', displayName: 'Matrix Ghost', score: 1060, tierPoints: 142, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_5', userId: 'bot_zerocool', displayName: 'Zero Cool', score: 940, tierPoints: 126, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_6', userId: 'bot_neon', displayName: 'Neon Knight', score: 830, tierPoints: 110, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_7', userId: 'bot_vortex', displayName: 'Vortex Mind', score: 720, tierPoints: 96, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_8', userId: 'bot_shadow', displayName: 'Shadow Byte', score: 620, tierPoints: 82, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_9', userId: 'bot_echo', displayName: 'Echo Blade', score: 530, tierPoints: 70, difficulty: 'hard', matrixSize: 5 },
    { id: 'def_h_10', userId: 'bot_titan', displayName: 'Titan Logic', score: 450, tierPoints: 60, difficulty: 'hard', matrixSize: 5 },
  ]
};

/**
 * Ensures that the returned score rankings list always contains exactly 10 players,
 * combining real scores with fallback records if fewer than 10 scores exist.
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
  difficulty: 'easy' | 'medium' | 'hard'
): T[] {
  // 1. Sort real scores descending by score
  const sortedReal = [...realScores].sort((a, b) => b.score - a.score);

  // If we already have 10 or more real scores, return strictly the top 10
  if (sortedReal.length >= 10) {
    return sortedReal.slice(0, 10);
  }

  // 2. Prepare default records for this difficulty
  const defaults = (DEFAULT_SCORES_BY_DIFFICULTY[difficulty] || []).map(def => ({
    ...def,
    createdAt: new Date().toISOString()
  })) as unknown as T[];

  // 3. Combine real scores and fill up to 10 with default players
  const combined = [...sortedReal];
  for (const def of defaults) {
    if (combined.length >= 10) break;
    // Don't duplicate userId if already present
    if (!combined.some(c => c.userId === def.userId)) {
      combined.push(def);
    }
  }

  // 4. Return top 10 sorted descending
  return combined.sort((a, b) => b.score - a.score).slice(0, 10);
}
