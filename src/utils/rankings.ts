/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, LeaderboardEntry } from '../context/FirebaseContext';

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
 * Standard benchmark top 10 matrix champions for each difficulty category.
 * Used to ensure the Score Ranking System always presents a complete Top 10 roster.
 */
export const DEFAULT_TOP10_SCORES: Record<'easy' | 'medium' | 'hard', LeaderboardEntry[]> = {
  easy: [
    { userId: 'champ_easy_1', displayName: 'Elena Rostova', score: 124, difficulty: 'easy', matrixSize: 3, tierPoints: 340, createdAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'champ_easy_2', displayName: 'Kenji Sato', score: 116, difficulty: 'easy', matrixSize: 3, tierPoints: 310, createdAt: '2026-01-02T00:00:00.000Z' },
    { userId: 'champ_easy_3', displayName: 'Marcus Vance', score: 105, difficulty: 'easy', matrixSize: 3, tierPoints: 280, createdAt: '2026-01-03T00:00:00.000Z' },
    { userId: 'champ_easy_4', displayName: 'Aria Sharma', score: 98, difficulty: 'easy', matrixSize: 3, tierPoints: 260, createdAt: '2026-01-04T00:00:00.000Z' },
    { userId: 'champ_easy_5', displayName: 'Lucas Meyer', score: 92, difficulty: 'easy', matrixSize: 3, tierPoints: 240, createdAt: '2026-01-05T00:00:00.000Z' },
    { userId: 'champ_easy_6', displayName: 'Chloe Dupont', score: 85, difficulty: 'easy', matrixSize: 3, tierPoints: 220, createdAt: '2026-01-06T00:00:00.000Z' },
    { userId: 'champ_easy_7', displayName: 'Mateo Silva', score: 79, difficulty: 'easy', matrixSize: 3, tierPoints: 200, createdAt: '2026-01-07T00:00:00.000Z' },
    { userId: 'champ_easy_8', displayName: 'Zoe Chen', score: 72, difficulty: 'easy', matrixSize: 3, tierPoints: 180, createdAt: '2026-01-08T00:00:00.000Z' },
    { userId: 'champ_easy_9', displayName: 'Devon Reed', score: 66, difficulty: 'easy', matrixSize: 3, tierPoints: 160, createdAt: '2026-01-09T00:00:00.000Z' },
    { userId: 'champ_easy_10', displayName: 'Sofia Rossi', score: 58, difficulty: 'easy', matrixSize: 3, tierPoints: 140, createdAt: '2026-01-10T00:00:00.000Z' }
  ],
  medium: [
    { userId: 'champ_med_1', displayName: 'Elena Rostova', score: 245, difficulty: 'medium', matrixSize: 4, tierPoints: 340, createdAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'champ_med_2', displayName: 'Kenji Sato', score: 228, difficulty: 'medium', matrixSize: 4, tierPoints: 310, createdAt: '2026-01-02T00:00:00.000Z' },
    { userId: 'champ_med_3', displayName: 'Marcus Vance', score: 212, difficulty: 'medium', matrixSize: 4, tierPoints: 280, createdAt: '2026-01-03T00:00:00.000Z' },
    { userId: 'champ_med_4', displayName: 'Aria Sharma', score: 196, difficulty: 'medium', matrixSize: 4, tierPoints: 260, createdAt: '2026-01-04T00:00:00.000Z' },
    { userId: 'champ_med_5', displayName: 'Lucas Meyer', score: 184, difficulty: 'medium', matrixSize: 4, tierPoints: 240, createdAt: '2026-01-05T00:00:00.000Z' },
    { userId: 'champ_med_6', displayName: 'Chloe Dupont', score: 170, difficulty: 'medium', matrixSize: 4, tierPoints: 220, createdAt: '2026-01-06T00:00:00.000Z' },
    { userId: 'champ_med_7', displayName: 'Mateo Silva', score: 158, difficulty: 'medium', matrixSize: 4, tierPoints: 200, createdAt: '2026-01-07T00:00:00.000Z' },
    { userId: 'champ_med_8', displayName: 'Zoe Chen', score: 144, difficulty: 'medium', matrixSize: 4, tierPoints: 180, createdAt: '2026-01-08T00:00:00.000Z' },
    { userId: 'champ_med_9', displayName: 'Devon Reed', score: 132, difficulty: 'medium', matrixSize: 4, tierPoints: 160, createdAt: '2026-01-09T00:00:00.000Z' },
    { userId: 'champ_med_10', displayName: 'Sofia Rossi', score: 118, difficulty: 'medium', matrixSize: 4, tierPoints: 140, createdAt: '2026-01-10T00:00:00.000Z' }
  ],
  hard: [
    { userId: 'champ_hard_1', displayName: 'Elena Rostova', score: 380, difficulty: 'hard', matrixSize: 5, tierPoints: 340, createdAt: '2026-01-01T00:00:00.000Z' },
    { userId: 'champ_hard_2', displayName: 'Kenji Sato', score: 355, difficulty: 'hard', matrixSize: 5, tierPoints: 310, createdAt: '2026-01-02T00:00:00.000Z' },
    { userId: 'champ_hard_3', displayName: 'Marcus Vance', score: 332, difficulty: 'hard', matrixSize: 5, tierPoints: 280, createdAt: '2026-01-03T00:00:00.000Z' },
    { userId: 'champ_hard_4', displayName: 'Aria Sharma', score: 310, difficulty: 'hard', matrixSize: 5, tierPoints: 260, createdAt: '2026-01-04T00:00:00.000Z' },
    { userId: 'champ_hard_5', displayName: 'Lucas Meyer', score: 290, difficulty: 'hard', matrixSize: 5, tierPoints: 240, createdAt: '2026-01-05T00:00:00.000Z' },
    { userId: 'champ_hard_6', displayName: 'Chloe Dupont', score: 272, difficulty: 'hard', matrixSize: 5, tierPoints: 220, createdAt: '2026-01-06T00:00:00.000Z' },
    { userId: 'champ_hard_7', displayName: 'Mateo Silva', score: 254, difficulty: 'hard', matrixSize: 5, tierPoints: 200, createdAt: '2026-01-07T00:00:00.000Z' },
    { userId: 'champ_hard_8', displayName: 'Zoe Chen', score: 236, difficulty: 'hard', matrixSize: 5, tierPoints: 180, createdAt: '2026-01-08T00:00:00.000Z' },
    { userId: 'champ_hard_9', displayName: 'Devon Reed', score: 218, difficulty: 'hard', matrixSize: 5, tierPoints: 160, createdAt: '2026-01-09T00:00:00.000Z' },
    { userId: 'champ_hard_10', displayName: 'Sofia Rossi', score: 198, difficulty: 'hard', matrixSize: 5, tierPoints: 140, createdAt: '2026-01-10T00:00:00.000Z' }
  ]
};

