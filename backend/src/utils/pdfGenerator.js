'use strict';

/**
 * PDF Generator — EcoSphere
 * Uses pdfkit to generate:
 *  - Environmental Compliance Reports (with QR watermark)
 *  - Environmental Compliance Certificates (with QR, digital signature line)
 */

const PDFDocument = require('pdfkit');
const { logger }  = require('../config/logger');

/* ── Brand colors ── */
const COLORS = {
  primary:   '#0a3d2e',
  secondary: '#16a34a',
  accent:    '#22c55e',
  dark:      '#0f172a',
  gray:      '#64748b',
  light:     '#f0fdf4',
  white:     '#ffffff',
  gold:      '#d97706'
};

/* ══════════════════════════════════════
   GENERATE REPORT PDF
══════════════════════════════════════ */
exports.generateReportPdf = async (report) => {
  return new Promise((resolve, reject) => {
    try {
      const W   = 595;   /* A4 width pt */
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true, info: { Title: report.reportNumber, Author: 'EcoSphere Platform' } });
      const buffers = [];
      doc.on('data',  c => buffers.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const org = report.organization || {};
      const reviews = report.reviews  || [];

      /* ──────────────────────────────────────
         HELPERS
      ────────────────────────────────────── */
      const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A';
      const safe    = v => (v != null && v !== '') ? String(v) : 'N/A';
      const colSum  = arr => arr.reduce((a,b) => a+b, 0);

      /* Draw a horizontal bar: label | [████░░░░░] pct% */
      function drawBar(label, used, limit, barY, barWidth) {
        const pct   = limit > 0 ? Math.min(used / limit, 1) : 0;
        const pctLbl = limit > 0 ? `${(pct*100).toFixed(1)}%` : '—';
        const barFill = pct > 0.9 ? '#dc2626' : pct > 0.7 ? '#f59e0b' : '#16a34a';
        const trackW  = barWidth - 160;
        const fillW   = Math.max(2, trackW * pct);

        doc.fontSize(7.5).fillColor(COLORS.dark).text(label.slice(0,28), 54, barY + 3, { width: 130, lineBreak: false });
        /* Track background */
        doc.rect(190, barY, trackW, 10).fill('#e2e8f0');
        /* Fill */
        doc.rect(190, barY, fillW, 10).fill(barFill);
        /* Values */
        doc.fontSize(7).fillColor(COLORS.dark)
           .text(`${safe(used)} / ${safe(limit)}`, 192 + trackW + 4, barY + 2, { lineBreak: false });
        doc.fillColor(pct > 0.9 ? '#dc2626' : '#374151')
           .text(` (${pctLbl})`, 192 + trackW + 44, barY + 2, { lineBreak: false });
      }

      /* Draw a mini vertical bar chart for up to 6 bars */
      function drawVertBars(labels, values, limits, startX, startY, chartW, chartH) {
        const maxVal  = Math.max(...values, ...limits, 1);
        const barW    = Math.floor((chartW - 10) / labels.length) - 4;
        const axisX   = startX + 30;
        const axisW   = chartW - 30;

        /* Y axis */
        doc.moveTo(axisX, startY).lineTo(axisX, startY + chartH).stroke('#cbd5e1');
        /* X axis */
        doc.moveTo(axisX, startY + chartH).lineTo(axisX + axisW, startY + chartH).stroke('#cbd5e1');

        /* Limit line */
        if (limits.length > 0) {
          const avgLim = limits.reduce((a,b)=>a+b,0)/limits.length;
          const limY   = startY + chartH - (avgLim / maxVal) * chartH;
          doc.save().dash(3,{space:2})
             .moveTo(axisX, limY).lineTo(axisX + axisW, limY)
             .stroke('#f59e0b').undash().restore();
          doc.fontSize(6).fillColor('#b45309').text('Limit', axisX - 28, limY - 4, { width:28, align:'right' });
        }

        labels.forEach((lbl, i) => {
          const bX   = axisX + i * (barW + 4) + 4;
          const bH   = Math.max(2, (values[i] / maxVal) * chartH);
          const bY   = startY + chartH - bH;
          const lim  = limits[i] || 0;
          const pct  = lim > 0 ? values[i] / lim : 0;
          const col  = pct > 1 ? '#dc2626' : pct > 0.8 ? '#f59e0b' : '#1d4ed8';

          doc.rect(bX, bY, barW, bH).fill(col);
          /* X label */
          doc.fontSize(5.5).fillColor('#64748b').text(lbl.slice(0,8), bX, startY + chartH + 3, { width: barW + 4, align:'center' });
          /* Value above bar */
          doc.fontSize(5.5).fillColor(COLORS.dark).text(String(values[i]), bX, bY - 8, { width: barW + 4, align:'center' });
        });
      }

      /* Section heading */
      function sectionHead(title, icon) {
        if (doc.y > 700) doc.addPage();
        doc.moveDown(0.6);
        const sy = doc.y;
        doc.rect(50, sy, W - 100, 18).fill(COLORS.primary);
        doc.fontSize(9).fillColor(COLORS.white).text((icon || '▸') + '  ' + title, 57, sy + 5, { width: W - 114 });
        doc.y = sy + 22;
      }

      /* Footer — called on every page */
      function drawFooter() {
        const fY = doc.page.height - 38;
        doc.rect(0, fY, W, 38).fill(COLORS.primary);
        doc.fontSize(7.5).fillColor(COLORS.white)
           .text(`EcoSphere Environmental Compliance Platform  ·  ${report.reportNumber}  ·  Computer-generated document — do not alter`,
             50, fY + 13, { align: 'center', width: W - 100 });
      }

      /* ══════════════════════════════════════
         PAGE 1 — COVER
      ══════════════════════════════════════ */

      /* Header */
      doc.rect(0, 0, W, 90).fill(COLORS.primary);
      doc.fontSize(20).fillColor(COLORS.white).text('EcoSphere Environmental Compliance Platform', 50, 18);
      doc.fontSize(10).fillColor(COLORS.accent).text('Official Environmental Compliance Report', 50, 46);
      doc.fontSize(8).fillColor('#93c5fd').text(`Generated: ${fmtDate(new Date())}`, W - 200, 70, { width: 155, align: 'right' });

      /* Report title block */
      doc.moveDown(2.5);
      doc.fontSize(15).fillColor(COLORS.dark).text(report.title || 'Environmental Compliance Report', { align: 'center' });
      doc.moveDown(0.3);

      /* Status pill */
      const STATUS_COLORS = {
        LAB_APPROVED:       ['#16a34a', '#dcfce7'],
        LAB_REJECTED:       ['#dc2626', '#fee2e2'],
        CERTIFIED:          ['#16a34a', '#dcfce7'],
        REG_APPROVED:       ['#16a34a', '#dcfce7'],
        LAB_CORRECTION_REQUESTED: ['#d97706', '#fef3c7'],
        REG_CORRECTION_REQUESTED: ['#d97706', '#fef3c7'],
        SUBMITTED_TO_LAB:   ['#1d4ed8', '#dbeafe'],
        LAB_UNDER_REVIEW:   ['#1d4ed8', '#dbeafe'],
        SUBMITTED_TO_REGULATORY: ['#7c3aed', '#ede9fe'],
        REG_UNDER_REVIEW:   ['#7c3aed', '#ede9fe'],
      };
      const stColor  = (STATUS_COLORS[report.status] || [COLORS.gray, '#f1f5f9'])[0];
      const stBg     = (STATUS_COLORS[report.status] || [COLORS.gray, '#f1f5f9'])[1];
      const stLabel  = (report.status || 'DRAFT').replace(/_/g, ' ');
      const stLblW   = 140;
      const stLblX   = (W - stLblW) / 2;
      doc.roundedRect(stLblX, doc.y, stLblW, 20, 5).fill(stBg);
      doc.fontSize(9).fillColor(stColor).text(stLabel, stLblX, doc.y - 15, { width: stLblW, align: 'center' });
      doc.moveDown(1.2);

      /* Meta row */
      doc.fontSize(8.5).fillColor(COLORS.gray)
        .text(`Report No: `, 50, doc.y, { continued: true }).fillColor(COLORS.dark).text(safe(report.reportNumber), { continued: true })
        .fillColor(COLORS.gray).text(`   |   Period: `, { continued: true }).fillColor(COLORS.dark).text(safe(report.period), { continued: true })
        .fillColor(COLORS.gray).text(`   |   From: `, { continued: true }).fillColor(COLORS.dark).text(fmtDate(report.periodStartDate), { continued: true })
        .fillColor(COLORS.gray).text(`  –  To: `, { continued: true }).fillColor(COLORS.dark).text(fmtDate(report.periodEndDate));
      doc.moveDown(0.8);

      /* ── ORGANIZATION DETAILS BOX ── */
      sectionHead('Organization Details', '🏭');
      const odY = doc.y;
      const odH = 130;
      doc.rect(50, odY, W - 100, odH).fill('#f8fafc').stroke('#e2e8f0');
      doc.y = odY + 8;

      const col1 = 60, col2 = 310;
      const rowH = 15;
      const orgRows1 = [
        ['Organization Name',    safe(org.name)],
        ['Registration Number',  safe(org.registrationNumber)],
        ['GST Number',           safe(org.gstNumber)],
        ['Industry Type',        safe(org.industryType)],
        ['Establishment Year',   safe(org.establishmentYear)],
        ['Employee Count',       safe(org.employeeCount)],
        ['Facility Type',        safe(org.facilityType || org.industryType)],
        ['Existing Certificates', (org.existingCerts || []).join(', ') || 'None']
      ];
      const orgRows2 = [
        ['Address',   safe(org.address)],
        ['City',      safe(org.city)],
        ['State',     safe(org.state)],
        ['Pincode',   safe(org.postalCode || org.pincode)],
        ['Head Name', safe(org.headName)],
        ['Designation', safe(org.headDesignation)],
        ['Contact Email', safe(org.contactEmail || org.headEmail)],
        ['Contact Phone', safe(org.contactPhone || org.headPhone)]
      ];

      let rowY = odY + 10;
      orgRows1.forEach(([lbl, val]) => {
        doc.fontSize(7.5).fillColor(COLORS.gray).text(lbl + ':', col1, rowY, { width: 120, lineBreak: false });
        doc.fillColor(COLORS.dark).text(val.slice(0, 30), col1 + 125, rowY, { width: 130, lineBreak: false });
        rowY += rowH;
      });
      rowY = odY + 10;
      orgRows2.forEach(([lbl, val]) => {
        doc.fontSize(7.5).fillColor(COLORS.gray).text(lbl + ':', col2, rowY, { width: 90, lineBreak: false });
        doc.fillColor(COLORS.dark).text(val.slice(0, 30), col2 + 95, rowY, { width: 130, lineBreak: false });
        rowY += rowH;
      });
      doc.y = odY + odH + 8;

      /* ── SUSTAINABILITY GOALS ── */
      if (org.sustainabilityGoals) {
        doc.fontSize(8).fillColor(COLORS.gray).text('Sustainability Goals: ', 50, doc.y, { continued: true });
        doc.fillColor(COLORS.dark).text(org.sustainabilityGoals.slice(0, 200));
        doc.moveDown(0.4);
      }

      /* ══════════════════════════════════════
         LAB / REGULATORY DECISION BANNER
         Prominently shown in bold colored box
      ══════════════════════════════════════ */
      const labReviews = reviews.filter(r => r.reviewStage === 'LABORATORY');
      const regReviews = reviews.filter(r => r.reviewStage === 'REGULATORY');

      if (labReviews.length > 0) {
        sectionHead('Laboratory Review Decision', '🔬');
        labReviews.forEach(rv => {
          const isApproved  = rv.status === 'APPROVED';
          const isRejected  = rv.status === 'REJECTED';
          const boxBg       = isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7';
          const boxBorder   = isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#f59e0b';
          const boxTextMain = isApproved ? '#15803d' : isRejected ? '#991b1b' : '#92400e';

          const bY  = doc.y;
          const bH  = 70;
          doc.rect(50, bY, W - 100, bH).fill(boxBg).stroke(boxBorder);
          /* Left accent bar */
          doc.rect(50, bY, 5, bH).fill(boxBorder);

          /* Bold verdict */
          const verdict = isApproved ? '✔  LABORATORY APPROVED'
                        : isRejected ? '✘  LABORATORY REJECTED'
                        :              '⚠  CORRECTION REQUESTED';
          doc.fontSize(14).fillColor(boxTextMain).text(verdict, 65, bY + 10);

          /* Details */
          const reviewer = rv.reviewedBy ? `${rv.reviewedBy.firstName} ${rv.reviewedBy.lastName}` : 'Lab Reviewer';
          const labName  = rv.laboratory ? rv.laboratory.name : 'Accredited Laboratory';
          doc.fontSize(8.5).fillColor(boxTextMain)
            .text(`Reviewed by: ${reviewer}  ·  ${labName}  ·  Date: ${fmtDate(rv.reviewedAt)}`, 65, bY + 32);

          if (rv.comments) {
            doc.fontSize(8).fillColor(COLORS.dark)
               .text(`Remarks: ${rv.comments.slice(0, 200)}`, 65, bY + 46, { width: W - 130 });
          }
          doc.y = bY + bH + 8;

          /* Technical & compliance scores */
          if (rv.technicalScore != null || rv.complianceScore != null) {
            const sY = doc.y;
            doc.rect(50, sY, (W-100)/2 - 4, 28).fill('#eff6ff');
            doc.rect(50 + (W-100)/2 + 4, sY, (W-100)/2 - 4, 28).fill('#f0fdf4');
            doc.fontSize(8).fillColor('#1e40af').text(`Technical Score`, 60, sY + 5);
            doc.fontSize(12).fillColor('#1d4ed8').text(`${rv.technicalScore != null ? Number(rv.technicalScore).toFixed(1) : '—'} / 100`, 60, sY + 14);
            doc.fontSize(8).fillColor('#15803d').text(`Compliance Score`, 60 + (W-100)/2 + 4, sY + 5);
            doc.fontSize(12).fillColor('#16a34a').text(`${rv.complianceScore != null ? Number(rv.complianceScore).toFixed(1) : '—'} / 100`, 60 + (W-100)/2 + 4, sY + 14);
            doc.y = sY + 36;
          }

          /* Correction notes if any */
          if (rv.correctionNotes) {
            doc.moveDown(0.3);
            doc.rect(50, doc.y, W - 100, 22).fill('#fff7ed').stroke('#fed7aa');
            doc.fontSize(8).fillColor('#92400e')
               .text(`Correction Required: ${rv.correctionNotes.slice(0, 250)}`, 56, doc.y - 18, { width: W - 120 });
            doc.moveDown(0.8);
          }
          doc.moveDown(0.5);
        });
      }

      if (regReviews.length > 0) {
        sectionHead('Regulatory Authority Decision', '🏛');
        regReviews.forEach(rv => {
          const isApproved = rv.status === 'APPROVED';
          const isRejected = rv.status === 'REJECTED';
          const boxBg      = isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7';
          const boxBorder  = isApproved ? '#16a34a' : isRejected ? '#dc2626' : '#f59e0b';
          const boxText    = isApproved ? '#15803d' : isRejected ? '#991b1b' : '#92400e';

          const bY = doc.y;
          const bH = 68;
          doc.rect(50, bY, W - 100, bH).fill(boxBg).stroke(boxBorder);
          doc.rect(50, bY, 5, bH).fill(boxBorder);

          const verdict = isApproved ? '✔  REGULATORY APPROVED / CERTIFIED'
                        : isRejected ? '✘  REGULATORY REJECTED'
                        :              '⚠  REGULATORY CORRECTION REQUESTED';
          doc.fontSize(14).fillColor(boxText).text(verdict, 65, bY + 10);

          const authName  = rv.authority ? rv.authority.name : 'Regulatory Authority';
          const reviewer2 = rv.reviewedBy ? `${rv.reviewedBy.firstName} ${rv.reviewedBy.lastName}` : 'Regulatory Officer';
          doc.fontSize(8.5).fillColor(boxText)
            .text(`Reviewed by: ${reviewer2}  ·  ${authName}  ·  Date: ${fmtDate(rv.reviewedAt)}`, 65, bY + 32);
          if (rv.comments) {
            doc.fontSize(8).fillColor(COLORS.dark)
               .text(`Remarks: ${rv.comments.slice(0, 200)}`, 65, bY + 46, { width: W - 130 });
          }
          doc.y = bY + bH + 10;
        });
      }

      /* ══════════════════════════════════════
         PAGE 2 — MONITORING SUMMARY + CHARTS
      ══════════════════════════════════════ */
      if (doc.y > 560) doc.addPage();

      const records = (report.monitoringRecords || []).map(r => r.monitoringRecord || r);

      /* ── Summary table ── */
      sectionHead('Monitoring Records Summary', '📋');

      const sumHdr = ['Type', 'Date', 'Station', 'Compliance', 'Violations'];
      const sumW   = [90, 75, 125, 95, 60];
      let   sx = 50, sy2 = doc.y;

      doc.rect(sx, sy2, colSum(sumW), 18).fill(COLORS.primary);
      sumHdr.forEach((h, i) => {
        doc.fontSize(7.5).fillColor(COLORS.white)
           .text(h, sx + colSum(sumW.slice(0,i)) + 4, sy2 + 5, { width: sumW[i]-8, lineBreak: false });
      });
      sy2 += 18;

      if (records.length === 0) {
        doc.rect(sx, sy2, colSum(sumW), 20).fill(COLORS.light);
        doc.fontSize(8).fillColor(COLORS.gray).text('No monitoring data recorded for this period.', sx + 4, sy2 + 6, { width: 440 });
        sy2 += 20;
      } else {
        records.slice(0, 25).forEach((rec, idx) => {
          if (sy2 > 730) { doc.addPage(); sy2 = 50; }
          doc.rect(sx, sy2, colSum(sumW), 16).fill(idx % 2 === 0 ? COLORS.light : COLORS.white);
          const cells = [
            (rec.monitoringType || '').replace(/_/g,' '),
            fmtDate(rec.recordingDate),
            (rec.station ? rec.station.name : rec.location || '').slice(0,18),
            rec.complianceStatus || 'UNDER REVIEW',
            String(rec.violationsCount || 0)
          ];
          cells.forEach((cell, i) => {
            const cc = cell === 'NON_COMPLIANT' ? '#dc2626'
                     : cell === 'COMPLIANT'     ? '#16a34a'
                     : COLORS.dark;
            doc.fontSize(7).fillColor(cc)
               .text(cell, sx + colSum(sumW.slice(0,i)) + 4, sy2 + 4, { width: sumW[i]-8, lineBreak: false });
          });
          sy2 += 16;
        });
      }
      doc.y = sy2 + 6;

      /* ── PARAMETER USAGE BAR CHARTS (% of limit) ── */
      if (records.length > 0) {
        sectionHead('Parameter Usage vs. Regulatory Limits', '📊');

        /* CPCB standard limits per parameter key pattern */
        const LIMITS = {
          PM10: 100, PM2_5: 60, SO2: 80, NO2: 80, CO: 2, O3: 100,
          pH: 8.5, BOD: 30, COD: 250, TSS: 100, TDS: 2100, Turbidity: 10,
          Noise: 75, Temperature: 40, Humidity: 80,
          Lead: 0.1, Arsenic: 0.05, Mercury: 0.001, Cadmium: 0.01,
          Scope1_Fuel_Combustion_tCO2e: 800, Scope2_Purchased_Electricity_tCO2e: 600
        };

        /* Collect unique parameters across all records */
        const paramSums = {};
        records.forEach(rec => {
          const params = rec.parameters || {};
          Object.entries(params).forEach(([k, v]) => {
            const numV = parseFloat(typeof v === 'object' ? v.value : v);
            if (!isNaN(numV)) {
              if (!paramSums[k]) paramSums[k] = { total: 0, count: 0 };
              paramSums[k].total += numV;
              paramSums[k].count++;
            }
          });
        });

        const paramEntries = Object.entries(paramSums).slice(0, 16);
        if (paramEntries.length > 0) {
          let bY2 = doc.y;
          paramEntries.forEach(([key, stat], pi) => {
            if (bY2 > 720) { doc.addPage(); bY2 = 60; }
            const avg   = stat.total / stat.count;
            const lim   = LIMITS[key] || LIMITS[key.split('_')[0]] || 0;
            drawBar(key.replace(/_/g,' '), avg.toFixed(2), lim || '—', bY2, W - 100);
            bY2 += 16;
          });
          doc.y = bY2 + 8;

          /* Legend */
          doc.fontSize(7).fillColor('#16a34a').text('■ ≤70% of limit (Safe)', 54, doc.y, { continued: true });
          doc.fillColor('#f59e0b').text('   ■ 70–90% (Warning)', { continued: true });
          doc.fillColor('#dc2626').text('   ■ >90% (Critical)');
          doc.moveDown(0.5);
        }

        /* ── VERTICAL BAR CHART — per-type compliance score ── */
        sectionHead('Compliance Score by Monitoring Type', '📈');

        const typeScores = {};
        records.forEach(rec => {
          const t = (rec.monitoringType || 'UNKNOWN').replace(/_/g,' ').slice(0,10);
          if (!typeScores[t]) typeScores[t] = { sum: 0, cnt: 0 };
          /* Treat COMPLIANT as 100, NON_COMPLIANT as 0, WARNING as 50 */
          const sc = rec.complianceStatus === 'COMPLIANT'     ? 100
                   : rec.complianceStatus === 'NON_COMPLIANT' ? 0
                   : rec.complianceStatus === 'WARNING'        ? 50
                   : 70;
          typeScores[t].sum += sc;
          typeScores[t].cnt++;
        });

        const chartLabels = Object.keys(typeScores).slice(0, 6);
        const chartVals   = chartLabels.map(k => Math.round(typeScores[k].sum / typeScores[k].cnt));
        const chartLimits = chartLabels.map(() => 80); /* 80% is the passing benchmark */

        if (chartLabels.length > 0 && doc.y < 680) {
          const cY = doc.y + 5;
          drawVertBars(chartLabels, chartVals, chartLimits, 50, cY, W - 100, 90);
          doc.y = cY + 100;
          doc.fontSize(7).fillColor('#b45309').text('— — Minimum compliance benchmark: 80%', 60, doc.y);
          doc.moveDown(0.6);
        }

        /* ── DETAILED PARAMETER MEASUREMENTS ── */
        sectionHead('Detailed Parameter Measurements', '🔎');

        const pColW = [155, 80, 75, 90, 45];
        const pHdrs = ['Parameter', 'Measured Value', 'Unit', 'Status', 'Limit'];

        records.slice(0, 20).forEach(rec => {
          const params    = rec.parameters || {};
          const paramList = Object.entries(params);
          if (paramList.length === 0) return;
          if (doc.y > 690) doc.addPage();

          const recDate  = fmtDate(rec.recordingDate);
          const recType  = (rec.monitoringType || 'Monitoring').replace(/_/g,' ');
          const station  = rec.station ? `${rec.station.name} (${rec.station.stationCode || ''})` : (rec.location || 'N/A');
          const stTxt    = rec.complianceStatus || 'UNDER REVIEW';
          const stCol    = stTxt === 'COMPLIANT' ? '#16a34a' : stTxt === 'NON_COMPLIANT' ? '#dc2626' : COLORS.gold;

          const subY2 = doc.y;
          doc.rect(50, subY2, W-100, 15).fill(COLORS.secondary);
          doc.fontSize(7.5).fillColor(COLORS.white)
             .text(`${recType}  ·  ${recDate}  ·  ${station}`, 55, subY2 + 4, { width: W - 170, lineBreak: false });
          doc.fontSize(7.5).fillColor(stCol === '#16a34a' ? '#bbf7d0' : stCol === '#dc2626' ? '#fecaca' : '#fde68a')
             .text(stTxt, W - 160, subY2 + 4, { width: 100, align: 'right', lineBreak: false });
          doc.y = subY2 + 15 + 2;

          /* mini-table header */
          let px = 50, py2 = doc.y;
          doc.rect(px, py2, colSum(pColW), 12).fill(COLORS.primary);
          pHdrs.forEach((h, i) => {
            doc.fontSize(6.5).fillColor(COLORS.white)
               .text(h, px + colSum(pColW.slice(0,i)) + 3, py2 + 3, { width: pColW[i]-6, lineBreak: false });
          });
          py2 += 12;

          paramList.forEach(([pKey, pVal], pi) => {
            if (py2 > 750) { doc.addPage(); py2 = 50; }
            doc.rect(px, py2, colSum(pColW), 13).fill(pi % 2 === 0 ? COLORS.light : COLORS.white);

            const v      = (pVal && typeof pVal === 'object') ? pVal : { value: pVal };
            const numVal = parseFloat(v.value !== undefined ? v.value : pVal);
            const lim    = LIMITS[pKey] || LIMITS[pKey.split('_')[0]] || '—';
            const pct2   = (lim !== '—' && !isNaN(numVal)) ? numVal / lim : 0;
            const sColor = (v.status === 'NON_COMPLIANT' || v.status === 'CRITICAL' || pct2 > 1) ? '#dc2626'
                         : (v.status === 'COMPLIANT'     || v.status === 'NORMAL'   || pct2 <= 0.7) ? '#16a34a'
                         :  v.status === 'WARNING'                                  ? COLORS.gold
                         : COLORS.dark;

            const cells2   = [String(pKey).replace(/_/g,' '), String(v.value !== undefined ? v.value : pVal), String(v.unit || '—'), String(v.status || '—'), String(lim)];
            const cColors2 = [COLORS.dark, COLORS.dark, COLORS.gray, sColor, '#64748b'];
            cells2.forEach((cell, i) => {
              doc.fontSize(6.5).fillColor(cColors2[i])
                 .text(cell, px + colSum(pColW.slice(0,i)) + 3, py2 + 3, { width: pColW[i]-6, lineBreak: false });
            });
            py2 += 13;
          });

          /* AI analysis */
          if (rec.aiAnalysis) {
            doc.y = py2 + 3;
            doc.fontSize(7).fillColor(COLORS.gray).text('AI: ', { continued: true });
            const aiTxt = typeof rec.aiAnalysis === 'string' ? rec.aiAnalysis : (rec.aiAnalysis.summary || JSON.stringify(rec.aiAnalysis));
            doc.fillColor(COLORS.dark).text(aiTxt.slice(0, 300));
            py2 = doc.y;
          }
          doc.y = py2 + 8;
        });
      }

      /* ── AI Recommendations ── */
      if (report.aiRecommendations) {
        sectionHead('AI Recommendations', '🤖');
        doc.fontSize(8.5).fillColor(COLORS.dark).text(
          typeof report.aiRecommendations === 'string' ? report.aiRecommendations : JSON.stringify(report.aiRecommendations),
          50, doc.y, { width: W - 100 }
        );
        doc.moveDown(0.5);
      }

      /* ── Signature / Certification block ── */
      if (doc.y > 650) doc.addPage();
      doc.moveDown(1);
      doc.rect(50, doc.y, W - 100, 55).stroke('#e2e8f0');
      const sigY = doc.y + 8;
      doc.fontSize(8).fillColor(COLORS.gray).text('Authorized Signatory', 70, sigY);
      doc.fontSize(8).fillColor(COLORS.gray).text('Laboratory Stamp', 230, sigY);
      doc.fontSize(8).fillColor(COLORS.gray).text('Regulatory Officer', 390, sigY);
      doc.moveTo(70, sigY + 30).lineTo(195, sigY + 30).stroke('#94a3b8');
      doc.moveTo(230, sigY + 30).lineTo(355, sigY + 30).stroke('#94a3b8');
      doc.moveTo(390, sigY + 30).lineTo(515, sigY + 30).stroke('#94a3b8');
      doc.fontSize(7).fillColor(COLORS.gray)
        .text('Signature & Date', 70, sigY + 33)
        .text('NABL Accredited Lab', 230, sigY + 33)
        .text('Govt. Authority Seal', 390, sigY + 33);
      doc.y = sigY + 58;

      /* ── Footer on every page ── */
      const totalPages = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
      for (let pi = 0; pi < totalPages; pi++) {
        doc.switchToPage(pi);
        drawFooter();
      }

      doc.end();
    } catch (err) {
      logger.error('[PDFGenerator] Report error:', err);
      reject(err);
    }
  });
};

