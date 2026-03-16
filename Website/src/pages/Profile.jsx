/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardSection } from "../components/layout/DashboardUtils";
import { useAuth } from "../contexts/AuthContext";
import { userAPI } from "../services/api";
import toast from "react-hot-toast";

// Country code → full name map (matches Register.jsx country list)
const COUNTRY_NAMES = {
  NG: "Nigeria",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  SN: "Senegal",
  CI: "Ivory Coast",
  CM: "Cameroon",
};

const COUNTRIES = [
  { value: "NG", label: "Nigeria" },
  { value: "GH", label: "Ghana" },
  { value: "KE", label: "Kenya" },
  { value: "ZA", label: "South Africa" },
  { value: "UG", label: "Uganda" },
  { value: "TZ", label: "Tanzania" },
  { value: "RW", label: "Rwanda" },
  { value: "SN", label: "Senegal" },
  { value: "CI", label: "Ivory Coast" },
  { value: "CM", label: "Cameroon" },
];

const Field = ({ label, children, hint }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-neutral-700">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-neutral-400">{hint}</p>}
  </div>
);

const Profile = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    bio: "",
    location: "",
    timezone: "",
    language: "en",
  });

  // Load profile on mount
  useEffect(() => {
    userAPI
      .getProfile()
      .then((res) => {
        if (res?.success && res.data) {
          const p = res.data;
          setProfile(p);
          setForm({
            firstName: p.firstName || "",
            lastName: p.lastName || "",
            phone: p.phone || "",
            dateOfBirth: p.dateOfBirth
              ? p.dateOfBirth.substring(0, 10) // ISO → YYYY-MM-DD
              : "",
            bio: p.bio || "",
            location: p.location || "",
            timezone: p.timezone || "",
            language: p.language || "en",
          });
        }
      })
      .catch((err) => {
        console.error("Profile load failed:", err);
        toast.error("Failed to load profile.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userAPI.updateProfile(form);
      // Optimistically update local profile display
      setProfile((prev) => ({ ...prev, ...form }));
      toast.success("Profile updated successfully.");
      setEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
      const message =
        err.response?.data?.error?.message ||
        "Failed to update profile. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to last saved profile state
    if (profile) {
      setForm({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth
          ? profile.dateOfBirth.substring(0, 10)
          : "",
        bio: profile.bio || "",
        location: profile.location || "",
        timezone: profile.timezone || "",
        language: profile.language || "en",
      });
    }
    setEditing(false);
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic client-side validation
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const res = await userAPI.uploadProfilePicture(file);
      if (res?.success && res.data?.avatarUrl) {
        setProfile((prev) => ({ ...prev, avatar: res.data.avatarUrl }));
        toast.success("Profile photo updated.");
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setAvatarUploading(false);
      // Reset file input so the same file can be re-selected if needed
      e.target.value = "";
    }
  };

  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
      profile.name
    : user?.name || user?.email || "User";

  const dashboardUser = {
    name: displayName,
    email: profile?.email || user?.email || "",
    avatar: profile?.avatar || null,
    role: user?.role || "user",
  };

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout user={dashboardUser}>
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <DashboardSection
          title="My Profile"
          description="Manage your personal information and preferences"
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Avatar + identity card */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={displayName}
                      className="w-20 h-20 rounded-full object-cover ring-2 ring-primary-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-2xl font-bold ring-2 ring-primary-200">
                      {initials}
                    </div>
                  )}

                  {/* Upload overlay button */}
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={avatarUploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center shadow hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    aria-label="Change profile photo"
                  >
                    {avatarUploading ? (
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Name / email / badges */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-neutral-900 truncate">
                    {displayName}
                  </h2>
                  <p className="text-sm text-neutral-500 truncate">
                    {profile?.email || user?.email}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {/* Email verified badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        profile?.emailVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {profile?.emailVerified ? (
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {profile?.emailVerified
                        ? "Email verified"
                        : "Email pending"}
                    </span>

                    {/* KYC level badge */}
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                      KYC Level {profile?.kycLevel ?? 0}
                    </span>

                    {/* Country badge */}
                    {profile?.country && (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {COUNTRY_NAMES[profile.country] || profile.country}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit toggle */}
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Personal details */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-5">
                Personal Information
              </h3>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="First Name">
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
                    />
                  </Field>
                </div>

                <Field
                  label="Email Address"
                  hint="Contact support to change your email address."
                >
                  <input
                    value={profile?.email || ""}
                    disabled
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed"
                  />
                </Field>

                <Field label="Phone Number">
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="+234 123 456 7890"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Date of Birth">
                    <input
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      disabled={!editing}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
                    />
                  </Field>
                  <Field
                    label="Country"
                    hint="Country cannot be changed after registration."
                  >
                    <input
                      value={
                        COUNTRY_NAMES[profile?.country] ||
                        profile?.country ||
                        "—"
                      }
                      disabled
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-neutral-50 text-neutral-500 cursor-not-allowed"
                    />
                  </Field>
                </div>

                <Field label="Bio">
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    disabled={!editing}
                    rows={3}
                    placeholder="Tell us a little about yourself"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500 resize-none"
                  />
                </Field>

                <Field label="Location">
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-500"
                  />
                </Field>

                {editing && (
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Saving…
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="px-5 py-2.5 text-sm font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Read-only account details */}
            <div className="bg-white rounded-xl border border-neutral-200 p-6">
              <h3 className="text-base font-semibold text-neutral-900 mb-5">
                Account Details
              </h3>
              <dl className="space-y-3">
                {[
                  ["Account Status", profile?.accountStatus || "active"],
                  ["KYC Level", `Level ${profile?.kycLevel ?? 0}`],
                  ["Role", profile?.role || "user"],
                  [
                    "Member Since",
                    profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          },
                        )
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center text-sm py-1.5 border-b border-neutral-100 last:border-0"
                  >
                    <dt className="text-neutral-500">{label}</dt>
                    <dd className="font-medium text-neutral-800 capitalize">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Profile;
