import { describe, test, expect } from 'bun:test'
import { z } from 'zod'

/**
 * Unit tests for input validation schemas used across the API.
 * These tests verify that the validation logic correctly accepts valid input
 * and rejects invalid input before it reaches the business logic layer.
 */

// Case creation schema (mirrors the one in cases router)
const createCaseSchema = z.object({
  title: z.string().min(5).max(255),
  category: z.enum([
    'contract',
    'family',
    'corporate',
    'criminal',
    'civil',
    'property',
    'employment',
    'immigration',
    'intellectual_property',
    'other',
  ]),
  description: z.string().min(20),
})

// Quote submission schema
const submitQuoteSchema = z.object({
  caseId: z.string().uuid(),
  amount: z.number().positive().max(1000000),
  expectedDays: z.number().int().positive().max(365),
  note: z.string().max(1000).optional(),
})

// Pagination schema
const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
})

describe('Case Validation', () => {
  describe('createCaseSchema', () => {
    test('accepts valid case input', () => {
      const validInput = {
        title: 'Property Dispute Case',
        category: 'property',
        description: 'This is a detailed description of my property dispute that needs legal attention.',
      }
      
      const result = createCaseSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    test('rejects title shorter than 5 characters', () => {
      const invalidInput = {
        title: 'Hi',
        category: 'property',
        description: 'This is a detailed description of my property dispute.',
      }
      
      const result = createCaseSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects title longer than 255 characters', () => {
      const invalidInput = {
        title: 'A'.repeat(256),
        category: 'property',
        description: 'This is a detailed description of my property dispute.',
      }
      
      const result = createCaseSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects invalid category', () => {
      const invalidInput = {
        title: 'Valid Title Here',
        category: 'invalid_category',
        description: 'This is a detailed description of my property dispute.',
      }
      
      const result = createCaseSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects description shorter than 20 characters', () => {
      const invalidInput = {
        title: 'Valid Title Here',
        category: 'property',
        description: 'Too short',
      }
      
      const result = createCaseSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('accepts all valid categories', () => {
      const categories = [
        'contract',
        'family',
        'corporate',
        'criminal',
        'civil',
        'property',
        'employment',
        'immigration',
        'intellectual_property',
        'other',
      ]
      
      for (const category of categories) {
        const input = {
          title: 'Valid Title Here',
          category,
          description: 'This is a valid description that is long enough.',
        }
        const result = createCaseSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })
  })
})

describe('Quote Validation', () => {
  describe('submitQuoteSchema', () => {
    test('accepts valid quote input', () => {
      const validInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5000,
        expectedDays: 30,
        note: 'I have experience in similar cases.',
      }
      
      const result = submitQuoteSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    test('accepts quote without optional note', () => {
      const validInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5000,
        expectedDays: 30,
      }
      
      const result = submitQuoteSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    test('rejects invalid UUID for caseId', () => {
      const invalidInput = {
        caseId: 'not-a-uuid',
        amount: 5000,
        expectedDays: 30,
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects negative amount', () => {
      const invalidInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: -100,
        expectedDays: 30,
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects zero amount', () => {
      const invalidInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 0,
        expectedDays: 30,
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects amount exceeding 1,000,000', () => {
      const invalidInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 1000001,
        expectedDays: 30,
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects non-integer expectedDays', () => {
      const invalidInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5000,
        expectedDays: 30.5,
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects expectedDays exceeding 365', () => {
      const invalidInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5000,
        expectedDays: 400,
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects note exceeding 1000 characters', () => {
      const invalidInput = {
        caseId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 5000,
        expectedDays: 30,
        note: 'A'.repeat(1001),
      }
      
      const result = submitQuoteSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})

describe('Pagination Validation', () => {
  describe('paginationSchema', () => {
    test('uses default values when not provided', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.pageSize).toBe(10)
      }
    })

    test('accepts valid pagination parameters', () => {
      const validInput = { page: 5, pageSize: 25 }
      const result = paginationSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    test('rejects page less than 1', () => {
      const invalidInput = { page: 0, pageSize: 10 }
      const result = paginationSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects negative page', () => {
      const invalidInput = { page: -1, pageSize: 10 }
      const result = paginationSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects pageSize less than 1', () => {
      const invalidInput = { page: 1, pageSize: 0 }
      const result = paginationSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    test('rejects pageSize exceeding 50', () => {
      const invalidInput = { page: 1, pageSize: 100 }
      const result = paginationSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })
  })
})
