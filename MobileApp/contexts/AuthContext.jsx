import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI, userAPI } from "../services/api";
import {
  registerForPushNotifications,
  unregisterPushToken,
} from "../services/pushNotificationService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // On mount: restore session from storage
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const [token, storedUser] = await AsyncStorage.multiGet([
        "accessToken",
        "user",
      ]);
      const accessToken = token[1];
      const userData = storedUser[1];
      if (accessToken && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        registerForPushNotifications().catch(() => {});
        // Refresh profile from server silently
        try {
          const res = await userAPI.getProfile();
          const fresh = res.data?.user || res.data;
          setUser(fresh);
          await AsyncStorage.setItem("user", JSON.stringify(fresh));
        } catch {
          // network error — use cached user
        }
      }
    } catch (error) {
      console.error("Session restore error:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async ({ email, password }) => {
    const res = await authAPI.login({ email, password });
    // Backend response shape: { success, data: { user, tokens: { accessToken, ... }, session }, message }
    // The mobile axios instance returns the raw response (no response-interceptor unwrapping),
    // so res.data is the full JSON body and the payload lives at res.data.data.
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

    await AsyncStorage.multiSet([
      ["accessToken", jwt],
      ["user", JSON.stringify(userData)],
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
    await AsyncStorage.multiSet([
      ["accessToken", jwt],
      ["user", JSON.stringify(userData)],
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
    await AsyncStorage.multiSet([
      ["accessToken", jwt],
      ["user", JSON.stringify(userData)],
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
    await AsyncStorage.multiRemove(["accessToken", "user"]);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const updateUser = useCallback(
    async (updates) => {
      const updated = { ...user, ...updates };
      setUser(updated);
      await AsyncStorage.setItem("user", JSON.stringify(updated));
    },
    [user],
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await userAPI.getProfile();
      const fresh = res.data?.user || res.data;
      setUser(fresh);
      await AsyncStorage.setItem("user", JSON.stringify(fresh));
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
