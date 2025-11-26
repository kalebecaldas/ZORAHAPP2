/**
 * Formats messages for WhatsApp with proper line breaks
 * Ensures consistent spacing and readability (reduced spacing)
 */
export function formatMessageForWhatsApp(message: string): string {
  if (!message || typeof message !== 'string') {
    return message || '';
  }

  // Normalize line breaks (Windows, Mac, Unix)
  let formatted = message
    .replace(/\r\n/g, '\n') // Windows
    .replace(/\r/g, '\n'); // Mac

  // First, clean up excessive newlines (more than 2 consecutive → 1)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Ensure single line break after headers (bold text) - not double
  formatted = formatted.replace(/(\*{1,2}[^*]+\*{1,2})\n{2,}([^\n\*])/g, '$1\n$2');
  formatted = formatted.replace(/(\*{1,2}[^*]+\*{1,2})\n([^\n\*])/g, '$1\n$2');

  // Keep single line break between list items (• or -)
  formatted = formatted.replace(/([•\-] [^\n]+)\n{2,}([•\-] [^\n]+)/g, '$1\n$2');

  // Reduce spacing between sections - only one line break before emoji headers
  formatted = formatted.replace(/([^\n])\n{2,}([📋💉💰🎁💳⏱️📝📞💡📍🗺️📧✅❌⚠️])/g, '$1\n$2');

  // Keep single line break after sentences ending with punctuation (not double)
  formatted = formatted.replace(/([.!?])\n{2,}([A-Z])/g, '$1\n$2');

  // Ensure proper spacing before numbered lists (1. 2. etc) - single line
  formatted = formatted.replace(/([^\n])\n{2,}(\d+[\.\)]\s)/g, '$1\n$2');

  // Remove trailing whitespace from each line
  formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');

  // Final cleanup: replace any remaining double newlines with single (except between major sections)
  // Keep double newline only before major section headers (emoji lines)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Final trim
  return formatted.trim();
}

/**
 * Formats procedure information with consistent spacing
 */
export function formatProcedureInfo(info: string): string {
  return formatMessageForWhatsApp(info);
}

