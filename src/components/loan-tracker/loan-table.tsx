'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLoanStore, type EnrichedLoan } from '@/lib/loan-store';
import { format } from 'date-fns';
import {
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  CreditCard,
  FileText,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    pending: 'bg-primary/15 text-primary border-primary/20',
    overdue: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <Badge variant="outline" className={`${variants[status] || variants.pending} text-[10px] font-semibold uppercase px-2 py-0.5`}>
      {status}
    </Badge>
  );
}

interface LoanTableProps {
  onEdit: (loan: EnrichedLoan) => void;
  onPayment: (loan: EnrichedLoan) => void;
  onDelete: (loan: EnrichedLoan) => void;
  onReceipt: (loan: EnrichedLoan) => void;
}

type SortField = 'borrowerName' | 'amountBorrowed' | 'dueDate' | 'balance' | 'status';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return null;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

export default function LoanTable({ onEdit, onPayment, onDelete, onReceipt }: LoanTableProps) {
  const loans = useLoanStore((s) => s.loans);
  const getEnrichedLoan = useLoanStore((s) => s.getEnrichedLoan);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const enrichedLoans = useMemo(() => {
    return loans.map((l) => getEnrichedLoan(l));
  }, [loans, getEnrichedLoan]);

  const filteredLoans = useMemo(() => {
    let result = enrichedLoans;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.borrowerName.toLowerCase().includes(q) ||
          l.contact.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((l) => l.computedStatus === statusFilter);
    }

    // Due date filter
    if (dueDateFilter === 'overdue') {
      result = result.filter((l) => l.daysOverdue > 0);
    } else if (dueDateFilter === 'this_week') {
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      result = result.filter((l) => {
        const due = new Date(l.dueDate);
        return due >= now && due <= weekEnd;
      });
    } else if (dueDateFilter === 'this_month') {
      const now = new Date();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      result = result.filter((l) => {
        const due = new Date(l.dueDate);
        return due >= now && due <= monthEnd;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'borrowerName':
          cmp = a.borrowerName.localeCompare(b.borrowerName);
          break;
        case 'amountBorrowed':
          cmp = a.amountBorrowed - b.amountBorrowed;
          break;
        case 'dueDate':
          cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'balance':
          cmp = a.balance - b.balance;
          break;
        case 'status': {
          const order = { overdue: 0, pending: 1, paid: 2 };
          cmp = (order[a.computedStatus as keyof typeof order] ?? 1) - (order[b.computedStatus as keyof typeof order] ?? 1);
          break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [enrichedLoans, search, statusFilter, dueDateFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };



  const handleWhatsApp = (loan: EnrichedLoan) => {
    const message = `Hi ${loan.borrowerName}, reminder: Loan R${loan.amountBorrowed.toLocaleString()}. Total to return with 50% is R${loan.totalToReturn.toLocaleString()}. Due: ${format(new Date(loan.dueDate), 'dd MMM yyyy')}. Outstanding: R${loan.balance.toLocaleString()}. - Loan Tracker`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${loan.contact.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedLoans = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLoans.slice(start, start + pageSize);
  }, [filteredLoans, safePage, pageSize]);

  const rangeStart = filteredLoans.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredLoans.length);

  // Reset to page 1 when filters or page size change
  const updateStatusFilter = useCallback((v: string) => { setStatusFilter(v); setCurrentPage(1); }, []);
  const updateDueDateFilter = useCallback((v: string) => { setDueDateFilter(v); setCurrentPage(1); }, []);
  const updateSearch = useCallback((v: string) => { setSearch(v); setCurrentPage(1); }, []);
  const updatePageSize = useCallback((v: number) => { setPageSize(v); setCurrentPage(1); }, []);

  const hasActiveFilters = search || statusFilter !== 'all' || dueDateFilter !== 'all';

  // Build page numbers for pagination (show first, last, and window around current)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (safePage > 3) pages.push('ellipsis');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-3">
      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search by name or contact..."
            className="pl-9 bg-surface border-border text-foreground placeholder:text-zinc-600 text-sm"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={updateStatusFilter}>
            <SelectTrigger className="w-[130px] bg-surface border-border text-foreground text-sm">
              <Filter className="w-3 h-3 mr-1 text-zinc-500" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueDateFilter} onValueChange={updateDueDateFilter}>
            <SelectTrigger className="w-[140px] bg-surface border-border text-foreground text-sm">
              <SelectValue placeholder="Due Date" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(hasActiveFilters || filteredLoans.length > pageSize) && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {hasActiveFilters
              ? `Showing ${rangeStart}–${rangeEnd} of ${filteredLoans.length} filtered (${enrichedLoans.length} total)`
              : `Showing ${rangeStart}–${rangeEnd} of ${filteredLoans.length} loans`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Per page</span>
            <Select value={String(pageSize)} onValueChange={(v) => updatePageSize(Number(v))}>
              <SelectTrigger className="w-[60px] h-7 bg-surface border-border text-foreground text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10">
                  <button onClick={() => toggleSort('borrowerName')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Name <SortIcon field="borrowerName" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 hidden sm:table-cell">Contact</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 text-right">
                  <button onClick={() => toggleSort('amountBorrowed')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                    Borrowed <SortIcon field="amountBorrowed" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 text-right hidden md:table-cell">50% Fee</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 text-right">
                  <button onClick={() => toggleSort('balance')} className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors">
                    Total Due <SortIcon field="balance" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 hidden lg:table-cell">
                  <button onClick={() => toggleSort('dueDate')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Due Date <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 text-center hidden md:table-cell">Days Over</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 text-center">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold h-10 w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-zinc-500 text-sm">
                    {hasActiveFilters ? 'No loans match your filters' : 'No loans yet. Add your first loan!'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLoans.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className="border-border hover:bg-surface/50 transition-colors group"
                  >
                    <TableCell className="py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{loan.borrowerName}</p>
                        <p className="text-xs text-zinc-500 sm:hidden">{loan.contact}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground hidden sm:table-cell">
                      {loan.contact}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-foreground text-right font-mono">
                      {formatCurrency(loan.amountBorrowed)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-primary text-right font-mono hidden md:table-cell">
                      {formatCurrency(loan.fee)}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <span className={`text-sm font-mono font-semibold ${
                        loan.computedStatus === 'paid'
                          ? 'text-emerald-400'
                          : loan.computedStatus === 'overdue'
                          ? 'text-red-400'
                          : 'text-foreground'
                      }`}>
                        {formatCurrency(loan.totalDue)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {format(new Date(loan.dueDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="py-3 text-center hidden md:table-cell">
                      {loan.daysOverdue > 0 ? (
                        <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-semibold px-1.5 py-0">
                          {loan.daysOverdue}d
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <StatusBadge status={loan.computedStatus} />
                    </TableCell>
                    <TableCell className="py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4 text-zinc-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border w-48">
                          {loan.computedStatus !== 'paid' && (
                            <DropdownMenuItem onClick={() => onPayment(loan)} className="text-foreground focus:bg-surface cursor-pointer">
                              <CreditCard className="w-4 h-4 mr-2 text-primary" />
                              Record Payment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onPayment(loan)} className="text-foreground focus:bg-surface cursor-pointer">
                            <FileText className="w-4 h-4 mr-2 text-blue-400" />
                            Payment History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onReceipt(loan)} className="text-foreground focus:bg-surface cursor-pointer">
                            <FileText className="w-4 h-4 mr-2 text-emerald-400" />
                            Generate Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleWhatsApp(loan)} className="text-foreground focus:bg-surface cursor-pointer">
                            <MessageCircle className="w-4 h-4 mr-2 text-green-400" />
                            WhatsApp Reminder
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem onClick={() => onEdit(loan)} className="text-foreground focus:bg-surface cursor-pointer">
                            <Pencil className="w-4 h-4 mr-2 text-zinc-400" />
                            Edit Loan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(loan)} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Loan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={safePage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-surface hover:text-foreground'}
                tabIndex={safePage <= 1 ? -1 : 0}
                aria-disabled={safePage <= 1}
              />
            </PaginationItem>
            {getPageNumbers().map((page, idx) =>
              page === 'ellipsis' ? (
                <PaginationItem key={`el-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={page === safePage}
                    className={
                      page === safePage
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer'
                        : 'cursor-pointer hover:bg-surface hover:text-foreground'
                    }
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={safePage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-surface hover:text-foreground'}
                tabIndex={safePage >= totalPages ? -1 : 0}
                aria-disabled={safePage >= totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}