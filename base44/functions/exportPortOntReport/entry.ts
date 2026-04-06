import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';
import 'npm:jspdf-autotable@3.8.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportData, format = 'pdf' } = await req.json();
    
    if (!reportData || !reportData.portReports) {
      return Response.json({ error: 'Invalid report data' }, { status: 400 });
    }

    if (format === 'excel') {
      return generateExcel(reportData);
    } else {
      return generatePDF(reportData);
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generatePDF(reportData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Page 1: Summary
  addSummaryPage(doc, reportData, pageWidth, pageHeight, margin);
  
  // Page 2+: Detailed Report
  doc.addPage();
  addDetailedReportPages(doc, reportData, pageWidth, pageHeight, margin);

  const pdfBytes = doc.output('arraybuffer');
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Port_ONT_Report.pdf"'
    }
  });
}

function addSummaryPage(doc, reportData, pageWidth, pageHeight, margin) {
  // Title
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text('Port & ONT Summary Report', pageWidth / 2, margin + 15, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 25, { align: 'center' });

  let yPos = margin + 40;

  // Summary statistics
  const summaryStats = calculateSummaryStats(reportData);
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Network Summary', margin, yPos);
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Ports: ${summaryStats.totalPorts}`, margin + 5, yPos);
  yPos += 7;
  doc.text(`Total ONTs: ${summaryStats.totalOnts}`, margin + 5, yPos);
  yPos += 7;
  doc.text(`XGS ONTs: ${summaryStats.xgsOnts}`, margin + 5, yPos);
  yPos += 7;
  doc.text(`GPON ONTs: ${summaryStats.gponOnts}`, margin + 5, yPos);
  yPos += 15;

  // OLT Summary Table
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text('ONT Counts by OLT', margin, yPos);
  yPos += 8;

  const oltData = [];
  const oltMap = new Map();
  
  for (const port of reportData.portReports) {
    if (!oltMap.has(port.oltName)) {
      oltMap.set(port.oltName, { xgs: 0, gpon: 0, total: 0 });
    }
    const olt = oltMap.get(port.oltName);
    olt.total += port.ontCounts?.total || 0;
    olt.xgs += port.ontCounts?.xgs || 0;
    olt.gpon += port.ontCounts?.gpon || 0;
  }

  for (const [oltName, counts] of oltMap.entries()) {
    oltData.push([oltName, counts.total.toString(), counts.xgs.toString(), counts.gpon.toString()]);
  }

  doc.autoTable({
    startY: yPos,
    head: [['OLT Name', 'Total ONTs', 'XGS ONTs', 'GPON ONTs']],
    body: oltData,
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' }
    }
  });
}

function addDetailedReportPages(doc, reportData, pageWidth, pageHeight, margin) {
  const pageHeightAvailable = pageHeight - (margin * 2) - 15;
  
  // Title
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Detailed Port & ONT Report', margin, margin + 10);

  // Table data
  const tableData = reportData.portReports.map(port => {
    const ontDisplay = port.opticType === 'COMBO/EXT COMBO' && (port.ontCounts?.xgs || port.ontCounts?.gpon)
      ? `${port.ontCounts.xgs} XGS / ${port.ontCounts.gpon} GPON`
      : (port.ontCounts?.total || 0).toString();
    
    return [
      port.oltName,
      port.shelf,
      port.slot,
      port.port,
      ontDisplay,
      port.opticType,
      port.lcpNumber || '-',
      port.splitterNumber || '-'
    ];
  });

  doc.autoTable({
    startY: margin + 20,
    head: [['OLT', 'Shelf', 'Slot', 'Port', 'ONTs', 'Technology', 'LCP', 'Splitter']],
    body: tableData,
    margin: { left: margin, right: margin, bottom: margin + 10 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 35 },
      6: { cellWidth: 25 },
      7: { cellWidth: 25 }
    },
    didDrawPage: (data) => {
      const pageCount = doc.internal.pages.length;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Page ${pageCount - 1}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    }
  });
}

function generateExcel(reportData) {
  // Build CSV (Excel-compatible)
  let csv = 'Port & ONT Report\n';
  csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;

  // Summary section
  const summaryStats = calculateSummaryStats(reportData);
  csv += 'NETWORK SUMMARY\n';
  csv += `Total Ports,${summaryStats.totalPorts}\n`;
  csv += `Total ONTs,${summaryStats.totalOnts}\n`;
  csv += `XGS ONTs,${summaryStats.xgsOnts}\n`;
  csv += `GPON ONTs,${summaryStats.gponOnts}\n\n`;

  // OLT Summary
  csv += 'OLT SUMMARY\n';
  csv += 'OLT Name,Total ONTs,XGS ONTs,GPON ONTs\n';
  
  const oltMap = new Map();
  for (const port of reportData.portReports) {
    if (!oltMap.has(port.oltName)) {
      oltMap.set(port.oltName, { xgs: 0, gpon: 0, total: 0 });
    }
    const olt = oltMap.get(port.oltName);
    olt.total += port.ontCounts?.total || 0;
    olt.xgs += port.ontCounts?.xgs || 0;
    olt.gpon += port.ontCounts?.gpon || 0;
  }

  for (const [oltName, counts] of oltMap.entries()) {
    csv += `${oltName},${counts.total},${counts.xgs},${counts.gpon}\n`;
  }

  csv += '\n\n';

  // Detailed report
  csv += 'DETAILED PORT REPORT\n';
  csv += 'OLT,Shelf,Slot,Port,Total ONTs,XGS ONTs,GPON ONTs,Technology,LCP,Splitter,Optic Make,Optic Model\n';
  
  for (const port of reportData.portReports) {
    const xgs = port.ontCounts?.xgs || 0;
    const gpon = port.ontCounts?.gpon || 0;
    const total = port.ontCounts?.total || 0;
    
    csv += `"${port.oltName}",${port.shelf},${port.slot},${port.port},${total},${xgs},${gpon},"${port.opticType}","${port.lcpNumber || '-'}","${port.splitterNumber || '-'}","${port.opticMake || '-'}","${port.opticModel || '-'}"\n`;
  }

  const excelBytes = new TextEncoder().encode(csv);
  return new Response(excelBytes, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Port_ONT_Report.csv"'
    }
  });
}

function calculateSummaryStats(reportData) {
  let totalOnts = 0, xgsOnts = 0, gponOnts = 0;
  
  for (const port of reportData.portReports) {
    totalOnts += port.ontCounts?.total || 0;
    xgsOnts += port.ontCounts?.xgs || 0;
    gponOnts += port.ontCounts?.gpon || 0;
  }

  return {
    totalPorts: reportData.portReports.length,
    totalOnts,
    xgsOnts,
    gponOnts
  };
}