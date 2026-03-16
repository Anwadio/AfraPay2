import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Register = () => {
  const router = useRouter();
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    const newErrors = {};

    if (step === 1) {
      if (!formData.firstName) newErrors.firstName = "First name is required";
      if (!formData.lastName) newErrors.lastName = "Last name is required";
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email is invalid";
      }
      if (!formData.phone) newErrors.phone = "Phone number is required";
      if (!formData.country) newErrors.country = "Country is required";
    } else if (step === 2) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (!formData.termsAccepted) {
        newErrors.termsAccepted = "You must accept the terms and conditions";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) {
        setCurrentStep(2);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      return;
    }

    setLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 3000));

      Alert.alert(
        "Registration Successful!",
        "Welcome to AfraPay! Please check your email to verify your account.",
        [
          {
            text: "OK",
            onPress: () => router.push("/auth/login"),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>Tell us a bit about yourself</Text>

      <View style={styles.inputRow}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>First Name *</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            placeholder="First name"
            placeholderTextColor="#9ca3af"
            value={formData.firstName}
            onChangeText={(text) => handleChange("firstName", text)}
            autoCapitalize="words"
          />
          {errors.firstName && (
            <Text style={styles.errorText}>{errors.firstName}</Text>
          )}
        </View>

        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Last Name *</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            placeholder="Last name"
            placeholderTextColor="#9ca3af"
            value={formData.lastName}
            onChangeText={(text) => handleChange("lastName", text)}
            autoCapitalize="words"
          />
          {errors.lastName && (
            <Text style={styles.errorText}>{errors.lastName}</Text>
          )}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Enter your email"
          placeholderTextColor="#9ca3af"
          value={formData.email}
          onChangeText={(text) => handleChange("email", text)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={[styles.input, errors.phone && styles.inputError]}
          placeholder="Enter your phone number"
          placeholderTextColor="#9ca3af"
          value={formData.phone}
          onChangeText={(text) => handleChange("phone", text)}
          keyboardType="phone-pad"
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country *</Text>
        <TextInput
          style={[styles.input, errors.country && styles.inputError]}
          placeholder="Select your country"
          placeholderTextColor="#9ca3af"
          value={formData.country}
          onChangeText={(text) => handleChange("country", text)}
          autoCapitalize="words"
        />
        {errors.country && (
          <Text style={styles.errorText}>{errors.country}</Text>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Account Security</Text>
      <Text style={styles.stepDescription}>Create a secure password</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.password && styles.inputError]}
            placeholder="Create password"
            placeholderTextColor="#9ca3af"
            value={formData.password}
            onChangeText={(text) => handleChange("password", text)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Confirm Password *</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.passwordInput,
              errors.confirmPassword && styles.inputError,
            ]}
            placeholder="Confirm password"
            placeholderTextColor="#9ca3af"
            value={formData.confirmPassword}
            onChangeText={(text) => handleChange("confirmPassword", text)}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Text style={styles.eyeIcon}>
              {showConfirmPassword ? "🙈" : "👁️"}
            </Text>
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && (
          <Text style={styles.errorText}>{errors.confirmPassword}</Text>
        )}
      </View>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleChange("termsAccepted", !formData.termsAccepted)}
        >
          <View
            style={[
              styles.checkbox,
              formData.termsAccepted && styles.checkboxChecked,
            ]}
          >
            {formData.termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the Terms of Service and Privacy Policy *
          </Text>
        </TouchableOpacity>
        {errors.termsAccepted && (
          <Text style={styles.errorText}>{errors.termsAccepted}</Text>
        )}
      </View>

      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() =>
            handleChange("marketingAccepted", !formData.marketingAccepted)
          }
        >
          <View
            style={[
              styles.checkbox,
              formData.marketingAccepted && styles.checkboxChecked,
            ]}
          >
            {formData.marketingAccepted && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={styles.checkboxText}>
            I'd like to receive marketing updates and promotions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join thousands of users across Africa
              </Text>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressStep,
                    currentStep >= 1 && styles.progressStepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressStepText,
                      currentStep >= 1 && styles.progressStepTextActive,
                    ]}
                  >
                    1
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressLine,
                    currentStep >= 2 && styles.progressLineActive,
                  ]}
                />
                <View
                  style={[
                    styles.progressStep,
                    currentStep >= 2 && styles.progressStepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressStepText,
                      currentStep >= 2 && styles.progressStepTextActive,
                    ]}
                  >
                    2
                  </Text>
                </View>
              </View>
            </View>

            {/* Form Steps */}
            {currentStep === 1 ? renderStep1() : renderStep2()}

            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              {currentStep > 1 && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  loading && styles.nextButtonDisabled,
                  currentStep === 1 && styles.nextButtonFull,
                ]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>
                  {loading
                    ? "Creating Account..."
                    : currentStep === 1
                      ? "Next"
                      : "Create Account"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/login")}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  progressStepActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#6b7280",
  },
  progressStepTextActive: {
    color: "#ffffff",
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#3b82f6",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#ffffff",
    minHeight: 44,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#ffffff",
    minHeight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  eyeIcon: {
    fontSize: 18,
  },
  checkboxGroup: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 3,
    marginRight: 12,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  checkmark: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
    marginBottom: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  backButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 2,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  nextButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 14,
    color: "#6b7280",
  },
  signInLink: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
});

export default Register;
