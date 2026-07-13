'use strict';

const fs   = require('fs');
const path = require('path');
const { logger } = require('../config/logger');
const { prisma } = require('../config/database');
const { generateReportPdf, generateMonitoringRecordPdf } = require('../utils/pdfGenerator');

/**
 * Report Service
 * Handles PDF/Excel/CSV generation, disk save, S3 upload, signed URL generation
 */

/* ── Local reports storage directory ── */
const REPORTS_DIR = path.join(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  logger.info('[ReportService] Created reports directory:', REPORTS_DIR);
}

/* ══════════════════════════════════════
   GENERATE PDF REPORT
   1. Build buffer with pdfkit
   2. Save to backend/reports/ folder
   3. Persist filename in DB (pdfKey)
   4. Return buffer + filename for streaming
══════════════════════════════════════ */
exports.generatePdf = async (report) => {
  const pdfBuffer = await generateReportPdf(report);

  /* ── Save to local disk ── */
  const filename  = `${report.reportNumber}-${Date.now()}.pdf`;
  const savedPath = path.join(REPORTS_DIR, filename);
  try {
    fs.writeFileSync(savedPath, pdfBuffer);
    logger.info(`[ReportService] PDF saved: ${savedPath}`);
  } catch (err) {
    logger.warn('[ReportService] Could not save PDF to disk:', err.message);
  }

  /* ── Persist filename to DB ── */
  let pdfKey = filename;
  try {
    await prisma.report.update({
      where: { id: report.id },
      data:  { pdfKey: filename }
    });
  } catch (err) {
    logger.warn('[ReportService] Could not persist pdfKey:', err.message);
  }

  /* ── S3 upload in production ── */
  try {
    if (process.env.AWS_S3_BUCKET) {
      const { uploadToS3 } = require('../middleware/upload');
      const s3Key = `reports/pdf/${filename}`;
      await uploadToS3(pdfBuffer, s3Key, 'application/pdf');
      pdfKey = s3Key;
      await prisma.report.update({ where: { id: report.id }, data: { pdfKey: s3Key } });
    }
  } catch (err) {
    logger.warn('[ReportService] S3 upload skipped:', err.message);
  }

  return { pdfBuffer, pdfKey, filename, downloadUrl: `/api/v1/reports/files/${filename}` };
};

/* ══════════════════════════════════════
   GENERATE MONITORING RECORD PDF
   Compact single-record PDF saved to disk
══════════════════════════════════════ */
exports.generateMonitoringPdf = async (record) => {
  const pdfBuffer = await generateMonitoringRecordPdf(record);

  /* Save to disk */
  const monType  = (record.monitoringType || 'MON').replace(/[^A-Za-z0-9]/g, '_');
  const filename = `MON-${monType}-${Date.now()}.pdf`;
  const savedPath = path.join(REPORTS_DIR, filename);
  try {
    fs.writeFileSync(savedPath, pdfBuffer);
    logger.info(`[ReportService] Monitoring PDF saved: ${savedPath}`);
  } catch (err) {
    logger.warn('[ReportService] Could not save monitoring PDF:', err.message);
  }

  return { pdfBuffer, filename, downloadUrl: `/api/v1/reports/files/${filename}` };
};

/* ══════════════════════════════════════
   GENERATE EXCEL REPORT
══════════════════════════════════════ */
exports.generateExcel = async (report) => {
  let ExcelJS;
  try { ExcelJS = require('exceljs'); }
  catch { throw new Error('exceljs not installed'); }

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Environmental Report');

  /* Header row */
  worksheet.columns = [
    { header: 'Parameter',     key: 'parameter',  width: 25 },
    { header: 'Value',         key: 'value',       width: 15 },
    { header: 'Unit',          key: 'unit',        width: 12 },
    { header: 'Standard',      key: 'standard',    width: 20 },
    { header: 'Status',        key: 'status',      width: 15 },
    { header: 'Date',          key: 'date',        width: 20 },
    { header: 'Location',      key: 'location',    width: 25 }
  ];

  /* Title */
  worksheet.insertRow(1, [`EcoSphere — ${report.title || 'Environmental Report'}`]);
  worksheet.insertRow(2, [`Report #: ${report.reportNumber}`, '', '', `Status: ${report.status}`]);
  worksheet.insertRow(3, [`Organization: ${report.organization?.name || ''}`, '', '', `Period: ${report.period || ''}`]);
  worksheet.insertRow(4, []);
  worksheet.getRow(1).font = { bold: true, size: 14 };
  worksheet.getRow(5).font = { bold: true };

  /* Data rows from monitoring records */
  for (const rmr of report.monitoringRecords || []) {
    const rec = rmr.monitoringRecord || rmr;
    const params = rec.parameters || {};
    for (const [key, val] of Object.entries(params)) {
      worksheet.addRow({
        parameter: key,
        value:     val,
        unit:      '',
        standard:  'CPCB',
        status:    rec.complianceStatus || 'N/A',
        date:      rec.recordingDate ? new Date(rec.recordingDate).toLocaleDateString() : '',
        location:  rec.location || ''
      });
    }
  }

  /* Style header */
  worksheet.getRow(5).eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A3D2E' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

/* ══════════════════════════════════════
   GENERATE CSV REPORT
══════════════════════════════════════ */
exports.generateCsv = async (report) => {
  const rows = ['Report Number,Title,Organization,Status,Period,Created At'];
  rows.push([
    report.reportNumber,
    `"${report.title || ''}"`,
    `"${report.organization?.name || ''}"`,
    report.status,
    report.period || '',
    report.createdAt
  ].join(','));

  rows.push('');
  rows.push('Monitoring Records');
  rows.push('Type,Date,Location,Compliance Status,Violations');

  for (const rmr of report.monitoringRecords || []) {
    const rec = rmr.monitoringRecord || rmr;
    rows.push([
      rec.monitoringType || '',
      rec.recordingDate || '',
      `"${rec.location || ''}"`,
      rec.complianceStatus || '',
      rec.violationsCount || 0
    ].join(','));
  }

  return Buffer.from(rows.join('\n'), 'utf-8');
};
