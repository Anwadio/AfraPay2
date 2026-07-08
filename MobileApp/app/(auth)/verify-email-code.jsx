import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { authAPI } from "../../services/api";

export default function VerifyEmailCodeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { email } = useLocalSearchParams();

  const [code, setCode] = useState("");
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeInputRef = useRef(null);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleVerify = async () => {
    setGlobalError("");
    const e = {};

    if (!code)
      e.code = t("auth.codeRequired") || "Verification code is required";
    else if (code.length !== 6) e.code = "Code must be 6 digits";
    else if (!/^\d{6}$/.test(code)) e.code = "Code must contain only digits";

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyEmailCode({ email, code });
      router.replace({
        pathname: "/(auth)/login",
        params: {
          message:
            t("auth.emailVerifiedSuccess") ||
            "Email verified! You can now sign in.",
        },
      });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        "Verification failed. Please try again.";
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setGlobalError("");
    setCanResend(false);
    setCountdown(60);

    try {
      await authAPI.resendEmailVerificationCode({ email });
      setCode("");
      // Show confirmation
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to resend code. Please try again.";
      setGlobalError(msg);
      setCanResend(true);
      setCountdown(0);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: "#0f172a" }}
      >
        {/* ── HERO ── */}
        <SafeAreaView edges={["top"]} style={{ backgroundColor: "#0f172a" }}>
          <View
            style={{
              paddingHorizontal: 28,
              paddingTop: 20,
              paddingBottom: 38,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }}
            >
              <Image
                source={require("../../assets/images/mainlogo.png")}
                style={{ width: 50, height: 50, resizeMode: "contain" }}
              />
            </View>

            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: "#fff",
                textAlign: "center",
                letterSpacing: -0.4,
                marginBottom: 6,
              }}
            >
              {t("auth.verifyEmail") || "Verify Your Email"}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                textAlign: "center",
              }}
            >
              {t("auth.verifyEmailDesc") || `We sent a code to ${email}`}
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
            paddingTop: 30,
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
              marginBottom: 26,
            }}
          />

          {/* Global error */}
          {globalError ? (
            <View
              style={{
                backgroundColor: "#fff5f5",
                borderWidth: 1,
                borderColor: "#fca5a5",
                borderRadius: 14,
                padding: 14,
                marginBottom: 18,
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

          {/* Code input */}
          <Input
            label={t("auth.verificationCode") || "Verification Code"}
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/\D/g, "").slice(0, 6));
              if (errors.code) setErrors((p) => ({ ...p, code: "" }));
            }}
            placeholder="000000"
            keyboardType="numeric"
            maxLength={6}
            error={errors.code}
            leftIcon={<Text style={{ fontSize: 16 }}>🔐</Text>}
            inputRef={codeInputRef}
            returnKeyType="done"
            onSubmitEditing={handleVerify}
            autoFocus
          />

          <Button
            title={
              loading ? "Verifying..." : t("auth.verifyButton") || "Verify"
            }
            onPress={handleVerify}
            loading={loading}
            disabled={loading || code.length !== 6}
            size="lg"
            variant="primary"
            style={{ width: "100%", marginTop: 16 }}
          />

          {/* Resend code */}
          <View
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: "#6b7280",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {t("auth.didNotReceiveCode") || "Didn't receive the code?"}
            </Text>

            {canResend ? (
              <TouchableOpacity onPress={handleResendCode} disabled={loading}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#1a56db",
                    textAlign: "center",
                  }}
                >
                  {t("auth.resendCode") || "Send Again"}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  textAlign: "center",
                }}
              >
                {t("auth.resendIn") || "Resend in"} {countdown}s
              </Text>
            )}
          </View>

          {/* Help text */}
          <Text
            style={{
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "center",
              marginTop: 24,
              lineHeight: 18,
            }}
          >
            {t("auth.verifyCodeHint") ||
              "The code expires in 10 minutes. Check your spam folder if you don't see the email."}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
