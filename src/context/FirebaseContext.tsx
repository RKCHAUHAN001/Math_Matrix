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
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { TopPlayerEntry, getTop50StickRanking, getTop50TrophyRanking } from '../utils/rankings';

export interface UserProfile {
  uid: string;
  displayName: string;
  socialLink?: string;
  tierPoints?: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  highScore: number;
  sticks?: number;
  trophies?: number;
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
  tierPoints?: number;
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
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileTheme: (theme: UserProfile['theme']) => Promise<void>;
  updateProfileBiometrics: (enabled: boolean) => Promise<void>;
  updateProfileNotifications: (enabled: boolean) => Promise<void>;
  updateProfileDisplayName: (newName: string) => Promise<{ success: boolean; recordsUpdated: number; error?: string }>;
  updateProfileSocialLink: (link: string) => Promise<{ success: boolean; recordsUpdated: number }>;
  addTierPoints: (points: number) => Promise<number>;
  addSticks: (amount?: number) => Promise<number>;
  submitScore: (score: number, difficulty: LeaderboardEntry['difficulty'], matrixSize: number) => Promise<void>;
  getLeaderboard: (difficulty?: LeaderboardEntry['difficulty']) => Promise<LeaderboardEntry[]>;
  getStickLeaderboard: () => Promise<TopPlayerEntry[]>;
  getTrophyLeaderboard: () => Promise<TopPlayerEntry[]>;
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

