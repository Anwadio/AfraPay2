// Enhanced form validation utilities for authentication
import { z } from "zod";

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .max(254, "Email is too long")
  .toLowerCase();

/**
 * Password validation schema with security requirements
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character",
  );

/**
 * Phone validation schema
 */
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^\+?[\d\s\-()+]{7,17}$/, "Please enter a valid phone number");

/**
 * Name validation schema
 */
export const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name is too long")
  .regex(
    /^[a-zA-Z\s'-]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes",
  )
  .transform((name) => name.trim());

/**
 * Date of birth validation
 */
export const dateOfBirthSchema = z
  .string()
  .min(1, "Date of birth is required")
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age >= 18;
  }, "You must be at least 18 years old");

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

/**
 * Registration form validation schema
 */
export const registrationSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    dateOfBirth: dateOfBirthSchema,
    country: z.string().min(1, "Please select your country"),
    password: passwordSchema,
    confirmPassword: z.string(),
    termsAccepted: z
      .boolean()
      .refine(
        (val) => val === true,
        "You must accept the terms and conditions",
      ),
    marketingAccepted: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Password reset request schema
 */
export const passwordResetSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Validation helper function
 * @param {Object} schema - Zod schema
 * @param {Object} data - Data to validate
 * @returns {Object} - { success: boolean, errors: Object, data: Object }
 */
export const validateForm = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, errors: {}, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join(".");
        errors[path] = err.message;
      });
      return { success: false, errors, data: null };
    }
    return {
      success: false,
      errors: { general: "Validation failed" },
      data: null,
    };
  }
};

/**
 * Password strength checker
 * @param {string} password - Password to check
 * @returns {Object} - { strength: number (0-4), feedback: string[] }
 */
export const checkPasswordStrength = (password) => {
  let strength = 0;
  const feedback = [];

  if (password.length >= 8) strength++;
  else feedback.push("Add more characters");

  if (/[a-z]/.test(password)) strength++;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) strength++;
  else feedback.push("Add uppercase letters");

  if (/\d/.test(password)) strength++;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) strength++;
  else feedback.push("Add special characters");

  const strengthLevels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  return {
    strength,
    level: strengthLevels[Math.min(strength, 4)],
    feedback: feedback.length > 0 ? feedback : ["Great password!"],
  };
};
