/**
 * Branding Middleware
 * Attaches `res.locals.branding` to every request based on the logged-in user's school.
 * Super-admins (no schoolId) fall back to .env-configured defaults.
 * Results are cached in memory for 5 minutes to avoid per-request DB lookups.
 */
const School = require('../model/school');

const brandingCache = new Map(); // schoolId → { data, expiresAt }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getDefaultBranding() {
  return {
    schoolName: process.env.APP_NAME || 'EduAdmin',
    logoUrl: process.env.APP_LOGO_URL || null,
    primaryColor: process.env.APP_PRIMARY_COLOR || '#6366f1',
    accentColor: process.env.APP_ACCENT_COLOR || '#8b5cf6',
    tagline: 'Student Result Management System',
    currentSession: '2025/2026',
    currentTerm: 'First',
    isDefault: true,
  };
}

async function brandingMiddleware(req, res, next) {
  try {
    const user = req.user;

    // Public pages or unauthenticated — use defaults
    if (!user || !user.schoolId) {
      res.locals.branding = getDefaultBranding();
      return next();
    }

    const schoolId = String(user.schoolId);
    const now = Date.now();

    // Cache hit
    if (brandingCache.has(schoolId)) {
      const cached = brandingCache.get(schoolId);
      if (cached.expiresAt > now) {
        res.locals.branding = cached.data;
        return next();
      }
      brandingCache.delete(schoolId);
    }

    // Cache miss — fetch from DB
    const school = await School.findById(schoolId).lean();

    if (!school) {
      res.locals.branding = getDefaultBranding();
      return next();
    }

    const brandingData = {
      schoolName: school.name,
      logoUrl: school.logoUrl || null,
      primaryColor: school.primaryColor || '#6366f1',
      accentColor: school.accentColor || '#8b5cf6',
      tagline: school.tagline || '',
      currentSession: school.currentSession || '2025/2026',
      currentTerm: school.currentTerm || 'First',
      isDefault: false,
    };

    brandingCache.set(schoolId, {
      data: brandingData,
      expiresAt: now + CACHE_TTL_MS,
    });

    res.locals.branding = brandingData;
    return next();
  } catch (err) {
    // Never block a request due to branding failure
    res.locals.branding = getDefaultBranding();
    return next();
  }
}

/**
 * Invalidate the branding cache for a specific school (call after school update/logo upload).
 */
function invalidateBrandingCache(schoolId) {
  if (schoolId) {
    brandingCache.delete(String(schoolId));
  }
}

module.exports = { brandingMiddleware, invalidateBrandingCache };
