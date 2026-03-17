import { jsPDF } from 'jspdf';

function formatDateTime(value = new Date()) {
  return new Date(value).toLocaleString();
}

function sanitizeFilePart(value) {
  return String(value || 'all')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'all';
}

function formatCoordinates(group) {
  if (group.gps_lat == null || group.gps_lng == null) return '';
  return `${group.gps_lat}, ${group.gps_lng}`;
}

function formatSplitters(entries = []) {
  return entries
    .map((entry) => entry.splitter_number)
    .filter(Boolean)
    .join(', ');
}

function getGroupStatus(group) {
  return group.issueSummary?.impacted > 0 ? group.issueSummary.highestSeverity : 'ok';
}

function buildRows(groups = []) {
  return groups.map((group) => ({
    lcp_number: group.lcp_number,
    status: getGroupStatus(group),
    splitter_count: group.entries?.length || 0,
    splitters: formatSplitters(group.entries),
    location: group.location || '',
    coordinates: formatCoordinates(group),
    critical_onts: group.issueSummary?.critical || 0,
    warning_onts: group.issueSummary?.warning || 0,
    offline_onts: group.issueSummary?.offline || 0,
    healthy_onts: group.issueSummary?.ok || 0,
    impacted_onts: group.issueSummary?.impacted || 0,
    total_onts: group.issueSummary?.total || 0,
  }));
}

function buildSummary(rows = []) {
  return rows.reduce((acc, row) => {
    acc.lcps += 1;
    acc.critical += row.critical_onts;
    acc.warning += row.warning_onts;
    acc.offline += row.offline_onts;
    acc.healthy += row.healthy_onts;
    acc.impacted += row.impacted_onts;
    acc.total += row.total_onts;
    return acc;
  }, {
    lcps: 0,
    critical: 0,
    warning: 0,
    offline: 0,
    healthy: 0,
    impacted: 0,
    total: 0,
  });
}

export function downloadLcpAuditCsv({ groups = [], latestReport, searchTerm = '', selectedStatuses = [] }) {
  const rows = buildRows(groups);
  const summary = buildSummary(rows);
  const generatedAt = formatDateTime();
  const filtersLabel = selectedStatuses.length > 0 ? selectedStatuses.join(', ') : 'none';

  const headerLines = [
    ['Fiber Network Audit Report'],
    ['Generated', generatedAt],
    ['PON PM Report', latestReport?.report_name || 'None'],
    ['Search Filter', searchTerm || 'None'],
    ['Visible Status Filters', filtersLabel],
    ['Visible LCPs', String(summary.lcps)],
    ['Critical ONTs', String(summary.critical)],
    ['Warning ONTs', String(summary.warning)],
    ['Offline ONTs', String(summary.offline)],
    ['Healthy ONTs', String(summary.healthy)],
    [],
  ];

  const tableHeaders = [
    'LCP',
    'Status',
    'Splitter Count',
    'Splitters',
    'Location',
    'Coordinates',
    'Critical ONTs',
    'Warning ONTs',
    'Offline ONTs',
    'Healthy ONTs',
    'Impacted ONTs',
    'Total ONTs',
  ];

  const tableRows = rows.map((row) => ([
    row.lcp_number,
    row.status,
    row.splitter_count,
    row.splitters,
    row.location,
    row.coordinates,
    row.critical_onts,
    row.warning_onts,
    row.offline_onts,
    row.healthy_onts,
    row.impacted_onts,
    row.total_onts,
  ]));

  const csvContent = [
    ...headerLines,
    tableHeaders,
    ...tableRows,
  ]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lcp-audit-${sanitizeFilePart(latestReport?.report_name)}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadLcpAuditPdf({ groups = [], latestReport, searchTerm = '', selectedStatuses = [] }) {
  const rows = buildRows(groups);
  const summary = buildSummary(rows);
  const generatedAt = formatDateTime();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const lineHeight = 14;
  let y = margin;

  const addPageIfNeeded = (needed = lineHeight) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Fiber Network Audit Report', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const metaLines = [
    `Generated: ${generatedAt}`,
    `PON PM Report: ${latestReport?.report_name || 'None'}`,
    `Search Filter: ${searchTerm || 'None'}`,
    `Visible Status Filters: ${selectedStatuses.length > 0 ? selectedStatuses.join(', ') : 'None'}`,
    `Visible LCPs: ${summary.lcps} | Critical ONTs: ${summary.critical} | Warning ONTs: ${summary.warning} | Offline ONTs: ${summary.offline} | Healthy ONTs: ${summary.healthy}`,
  ];

  metaLines.forEach((line) => {
    addPageIfNeeded();
    doc.text(line, margin, y);
    y += lineHeight;
  });

  y += 8;
  const columns = [
    { key: 'lcp_number', label: 'LCP', width: 52 },
    { key: 'status', label: 'Status', width: 58 },
    { key: 'splitter_count', label: 'Splitters', width: 52 },
    { key: 'critical_onts', label: 'Crit', width: 36 },
    { key: 'warning_onts', label: 'Warn', width: 36 },
    { key: 'offline_onts', label: 'Off', width: 36 },
    { key: 'healthy_onts', label: 'OK', width: 36 },
    { key: 'total_onts', label: 'Total', width: 40 },
    { key: 'coordinates', label: 'Coordinates', width: 120 },
    { key: 'location', label: 'Location', width: 250 },
  ];

  const drawHeader = () => {
    doc.setFont('helvetica', 'bold');
    let x = margin;
    columns.forEach((column) => {
      doc.text(column.label, x, y);
      x += column.width;
    });
    y += 10;
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
  };

  drawHeader();

  rows.forEach((row) => {
    const locationLines = doc.splitTextToSize(row.location || '', 240);
    const rowHeight = Math.max(lineHeight, locationLines.length * 11);
    addPageIfNeeded(rowHeight + 10);

    if (y === margin) {
      drawHeader();
    }

    let x = margin;
    columns.forEach((column) => {
      const value = String(row[column.key] ?? '');
      const text = column.key === 'location' ? doc.splitTextToSize(value, column.width - 8) : value;
      doc.text(text, x, y);
      x += column.width;
    });

    y += rowHeight + 6;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  });

  doc.save(`lcp-audit-${sanitizeFilePart(latestReport?.report_name)}-${new Date().toISOString().slice(0, 10)}.pdf`);
}