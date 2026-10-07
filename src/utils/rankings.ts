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
 * Builds the Stick Ranking list using ONLY original players (no dummy records).
 */
export function getTop50StickRanking(
  profile: UserProfile | null,
  cloudUsers: Partial<TopPlayerEntry>[] = []
): TopPlayerEntry[] {
  const map = new Map<string, TopPlayerEntry>();

  // 1. Add genuine cloud users from Firestore
  cloudUsers.forEach(cu => {
    if (cu.userId && cu.displayName) {
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

  // 2. Add or update current original player
  if (profile) {
    const userUid = profile.uid || 'current_user';
    map.set(userUid, {
      userId: userUid,
      displayName: profile.displayName || 'You',
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
 * Builds the Trophy Ranking list using ONLY original players (no dummy records).
 */
export function getTop50TrophyRanking(
  profile: UserProfile | null,
  cloudUsers: Partial<TopPlayerEntry>[] = []
): TopPlayerEntry[] {
  const map = new Map<string, TopPlayerEntry>();

  // 1. Add genuine cloud users from Firestore
  cloudUsers.forEach(cu => {
    if (cu.userId && cu.displayName) {
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

  // 2. Add or update current original player
  if (profile) {
    const userUid = profile.uid || 'current_user';
    map.set(userUid, {
      userId: userUid,
      displayName: profile.displayName || 'You',
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
