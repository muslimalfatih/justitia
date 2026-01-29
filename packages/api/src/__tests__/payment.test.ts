import { describe, test, expect } from 'bun:test'

/**
 * Unit tests for payment and quote acceptance business logic.
 * These tests verify the atomic nature of quote acceptance and payment flow.
 */

type CaseStatus = 'open' | 'engaged' | 'closed' | 'cancelled'
type QuoteStatus = 'proposed' | 'accepted' | 'rejected'
type PaymentStatus = 'pending' | 'succeeded' | 'failed'

interface Case {
  id: string
  clientId: string
  status: CaseStatus
  acceptedQuoteId: string | null
}

interface Quote {
  id: string
  caseId: string
  lawyerId: string
  status: QuoteStatus
  amount: number
}

interface Payment {
  id: string
  quoteId: string
  status: PaymentStatus
}

/**
 * Check if a case can accept new quotes
 */
function canAcceptQuotes(caseData: Case): boolean {
  return caseData.status === 'open'
}

/**
 * Check if a quote can be accepted
 */
function canQuoteBeAccepted(quote: Quote, caseData: Case): boolean {
  return quote.status === 'proposed' && caseData.status === 'open'
}

/**
 * Check if a quote can be withdrawn by lawyer
 */
function canWithdrawQuote(quote: Quote, lawyerId: string): boolean {
  return quote.lawyerId === lawyerId && quote.status === 'proposed'
}

/**
 * Simulate quote acceptance result
 * This represents the atomic transaction that should happen on payment success
 */
function simulateQuoteAcceptance(
  targetQuoteId: string,
  allQuotes: Quote[],
  caseData: Case
): { quotes: Quote[]; case: Case } {
  const updatedQuotes = allQuotes.map(quote => {
    if (quote.id === targetQuoteId) {
      return { ...quote, status: 'accepted' as QuoteStatus }
    } else if (quote.caseId === caseData.id && quote.status === 'proposed') {
      return { ...quote, status: 'rejected' as QuoteStatus }
    }
    return quote
  })

  const updatedCase: Case = {
    ...caseData,
    status: 'engaged',
    acceptedQuoteId: targetQuoteId,
  }

  return { quotes: updatedQuotes, case: updatedCase }
}

/**
 * Check if payment status allows file access for lawyer
 */
function lawyerCanAccessFiles(payment: Payment | null, quote: Quote): boolean {
  return payment !== null && 
         payment.status === 'succeeded' && 
         quote.status === 'accepted'
}

describe('Case Status Checks', () => {
  test('open case can accept quotes', () => {
    const openCase: Case = {
      id: 'case-1',
      clientId: 'client-1',
      status: 'open',
      acceptedQuoteId: null,
    }
    expect(canAcceptQuotes(openCase)).toBe(true)
  })

  test('engaged case cannot accept quotes', () => {
    const engagedCase: Case = {
      id: 'case-1',
      clientId: 'client-1',
      status: 'engaged',
      acceptedQuoteId: 'quote-1',
    }
    expect(canAcceptQuotes(engagedCase)).toBe(false)
  })

  test('closed case cannot accept quotes', () => {
    const closedCase: Case = {
      id: 'case-1',
      clientId: 'client-1',
      status: 'closed',
      acceptedQuoteId: 'quote-1',
    }
    expect(canAcceptQuotes(closedCase)).toBe(false)
  })

  test('cancelled case cannot accept quotes', () => {
    const cancelledCase: Case = {
      id: 'case-1',
      clientId: 'client-1',
      status: 'cancelled',
      acceptedQuoteId: null,
    }
    expect(canAcceptQuotes(cancelledCase)).toBe(false)
  })
})

describe('Quote Acceptance Logic', () => {
  const openCase: Case = {
    id: 'case-1',
    clientId: 'client-1',
    status: 'open',
    acceptedQuoteId: null,
  }

  const engagedCase: Case = {
    id: 'case-1',
    clientId: 'client-1',
    status: 'engaged',
    acceptedQuoteId: 'quote-1',
  }

  test('proposed quote on open case can be accepted', () => {
    const proposedQuote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'proposed',
      amount: 5000,
    }
    expect(canQuoteBeAccepted(proposedQuote, openCase)).toBe(true)
  })

  test('accepted quote cannot be accepted again', () => {
    const acceptedQuote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'accepted',
      amount: 5000,
    }
    expect(canQuoteBeAccepted(acceptedQuote, engagedCase)).toBe(false)
  })

  test('rejected quote cannot be accepted', () => {
    const rejectedQuote: Quote = {
      id: 'quote-2',
      caseId: 'case-1',
      lawyerId: 'lawyer-2',
      status: 'rejected',
      amount: 4000,
    }
    expect(canQuoteBeAccepted(rejectedQuote, engagedCase)).toBe(false)
  })

  test('proposed quote on engaged case cannot be accepted', () => {
    const proposedQuote: Quote = {
      id: 'quote-3',
      caseId: 'case-1',
      lawyerId: 'lawyer-3',
      status: 'proposed',
      amount: 3000,
    }
    expect(canQuoteBeAccepted(proposedQuote, engagedCase)).toBe(false)
  })
})

