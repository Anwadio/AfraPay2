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
import { userAPI, authAPI } from "../../services/api";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { LoadingState } from "../../components/ui/States";

export default function ProfileScreen() {
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
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile(form);
      await refreshUser();
      Alert.alert("Saved", "Profile updated successfully");
    } catch (err1) {
      Alert.alert(
        "Error",
        err1.response?.data?.message || "Could not update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const e = {};
    if (!passwordForm.current) e.current = "Current password is required";
    if (!passwordForm.newPwd || passwordForm.newPwd.length < 8)
      e.newPwd = "At least 8 characters";
    if (passwordForm.newPwd !== passwordForm.confirm)
      e.confirm = "Passwords do not match";
    setPwErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      await authAPI.changePassword(passwordForm.current, passwordForm.newPwd);
      Alert.alert("Success", "Password changed successfully");
      setPasswordForm({ current: "", newPwd: "", confirm: "" });
    } catch (err2) {
      Alert.alert(
        "Error",
        err2.response?.data?.message || "Failed to change password",
      );
    } finally {
      setSaving(false);
    }
  };

  const set = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));
  const setPw = (key) => (val) =>
    setPasswordForm((p) => ({ ...p, [key]: val }));

  if (loading) return <LoadingState message="Loading profile..." />;

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
                  ✓ Verified account
                </Text>
              </View>
            )}
          </View>

          {/* Tab Switcher */}
          <View className="flex-row mx-5 mb-4 p-1 bg-slate-100 rounded-xl">
            {[
              { key: "profile", label: "Profile" },
              { key: "security", label: "Security" },
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
                  Personal Information
                </Text>
                <Input
                  label="First name"
                  value={form.firstName}
                  onChangeText={set("firstName")}
                  placeholder="John"
                  autoCapitalize="words"
                />
                <Input
                  label="Last name"
                  value={form.lastName}
                  onChangeText={set("lastName")}
                  placeholder="Doe"
                  autoCapitalize="words"
                />
                <Input
                  label="Phone number"
                  value={form.phone}
                  onChangeText={set("phone")}
                  placeholder="+254700000000"
                  keyboardType="phone-pad"
                />
                <Input
                  label="Email"
                  value={profile?.email || user?.email || ""}
                  editable={false}
                  className="opacity-60"
                />
                <Button
                  title="Save Changes"
                  onPress={handleSaveProfile}
                  loading={saving}
                  className="w-full mt-2"
                />
              </Card>
            ) : (
              <Card>
                <Text className="text-sm font-bold text-slate-700 mb-4">
                  Change Password
                </Text>
                <Input
                  label="Current password"
                  value={passwordForm.current}
                  onChangeText={setPw("current")}
                  secureTextEntry
                  placeholder="Current password"
                  error={pwErrors.current}
                />
                <Input
                  label="New password"
                  value={passwordForm.newPwd}
                  onChangeText={setPw("newPwd")}
                  secureTextEntry
                  placeholder="Min. 8 characters"
                  error={pwErrors.newPwd}
                />
                <Input
                  label="Confirm new password"
                  value={passwordForm.confirm}
                  onChangeText={setPw("confirm")}
                  secureTextEntry
                  placeholder="Repeat new password"
                  error={pwErrors.confirm}
                />
                <Button
                  title="Update Password"
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
