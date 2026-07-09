export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  note: string;
}

export type LoanStatus = 'pending' | 'paid' | 'overdue';

export interface Loan {
  id: string;
  borrowerName: string;
  contact: string;
  amountBorrowed: number;
  dateBorrowed: string;
  dueDate: string;
  notes: string;
  status: LoanStatus;
  payments: Payment[];
  createdAt: string;
}

export function calculateFee(amountBorrowed: number): number {
  return amountBorrowed * 0.5;
}

export function calculateTotalToReturn(amountBorrowed: number): number {
  return amountBorrowed * 1.5;
}

export function calculateDaysOverdue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = now.getTime() - due.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculateLateFee(daysOverdue: number, enabled: boolean): number {
  return enabled ? daysOverdue * 50 : 0;
}

export function calculateTotalPaid(payments: Payment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

export function calculateBalance(
  amountBorrowed: number,
  daysOverdue: number,
  lateFeeEnabled: boolean,
  payments: Payment[]
): number {
  const totalDue = calculateTotalToReturn(amountBorrowed) + calculateLateFee(daysOverdue, lateFeeEnabled);
  return Math.max(0, totalDue - calculateTotalPaid(payments));
}

export function calculateTotalDue(
  amountBorrowed: number,
  daysOverdue: number,
  lateFeeEnabled: boolean
): number {
  return calculateTotalToReturn(amountBorrowed) + calculateLateFee(daysOverdue, lateFeeEnabled);
}

export function determineStatus(loan: Loan, daysOverdue: number, balance: number): LoanStatus {
  if (balance <= 0) return 'paid';
  if (daysOverdue > 0) return 'overdue';
  return 'pending';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}