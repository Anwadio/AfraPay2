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
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useTranslation } from "react-i18next";

const COUNTRY_OPTIONS = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", dialCode: "+256" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", dialCode: "+255" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", dialCode: "+250" },
  { code: "SN", name: "Senegal", flag: "🇸🇳", dialCode: "+221" },
  { code: "CI", name: "Ivory Coast", flag: "🇨🇮", dialCode: "+225" },
  { code: "CM", name: "Cameroon", flag: "🇨🇲", dialCode: "+237" },
];

const DEFAULT_COUNTRY = COUNTRY_OPTIONS[0];

function PasswordStrengthBar({ password }) {
  const { t } = useTranslation();
  const getStrength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  const getRequirements = (pw) => {
    return {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
  };

  const strength = getStrength(password);
  const requirements = getRequirements(password);
  const COLORS = ["#e2e8f0", "#ef4444", "#f59e0b", "#2563eb", "#059669"];
  const LABELS = [
    "",
    t("auth.passwordWeak"),
    t("auth.passwordFair"),
    t("auth.passwordGood"),
    t("auth.passwordStrong"),
  ];
  if (!password) return null;

  return (
    <View style={{ marginTop: -8, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= strength ? COLORS[strength] : "#e2e8f0",
            }}
          />
        ))}
      </View>
      {strength > 0 && (
        <>
          <Text
            style={{
              fontSize: 12,
              color: COLORS[strength],
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            {LABELS[strength]} password
          </Text>

          {strength < 4 && (
            <View style={{ gap: 4 }}>
              {!requirements.length && (
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  • At least 8 characters
                </Text>
              )}
              {!requirements.uppercase && (
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  • One uppercase letter (A-Z)
                </Text>
              )}
              {!requirements.lowercase && (
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  • One lowercase letter (a-z)
                </Text>
              )}
              {!requirements.number && (
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  • One number (0-9)
                </Text>
              )}
              {!requirements.special && (
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  • One special character (!@#$%^&*)
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function RegisterScreen() {
  const { t } = useTranslation();
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
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
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

  const isPasswordValid = (password) => {
    // Must have uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
    return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = t("auth.firstNameRequired");
    if (!form.lastName.trim()) e.lastName = t("auth.lastNameRequired");
    if (!form.email.trim()) e.email = t("auth.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t("auth.emailInvalid");
    if (!form.country) e.country = "Please select your country";
    if (!form.phone.trim()) e.phone = t("auth.phoneRequired");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.password) e.password = t("auth.passwordRequired");
    else if (form.password.length < 8) e.password = t("auth.passwordMinLength");
    else if (!isPasswordValid(form.password))
      e.password = t("auth.passwordRequirements");
    if (!form.confirmPassword)
      e.confirmPassword = t("auth.confirmPasswordRequired");
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = t("auth.passwordsDoNotMatch");
    if (!form.termsAccepted) e.termsAccepted = t("auth.termsRequired");
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
      const normalizedPhone = `${selectedCountry.dialCode}${form.phone.replace(/\D/g, "")}`;
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: normalizedPhone,
        dateOfBirth: form.dateOfBirth || undefined,
        country: selectedCountry.code,
        password: form.password,
        termsAccepted: form.termsAccepted,
        marketingAccepted: form.marketingAccepted,
      });
      // Redirect to email verification code screen for mobile
      router.replace({
        pathname: "/(auth)/verify-email-code",
        params: {
          email: form.email.trim().toLowerCase(),
        },
      });
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        t("auth.registerFailed");
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
                {step === 1 ? t("auth.createAccount") : t("auth.secureAccount")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.5)",
                  textAlign: "center",
                }}
              >
                {step === 1 ? t("auth.step1Label") : t("auth.step2Label")}
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
                      label={t("auth.firstName")}
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
                      label={t("auth.lastName")}
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
                  label={t("auth.emailAddress")}
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

                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: errors.phone ? "#ef4444" : "#475569",
                      marginBottom: 6,
                      letterSpacing: 0.1,
                    }}
                  >
                    {t("auth.phone")}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1.5,
                      borderRadius: 14,
                      borderColor: errors.phone ? "#fca5a5" : "#e2e8f0",
                      backgroundColor: errors.phone ? "#fff5f5" : "#f8fafc",
                      overflow: "hidden",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setShowCountryPicker(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 14,
                        borderRightWidth: 1,
                        borderRightColor: "#e2e8f0",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 6 }}>
                        {selectedCountry.flag}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#0f172a" }}>
                        {selectedCountry.dialCode}
                      </Text>
                    </TouchableOpacity>

                    <TextInput
                      ref={phoneRef}
                      value={form.phone}
                      onChangeText={(text) => {
                        const digitsOnly = text.replace(/\D/g, "");
                        setForm((p) => ({ ...p, phone: digitsOnly }));
                        if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                      }}
                      placeholder="700000000"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleNext}
                      style={{
                        flex: 1,
                        fontSize: 15,
                        color: "#0f172a",
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                      }}
                    />
                  </View>

                  {errors.phone ? (
                    <Text
                      style={{
                        color: "#ef4444",
                        fontSize: 12,
                        marginTop: 5,
                        marginLeft: 2,
                        fontWeight: "500",
                      }}
                    >
                      ⚠ {errors.phone}
                    </Text>
                  ) : (
                    <Text
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 5,
                        marginLeft: 2,
                      }}
                    >
                      Contacts will be saved as {selectedCountry.dialCode}xxxxxxxx
                    </Text>
                  )}
                </View>

                <Modal
                  visible={showCountryPicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowCountryPicker(false)}
                >
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "rgba(15, 23, 42, 0.45)",
                      justifyContent: "flex-end",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#fff",
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        paddingHorizontal: 20,
                        paddingTop: 16,
                        paddingBottom: 28,
                        maxHeight: "70%",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 12,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a" }}>
                          Select country
                        </Text>
                        <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                          <Text style={{ fontSize: 16, color: "#2563eb", fontWeight: "600" }}>
                            Done
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView showsVerticalScrollIndicator={false}>
                        {COUNTRY_OPTIONS.map((country) => (
                          <TouchableOpacity
                            key={country.code}
                            onPress={() => {
                              setSelectedCountry(country);
                              setForm((p) => ({ ...p, country: country.code }));
                              setShowCountryPicker(false);
                            }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingVertical: 14,
                              borderBottomWidth: 1,
                              borderBottomColor: "#e2e8f0",
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Text style={{ fontSize: 24, marginRight: 12 }}>{country.flag}</Text>
                              <Text style={{ fontSize: 15, color: "#0f172a", fontWeight: "600" }}>
                                {country.name}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 14, color: "#475569", fontWeight: "600" }}>
                              {country.dialCode}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>

                <Button
                  title={t("auth.continue")}
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
                  label={t("auth.password")}
                  value={form.password}
                  onChangeText={set("password")}
                  placeholder={t("auth.passwordPlaceholder")}
                  secureTextEntry={!showPassword}
                  error={errors.password}
                  leftIcon={<Text style={{ fontSize: 16 }}>🔒</Text>}
                  inputRef={passwordRef}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  hint={t("auth.passwordHint")}
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
                  label={t("auth.confirmPassword")}
                  value={form.confirmPassword}
                  onChangeText={set("confirmPassword")}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
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
                      {t("auth.passwordsMatch")}
                    </Text>
                  </View>
                )}

                <Button
                  title={t("auth.registerButton")}
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
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 20,
                    }}
                  >
                    {t("auth.termsText")}{" "}
                    <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                      {t("auth.termsLink")}
                    </Text>{" "}
                    {t("auth.andText")}{" "}
                    <Text style={{ color: "#2563eb", fontWeight: "600" }}>
                      {t("auth.privacyLink")}
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
                      borderColor: form.marketingAccepted
                        ? "#2563eb"
                        : "#cbd5e1",
                      backgroundColor: form.marketingAccepted
                        ? "#2563eb"
                        : "#fff",
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
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: "#475569",
                      lineHeight: 20,
                    }}
                  >
                    {t("auth.marketingText")}{" "}
                    <Text style={{ color: "#94a3b8" }}>
                      ({t("common.optional")})
                    </Text>
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
                {t("auth.alreadyHaveAccount")}{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text
                  style={{ color: "#2563eb", fontSize: 14, fontWeight: "700" }}
                >
                  {t("auth.login")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
