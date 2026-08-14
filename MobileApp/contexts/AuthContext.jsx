import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import { authAPI, userAPI } from "../services/api";
import {
  registerForPushNotifications,
  unregisterPushToken,
} from "../services/pushNotificationService";

const TOKEN_KEY = "accessToken";
const USER_KEY = "user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const restoreSession = useCallback(async () => {
    try {
      const [accessToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (accessToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        registerForPushNotifications().catch(() => {});
        try {
          const res = await userAPI.getProfile();
          const fresh = res.data?.user || res.data;
          setUser(fresh);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh));
        } catch {
          // network error — use cached user
        }
      }
    } catch (error) {
      console.error("Session restore error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: restore session from secure storage
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async ({ email, password }) => {
    const res = await authAPI.login({ email, password });
    const payload = res.data?.data || {};

    // MFA challenge — no token yet, caller must handle
    if (payload.mfaRequired) {
      return payload;
    }

    const jwt = payload.tokens?.accessToken;
    const userData = payload.user;

    if (!jwt || !userData) {
      throw new Error("Invalid response from server. Please try again.");
    }

    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, jwt, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ]);
    setUser(userData);
    setIsAuthenticated(true);
    registerForPushNotifications().catch(() => {});
    return payload;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await authAPI.googleOAuth(credential);
    const payload = res.data?.data || {};
    const jwt =
      payload.tokens?.accessToken || payload.token || payload.accessToken;
    const userData = payload.user;
    if (!jwt || !userData) throw new Error("Invalid response from server.");
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, jwt, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ]);
    setUser(userData);
    setIsAuthenticated(true);
    registerForPushNotifications().catch(() => {});
    return payload;
  }, []);

  const loginWithFacebook = useCallback(async (accessToken, userID) => {
    const res = await authAPI.facebookOAuth(accessToken, userID);
    const payload = res.data?.data || {};
    const jwt =
      payload.tokens?.accessToken || payload.token || payload.accessToken;
    const userData = payload.user;
    if (!jwt || !userData) throw new Error("Invalid response from server.");
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, jwt, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ]);
    setUser(userData);
    setIsAuthenticated(true);
    registerForPushNotifications().catch(() => {});
    return payload;
  }, []);

  const logout = useCallback(async () => {
    await unregisterPushToken().catch(() => {});
    try {
      await authAPI.logout();
    } catch {
      // ignore network errors on logout
    }
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback(
    async (updates) => {
      const updated = { ...user, ...updates };
      setUser(updated);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    },
    [user],
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await userAPI.getProfile();
      const fresh = res.data?.user || res.data;
      setUser(fresh);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(fresh), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return fresh;
    } catch (error) {
      if (error.response?.status === 401) {
        await logout();
      }
      throw error;
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        loginWithGoogle,
        loginWithFacebook,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export default AuthContext;
