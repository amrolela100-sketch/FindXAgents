/**
 * FindX Design System — DataTable Component
 * 
 * A comprehensive, accessible data table with sorting, filtering,
 * pagination, selection, and row expansion.
 * 
 * Design Tokens Used:
 * - --findx-border-default (table borders)
 * - --findx-text-primary/secondary/muted (text colors)
 * - --findx-bg-subtle/inset (row backgrounds)
 * - --findx-interactive-hover (row hover)
 * - --findx-accent (selection, active sort)
 * - --findx-radius-md (border radius)
 * - --findx-space-2/3/4 (padding)
 * - --findx-duration-fast (transitions)
 * - --findx-shadow-sm (container shadow)
 * 
 * @example
 * <DataTable
 *   data={leads}
 *   columns={columns}
 *   pagination={{ page: 1, pageSize: 20, total: 100 }}
 *   onSort={(column, direction) => handleSort(column, direction)}
 *   onRowSelect={(rows) => handleSelect(rows)}
 * />
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type SortDirection = "asc" | "desc" | null;

export interface ColumnDef<T> {
  /** Unique column identifier */
  id: string;
  /** Column header text */
  header: string | React.ReactNode;
  /** Accessor key or custom cell renderer */
  accessorKey?: keyof T;
  /** Custom cell renderer */
  cell?: (row: T, index: number) => React.ReactNode;
  /** Column width (CSS value) */
  width?: string;
  /** Minimum column width */
  minWidth?: string;
  /** Enable sorting */
  sortable?: boolean;
  /** Enable filtering */
  filterable?: boolean;
  /** Filter type */
  filterType?: "text" | "select" | "date" | "number" | "boolean";
  /** Filter options (for select type) */
  filterOptions?: { label: string; value: string }[];
  /** Column alignment */
  align?: "left" | "center" | "right";
  /** Sticky column (left or right) */
  sticky?: "left" | "right";
  /** Hidden column (still accessible, just not visible) */
  hidden?: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface FilterState {
  [columnId: string]: string | string[] | boolean | null;
}

export interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Loading state */
  loading?: boolean;
  /** Pagination state */
  pagination?: PaginationState;
  /** Sort state */
  sort?: SortState;
  /** Filter state */
  filters?: FilterState;
  /** Row selection mode */
  selection?: "single" | "multiple" | null;
  /** Selected row IDs */
  selectedIds?: string[];
  /** Row expansion enabled */
  expandable?: boolean;
  /** Expanded row IDs */
  expandedIds?: string[];
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Sort change handler */
  onSort?: (column: string, direction: SortDirection) => void;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Page size change handler */
  onPageSizeChange?: (pageSize: number) => void;
  /** Filter change handler */
  onFilter?: (filters: FilterState) => void;
  /** Row selection handler */
  onRowSelect?: (ids: string[]) => void;
  /** Row expansion handler */
  onRowExpand?: (id: string) => void;
  /** Render expanded row content */
  renderExpandedRow?: (row: T) => React.ReactNode;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Row height for virtualization */
  rowHeight?: number;
  /** Enable column resizing */
  resizable?: boolean;
  /** Table caption for accessibility */
  caption?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SORT ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const SortAscIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const SortDescIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const SortNeutralIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4 opacity-40" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m-8 6l4 4 4-4" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// CHECKBOX COMPONENT (for selection)
