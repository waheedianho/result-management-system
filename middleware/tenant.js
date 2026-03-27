const AuditLog = require('../model/auditLog');

/**
 * Tenant Middleware
 * Enforces school isolation based on the authenticated user's schoolId.
 * Attaches req.schoolId to the request object for downstream use.
 */
exports.tenant = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Super Admin can access any school, but if they provide a schoolId in query/body, we use that context.
    // Otherwise, they see global data.
    if (req.user.role === 'super-admin') {
        // If specific school context is requested (e.g., managing a specific school)
        if (req.query.schoolId || req.body.schoolId) {
            req.schoolId = req.query.schoolId || req.body.schoolId;
        }
        // If accessing a specific resource that belongs to a school, we might need to resolve it.
        // For now, let's allow super-admin to bypass strict schoolId filtering unless explicitly set.
        return next();
    }

    // Regular Admin and Teachers are strictly bound to their school
    if (!req.user.schoolId) {
        return res.status(403).json({ message: 'User is not assigned to any school.' });
    }

    req.schoolId = req.user.schoolId;
    
    // Override any attempt to change schoolId in body/query for non-super-admins
    if (req.body.schoolId && req.body.schoolId.toString() !== req.user.schoolId.toString()) {
         console.warn(`User ${req.user._id} attempted to access/modify school ${req.body.schoolId} but belongs to ${req.user.schoolId}`);
         // We can either error out or silently enforce the correct schoolId.
         // Silently enforcing is safer for some edit cases, but erroring is better for security.
         return res.status(403).json({ message: 'Cross-tenant access denied.' });
    }
    
    // Enforce schoolId in body for create/update operations
    if (req.method === 'POST' || req.method === 'PUT') {
        req.body.schoolId = req.user.schoolId;
    }

    next();
};

/**
 * Permission Middleware
 * Restricts access based on user roles.
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to perform this action' });
        }
        next();
    };
};

/**
 * Teacher Restriction Middleware
 * Ensures teachers can only access their assigned class.
 */
exports.restrictToAssignedClass = (req, res, next) => {
    if (req.user.role === 'teacher') {
        if (!req.user.assignedClass) {
             return res.status(403).json({ message: 'You are not assigned to any class.' });
        }
        // If the request is for a specific class (e.g. via query or body), verify it matches
        const requestedClass = req.body.classId || req.query.classId || req.params.classId || req.body.sclass || req.query.sclass;
        
        if (requestedClass && requestedClass.toString() !== req.user.assignedClass.toString()) {
            return res.status(403).json({ message: 'You can only access your assigned class.' });
        }
        
        // Auto-inject class filter for queries
        req.classId = req.user.assignedClass;
    }
    next();
};
