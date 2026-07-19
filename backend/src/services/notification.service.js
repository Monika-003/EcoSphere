'use strict';

/**
 * Notification Service
 * Handles: Email, SMS (Twilio), In-App (DB), Push, WhatsApp
 * Falls back gracefully if services are unavailable.
 */

const nodemailer = require('nodemailer');
const { prisma }  = require('../config/database');
const { logger }  = require('../config/logger');
const { emailTemplates } = require('../utils/emailTemplates');

/* ── Nodemailer transport (lazy init) ── */
let _transport = null;
function getTransport() {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return _transport;
}

/* ── Twilio client (lazy init) ── */
let _twilio = null;
function getTwilio() {
  if (_twilio) return _twilio;
  if (!process.env.TWILIO_ACCOUNT_SID) return null;
  try {
    const twilio = require('twilio');
    _twilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch { _twilio = null; }
  return _twilio;
}

/* ══════════════════════════════════════
   INTERNAL: send email
══════════════════════════════════════ */
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER) {
    logger.warn(`[Email] SMTP not configured — skipping email to ${to}`);
    return;
  }
  try {
    await getTransport().sendMail({
      from:    `"${process.env.EMAIL_FROM_NAME || 'EcoSphere'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to, subject, html
    });
    logger.info(`[Email] Sent "${subject}" to ${to}`);
  } catch (err) {
    logger.error('[Email] Send error:', err.message);
  }
}

/* ══════════════════════════════════════
   INTERNAL: save in-app notification
   type param here is a semantic label (INFO/SUCCESS/WARNING/ALERT/ERROR)
   mapped → priority field; DB `type` is always IN_APP.
══════════════════════════════════════ */
const SEMANTIC_TO_PRIORITY = {
  INFO:    'LOW',
  SUCCESS: 'NORMAL',
  WARNING: 'HIGH',
  ALERT:   'CRITICAL',
  ERROR:   'HIGH'
};

async function saveInApp({ userId, orgId, title, message, type, link, entityType, entityId }) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        organizationId: orgId || undefined,
        title,
        message,
        type:       'IN_APP',                                      // ← always IN_APP for DB notifications
        priority:   SEMANTIC_TO_PRIORITY[type] || 'NORMAL',       // ← semantic → priority
        actionUrl:  link   || undefined,
        link:       link   || undefined,
        entityType: entityType || undefined,
        entityId:   entityId   || undefined,
        status:     'SENT'
      }
    });
  } catch (err) {
    logger.error('[Notification] DB save error:', err.message);
  }
}

/* ══════════════════════════════════════
   INTERNAL: send SMS via Twilio
══════════════════════════════════════ */
async function sendSms(to, body) {
  const twilio = getTwilio();
  if (!twilio || !to) return;
  try {
    await twilio.messages.create({
      from: process.env.TWILIO_PHONE,
      to, body
    });
    logger.info(`[SMS] Sent to ${to}`);
  } catch (err) {
    logger.error('[SMS] Send error:', err.message);
  }
}

/* ══════════════════════════════════════
   AUTH NOTIFICATIONS
══════════════════════════════════════ */
exports.sendEmailVerification = async (userId, email, name) => {
  const token = require('crypto').randomBytes(32).toString('hex');
  const link  = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  // Store token for later verification
  await prisma.passwordResetToken.create({
    data: { email, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
  }).catch(() => {});

  await sendEmail(email, 'Verify your EcoSphere account', emailTemplates.verification(name, link));
  await saveInApp({ userId, title: 'Verify Your Email', message: 'Click the link in your email to verify your account.', type: 'INFO' });
};

exports.sendPasswordResetEmail = async (email, name, resetLink) => {
  await sendEmail(email, 'Reset your EcoSphere password', emailTemplates.passwordReset(name, resetLink));
};

/* ══════════════════════════════════════
   COMPLIANCE ALERT
══════════════════════════════════════ */
exports.sendComplianceAlert = async (orgId, monitoringType, violations) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN','QUALITY_HEAD','PRODUCTION_HEAD'] }, isActive: true }, take: 3 } }
    });
    if (!org) return;

    for (const user of org.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   `⚠ Compliance Alert — ${monitoringType}`,
        message: `Non-compliant monitoring record detected. Violations found in ${monitoringType} parameters.`,
        type:    'ALERT',
        entityType: 'MonitoringRecord'
      });
      if (user.email) {
        await sendEmail(user.email, `⚠ Compliance Alert — ${monitoringType}`,
          emailTemplates.complianceAlert(user.firstName, monitoringType, violations));
      }
    }
  } catch (err) {
    logger.error('[ComplianceAlert] Error:', err.message);
  }
};

/* ══════════════════════════════════════
   LAB WORKFLOW NOTIFICATIONS
══════════════════════════════════════ */
exports.notifyLabApproval = async (orgId, reportId, reportNumber) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '✅ Lab Review Approved',
        message: `Report ${reportNumber} has been approved by the laboratory. It will now be forwarded to the Regulatory Authority.`,
        type:    'SUCCESS', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyLabApproval]', err.message);
  }
};

exports.notifyLabRejection = async (orgId, reportId, correctionNotes) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '❌ Lab Review Rejected',
        message: `Your report has been rejected. Reason: ${correctionNotes || 'See report for details.'}`,
        type:    'ERROR', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyLabRejection]', err.message);
  }
};

exports.notifyCorrectionRequested = async (orgId, reportId, correctionNotes) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN','ENV_ENGINEER','QUALITY_HEAD'] }, isActive: true }, take: 3 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '⚠ Corrections Required',
        message: `Lab has requested corrections for your report. Notes: ${correctionNotes || 'See report.'}`,
        type:    'WARNING', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyCorrectionRequested]', err.message);
  }
};

exports.notifyForwardedToRegulatory = async (orgId, reportId) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '📋 Report Forwarded to Regulatory',
        message: 'Your lab-approved report has been submitted to the Regulatory Authority for review.',
        type:    'INFO', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyForwardedToRegulatory]', err.message);
  }
};

/* ══════════════════════════════════════
   REGULATORY WORKFLOW NOTIFICATIONS
══════════════════════════════════════ */
exports.notifyRegApproval = async (orgId, reportId) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '🏛 Regulatory Authority Approved',
        message: 'Your report has been approved by the Regulatory Authority. Certificate issuance in progress.',
        type:    'SUCCESS', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyRegApproval]', err.message);
  }
};

exports.notifyComplianceNotice = async (orgId, noticeId, noticeNumber, title) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN','QUALITY_HEAD','PRODUCTION_HEAD'] }, isActive: true }, take: 3 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   `⚖ Compliance Notice: ${noticeNumber}`,
        message: title,
        type:    'ALERT', entityType: 'ComplianceNotice', entityId: noticeId
      });
    }
  } catch (err) {
    logger.error('[notifyComplianceNotice]', err.message);
  }
};

exports.notifyCertificateIssued = async (orgId, certId, certNumber) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   `🏆 Certificate Issued — ${certNumber}`,
        message: 'Your Environmental Compliance Certificate has been issued. Download it from the dashboard.',
        type:    'SUCCESS', entityType: 'Certificate', entityId: certId,
        link:    `/certificates/${certId}`
      });
    }
  } catch (err) {
    logger.error('[notifyCertificateIssued]', err.message);
  }
};

exports.notifyInspectionScheduled = async (orgId, inspectionId, scheduledDate) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   `🔍 Inspection Scheduled`,
        message: `A regulatory inspection has been scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`,
        type:    'INFO', entityType: 'Inspection', entityId: inspectionId
      });
    }
  } catch (err) {
    logger.error('[notifyInspectionScheduled]', err.message);
  }
};

/* ══════════════════════════════════════
   MISSING REGULATORY WORKFLOW NOTIFICATIONS
══════════════════════════════════════ */
exports.notifyRegRejection = async (orgId, reportId, reason) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN'] }, isActive: true }, take: 2 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '❌ Regulatory Authority Rejected Report',
        message: `Your report has been rejected by the Regulatory Authority. Reason: ${reason || 'See report for details.'}`,
        type:    'ERROR', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyRegRejection]', err.message);
  }
};

exports.notifyRegCorrectionRequested = async (orgId, reportId, correctionNotes) => {
  try {
    const org = await prisma.organization.findUnique({
      where:   { id: orgId },
      include: { users: { where: { role: { in: ['ENV_OFFICER','ADMIN','ENV_ENGINEER','QUALITY_HEAD'] }, isActive: true }, take: 3 } }
    });
    for (const user of org?.users || []) {
      await saveInApp({
        userId: user.id, orgId,
        title:   '⚠ Regulatory Corrections Required',
        message: `The Regulatory Authority has requested corrections. Notes: ${correctionNotes || 'See report for details.'}`,
        type:    'WARNING', entityType: 'Report', entityId: reportId,
        link:    `/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyRegCorrectionRequested]', err.message);
  }
};

