import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Loan,
  Payment,
  generateId,
  calculateDaysOverdue,
  calculateBalance,
  determineStatus,
} from './types';

const APP_PASSWORD = 'loan2024';

interface LoanStore {
  loans: Loan[];
  isAuthenticated: boolean;
  lateFeeEnabled: boolean;
  addLoan: (loan: Omit<Loan, 'id' | 'status' | 'payments' | 'createdAt'>) => void;
  updateLoan: (id: string, data: Partial<Omit<Loan, 'id' | 'payments' | 'createdAt'>>) => void;
  deleteLoan: (id: string) => void;
  addPayment: (loanId: string, payment: Omit<Payment, 'id' | 'loanId'>) => void;
  deletePayment: (loanId: string, paymentId: string) => void;
  login: (password: string) => boolean;
  logout: () => void;
  setLateFeeEnabled: (enabled: boolean) => void;
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

function recalcLoan(loan: Loan, lateFeeEnabled: boolean): Loan {
  const daysOverdue = calculateDaysOverdue(loan.dueDate);
  const balance = calculateBalance(loan.amountBorrowed, daysOverdue, lateFeeEnabled, loan.payments);
  const newStatus = determineStatus(loan, daysOverdue, balance);
  if (loan.status !== newStatus) {
    return { ...loan, status: newStatus };
  }
  return loan;
}

export const useLoanStore = create<LoanStore>()(
  persist(
    (set, get) => ({
      loans: [],
      isAuthenticated: false,
      lateFeeEnabled: true,

      login: (password: string) => {
        if (password === APP_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false });
      },

      setLateFeeEnabled: (enabled: boolean) => {
        set((state) => ({
          lateFeeEnabled: enabled,
          loans: state.loans.map((l) => recalcLoan(l, enabled)),
        }));
      },

      addLoan: (loan) => {
        const newLoan: Loan = {
          ...loan,
          id: generateId(),
          status: 'pending',
          payments: [],
          createdAt: new Date().toISOString(),
        };
        const { lateFeeEnabled } = get();
        const enriched = recalcLoan(newLoan, lateFeeEnabled);
        set((state) => ({ loans: [enriched, ...state.loans] }));
      },

      updateLoan: (id, data) => {
        set((state) => ({
          loans: state.loans.map((l) => {
            if (l.id !== id) return l;
            const updated = { ...l, ...data };
            return recalcLoan(updated, state.lateFeeEnabled);
          }),
        }));
      },

      deleteLoan: (id) => {
        set((state) => ({ loans: state.loans.filter((l) => l.id !== id) }));
      },

      addPayment: (loanId, payment) => {
        const newPayment: Payment = {
          ...payment,
          id: generateId(),
          loanId,
        };
        set((state) => {
          const loans = state.loans.map((l) => {
            if (l.id !== loanId) return l;
            const updated = { ...l, payments: [...l.payments, newPayment] };
            return recalcLoan(updated, state.lateFeeEnabled);
          });
          return { loans };
        });
      },

      deletePayment: (loanId, paymentId) => {
        set((state) => {
          const loans = state.loans.map((l) => {
            if (l.id !== loanId) return l;
            const updated = {
              ...l,
              payments: l.payments.filter((p) => p.id !== paymentId),
            };
            return recalcLoan(updated, state.lateFeeEnabled);
          });
          return { loans };
        });
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
    }),
    {
      name: 'loan-tracker-storage',
      partialize: (state) => ({
        loans: state.loans,
        lateFeeEnabled: state.lateFeeEnabled,
      }),
    }
  )
);