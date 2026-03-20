/**
 * ApplicationsController
 *
 * Handles job application submissions and provides admin CRUD for applications.
 *
 * Appwrite collection used:
 *   APPWRITE_APPLICATIONS_COLLECTION_ID  — one document per job application
 *
 * Public endpoints:
 *   POST /api/v1/applications            — submit application
 *   GET  /api/v1/applications/:id        — get single application (with email verification)
 *
 * Admin endpoints (requires auth + admin role):
 *   GET    /api/v1/applications/admin/list     — list all applications
 *   GET    /api/v1/applications/:id            — get single application (admin view)
 *   PATCH  /api/v1/applications/:id/status     — update application status
 *   DELETE /api/v1/applications/:id            — delete application
 *   GET    /api/v1/roles/:roleId/applications  — get applications for specific role
 */

"use strict";

const { Client, Databases, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
} = require("../middleware/monitoring/errorHandler");

// ── Appwrite client ───────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const db = new Databases(_client);

const DB = () => config.database.appwrite.databaseId;
const COL = () => config.database.appwrite.applicationsCollectionId;

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_STATUSES = [
  "pending",
  "reviewing",
  "interviewed",
  "accepted",
  "rejected",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise an Appwrite document to the shape the frontend expects.
 */
function formatApplication(doc) {
  return {
    id: doc.$id,
    applicantName: doc.applicantName,
    applicantEmail: doc.applicantEmail,
    applicantPhone: doc.applicantPhone || null,
    roleId: doc.roleId,
    roleTitle: doc.roleTitle,
    coverLetter: doc.coverLetter,
    resumeText: doc.resumeText || null,
    linkedinProfile: doc.linkedinProfile || null,
    portfolioUrl: doc.portfolioUrl || null,
    status: doc.status,
    notes: doc.notes || null,
    appliedAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
}

/**
 * Format application for public view (removes admin-only fields)
 */
function formatPublicApplication(doc) {
  const app = formatApplication(doc);
  // Remove admin-only fields
  delete app.notes;
  return app;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (basic validation)
 */
function isValidPhone(phone) {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{8,20}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ── Public controllers ────────────────────────────────────────────────────────

/**
 * POST /api/v1/applications
 * Submit a job application. No authentication required.
 */
exports.submitApplication = async (req, res) => {
  const {
    applicantName,
    applicantEmail,
    applicantPhone,
    roleId,
    roleTitle,
    coverLetter,
    resumeText,
    linkedinProfile,
    portfolioUrl,
  } = req.body;

  const collectionId = COL();
  if (!collectionId) {
    throw new ValidationError("Applications system is currently unavailable");
  }

  // Validate required fields
  if (!applicantName?.trim()) {
    throw new ValidationError("Applicant name is required");
  }
  if (!applicantEmail?.trim()) {
    throw new ValidationError("Email address is required");
  }
  if (!roleId?.trim()) {
    throw new ValidationError("Role ID is required");
  }
  if (!roleTitle?.trim()) {
    throw new ValidationError("Role title is required");
  }
  if (!coverLetter?.trim()) {
    throw new ValidationError("Cover letter is required");
  }

  // Validate email format
  if (!isValidEmail(applicantEmail.trim())) {
    throw new ValidationError("Please provide a valid email address");
  }

  // Validate phone format
  if (!isValidPhone(applicantPhone)) {
    throw new ValidationError("Please provide a valid phone number");
  }

  // Validate URLs
  if (!isValidUrl(linkedinProfile)) {
    throw new ValidationError("Please provide a valid LinkedIn profile URL");
  }
  if (!isValidUrl(portfolioUrl)) {
    throw new ValidationError("Please provide a valid portfolio URL");
  }

  // Check for duplicate application (same email + roleId)
  try {
    const existingApp = await db.listDocuments(DB(), collectionId, [
      Query.equal("applicantEmail", applicantEmail.trim().toLowerCase()),
      Query.equal("roleId", roleId.trim()),
      Query.limit(1),
    ]);

    if (existingApp.documents.length > 0) {
      return res.status(400).json({
        success: false,
        error:
          "You have already applied for this role. You can only submit one application per role.",
      });
    }
  } catch (err) {
    logger.warn("Failed to check for duplicate application:", err.message);
  }

  // Create the application
  const applicationData = {
    applicantName: applicantName.trim(),
    applicantEmail: applicantEmail.trim().toLowerCase(),
    applicantPhone: applicantPhone?.trim() || null,
    roleId: roleId.trim(),
    roleTitle: roleTitle.trim(),
    coverLetter: coverLetter.trim(),
    resumeText: resumeText?.trim() || null,
    linkedinProfile: linkedinProfile?.trim() || null,
    portfolioUrl: portfolioUrl?.trim() || null,
    status: "pending",
    notes: null,
  };

  try {
    const doc = await db.createDocument(
      DB(),
      collectionId,
      ID.unique(),
      applicationData,
    );

    logger.info(
      `New application submitted: ${doc.$id} — ${applicantName} applied for ${roleTitle} (${roleId})`,
    );

    return res.status(201).json({
      success: true,
      data: { application: formatPublicApplication(doc) },
    });
  } catch (err) {
    logger.error("Failed to create application:", err.message);
    throw new ValidationError(
      "Failed to submit application. Please try again.",
    );
  }
};

/**
 * GET /api/v1/applications/:id
 * Get a single application. Public endpoint but requires email verification.
 * Query param 'email' must match the applicant email.
 */
exports.getApplication = async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Application not found");

  const doc = await db.getDocument(DB(), collectionId, id);

  // For public access, require email verification
  if (
    !req.user &&
    (!email || email.toLowerCase() !== doc.applicantEmail.toLowerCase())
  ) {
    throw new NotFoundError("Application not found");
  }

  // Return admin view for authenticated admin users, public view otherwise
  const application =
    req.user?.role === "admin" || req.user?.role === "super_admin"
      ? formatApplication(doc)
      : formatPublicApplication(doc);

  return res.success({ application });
};

// ── Admin controllers ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/applications/admin/list
 * List all applications with filtering. Admin only.
 * Query params: status, roleId, search, limit, offset
 */
exports.adminListApplications = async (req, res) => {
  const { status, roleId, search, limit = 50, offset = 0 } = req.query;
  const collectionId = COL();

  if (!collectionId) {
    return res.success({ applications: [], total: 0 });
  }

  const filters = [
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit), 100)),
    Query.offset(Number(offset)),
  ];

  if (status && VALID_STATUSES.includes(status)) {
    filters.push(Query.equal("status", status));
  }

  if (roleId) {
    filters.push(Query.equal("roleId", roleId));
  }

  if (search) {
    filters.push(Query.search("applicantName", search));
  }

  try {
    const result = await db.listDocuments(DB(), collectionId, filters);

    return res.success({
      applications: result.documents.map(formatApplication),
      total: result.total,
    });
  } catch (err) {
    logger.error("Failed to list applications:", err.message);
    throw new ValidationError("Failed to fetch applications");
  }
};

