/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Input, FormField, Select } from "../../components";
import SEOHead from "../../components/seo/SEOHead";
import {
  validateForm,
  registrationSchema,
  checkPasswordStrength,
  nameSchema,
  emailSchema,
  phoneSchema,
  dateOfBirthSchema,
} from "../../utils/authValidation";
import { z } from "zod";
import { AuthSecurity, DeviceFingerprint } from "../../utils/authSecurity";
import { authAPI } from "../../services/api";
import toast from "react-hot-toast";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal info
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    country: "",

    // Account info
    password: "",
    confirmPassword: "",

    // Agreements
    termsAccepted: false,
    marketingAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [csrfToken, setCsrfToken] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const firstNameInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Initialize security measures
  useEffect(() => {
    const initSecurity = async () => {
      try {
        // Generate CSRF token
        const token = AuthSecurity.generateCSRFToken();
        setCsrfToken(token);

        // Generate device fingerprint
        const fingerprint = await DeviceFingerprint.generate();
        setDeviceFingerprint(fingerprint);

        // Check for suspicious activity
        const suspiciousActivity = DeviceFingerprint.detectSuspiciousActivity();
        if (suspiciousActivity.suspicious) {
          console.warn(
            "Suspicious activity detected:",
            suspiciousActivity.indicators,
          );
        }
      } catch (securityError) {
        console.error("Security initialization error:", securityError);
      }
    };

    initSecurity();

    // Focus appropriate input for accessibility
    if (currentStep === 1 && firstNameInputRef.current) {
      firstNameInputRef.current.focus();
    } else if (currentStep === 2 && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [currentStep]);

  // Update password strength indicator
  useEffect(() => {
    if (formData.password) {
      const strength = checkPasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  const countries = [
    { label: "Nigeria", value: "NG" },
    { label: "Ghana", value: "GH" },
    { label: "Kenya", value: "KE" },
    { label: "South Africa", value: "ZA" },
    { label: "Uganda", value: "UG" },
    { label: "Tanzania", value: "TZ" },
    { label: "Rwanda", value: "RW" },
    { label: "Senegal", value: "SN" },
    { label: "Ivory Coast", value: "CI" },
    { label: "Cameroon", value: "CM" },
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const sanitizedValue =
      type === "checkbox" ? checked : AuthSecurity.sanitizeInput(value);

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : sanitizedValue,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateStep = (step) => {
    try {
      // Extract fields for the current step
      const stepData =
        step === 1
          ? {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              dateOfBirth: formData.dateOfBirth,
              country: formData.country,
            }
          : {
              ...formData,
            };

      console.log("Validating step:", step, "with data:", stepData);

      // Create step-specific schema
      let stepSchema;
      if (step === 1) {
        // Create step 1 schema manually
        console.log("Creating step 1 schema with imported schemas:", {
          nameSchema: !!nameSchema,
          emailSchema: !!emailSchema,
          phoneSchema: !!phoneSchema,
          dateOfBirthSchema: !!dateOfBirthSchema,
        });

        try {
          stepSchema = z.object({
            firstName: nameSchema,
            lastName: nameSchema,
            email: emailSchema,
            phone: phoneSchema,
            dateOfBirth: dateOfBirthSchema,
            country: z.string().min(1, "Please select your country"),
          });
          console.log("Step 1 schema created successfully");
        } catch (schemaError) {
          console.error("Error creating step 1 schema:", schemaError);
          // Fallback to basic validation
          stepSchema = z.object({
            firstName: z
              .string()
              .min(1, "First name is required")
              .min(2, "First name must be at least 2 characters")
              .max(50, "First name is too long"),
            lastName: z
              .string()
              .min(1, "Last name is required")
              .min(2, "Last name must be at least 2 characters")
              .max(50, "Last name is too long"),
            email: z
              .string()
              .min(1, "Email is required")
              .email("Please enter a valid email address")
              .toLowerCase(),
            phone: z
              .string()
              .min(1, "Phone number is required")
              .regex(
                /^\+?[\d\s\-()]{7,17}$/,
                "Please enter a valid phone number",
              ),
            dateOfBirth: z
              .string()
              .min(1, "Date of birth is required")
              .refine((date) => {
                const birthDate = new Date(date);
                const today = new Date();
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (
                  monthDiff < 0 ||
                  (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ) {
                  return age - 1 >= 18;
                }
                return age >= 18;
              }, "You must be at least 18 years old"),
            country: z.string().min(1, "Please select your country"),
          });
        }
      } else {
        stepSchema = registrationSchema;
      }

      // Use direct Zod validation instead of validateForm utility
      console.log("About to call direct Zod validation with schema and data");
      let validation;
      try {
        const validatedData = stepSchema.parse(stepData);
        validation = { success: true, errors: {}, data: validatedData };
        console.log("Direct Zod validation passed successfully");
      } catch (zodError) {
        console.error("Direct Zod validation error:", zodError);
        if (zodError.errors) {
          const errors = {};
          zodError.errors.forEach((err) => {
            const path = err.path.join(".");
            errors[path] = err.message;
            console.log("Validation error for", path + ":", err.message);
          });
          validation = { success: false, errors, data: null };
        } else {
          console.error("Non-Zod error in validation:", zodError.message);
          validation = {
            success: false,
            errors: { general: zodError.message || "Validation failed" },
            data: null,
          };
        }
      }

      console.log("Validation result:", validation);
      console.log("All validation errors:", validation.errors);

      if (!validation.success) {
        // Since we're using step-specific schema, all errors are relevant
        const stepErrors = validation.errors;
        setErrors(stepErrors);

        // Show validation errors to user
        const errorMessages = Object.values(stepErrors).join(". ");
        if (errorMessages) {
          toast.error(`Please fix the following errors: ${errorMessages}`);

          // Announce validation errors to screen readers
          const announcement = document.createElement("div");
          announcement.setAttribute("aria-live", "polite");
          announcement.setAttribute("aria-atomic", "true");
          announcement.textContent = `Form validation failed: ${errorMessages}`;
          announcement.className = "sr-only";
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 3000);
        }

        console.log("Validation failed with errors:", stepErrors);
        return false;
      }

      console.log("Validation passed for step:", step);
      return true;
    } catch (error) {
      console.error("Error in validateStep:", error);
      toast.error("An error occurred during validation. Please try again.");
      return false;
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

  const handleNext = () => {
    console.log("handleNext called for step:", currentStep);
    console.log("Current form data:", formData);

    // Basic validation check before calling validateStep
    if (currentStep === 1) {
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "dateOfBirth",
        "country",
      ];
      const missingFields = requiredFields.filter(
        (field) => !formData[field] || formData[field].trim() === "",
      );

      if (missingFields.length > 0) {
        toast.error(
          `Please fill in all required fields: ${missingFields.join(", ")}`,
        );
        return;
      }
    }

    try {
      if (validateStep(currentStep)) {
        console.log("Moving to next step:", currentStep + 1);
        setCurrentStep(currentStep + 1);
      } else {
        console.log("Validation failed, staying on step:", currentStep);
      }
    } catch (error) {
      console.error("Error in handleNext:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(2)) {
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

      // Prepare registration data
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        country: formData.country,
        password: formData.password,
        termsAccepted: formData.termsAccepted,
        marketingAccepted: formData.marketingAccepted,
      };

      // Make API call to backend
      const response = await authAPI.register(registrationData);

      if (response.success) {
        setRegistered(true);

        // Announce success to screen readers
        const successAnnouncement = document.createElement("div");
        successAnnouncement.setAttribute("aria-live", "polite");
        successAnnouncement.textContent =
          "Account successfully created. Redirecting to sign in page.";
        successAnnouncement.className = "sr-only";
        document.body.appendChild(successAnnouncement);

        setTimeout(() => {
          navigate("/auth/login", {
            state: {
              message: `A verification email has been sent to ${formData.email}. Please verify your email before signing in.`,
            },
          });
          document.body.removeChild(successAnnouncement);
        }, 2000);
      } else {
        toast.error(
          response.error?.message || "Registration failed. Please try again.",
        );
      }
    } catch (error) {
      console.error("Registration error:", error);

      // Handle validation errors
      if (
        error.response?.status === 400 &&
        error.response.data?.error?.details
      ) {
        const details = error.response.data.error.details;
        details.forEach((detail) => {
          toast.error(detail.message);
        });
      } else if (error.response?.status === 409) {
        toast.error("An account with this email already exists.");
      } else {
        const message =
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          (error.response
            ? "Registration failed. Please try again."
            : "Unable to connect to server. Please try again.");
        toast.error(message);
      }

      // Focus back to password field for retry
      if (passwordInputRef.current) {
        passwordInputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SEOHead
        title="Create Account"
        description="Create your AfraPay account and start sending money across Africa."
        noIndex={true}
      />
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          Create your account
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Join millions using AfraPay for secure payments
        </p>
      </div>

      {/* Registration success — verification email sent */}
      {registered && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-semibold">Account created successfully!</p>
            <p className="mt-0.5">
              A verification email has been sent to{" "}
              <strong>{formData.email}</strong>. Please check your inbox and
              click the link to verify your account before signing in.
            </p>
            <p className="mt-1 text-green-700">Redirecting to sign in…</p>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div
          className={`flex items-center ${currentStep >= 1 ? "text-primary-600" : "text-neutral-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              currentStep >= 1
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-primary-200 text-primary-300"
            }`}
          >
            1
          </div>
          <span className="ml-2 text-sm font-medium">Personal Info</span>
        </div>
        <div
          className={`w-8 h-px ${currentStep >= 2 ? "bg-primary-600" : "bg-primary-200"}`}
        />
        <div
          className={`flex items-center ${currentStep >= 2 ? "text-primary-600" : "text-neutral-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
              currentStep >= 2
                ? "border-primary-600 bg-primary-600 text-white"
                : "border-primary-200 text-primary-300"
            }`}
          >
            2
          </div>
          <span className="ml-2 text-sm font-medium">Account Setup</span>
        </div>
      </div>

      {/* Step 1: Personal Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" error={errors.firstName} required>
              <Input
                ref={firstNameInputRef}
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter first name"
                error={!!errors.firstName}
                disabled={loading}
              />
            </FormField>

            <FormField label="Last Name" error={errors.lastName} required>
              <Input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter last name"
                error={!!errors.lastName}
                disabled={loading}
              />
            </FormField>
          </div>

          <FormField label="Email Address" error={errors.email} required>
            <Input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              error={!!errors.email}
              disabled={loading}
            />
          </FormField>

          <FormField label="Phone Number" error={errors.phone} required>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 123 456 7890"
              error={!!errors.phone}
              disabled={loading}
            />
          </FormField>

          <FormField label="Date of Birth" error={errors.dateOfBirth} required>
            <Input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              error={!!errors.dateOfBirth}
              disabled={loading}
            />
          </FormField>

          <FormField label="Country" error={errors.country} required>
            <Select
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Select your country"
              error={!!errors.country}
              disabled={loading}
            >
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </Select>
          </FormField>

          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => {
              console.log("Continue button clicked!");
              handleNext();
            }}
            disabled={loading}
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Account Setup */}
      {currentStep === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Password"
            error={errors.password}
            required
            helpText="Must be at least 8 characters with uppercase, lowercase, and number"
          >
            <Input
              ref={passwordInputRef}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              error={!!errors.password}
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Confirm Password"
            error={errors.confirmPassword}
            required
          >
            <Input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              error={!!errors.confirmPassword}
              disabled={loading}
            />
          </FormField>

          <div className="space-y-3">
            <FormField error={errors.termsAccepted}>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mt-1"
                />
                <span className="ml-3 text-sm text-neutral-600">
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-primary-600 hover:text-primary-500"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-primary-600 hover:text-primary-500"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </FormField>

            <label className="flex items-start">
              <input
                type="checkbox"
                name="marketingAccepted"
                checked={formData.marketingAccepted}
                onChange={handleChange}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 mt-1"
              />
              <span className="ml-3 text-sm text-neutral-600">
                I'd like to receive marketing communications about AfraPay
                products and services
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </div>
        </form>
      )}

      {/* Sign in link */}
      <div className="text-center">
        <p className="text-sm text-neutral-600">
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
