import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

function PasswordStrengthBar({ password }) {
  const getStrength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = getStrength(password);
  const COLORS = ["#e2e8f0", "#ef4444", "#f59e0b", "#2563eb", "#059669"];
  const LABELS = ["", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <View style={{ marginTop: -8, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= strength ? COLORS[strength] : "#e2e8f0",
            }}
          />
        ))}
      </View>
      {strength > 0 && (
        <Text
          style={{ fontSize: 11, color: COLORS[strength], fontWeight: "700" }}
        >
          {LABELS[strength]} password
        </Text>
      )}
    </View>
  );
}

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    country: "KE",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
    marketingAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const lastNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const set = (key) => (val) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
    setGlobalError("");
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email address is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Enter a valid email address";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    if (!form.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!form.termsAccepted)
      e.termsAccepted = "You must accept the Terms of Service to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
    setGlobalError("");
  };

  const handleRegister = async () => {
    setGlobalError("");
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        country: form.country,
        password: form.password,
        termsAccepted: form.termsAccepted,
        marketingAccepted: form.marketingAccepted,
      });
      router.replace({
        pathname: "/(auth)/login",
        params: {
          message:
            "Account created! Please check your email to verify your account before signing in.",
        },
      });
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Registration failed. Please try again.";
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

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
                paddingTop: 20,
                paddingBottom: 38,
                alignItems: "center",
              }}
            >
              {/* Back button (step 2 only) */}
              {step === 2 && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={{
                    position: "absolute",
                    left: 20,
                    top: 20,
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 20, lineHeight: 24 }}>
                    ‹
                  </Text>
                </TouchableOpacity>
              )}

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
                {step === 1 ? "Create your account" : "Secure your account"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                }}
              >
                {step === 1
                  ? "Step 1 of 2 — Personal details"
                  : "Step 2 of 2 — Set a password"}
              </Text>

              {/* Progress dots */}
              <View style={{ flexDirection: "row", gap: 6, marginTop: 16 }}>
                <View
                  style={{
                    width: 40,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: "#34d399",
                  }}
                />
                <View
                  style={{
                    width: 40,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor:
                      step === 2 ? "#34d399" : "rgba(255,255,255,0.2)",
                  }}
                />
              </View>
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

            {/* ── STEP 1 ── */}
            {step === 1 ? (
              <>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="First name"
                      value={form.firstName}
                      onChangeText={set("firstName")}
                      placeholder="John"
                      autoCapitalize="words"
                      error={errors.firstName}
                      returnKeyType="next"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Last name"
                      value={form.lastName}
                      onChangeText={set("lastName")}
                      placeholder="Doe"
                      autoCapitalize="words"
                      error={errors.lastName}
                      inputRef={lastNameRef}
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  </View>
                </View>

                <Input
                  label="Email address"
                  value={form.email}
                  onChangeText={set("email")}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  leftIcon={<Text style={{ fontSize: 16 }}>✉️</Text>}
                  inputRef={emailRef}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />

                <Input
                  label="Phone number"
                  value={form.phone}
                  onChangeText={set("phone")}
                  placeholder="+254700000000"
                  keyboardType="phone-pad"
                  error={errors.phone}
                  leftIcon={<Text style={{ fontSize: 16 }}>📱</Text>}
                  inputRef={phoneRef}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                />

                <Button
                  title="Continue  →"
                  onPress={handleNext}
                  size="lg"
                  variant="primary"
                  style={{ width: "100%", marginTop: 6 }}
                />
              </>
            ) : (
              /* ── STEP 2 ── */
              <>
                <Input
                  label="Password"
                  value={form.password}
                  onChangeText={set("password")}
                  placeholder="Min. 8 characters"
                  secureTextEntry={!showPassword}
                  error={errors.password}
                  leftIcon={<Text style={{ fontSize: 16 }}>🔒</Text>}
                  inputRef={passwordRef}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  hint="Mix uppercase, numbers & symbols for a stronger password"
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
                <PasswordStrengthBar password={form.password} />

                <Input
                  label="Confirm password"
                  value={form.confirmPassword}
                  onChangeText={set("confirmPassword")}
                  placeholder="Repeat your password"
                  secureTextEntry={!showConfirm}
                  error={errors.confirmPassword}
                  leftIcon={<Text style={{ fontSize: 16 }}>🛡️</Text>}
                  inputRef={confirmRef}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowConfirm((v) => !v)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ fontSize: 18 }}>
                        {showConfirm ? "👁️" : "👁"}
                      </Text>
                    </TouchableOpacity>
                  }
                />

                {passwordsMatch && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: -8,
                      marginBottom: 14,
                      gap: 5,
                    }}
                  >
                    <Text style={{ color: "#059669", fontSize: 14 }}>✓</Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#059669",
                        fontWeight: "700",
                      }}
                    >
                      Passwords match
                    </Text>
                  </View>
                )}

                <Button
                  title="Create Account"
                  onPress={handleRegister}
                  loading={loading}
                  size="lg"
                  variant="secondary"
                  style={{ width: "100%", marginTop: 8 }}
                />

                {/* Terms of Service checkbox (required) */}
                <TouchableOpacity
                  onPress={() => {
                    set("termsAccepted")(!form.termsAccepted);
                    if (errors.termsAccepted)
                      setErrors((p) => ({ ...p, termsAccepted: "" }));
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginTop: 16,
                    gap: 10,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: errors.termsAccepted
                        ? "#dc2626"
                        : form.termsAccepted
                          ? "#059669"
                          : "#cbd5e1",
                      backgroundColor: form.termsAccepted ? "#059669" : "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  >
                    {form.termsAccepted && (
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "900",
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{ flex: 1, fontSize: 13, color: "#475569", lineHeight: 20 }}
                  >
                    I agree to the{" "}
                    <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
                {errors.termsAccepted ? (
                  <Text
                    style={{
                      color: "#dc2626",
                      fontSize: 12,
                      marginTop: 4,
                      marginLeft: 30,
                    }}
                  >
                    {errors.termsAccepted}
                  </Text>
                ) : null}

                {/* Marketing opt-in (optional) */}
                <TouchableOpacity
                  onPress={() =>
                    set("marketingAccepted")(!form.marketingAccepted)
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginTop: 12,
                    gap: 10,
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      borderWidth: 2,
                      borderColor: form.marketingAccepted ? "#2563eb" : "#cbd5e1",
                      backgroundColor: form.marketingAccepted ? "#2563eb" : "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  >
                    {form.marketingAccepted && (
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: "900",
                        }}
                      >
                        ✓
                      </Text>
                    )}
                  </View>
                  <Text
                    style={{ flex: 1, fontSize: 13, color: "#475569", lineHeight: 20 }}
                  >
                    Keep me updated with product news and offers{" "}
                    <Text style={{ color: "#94a3b8" }}>(optional)</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Sign in link */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 26,
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 14 }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text
                  style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
