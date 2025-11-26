/**
 * Formats messages for WhatsApp with proper line breaks
 * Ensures consistent spacing and readability
 */
export function formatMessageForWhatsApp(message: string): string {
  if (!message || typeof message !== 'string') {
    return message || '';
  }

  // Normalize line breaks (Windows, Mac, Unix)
  let formatted = message
    .replace(/\r\n/g, '\n') // Windows
    .replace(/\r/g, '\n'); // Mac

  // Ensure proper spacing after headers (bold text)
  // Match patterns like **text** or *text* followed by content
  formatted = formatted.replace(/(\*{1,2}[^*]+\*{1,2})\n([^\n\*])/g, '$1\n\n$2');

  // Ensure proper spacing after sentences ending with punctuation
  formatted = formatted.replace(/([.!?])\n([A-Z])/g, '$1\n\n$2');

  // Ensure proper spacing before section headers (lines starting with emoji or bold)
  formatted = formatted.replace(/([^\n])\n([📋💉💰🎁💳⏱️📝📞💡📍🗺️📧✅❌⚠️])/g, '$1\n\n$2');

  // Keep single line breaks between list items (• or -)
  formatted = formatted.replace(/([•\-] [^\n]+)\n\n([•\-] [^\n]+)/g, '$1\n$2');

  // Clean up excessive newlines (more than 2 consecutive)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  // Ensure proper spacing before numbered lists (1. 2. etc)
  formatted = formatted.replace(/([^\n])\n(\d+[\.\)]\s)/g, '$1\n\n$2');

  // Remove trailing whitespace from each line
  formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');

  // Final trim
  return formatted.trim();
}

/**
 * Formats procedure information with consistent spacing
 */
export function formatProcedureInfo(info: string): string {
  return formatMessageForWhatsApp(info);
}