/* ══════════════════════════════════════
   GENERATE MONITORING RECORD PDF
   Compact one-page PDF for a single monitoring record
══════════════════════════════════════ */
exports.generateMonitoringRecordPdf = async (record) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 45, size: 'A4', info: { Title: 'Monitoring Record', Author: 'EcoSphere Platform' } });
      const buffers = [];

      doc.on('data',  chunk => buffers.push(chunk));
      doc.on('end',   ()    => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = doc.page.width;

      /* ─ Header ─ */
      doc.rect(0, 0, W, 72).fill(COLORS.primary);
      doc.fontSize(18).fillColor(COLORS.white).text('EcoSphere Environmental Platform', 45, 14);
      doc.fontSize(10).fillColor(COLORS.accent).text('Monitoring Record Report', 45, 40);
      doc.fontSize(9).fillColor(COLORS.white).text(
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        W - 200, 54, { width: 160, align: 'right' }
      );

      doc.moveDown(2.5);

      /* ─ Record identity banner ─ */
      const bannerY = doc.y;
      doc.rect(45, bannerY, W - 90, 52).fill(COLORS.light);
      const typeLabel = (record.monitoringType || 'MONITORING').replace(/_/g, ' ');
      doc.fontSize(13).fillColor(COLORS.primary).text(typeLabel + ' Record', 55, bannerY + 8);

      const statusColor = record.complianceStatus === 'COMPLIANT'     ? COLORS.secondary
                        : record.complianceStatus === 'NON_COMPLIANT' ? '#dc2626'
                        : COLORS.gold;
      doc.fontSize(9).fillColor(COLORS.gray)
        .text(`Record Date: ${record.recordingDate ? new Date(record.recordingDate).toLocaleDateString('en-IN') : 'N/A'}`, 55, bannerY + 28)
        .text(`Location: ${record.location || 'N/A'}`, 55, bannerY + 40);
      doc.fontSize(10).fillColor(statusColor)
        .text(record.complianceStatus || 'UNDER REVIEW', W - 170, bannerY + 22, { width: 130, align: 'right' });

      doc.moveDown(3.5);

      /* ─ Organization & Submission info ─ */
      doc.fontSize(12).fillColor(COLORS.primary).text('Submission Details');
      doc.moveDown(0.2);
      const info = [
        ['Organization ID', record.organizationId ? record.organizationId.slice(0, 18) + '…' : 'N/A'],
        ['Record ID',       record.id             ? record.id.slice(0, 18) + '…'             : 'N/A'],
        ['Shift',           record.shift          || 'N/A'],
        ['Source',          record.sourceType     || 'MANUAL'],
        ['Station',         record.station?.name  || record.stationId || 'N/A'],
        ['Sampling Method', record.samplingMethod || 'N/A'],
        ['Violations',      String(record.violationsCount || 0)]
      ];
      info.forEach(([label, value]) => {
        doc.fontSize(9).fillColor(COLORS.gray).text(`${label}: `, { continued: true });
        doc.fillColor(COLORS.dark).text(value);
      });
      doc.moveDown(0.8);

      /* ─ Measured Parameters ─ */
      doc.fontSize(12).fillColor(COLORS.primary).text('Measured Parameters');
      doc.moveDown(0.3);

      const params = record.parameters || {};
      const paramEntries = Object.entries(params);
      if (paramEntries.length === 0) {
        doc.fontSize(9).fillColor(COLORS.gray).text('No parameters recorded.');
      } else {
        /* Table header */
        const colW = [200, 140, 140];
        let x = 45, y = doc.y;
        doc.rect(x, y, colW.reduce((a,b)=>a+b,0), 18).fill(COLORS.primary);
        ['Parameter', 'Value', 'Unit / Notes'].forEach((h, i) => {
          const cx = x + colW.slice(0,i).reduce((a,b)=>a+b,0);
          doc.fontSize(8).fillColor(COLORS.white).text(h, cx + 4, y + 5, { width: colW[i]-8 });
        });
        y += 18;

        paramEntries.forEach(([key, val], idx) => {
          if (y > 740) { doc.addPage(); y = 50; }
          const rowColor = idx % 2 === 0 ? COLORS.light : COLORS.white;
          doc.rect(x, y, colW.reduce((a,b)=>a+b,0), 16).fill(rowColor);
          const cells = [String(key), String(val), ''];
          cells.forEach((cell, i) => {
            const cx = x + colW.slice(0,i).reduce((a,b)=>a+b,0);
            doc.fontSize(8).fillColor(COLORS.dark).text(cell, cx + 4, y + 4, { width: colW[i]-8 });
          });
          y += 16;
        });
        doc.y = y + 10;
      }

      /* ─ AI Analysis ─ */
      if (record.aiAnalysis) {
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor(COLORS.primary).text('AI Analysis');
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(COLORS.dark).text(
          typeof record.aiAnalysis === 'string' ? record.aiAnalysis : JSON.stringify(record.aiAnalysis)
        );
      }

      /* ─ Recommendations ─ */
      if (record.aiRecommendations) {
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor(COLORS.primary).text('Recommendations');
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(COLORS.dark).text(
          typeof record.aiRecommendations === 'string' ? record.aiRecommendations : JSON.stringify(record.aiRecommendations)
        );
      }

      /* ─ Remarks ─ */
      if (record.remarks) {
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor(COLORS.primary).text('Remarks');
        doc.moveDown(0.2);
        doc.fontSize(9).fillColor(COLORS.dark).text(record.remarks);
      }

      /* ─ Footer ─ */
      doc.rect(0, doc.page.height - 36, W, 36).fill(COLORS.primary);
      doc.fontSize(7.5).fillColor(COLORS.white)
        .text(
          `EcoSphere Platform | Monitoring Record | ${record.monitoringType || ''} | Computer-generated document`,
          45, doc.page.height - 24, { align: 'center' }
        );

      doc.end();
    } catch (err) {
      logger.error('[PDFGenerator] Monitoring record error:', err);
      reject(err);
    }
  });
};

