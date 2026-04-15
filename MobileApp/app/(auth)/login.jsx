/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");

// Discovery documents — avoids network fetch on each render
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};
const FACEBOOK_DISCOVERY = {
  authorizationEndpoint: "https://www.facebook.com/v6.0/dialog/oauth",
};

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'facebook' | null
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const router = useRouter();
  const { message: routeMessage } = useLocalSearchParams();
  const passwordRef = useRef(null);

  useEffect(() => {
    if (routeMessage) setSuccessMessage(String(routeMessage));
  }, [routeMessage]);

  // ── Google OAuth (uses clientId as universal fallback — no platform-specific IDs needed) ──
  const [, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      redirectUri: AuthSession.makeRedirectUri({ scheme: "afrapayapp" }),
      scopes: ["openid", "email", "profile"],
      responseType: AuthSession.ResponseType.IdToken,
    },
    GOOGLE_DISCOVERY,
  );

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken =
        googleResponse.params?.id_token ||
        googleResponse.authentication?.idToken;
      if (idToken) handleGoogleLogin(idToken);
      else {
        setGlobalError("Google sign-in failed: no token returned.");
        setSocialLoading(null);
      }
    } else if (googleResponse?.type === "error") {
      setGlobalError(
        googleResponse.error?.message ||
          "Google sign-in failed. Please try again.",
      );
      setSocialLoading(null);
    } else if (
      googleResponse?.type === "dismiss" ||
      googleResponse?.type === "cancel"
    ) {
      setSocialLoading(null);
    }
  }, [googleResponse]);

  // ── Facebook OAuth ──
  const [, fbResponse, fbPromptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
      redirectUri: AuthSession.makeRedirectUri({
        scheme: "afrapayapp",
        native: `fb${process.env.EXPO_PUBLIC_FACEBOOK_APP_ID}://authorize`,
      }),
      scopes: ["public_profile", "email"],
      responseType: AuthSession.ResponseType.Token,
    },
    FACEBOOK_DISCOVERY,
  );

  useEffect(() => {
    if (fbResponse?.type === "success") {
      const accessToken = fbResponse.params?.access_token;
      if (accessToken) handleFacebookLogin(accessToken);
      else {
        setGlobalError("Facebook sign-in failed: no token returned.");
        setSocialLoading(null);
      }
    } else if (fbResponse?.type === "error") {
      setGlobalError(
        fbResponse.error?.message ||
          "Facebook sign-in failed. Please try again.",
      );
      setSocialLoading(null);
    } else if (
      fbResponse?.type === "dismiss" ||
      fbResponse?.type === "cancel"
    ) {
      setSocialLoading(null);
    }
  }, [fbResponse]);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = t("auth.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t("auth.emailInvalid");
    if (!password) e.password = t("auth.passwordRequired");
    else if (password.length < 8) e.password = t("auth.passwordMinLength");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    setGlobalError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.replace("/(tabs)");
    } catch (err) {
      if (err.response?.data?.error?.code === "EMAIL_NOT_VERIFIED") {
        setGlobalError(t("auth.verifyEmail"));
        return;
      }
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        t("auth.signInFailed");
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    setSocialLoading("google");
    try {
      await loginWithGoogle(credential);
      router.replace("/(tabs)");
    } catch (err) {
      setGlobalError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Google sign-in failed. Please try again.",
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async (accessToken) => {
    setSocialLoading("facebook");
    try {
      const res = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}`,
      );
      const fbData = await res.json();
      if (!fbData.id) throw new Error("Could not retrieve Facebook user ID.");
      await loginWithFacebook(accessToken, fbData.id);
      router.replace("/(tabs)");
    } catch (err) {
      setGlobalError(
        err.response?.data?.error?.message ||
          err.response?.data?.message ||
          err.message ||
          "Facebook sign-in failed. Please try again.",
      );
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "#0f172a" }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── HERO ── */}
          <SafeAreaView edges={["top"]} style={{ backgroundColor: "#0f172a" }}>
            <View
              style={{
                paddingHorizontal: 28,
                paddingTop: 32,
                paddingBottom: 44,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Image
                  source={require("../../assets/images/mainlogo.png")}
                  style={{ width: 52, height: 52, resizeMode: "contain" }}
                />
              </View>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "800",
                  color: "#fff",
                  textAlign: "center",
                  letterSpacing: -0.5,
                  marginBottom: 8,
                }}
              >
                {t("auth.welcomeBack")}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                }}
              >
                {t("auth.signInSubtitle")}
              </Text>
            </View>
          </SafeAreaView>

          {/* ── FORM CARD ── */}
          <View
            style={{
              flex: 1,
              backgroundColor: "#fff",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 26,
              paddingTop: 32,
              paddingBottom: 48,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -4 },
              elevation: 10,
            }}
          >
            {/* Drag pill */}
            <View
              style={{
                width: 44,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#e2e8f0",
                alignSelf: "center",
                marginBottom: 30,
              }}
            />

            {/* Success message (e.g. post-register) */}
            {successMessage ? (
              <View
                style={{
                  backgroundColor: "#f0fdf4",
                  borderWidth: 1,
                  borderColor: "#86efac",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 18,
                  flexDirection: "row",
                  alignItems: "flex-start",
                }}
              >
                <Text style={{ fontSize: 15, marginRight: 8 }}>✅</Text>
                <Text
                  style={{
                    flex: 1,
                    color: "#15803d",
                    fontSize: 13,
                    lineHeight: 20,
                    fontWeight: "500",
                  }}
                >
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {/* Global error */}
            {globalError ? (
              <View
                style={{
                  backgroundColor: "#fff5f5",
                  borderWidth: 1,
                  borderColor: "#fca5a5",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 20,
                  flexDirection: "row",
                  alignItems: "flex-start",
                }}
              >
                <Text style={{ fontSize: 15, marginRight: 8 }}>⚠️</Text>
                <Text
                  style={{
                    flex: 1,
                    color: "#dc2626",
                    fontSize: 13,
                    lineHeight: 20,
                    fontWeight: "500",
                  }}
                >
                  {globalError}
                </Text>
              </View>
            ) : null}

            {/* Email */}
            <Input
              label={t("auth.emailAddress")}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                if (globalError) setGlobalError("");
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon={<Text style={{ fontSize: 16 }}>✉️</Text>}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {/* Password */}
            <Input
              label={t("auth.password")}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                if (globalError) setGlobalError("");
              }}
              placeholder={t("auth.password")}
              secureTextEntry={!showPassword}
              error={errors.password}
              leftIcon={<Text style={{ fontSize: 16 }}>🔒</Text>}
              inputRef={passwordRef}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 18 }}>
                    {showPassword ? "👁️" : "👁"}
                  </Text>
                </TouchableOpacity>
              }
            />

            {/* Forgot */}
            <TouchableOpacity
              style={{
                alignSelf: "flex-end",
                marginTop: -6,
                marginBottom: 26,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 20, right: 0 }}
            >
              <Text
                style={{ color: "#2563eb", fontSize: 13, fontWeight: "600" }}
              >
                {t("auth.forgotPassword")}
              </Text>
            </TouchableOpacity>

            <Button
              title={loading ? t("auth.signingIn") : t("auth.loginButton")}
              onPress={handleLogin}
              loading={loading}
              size="lg"
              variant="primary"
              style={{ width: "100%" }}
            />

            {/* Divider */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 24,
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }}
              />
              <Text
                style={{
                  marginHorizontal: 14,
                  color: "#94a3b8",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {t("auth.or")}
              </Text>
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }}
              />
            </View>

            {/* Social buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* Google */}
              <TouchableOpacity
                onPress={() => {
                  setGlobalError("");
                  setSocialLoading("google");
                  googlePromptAsync();
                }}
                disabled={!!socialLoading || loading}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 13,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: "#e2e8f0",
                  backgroundColor:
                    socialLoading === "google" ? "#f8fafc" : "#fff",
                  opacity:
                    socialLoading && socialLoading !== "google" ? 0.5 : 1,
                }}
              >
                {socialLoading === "google" ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <>
                    {/* Google G icon */}
                    <View style={{ width: 20, height: 20 }}>
                      <Text style={{ fontSize: 17, lineHeight: 20 }}>G</Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Facebook */}
              <TouchableOpacity
                onPress={() => {
                  setGlobalError("");
                  setSocialLoading("facebook");
                  fbPromptAsync();
                }}
                disabled={!!socialLoading || loading}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 13,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: "#e2e8f0",
                  backgroundColor:
                    socialLoading === "facebook" ? "#f8fafc" : "#fff",
                  opacity:
                    socialLoading && socialLoading !== "facebook" ? 0.5 : 1,
                }}
              >
                {socialLoading === "facebook" ? (
                  <ActivityIndicator size="small" color="#1877F2" />
                ) : (
                  <>
                    <Text
                      style={{
                        fontSize: 17,
                        color: "#1877F2",
                        lineHeight: 20,
                      }}
                    >
                      f
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Facebook
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Register link */}
            <View style={{ alignItems: "center", marginTop: 28 }}>
              <Text style={{ fontSize: 14, color: "#64748b" }}>
                {t("auth.dontHaveAccount")}{" "}
                <Text
                  onPress={() => router.push("/(auth)/register")}
                  style={{ color: "#2563eb", fontWeight: "700" }}
                >
                  {t("auth.signUpFree") || "Sign up free"}
                </Text>
              </Text>
            </View>

            {/* Security note */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 30,
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <Text style={{ fontSize: 13, flexShrink: 0 }}>🔐</Text>
              <Text style={{ fontSize: 12, color: "#94a3b8", flexShrink: 1 }}>
                Secured with 256-bit SSL encryption
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
