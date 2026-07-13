'use strict';

const { AppError } = require('./errorHandler');

/**
 * Role-Based Access Control definitions
 * Format: { resource: { action: [roles] } }
 */
/*
 * RBAC Permission Model
 * ─────────────────────────────────────────────────────────────
 * Org-portal write roles : ENV_OFFICER, ADMIN, SUPER_ADMIN
 * Org-portal read-only   : ENV_ENGINEER, PRODUCTION_HEAD, QUALITY_HEAD, HR_HEAD
 */

/* Shorthand arrays reused across resources */
const ORG_WRITE = ['SUPER_ADMIN','ENV_OFFICER','ADMIN'];
const ORG_ALL   = ['SUPER_ADMIN','ENV_OFFICER','ADMIN','ENV_ENGINEER','PRODUCTION_HEAD','QUALITY_HEAD','HR_HEAD'];
const LAB_WRITE = ['SUPER_ADMIN','LAB_ADMIN','LAB_ANALYST','LAB_SENIOR_REVIEWER','LAB_QUALITY_MANAGER'];
const LAB_ALL   = ['SUPER_ADMIN','LAB_ADMIN','LAB_ANALYST','LAB_SENIOR_REVIEWER','LAB_QUALITY_MANAGER'];
const REG_WRITE = ['SUPER_ADMIN','REG_OFFICER','REG_REGIONAL_OFFICER','REG_GOVERNMENT_AUTHORITY'];
const REG_ALL   = ['SUPER_ADMIN','REG_OFFICER','REG_INSPECTOR','REG_REGIONAL_OFFICER','REG_GOVERNMENT_AUTHORITY'];

const PERMISSIONS = {
  monitoring: {
    create:   ORG_WRITE,
    read:     [...ORG_ALL,'LAB_ADMIN','LAB_ANALYST','REG_OFFICER'],
    update:   ORG_WRITE,
    delete:   ORG_WRITE,
    approve:  ORG_WRITE,
  },
  report: {
    create:   ORG_WRITE,
    read:     [...ORG_ALL,...LAB_ALL,...REG_ALL,'AUDITOR','CONSULTANT'],
    submit:   ORG_WRITE,
    delete:   ORG_WRITE,
    download: [...ORG_ALL,...LAB_ALL,'REG_OFFICER'],
  },
  lab_review: {
    create:   LAB_WRITE,
    read:     [...LAB_ALL,'ENV_OFFICER','ADMIN','ENV_ENGINEER'],
    approve:  ['SUPER_ADMIN','LAB_ADMIN','LAB_SENIOR_REVIEWER','LAB_QUALITY_MANAGER'],
    reject:   ['SUPER_ADMIN','LAB_ADMIN','LAB_SENIOR_REVIEWER','LAB_QUALITY_MANAGER'],
  },
  reg_review: {
    create:   REG_WRITE,
    read:     [...REG_ALL,'ADMIN','LAB_ADMIN'],
    approve:  REG_WRITE,
    reject:   REG_WRITE,
  },
  certificate: {
    issue:    ['SUPER_ADMIN','LAB_ADMIN','LAB_QUALITY_MANAGER','REG_OFFICER','REG_GOVERNMENT_AUTHORITY'],
    read:     ['*'],
    revoke:   ['SUPER_ADMIN','REG_OFFICER','REG_GOVERNMENT_AUTHORITY'],
  },
  notice: {
    issue:    [...REG_ALL,'REG_INSPECTOR'],
    read:     [...REG_ALL,'REG_INSPECTOR','ADMIN'],
    update:   ['SUPER_ADMIN','REG_OFFICER'],
  },
  user: {
    create:   ['SUPER_ADMIN'],
    read:     ['SUPER_ADMIN','ADMIN','LAB_ADMIN'],
    update:   ['SUPER_ADMIN','ADMIN','LAB_ADMIN'],
    delete:   ['SUPER_ADMIN'],
    manage:   ['SUPER_ADMIN'],
  },
  organization: {
    create:   ['SUPER_ADMIN'],
    read:     ORG_ALL,
    update:   ORG_WRITE,
    approve:  ['SUPER_ADMIN'],
  },
  laboratory: {
    create:   ['SUPER_ADMIN'],
    read:     ['SUPER_ADMIN','LAB_ADMIN','LAB_ANALYST'],
    update:   ['SUPER_ADMIN','LAB_ADMIN'],
    approve:  ['SUPER_ADMIN'],
  },
  admin: {
    '*': ['SUPER_ADMIN'],
  },
  billing: {
    read:     ['SUPER_ADMIN','ADMIN','LAB_ADMIN'],
    manage:   ['SUPER_ADMIN'],
  },
  ai: {
    query:    ORG_WRITE,
  },
  iot: {
    manage:   ORG_WRITE,
    read:     ORG_ALL,
  },
  esg: {
    read:     [...ORG_ALL,...REG_ALL,'AUDITOR','CONSULTANT'],
    write:    ORG_WRITE,
    upload:   ORG_WRITE,
    download: [...ORG_ALL,...REG_ALL,'AUDITOR','CONSULTANT'],
    delete:   ORG_WRITE,
    compute:  ORG_WRITE,
    verify:   [...ORG_WRITE,'AUDITOR'],
  },
  eia: {
    read:     [...ORG_ALL,...REG_ALL,'AUDITOR','CONSULTANT'],
    write:    ORG_WRITE,
    upload:   ORG_WRITE,
    download: [...ORG_ALL,...REG_ALL,'AUDITOR','CONSULTANT'],
    delete:   ORG_WRITE,
    verify:   [...ORG_WRITE,'AUDITOR'],
  },
  regulatory_access: {
    create:   ORG_WRITE,
    read:     [...ORG_WRITE,...REG_ALL],
    update:   ORG_WRITE,
    delete:   ORG_WRITE,
  }
};