/**
 * Merges recorded player scores with benchmark champion players to reliably produce
 * the Top 10 players for the selected difficulty.
 */
export function buildTop10ScoreRanking(
  recordedScores: LeaderboardEntry[],
  difficulty: 'easy' | 'medium' | 'hard'
): LeaderboardEntry[] {
  const filteredRecorded = recordedScores.filter(e => e.difficulty === difficulty && e.score > 0);
  
  // Keep the best score per unique player
  const bestByPlayer = new Map<string, LeaderboardEntry>();
  for (const entry of filteredRecorded) {
    if (!entry.displayName || entry.displayName.trim().length === 0) continue;
    const key = (entry.userId && !entry.userId.startsWith('guest_')) ? entry.userId : entry.displayName.trim().toLowerCase();
    const existing = bestByPlayer.get(key);
    if (!existing || entry.score > existing.score) {
      bestByPlayer.set(key, entry);
    }
  }

  const defaults = DEFAULT_TOP10_SCORES[difficulty] || DEFAULT_TOP10_SCORES.easy;
  
  // Backfill slots up to 10 with benchmark players
  for (const def of defaults) {
    const key = def.displayName.trim().toLowerCase();
    if (!bestByPlayer.has(def.userId) && !bestByPlayer.has(key)) {
      bestByPlayer.set(def.userId, def);
    }
  }

  // Sort strictly by score descending
  const sorted = Array.from(bestByPlayer.values()).sort((a, b) => b.score - a.score);

  // Return strictly Top 10 players
  return sorted.slice(0, 10);
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
