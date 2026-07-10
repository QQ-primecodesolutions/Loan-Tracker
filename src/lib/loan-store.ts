import { create } from 'zustand';
import { toast } from 'sonner';
import {
  Loan,
  Payment,
  calculateDaysOverdue,
  calculateBalance,
  determineStatus,
} from './types';

interface LoanStore {
  loans: Loan[];
  isAuthenticated: boolean;
  authChecked: boolean;
  isLoading: boolean;
  lateFeeEnabled: boolean;
  init: () => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'status' | 'payments' | 'createdAt'>) => Promise<void>;
  updateLoan: (id: string, data: Partial<Omit<Loan, 'id' | 'payments' | 'createdAt'>>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  addPayment: (loanId: string, payment: Omit<Payment, 'id' | 'loanId'>) => Promise<void>;
  deletePayment: (loanId: string, paymentId: string) => Promise<void>;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setLateFeeEnabled: (enabled: boolean) => Promise<void>;
  getEnrichedLoan: (loan: Loan) => EnrichedLoan;
  getSummary: () => Summary;
}

export interface EnrichedLoan extends Loan {
  fee: number;
  totalToReturn: number;
  daysOverdue: number;
  lateFee: number;
  totalDue: number;
  totalPaid: number;
  balance: number;
  computedStatus: string;
}

export interface Summary {
  totalLoanedOut: number;
  totalExpectedReturns: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdueCount: number;
  totalLateFees: number;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed (${res.status})`);
  }
  return res.json();
}

export const useLoanStore = create<LoanStore>()((set, get) => ({
  loans: [],
  isAuthenticated: false,
  authChecked: false,
  isLoading: false,
  lateFeeEnabled: true,

  init: async () => {
    try {
      const session = await apiFetch<{ authenticated: boolean }>('/api/auth/session');
      if (!session.authenticated) {
        set({ isAuthenticated: false, authChecked: true });
        return;
      }

      set({ isAuthenticated: true, isLoading: true });
      const [loans, settings] = await Promise.all([
        apiFetch<Loan[]>('/api/loans'),
        apiFetch<{ lateFeeEnabled: boolean }>('/api/settings'),
      ]);
      set({ loans, lateFeeEnabled: settings.lateFeeEnabled, isLoading: false, authChecked: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data');
      set({ authChecked: true, isLoading: false });
    }
  },

  login: async (password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    set({ isAuthenticated: true });
    await get().init();
    return true;
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    set({ isAuthenticated: false, loans: [] });
  },

  setLateFeeEnabled: async (enabled: boolean) => {
    try {
      const result = await apiFetch<{ lateFeeEnabled: boolean; loans: Loan[] }>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ lateFeeEnabled: enabled }),
      });
      set({ lateFeeEnabled: result.lateFeeEnabled, loans: result.loans });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update late fee setting');
    }
  },

  addLoan: async (loan) => {
    try {
      const created = await apiFetch<Loan>('/api/loans', {
        method: 'POST',
        body: JSON.stringify(loan),
      });
      set((state) => ({ loans: [created, ...state.loans] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add loan');
    }
  },

  updateLoan: async (id, data) => {
    try {
      const updated = await apiFetch<Loan>(`/api/loans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      set((state) => ({ loans: state.loans.map((l) => (l.id === id ? updated : l)) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update loan');
    }
  },

  deleteLoan: async (id) => {
    try {
      await apiFetch(`/api/loans/${id}`, { method: 'DELETE' });
      set((state) => ({ loans: state.loans.filter((l) => l.id !== id) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete loan');
    }
  },

  addPayment: async (loanId, payment) => {
    try {
      const updated = await apiFetch<Loan>(`/api/loans/${loanId}/payments`, {
        method: 'POST',
        body: JSON.stringify(payment),
      });
      set((state) => ({ loans: state.loans.map((l) => (l.id === loanId ? updated : l)) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    }
  },

  deletePayment: async (loanId, paymentId) => {
    try {
      const updated = await apiFetch<Loan>(`/api/loans/${loanId}/payments/${paymentId}`, {
        method: 'DELETE',
      });
      set((state) => ({ loans: state.loans.map((l) => (l.id === loanId ? updated : l)) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete payment');
    }
  },

  getEnrichedLoan: (loan) => {
    const { lateFeeEnabled } = get();
    const fee = loan.amountBorrowed * 0.5;
    const totalToReturn = loan.amountBorrowed * 1.5;
    const daysOverdue = calculateDaysOverdue(loan.dueDate);
    const lateFee = lateFeeEnabled ? daysOverdue * 50 : 0;
    const totalDue = totalToReturn + lateFee;
    const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, totalDue - totalPaid);
    const computedStatus = determineStatus(loan, daysOverdue, balance);

    return {
      ...loan,
      fee,
      totalToReturn,
      daysOverdue,
      lateFee,
      totalDue,
      totalPaid,
      balance,
      computedStatus,
    };
  },

  getSummary: () => {
    const { loans, lateFeeEnabled } = get();
    let totalLoanedOut = 0;
    let totalExpectedReturns = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdueCount = 0;
    let totalLateFees = 0;

    for (const loan of loans) {
      const daysOverdue = calculateDaysOverdue(loan.dueDate);
      const lateFee = lateFeeEnabled ? daysOverdue * 50 : 0;
      const totalDue = loan.amountBorrowed * 1.5 + lateFee;
      const totalPaid = loan.payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, totalDue - totalPaid);

      totalLoanedOut += loan.amountBorrowed;
      totalExpectedReturns += totalDue;
      totalCollected += totalPaid;
      totalOutstanding += balance;
      totalLateFees += lateFee;

      if (balance > 0 && daysOverdue > 0) {
        totalOverdueCount++;
      }
    }

    return {
      totalLoanedOut,
      totalExpectedReturns,
      totalCollected,
      totalOutstanding,
      totalOverdueCount,
      totalLateFees,
    };
  },
}));