/**
 * PATCH /api/v1/applications/:id/status
 * Update application status. Admin only.
 */
exports.updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Application not found");

  if (!status || !VALID_STATUSES.includes(status)) {
    throw new ValidationError(
      `Status must be one of: ${VALID_STATUSES.join(", ")}`,
    );
  }

  // Verify the document exists
  await db.getDocument(DB(), collectionId, id);

  const updates = { status };
  if (notes !== undefined) updates.notes = notes?.trim() || null;

  const updated = await db.updateDocument(DB(), collectionId, id, updates);

  logger.info(
    `Admin ${req.user?.userId} updated application ${id} status to: ${status}`,
  );

  return res.success({ application: formatApplication(updated) });
};

/**
 * DELETE /api/v1/applications/:id
 * Delete an application. Admin only.
 */
exports.deleteApplication = async (req, res) => {
  const { id } = req.params;
  const collectionId = COL();

  if (!collectionId) throw new NotFoundError("Application not found");

  // Verify it exists before deleting
  await db.getDocument(DB(), collectionId, id);
  await db.deleteDocument(DB(), collectionId, id);

  logger.info(`Admin ${req.user?.userId} deleted application: ${id}`);

  return res.success({ message: "Application deleted successfully" });
};

/**
 * GET /api/v1/roles/:roleId/applications
 * Get all applications for a specific role. Admin only.
 */
exports.getApplicationsForRole = async (req, res) => {
  const { roleId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  const collectionId = COL();

  if (!collectionId) {
    return res.success({ applications: [], total: 0 });
  }

  const filters = [
    Query.equal("roleId", roleId),
    Query.orderDesc("$createdAt"),
    Query.limit(Math.min(Number(limit), 100)),
    Query.offset(Number(offset)),
  ];

  try {
    const result = await db.listDocuments(DB(), collectionId, filters);

    return res.success({
      applications: result.documents.map(formatApplication),
      total: result.total,
      roleId,
    });
  } catch (err) {
    logger.error(
      `Failed to fetch applications for role ${roleId}:`,
      err.message,
    );
    throw new ValidationError("Failed to fetch role applications");
  }
};
