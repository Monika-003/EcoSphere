'use strict';

/**
 * Email Templates — EcoSphere
 * All templates return complete HTML strings.
 */

const BASE = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f0fdf4; font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0a3d2e, #16a34a); padding: 30px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p  { color: #86efac; margin: 5px 0 0; font-size: 13px; }
    .body    { padding: 32px; }
    .body h2 { color: #0a3d2e; font-size: 18px; margin-bottom: 12px; }
    .body p  { color: #374151; line-height: 1.6; font-size: 14px; margin: 0 0 14px; }
    .btn     { display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 8px 0; }
    .btn:hover { background: #15803d; }
    .info-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px; border-radius: 6px; margin: 16px 0; }
    .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 6px; margin: 16px 0; }
    .footer { background: #0a3d2e; padding: 20px; text-align: center; }
    .footer p { color: #86efac; font-size: 11px; margin: 4px 0; }
    .footer a { color: #4ade80; text-decoration: none; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 EcoSphere</h1>
      <p>Environmental Compliance Platform</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>This is an automated message from EcoSphere.</p>
      <p>© ${new Date().getFullYear()} EcoSphere Environmental Compliance Platform. All rights reserved.</p>
      <p><a href="https://ecosphere.app/privacy">Privacy Policy</a> · <a href="https://ecosphere.app/unsubscribe">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;

exports.emailTemplates = {

  /* ── Email Verification ── */
  verification: (name, link) => BASE('Verify Your Email — EcoSphere', `
    <h2>Welcome to EcoSphere, ${name}!</h2>
    <p>Thank you for registering. Please verify your email address to activate your account and start managing your environmental compliance journey.</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${link}" class="btn">✅ Verify Email Address</a>
    </p>
    <div class="info-box">
      <p><strong>⏱ This link expires in 24 hours.</strong><br>If you did not create an account, please ignore this email.</p>
    </div>
    <p>If the button above doesn't work, copy and paste this link:<br>
      <a href="${link}" style="color:#16a34a;word-break:break-all">${link}</a>
    </p>
  `),

  /* ── Password Reset ── */
  passwordReset: (name, link) => BASE('Reset Your Password — EcoSphere', `
    <h2>Reset Your Password</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset the password for your EcoSphere account. Click the button below to set a new password:</p>
    <p style="text-align:center;margin:24px 0">
      <a href="${link}" class="btn">🔐 Reset Password</a>
    </p>
    <div class="info-box">
      <p><strong>⏱ This link expires in 1 hour.</strong><br>If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
    </div>
  `),

  /* ── Compliance Alert ── */
  complianceAlert: (name, monitoringType, violations) => {
    const violationList = Array.isArray(violations)
      ? violations.map(v => `<li><strong>${v.parameter}</strong>: ${v.value} ${v.unit} (limit: ${v.limit} ${v.unit}) — ${v.standard}</li>`).join('')
      : '<li>Violations detected. Please review your monitoring dashboard.</li>';

    return BASE(`⚠ Compliance Alert — ${monitoringType}`, `
      <h2>⚠ Compliance Alert</h2>
      <p>Hi ${name},</p>
      <p>A <strong>non-compliant</strong> monitoring record has been detected for <strong>${monitoringType}</strong> monitoring at your facility.</p>
      <div class="alert-box">
        <p><strong>Violations Detected:</strong></p>
        <ul style="margin:8px 0;padding-left:20px;color:#374151">${violationList}</ul>
      </div>
      <p>Please take immediate corrective action and update your monitoring records accordingly.</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${process.env.FRONTEND_URL || 'https://ecosphere.app'}" class="btn">📊 View Dashboard</a>
      </p>
    `);
  },

  /* ── Lab Approval ── */
  labApproval: (name, reportNumber) => BASE('Lab Review Approved — EcoSphere', `
    <h2>✅ Laboratory Review Approved</h2>
    <p>Hi ${name},</p>
    <p>Great news! Your environmental compliance report <strong>${reportNumber}</strong> has been reviewed and <strong>approved by the laboratory</strong>.</p>
    <div class="info-box">
      <p>Your report will now be forwarded to the Regulatory Authority for final review and certificate issuance.</p>
    </div>
    <p style="text-align:center;margin:24px 0">
      <a href="${process.env.FRONTEND_URL || 'https://ecosphere.app'}" class="btn">📄 View Report</a>
    </p>
  `),

  /* ── Certificate Issued ── */
  certificateIssued: (name, certNumber, downloadUrl) => BASE('Environmental Certificate Issued — EcoSphere', `
    <h2>🏆 Certificate Issued!</h2>
    <p>Hi ${name},</p>
    <p>Congratulations! Your <strong>Environmental Compliance Certificate</strong> has been officially issued.</p>
    <div class="info-box">
      <p><strong>Certificate Number:</strong> ${certNumber}<br>
      This certificate validates your organization's environmental compliance with applicable Indian environmental standards.</p>
    </div>
    ${downloadUrl ? `<p style="text-align:center;margin:24px 0"><a href="${downloadUrl}" class="btn">⬇ Download Certificate</a></p>` : ''}
    <p>You can verify this certificate at any time using the QR code on the certificate or via our online verification portal.</p>
  `)
};
