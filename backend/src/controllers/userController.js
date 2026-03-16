/**
 * User Controller
 * Handles user profile management, document uploads, and verification
 */

const { Client, Users, Storage, Databases, ID } = require('node-appwrite');
const config = require('../config/environment');
const logger = require('../utils/logger');
const { 
  ValidationError, 
  NotFoundError, 
  ConflictError 
} = require('../middleware/monitoring/errorHandler');

// Initialize Appwrite clients
const client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const users = new Users(client);
const storage = new Storage(client);
const databases = new Databases(client);

class UserController {
  /**
   * Get current user's profile
   */
  async getProfile(req, res) {
    try {
      const { user } = req;
      const userDetails = await users.get(user.id);
      
      const profile = {
        id: userDetails.$id,
        email: userDetails.email,
        name: userDetails.name,
        phone: userDetails.phone,
        firstName: userDetails.labels.firstName,
        lastName: userDetails.labels.lastName,
        country: userDetails.labels.country,
        dateOfBirth: userDetails.labels.dateOfBirth,
        bio: userDetails.labels.bio,
        location: userDetails.labels.location,
        avatar: userDetails.labels.avatar,
        role: userDetails.labels.role,
        kycLevel: parseInt(userDetails.labels.kycLevel || '0'),
        emailVerified: userDetails.emailVerification,
        phoneVerified: userDetails.phoneVerification,
        mfaEnabled: userDetails.labels.mfaEnabled === 'true',
        accountStatus: userDetails.labels.accountStatus,
        createdAt: userDetails.$createdAt,
        updatedAt: userDetails.$updatedAt
      };

      res.success(profile, 'Profile retrieved successfully');

    } catch (error) {
      logger.error('Get profile failed', {
        userId: req.user?.id,
        error: error.message
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
        country,
        address,
        city,
        state,
        postalCode,
        bio,
        location
      } = req.body;

      // Build update labels
      const updateLabels = {};
      if (firstName) updateLabels.firstName = firstName;
      if (lastName) updateLabels.lastName = lastName;
      if (country) updateLabels.country = country;
      if (dateOfBirth) updateLabels.dateOfBirth = dateOfBirth;
      if (address) updateLabels.address = address;
      if (city) updateLabels.city = city;
      if (state) updateLabels.state = state;
      if (postalCode) updateLabels.postalCode = postalCode;
      if (bio !== undefined) updateLabels.bio = bio;
      if (location !== undefined) updateLabels.location = location;

      // Update user labels in Appwrite
      if (Object.keys(updateLabels).length > 0) {
        await users.updateLabels(user.id, updateLabels);
      }

      // Update name if first or last name changed
      if (firstName || lastName) {
        const currentUser = await users.get(user.id);
        const currentFirstName = currentUser.labels.firstName || '';
        const currentLastName = currentUser.labels.lastName || '';
        const newName = `${firstName || currentFirstName} ${lastName || currentLastName}`;
        await users.updateName(user.id, newName);
      }

      // Update phone if provided
      if (phone) {
        await users.updatePhone(user.id, phone);
      }

      logger.audit('PROFILE_UPDATED', user.id, {
        updatedFields: Object.keys(updateLabels),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.success(null, 'Profile updated successfully');

    } catch (error) {
      logger.error('Update profile failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(req, res) {
    try {
      const { user } = req;
      const file = req.file;

      if (!file) {
        throw new ValidationError('Avatar file is required');
      }

      // Upload to Appwrite Storage
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(
        config.storage.avatarBucketId,
        fileId,
        file.buffer,
        file.originalname,
        ['read("user:' + user.id + '")', 'write("user:' + user.id + '")'] // Permissions
      );

      // Update user avatar URL
      const avatarUrl = `${config.database.appwrite.endpoint}/storage/buckets/${config.storage.avatarBucketId}/files/${fileId}/view`;
      await users.updateLabels(user.id, {
        avatar: avatarUrl,
        avatarFileId: fileId
      });

      logger.audit('AVATAR_UPLOADED', user.id, {
        fileId,
        fileName: file.originalname,
        fileSize: file.size,
        ip: req.ip
      });

      res.success({
        avatarUrl,
        fileId
      }, 'Avatar uploaded successfully');

    } catch (error) {
      logger.error('Avatar upload failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(req, res) {
    try {
      const { user } = req;
      const userDetails = await users.get(user.id);
      const avatarFileId = userDetails.labels.avatarFileId;

      if (avatarFileId) {
        // Delete file from storage
        await storage.deleteFile(config.storage.avatarBucketId, avatarFileId);
        
        // Remove avatar from user labels
        await users.updateLabels(user.id, {
          avatar: '',
          avatarFileId: ''
        });

        logger.audit('AVATAR_DELETED', user.id, {
          fileId: avatarFileId,
          ip: req.ip
        });
      }

      res.success(null, 'Avatar deleted successfully');

    } catch (error) {
      logger.error('Avatar deletion failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Upload verification document
   */
  async uploadDocument(req, res) {
    try {
      const { user } = req;
      const { type } = req.body;
      const file = req.file;

      if (!file) {
        throw new ValidationError('Document file is required');
      }

      // Upload document to secure storage
      const fileId = ID.unique();
      const uploadedFile = await storage.createFile(
        config.storage.documentsBucketId,
        fileId,
        file.buffer,
        file.originalname,
        ['read("user:' + user.id + '")', 'write("user:' + user.id + '")'] // Permissions
      );

      // Store document metadata in database
      const documentRecord = {
        userId: user.id,
        type,
        fileName: file.originalname,
        fileSize: file.size,
        fileId,
        mimeType: file.mimetype,
        status: 'pending_review',
        uploadedAt: new Date().toISOString(),
        uploadIP: req.ip
      };

      const document = await databases.createDocument(
        config.database.appwrite.databaseId,
        config.collections.documentsId,
        ID.unique(),
        documentRecord
      );

      logger.audit('DOCUMENT_UPLOADED', user.id, {
        documentId: document.$id,
        type,
        fileName: file.originalname,
        fileSize: file.size,
        ip: req.ip
      });

      res.success({
        documentId: document.$id,
        type,
        fileName: file.originalname,
        status: 'pending_review',
        uploadedAt: document.uploadedAt
      }, 'Document uploaded successfully');

    } catch (error) {
      logger.error('Document upload failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's uploaded documents
   */
  async getDocuments(req, res) {
    try {
      const { user } = req;
      
      const documents = await databases.listDocuments(
        config.database.appwrite.databaseId,
        config.collections.documentsId,
        [`userId=${user.id}`]
      );

      const documentList = documents.documents.map(doc => ({
        id: doc.$id,
        type: doc.type,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        uploadedAt: doc.uploadedAt,
        reviewedAt: doc.reviewedAt,
        reviewNotes: doc.reviewNotes
      }));

      res.success(documentList, 'Documents retrieved successfully');

    } catch (error) {
      logger.error('Get documents failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(req, res) {
    try {
      const { user } = req;
      const { documentId } = req.params;

      // Get document details
      const document = await databases.getDocument(
        config.database.appwrite.databaseId,
        config.collections.documentsId,
        documentId
      );

      // Verify ownership
      if (document.userId !== user.id) {
        throw new NotFoundError('Document');
      }

      // Delete file from storage
      await storage.deleteFile(config.storage.documentsBucketId, document.fileId);
      
      // Delete document record
      await databases.deleteDocument(
        config.database.appwrite.databaseId,
        config.collections.documentsId,
        documentId
      );

      logger.audit('DOCUMENT_DELETED', user.id, {
        documentId,
        type: document.type,
        fileName: document.fileName,
        ip: req.ip
      });

      res.success(null, 'Document deleted successfully');

    } catch (error) {
      logger.error('Document deletion failed', {
        userId: req.user?.id,
        documentId: req.params.documentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user verification status
   */
  async getVerificationStatus(req, res) {
    try {
      const { user } = req;
      const userDetails = await users.get(user.id);
      
      const verificationStatus = {
        kycLevel: parseInt(userDetails.labels.kycLevel || '0'),
        emailVerified: userDetails.emailVerification,
        phoneVerified: userDetails.phoneVerification,
        documentsStatus: {
          id: userDetails.labels.idDocumentStatus || 'not_provided',
          passport: userDetails.labels.passportStatus || 'not_provided',
          utilityBill: userDetails.labels.utilityBillStatus || 'not_provided'
        },
        verificationLimits: this.getVerificationLimits(parseInt(userDetails.labels.kycLevel || '0'))
      };

      res.success(verificationStatus, 'Verification status retrieved successfully');

    } catch (error) {
      logger.error('Get verification status failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Request account verification
   */
  async requestVerification(req, res) {
    try {
      const { user } = req;
      const userDetails = await users.get(user.id);
      const currentKYCLevel = parseInt(userDetails.labels.kycLevel || '0');
      
      // Check if user can request higher verification level
      if (currentKYCLevel >= 3) {
        throw new ValidationError('Account is already at maximum verification level');
      }

      // Update verification request status
      await users.updateLabels(user.id, {
        verificationRequested: 'true',
        verificationRequestedAt: new Date().toISOString(),
        verificationStatus: 'under_review'
      });

      logger.audit('VERIFICATION_REQUESTED', user.id, {
        currentKYCLevel,
        requestedLevel: currentKYCLevel + 1,
        ip: req.ip
      });

      res.success({
        verificationStatus: 'under_review',
        requestedLevel: currentKYCLevel + 1,
        estimatedReviewTime: '2-3 business days'
      }, 'Verification request submitted successfully');

    } catch (error) {
      logger.error('Verification request failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user activity log
   */
  async getActivityLog(req, res) {
    try {
      const { user } = req;
      const { page = 1, limit = 20 } = req.query;
      
      // TODO: Implement activity log retrieval from database
      // This would typically query an activity_logs collection
      const activities = [];
      
      res.paginated(activities, {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems: 0,
        totalPages: 0
      }, 'Activity log retrieved successfully');

    } catch (error) {
      logger.error('Get activity log failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req, res) {
    try {
      const { user } = req;
      const { notifications, privacy, security } = req.body;

      const updateLabels = {};
      if (notifications) updateLabels.notificationPreferences = JSON.stringify(notifications);
      if (privacy) updateLabels.privacySettings = JSON.stringify(privacy);
      if (security) updateLabels.securitySettings = JSON.stringify(security);

      await users.updateLabels(user.id, updateLabels);

      logger.audit('PREFERENCES_UPDATED', user.id, {
        updatedPreferences: Object.keys({ notifications, privacy, security }).filter(key => req.body[key]),
        ip: req.ip
      });

      res.success(null, 'Preferences updated successfully');

    } catch (error) {
      logger.error('Update preferences failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete user account (soft delete)
   */
  async deleteAccount(req, res) {
    try {
      const { user } = req;
      const { password, confirmation } = req.body;

      // Verify password
      const userDetails = await users.get(user.id);
      const isPasswordValid = await bcrypt.compare(password, userDetails.password);
      
      if (!isPasswordValid) {
        throw new ValidationError('Invalid password');
      }

      // Soft delete by updating status
      await users.updateLabels(user.id, {
        accountStatus: 'deleted',
        deletedAt: new Date().toISOString(),
        deletionReason: 'user_requested'
      });

      logger.audit('ACCOUNT_DELETED', user.id, {
        deletionReason: 'user_requested',
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.success(null, 'Account deleted successfully');

    } catch (error) {
      logger.error('Account deletion failed', {
        userId: req.user?.id,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods
  getVerificationLimits(kycLevel) {
    const limits = {
      0: { dailyLimit: 100, monthlyLimit: 1000 },
      1: { dailyLimit: 1000, monthlyLimit: 10000 },
      2: { dailyLimit: 5000, monthlyLimit: 50000 },
      3: { dailyLimit: 25000, monthlyLimit: 250000 }
    };
    
    return limits[kycLevel] || limits[0];
  }
}

module.exports = new UserController();