  // Initialize Native GoogleAuth on app startup to prevent uninitialized crashes on re-opening
  useEffect(() => {
    const isNative = typeof (window as any).Capacitor !== 'undefined' && 
      typeof (window as any).Capacitor.isNativePlatform === 'function' && 
      (window as any).Capacitor.isNativePlatform();

    if (isNative) {
      const initNativeGoogle = async () => {
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '243943546060-qmn02qfgv0lf7s438d73mgpf3vpiqp6p.apps.googleusercontent.com';
          await GoogleAuth.initialize({
            clientId: webClientId,
            serverClientId: webClientId,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true
          } as any);
        } catch (err) {
          console.warn("Early native GoogleAuth init warning:", err);
        }
      };
      initNativeGoogle();
    }
  }, []);

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

  // Initialize offline cache and readiness
  useEffect(() => {
    // Offline / Online readiness is managed reactively via useOnlineStatus hook
  }, []);

  // Handle user authentication and profile synchronization
  useEffect(() => {
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (isCancelled) return;
      try {
        if (currentUser) {
          setUser(currentUser);
          await loadAndSyncProfile(currentUser);
        } else {
          // If not signed in with Google, initialize anonymous session for seamless real-time multiplayer
          try {
            const { signInAnonymously } = await import('firebase/auth');
            await signInAnonymously(auth);
          } catch (anonErr) {
            console.warn("Anonymous auth unavailable, defaulting to local guest profile:", anonErr);
            loadGuestProfile();
          }
        }
      } catch (e) {
        console.error("Auth status sync error:", e);
        loadGuestProfile();
      } finally {
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
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
      uid: 'guest_' + Math.random().toString(36).substring(2, 11),
      displayName: 'Matrix Explorer',
      streak: 1,
      tierPoints: 0,
      lastActiveDate: today,
      highScore: 0,
      sticks: 0,
      trophies: 0,
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
    try {
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
        const mergedTierPoints = Math.max(firestoreProfile.tierPoints || 0, localProfile?.tierPoints || 0);
        const mergedSticks = Math.max(firestoreProfile.sticks || 0, localProfile?.sticks || 0);
        const mergedTrophies = Math.max(firestoreProfile.trophies || 0, localProfile?.trophies || 0, mergedHighScore);
        
        let resolvedName = firestoreProfile.displayName;
        if (
          (!resolvedName || 
           resolvedName === 'Anonymous player' || 
           resolvedName === 'Matrix Explorer' || 
           resolvedName.toLowerCase().includes('unknown')) && 
          !currentUser.isAnonymous
        ) {
          if (currentUser.displayName) {
            resolvedName = currentUser.displayName;
          } else if (currentUser.email) {
            resolvedName = currentUser.email.split('@')[0];
          } else if (localProfile?.displayName && !localProfile.displayName.toLowerCase().includes('matrix explorer')) {
            resolvedName = localProfile.displayName;
          }
        }

        finalProfile = {
          ...firestoreProfile,
          displayName: resolvedName || (currentUser.email ? currentUser.email.split('@')[0] : 'Player'),
          highScore: mergedHighScore,
          streak: mergedStreak,
          tierPoints: mergedTierPoints,
          sticks: mergedSticks,
          trophies: mergedTrophies,
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
            await updateDoc(profileRef, {
              displayName: finalProfile.displayName,
              socialLink: finalProfile.socialLink || '',
              tierPoints: finalProfile.tierPoints || 0,
              streak: finalProfile.streak || 1,
              lastActiveDate: finalProfile.lastActiveDate,
              highScore: finalProfile.highScore || 0,
              sticks: finalProfile.sticks || 0,
              trophies: finalProfile.trophies || 0,
              theme: finalProfile.theme || 'matrix',
              biometricsEnabled: finalProfile.biometricsEnabled || false,
              notificationsEnabled: finalProfile.notificationsEnabled || true,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
          }
        }
      } else {
        // Profile does not exist in Firestore yet (new user)
        const today = getLocalDateString();
        const resolvedName = (!currentUser.isAnonymous && currentUser.displayName) || 
          (currentUser.email ? currentUser.email.split('@')[0] : '') ||
          (localProfile?.displayName && !localProfile.displayName.toLowerCase().includes('matrix explorer') ? localProfile.displayName : 'Player');

        finalProfile = {
          uid: currentUser.uid,
          displayName: resolvedName,
          socialLink: localProfile?.socialLink || '',
          tierPoints: localProfile?.tierPoints || 0,
          streak: localProfile?.streak || 1,
          lastActiveDate: localProfile?.lastActiveDate || today,
          highScore: localProfile?.highScore || 0,
          sticks: localProfile?.sticks || 0,
          trophies: localProfile?.trophies || localProfile?.highScore || 0,
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
      syncPendingData();
    } catch (error) {
      console.error("Error loading or syncing profile, falling back to guest profile:", error);
      loadGuestProfile();
    }
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
    const today = getLocalDateString();
    let newStreak = 1;
    setProfile(prev => {
      if (!prev) return prev;
      newStreak = prev.streak + 1;
      const updated: UserProfile = {
        ...prev,
        streak: newStreak,
        lastActiveDate: today,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          streak: newStreak,
          lastActiveDate: today,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const incrementTrophyDirectly = async () => {
    let nextVal = 1;
    setProfile(prev => {
      if (!prev) return prev;
      nextVal = (prev.trophies ?? prev.highScore ?? 0) + 1;
      const updated: UserProfile = {
        ...prev,
        highScore: nextVal,
        trophies: nextVal,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          highScore: nextVal,
          trophies: nextVal,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const addSticks = async (count: number = 1): Promise<number> => {
    if (count <= 0) return profile?.sticks || 0;
    let newSticks = count;
    setProfile(prev => {
      if (!prev) return prev;
      newSticks = (prev.sticks || 0) + count;
      const updatedProfile: UserProfile = {
        ...prev,
        sticks: newSticks,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));
      return updatedProfile;
    });

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          sticks: newSticks,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }

    return newSticks;
  };

  const addTierPoints = async (pointsToAdd: number): Promise<number> => {
    if (pointsToAdd <= 0) return profile?.tierPoints || 0;
    let newPoints = pointsToAdd;
    let currentUid = user?.uid || profile?.uid || 'guest_user';
    let currentDisplayName = profile?.displayName || '';

    setProfile(prev => {
      if (!prev) return prev;
      newPoints = (prev.tierPoints || 0) + pointsToAdd;
      currentUid = user?.uid || prev.uid;
      currentDisplayName = prev.displayName;
      const updatedProfile: UserProfile = {
        ...prev,
        tierPoints: newPoints,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));
      return updatedProfile;
    });

    // Also retroactively reflect new tier points in local leaderboard entries for this player
    setLocalLeaderboard(prev => {
      const updatedLocal = prev.map((item) => {
        if (item.userId === currentUid || item.displayName === currentDisplayName) {
          return { ...item, tierPoints: newPoints };
        }
        return item;
      });
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(updatedLocal));
      return updatedLocal;
    });

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          tierPoints: newPoints,
          updatedAt: serverTimestamp()
        });

        // Also update scores with new tier points in background
        const scoresCol = collection(db, 'scores');
        const userScoresQuery = query(scoresCol, where('userId', '==', user.uid));
        const snap = await getDocs(userScoresQuery);
        snap.forEach(async (docSnapshot) => {
          try {
            await updateDoc(doc(db, 'scores', docSnapshot.id), {
              tierPoints: newPoints
            });
          } catch (e) {}
        });
      } catch (err) {
        console.warn("Could not sync tier points to cloud:", err);
      }
    }

    return newPoints;
  };

  const loginWithGoogle = async () => {
    setAuthError(null);

    // Detect if running inside a native mobile app (Capacitor Android/iOS)
    const isNative = typeof (window as any).Capacitor !== 'undefined' && 
      typeof (window as any).Capacitor.isNativePlatform === 'function' && 
      (window as any).Capacitor.isNativePlatform();

    if (isNative) {
      try {
        // Load Capacitor native GoogleAuth plugin dynamically so it gets compiled into the Vite bundle
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        
        if (!GoogleAuth) {
          setAuthError("Google Authentication Fail: Capacitor GoogleAuth plugin could not be imported.");
          return;
        }

        try {
          const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '243943546060-qmn02qfgv0lf7s438d73mgpf3vpiqp6p.apps.googleusercontent.com';
          await GoogleAuth.initialize({
            clientId: webClientId,
            serverClientId: webClientId,
            scopes: ['profile', 'email'],
            grantOfflineAccess: true
          } as any);
        } catch (initErr) {
          console.warn("GoogleAuth native initialization warning:", initErr);
        }

        const googleUser: any = await GoogleAuth.signIn();
        const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
        const idToken = googleUser?.authentication?.idToken || googleUser?.idToken;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          return;
        } else {
          setAuthError("Google Authentication Fail: Sign-in completed but ID Token is missing.");
          return;
        }
      } catch (nativeError: any) {
        console.error("Native Google sign-in failed:", nativeError);
        const detailMsg = nativeError?.message || nativeError?.error || (typeof nativeError === 'object' ? JSON.stringify(nativeError) : String(nativeError));
        setAuthError(`Google Authentication Fail: ${detailMsg}`);
        return;
      }
    }

    // Standard web browser flow (Vite dev, Netlify, Chrome, Safari)
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.warn("Popup sign-in failed, checking fallback:", error);
      
      // Auto fallback to redirect if popup is blocked, cancelled, or closed by the user in browser
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

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
      
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (signInErr: any) {
        // If user doesn't exist or is registering, create account!
        if (
          signInErr.code === 'auth/user-not-found' || 
          signInErr.code === 'auth/invalid-credential' || 
          signInErr.code === 'auth/invalid-email'
        ) {
          try {
            await createUserWithEmailAndPassword(auth, email, pass);
          } catch (createErr: any) {
            console.error("User registration failed:", createErr);
            throw createErr;
          }
        } else {
          throw signInErr;
        }
      }
    } catch (err: any) {
      console.error("Email sync failed:", err);
      let errorMsg = err.message || "Failed to sync account with email.";
      if (err.code === 'auth/weak-password') {
        errorMsg = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = "Invalid email format. Please check your spelling.";
      }
      setAuthError(errorMsg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      const isNative = typeof (window as any).Capacitor !== 'undefined' && 
        typeof (window as any).Capacitor.isNativePlatform === 'function' && 
        (window as any).Capacitor.isNativePlatform();
      
      const isGoogleLoggedIn = user?.providerData?.some((p: any) => p.providerId === 'google.com');

      // 1. Sign out of Firebase and reset local state FIRST so logout always succeeds reliably
      await signOut(auth);
      setUser(null);
      setProfile(null);
      localStorage.removeItem(LOCAL_PROFILE_KEY);
      loadGuestProfile();

      // 2. Clear native Google Play Services account picker cache safely
      if (isNative && isGoogleLoggedIn) {
        try {
          const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
          const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '243943546060-qmn02qfgv0lf7s438d73mgpf3vpiqp6p.apps.googleusercontent.com';
          try {
            await GoogleAuth.initialize({
              clientId: webClientId,
              serverClientId: webClientId,
              scopes: ['profile', 'email'],
              grantOfflineAccess: true
            } as any);
          } catch (ie) {}
          await GoogleAuth.signOut();
        } catch (e) {
          console.warn("Native Google signOut safely skipped:", e);
        }
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfileTheme = async (theme: UserProfile['theme']) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, theme };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });

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
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, biometricsEnabled: enabled };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });

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
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, notificationsEnabled: enabled };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });

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

  const updateProfileDisplayName = async (newName: string): Promise<{ success: boolean; recordsUpdated: number; error?: string }> => {
    const cleanName = newName.trim();
    if (cleanName.length < 2 || cleanName.length > 30) {
      return { success: false, recordsUpdated: 0, error: 'Nickname must be between 2 and 30 characters.' };
    }

    let previousName = '';
    let currentUid = user?.uid || profile?.uid || 'guest_user';

    // 1. Update Profile atomically
    setProfile(prev => {
      if (!prev) return prev;
      previousName = prev.displayName;
      currentUid = user?.uid || prev.uid;
      const updatedProfile: UserProfile = {
        ...prev,
        displayName: cleanName,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));
      return updatedProfile;
    });

    let totalUpdated = 0;

    // 2. Retroactively update all local leaderboard records
    setLocalLeaderboard(prev => {
      const updatedLocal = prev.map((item) => {
        if (item.userId === currentUid || item.displayName === previousName) {
          totalUpdated++;
          return { ...item, displayName: cleanName };
        }
        return item;
      });
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(updatedLocal));
      return updatedLocal;
    });

    // 3. Update pending offline scores queue if any
    try {
      const pending = localStorage.getItem(PENDING_SYNC_KEY);
      if (pending) {
        const pendingList = JSON.parse(pending) as LeaderboardEntry[];
        const updatedPending = pendingList.map((entry) => ({
          ...entry,
          displayName: cleanName
        }));
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedPending));
      }
    } catch (e) {
      console.warn("Could not sync displayName across pending queue:", e);
    }

    // 4. If online & user authenticated, retroactively update Firestore User Doc and all previously submitted score documents
    if (isOnline && user) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          displayName: cleanName,
          updatedAt: serverTimestamp()
        });

        // Query all previous scores submitted by this user
        const scoresCol = collection(db, 'scores');
        const userScoresQuery = query(scoresCol, where('userId', '==', user.uid));
        const snap = await getDocs(userScoresQuery);

        const updatePromises: Promise<any>[] = [];
        snap.forEach((docSnapshot) => {
          updatePromises.push(
            updateDoc(doc(db, 'scores', docSnapshot.id), {
              displayName: cleanName
            }).catch((err) => {
              console.warn(`Could not update score ${docSnapshot.id}:`, err);
            })
          );
        });

        await Promise.all(updatePromises);
        totalUpdated += updatePromises.length;
      } catch (err) {
        console.warn("Error updating user cloud records:", err);
      }
    }

    return { success: true, recordsUpdated: totalUpdated };
  };

  const updateProfileSocialLink = async (link: string): Promise<{ success: boolean; recordsUpdated: number }> => {
    let currentUid = user?.uid || profile?.uid || 'guest_user';
    let currentDisplayName = profile?.displayName || '';

    setProfile(prev => {
      if (!prev) return prev;
      currentUid = user?.uid || prev.uid;
      currentDisplayName = prev.displayName;
      const updated = { ...prev, socialLink: link, updatedAt: new Date().toISOString() };
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
      return updated;
    });

    let totalUpdated = 0;

    // Also update any local leaderboard entries so ranking page immediately reflects it
    setLocalLeaderboard(prev => {
      const updatedLocal = prev.map((item) => {
        if (item.userId === currentUid || item.displayName === currentDisplayName) {
          totalUpdated++;
          return { ...item, socialLink: link };
        }
        return item;
      });
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(updatedLocal));
      return updatedLocal;
    });

    // Update pending offline scores
    try {
      const pending = localStorage.getItem(PENDING_SYNC_KEY);
      if (pending) {
        const pendingList = JSON.parse(pending) as LeaderboardEntry[];
        const updatedPending = pendingList.map((entry) => ({
          ...entry,
          socialLink: link
        }));
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(updatedPending));
      }
    } catch (e) {
      console.warn("Could not sync socialLink across pending queue:", e);
    }

    if (isOnline && user) {
      try {
        const ref = doc(db, 'users', user.uid);
        await updateDoc(ref, {
          socialLink: link,
          updatedAt: serverTimestamp()
        });

        // Also update all existing scores submitted by this user in Firestore
        try {
          const scoresCol = collection(db, 'scores');
          const userScoresQuery = query(scoresCol, where('userId', '==', user.uid));
          const snap = await getDocs(userScoresQuery);
          const updatePromises: Promise<any>[] = [];
          snap.forEach((docSnapshot) => {
            updatePromises.push(
              updateDoc(doc(db, 'scores', docSnapshot.id), {
                socialLink: link
              }).catch((e) => {
                console.warn(`Could not update socialLink on score ${docSnapshot.id}:`, e);
              })
            );
          });
          await Promise.all(updatePromises);
          totalUpdated += updatePromises.length;
        } catch (scoreUpdateErr) {
          console.warn("Could not sync socialLink across previous scores:", scoreUpdateErr);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    }

    return { success: true, recordsUpdated: totalUpdated };
  };

  const submitScore = async (score: number, difficulty: LeaderboardEntry['difficulty'], matrixSize: number) => {
    if (!profile || score <= 0) return;

    const currentUid = user?.uid || profile.uid || 'guest_user';
    const isNewHighScore = score > (profile.highScore || 0);
    const updatedHighScore = Math.max(score, profile.highScore || 0);

    // 1. Update in-memory profile and localStorage profile with high score
    if (isNewHighScore) {
      setProfile(prev => {
        if (!prev) return prev;
        const updated: UserProfile = {
          ...prev,
          highScore: updatedHighScore,
          trophies: Math.max(prev.trophies || 0, updatedHighScore),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
        return updated;
      });

      // If online and authenticated, update user profile document in Firestore
      if (isOnline && user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            highScore: updatedHighScore,
            trophies: updatedHighScore,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.warn("Could not update user high score in Firestore users collection:", err);
        }
      }
    }

    const newScoreEntry: LeaderboardEntry = {
      userId: currentUid,
      displayName: profile.displayName || 'Player',
      socialLink: profile.socialLink || '',
      tierPoints: profile.tierPoints || 0,
      score,
      difficulty,
      matrixSize,
      createdAt: new Date().toISOString()
    };

    // 2. Update local leaderboard: maintain the player's best scores
    setLocalLeaderboard(prev => {
      const otherScores = prev.filter(e => !(e.userId === currentUid && e.difficulty === difficulty));
      const existingUserDiffScore = prev.find(e => e.userId === currentUid && e.difficulty === difficulty);
      const bestScore = existingUserDiffScore ? Math.max(existingUserDiffScore.score, score) : score;
      const updated = [...otherScores, { ...newScoreEntry, score: bestScore }].sort((a, b) => b.score - a.score);
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(updated));
      return updated;
    });

    // 3. Upload to Firestore scores collection
    if (isOnline && user) {
      try {
        const scoresCol = collection(db, 'scores');

        // Query all previous score records for this user
        const qUser = query(scoresCol, where('userId', '==', user.uid));
        const snapUser = await getDocs(qUser);
        const existingDiffDocs = snapUser.docs.filter(d => d.data().difficulty === difficulty);
        const currentMaxScore = existingDiffDocs.reduce((max, d) => Math.max(max, d.data().score || 0), 0);

        if (existingDiffDocs.length === 0 || score > currentMaxScore) {
          // Delete old lower score documents for this difficulty
          for (const oldDoc of existingDiffDocs) {
            await deleteDoc(doc(db, 'scores', oldDoc.id)).catch(() => {});
          }

          // Write new high score document to Firestore scores collection
          await addDoc(scoresCol, {
            userId: user.uid,
            displayName: profile.displayName || 'Player',
            socialLink: profile.socialLink || null,
            tierPoints: profile.tierPoints || 0,
            score,
            difficulty,
            matrixSize,
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Failed to upload score to Firestore scores collection:", err);
        handleFirestoreError(err, OperationType.CREATE, 'scores');
      }
    } else {
      // Offline / guest queue: store in PENDING_SYNC_KEY to upload as soon as connected or logged in
      try {
        const pending = localStorage.getItem(PENDING_SYNC_KEY);
        const pendingList: LeaderboardEntry[] = pending ? JSON.parse(pending) : [];
        const otherPending = pendingList.filter(p => p.difficulty !== difficulty);
        const existingPending = pendingList.find(p => p.difficulty === difficulty);
        const bestPending = existingPending ? Math.max(existingPending.score, score) : score;
        otherPending.push({ ...newScoreEntry, score: bestPending });
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(otherPending));
      } catch (e) {
        console.warn("Could not queue pending score:", e);
      }
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
      const qUser = query(scoresCol, where('userId', '==', user.uid));
      const snapUser = await getDocs(qUser);

      let highestPending = 0;

      for (const entry of pendingList) {
        if (entry.score > highestPending) {
          highestPending = entry.score;
        }

        const existingDiffDocs = snapUser.docs.filter(d => d.data().difficulty === entry.difficulty);
        const currentMaxScore = existingDiffDocs.reduce((max, d) => Math.max(max, d.data().score || 0), 0);

        if (existingDiffDocs.length === 0 || entry.score > currentMaxScore) {
          for (const oldDoc of existingDiffDocs) {
            await deleteDoc(doc(db, 'scores', oldDoc.id)).catch(() => {});
          }

          await addDoc(scoresCol, {
            userId: user.uid,
            displayName: profile?.displayName || user.displayName || 'Player',
            socialLink: profile?.socialLink || null,
            tierPoints: profile?.tierPoints || entry.tierPoints || 0,
            score: entry.score,
            difficulty: entry.difficulty,
            matrixSize: entry.matrixSize,
            createdAt: serverTimestamp()
          });
        }
      }

      // Update user profile in state and Firestore if pending beat previous high score
      if (highestPending > (profile?.highScore || 0)) {
        setProfile(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            highScore: Math.max(prev.highScore || 0, highestPending),
            trophies: Math.max(prev.trophies || 0, highestPending)
          };
          localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
          return updated;
        });

        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          highScore: highestPending,
          trophies: highestPending,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }

      // Clear pending
      localStorage.removeItem(PENDING_SYNC_KEY);
      console.log('Synchronized offline high scores with the cloud database successfully.');
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
      // Query specific difficulty to avoid hard-mode scores crowding out easy/medium scores
      const q = difficulty 
        ? query(scoresCol, where('difficulty', '==', difficulty), limit(50))
        : query(scoresCol, orderBy('score', 'desc'), limit(50));
      
      const querySnap = await getDocs(q);
      const entries: LeaderboardEntry[] = [];
      querySnap.forEach((doc) => {
        const data = doc.data();
        entries.push({
          id: doc.id,
          userId: data.userId,
          displayName: data.displayName,
          socialLink: data.socialLink || '',
          tierPoints: data.tierPoints || 0,
          score: data.score,
          difficulty: data.difficulty,
          matrixSize: data.matrixSize,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      });

      // Sort descending and return top 10 for this difficulty
      return entries.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.LIST, 'scores');
      } catch (wrappedErr) {
        console.error("Leaderboard read error:", wrappedErr);
      }
      // Return local as backup (strictly top 10)
      let filtered = [...localLeaderboard];
      if (difficulty) {
        filtered = filtered.filter(e => e.difficulty === difficulty);
      }
      return filtered.sort((a, b) => b.score - a.score).slice(0, 10);
    }
  };

  const getStickLeaderboard = async (): Promise<TopPlayerEntry[]> => {
    let cloudUsers: Partial<TopPlayerEntry>[] = [];
    if (isOnline) {
      try {
        const usersCol = collection(db, 'users');
        const snap = await getDocs(query(usersCol, limit(50)));
        cloudUsers = snap.docs.map(d => {
          const dat = d.data();
          return {
            userId: d.id,
            displayName: dat.displayName || '',
            socialLink: dat.socialLink || '',
            tierPoints: dat.tierPoints || 0,
            sticks: dat.streak ?? dat.sticks ?? 0,
            trophies: dat.highScore ?? dat.trophies ?? 0
          };
        });
      } catch (e) {
        console.warn("Could not fetch remote users for stick ranking:", e);
      }
    }
    const isSignedIn = Boolean(user && !user.isAnonymous);
    return getTop50StickRanking(profile, cloudUsers, isSignedIn);
  };

  const getTrophyLeaderboard = async (): Promise<TopPlayerEntry[]> => {
    let cloudUsers: Partial<TopPlayerEntry>[] = [];
    if (isOnline) {
      try {
        const usersCol = collection(db, 'users');
        const snap = await getDocs(query(usersCol, limit(50)));
        cloudUsers = snap.docs.map(d => {
          const dat = d.data();
          return {
            userId: d.id,
            displayName: dat.displayName || '',
            socialLink: dat.socialLink || '',
            tierPoints: dat.tierPoints || 0,
            sticks: dat.streak ?? dat.sticks ?? 0,
            trophies: dat.highScore ?? dat.trophies ?? 0
          };
        });
      } catch (e) {
        console.warn("Could not fetch remote users for trophy ranking:", e);
      }
    }
    const isSignedIn = Boolean(user && !user.isAnonymous);
    return getTop50TrophyRanking(profile, cloudUsers, isSignedIn);
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
      updateProfileDisplayName,
      updateProfileSocialLink,
      addTierPoints,
      addSticks,
      submitScore,
      getLeaderboard,
      getStickLeaderboard,
      getTrophyLeaderboard,
      localLeaderboard,
      syncPendingData,
      incrementStreakDirectly,
      incrementTrophyDirectly,
      authError,
      clearAuthError,
      loginWithEmail
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