describe('Atomic Quote Acceptance', () => {
  test('accepting one quote rejects all others', () => {
    const caseData: Case = {
      id: 'case-1',
      clientId: 'client-1',
      status: 'open',
      acceptedQuoteId: null,
    }

    const quotes: Quote[] = [
      { id: 'quote-1', caseId: 'case-1', lawyerId: 'lawyer-1', status: 'proposed', amount: 5000 },
      { id: 'quote-2', caseId: 'case-1', lawyerId: 'lawyer-2', status: 'proposed', amount: 4500 },
      { id: 'quote-3', caseId: 'case-1', lawyerId: 'lawyer-3', status: 'proposed', amount: 6000 },
    ]

    const result = simulateQuoteAcceptance('quote-2', quotes, caseData)

    // Check accepted quote
    const acceptedQuote = result.quotes.find(q => q.id === 'quote-2')
    expect(acceptedQuote?.status).toBe('accepted')

    // Check other quotes are rejected
    const otherQuotes = result.quotes.filter(q => q.id !== 'quote-2')
    for (const quote of otherQuotes) {
      expect(quote.status).toBe('rejected')
    }

    // Check case status
    expect(result.case.status).toBe('engaged')
    expect(result.case.acceptedQuoteId).toBe('quote-2')
  })

  test('quotes from other cases are not affected', () => {
    const caseData: Case = {
      id: 'case-1',
      clientId: 'client-1',
      status: 'open',
      acceptedQuoteId: null,
    }

    const quotes: Quote[] = [
      { id: 'quote-1', caseId: 'case-1', lawyerId: 'lawyer-1', status: 'proposed', amount: 5000 },
      { id: 'quote-2', caseId: 'case-2', lawyerId: 'lawyer-2', status: 'proposed', amount: 4500 }, // Different case
    ]

    const result = simulateQuoteAcceptance('quote-1', quotes, caseData)

    // Quote from different case should not be affected
    const otherCaseQuote = result.quotes.find(q => q.id === 'quote-2')
    expect(otherCaseQuote?.status).toBe('proposed')
  })
})

describe('Quote Withdrawal', () => {
  test('lawyer can withdraw own proposed quote', () => {
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'proposed',
      amount: 5000,
    }
    expect(canWithdrawQuote(quote, 'lawyer-1')).toBe(true)
  })

  test('lawyer cannot withdraw other lawyer quote', () => {
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'proposed',
      amount: 5000,
    }
    expect(canWithdrawQuote(quote, 'lawyer-2')).toBe(false)
  })

  test('lawyer cannot withdraw accepted quote', () => {
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'accepted',
      amount: 5000,
    }
    expect(canWithdrawQuote(quote, 'lawyer-1')).toBe(false)
  })

  test('lawyer cannot withdraw rejected quote', () => {
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'rejected',
      amount: 5000,
    }
    expect(canWithdrawQuote(quote, 'lawyer-1')).toBe(false)
  })
})

describe('File Access After Payment', () => {
  test('lawyer can access files after successful payment', () => {
    const payment: Payment = {
      id: 'payment-1',
      quoteId: 'quote-1',
      status: 'succeeded',
    }
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'accepted',
      amount: 5000,
    }
    expect(lawyerCanAccessFiles(payment, quote)).toBe(true)
  })

  test('lawyer cannot access files with pending payment', () => {
    const payment: Payment = {
      id: 'payment-1',
      quoteId: 'quote-1',
      status: 'pending',
    }
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'accepted',
      amount: 5000,
    }
    expect(lawyerCanAccessFiles(payment, quote)).toBe(false)
  })

  test('lawyer cannot access files with failed payment', () => {
    const payment: Payment = {
      id: 'payment-1',
      quoteId: 'quote-1',
      status: 'failed',
    }
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'accepted',
      amount: 5000,
    }
    expect(lawyerCanAccessFiles(payment, quote)).toBe(false)
  })

  test('lawyer cannot access files without payment record', () => {
    const quote: Quote = {
      id: 'quote-1',
      caseId: 'case-1',
      lawyerId: 'lawyer-1',
      status: 'proposed',
      amount: 5000,
    }
    expect(lawyerCanAccessFiles(null, quote)).toBe(false)
  })
})