/* ══════════════════════════════════════
   CROSS-PORTAL SUBMISSION NOTIFICATIONS
══════════════════════════════════════ */
exports.notifyNewReportForLab = async (reportId, reportNumber, orgName) => {
  try {
    const labUsers = await prisma.user.findMany({
      where: { role: { in: ['LAB_ADMIN','LAB_SENIOR_REVIEWER','LAB_ANALYST'] }, isActive: true },
      take: 10
    });
    for (const user of labUsers) {
      await saveInApp({
        userId: user.id,
        title:   '📋 New Report Submitted for Review',
        message: `${orgName || 'An organization'} has submitted report ${reportNumber} for laboratory review.`,
        type:    'INFO', entityType: 'Report', entityId: reportId,
        link:    `/lab/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyNewReportForLab]', err.message);
  }
};

exports.notifyNewReportForRegulatory = async (reportId, orgId) => {
  try {
    const regUsers = await prisma.user.findMany({
      where: { role: { in: ['REG_OFFICER','REG_REGIONAL_OFFICER','REG_INSPECTOR'] }, isActive: true },
      take: 10
    });
    for (const user of regUsers) {
      await saveInApp({
        userId: user.id,
        title:   '🏛 New Report Submitted to Regulatory',
        message: 'A lab-approved environmental compliance report has been submitted for regulatory review.',
        type:    'INFO', entityType: 'Report', entityId: reportId,
        link:    `/regulatory/reports/${reportId}`
      });
    }
  } catch (err) {
    logger.error('[notifyNewReportForRegulatory]', err.message);
  }
};