// ═══════════════════════════════════════════════════════════════════════════════

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ checked, indeterminate, onChange, disabled }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={indeterminate ? "mixed" : checked}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={cn(
      "w-[18px] h-[18px] rounded-[var(--findx-radius-sm)]",
      "border transition-all duration-[var(--findx-duration-fast)]",
      "flex items-center justify-center",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--findx-accent)]",
      "focus-visible:ring-offset-2",
      disabled && "opacity-50 cursor-not-allowed",
      !disabled && "cursor-pointer",
      checked || indeterminate
        ? "bg-[var(--findx-accent)] border-[var(--findx-accent)] text-[var(--findx-accent-foreground)]"
        : "bg-[var(--findx-bg-subtle)] border-[var(--findx-border-default)] hover:border-[var(--findx-border-strong)]"
    )}
  >
    {checked && (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-3.5" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )}
    {indeterminate && !checked && (
      <div className="w-2 h-0.5 bg-current rounded-full" />
    )}
  </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterInputProps {
  column: ColumnDef<any>;
  value: string | string[] | boolean | null;
  onChange: (value: string | string[] | boolean | null) => void;
}

const FilterInput: React.FC<FilterInputProps> = ({ column, value, onChange }) => {
  if (column.filterType === "select" && column.filterOptions) {
    return (
      <select
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "w-full h-[var(--findx-space-7)] px-[var(--findx-space-2)]",
          "bg-[var(--findx-bg-subtle)] border border-[var(--findx-border-default)]",
          "text-xs text-[var(--findx-text-primary)]",
          "rounded-[var(--findx-radius-sm)]",
          "focus:outline-none focus:border-[var(--findx-border-focus)]"
        )}
      >
        <option value="">All</option>
        {column.filterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={column.filterType === "number" ? "number" : column.filterType === "date" ? "date" : "text"}
      value={(value as string) || ""}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={`Filter ${typeof column.header === "string" ? column.header : column.id}...`}
      className={cn(
        "w-full h-[var(--findx-space-7)] px-[var(--findx-space-2)]",
        "bg-[var(--findx-bg-subtle)] border border-[var(--findx-border-default)]",
        "text-xs text-[var(--findx-text-primary)]",
        "placeholder:text-[var(--findx-text-muted)]",
        "rounded-[var(--findx-radius-sm)]",
        "focus:outline-none focus:border-[var(--findx-border-focus)]"
      )}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGINATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...");
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-[var(--findx-border-default)]">
      {/* Left: Page size selector */}
      <div className="flex items-center gap-2 text-sm text-[var(--findx-text-secondary)]">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={cn(
            "h-[var(--findx-space-8)] px-2",
            "bg-[var(--findx-bg-subtle)] border border-[var(--findx-border-default)]",
            "text-sm text-[var(--findx-text-primary)]",
            "rounded-[var(--findx-radius-sm)]",
            "focus:outline-none focus:border-[var(--findx-border-focus)]"
          )}
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>of {total} results</span>
      </div>

      {/* Center: Page numbers */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={cn(
            "w-[var(--findx-space-8)] h-[var(--findx-space-8)]",
            "flex items-center justify-center",
            "rounded-[var(--findx-radius-sm)]",
            "text-sm text-[var(--findx-text-secondary)]",
            "hover:bg-[var(--findx-interactive-hover)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-[var(--findx-duration-fast)]"
          )}
          aria-label="Previous page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page number buttons */}
        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="w-[var(--findx-space-8)] text-center text-[var(--findx-text-muted)]">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "w-[var(--findx-space-8)] h-[var(--findx-space-8)]",
                "flex items-center justify-center",
                "rounded-[var(--findx-radius-sm)]",
                "text-sm font-medium",
                "transition-colors duration-[var(--findx-duration-fast)]",
                p === page
                  ? "bg-[var(--findx-accent)] text-[var(--findx-accent-foreground)]"
                  : "text-[var(--findx-text-secondary)] hover:bg-[var(--findx-interactive-hover)]"
              )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={cn(
            "w-[var(--findx-space-8)] h-[var(--findx-space-8)]",
            "flex items-center justify-center",
            "rounded-[var(--findx-radius-sm)]",
            "text-sm text-[var(--findx-text-secondary)]",
            "hover:bg-[var(--findx-interactive-hover)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors duration-[var(--findx-duration-fast)]"
          )}
          aria-label="Next page"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Right: Item range */}
      <div className="text-sm text-[var(--findx-text-muted)] hidden sm:block">
        {startItem}-{endItem} of {total}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DATATABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function DataTable<T extends { id?: string | number }>({
  className,
  data,
  columns,
  loading = false,
  pagination,
  sort,
  filters,
  selection,
  selectedIds = [],
  expandable = false,
  expandedIds = [],
  onRowClick,
  onSort,
  onPageChange,
  onPageSizeChange,
  onFilter,
  onRowSelect,
  onRowExpand,
  renderExpandedRow,
  emptyState,
  caption,
  ...props
}: DataTableProps<T>) {
  // Get row ID
  const getRowId = (row: T, index: number): string => {
    return String(row.id ?? index);
  };

  // Check if all rows are selected
  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(getRowId(row, 0)));

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map((row, i) => getRowId(row, i));
      onRowSelect?.(allIds);
    } else {
      onRowSelect?.([]);
    }
  };

  // Handle row selection
  const handleRowSelect = (rowId: string, checked: boolean) => {
    if (checked) {
      onRowSelect?.([...selectedIds, rowId]);
    } else {
      onRowSelect?.(selectedIds.filter((id) => id !== rowId));
    }
  };

  // Handle sort
  const handleSort = (columnId: string) => {
    const newDirection: SortDirection =
      sort?.column === columnId
        ? sort.direction === "asc"
          ? "desc"
          : sort.direction === "desc"
          ? null
          : "asc"
        : "asc";
    onSort?.(columnId, newDirection);
  };

  // Get sort icon for column
  const getSortIcon = (columnId: string) => {
    if (sort?.column !== columnId) return <SortNeutralIcon />;
    return sort.direction === "asc" ? <SortAscIcon /> : <SortDescIcon />;
  };

  // Visible columns
  const visibleColumns = columns.filter((col) => !col.hidden);

  return (
    <div
      className={cn(
        "flex flex-col rounded-[var(--findx-radius-lg)]",
        "bg-[var(--findx-surface-glass)]",
        "border border-[var(--findx-surface-border)]",
        "shadow-[var(--findx-shadow-sm)]",
        "overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          role="grid"
          aria-busy={loading}
          aria-label={caption || "Data table"}
        >
          {caption && <caption className="sr-only">{caption}</caption>}

          {/* Table Header */}
          <thead className="bg-[var(--findx-bg-subtle)]">
            {/* Column Headers */}
            <tr role="row">
              {/* Selection checkbox */}
              {selection && (
                <th
                  className="w-[50px] px-[var(--findx-space-4)] py-[var(--findx-space-3)]"
                  role="columnheader"
                  aria-sort="none"
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selectedIds.length > 0 && !allSelected}
                    onChange={handleSelectAll}
                  />
                </th>
              )}

              {/* Expand button */}
              {expandable && (
                <th
                  className="w-[50px] px-[var(--findx-space-4)] py-[var(--findx-space-3)]"
                  role="columnheader"
                />
              )}

              {/* Column headers */}
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    "px-[var(--findx-space-4)] py-[var(--findx-space-3)]",
                    "text-left text-xs font-semibold uppercase tracking-wider",
                    "text-[var(--findx-text-muted)]",
                    "border-b border-[var(--findx-border-default)]",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sticky === "left" && "sticky left-0 bg-[var(--findx-bg-subtle)] z-10",
                    column.sticky === "right" && "sticky right-0 bg-[var(--findx-bg-subtle)] z-10",
                    column.sortable && "cursor-pointer select-none hover:text-[var(--findx-text-primary)]"
                  )}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  role="columnheader"
                  aria-sort={
                    sort?.column === column.id
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="text-[var(--findx-text-subtle)]">
                        {getSortIcon(column.id)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>

            {/* Filter Row */}
            {(filters || visibleColumns.some((col) => col.filterable)) && (
              <tr role="row" className="bg-[var(--findx-bg-inset)]">
                {selection && <td className="p-[var(--findx-space-2)]" />}
                {expandable && <td className="p-[var(--findx-space-2)]" />}
                {visibleColumns.map((column) => (
                  <td key={column.id} className="p-[var(--findx-space-2)]">
                    {column.filterable ? (
                      <FilterInput
                        column={column}
                        value={filters?.[column.id] ?? null}
                        onChange={(value) =>
                          onFilter?.({ ...filters, [column.id]: value })
                        }
                      />
                    ) : null}
                  </td>
                ))}
              </tr>
            )}
          </thead>

          {/* Table Body */}
          <tbody role="rowgroup">
            {/* Loading State */}
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} role="row" className="animate-shimmer">
                  {selection && (
                    <td className="w-[50px] px-[var(--findx-space-4)] py-[var(--findx-space-4)]">
                      <div className="w-4 h-4 bg-[var(--findx-bg-inset)] rounded" />
                    </td>
                  )}
                  {expandable && <td className="w-[50px] px-[var(--findx-space-4)] py-[var(--findx-space-4)]" />}
                  {visibleColumns.map((col) => (
                    <td key={col.id} className="px-[var(--findx-space-4)] py-[var(--findx-space-4)]">
                      <div className="h-4 bg-[var(--findx-bg-inset)] rounded-[var(--findx-radius-sm)]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              /* Empty State */
              <tr role="row">
                <td
                  colSpan={visibleColumns.length + (selection ? 1 : 0) + (expandable ? 1 : 0)}
                  className="px-[var(--findx-space-4)] py-[var(--findx-space-12)]"
                >
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center gap-3 text-center">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="size-12 text-[var(--findx-text-muted)]"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-[var(--findx-text-secondary)]">
                          No data found
                        </p>
                        <p className="text-xs text-[var(--findx-text-muted)] mt-1">
                          Try adjusting your filters or search criteria
                        </p>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              /* Data Rows */
              data.map((row, rowIndex) => {
                const rowId = getRowId(row, rowIndex);
                const isSelected = selectedIds.includes(rowId);
                const isExpanded = expandedIds.includes(rowId);

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      role="row"
                      className={cn(
                        "transition-colors duration-[var(--findx-duration-fast)]",
                        rowIndex % 2 === 0
                          ? "bg-transparent"
                          : "bg-[var(--findx-bg-subtle)]/50",
                        isSelected && "bg-[var(--findx-accent-subtle)]",
                        onRowClick && "cursor-pointer hover:bg-[var(--findx-interactive-hover)]"
                      )}
                      onClick={() => onRowClick?.(row, rowIndex)}
                      aria-selected={isSelected}
                    >
                      {/* Selection checkbox */}
                      {selection && (
                        <td
                          className="w-[50px] px-[var(--findx-space-4)] py-[var(--findx-space-3)]"
                          role="gridcell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleRowSelect(rowId, !isSelected)}
                          />
                        </td>
                      )}

                      {/* Expand button */}
                      {expandable && (
                        <td
                          className="w-[50px] px-[var(--findx-space-4)] py-[var(--findx-space-3)]"
                          role="gridcell"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowExpand?.(rowId);
                          }}
                        >
                          <button
                            type="button"
                            className={cn(
                              "w-[var(--findx-space-6)] h-[var(--findx-space-6)]",
                              "flex items-center justify-center",
                              "rounded-[var(--findx-radius-sm)]",
                              "text-[var(--findx-text-muted)]",
                              "hover:bg-[var(--findx-interactive-hover)]",
                              "transition-transform duration-[var(--findx-duration-fast)]",
                              isExpanded && "rotate-90"
                            )}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      )}

                      {/* Cells */}
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className={cn(
                            "px-[var(--findx-space-4)] py-[var(--findx-space-3)]",
                            "text-sm text-[var(--findx-text-primary)]",
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right",
                            column.sticky === "left" && "sticky left-0 bg-inherit z-10",
                            column.sticky === "right" && "sticky right-0 bg-inherit z-10"
                          )}
                          role="gridcell"
                        >
                          {column.cell
                            ? column.cell(row, rowIndex)
                            : column.accessorKey
                            ? String(row[column.accessorKey] ?? "")
                            : null}
                        </td>
                      ))}
                    </tr>

                    {/* Expanded Row */}
                    {expandable && isExpanded && renderExpandedRow && (
                      <tr role="row" className="bg-[var(--findx-bg-inset)]">
                        <td
                          colSpan={visibleColumns.length + (selection ? 1 : 0) + (expandable ? 1 : 0)}
                          className="px-[var(--findx-space-4)] py-[var(--findx-space-4)]"
                        >
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange || (() => {})}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { DataTable };
export type {
  DataTableProps,
  ColumnDef,
  PaginationState,
  SortState,
  FilterState,
  SortDirection,
};