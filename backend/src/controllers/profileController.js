/**
 * Profile Controller
 * Handles user profile management and settings
 */

const {
  Client,
  Users,
  Storage,
  Databases,
  ID,
  InputFile,
} = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
} = require("../middleware/monitoring/errorHandler");
const { appwrite: dbConn } = require("../database/connection");

// Lazily resolve shared instances at request time (after DB init)
const getDatabases = () => dbConn.getDatabases();
const getUsers = () => dbConn.getUsers();
// Storage still needs a dedicated client instance
const _storageClient = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);
const storage = new Storage(_storageClient);

class ProfileController {
  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const { user } = req;

      // Fetch Appwrite user for email-verified status
      const databases = getDatabases();
      const [userDetails, dbProfile] = await Promise.all([
        getUsers().get(user.id),
        databases
          .getDocument(
            config.database.appwrite.databaseId,
            config.database.appwrite.userCollectionId,
            user.id,
          )
          .catch(() => null),
      ]);

      const profile = {
        id: userDetails.$id,
        email: userDetails.email,
        name: userDetails.name,
        phone: userDetails.phone,
        // Priority: DB collection → user prefs (fallback store) → labels
        firstName:
          dbProfile?.firstName ||
          userDetails.prefs?.firstName ||
          userDetails.labels?.firstName,
        lastName:
          dbProfile?.lastName ||
          userDetails.prefs?.lastName ||
          userDetails.labels?.lastName,
        bio:
          dbProfile?.bio || userDetails.prefs?.bio || userDetails.labels?.bio,
        location:
          dbProfile?.location ||
          userDetails.prefs?.location ||
          userDetails.labels?.location,
        avatar:
          dbProfile?.avatar ||
          userDetails.prefs?.avatar ||
          userDetails.labels?.avatar,
        dateOfBirth:
          dbProfile?.dateOfBirth ||
          userDetails.prefs?.dateOfBirth ||
          userDetails.labels?.dateOfBirth,
        country:
          dbProfile?.country ||
          userDetails.prefs?.country ||
          userDetails.labels?.country,
        timezone:
          dbProfile?.timezone ||
          userDetails.prefs?.timezone ||
          userDetails.labels?.timezone,
        language:
          dbProfile?.language ||
          userDetails.prefs?.language ||
          userDetails.labels?.language ||
          "en",
        kycLevel: dbProfile ? parseInt(dbProfile.kycLevel ?? 0) : 0,
        accountStatus: dbProfile?.accountStatus || "active",
        role: dbProfile?.role || "user",
        emailVerified:
          dbProfile?.emailVerified ?? userDetails.emailVerification ?? false,
        phoneVerified: userDetails.phoneVerification,
        mfaEnabled:
          dbProfile?.mfaEnabled === true ||
          userDetails.labels?.mfaEnabled === "true",
        createdAt: userDetails.$createdAt,
        updatedAt: userDetails.$updatedAt,
        lastLogin: userDetails.labels?.lastLogin,
      };

