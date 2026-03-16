/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, FormField } from "../../components";
import {
  validateForm,
  passwordResetConfirmSchema,
  checkPasswordStrength,
} from "../../utils/authValidation";
import { AuthSecurity, DeviceFingerprint } from "../../utils/authSecurity";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";

const ResetPasswordConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    token: searchParams.get("token") || "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [csrfToken, setCsrfToken] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [tokenValid, setTokenValid] = useState(true);
  const passwordInputRef = useRef(null);

  // Initialize security measures and validate token
  useEffect(() => {
    const initSecurity = async () => {
      // Generate CSRF token
      const token = AuthSecurity.generateCSRFToken();
      setCsrfToken(token);

      // Generate device fingerprint
      const fingerprint = await DeviceFingerprint.generate();
      setDeviceFingerprint(fingerprint);

      // Validate reset token
      if (!formData.token || formData.token.length < 32) {
        setTokenValid(false);
        toast.error("Invalid or expired reset link.");
        return;
      }

      // Check for suspicious activity
      const suspiciousActivity = DeviceFingerprint.detectSuspiciousActivity();
      if (suspiciousActivity.suspicious) {
        // eslint-disable-next-line no-console
        console.warn(
          "Suspicious activity detected:",
          suspiciousActivity.indicators,
        );
      }
    };

    initSecurity();

    // Focus password input for accessibility
    if (passwordInputRef.current && tokenValid) {
      passwordInputRef.current.focus();
    }
  }, [formData.token, tokenValid]);

  // Update password strength indicator
  useEffect(() => {
    if (formData.password) {
      const strength = checkPasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = AuthSecurity.sanitizeInput(value);

    setFormData((prev) => ({
      ...prev,
      [name]: sanitizedValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateFormData = () => {
    const validation = validateForm(passwordResetConfirmSchema, formData);

    if (!validation.success) {
      setErrors(validation.errors);
      // Announce validation errors to screen readers
      const errorMessages = Object.values(validation.errors).join(". ");
      if (errorMessages) {
        const announcement = document.createElement("div");
        announcement.setAttribute("aria-live", "polite");
        announcement.setAttribute("aria-atomic", "true");
        announcement.textContent = `Form validation failed: ${errorMessages}`;
        announcement.className = "sr-only";
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 3000);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateFormData()) {
      return;
    }

    // Additional security checks
    if (passwordStrength && passwordStrength.strength < 3) {
      toast.error("Please choose a stronger password for better security.");
      return;
    }

    setLoading(true);

    try {
      // Check for compromised password
      const isCompromised = await AuthSecurity.checkPasswordCompromised(
        formData.password,
      );
      if (isCompromised) {
        toast.error(
          "This password has been found in data breaches. Please choose a different password.",
        );
        setLoading(false);
        return;
      }

      await authAPI.resetPassword(formData.token, formData.password);

      toast.success(
        "Password reset successful! You can now sign in with your new password.",
      );

      // Announce success to screen readers
      const successAnnouncement = document.createElement("div");
      successAnnouncement.setAttribute("aria-live", "polite");
      successAnnouncement.textContent =
        "Password successfully reset. Redirecting to sign in page.";
      successAnnouncement.className = "sr-only";
      document.body.appendChild(successAnnouncement);

      setTimeout(() => {
        navigate("/auth/login", {
          state: {
            message:
              "Password reset successful. Please sign in with your new password.",
          },
        });
        document.body.removeChild(successAnnouncement);
      }, 2000);
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        "Failed to reset password. The link may have expired.";
      toast.error(message);

      // Focus back to password field for retry
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const getStrengthColor = (strength) => {
    const colors = {
      0: "bg-error-500",
      1: "bg-error-400",
      2: "bg-warning-400",
      3: "bg-success-400",
      4: "bg-success-500",
    };
    return colors[strength] || "bg-neutral-300";
  };

  const getStrengthTextColor = (strength) => {
    const colors = {
      0: "text-error-600",
      1: "text-error-500",
      2: "text-warning-600",
      3: "text-success-600",
      4: "text-success-700",
    };
    return colors[strength] || "text-neutral-500";
  };

  if (!tokenValid) {
    return (
      <div className="space-y-6">
        {/* Invalid Token State */}
        <div className="text-center">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-error-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary-900">
            Invalid Reset Link
          </h1>
          <p className="text-sm text-primary-700 mt-2">
            This password reset link is invalid or has expired. Please request a
            new password reset.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={() => navigate("/auth/reset-password")}
          >
            Request New Reset Link
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={() => navigate("/auth/login")}
          >
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary-900">
          Set your new password
        </h1>
        <p className="text-sm text-primary-700 mt-1">
          Choose a strong password for your AfraPay account.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Hidden CSRF token and reset token */}
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="token" value={formData.token} />

        <FormField
          label="New Password"
          error={errors.password}
          required
          id="password-field"
        >
          <div className="relative">
            <Input
              ref={passwordInputRef}
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              error={!!errors.password}
              disabled={loading}
              autoComplete="new-password"
              aria-describedby={
                errors.password ? "password-error" : "password-requirements"
              }
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? (
                <svg
                  className="w-5 h-5 text-primary-300 hover:text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-primary-300 hover:text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Password strength indicator */}
          {passwordStrength && (
            <div className="mt-3" aria-live="polite">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-primary-800">
                  Password strength
                </span>
                <span
                  className={`text-xs font-medium ${getStrengthTextColor(passwordStrength.strength)}`}
                >
                  {passwordStrength.level}
                </span>
              </div>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${
                      index < passwordStrength.strength
                        ? getStrengthColor(passwordStrength.strength)
                        : "bg-primary-100"
                    }`}
                  />
                ))}
              </div>
              {passwordStrength.feedback.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-primary-700">Suggestions:</p>
                  <ul className="text-xs text-primary-600 mt-1 space-y-0.5">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-1 h-1 bg-primary-400 rounded-full mr-2 flex-shrink-0"></span>
                        {feedback}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!errors.password && !passwordStrength && (
            <p
              id="password-requirements"
              className="text-xs text-primary-600 mt-1"
            >
              Use 8+ characters with uppercase, lowercase, numbers, and symbols
            </p>
          )}
        </FormField>

        <FormField
          label="Confirm New Password"
          error={errors.confirmPassword}
          required
          id="confirm-password-field"
        >
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your new password"
              error={!!errors.confirmPassword}
              disabled={loading}
              autoComplete="new-password"
              aria-describedby={
                errors.confirmPassword
                  ? "confirm-password-error"
                  : "confirm-password-help"
              }
              aria-invalid={!!errors.confirmPassword}
            />
            <button
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label={
                showConfirmPassword
                  ? "Hide password confirmation"
                  : "Show password confirmation"
              }
              tabIndex={0}
            >
              {showConfirmPassword ? (
                <svg
                  className="w-5 h-5 text-primary-300 hover:text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-primary-300 hover:text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {!errors.confirmPassword && (
            <p
              id="confirm-password-help"
              className="text-xs text-primary-600 mt-1"
            >
              Re-enter your password to confirm
            </p>
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="w-full focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          loading={loading}
          disabled={loading}
          aria-describedby="submit-description"
        >
          {loading ? (
            <>
              <span className="sr-only">Updating password, please wait</span>
              Updating Password...
            </>
          ) : (
            "Update Password"
          )}
        </Button>
        <div id="submit-description" className="sr-only">
          Submit the form to update your password and complete the reset process
        </div>
      </form>

      {/* Security Notice */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-primary-600 mr-2 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-primary-800">
              Security Tips
            </h4>
            <ul className="text-sm text-primary-700 mt-1 space-y-1 list-disc list-inside">
              <li>Use a unique password you don't use anywhere else</li>
              <li>Include a mix of letters, numbers, and symbols</li>
              <li>Avoid using personal information in your password</li>
              <li>Consider using a password manager for added security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordConfirm;
