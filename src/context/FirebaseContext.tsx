import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export interface UserProfile {
  uid: string;
  displayName: string;
  socialLink?: string;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  highScore: number;
  theme: 'monochrome' | 'oled' | 'matrix' | 'cyberpunk' | 'solarized';
  biometricsEnabled: boolean;
  notificationsEnabled: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface LeaderboardEntry {
  id?: string;
  userId: string;
  displayName: string;
  socialLink?: string;
  score: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  matrixSize: number;
  createdAt: any;
}

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isOnline: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfileTheme: (theme: UserProfile['theme']) => Promise<void>;
  updateProfileBiometrics: (enabled: boolean) => Promise<void>;
  updateProfileNotifications: (enabled: boolean) => Promise<void>;
  updateProfileSocialLink: (link: string) => Promise<void>;
  submitScore: (score: number, difficulty: LeaderboardEntry['difficulty'], matrixSize: number) => Promise<void>;
  getLeaderboard: (difficulty?: LeaderboardEntry['difficulty']) => Promise<LeaderboardEntry[]>;
  localLeaderboard: LeaderboardEntry[];
  syncPendingData: () => Promise<void>;
  incrementStreakDirectly: () => Promise<void>;
  incrementTrophyDirectly: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

const LOCAL_PROFILE_KEY = 'math_matrix_profile';
const LOCAL_LEADERBOARD_KEY = 'math_matrix_local_scores';
const PENDING_SYNC_KEY = 'math_matrix_pending_scores';

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [localLeaderboard, setLocalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const clearAuthError = () => setAuthError(null);

  // Automatically listen for and resolve redirected sign-ins
  useEffect(() => {
    if (isOnline) {
      const handleRedirectResult = async () => {
        try {
          const { getRedirectResult } = await import('firebase/auth');
          const result = await getRedirectResult(auth);
          if (result?.user) {
            console.log("Resolved redirection sign-in successfully:", result.user.displayName);
          }
        } catch (err: any) {
          console.error("Redirect sign-in lookup failed:", err);
          if (err && err.code === 'auth/unauthorized-domain') {
            setAuthError("This domain (mathmatrix.parivartya.in) is not authorized in Firebase Console yet. Please add it to Authentication -> Settings -> Authorized Domains.");
          } else {
            setAuthError(err.message || String(err));
          }
        }
      };
      handleRedirectResult();
    }
  }, [isOnline]);

  // Helper: Get local date string YYYY-MM-DD
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Check if date difference is exactly yesterday
  const isYesterday = (lastDateStr: string, todayDateStr: string) => {
    try {
      const lastDate = new Date(lastDateStr + 'T00:00:00');
      const todayDate = new Date(todayDateStr + 'T00:00:00');
      const diffTime = todayDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1;
    } catch (e) {
      return false;
    }
  };

  // Load local leaderboard initially
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    if (stored) {
      try {
        setLocalLeaderboard(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  // Validate connection to Firestore initially (as required by Firestore validation constraint)
  useEffect(() => {
    const validateConn = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration or network status.");
        }
      }
    };
    if (isOnline) {
      validateConn();
    }
  }, [isOnline]);

  // Handle user authentication and profile synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await loadAndSyncProfile(currentUser);
      } else {
        // Guest mode / offline mode profile fallback
        loadGuestProfile();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOnline]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      syncPendingData();
    }
  }, [isOnline, user]);

  const loadGuestProfile = () => {
    const local = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (local) {
      try {
        const guestProj = JSON.parse(local) as UserProfile;
        // Verify daily streak for guest
        const updatedGuest = verifyAndIncrementStreak(guestProj);
        setProfile(updatedGuest);
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedGuest));
      } catch (e) {
        createDefaultGuestProfile();
      }
    } else {
      createDefaultGuestProfile();
    }
  };

  const createDefaultGuestProfile = () => {
    const today = getLocalDateString();
    const guest: UserProfile = {
      uid: 'guest_user',
      displayName: 'Matrix Explorer',
      streak: 1,
      lastActiveDate: today,
      highScore: 0,
      theme: 'matrix',
      biometricsEnabled: false,
      notificationsEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProfile(guest);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(guest));
  };

  const loadAndSyncProfile = async (currentUser: User) => {
    const profileRef = doc(db, 'users', currentUser.uid);
    let firestoreProfile: UserProfile | null = null;

    if (isOnline) {
      try {
        const docSnap = await getDoc(profileRef);
        if (docSnap.exists()) {
          firestoreProfile = docSnap.data() as UserProfile;
        }
      } catch (e) {
        console.error("Failed to fetch profile from firestore:", e);
      }
    }

    const local = localStorage.getItem(LOCAL_PROFILE_KEY);
    let localProfile: UserProfile | null = null;
    if (local) {
      try {
        localProfile = JSON.parse(local);
      } catch (e) {}
    }

    let finalProfile: UserProfile;

    if (firestoreProfile) {
      // Compare high score and settings with local to pick the freshest
      const mergedHighScore = Math.max(firestoreProfile.highScore || 0, localProfile?.highScore || 0);
      const mergedStreak = Math.max(firestoreProfile.streak || 0, localProfile?.streak || 0);
      
      finalProfile = {
        ...firestoreProfile,
        highScore: mergedHighScore,
        streak: mergedStreak,
        socialLink: localProfile?.socialLink || firestoreProfile.socialLink || '',
        theme: localProfile?.theme || firestoreProfile.theme || 'matrix',
        biometricsEnabled: localProfile?.biometricsEnabled ?? firestoreProfile.biometricsEnabled ?? false,
        notificationsEnabled: localProfile?.notificationsEnabled ?? firestoreProfile.notificationsEnabled ?? true,
      };

      // Check daily streak
      finalProfile = verifyAndIncrementStreak(finalProfile);

      // Save back to Firestore and LocalStorage
      if (isOnline) {
        try {
          await setDoc(profileRef, {
            ...finalProfile,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    } else {
      // Profile does not exist in Firestore yet (new user)
      const today = getLocalDateString();
      finalProfile = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous player',
        socialLink: localProfile?.socialLink || '',
        streak: localProfile?.streak || 1,
        lastActiveDate: localProfile?.lastActiveDate || today,
        highScore: localProfile?.highScore || 0,
        theme: localProfile?.theme || 'matrix',
        biometricsEnabled: localProfile?.biometricsEnabled || false,
        notificationsEnabled: localProfile?.notificationsEnabled || true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      finalProfile = verifyAndIncrementStreak(finalProfile);

      if (isOnline) {
        try {
          await setDoc(profileRef, {
            ...finalProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    }

    setProfile(finalProfile);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(finalProfile));
  };

  const verifyAndIncrementStreak = (p: UserProfile): UserProfile => {
    const today = getLocalDateString();
    if (!p.lastActiveDate) {
      return { ...p, streak: 1, lastActiveDate: today };
    }

    if (p.lastActiveDate === today) {
      return p; // Already active today
    }

    if (isYesterday(p.lastActiveDate, today)) {
      return {
        ...p,
        streak: p.streak + 1,
        lastActiveDate: today,
        updatedAt: new Date().toISOString()
      };
    }

    // Broken streak
    return {
      ...p,
      streak: 1,
      lastActiveDate: today,
      updatedAt: new Date().toISOString()
    };
  };

  const incrementStreakDirectly = async () => {
    if (!profile) return;
    const today = getLocalDateString();
    const updated: UserProfile = {
      ...profile,
      streak: profile.streak + 1,
      lastActiveDate: today,
      updatedAt: new Date().toISOString()
    };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          streak: updated.streak,
          lastActiveDate: today,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const incrementTrophyDirectly = async () => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      highScore: profile.highScore + 1,
      updatedAt: new Date().toISOString()
    };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          highScore: updated.highScore,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.warn("Popup sign-in failed, checking fallback:", error);
      
      // Auto fallback to redirect if popup is blocked, cancelled, or closed by the user
      if (
        error && 
        (error.code === 'auth/popup-closed-by-user' || 
         error.code === 'auth/popup-blocked' || 
         error.code === 'auth/cancelled-popup-request')
      ) {
        try {
          const { signInWithRedirect } = await import('firebase/auth');
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          console.error("Redirect fallback login failed:", redirectErr);
          setAuthError(redirectErr.message || String(redirectErr));
        }
      } else if (error && error.code === 'auth/unauthorized-domain') {
        const msg = "The domain 'mathmatrix.parivartya.in' is not authorized in Firebase Console yet. Please add it to your Firebase Console under Authentication -> Settings -> Authorized Domains.";
        setAuthError(msg);
        console.error(msg);
      } else {
        setAuthError(error.message || String(error));
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      localStorage.removeItem(LOCAL_PROFILE_KEY);
      loadGuestProfile();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfileTheme = async (theme: UserProfile['theme']) => {
    if (!profile) return;
    const updated = { ...profile, theme };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          theme,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const updateProfileBiometrics = async (enabled: boolean) => {
    if (!profile) return;
    const updated = { ...profile, biometricsEnabled: enabled };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          biometricsEnabled: enabled,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const updateProfileNotifications = async (enabled: boolean) => {
    if (!profile) return;
    const updated = { ...profile, notificationsEnabled: enabled };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          notificationsEnabled: enabled,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const updateProfileSocialLink = async (link: string) => {
    if (!profile) return;
    const updated = { ...profile, socialLink: link };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          socialLink: link,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const submitScore = async (score: number, difficulty: LeaderboardEntry['difficulty'], matrixSize: number) => {
    if (!profile) return;

    const newScoreEntry: LeaderboardEntry = {
      userId: user?.uid || 'guest_user',
      displayName: profile.displayName,
      socialLink: profile.socialLink || '',
      score,
      difficulty,
      matrixSize,
      createdAt: new Date().toISOString()
    };

    // Save locally
    const currentLocal = [...localLeaderboard, newScoreEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Sync only top 10 locally too
    setLocalLeaderboard(currentLocal);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(currentLocal));

    if (isOnline && user) {
      try {
        const scoresCol = collection(db, 'scores');
        await addDoc(scoresCol, {
          userId: user.uid,
          displayName: profile.displayName,
          socialLink: profile.socialLink || null,
          score,
          difficulty,
          matrixSize,
          createdAt: serverTimestamp()
        });

        // Background Trim Engine to guarantee ONLY top 10 exist in Firestore per mode
        setTimeout(async () => {
          try {
            const qAll = query(
              scoresCol,
              where('difficulty', '==', difficulty)
            );
            const snapAll = await getDocs(qAll);
            const allDocs = snapAll.docs.map(doc => ({
              id: doc.id,
              score: doc.data().score || 0
            }));
            
            allDocs.sort((a, b) => b.score - a.score);

            if (allDocs.length > 10) {
              const toDelete = allDocs.slice(10);
              const { deleteDoc } = await import('firebase/firestore');
              for (const docToDelete of toDelete) {
                await deleteDoc(doc(db, 'scores', docToDelete.id));
              }
              console.log(`Trimmed trailing scores. Deleted ${toDelete.length} docs.`);
            }
          } catch (cleanErr) {
            console.error("Score trimmer error: ", cleanErr);
          }
        }, 800);

      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'scores');
      }
    } else {
      // Queue score for later sync
      const pending = localStorage.getItem(PENDING_SYNC_KEY);
      const pendingList = pending ? JSON.parse(pending) : [];
      pendingList.push(newScoreEntry);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingList));
    }
  };

  const syncPendingData = async () => {
    if (!isOnline || !user) return;
    const pending = localStorage.getItem(PENDING_SYNC_KEY);
    if (!pending) return;

    try {
      const pendingList = JSON.parse(pending) as LeaderboardEntry[];
      if (pendingList.length === 0) return;

      const scoresCol = collection(db, 'scores');
      for (const entry of pendingList) {
        await addDoc(scoresCol, {
          userId: user.uid,
          displayName: profile?.displayName || user.displayName || 'Player',
          socialLink: profile?.socialLink || null,
          score: entry.score,
          difficulty: entry.difficulty,
          matrixSize: entry.matrixSize,
          createdAt: serverTimestamp()
        });
      }

      // Clear pending
      localStorage.removeItem(PENDING_SYNC_KEY);
      console.log('Synchronized offline high scores with the cloud leaderboard successfully.');
    } catch (e) {
      console.error('Failed to sync pending scores:', e);
    }
  };

  const getLeaderboard = async (difficulty?: LeaderboardEntry['difficulty']): Promise<LeaderboardEntry[]> => {
    if (!isOnline) {
      // Filter local leaderboard by difficulty
      let filtered = [...localLeaderboard];
      if (difficulty) {
        filtered = filtered.filter(e => e.difficulty === difficulty);
      }
      return filtered;
    }

    try {
      const scoresCol = collection(db, 'scores');
      // Set query order
      const q = query(
        scoresCol, 
        orderBy('score', 'desc'), 
        limit(20)
      );
      
      const querySnap = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      querySnap.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          userId: data.userId,
          displayName: data.displayName,
          socialLink: data.socialLink || '',
          score: data.score,
          difficulty: data.difficulty,
          matrixSize: data.matrixSize,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      });

      // Filter by difficulty in js memory to avoid complex compound indexing needs
      let result = entries;
      if (difficulty) {
        result = entries.filter(e => e.difficulty === difficulty);
      }
      return result;
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, 'scores');
      } catch (wrappedErr) {
        console.error("Leaderboard read error:", wrappedErr);
      }
      // Return local as backup
      let filtered = [...localLeaderboard];
      if (difficulty) {
        filtered = filtered.filter(e => e.difficulty === difficulty);
      }
      return filtered;
    }
  };

  return (
    <FirebaseContext.Provider value={{
      user,
      profile,
      loading,
      isOnline,
      loginWithGoogle,
      logout,
      updateProfileTheme,
      updateProfileBiometrics,
      updateProfileNotifications,
      updateProfileSocialLink,
      submitScore,
      getLeaderboard,
      localLeaderboard,
      syncPendingData,
      incrementStreakDirectly,
      incrementTrophyDirectly,
      authError,
      clearAuthError
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
