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
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileTheme: (theme: UserProfile['theme']) => Promise<void>;
  updateProfileBiometrics: (enabled: boolean) => Promise<void>;
  updateProfileNotifications: (enabled: boolean) => Promise<void>;
  updateProfileDisplayName: (newName: string) => Promise<{ success: boolean; recordsUpdated: number; error?: string }>;
  updateProfileSocialLink: (link: string) => Promise<{ success: boolean; recordsUpdated: number }>;
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
        
        let resolvedName = firestoreProfile.displayName;
        if (
          (!resolvedName || resolvedName === 'Anonymous player' || resolvedName === 'Matrix Explorer') && 
          currentUser.displayName && 
          !currentUser.isAnonymous
        ) {
          resolvedName = currentUser.displayName;
        }

        finalProfile = {
          ...firestoreProfile,
          displayName: resolvedName || 'Anonymous player',
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
        const resolvedName = (!currentUser.isAnonymous && currentUser.displayName) || localProfile?.displayName || 'Anonymous player';

        finalProfile = {
          uid: currentUser.uid,
          displayName: resolvedName,
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

  const updateProfileDisplayName = async (newName: string): Promise<{ success: boolean; recordsUpdated: number; error?: string }> => {
    if (!profile) return { success: false, recordsUpdated: 0, error: 'No active profile found' };

    const cleanName = newName.trim();
    if (cleanName.length < 2 || cleanName.length > 30) {
      return { success: false, recordsUpdated: 0, error: 'Nickname must be between 2 and 30 characters.' };
    }

    const previousName = profile.displayName;
    const currentUid = user?.uid || profile.uid;

    // 1. Update Profile in memory and localStorage
    const updatedProfile: UserProfile = {
      ...profile,
      displayName: cleanName,
      updatedAt: new Date().toISOString()
    };
    setProfile(updatedProfile);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updatedProfile));

    let totalUpdated = 0;

    // 2. Retroactively update all local leaderboard records
    const updatedLocal = localLeaderboard.map((item) => {
      if (item.userId === currentUid || item.displayName === previousName) {
        totalUpdated++;
        return { ...item, displayName: cleanName };
      }
      return item;
    });
    setLocalLeaderboard(updatedLocal);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(updatedLocal));

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
    if (!profile) return { success: false, recordsUpdated: 0 };
    const updated = { ...profile, socialLink: link };
    setProfile(updated);
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));

    let totalUpdated = 0;

    // Also update any local leaderboard entries so ranking page immediately reflects it
    const updatedLocal = localLeaderboard.map((item) => {
      if (item.userId === (user?.uid || profile.uid) || item.displayName === profile.displayName) {
        totalUpdated++;
        return { ...item, socialLink: link };
      }
      return item;
    });
    setLocalLeaderboard(updatedLocal);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(updatedLocal));

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
      updateProfileDisplayName,
      updateProfileSocialLink,
      submitScore,
      getLeaderboard,
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
