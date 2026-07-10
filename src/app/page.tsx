'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLoanStore, type EnrichedLoan } from '@/lib/loan-store';
import LoginScreen from '@/components/loan-tracker/login-screen';
import DashboardSummary from '@/components/loan-tracker/dashboard-summary';
import AddLoanDialog from '@/components/loan-tracker/add-loan-dialog';
import LoanTable from '@/components/loan-tracker/loan-table';
import PaymentDialog from '@/components/loan-tracker/payment-dialog';
import ConfirmDeleteDialog from '@/components/loan-tracker/confirm-delete-dialog';
import {
  Plus,
  LogOut,
  Download,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateReceiptHTML(loan: EnrichedLoan): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Loan Receipt - ${loan.borrowerName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; background: white; }
    .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #e5e7eb; border-radius: 12px; padding: 32px; }
    .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #FACC15; }
    .header h1 { font-size: 24px; font-weight: 800; color: #0a0a0a; margin-bottom: 4px; }
    .header p { font-size: 12px; color: #9ca3af; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .field label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 2px; }
    .field .value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
    .divider { border-top: 1px solid #e5e7eb; margin: 16px 0; }
    .totals { background: #f9fafb; border-radius: 8px; padding: 16px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .total-row.grand { font-size: 18px; font-weight: 800; color: #0a0a0a; border-top: 2px solid #FACC15; margin-top: 8px; padding-top: 12px; }
    .total-row .label { color: #6b7280; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .status-paid { background: #dcfce7; color: #16a34a; }
    .status-pending { background: #fef9c3; color: #a16207; }
    .status-overdue { background: #fee2e2; color: #dc2626; }
    .payments { margin-top: 16px; }
    .payments h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 8px; }
    .payment-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .footer { text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>LOAN RECEIPT</h1>
      <p>Generated on ${format(new Date(), 'dd MMMM yyyy HH:mm')}</p>
    </div>
    <div class="grid">
      <div class="field">
        <label>Borrower Name</label>
        <div class="value">${loan.borrowerName}</div>
      </div>
      <div class="field">
        <label>Contact</label>
        <div class="value">${loan.contact}</div>
      </div>
      <div class="field">
        <label>Date Borrowed</label>
        <div class="value">${format(new Date(loan.dateBorrowed), 'dd MMM yyyy')}</div>
      </div>
      <div class="field">
        <label>Due Date</label>
        <div class="value">${format(new Date(loan.dueDate), 'dd MMM yyyy')}</div>
      </div>
      <div class="field">
        <label>Status</label>
        <div class="value">
          <span class="status-badge status-${loan.computedStatus}">${loan.computedStatus}</span>
        </div>
      </div>
      ${loan.daysOverdue > 0 ? `
      <div class="field">
        <label>Days Overdue</label>
        <div class="value" style="color: #dc2626;">${loan.daysOverdue} days</div>
      </div>` : ''}
    </div>
    ${loan.notes ? `<p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;"><strong>Notes:</strong> ${loan.notes}</p>` : ''}
    <div class="totals">
      <div class="total-row">
        <span class="label">Amount Borrowed</span>
        <span>${formatCurrency(loan.amountBorrowed)}</span>
      </div>
      <div class="total-row">
        <span class="label">50% Interest Fee</span>
        <span>${formatCurrency(loan.fee)}</span>
      </div>
      ${loan.lateFee > 0 ? `
      <div class="total-row">
        <span class="label">Late Fee (${loan.daysOverdue} days × R50)</span>
        <span>${formatCurrency(loan.lateFee)}</span>
      </div>` : ''}
      <div class="total-row grand">
        <span>Total Due</span>
        <span>${formatCurrency(loan.totalDue)}</span>
      </div>
      <div class="total-row" style="margin-top: 8px;">
        <span class="label">Total Paid</span>
        <span style="color: #16a34a; font-weight: 600;">${formatCurrency(loan.totalPaid)}</span>
      </div>
      <div class="total-row">
        <span class="label">Outstanding Balance</span>
        <span style="color: ${loan.balance > 0 ? '#dc2626' : '#16a34a'}; font-weight: 700;">${formatCurrency(loan.balance)}</span>
      </div>
    </div>
    ${loan.payments.length > 0 ? `
    <div class="payments">
      <h3>Payment History</h3>
      ${loan.payments.map((p) => `
        <div class="payment-row">
          <span>${format(new Date(p.date), 'dd MMM yyyy')} ${p.note ? '- ' + p.note : ''}</span>
          <span style="font-weight: 600; color: #16a34a;">${formatCurrency(p.amount)}</span>
        </div>
      `).join('')}
    </div>` : ''}
    <div class="footer">
      <p>Loan Tracker — 50% Interest Loan Manager</p>
    </div>
  </div>
</body>
</html>`;
}

function exportToCSV(loans: EnrichedLoan[]) {
  const headers = [
    'Name', 'Contact', 'Amount Borrowed', '50% Fee', 'Total Due',
    'Late Fee', 'Total Paid', 'Balance', 'Date Borrowed', 'Due Date',
    'Days Overdue', 'Status', 'Notes'
  ];

  const rows = loans.map((l) => [
    l.borrowerName,
    l.contact,
    l.amountBorrowed.toFixed(2),
    l.fee.toFixed(2),
    l.totalDue.toFixed(2),
    l.lateFee.toFixed(2),
    l.totalPaid.toFixed(2),
    l.balance.toFixed(2),
    l.dateBorrowed,
    l.dueDate,
    l.daysOverdue.toString(),
    l.computedStatus,
    l.notes.replace(/,/g, ';'),
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loan-tracker-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const isAuthenticated = useLoanStore((s) => s.isAuthenticated);
  const authChecked = useLoanStore((s) => s.authChecked);
  const init = useLoanStore((s) => s.init);
  const logout = useLoanStore((s) => s.logout);
  const loans = useLoanStore((s) => s.loans);
  const lateFeeEnabled = useLoanStore((s) => s.lateFeeEnabled);
  const setLateFeeEnabled = useLoanStore((s) => s.setLateFeeEnabled);
  const getEnrichedLoan = useLoanStore((s) => s.getEnrichedLoan);
  const deleteLoan = useLoanStore((s) => s.deleteLoan);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editLoan, setEditLoan] = useState<EnrichedLoan | null>(null);
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedLoan | null>(null);

  const paymentLoan = useMemo(() => {
    if (!paymentLoanId) return null;
    const loan = loans.find((l) => l.id === paymentLoanId);
    return loan ? getEnrichedLoan(loan) : null;
  }, [loans, paymentLoanId, getEnrichedLoan]);

  const handleEdit = useCallback((loan: EnrichedLoan) => {
    setEditLoan(loan);
    setAddDialogOpen(true);
  }, []);

  const handleDelete = useCallback((loan: EnrichedLoan) => {
    setDeleteTarget(loan);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteLoan(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteLoan]);

  const handleReceipt = useCallback((loan: EnrichedLoan) => {
    const html = generateReceiptHTML(loan);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }, []);

  const handleExport = useCallback(() => {
    const enrichedLoans = loans.map((l) => getEnrichedLoan(l));
    exportToCSV(enrichedLoans);
  }, [loans, getEnrichedLoan]);

  useEffect(() => {
    init();
  }, [init]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground sm:text-base">Loan Tracker</h1>
              <p className="text-[10px] text-zinc-500 hidden sm:block">50% Interest Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Late Fee Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={lateFeeEnabled}
                onCheckedChange={setLateFeeEnabled}
                className="data-[state=checked]:bg-primary"
                id="late-fee-toggle"
              />
              <Label htmlFor="late-fee-toggle" className="text-[11px] text-muted-foreground hidden sm:block">
                R50/day late fee
              </Label>
            </div>

            <Separator orientation="vertical" className="h-5 bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="text-muted-foreground hover:text-foreground text-xs h-8"
              disabled={loans.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive text-xs h-8"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
            <p className="text-xs text-zinc-500">
              {loans.length} loan{loans.length !== 1 ? 's' : ''} tracked
              {lateFeeEnabled ? ' · Late fees active (R50/day)' : ' · Late fees disabled'}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditLoan(null);
              setAddDialogOpen(true);
            }}
            className="bg-primary text-primary-foreground font-semibold text-sm hover:bg-neon-glow hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Loan
          </Button>
        </div>

        {/* Summary Cards */}
        <DashboardSummary />

        {/* Loan Table */}
        <LoanTable
          onEdit={handleEdit}
          onPayment={(loan) => setPaymentLoanId(loan.id)}
          onDelete={handleDelete}
          onReceipt={handleReceipt}
        />
      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 mt-auto border-t border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-[10px] text-zinc-600">Loan Tracker · 50% Interest Manager</p>
          <p className="text-[10px] text-zinc-600">Developed by PrimeCode</p>
        </div>
      </footer>

      {/* Dialogs */}
      <AddLoanDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditLoan(null);
        }}
        editLoan={editLoan}
      />

      <PaymentDialog
        open={!!paymentLoan}
        onOpenChange={(open) => {
          if (!open) setPaymentLoanId(null);
        }}
        loan={paymentLoan}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        borrowerName={deleteTarget?.borrowerName || ''}
      />
    </div>
  );
}