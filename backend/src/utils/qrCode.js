'use strict';

/**
 * QR Code Utility — EcoSphere
 * Generates QR code as: DataURL, Buffer, or SVG string
 */

const { logger } = require('../config/logger');

/* ── Generate QR code as a data URL (PNG) ── */
exports.generateQrDataUrl = async (text, options = {}) => {
  try {
    const QRCode = require('qrcode');
    return await QRCode.toDataURL(text, {
      width:           options.width    || 200,
      margin:          options.margin   || 2,
      color: {
        dark:  options.darkColor  || '#0a3d2e',
        light: options.lightColor || '#ffffff'
      },
      errorCorrectionLevel: options.ecl || 'M'
    });
  } catch (err) {
    logger.error('[QR] DataURL generation failed:', err.message);
    return null;
  }
};

/* ── Generate QR code as a Buffer (PNG) ── */
exports.generateQrBuffer = async (text, options = {}) => {
  try {
    const QRCode = require('qrcode');
    return await QRCode.toBuffer(text, {
      width:  options.width  || 200,
      margin: options.margin || 2,
      type:   'png'
    });
  } catch (err) {
    logger.error('[QR] Buffer generation failed:', err.message);
    return null;
  }
};

/* ── Generate QR code as SVG string ── */
exports.generateQrSvg = async (text) => {
  try {
    const QRCode = require('qrcode');
    return await QRCode.toString(text, { type: 'svg' });
  } catch (err) {
    logger.error('[QR] SVG generation failed:', err.message);
    return null;
  }
};

/* ── Build EcoSphere certificate verification URL ── */
exports.buildVerificationUrl = (verificationHash) => {
  return `${process.env.FRONTEND_URL || 'https://ecosphere.app'}/verify/${verificationHash}`;
};
