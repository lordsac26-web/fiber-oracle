/**
 * Convert uptime in seconds to a human-readable format (days/hours/mins)
 * @param {number|string} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string, e.g. "5d 3h 42m"
 */
export function formatUptime(seconds) {
  if (!seconds || isNaN(seconds)) return '-';
  
  const totalSeconds = parseInt(seconds);
  if (totalSeconds < 0) return '-';
  
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  
  return parts.join(' ');
}