/**
 * authorize(resource, action)
 * Middleware factory — call in route definitions
 * e.g.: router.post('/...', authenticate, authorize('report','submit'), controller)
 */
function authorize(resource, action) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));

    const resPerms = PERMISSIONS[resource];
    if (!resPerms) return next(new AppError(`Unknown resource: ${resource}`, 500));

    const actionPerms = resPerms[action] || resPerms['*'];
    if (!actionPerms) return next(new AppError(`Unknown action: ${action} on ${resource}`, 500));

    /* Wildcard — all authenticated users */
    if (actionPerms[0] === '*') return next();

    if (!actionPerms.includes(req.user.role)) {
      return next(new AppError(
        `Insufficient permissions. Required: ${actionPerms.join('/')} | Your role: ${req.user.role}`,
        403,
        'FORBIDDEN'
      ));
    }
    next();
  };
}

/**
 * requireRoles(...roles)
 * Shorthand for exact role list
 */
function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Access denied for role: ${req.user.role}`, 403, 'FORBIDDEN'));
    }
    next();
  };
}

/**
 * requireSuperAdmin
 */
const requireSuperAdmin = requireRoles('SUPER_ADMIN');

/**
 * requireOrgAccess — ensures the user belongs to the org in the request
 */
function requireOrgAccess(req, _res, next) {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (req.user.role === 'SUPER_ADMIN') return next(); // super admin can access all
  const orgId = req.params.orgId || req.body.organizationId || req.query.organizationId;
  if (orgId && req.user.orgId !== orgId) {
    return next(new AppError('Access denied to this organization', 403, 'ORG_ACCESS_DENIED'));
  }
  next();
}

/**
 * requireLabAccess — ensures the user belongs to the lab in the request
 */
function requireLabAccess(req, _res, next) {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (req.user.role === 'SUPER_ADMIN') return next();
  const labId = req.params.labId || req.body.laboratoryId;
  if (labId && req.user.labId !== labId) {
    return next(new AppError('Access denied to this laboratory', 403, 'LAB_ACCESS_DENIED'));
  }
  next();
}

/**
 * requireEnvOfficer
 * Shorthand: ENV_OFFICER, ADMIN, and SUPER_ADMIN may write to org-portal resources.
 * All other roles are read-only.
 */
const requireEnvOfficer = requireRoles('SUPER_ADMIN', 'ENV_OFFICER', 'ADMIN');

module.exports = { authorize, requireRoles, requireSuperAdmin, requireOrgAccess, requireLabAccess, requireEnvOfficer };
