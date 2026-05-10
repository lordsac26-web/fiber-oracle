import L from 'leaflet';

/**
 * Calculate a health color for an LCP based on the percentage of healthy ONTs.
 * Returns a hex color string.
 */
export function getHealthColor(okCount, totalCount) {
  if (totalCount === 0) return '#6366f1'; // indigo — no data
  const pct = okCount / totalCount;
  if (pct >= 0.9) return '#16a34a';  // green  ≥90%
  if (pct >= 0.7) return '#d97706';  // amber  70-89%
  if (pct >= 0.5) return '#ea580c';  // orange 50-69%
  return '#dc2626';                   // red    <50%
}

/** Return a CSS class-friendly label */
export function getHealthLabel(okCount, totalCount) {
  if (totalCount === 0) return 'no-data';
  const pct = okCount / totalCount;
  if (pct >= 0.9) return 'healthy';
  if (pct >= 0.7) return 'warning';
  if (pct >= 0.5) return 'degraded';
  return 'critical';
}

/**
 * Build a Leaflet DivIcon for an LCP pin.
 * color: hex string, label: LCP name, badge: optional count badge
 */
export function createLcpHealthIcon(label, color, badgeCount) {
  const truncated = label.length > 12 ? label.substring(0, 11) + '…' : label;
  const badgeHtml = badgeCount > 0
    ? `<div style="position:absolute;top:-8px;right:-10px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#111827;color:#fff;border:2px solid #fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${badgeCount > 99 ? '99+' : badgeCount}</div>`
    : '';

  return new L.DivIcon({
    className: 'custom-health-pin',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      ${badgeHtml}
      <div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:5px;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;text-align:center;line-height:1.3;">${truncated}</div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px;"></div>
      <div style="width:6px;height:6px;background:${color};border-radius:50%;margin-top:1px;box-shadow:0 0 0 3px rgba(${hexToRgb(color)},0.25);"></div>
    </div>`,
    iconSize: [90, 54],
    iconAnchor: [45, 54],
    popupAnchor: [0, -54],
  });
}

/** Create a small circle icon for individual ONT pins */
export function createOntPinIcon(status, isDraggable) {
  const colors = {
    ok: '#16a34a',
    warning: '#d97706',
    critical: '#dc2626',
    offline: '#475569',
  };
  const color = colors[status] || colors.ok;
  const ring = isDraggable ? 'border:3px solid #3b82f6;' : 'border:2px solid #fff;';

  return new L.DivIcon({
    className: 'custom-ont-pin',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};${ring}box-shadow:0 1px 4px rgba(0,0,0,0.3);cursor:${isDraggable ? 'grab' : 'pointer'};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}