/* ══════════════════════════════════════
   GENERATE CERTIFICATE PDF
══════════════════════════════════════ */
exports.generateCertificatePdf = async ({ certificate, qrCodeUrl }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 60, size: 'A4', info: { Title: certificate.certificateNumber } });
      const buffers = [];

      doc.on('data',  chunk => buffers.push(chunk));
      doc.on('end',   ()    => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = doc.page.width, H = doc.page.height;

      /* ─ Gold border ─ */
      doc.rect(20, 20, W - 40, H - 40).lineWidth(3).stroke(COLORS.gold);
      doc.rect(25, 25, W - 50, H - 50).lineWidth(1).stroke(COLORS.accent);

      /* ─ Header ─ */
      doc.rect(0, 0, W, 100).fill(COLORS.primary);
      doc.fontSize(9).fillColor(COLORS.accent).text('ECOSPHERE ENVIRONMENTAL COMPLIANCE PLATFORM', 0, 25, { align: 'center' });
      doc.fontSize(22).fillColor(COLORS.white).text('CERTIFICATE OF COMPLIANCE', 0, 42, { align: 'center' });
      doc.fontSize(10).fillColor(COLORS.accent).text('Environmental Management & Sustainability', 0, 72, { align: 'center' });

      /* ─ Cert number ─ */
      doc.moveDown(2);
      doc.fontSize(13).fillColor(COLORS.gold).text(`Certificate No: ${certificate.certificateNumber}`, { align: 'center' });

      /* ─ Main text ─ */
      doc.moveDown(1);
      doc.fontSize(12).fillColor(COLORS.dark).text('This is to certify that', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(20).fillColor(COLORS.primary).text(
        certificate.organization?.name || 'Organization Name', { align: 'center', underline: true }
      );
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor(COLORS.gray).text(
        `${certificate.organization?.industryType || ''} | ${certificate.organization?.city || ''}, ${certificate.organization?.state || ''}`,
        { align: 'center' }
      );
      doc.moveDown(1);
      doc.fontSize(11).fillColor(COLORS.dark).text(
        'has been assessed and found to be in compliance with applicable Environmental Standards and Regulations.',
        { align: 'center' }
      );

      /* ─ Certificate details ─ */
      doc.moveDown(1);
      const detailY = doc.y;
      doc.rect(80, detailY, W - 160, 100).fill(COLORS.light);

      const details = [
        ['Certificate Type',  certificate.certificateType?.replace(/_/g, ' ') || 'Environmental Compliance'],
        ['Scope',             certificate.scope || 'General Environmental Compliance'],
        ['Compliance Score',  certificate.complianceScore ? `${certificate.complianceScore}%` : 'N/A'],
        ['Standards Applied', Array.isArray(certificate.standards) ? certificate.standards.join(', ') : 'CPCB, MoEFCC, ISO 14001'],
        ['Date of Issue',     new Date(certificate.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })],
        ['Valid Until',       new Date(certificate.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })]
      ];

      let dy = detailY + 8;
      details.forEach(([label, value]) => {
        doc.fontSize(9).fillColor(COLORS.gray).text(`${label}:`, 95, dy, { continued: true });
        doc.fillColor(COLORS.dark).text(`  ${value}`);
        dy += 15;
      });

      doc.moveDown(5);

      /* ─ Signature lines ─ */
      doc.y = detailY + 120;
      doc.rect(80, doc.y, 140, 1).fill(COLORS.dark);
      doc.rect(330, doc.y, 140, 1).fill(COLORS.dark);
      doc.fontSize(8).fillColor(COLORS.gray)
        .text('Authorised Signatory', 80, doc.y + 5, { width: 140, align: 'center' })
        .text('Regulatory Authority', 330, doc.y - 8, { width: 140, align: 'center' });

      /* ─ QR code ─ */
      if (qrCodeUrl) {
        try {
          const base64 = qrCodeUrl.split(',')[1];
          const imgBuf = Buffer.from(base64, 'base64');
          doc.image(imgBuf, W - 120, detailY + 120, { width: 70, height: 70 });
          doc.fontSize(7).fillColor(COLORS.gray).text('Scan to verify', W - 120, detailY + 195, { width: 70, align: 'center' });
        } catch { /* skip QR if image fails */ }
      }

      /* ─ Footer ─ */
      doc.rect(0, H - 50, W, 50).fill(COLORS.primary);
      doc.fontSize(7).fillColor(COLORS.accent)
        .text(`Verification URL: ${certificate.verificationUrl}`, 40, H - 38, { align: 'center' });
      doc.fontSize(7).fillColor(COLORS.white)
        .text('This certificate is electronically generated by EcoSphere. Verify authenticity at ecosphere.app/verify', 40, H - 25, { align: 'center' });

      doc.end();
    } catch (err) {
      logger.error('[PDFGenerator] Certificate error:', err);
      reject(err);
    }
  });
};
