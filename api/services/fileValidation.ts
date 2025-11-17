import multer from 'multer';
import path from 'path';
import { logger, LogCategory } from '../utils/logger';

type FileCategory = 'document' | 'image' | 'audio'
const ALLOWED_FILE_TYPES: Record<string, { ext: string; maxSize: number; category: FileCategory }> = {
  // Documents
  'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024, category: 'document' }, // 10MB
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', maxSize: 5 * 1024 * 1024, category: 'document' }, // 5MB
  
  // Images
  'image/jpeg': { ext: '.jpg', maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
  'image/jpg': { ext: '.jpg', maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
  'image/png': { ext: '.png', maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
  
  // Audio
  'audio/mpeg': { ext: '.mp3', maxSize: 10 * 1024 * 1024, category: 'audio' }, // 10MB
  'audio/wav': { ext: '.wav', maxSize: 20 * 1024 * 1024, category: 'audio' }, // 20MB
  'audio/x-wav': { ext: '.wav', maxSize: 20 * 1024 * 1024, category: 'audio' }, // 20MB
};

const ALLOWED_MIME_TYPES = Object.keys(ALLOWED_FILE_TYPES);
const MAX_FILES_PER_REQUEST = 5;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total per request

// Configure multer for memory storage (we'll process files in memory)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      logger.warn(LogCategory.FILE_UPLOAD, `File type not allowed: ${file.mimetype} for file ${file.originalname}`);
      return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, DOCX, JPEG, PNG, MP3, WAV`));
    }

    // Check file extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    const expectedExt = ALLOWED_FILE_TYPES[file.mimetype as keyof typeof ALLOWED_FILE_TYPES].ext;
    
    if (fileExt !== expectedExt) {
      logger.warn(LogCategory.FILE_UPLOAD, `File extension mismatch: expected ${expectedExt}, got ${fileExt} for file ${file.originalname}`);
      return cb(new Error(`File extension ${fileExt} does not match MIME type ${file.mimetype}`));
    }

    // Additional security check - validate file signature (magic numbers)
    const buffer = file.buffer;
    if (buffer && buffer.length > 0) {
      const isValid = validateFileSignature(buffer, file.mimetype);
      if (!isValid) {
        logger.warn(LogCategory.FILE_UPLOAD, `File signature validation failed for file ${file.originalname}`);
        return cb(new Error(`File appears to be corrupted or has invalid signature`));
      }
    }

    logger.info(LogCategory.FILE_UPLOAD, `File validation passed for ${file.originalname} (${file.mimetype})`);
    cb(null, true);
  } catch (error) {
    logger.error(LogCategory.FILE_UPLOAD, 'Error in file filter', { error });
    cb(new Error('File validation error'));
  }
};

// Validate file signatures (magic numbers)
function validateFileSignature(buffer: Buffer, mimeType: string): boolean {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46; // %PDF
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // DOCX files are ZIP archives, check for ZIP signature
        return buffer[0] === 0x50 && buffer[1] === 0x4B; // PK
      
      case 'image/jpeg':
      case 'image/jpg':
        return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF; // JPEG
      
      case 'image/png':
        return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47; // PNG
      
      case 'audio/mpeg':
        // MP3 can have multiple signatures, check for ID3 or MPEG sync
        return (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || // MPEG sync
               (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33); // ID3
      
      case 'audio/wav':
      case 'audio/x-wav':
        return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
               buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45; // WAVE
      
      default:
        return false;
    }
  } catch (error) {
    logger.error(LogCategory.FILE_UPLOAD, 'Error validating file signature', { error });
    return false;
  }
}

// Create multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(...Object.values(ALLOWED_FILE_TYPES).map(type => type.maxSize)),
    files: MAX_FILES_PER_REQUEST
  }
});

// File validation service
export class FileValidationService {
  /**
   * Validate multiple files
   */
  static validateFiles(files: Express.Multer.File[]): {
    valid: boolean;
    errors: string[];
    validatedFiles: ValidatedFile[];
  } {
    const errors: string[] = [];
    const validatedFiles: ValidatedFile[] = [];
    let totalSize = 0;

    if (!files || files.length === 0) {
      return {
        valid: false,
        errors: ['No files provided'],
        validatedFiles: []
      };
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      errors.push(`Too many files. Maximum ${MAX_FILES_PER_REQUEST} files allowed.`);
      return {
        valid: false,
        errors,
        validatedFiles: []
      };
    }

    for (const file of files) {
      const fileTypeInfo = ALLOWED_FILE_TYPES[file.mimetype as keyof typeof ALLOWED_FILE_TYPES];
      
      if (!fileTypeInfo) {
        errors.push(`File ${file.originalname}: Type ${file.mimetype} not allowed`);
        continue;
      }

      // Check individual file size
      if (file.size > fileTypeInfo.maxSize) {
        errors.push(`File ${file.originalname}: Size ${formatFileSize(file.size)} exceeds maximum ${formatFileSize(fileTypeInfo.maxSize)}`);
        continue;
      }

      totalSize += file.size;

      // Validate file content (basic scan for malicious content)
      const contentValidation = this.validateFileContent(file);
      if (!contentValidation.valid) {
        errors.push(`File ${file.originalname}: ${contentValidation.error}`);
        continue;
      }

      validatedFiles.push({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        category: fileTypeInfo.category,
        extension: fileTypeInfo.ext,
        buffer: file.buffer,
        validation: {
          signature: true,
          content: contentValidation.valid,
          size: true,
          type: true
        }
      });
    }

    // Check total size
    if (totalSize > MAX_TOTAL_SIZE) {
      errors.push(`Total file size ${formatFileSize(totalSize)} exceeds maximum ${formatFileSize(MAX_TOTAL_SIZE)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      validatedFiles
    };
  }

  /**
   * Basic content validation (scan for potential malicious content)
   */
  private static validateFileContent(file: Express.Multer.File): {
    valid: boolean;
    error?: string;
  } {
    try {
      const buffer = file.buffer;
      const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000)); // Check first 1000 bytes

      // Check for suspicious patterns (basic security scan)
      const suspiciousPatterns = [
        /<script[^>]*>/gi, // Script tags
        /javascript:/gi,   // JavaScript protocol
        /on\w+\s*=/gi,     // Event handlers
        /eval\s*\(/gi,      // Eval function
        /document\.write/gi, // Document.write
        /window\./gi,       // Window object access
        /\.exe\b/gi,        // Executable files
        /\.bat\b/gi,        // Batch files
        /\.cmd\b/gi,        // Command files
        /\.scr\b/gi,        // Screensaver files
        /\.com\b/gi         // COM files
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          return {
            valid: false,
            error: 'Potentially malicious content detected'
          };
        }
      }

      // Additional validation for specific file types
      if (file.mimetype === 'application/pdf') {
        return this.validatePDFContent(buffer);
      }

      if (file.mimetype.startsWith('image/')) {
        return this.validateImageContent(buffer);
      }

      return { valid: true };

    } catch (error) {
      logger.error(LogCategory.FILE_UPLOAD, `Error validating file content for ${file.originalname}`, { error });
      return { valid: false, error: 'Content validation error' };
    }
  }

  /**
   * PDF-specific content validation
   */
  private static validatePDFContent(buffer: Buffer): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Check for PDF encryption (we don't accept encrypted PDFs)
      const content = buffer.toString('utf-8');
      if (content.includes('/Encrypt')) {
        return { valid: false, error: 'Encrypted PDF files are not allowed' };
      }

      // Check for PDF version
      const pdfVersionMatch = content.match(/%PDF-(\d+\.\d+)/);
      if (!pdfVersionMatch) {
        return { valid: false, error: 'Invalid PDF format' };
      }

      const version = parseFloat(pdfVersionMatch[1]);
      if (version < 1.0 || version > 2.0) {
        return { valid: false, error: 'Unsupported PDF version' };
      }

      return { valid: true };

  } catch (error) {
    logger.error(LogCategory.FILE_UPLOAD, 'Error validating PDF content', { error });
    return { valid: false, error: 'PDF validation error' };
  }
}

  /**
   * Image-specific content validation
   */
  private static validateImageContent(buffer: Buffer): {
    valid: boolean;
    error?: string;
  } {
    try {
      // Basic image dimension check (prevent extreme sizes)
      // This is a simplified check - in production, you'd use a proper image processing library
      
      // Check file size is reasonable for an image
      if (buffer.length < 100) {
        return { valid: false, error: 'Image file too small' };
      }

      if (buffer.length > 50 * 1024 * 1024) { // 50MB
        return { valid: false, error: 'Image file too large' };
      }

      return { valid: true };

  } catch (error) {
    logger.error(LogCategory.FILE_UPLOAD, 'Error validating image content', { error });
    return { valid: false, error: 'Image validation error' };
  }
}

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    // Remove path information and special characters
    const sanitized = path.basename(filename)
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .toLowerCase();

    // Ensure it has a valid extension
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    
    if (!name || name.length < 1) {
      return `file_${Date.now()}${ext}`;
    }

    return `${name}${ext}`;
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const sanitized = this.sanitizeFilename(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    
    return `${name}_${timestamp}_${random}${ext}`;
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Interfaces
export interface ValidatedFile {
  originalName: string;
  mimeType: string;
  size: number;
  category: 'document' | 'image' | 'audio';
  extension: string;
  buffer: Buffer;
  validation: {
    signature: boolean;
    content: boolean;
    size: boolean;
    type: boolean;
  };
}

export interface FileUploadConfig {
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  requireValidation?: boolean;
}

export default {
  upload,
  FileValidationService,
  ALLOWED_FILE_TYPES,
  MAX_FILES_PER_REQUEST,
  MAX_TOTAL_SIZE
};