      res.success(profile, "Profile retrieved successfully");
    } catch (error) {
      logger.error("Get profile failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const { user } = req;
      const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        bio,
        location,
        timezone,
        language,
      } = req.body;

      // Build update data for DB collection
      const dbUpdate = {};
      if (firstName !== undefined) dbUpdate.firstName = firstName;
      if (lastName !== undefined) dbUpdate.lastName = lastName;
      if (dateOfBirth !== undefined) dbUpdate.dateOfBirth = dateOfBirth;
      if (bio !== undefined) dbUpdate.bio = bio;
      if (location !== undefined) dbUpdate.location = location;
      if (timezone !== undefined) dbUpdate.timezone = timezone;
      if (language !== undefined) dbUpdate.language = language;

      // Update DB collection if there are changes
      if (Object.keys(dbUpdate).length > 0) {
        try {
          await getDatabases().updateDocument(
            config.database.appwrite.databaseId,
            config.database.appwrite.userCollectionId,
            user.id,
            dbUpdate,
          );
        } catch (_) {
          // DB document missing or schema doesn't include these fields.
          // Fall back to Appwrite user prefs (a free-form key-value store).
          // NOTE: updateLabels only accepts an array of short alphanumeric
          // tag strings and must NOT be used here for arbitrary field values.
          const currentUser = await getUsers().get(user.id);
          await getUsers().updatePrefs(user.id, {
            ...(currentUser.prefs || {}),
            ...dbUpdate,
          });
        }
      }

      // Update Appwrite user name if first or last name changed
      if (firstName !== undefined || lastName !== undefined) {
        const currentUser = await getUsers().get(user.id);
        const dbDoc = await getDatabases()
          .getDocument(
            config.database.appwrite.databaseId,
            config.database.appwrite.userCollectionId,
            user.id,
          )
          .catch(() => null);
        const currentFirstName =
          firstName ?? dbDoc?.firstName ?? currentUser.labels?.firstName ?? "";
        const currentLastName =
          lastName ?? dbDoc?.lastName ?? currentUser.labels?.lastName ?? "";
        const newName = `${currentFirstName} ${currentLastName}`.trim();
        if (newName) {
          await getUsers().updateName(user.id, newName);
        }
      }

      // Update Appwrite phone if provided
      if (phone !== undefined) {
        await getUsers().updatePhone(user.id, phone);
        await getDatabases()
          .updateDocument(
            config.database.appwrite.databaseId,
            config.database.appwrite.userCollectionId,
            user.id,
            { phone },
          )
          .catch(() => {});
      }

      logger.audit("PROFILE_UPDATED", user.id, {
        updatedFields: Object.keys(req.body),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.success(null, "Profile updated successfully");
    } catch (error) {
      logger.error("Update profile failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get contact information
   */
  async getContactInfo(req, res) {
    try {
      const { user } = req;
      const userDetails = await getUsers().get(user.id);

      const contactInfo = {
        email: userDetails.email,
        phone: userDetails.phone,
        address: {
          street: userDetails.labels?.address,
          city: userDetails.labels?.city,
          state: userDetails.labels?.state,
          postalCode: userDetails.labels?.postalCode,
          country: userDetails.labels?.country,
        },
        emergencyContact: userDetails.labels?.emergencyContact
          ? JSON.parse(userDetails.labels.emergencyContact)
          : null,
      };

      res.success(contactInfo, "Contact information retrieved successfully");
    } catch (error) {
      logger.error("Get contact info failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update contact information
   */
  async updateContactInfo(req, res) {
    try {
      const { user } = req;
      const { email, phone, address, emergencyContact } = req.body;

      const updateLabels = {};

      if (address) {
        if (address.street !== undefined) updateLabels.address = address.street;
        if (address.city !== undefined) updateLabels.city = address.city;
        if (address.state !== undefined) updateLabels.state = address.state;
        if (address.postalCode !== undefined)
          updateLabels.postalCode = address.postalCode;
        if (address.country !== undefined)
          updateLabels.country = address.country;
      }

      if (emergencyContact !== undefined) {
        updateLabels.emergencyContact = JSON.stringify(emergencyContact);
      }

      // Update labels
      if (Object.keys(updateLabels).length > 0) {
        await getUsers().updateLabels(user.id, updateLabels);
      }

      // Update email if provided (requires verification)
      if (email && email !== user.email) {
        // TODO: Send email verification for new email
        await getUsers().updateEmail(user.id, email);
        updateLabels.emailVerified = "false";
      }

      // Update phone if provided (requires verification)
      if (phone) {
        await getUsers().updatePhone(user.id, phone);
        updateLabels.phoneVerified = "false";
      }

      logger.audit("CONTACT_INFO_UPDATED", user.id, {
        updatedFields: Object.keys({
          email,
          phone,
          address,
          emergencyContact,
        }).filter((key) => req.body[key] !== undefined),
        ip: req.ip,
      });

      res.success(null, "Contact information updated successfully");
    } catch (error) {
      logger.error("Update contact info failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(req, res) {
    try {
      const { user } = req;
      const userDetails = await getUsers().get(user.id);

      const securitySettings = {
        mfaEnabled: userDetails.labels?.mfaEnabled === "true",
        loginAlerts: userDetails.labels?.loginAlerts !== "false", // Default true
        transactionAlerts: userDetails.labels?.transactionAlerts !== "false", // Default true
        sessionTimeout: parseInt(userDetails.labels?.sessionTimeout || "3600"),
        trustedDevices: userDetails.labels?.trustedDevices
          ? JSON.parse(userDetails.labels.trustedDevices)
          : [],
        recentLogins: await this.getRecentLogins(user.id),
        activeSessions: await this.getActiveSessions(user.id),
      };

      res.success(securitySettings, "Security settings retrieved successfully");
    } catch (error) {
      logger.error("Get security settings failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(req, res) {
    try {
      const { user } = req;
      const { twoFactorAuth, loginAlerts, transactionAlerts, sessionTimeout } =
        req.body;

      const updateLabels = {};

      if (twoFactorAuth !== undefined) {
        updateLabels.mfaEnabled = twoFactorAuth ? "true" : "false";
      }

      if (loginAlerts !== undefined) {
        updateLabels.loginAlerts = loginAlerts ? "true" : "false";
      }

      if (transactionAlerts !== undefined) {
        updateLabels.transactionAlerts = transactionAlerts ? "true" : "false";
      }

      if (sessionTimeout !== undefined) {
        updateLabels.sessionTimeout = sessionTimeout.toString();
      }

      if (Object.keys(updateLabels).length > 0) {
        await getUsers().updateLabels(user.id, updateLabels);
      }

      logger.audit("SECURITY_SETTINGS_UPDATED", user.id, {
        updatedSettings: Object.keys(updateLabels),
        ip: req.ip,
      });

      res.success(null, "Security settings updated successfully");
    } catch (error) {
      logger.error("Update security settings failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(req, res) {
    try {
      const { user } = req;
      const userDetails = await getUsers().get(user.id);

      const privacySettings = userDetails.labels?.privacySettings
        ? JSON.parse(userDetails.labels.privacySettings)
        : {
            profileVisibility: "friends",
            showEmail: false,
            showPhone: false,
            allowMessaging: true,
            dataProcessing: true,
            marketingEmails: false,
            analyticsTracking: true,
          };

      res.success(privacySettings, "Privacy settings retrieved successfully");
    } catch (error) {
      logger.error("Get privacy settings failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(req, res) {
    try {
      const { user } = req;
      const privacySettings = req.body;

      // Get current settings
      const userDetails = await getUsers().get(user.id);
      const currentSettings = userDetails.labels?.privacySettings
        ? JSON.parse(userDetails.labels.privacySettings)
        : {};

      // Merge with new settings
      const updatedSettings = { ...currentSettings, ...privacySettings };

      await getUsers().updateLabels(user.id, {
        privacySettings: JSON.stringify(updatedSettings),
      });

      logger.audit("PRIVACY_SETTINGS_UPDATED", user.id, {
        updatedSettings: Object.keys(privacySettings),
        ip: req.ip,
      });

      res.success(null, "Privacy settings updated successfully");
    } catch (error) {
      logger.error("Update privacy settings failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(req, res) {
    try {
      const { user } = req;
      const userDetails = await getUsers().get(user.id);

      const preferences = userDetails.labels?.notificationPreferences
        ? JSON.parse(userDetails.labels.notificationPreferences)
        : {
            email: {
              transactionAlerts: true,
              securityAlerts: true,
              promotionalEmails: false,
              accountUpdates: true,
              weeklyReport: true,
            },
            sms: {
              transactionAlerts: true,
              securityAlerts: true,
              loginAlerts: false,
            },
            push: {
              transactionAlerts: true,
              securityAlerts: true,
              promotionalMessages: false,
              friendRequests: true,
            },
          };

      res.success(
        preferences,
        "Notification preferences retrieved successfully",
      );
    } catch (error) {
      logger.error("Get notification preferences failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(req, res) {
    try {
      const { user } = req;
      const { email, sms, push } = req.body;

      // Get current preferences
      const userDetails = await getUsers().get(user.id);
      const currentPrefs = userDetails.labels?.notificationPreferences
        ? JSON.parse(userDetails.labels.notificationPreferences)
        : {};

      // Merge with new preferences
      const updatedPrefs = {
        ...currentPrefs,
        ...(email && { email: { ...currentPrefs.email, ...email } }),
        ...(sms && { sms: { ...currentPrefs.sms, ...sms } }),
        ...(push && { push: { ...currentPrefs.push, ...push } }),
      };

      await getUsers().updateLabels(user.id, {
        notificationPreferences: JSON.stringify(updatedPrefs),
      });

      logger.audit("NOTIFICATION_PREFERENCES_UPDATED", user.id, {
        updatedChannels: Object.keys({ email, sms, push }).filter(
          (key) => req.body[key],
        ),
        ip: req.ip,
      });

      res.success(null, "Notification preferences updated successfully");
    } catch (error) {
      logger.error("Update notification preferences failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get account activity
   */
  async getActivity(req, res) {
    try {
      const { user } = req;
      const { page = 1, limit = 20, type } = req.query;

      // TODO: Get actual activity from activity logs collection
      const mockActivities = [
        {
          id: "1",
          type: "login",
          description: "Logged in from Chrome on Windows",
          ip: "192.168.1.1",
          location: "Lagos, Nigeria",
          timestamp: new Date().toISOString(),
        },
        {
          id: "2",
          type: "profile_update",
          description: "Updated profile information",
          ip: "192.168.1.1",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
      ];

      const filteredActivities = type
        ? mockActivities.filter((activity) => activity.type === type)
        : mockActivities;

      res.paginated(
        filteredActivities,
        {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: filteredActivities.length,
          totalPages: Math.ceil(filteredActivities.length / parseInt(limit)),
        },
        "Activity retrieved successfully",
      );
    } catch (error) {
      logger.error("Get activity failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export user data
   */
  async exportData(req, res) {
    try {
      const { user } = req;
      const { format, includeTransactions } = req.query;

      // Get user data
      const userDetails = await getUsers().get(user.id);

      // Prepare export data
      const exportData = {
        profile: {
          id: userDetails.$id,
          email: userDetails.email,
          name: userDetails.name,
          phone: userDetails.phone,
          createdAt: userDetails.$createdAt,
          // Add other profile fields
        },
        settings: {
          privacy: userDetails.labels?.privacySettings
            ? JSON.parse(userDetails.labels.privacySettings)
            : {},
          notifications: userDetails.labels?.notificationPreferences
            ? JSON.parse(userDetails.labels.notificationPreferences)
            : {},
          security: {
            mfaEnabled: userDetails.labels?.mfaEnabled === "true",
            loginAlerts: userDetails.labels?.loginAlerts !== "false",
          },
        },
      };

      // Include transactions if requested
      if (includeTransactions === "true") {
        // TODO: Get user transactions
        exportData.transactions = [];
      }

      let responseData;
      let contentType;
      let filename;

      switch (format) {
        case "json":
          responseData = JSON.stringify(exportData, null, 2);
          contentType = "application/json";
          filename = "user-data.json";
          break;
        case "csv":
          responseData = this.convertToCSV(exportData);
          contentType = "text/csv";
          filename = "user-data.csv";
          break;
        default:
          throw new ValidationError("Unsupported export format");
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      logger.audit("USER_DATA_EXPORTED", user.id, {
        format,
        includeTransactions: includeTransactions === "true",
        ip: req.ip,
      });

      res.send(responseData);
    } catch (error) {
      logger.error("Export data failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  // Helper methods

  async getRecentLogins(userId) {
    // TODO: Get actual recent logins from logs
    return [
      {
        timestamp: new Date().toISOString(),
        ip: "192.168.1.1",
        location: "Lagos, Nigeria",
        device: "Chrome on Windows",
        success: true,
      },
    ];
  }

  async getActiveSessions(userId) {
    // TODO: Get actual active sessions
    return [
      {
        id: "session_1",
        device: "Chrome on Windows",
        ip: "192.168.1.1",
        location: "Lagos, Nigeria",
        lastActivity: new Date().toISOString(),
        current: true,
      },
    ];
  }

  /**
   * Upload profile avatar to Appwrite Storage
   * POST /api/v1/profile/avatar
   */
  async uploadAvatar(req, res) {
    try {
      const { user } = req;

      if (!req.file) {
        throw new ValidationError("No file uploaded");
      }

      const bucketId = config.database.appwrite.storageBucketId;
      if (!bucketId) {
        throw new ValidationError(
          "Storage bucket not configured — set APPWRITE_STORAGE_BUCKET_ID in .env",
        );
      }

      const databases = getDatabases();

      // Fetch current profile to find any old avatar file ID
      const dbProfile = await databases
        .getDocument(
          config.database.appwrite.databaseId,
          config.database.appwrite.userCollectionId,
          user.id,
        )
        .catch(() => null);

      // Delete previous avatar from storage (non-fatal if it fails)
      const oldFileId = dbProfile?.avatarFileId;
      if (oldFileId) {
        await storage.deleteFile(bucketId, oldFileId).catch(() => {});
      }

      // Upload new file
      const fileId = ID.unique();
      await storage.createFile(
        bucketId,
        fileId,
        InputFile.fromBuffer(req.file.buffer, req.file.originalname),
      );

      // Build the public view URL
      const avatarUrl = `${config.database.appwrite.endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${config.database.appwrite.projectId}`;

      // Persist avatar URL + fileId in the user profile document.
      // Try with avatarFileId first; if the collection schema doesn't have that
      // attribute yet, fall back to avatar-only, then to Appwrite labels.
      const db = getDatabases();
      const dbId = config.database.appwrite.databaseId;
      const colId = config.database.appwrite.userCollectionId;
      await db
        .updateDocument(dbId, colId, user.id, {
          avatar: avatarUrl,
          avatarFileId: fileId,
        })
        .catch(() =>
          db
            .updateDocument(dbId, colId, user.id, { avatar: avatarUrl })
            .catch(async () => {
              // Truly no DB document — fall back to Appwrite user labels
              await getUsers().updateLabels(user.id, {
                avatar: avatarUrl,
                avatarFileId: fileId,
              });
            }),
        );

      logger.audit("AVATAR_UPLOADED", user.id, {
        fileId,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.success({ avatarUrl }, "Profile photo updated successfully");
    } catch (error) {
      logger.error("Upload avatar failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete profile avatar
   * DELETE /api/v1/profile/avatar
   */
  async deleteAvatar(req, res) {
    try {
      const { user } = req;
      const bucketId = config.database.appwrite.storageBucketId;
      const databases = getDatabases();

      const dbProfile = await databases
        .getDocument(
          config.database.appwrite.databaseId,
          config.database.appwrite.userCollectionId,
          user.id,
        )
        .catch(() => null);

      // Remove file from Appwrite Storage
      const fileId = dbProfile?.avatarFileId;
      if (fileId && bucketId) {
        await storage.deleteFile(bucketId, fileId).catch(() => {});
      }

      // Clear avatar fields from DB
      await databases
        .updateDocument(
          config.database.appwrite.databaseId,
          config.database.appwrite.userCollectionId,
          user.id,
          { avatar: null, avatarFileId: null },
        )
        .catch(async () => {
          await getUsers().updateLabels(user.id, {
            avatar: "",
            avatarFileId: "",
          });
        });

      logger.audit("AVATAR_DELETED", user.id, { ip: req.ip });
      res.success(null, "Profile photo removed");
    } catch (error) {
      logger.error("Delete avatar failed", {
        userId: req.user?.id,
        error: error.message,
      });
      throw error;
    }
  }

  convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    let csv = "Field,Value\n";

    const flatten = (obj, prefix = "") => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          flatten(value, newKey);
        } else {
          csv += `"${newKey}","${value}"\n`;
        }
      });
    };

    flatten(data);
    return csv;
  }
}

module.exports = new ProfileController();
