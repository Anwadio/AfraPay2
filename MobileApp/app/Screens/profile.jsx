import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { userAPI, authAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { LoadingState } from "../../components/ui/States";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [activeSection, setActiveSection] = useState("profile");
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPwd: "",
    confirm: "",
  });
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await userAPI.getProfile();
      const p = res.data?.user || res.data?.profile || res.data;
      setProfile(p);
      setForm({
        firstName: p?.firstName || "",
        lastName: p?.lastName || "",
        phone: p?.phone || "",
      });
    } catch (_err) {
      Alert.alert(t("common.error"), t("profile.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile(form);
      await refreshUser();
      Alert.alert(t("common.success"), t("profile.saved"));
    } catch (err1) {
      Alert.alert(
        t("common.error"),
        err1.response?.data?.message || t("profile.saveError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const e = {};
    if (!passwordForm.current) e.current = t("auth.currentPasswordRequired");
    if (!passwordForm.newPwd || passwordForm.newPwd.length < 8)
      e.newPwd = t("auth.newPasswordMinLength");
    if (passwordForm.newPwd !== passwordForm.confirm)
      e.confirm = t("auth.passwordsDoNotMatch");
    setPwErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      await authAPI.changePassword(passwordForm.current, passwordForm.newPwd);
      Alert.alert(t("common.success"), t("auth.passwordChanged"));
      setPasswordForm({ current: "", newPwd: "", confirm: "" });
    } catch (err2) {
      Alert.alert(
        t("common.error"),
        err2.response?.data?.message || t("auth.passwordChangeFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));
  const setPw = (key) => (val) =>
    setPasswordForm((p) => ({ ...p, [key]: val }));

  if (loading) return <LoadingState message={t("profile.title")} />;

  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      profile.name ||
      "User"
    : "User";

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View className="items-center pt-6 pb-4">
            <View className="w-20 h-20 rounded-full bg-blue-600 items-center justify-center mb-3">
              <Text className="text-white font-bold text-3xl">
                {displayName[0]?.toUpperCase() || "U"}
              </Text>
            </View>
            <Text className="text-xl font-bold text-slate-900">
              {displayName}
            </Text>
            <Text className="text-slate-400 text-sm mt-0.5">
              {profile?.email || user?.email}
            </Text>
            {profile?.isVerified && (
              <View className="flex-row items-center gap-1 mt-1">
                <Text className="text-emerald-600 text-xs">
                  ✓ {t("profile.verifiedAccount")}
                </Text>
              </View>
            )}
          </View>

          {/* Tab Switcher */}
          <View className="flex-row mx-5 mb-4 p-1 bg-slate-100 rounded-xl">
            {[
              { key: "profile", label: t("profile.title") },
              { key: "security", label: t("profile.security") },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveSection(tab.key)}
                className={`flex-1 py-2.5 rounded-lg items-center ${activeSection === tab.key ? "bg-white shadow-sm" : ""}`}
              >
                <Text
                  className={`text-sm font-semibold ${activeSection === tab.key ? "text-slate-900" : "text-slate-400"}`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="px-5">
            {activeSection === "profile" ? (
              <Card>
                <Text className="text-sm font-bold text-slate-700 mb-4">
                  {t("profile.title")}
                </Text>
                <Input
                  label={t("auth.firstName")}
                  value={form.firstName}
                  onChangeText={set("firstName")}
                  placeholder="John"
                  autoCapitalize="words"
                />
                <Input
                  label={t("auth.lastName")}
                  value={form.lastName}
                  onChangeText={set("lastName")}
                  placeholder="Doe"
                  autoCapitalize="words"
                />
                <Input
                  label={t("auth.phone")}
                  value={form.phone}
                  onChangeText={set("phone")}
                  placeholder="+254700000000"
                  keyboardType="phone-pad"
                />
                <Input
                  label={t("auth.email")}
                  value={profile?.email || user?.email || ""}
                  editable={false}
                  className="opacity-60"
                />
                <Button
                  title={t("profile.saveProfile")}
                  onPress={handleSaveProfile}
                  loading={saving}
                  className="w-full mt-2"
                />
              </Card>
            ) : (
              <Card>
                <Text className="text-sm font-bold text-slate-700 mb-4">
                  {t("profile.changePassword")}
                </Text>
                <Input
                  label={t("auth.currentPassword")}
                  value={passwordForm.current}
                  onChangeText={setPw("current")}
                  secureTextEntry
                  placeholder={t("auth.currentPassword")}
                  error={pwErrors.current}
                />
                <Input
                  label={t("auth.newPassword")}
                  value={passwordForm.newPwd}
                  onChangeText={setPw("newPwd")}
                  secureTextEntry
                  placeholder="Min. 8 characters"
                  error={pwErrors.newPwd}
                />
                <Input
                  label={t("auth.confirmPassword")}
                  value={passwordForm.confirm}
                  onChangeText={setPw("confirm")}
                  secureTextEntry
                  placeholder={t("auth.confirmPassword")}
                  error={pwErrors.confirm}
                />
                <Button
                  title={saving ? t("profile.saving") : t("auth.resetPassword")}
                  onPress={handleChangePassword}
                  loading={saving}
                  className="w-full mt-2"
                />
              </Card>
            )}
          </View>

          <View className="h-10" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
