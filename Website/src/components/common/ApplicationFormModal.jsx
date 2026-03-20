/**
 * ApplicationFormModal - Job Application Form
 *
 * Modal component for submitting job applications
 */
import React, { useState } from "react";
import { Button, FormField, Input, Card, CardContent } from "../index";
import { Icon } from "../common/Icons";
import api from "../../services/api";

const ApplicationFormModal = ({ isOpen, onClose, role }) => {
  const [formData, setFormData] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    coverLetter: "",
    resumeText: "",
    linkedinProfile: "",
    portfolioUrl: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Don't render if modal is closed or no role is provided
  if (!isOpen || !role) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.applicantName.trim()) {
      newErrors.applicantName = "Name is required";
    } else if (formData.applicantName.trim().length < 2) {
      newErrors.applicantName = "Name must be at least 2 characters";
    }

    if (!formData.applicantEmail.trim()) {
      newErrors.applicantEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail)) {
      newErrors.applicantEmail = "Please enter a valid email address";
    }

    if (!formData.coverLetter.trim()) {
      newErrors.coverLetter = "Cover letter is required";
    } else if (formData.coverLetter.trim().length < 50) {
      newErrors.coverLetter = "Cover letter must be at least 50 characters";
    } else if (formData.coverLetter.trim().length > 5000) {
      newErrors.coverLetter = "Cover letter must not exceed 5000 characters";
    }

    // Optional field validations
    if (
      formData.applicantPhone &&
      !/^[\+]?[\d\s\-\(\)]{8,20}$/.test(formData.applicantPhone)
    ) {
      newErrors.applicantPhone = "Please enter a valid phone number";
    }

    if (formData.linkedinProfile) {
      try {
        new URL(formData.linkedinProfile);
      } catch {
        newErrors.linkedinProfile = "Please enter a valid LinkedIn URL";
      }
    }

    if (formData.portfolioUrl) {
      try {
        new URL(formData.portfolioUrl);
      } catch {
        newErrors.portfolioUrl = "Please enter a valid portfolio URL";
      }
    }

    if (formData.resumeText && formData.resumeText.length > 10000) {
      newErrors.resumeText = "Resume text must not exceed 10000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const applicationData = {
        ...formData,
        roleId: role.id,
        roleTitle: role.title,
      };

      await api.post("/applications", applicationData);

      setSubmitSuccess(true);
      // Auto close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        "Failed to submit application. Please try again.";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      applicantName: "",
      applicantEmail: "",
      applicantPhone: "",
      coverLetter: "",
      resumeText: "",
      linkedinProfile: "",
      portfolioUrl: "",
    });
    setErrors({});
    setIsSubmitting(false);
    setSubmitSuccess(false);
    onClose();
  };

  // Success view
  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md bg-white">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-success-100 text-success-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="checkCircle" className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">
              Application Submitted!
            </h3>
            <p className="text-neutral-600 mb-6">
              Thank you for applying to{" "}
              <span className="font-semibold">{role.title}</span>. We'll review
              your application and get back to you soon.
            </p>
            <Button
              onClick={handleClose}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-1">
                Apply for Position
              </h2>
              <p className="text-neutral-600">
                {role.title} • {role.department} • {role.location}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-neutral-400 hover:text-neutral-600 p-1"
              aria-label="Close modal"
            >
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Icon name="users" className="w-5 h-5" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Full Name"
                  required
                  error={errors.applicantName}
                >
                  <Input
                    value={formData.applicantName}
                    onChange={(e) =>
                      handleInputChange("applicantName", e.target.value)
                    }
                    placeholder="Your full name"
                    error={!!errors.applicantName}
                  />
                </FormField>

                <FormField
                  label="Email Address"
                  required
                  error={errors.applicantEmail}
                >
                  <Input
                    type="email"
                    value={formData.applicantEmail}
                    onChange={(e) =>
                      handleInputChange("applicantEmail", e.target.value)
                    }
                    placeholder="your.email@example.com"
                    error={!!errors.applicantEmail}
                  />
                </FormField>
              </div>

              <FormField
                label="Phone Number"
                error={errors.applicantPhone}
                helpText="Optional - Include country code if international"
              >
                <Input
                  type="tel"
                  value={formData.applicantPhone}
                  onChange={(e) =>
                    handleInputChange("applicantPhone", e.target.value)
                  }
                  placeholder="+211 123 456 789"
                  error={!!errors.applicantPhone}
                />
              </FormField>
            </div>

            {/* Application Details */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Icon name="briefcase" className="w-5 h-5" />
                Application Details
              </h3>

              <FormField
                label="Cover Letter"
                required
                error={errors.coverLetter}
                helpText={`Tell us why you're interested in this role and what makes you a great fit. ${formData.coverLetter.length}/5000 characters`}
              >
                <textarea
                  value={formData.coverLetter}
                  onChange={(e) =>
                    handleInputChange("coverLetter", e.target.value)
                  }
                  placeholder="Dear AfraPay team,&#10;&#10;I am excited to apply for the position of..."
                  rows={8}
                  maxLength={5000}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm resize-none
                    text-base transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    hover:border-gray-400 placeholder:text-gray-400
                    ${
                      errors.coverLetter
                        ? "border-red-400 bg-red-50 text-red-900"
                        : "border-gray-300 bg-white text-gray-900"
                    }`}
                />
              </FormField>

              <FormField
                label="Resume/CV"
                error={errors.resumeText}
                helpText={`Optional - Paste your resume text here if you don't have a file to upload. ${formData.resumeText.length}/10000 characters`}
              >
                <textarea
                  value={formData.resumeText}
                  onChange={(e) =>
                    handleInputChange("resumeText", e.target.value)
                  }
                  placeholder="EXPERIENCE&#10;Senior Developer at TechCorp (2020-2023)&#10;- Built scalable web applications...&#10;&#10;EDUCATION&#10;Bachelor of Computer Science..."
                  rows={6}
                  maxLength={10000}
                  className={`w-full px-4 py-3 border rounded-lg shadow-sm resize-none
                    text-base transition-all duration-200 ease-in-out
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    hover:border-gray-400 placeholder:text-gray-400
                    ${
                      errors.resumeText
                        ? "border-red-400 bg-red-50 text-red-900"
                        : "border-gray-300 bg-white text-gray-900"
                    }`}
                />
              </FormField>
            </div>

            {/* Optional Links */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Icon name="globe" className="w-5 h-5" />
                Professional Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="LinkedIn Profile"
                  error={errors.linkedinProfile}
                  helpText="Optional - Your LinkedIn profile URL"
                >
                  <Input
                    type="url"
                    value={formData.linkedinProfile}
                    onChange={(e) =>
                      handleInputChange("linkedinProfile", e.target.value)
                    }
                    placeholder="https://linkedin.com/in/yourname"
                    error={!!errors.linkedinProfile}
                  />
                </FormField>

                <FormField
                  label="Portfolio URL"
                  error={errors.portfolioUrl}
                  helpText="Optional - Your website, GitHub, or portfolio"
                >
                  <Input
                    type="url"
                    value={formData.portfolioUrl}
                    onChange={(e) =>
                      handleInputChange("portfolioUrl", e.target.value)
                    }
                    placeholder="https://yourportfolio.com"
                    error={!!errors.portfolioUrl}
                  />
                </FormField>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {errors.submit}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="clock" className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationFormModal;
