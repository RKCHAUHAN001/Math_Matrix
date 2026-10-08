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

export interface ScoreBenchmarkPlayer {
  id: string;
  userId: string;
  displayName: string;
  socialLink: string;
  tierPoints: number;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard';
  matrixSize: number;
  createdAt: string;
}

/**
 * Provides standard benchmark leaderboard records to guarantee Top 10 display
 * whenever fewer than 10 scores have been submitted for a given difficulty.
 */
export function getBenchmarkScoreLeaderboard(difficulty: 'easy' | 'medium' | 'hard'): ScoreBenchmarkPlayer[] {
  const benchmarkData = {
    easy: [
      { name: 'Alex Rivera', score: 520, points: 520, url: 'https://x.com/alexrivera' },
      { name: 'Elena Rostova', score: 480, points: 480, url: 'https://instagram.com/elenarostova' },
      { name: 'Marcus Chen', score: 450, points: 450, url: 'https://linkedin.com/in/marcuschen' },
      { name: 'Sofia Martinez', score: 410, points: 410, url: 'https://x.com/sofiamartinez' },
      { name: 'Liam Vance', score: 380, points: 380, url: 'https://facebook.com/liamvance' },
      { name: 'Aria Patel', score: 350, points: 350, url: 'https://instagram.com/ariapatel' },
      { name: 'David Kim', score: 320, points: 320, url: 'https://youtube.com/@davidkim' },
      { name: 'Chloe Dupont', score: 290, points: 290, url: 'https://x.com/chloedupont' },
      { name: 'Lucas Silva', score: 260, points: 260, url: 'https://instagram.com/lucassilva' },
      { name: 'Emma Watson', score: 230, points: 230, url: 'https://x.com/emmawatson' },
    ],
    medium: [
      { name: 'Alex Rivera', score: 760, points: 760, url: 'https://x.com/alexrivera' },
      { name: 'Elena Rostova', score: 710, points: 710, url: 'https://instagram.com/elenarostova' },
      { name: 'Marcus Chen', score: 670, points: 670, url: 'https://linkedin.com/in/marcuschen' },
      { name: 'Sofia Martinez', score: 630, points: 630, url: 'https://x.com/sofiamartinez' },
      { name: 'Liam Vance', score: 590, points: 590, url: 'https://facebook.com/liamvance' },
      { name: 'Aria Patel', score: 550, points: 550, url: 'https://instagram.com/ariapatel' },
      { name: 'David Kim', score: 510, points: 510, url: 'https://youtube.com/@davidkim' },
      { name: 'Chloe Dupont', score: 470, points: 470, url: 'https://x.com/chloedupont' },
      { name: 'Lucas Silva', score: 430, points: 430, url: 'https://instagram.com/lucassilva' },
      { name: 'Emma Watson', score: 390, points: 390, url: 'https://x.com/emmawatson' },
    ],
    hard: [
      { name: 'Alex Rivera', score: 990, points: 990, url: 'https://x.com/alexrivera' },
      { name: 'Elena Rostova', score: 940, points: 940, url: 'https://instagram.com/elenarostova' },
      { name: 'Marcus Chen', score: 890, points: 890, url: 'https://linkedin.com/in/marcuschen' },
      { name: 'Sofia Martinez', score: 840, points: 840, url: 'https://x.com/sofiamartinez' },
      { name: 'Liam Vance', score: 790, points: 790, url: 'https://facebook.com/liamvance' },
      { name: 'Aria Patel', score: 740, points: 740, url: 'https://instagram.com/ariapatel' },
      { name: 'David Kim', score: 690, points: 690, url: 'https://youtube.com/@davidkim' },
      { name: 'Chloe Dupont', score: 640, points: 640, url: 'https://x.com/chloedupont' },
      { name: 'Lucas Silva', score: 590, points: 590, url: 'https://instagram.com/lucassilva' },
      { name: 'Emma Watson', score: 540, points: 540, url: 'https://x.com/emmawatson' },
    ]
  };

  const list = benchmarkData[difficulty] || benchmarkData.easy;
  return list.map((item, idx) => ({
    id: `bench_${difficulty}_${idx + 1}`,
    userId: `usr_benchmark_${item.name.toLowerCase().replace(/\s+/g, '_')}_0${idx + 1}`,
    displayName: item.name,
    socialLink: item.url,
    tierPoints: item.points,
    score: item.score,
    difficulty,
    matrixSize: difficulty === 'hard' ? 4 : difficulty === 'medium' ? 4 : 3,
    createdAt: new Date(Date.now() - (idx + 1) * 86400000).toISOString()
  }));
}
