const getPrisma = require('../utils/prisma');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { getFileUrl, deleteOldFile } = require('../utils/upload');

const prisma = getPrisma();

class SettingsController {
  /**
   * Get app settings (single record)
   */
  static async getSettings(req, res, next) {
    try {
      let settings = await prisma.appSettings.findFirst();

      // If no settings exist, create default
      if (!settings) {
        settings = await prisma.appSettings.create({
          data: {
            appName: 'Farah',
            appNameAr: 'فرح',
            shareMessage: 'Check out this amazing app!',
            shareMessageAr: 'جرب هذا التطبيق الرائع!',
          },
        });
      } else {
        // Clean up invalid/truncated images
        let needsUpdate = false;
        const updateData = {};
        
        if (settings.appLogo && !SettingsController.validateBase64Image(settings.appLogo)) {
          updateData.appLogo = null;
          needsUpdate = true;
        }
        if (settings.dashboardLogo && !SettingsController.validateBase64Image(settings.dashboardLogo)) {
          updateData.dashboardLogo = null;
          needsUpdate = true;
        }
        if (settings.favicon && !SettingsController.validateBase64Image(settings.favicon)) {
          updateData.favicon = null;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          settings = await prisma.appSettings.update({
            where: { id: settings.id },
            data: updateData,
          });
        }
      }

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update app settings
   */
  /**
   * Validate base64 image string
   */
  static validateBase64Image(imageStr) {
    if (!imageStr || typeof imageStr !== 'string') return false;
    
    const trimmed = imageStr.trim();
    if (trimmed.length < 100) return false; // Too short
    
    // If it's a data URL
    if (trimmed.startsWith('data:image/')) {
      const commaIndex = trimmed.indexOf(',');
      if (commaIndex === -1 || commaIndex === trimmed.length - 1) return false;
      const base64Data = trimmed.substring(commaIndex + 1);
      if (base64Data.length < 100) return false;
      // Check base64 format
      const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      return base64Regex.test(base64Data);
    }
    
    // If it's a URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return true;
    }
    
    // If it's raw base64
    const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Regex.test(trimmed) && trimmed.length >= 100;
  }

  static async updateSettings(req, res, next) {
    try {
      const {
        appName,
        appNameAr,
        appLogo,
        dashboardLogo,
        favicon,
        primaryColor,
        secondaryColor,
        email,
        phone,
        address,
        addressAr,
        facebookUrl,
        twitterUrl,
        instagramUrl,
        linkedinUrl,
        playStoreUrl,
        appStoreUrl,
        shareMessage,
        shareMessageAr,
      } = req.body;

      // Handle file uploads (new method - preferred)
      let appLogoUrl = null;
      let dashboardLogoUrl = null;
      let faviconUrl = null;

      if (req.files) {
        if (req.files.appLogo && req.files.appLogo[0]) {
          const logoFile = req.files.appLogo[0];
          const logoPath = `/uploads/settings/${logoFile.filename}`;
          appLogoUrl = getFileUrl(req, logoPath);
          console.log('App logo uploaded as file:', appLogoUrl);
        } else if (appLogo !== undefined) {
          appLogoUrl = appLogo && appLogo.trim() !== '' ? appLogo : null;
        }

        if (req.files.dashboardLogo && req.files.dashboardLogo[0]) {
          const logoFile = req.files.dashboardLogo[0];
          const logoPath = `/uploads/settings/${logoFile.filename}`;
          dashboardLogoUrl = getFileUrl(req, logoPath);
          console.log('Dashboard logo uploaded as file:', dashboardLogoUrl);
        } else if (dashboardLogo !== undefined) {
          dashboardLogoUrl = dashboardLogo && dashboardLogo.trim() !== '' ? dashboardLogo : null;
        }

        if (req.files.favicon && req.files.favicon[0]) {
          const faviconFile = req.files.favicon[0];
          const faviconPath = `/uploads/settings/${faviconFile.filename}`;
          faviconUrl = getFileUrl(req, faviconPath);
          console.log('Favicon uploaded as file:', faviconUrl);
        } else if (favicon !== undefined) {
          faviconUrl = favicon && favicon.trim() !== '' ? favicon : null;
        }
      } else {
        // No files, use body values (base64 fallback)
        appLogoUrl = appLogo !== undefined ? (appLogo && appLogo.trim() !== '' ? appLogo : null) : undefined;
        dashboardLogoUrl = dashboardLogo !== undefined ? (dashboardLogo && dashboardLogo.trim() !== '' ? dashboardLogo : null) : undefined;
        faviconUrl = favicon !== undefined ? (favicon && favicon.trim() !== '' ? favicon : null) : undefined;
      }

      // Validate base64 images if provided (for backward compatibility)
      if (appLogoUrl && !appLogoUrl.startsWith('http://') && !appLogoUrl.startsWith('https://') && !SettingsController.validateBase64Image(appLogoUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or truncated appLogo image',
        });
      }
      
      if (dashboardLogoUrl && !dashboardLogoUrl.startsWith('http://') && !dashboardLogoUrl.startsWith('https://') && !SettingsController.validateBase64Image(dashboardLogoUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or truncated dashboardLogo image',
        });
      }
      
      if (faviconUrl && !faviconUrl.startsWith('http://') && !faviconUrl.startsWith('https://') && !SettingsController.validateBase64Image(faviconUrl)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or truncated favicon image',
        });
      }

      let settings = await prisma.appSettings.findFirst();

      if (!settings) {
        settings = await prisma.appSettings.create({
          data: {
            appName: appName || 'Farah',
            appNameAr: appNameAr || 'فرح',
            appLogo: appLogoUrl !== undefined ? appLogoUrl : null,
            dashboardLogo: dashboardLogoUrl !== undefined ? dashboardLogoUrl : null,
            favicon: faviconUrl !== undefined ? faviconUrl : null,
            primaryColor,
            secondaryColor,
            email,
            phone,
            address,
            addressAr,
            facebookUrl,
            twitterUrl,
            instagramUrl,
            linkedinUrl,
            playStoreUrl,
            appStoreUrl,
            shareMessage,
            shareMessageAr,
          },
        });
      } else {
        // Build update data object, only including fields that are provided
        const updateData = {};
        
        if (appName !== undefined) updateData.appName = appName;
        if (appNameAr !== undefined) updateData.appNameAr = appNameAr;
        if (appLogoUrl !== undefined) {
          // Delete old logo file if it exists
          if (settings.appLogo && settings.appLogo.startsWith('/uploads/')) {
            deleteOldFile(settings.appLogo);
          }
          updateData.appLogo = appLogoUrl;
        }
        if (dashboardLogoUrl !== undefined) {
          // Delete old logo file if it exists
          if (settings.dashboardLogo && settings.dashboardLogo.startsWith('/uploads/')) {
            deleteOldFile(settings.dashboardLogo);
          }
          updateData.dashboardLogo = dashboardLogoUrl;
        }
        if (faviconUrl !== undefined) {
          // Delete old favicon file if it exists
          if (settings.favicon && settings.favicon.startsWith('/uploads/')) {
            deleteOldFile(settings.favicon);
          }
          updateData.favicon = faviconUrl;
        }
        if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
        if (email !== undefined) updateData.email = email || null;
        if (phone !== undefined) updateData.phone = phone || null;
        if (address !== undefined) updateData.address = address || null;
        if (addressAr !== undefined) updateData.addressAr = addressAr || null;
        if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl || null;
        if (twitterUrl !== undefined) updateData.twitterUrl = twitterUrl || null;
        if (instagramUrl !== undefined) updateData.instagramUrl = instagramUrl || null;
        if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl || null;
        if (playStoreUrl !== undefined) updateData.playStoreUrl = playStoreUrl || null;
        if (appStoreUrl !== undefined) updateData.appStoreUrl = appStoreUrl || null;
        if (shareMessage !== undefined) updateData.shareMessage = shareMessage || null;
        if (shareMessageAr !== undefined) updateData.shareMessageAr = shareMessageAr || null;
        
        settings = await prisma.appSettings.update({
          where: { id: settings.id },
          data: updateData,
        });
      }

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SettingsController;


