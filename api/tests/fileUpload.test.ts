import { describe, it, expect, beforeEach } from 'vitest'
import { FileValidationService, ALLOWED_FILE_TYPES, MAX_FILES_PER_REQUEST, MAX_TOTAL_SIZE } from '../services/fileValidation.js'
import fs from 'fs'
import path from 'path'

describe('File Upload Validation Tests', () => {
  describe('File Type Validation', () => {
    it('should accept valid PDF files', () => {
      const validPDF = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj'),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([validPDF])
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles[0].category).toBe('document')
    })

    it('should accept valid DOCX files', () => {
      const validDOCX = {
        originalname: 'document.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('PK\x03\x04\x14\x00\x06\x00'),
        size: 2048
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([validDOCX])
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles[0].category).toBe('document')
    })

    it('should accept valid JPEG images', () => {
      const validJPEG = {
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([validJPEG])
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles[0].category).toBe('image')
    })

    it('should accept valid PNG images', () => {
      const validPNG = {
        originalname: 'image.png',
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([validPNG])
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles[0].category).toBe('image')
    })

    it('should accept valid MP3 audio files', () => {
      const validMP3 = {
        originalname: 'audio.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.from([0xFF, 0xFB, 0x90]),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([validMP3])
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles[0].category).toBe('audio')
    })

    it('should accept valid WAV audio files', () => {
      const validWAV = {
        originalname: 'audio.wav',
        mimetype: 'audio/wav',
        buffer: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45]),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([validWAV])
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
      expect(validation.validatedFiles[0].category).toBe('audio')
    })

    it('should reject invalid file types', () => {
      const invalidFiles = [
        {
          originalname: 'malicious.exe',
          mimetype: 'application/x-msdownload',
          buffer: Buffer.from('MZ'),
          size: 1024
        },
        {
          originalname: 'script.js',
          mimetype: 'application/javascript',
          buffer: Buffer.from('console.log("test")'),
          size: 1024
        },
        {
          originalname: 'webpage.html',
          mimetype: 'text/html',
          buffer: Buffer.from('<html><body>Test</body></html>'),
          size: 1024
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(invalidFiles)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('should reject files with mismatched extensions', () => {
      const mismatchedFile = {
        originalname: 'document.exe',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([mismatchedFile])
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('extension')
    })
  })

  describe('File Size Validation', () => {
    it('should accept files within size limits', () => {
      const validFiles = [
        {
          originalname: 'small.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4'),
          size: 5 * 1024 * 1024 // 5MB
        },
        {
          originalname: 'medium.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from([0xFF, 0xD8, 0xFF]),
          size: 3 * 1024 * 1024 // 3MB
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(validFiles)
      
      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject files exceeding size limits', () => {
      const oversizedFiles = [
        {
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4'),
          size: 15 * 1024 * 1024 // 15MB, exceeds 10MB limit
        },
        {
          originalname: 'huge.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from([0xFF, 0xD8, 0xFF]),
          size: 8 * 1024 * 1024 // 8MB, exceeds 5MB limit
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(oversizedFiles)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      validation.errors.forEach(error => {
        expect(error).toContain('exceeds maximum')
      })
    })

    it('should reject total size exceeding 50MB', () => {
      const manyFiles = Array.from({ length: 6 }, (_, i) => ({
        originalname: `file${i}.pdf`,
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
        size: 10 * 1024 * 1024 // 10MB each
      })) as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(manyFiles)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors.some(error => error.includes('Total file size'))).toBe(true)
    })
  })

  describe('File Content Validation', () => {
    it('should detect malicious content in files', () => {
      const maliciousFiles = [
        {
          originalname: 'xss.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n<script>alert("xss")</script>'),
          size: 1024
        },
        {
          originalname: 'javascript.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\njavascript:alert("test")'),
          size: 1024
        },
        {
          originalname: 'eval.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\neval("malicious code")'),
          size: 1024
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(maliciousFiles)
      
      expect(validation.valid).toBe(false)
      validation.errors.forEach(error => {
        expect(error).toContain('malicious content')
      })
    })

    it('should detect encrypted PDF files', () => {
      const encryptedPDF = {
        originalname: 'encrypted.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n/Encrypt'),
        size: 1024
      } as Express.Multer.File

      const validation = FileValidationService.validateFiles([encryptedPDF])
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('Encrypted PDF')
    })

    it('should detect invalid file signatures', () => {
      const invalidSignatureFiles = [
        {
          originalname: 'fake.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('NOT-A-PDF'),
          size: 1024
        },
        {
          originalname: 'fake.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('NOT-A-JPEG'),
          size: 1024
        },
        {
          originalname: 'fake.png',
          mimetype: 'image/png',
          buffer: Buffer.from('NOT-A-PNG'),
          size: 1024
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(invalidSignatureFiles)
      
      expect(validation.valid).toBe(false)
    })
  })

  describe('File Count Validation', () => {
    it('should accept up to 5 files', () => {
      const fiveFiles = Array.from({ length: 5 }, (_, i) => ({
        originalname: `file${i}.pdf`,
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
        size: 1024
      })) as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(fiveFiles)
      
      expect(validation.valid).toBe(true)
      expect(validation.validatedFiles).toHaveLength(5)
    })

    it('should reject more than 5 files', () => {
      const sixFiles = Array.from({ length: 6 }, (_, i) => ({
        originalname: `file${i}.pdf`,
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
        size: 1024
      })) as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(sixFiles)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('Too many files')
    })

    it('should handle empty file list', () => {
      const validation = FileValidationService.validateFiles([])
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('No files provided')
    })
  })

  describe('Filename Sanitization', () => {
    it('should sanitize dangerous filenames', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        'file<script>.pdf',
        'file with spaces.pdf',
        'file@special#chars.pdf',
        'file\x00null.pdf'
      ]

      dangerousNames.forEach(name => {
        const sanitized = FileValidationService.sanitizeFilename(name)
        expect(sanitized).not.toContain('..')
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).not.toContain(' ')
        expect(sanitized).not.toContain('@')
        expect(sanitized).not.toContain('#')
        expect(sanitized).toMatch(/^[a-zA-Z0-9._-]+$/)
      })
    })

    it('should generate unique filenames', () => {
      const originalName = 'test_document.pdf'
      const unique1 = FileValidationService.generateUniqueFilename(originalName)
      const unique2 = FileValidationService.generateUniqueFilename(originalName)

      expect(unique1).not.toBe(unique2)
      expect(unique1).toContain('test_document')
      expect(unique1).toMatch(/\.pdf$/)
    })

    it('should handle filenames without extensions', () => {
      const noExtension = 'document'
      const sanitized = FileValidationService.sanitizeFilename(noExtension)
      
      expect(sanitized).toMatch(/^document_[\d_]+$/)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle corrupted files gracefully', () => {
      const corruptedFiles = [
        {
          originalname: 'corrupted.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from(''), // Empty buffer
          size: 0
        },
        {
          originalname: 'truncated.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from([0xFF]), // Truncated JPEG
          size: 1
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(corruptedFiles)
      
      expect(validation.valid).toBe(false)
    })

    it('should handle files with invalid MIME types', () => {
      const invalidMimeFiles = [
        {
          originalname: 'file.pdf',
          mimetype: 'invalid/mimetype',
          buffer: Buffer.from('%PDF-1.4'),
          size: 1024
        }
      ] as Express.Multer.File[]

      const validation = FileValidationService.validateFiles(invalidMimeFiles)
      
      expect(validation.valid).toBe(false)
      expect(validation.errors[0]).toContain('Type invalid/mimetype not allowed')
    })

    it('should handle buffer reading errors', () => {
      const problematicFile = {
        originalname: 'problematic.pdf',
        mimetype: 'application/pdf',
        buffer: {
          toString: () => { throw new Error('Buffer read error') }
        },
        size: 1024
      } as any as Express.Multer.File

      const validation = FileValidationService.validateFiles([problematicFile])
      
      expect(validation.valid).toBe(false)
    })
  })

  describe('Performance Tests', () => {
    it('should validate multiple files quickly', () => {
      const startTime = Date.now()
      
      const manyFiles = Array.from({ length: 100 }, (_, i) => ({
        originalname: `file${i}.pdf`,
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
        size: 1024
      })) as Express.Multer.File[]

      // Test only first 5 files due to limit
      const validation = FileValidationService.validateFiles(manyFiles.slice(0, 5))
      
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(validation.valid).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle large file content validation', () => {
      const largeContent = 'A'.repeat(1024 * 1024) // 1MB of content
      const largeFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from(`%PDF-1.4\n${largeContent}`),
        size: 1024 * 1024
      } as Express.Multer.File

      const startTime = Date.now()
      const validation = FileValidationService.validateFiles([largeFile])
      const endTime = Date.now()

      expect(validation.valid).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // Should complete within 100ms
    })
  })
})