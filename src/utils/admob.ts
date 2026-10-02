/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';

const isNative = typeof (window as any).Capacitor !== 'undefined' && 
  typeof (window as any).Capacitor.isNativePlatform === 'function' && 
  (window as any).Capacitor.isNativePlatform();

// Google's Official Test Ad IDs for Android
export const GOOGLE_TEST_IDS = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

let isInitialized = false;

export async function initializeAdMob() {
  if (!isNative) return;
  if (isInitialized) return;
  try {
    const adMobAny = AdMob as any;
    await adMobAny.initialize({
      initializeForTesting: true,
    });
    isInitialized = true;
    console.log("AdMob native successfully initialized with Google Test IDs.");
  } catch (err) {
    console.warn("AdMob initialization failed:", err);
  }
}

/**
 * Attempts to play a native rewarded video ad.
 * Returns true if the native ad was successfully shown, 
 * or false if it failed or should fall back to the Simulator (on web).
 */
export async function playNativeRewardedAd(
  onCompleted: () => void,
  onFailed: () => void
): Promise<boolean> {
  if (!isNative) {
    return false; // Let the web browser fall back to the gorgeous AdMobSimulator
  }

  try {
    await initializeAdMob();
    const adMobAny = AdMob as any;

    // Safely check which version of the method names exist in the current Capacitor AdMob library
    const prepareMethod = typeof adMobAny.prepareRewardVideoAd === 'function' 
      ? 'prepareRewardVideoAd' 
      : 'prepareRewardAd';

    const showMethod = typeof adMobAny.showRewardVideoAd === 'function'
      ? 'showRewardVideoAd'
      : 'showRewardAd';

    await adMobAny[prepareMethod]({
      adId: GOOGLE_TEST_IDS.rewarded,
    });

    let adRewarded = false;

    // Register event listeners (awaiting promises to remove correctly)
    const rewardListenerPromise = adMobAny.addListener(RewardAdPluginEvents.Rewarded, () => {
      adRewarded = true;
    });

    const dismissListenerPromise = adMobAny.addListener(RewardAdPluginEvents.Dismissed, async () => {
      try {
        const rewardL = await rewardListenerPromise;
        const dismissL = await dismissListenerPromise;
        rewardL.remove();
        dismissL.remove();
      } catch (e) {}

      if (adRewarded) {
        onCompleted();
      } else {
        onFailed();
      }
    });

    const failListenerPromise = adMobAny.addListener(RewardAdPluginEvents.FailedToLoad, async (err: any) => {
      console.warn("AdMob failed to load native rewarded ad:", err);
      try {
        const rewardL = await rewardListenerPromise;
        const dismissL = await dismissListenerPromise;
        const failL = await failListenerPromise;
        rewardL.remove();
        dismissL.remove();
        failL.remove();
      } catch (e) {}
      onFailed();
    });

    // Show Ad
    await adMobAny[showMethod]();
    return true;

  } catch (error) {
    console.error("Native rewarded ad execution failed:", error);
    onFailed();
    return true; // We handled the flow natively (even if failed), don't show the simulator
  }
}
