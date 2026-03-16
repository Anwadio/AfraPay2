/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, FormField } from "../../components";
import { validateForm, passwordResetSchema } from "../../utils/authValidation";
import { AuthSecurity, DeviceFingerprint } from "../../utils/authSecurity";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
  });
  const [errors, setErrors] = useState({});
  const [csrfToken, setCsrfToken] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [resetRequested, setResetRequested] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const emailInputRef = useRef(null);

  // Initialize security measures
  useEffect(() => {
    const initSecurity = async () => {
      // Generate CSRF token
      const token = AuthSecurity.generateCSRFToken();
      setCsrfToken(token);

      // Generate device fingerprint
      const fingerprint = await DeviceFingerprint.generate();
      setDeviceFingerprint(fingerprint);

      // Check for suspicious activity
      const suspiciousActivity = DeviceFingerprint.detectSuspiciousActivity();
      if (suspiciousActivity.suspicious) {
        // Log suspicious activity for security monitoring
        // This would typically be sent to a logging service in production
      }
    };

    initSecurity();

    // Focus email input for accessibility
    if (emailInputRef.current && !resetRequested) {
      emailInputRef.current.focus();
    }
  }, [resetRequested]);

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
    const validation = validateForm(passwordResetSchema, formData);

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

    // Check rate limiting for password reset requests
    const rateLimitCheck = AuthSecurity.checkRateLimit(
      `reset_${formData.email}`,
    );
    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetTime;
      const timeLeft = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
      toast.error(
        `Too many reset attempts. Please try again in ${timeLeft} minutes.`,
      );
      setRateLimitInfo(rateLimitCheck);
      return;
    }

    if (!validateFormData()) {
      return;
    }

    setLoading(true);

    try {
      await authAPI.forgotPassword(formData.email);

      // Always show success message (security best practice)
      setResetRequested(true);

      // Announce success to screen readers
      const successAnnouncement = document.createElement("div");
      successAnnouncement.setAttribute("aria-live", "polite");
      successAnnouncement.textContent =
        "Password reset instructions have been sent to your email if the account exists.";
      successAnnouncement.className = "sr-only";
      document.body.appendChild(successAnnouncement);

      setTimeout(() => {
        document.body.removeChild(successAnnouncement);
      }, 3000);
    } catch (error) {
      // Record failed attempt
      AuthSecurity.recordFailedAttempt(`reset_${formData.email}`);

      // Show the specific error from the backend (user not found, OAuth account, etc.)
      const message =
        error.response?.data?.error?.message ||
        "Unable to process your request. Please try again.";
      toast.error(message);

      // Focus back to email field for retry
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/auth/login");
  };

  if (resetRequested) {
    return (
      <div className="space-y-6">
        {/* Success State */}
        <div className="text-center">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Check your email
          </h1>
          <p className="text-sm text-neutral-600 mt-2 max-w-md mx-auto">
            If an account with{" "}
            <strong className="text-neutral-900">{formData.email}</strong>{" "}
            exists, we've sent password reset instructions to your email
            address.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-primary-800 mb-2">
            What happens next?
          </h3>
          <ul className="text-sm text-primary-700 space-y-1 list-disc list-inside">
            <li>Check your email inbox and spam folder</li>
            <li>Click the secure reset link in the email</li>
            <li>Create a new strong password</li>
            <li>Sign in with your new password</li>
          </ul>
        </div>

        {/* Security Notice */}
        <div className="bg-gradient-to-r from-primary-50 to-secondary-50/50 border border-primary-100 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-neutral-500 mr-2 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-neutral-900">
                Security Notice
              </h4>
              <p className="text-sm text-neutral-600 mt-1">
                The reset link will expire in 15 minutes for security reasons.
                If you don't receive the email, you can request another reset.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={() => setResetRequested(false)}
          >
            Send Another Email
          </Button>
          <Button
            size="lg"
            className="flex-1 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={handleBackToLogin}
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
        <h1 className="text-2xl font-bold text-neutral-900">
          Reset your password
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      {/* Rate limiting warning */}
      {rateLimitInfo && !rateLimitInfo.allowed && (
        <div
          className="bg-error-50 border border-error-200 rounded-lg p-4"
          role="alert"
        >
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-error-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <h3 className="text-sm font-medium text-error-800">
              Too many reset attempts
            </h3>
          </div>
          <div className="mt-2 text-sm text-error-700">
            For security reasons, password reset requests have been temporarily
            limited. Please try again at{" "}
            {rateLimitInfo.resetTime?.toLocaleTimeString()}.
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Hidden CSRF token */}
        <input type="hidden" name="csrfToken" value={csrfToken} />

        <FormField
          label="Email Address"
          error={errors.email}
          required
          id="email-field"
        >
          <Input
            ref={emailInputRef}
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            error={!!errors.email}
            disabled={loading}
            autoComplete="email"
            aria-describedby={errors.email ? "email-error" : "email-help"}
            aria-invalid={!!errors.email}
          />
          {!errors.email && (
            <p id="email-help" className="text-xs text-neutral-500 mt-1">
              We'll send password reset instructions to this email address
            </p>
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          className="w-full focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          loading={loading}
          disabled={loading || (rateLimitInfo && !rateLimitInfo.allowed)}
          aria-describedby="submit-description"
        >
          {loading ? (
            <>
              <span className="sr-only">
                Sending reset instructions, please wait
              </span>
              Sending Reset Link...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
        <div id="submit-description" className="sr-only">
          Submit the form to receive password reset instructions via email
        </div>
      </form>

      {/* Security Notice */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-neutral-500 mr-2 mt-0.5 flex-shrink-0"
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
            <h4 className="text-sm font-medium text-neutral-900">
              Security Information
            </h4>
            <p className="text-sm text-neutral-600 mt-1">
              For your security, we'll only send reset instructions if an
              account exists with this email address. The reset link will expire
              in 15 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Back to login */}
      <div className="text-center">
        <Link
          to="/auth/login"
          className="text-sm text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded inline-flex items-center"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
