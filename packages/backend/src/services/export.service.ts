import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { ComplianceMappingModel } from '../models/ComplianceMapping.model';
import PlantModel from '../models/Plant.model';
import mongoose from 'mongoose';

export const generateAuditEvidencePackage = async (
  regulationCode: string,
  plantId: string,
  res: Response
): Promise<void> => {
  const mappings = await ComplianceMappingModel.find({
    plant: new mongoose.Types.ObjectId(plantId),
    regulationCode,
  }).populate('evidenceDocumentIds', 'title originalName');

  const plant = await PlantModel.findById(plantId);
  const plantName = plant ? plant.name : 'Unknown Plant';

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Compliance_Package_${regulationCode}_${encodeURIComponent(plantName.replace(/\s+/g, '_'))}.pdf"`
  );

  doc.pipe(res);

  // --- Title Page ---
  doc.fontSize(26).text('IKIP COMPLIANCE EVIDENCE PACKAGE', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(16).text(`Regulation: ${regulationCode}`, { align: 'center' });
  doc.fontSize(14).text(`Plant Location: ${plantName}`, { align: 'center' });
  doc.fontSize(12).text(`Generated On: ${new Date().toLocaleDateString()}`, { align: 'center' });
  doc.fontSize(10).text('Generated Automatically by Industrial Knowledge Intelligence Platform (IKIP) AI Agent', { align: 'center' });
  
  doc.addPage();

  // --- Summary Sheet ---
  doc.fontSize(18).text('Compliance Status Summary', { underline: true });
  doc.moveDown();

  const counts = { Compliant: 0, PartiallyCompliant: 0, NonCompliant: 0, NotAssessed: 0 };
  for (const m of mappings) {
    const status = m.complianceStatus as keyof typeof counts;
    if (counts[status] !== undefined) counts[status]++;
  }

  doc.fontSize(12)
    .text(`Total Clauses Assessed: ${mappings.length}`)
    .text(`Compliant: ${counts.Compliant}`)
    .text(`Partially Compliant: ${counts.PartiallyCompliant}`)
    .text(`Non Compliant: ${counts.NonCompliant}`)
    .text(`Not Assessed: ${counts.NotAssessed}`);

  doc.moveDown(2);

  // --- Detail Section ---
  doc.fontSize(16).text('Clause Breakdown & Evidence Log', { underline: true });
  doc.moveDown();

  for (const m of mappings) {
    doc.fontSize(12).font('Helvetica-Bold').text(`Clause ${m.clauseNumber}: ${m.clauseTitle}`);
    
    // Status text color coding
    let color = 'black';
    if (m.complianceStatus === 'Compliant') color = 'green';
    else if (m.complianceStatus === 'PartiallyCompliant') color = 'orange';
    else if (m.complianceStatus === 'NonCompliant') color = 'red';

    doc.fontSize(10).fillColor(color).font('Helvetica-Bold').text(`Status: ${m.complianceStatus}`).fillColor('black');
    doc.font('Helvetica').fontSize(10).text(`Regulatory Body: ${m.regulatoryBody}`);
    
    doc.font('Helvetica-Bold').fontSize(10).text('Requirement Text:');
    doc.font('Helvetica').fontSize(9).text(m.clauseText, { indent: 15 });
    
    if (m.complianceStatus === 'Compliant' || m.complianceStatus === 'PartiallyCompliant') {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(10).text('AI-Generated Evidence Summary:');
      doc.font('Helvetica').fontSize(9).text(m.evidenceSummary || 'No summary text available.', { indent: 15 });

      if (m.evidenceDocumentIds && m.evidenceDocumentIds.length > 0) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(10).text('Supporting Documents:');
        doc.font('Helvetica');
        for (const docMeta of m.evidenceDocumentIds as any) {
          doc.fontSize(9).text(`• ${docMeta.title} (${docMeta.originalName})`, { indent: 15 });
        }
      }
    } else if (m.complianceStatus === 'NonCompliant') {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(10).text('Compliance Gap Description:');
      doc.font('Helvetica').fontSize(9).text(m.gapDescription || 'Detailed gap description missing.', { indent: 15 });
      
      doc.font('Helvetica-Bold').fontSize(10).text('Recommended Corrective Action:');
      doc.font('Helvetica').fontSize(9).text(m.correctiveAction || 'Resolve missing documentation mappings.', { indent: 15 });
    }

    doc.moveDown();
    doc.text('----------------------------------------------------------------------------------------------------');
    doc.moveDown();

    // Check if space left is small, add page
    if (doc.y > 650) {
      doc.addPage();
    }
  }

  doc.end();
};
