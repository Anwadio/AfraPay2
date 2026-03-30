/**
 * Push Notification Service (Mobile)
 *
 * Handles:
 *   - Requesting OS permission for push notifications
 *   - Obtaining the Expo push token for this device
 *   - Registering the token with the backend (PATCH /profile/push-token)
 *   - Setting up foreground notification handler
 *   - Setting up notification tap (response) handler
 *
 * Call `registerForPushNotifications()` once after the user authenticates.
 * Call `cleanupNotificationListeners(subscription)` in useEffect cleanup.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { userAPI } from "./api";

// Remote push notifications are not supported in Expo Go since SDK 53.
// Skip all push-related setup when running inside Expo Go.
const IS_EXPO_GO =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

// Only set the notification handler in a real build
if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Register for push notifications.
 * Requests permission, retrieves the Expo push token,
 * and sends it to the backend for storage.
 *
 * @returns {Promise<string|null>} The Expo push token, or null if unavailable / denied.
 */
export async function registerForPushNotifications() {
  // Remote push is not supported in Expo Go (SDK 53+). Skip silently.
  if (IS_EXPO_GO) {
    console.log(
      "[Push] Skipping push registration in Expo Go. Use a development build.",
    );
    return null;
  }

  // Push notifications are not supported on the iOS/Android simulator
  // and not applicable on web.
  if (!Device.isDevice) {
    console.warn("[Push] Push notifications require a physical device.");
    return null;
  }

  // ── iOS / Android 13+: request permission ─────────────────────────────
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("[Push] Permission not granted for push notifications.");
    return null;
  }

  // ── Android: create notification channel ──────────────────────────────
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "AfraPay Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
    });
  }

  // ── Get token ──────────────────────────────────────────────────────────
  let token;
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    token = result.data;
  } catch (err) {
    console.warn("[Push] Failed to get push token:", err.message);
    return null;
  }

  // ── Register with backend ──────────────────────────────────────────────
  try {
    await userAPI.updatePushToken(token);
  } catch (err) {
    // Non-fatal — user can still use the app; push won't work until next registration
    console.warn(
      "[Push] Failed to register push token with backend:",
      err.message,
    );
  }

  return token;
}

/**
 * Remove the stored push token from the backend (call on logout).
 */
export async function unregisterPushToken() {
  try {
    await userAPI.updatePushToken(null);
  } catch (_) {
    // non-fatal
  }
}

/**
 * Add a listener for notifications received while the app is in the foreground.
 *
 * @param {function} handler  Called with (notification) when a notification arrives
 * @returns {Notifications.Subscription}
 */
export function addForegroundListener(handler) {
  if (IS_EXPO_GO) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Add a listener for when the user taps a notification.
 *
 * @param {function} handler  Called with (response) — response.notification has the data
 * @returns {Notifications.Subscription}
 */
export function addResponseListener(handler) {
  if (IS_EXPO_GO) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Remove listener subscriptions (call in useEffect cleanup).
 * Accepts one or more subscription objects.
 *
 * @param {...Notifications.Subscription} subscriptions
 */
export function removeSubscriptions(...subscriptions) {
  subscriptions.forEach((sub) => {
    if (sub) sub.remove();
  });
}
