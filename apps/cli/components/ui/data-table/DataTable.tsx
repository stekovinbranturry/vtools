import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { darkTheme } from '../_core.js';
import type { InkUITheme } from '../_core.js';

const ELLIPSIS = '…';

function truncate(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 1) return ELLIPSIS;
  return text.slice(0, maxWidth - 1) + ELLIPSIS;
}

function pad(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  if (text.length >= width) return text.slice(0, width);
  const extra = width - text.length;
  if (align === 'right') return ' '.repeat(extra) + text;
  if (align === 'center') {
    const left = Math.floor(extra / 2);
    return ' '.repeat(left) + text + ' '.repeat(extra - left);
  }
  return text + ' '.repeat(extra);
}

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function resolveWidths<T extends Record<string, unknown>>(
  columns: DataTableColumn<T>[],
  data: T[],
  termWidth: number,
  maxWidth: number | undefined,
  columnGap: number,
): number[] {
  const budget = maxWidth !== undefined ? Math.min(termWidth, maxWidth) : termWidth;
  const natural = columns.map((col) => {
    if (col.width !== undefined) return col.width;
    const headerLen = col.header.length;
    const maxCell = data.reduce((max, row) => {
      const val = col.render ? col.render(row[col.key], row) : cellStr(row[col.key]);
      return Math.max(max, val.length);
    }, 0);
    return Math.max(headerLen, maxCell, 4);
  });

  const selectorWidth = 0;
  const gapWidth = Math.max(0, columns.length - 1) * columnGap;
  const totalNatural = natural.reduce((sum, width) => sum + width, 0) + selectorWidth + gapWidth + 2;

  if (totalNatural <= budget) return natural;

  const contentWidth = Math.max(
    columns.length * 4,
    budget - selectorWidth - gapWidth - 2,
  );
  const naturalTotal = natural.reduce((sum, width) => sum + width, 0);
  if (naturalTotal === 0) return natural;

  return natural.map((width) =>
    Math.max(4, Math.floor((width * contentWidth) / naturalTotal)),
  );
}

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T) => string;
  width?: number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSelect?: (row: T, index: number) => void;
  onHighlightChange?: (row: T | null) => void;
  selectable?: boolean;
  borderStyle?: 'single' | 'double' | 'rounded' | 'bold' | 'classic';
  showFooter?: boolean;
  emptyMessage?: string;
  focus?: boolean;
  /** Cap table content width; does not stretch to fill the terminal. */
  maxWidth?: number;
  /** Spaces between columns. */
  columnGap?: number;
  theme?: InkUITheme;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Filter...',
  onSelect,
  onHighlightChange,
  selectable = true,
  borderStyle = 'single',
  showFooter = true,
  emptyMessage = 'No data',
  focus = true,
  maxWidth,
  columnGap = 2,
  theme = darkTheme,
}: DataTableProps<T>): React.ReactElement {
  const { stdout } = useStdout();
  const termWidth = stdout?.columns ?? 80;
  const [selectedRow, setSelectedRow] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  // Filter
  const filtered = data.filter((row) => {
    if (!searchQuery) return true;
    return columns.some((col) => {
      const val = row[col.key];
      return String(val).toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  // Sort
  const sorted = sortColumn
    ? [...filtered].sort((a, b) => {
        const av = String(a[sortColumn] ?? '');
        const bv = String(b[sortColumn] ?? '');
        return sortDirection === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      })
    : filtered;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const colWidths = useMemo(
    () => resolveWidths(columns, sorted, termWidth, maxWidth, columnGap),
    [columns, sorted, termWidth, maxWidth, columnGap],
  );

  const aligns = useMemo(
    () => columns.map((col) => col.align ?? 'left'),
    [columns],
  );

  function formatCell(
    value: string,
    columnIndex: number,
    options?: { bold?: boolean; color?: string; dimColor?: boolean },
  ): React.ReactNode {
    const width = colWidths[columnIndex] ?? 6;
    const content = pad(truncate(value, width), width, aligns[columnIndex]);

    return (
      <Text
        key={columnIndex}
        color={options?.color}
        bold={options?.bold}
        dimColor={options?.dimColor}
      >
        {content}
      </Text>
    );
  }

  function renderRowCells(
    values: string[],
    options?: { bold?: boolean; color?: string; dimColor?: boolean },
  ): React.ReactNode {
    return values.map((value, index) => (
      <React.Fragment key={columns[index]?.key ?? index}>
        {index > 0 ? <Text>{' '.repeat(columnGap)}</Text> : null}
        {formatCell(value, index, options)}
      </React.Fragment>
    ));
  }

  const tableInnerWidth =
    colWidths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, columns.length - 1) * columnGap;
  const tableOuterWidth = tableInnerWidth + 2;

  useEffect(() => {
    onHighlightChange?.(pageData[selectedRow] ?? null);
  }, [
    selectedRow,
    currentPage,
    searchQuery,
    sortColumn,
    sortDirection,
    data,
    pageSize,
    onHighlightChange,
  ]);

  useInput(
    (input, key) => {
      if (searchMode) {
        if (key.escape) { setSearchMode(false); setSearchQuery(''); return; }
        if (key.return) { setSearchMode(false); return; }
        if (key.backspace || key.delete) { setSearchQuery((q) => q.slice(0, -1)); return; }
        if (input && input.length === 1 && !key.ctrl) setSearchQuery((q) => q + input);
        return;
      }

      if (key.upArrow) setSelectedRow((r) => Math.max(0, r - 1));
      else if (key.downArrow) setSelectedRow((r) => Math.min(pageData.length - 1, r + 1));
      else if (key.leftArrow) setCurrentPage((p) => Math.max(0, p - 1));
      else if (key.rightArrow) setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
      else if (input === '/') setSearchMode(true);
      else if (input === 's') {
        const col = columns.find((c) => c.sortable);
        if (col) {
          if (sortColumn === col.key) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
          else { setSortColumn(col.key); setSortDirection('asc'); }
        }
      } else if (key.return) {
        const row = pageData[selectedRow];
        if (row) onSelect?.(row, currentPage * pageSize + selectedRow);
      } else if (input === 'g') setSelectedRow(0);
      else if (input === 'G') setSelectedRow(pageData.length - 1);
    },
    { isActive: focus }
  );

  const bord = borderStyle === 'rounded' ? 'round' : borderStyle === 'bold' ? 'bold' : 'single';

  return (
    <Box flexDirection="column">
      {/* Search bar */}
      {searchable && (
        <Box marginBottom={0}>
          <Text color={theme.colors.muted}>
            {searchMode ? (
              <Text>
                <Text color={theme.colors.primary}>/ Filter: </Text>
                <Text color={theme.colors.text}>{searchQuery}</Text>
                <Text color={theme.colors.primary}>█</Text>
              </Text>
            ) : searchQuery ? (
              <Text color={theme.colors.muted}>/ Filter: {searchQuery}</Text>
            ) : (
              <Text dimColor>/ {searchPlaceholder}</Text>
            )}
          </Text>
        </Box>
      )}

      {/* Table */}
      <Box
        flexDirection="column"
        width={tableOuterWidth}
        borderStyle={bord as 'single'}
        borderColor={theme.colors.border}
      >
        {/* Header */}
        <Box flexDirection="row">
          {renderRowCells(
            columns.map((col) => {
              const sortArrow =
                sortColumn === col.key ? (sortDirection === 'asc' ? '▲' : '▼') : '';
              const header = sortArrow ? `${col.header} ${sortArrow}` : col.header;
              return header;
            }),
            {bold: true, color: theme.colors.primary},
          )}
        </Box>

        {/* Divider */}
        <Box flexDirection="row">
          <Text color={theme.colors.border}>
            {'─'.repeat(tableInnerWidth)}
          </Text>
        </Box>

        {/* Rows */}
        {pageData.length === 0 ? (
          <Box paddingX={1}>
            <Text color={theme.colors.muted}>{emptyMessage}</Text>
          </Box>
        ) : (
          pageData.map((row, i) => {
            const isSelected = i === selectedRow && selectable;
            return (
              <Box key={i} flexDirection="row">
                {renderRowCells(
                  columns.map((col) => {
                    const val = col.render
                      ? col.render(row[col.key], row)
                      : cellStr(row[col.key]);
                    return val;
                  }),
                  {
                    color: isSelected ? theme.colors.focus : theme.colors.muted,
                    bold: isSelected,
                    dimColor: !isSelected,
                  },
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Footer */}
      {showFooter && (
        <Box marginTop={0}>
          <Text color={theme.colors.muted} dimColor>
            Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, sorted.length)} of {sorted.length} · Page {currentPage + 1}/{totalPages || 1}
            {' · '}[←→] Page [/] Search [s] Sort
          </Text>
        </Box>
      )}
    </Box>
  );
}
