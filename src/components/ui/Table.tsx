import React, { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { scrollToElement } from "@/src/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  style?: React.CSSProperties;
  /** Lets long text wrap instead of forcing horizontal scroll. */
  wrap?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  totalCount?: number;
  page?: number;
  limit?: number;
  onPageChange?: (page: number) => void;
  orderBy?: string;
  orderDesc?: boolean;
  onSortChange?: (orderBy: string, orderDesc: boolean) => void;
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: React.ReactNode;
  /** Hides the footer (count + pager). */
  hidePagination?: boolean;
  /** Drops the 768px min-width, for narrow containers like modals. */
  compact?: boolean;
}

export function Table<T extends object>({
  data,
  columns,
  totalCount,
  page,
  limit = 10,
  onPageChange,
  orderBy,
  orderDesc,
  onSortChange,
  loading = false,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado.",
  hidePagination = false,
  compact = false,
}: TableProps<T>) {
  // Client state
  const [clientPage, setClientPage] = useState(1);
  const [clientOrderBy, setClientOrderBy] = useState<string | null>(null);
  const [clientOrderDesc, setClientOrderDesc] = useState<boolean>(true);

  // Derived state
  const isServerPaginated = !!onPageChange;
  const isServerSorted = !!onSortChange;

  const actualPage = isServerPaginated && page !== undefined ? page : clientPage;
  const actualOrderBy = isServerSorted ? orderBy : clientOrderBy;
  const actualOrderDesc = isServerSorted && orderDesc !== undefined ? orderDesc : clientOrderDesc;

  const tableTopRef = useRef<HTMLDivElement | null>(null);
  const previousPageRef = useRef<number>(actualPage);

  useEffect(() => {
    if (previousPageRef.current === actualPage) return;
    scrollToElement(tableTopRef.current, { behavior: "smooth", block: "start" });
    previousPageRef.current = actualPage;
  }, [actualPage]);

  // Sorting
  const processedData = [...data];
  if (!isServerSorted && actualOrderBy) {
    processedData.sort((a, b) => {
      const valA = a[actualOrderBy as keyof T];
      const valB = b[actualOrderBy as keyof T];
      if (valA < valB) return actualOrderDesc ? 1 : -1;
      if (valA > valB) return actualOrderDesc ? -1 : 1;
      return 0;
    });
  }

  // Pagination
  const actualTotalCount = isServerPaginated && totalCount !== undefined ? totalCount : processedData.length;
  const totalPages = Math.max(1, Math.ceil(actualTotalCount / limit));

  let displayData = processedData;
  if (!isServerPaginated) {
    displayData = processedData.slice((actualPage - 1) * limit, actualPage * limit);
  }

  const handleSort = (colKey: string) => {
    if (isServerSorted && onSortChange) {
      if (colKey === orderBy) {
        onSortChange(colKey, !orderDesc);
      } else {
        onSortChange(colKey, true);
      }
    } else {
      if (colKey === clientOrderBy) {
        setClientOrderDesc(!clientOrderDesc);
      } else {
        setClientOrderBy(colKey);
        setClientOrderDesc(true);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (isServerPaginated && onPageChange) {
      onPageChange(newPage);
    } else {
      setClientPage(newPage);
    }
  };

  return (
    <div className="ui-table-container">
      <div ref={tableTopRef} />
      <div className="ui-table-scroll">
        <table className={`ui-table ${compact ? "ui-table--compact" : ""}`}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`table-th-text ${col.sortable ? "is-sortable" : ""}`}
                  style={col.style}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="ui-table-th-inner">
                    {col.header}
                    {col.sortable && actualOrderBy === col.key && (
                      <span className="ui-table-sort">{actualOrderDesc ? "↓" : "↑"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: limit }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <Skeleton height="16px" width="80%" borderRadius="4px" />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="ui-table-empty">{emptyMessage}</td>
              </tr>
            ) : (
              displayData.map((row, i) => (
                <tr
                  key={i}
                  className={`table-row-hover ${onRowClick ? "is-clickable" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.wrap ? "ui-table-td-wrap" : undefined}>
                      {col.render ? col.render(row) : (row[col.key as keyof T] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!hidePagination && (
        <div className="ui-table-footer">
          <div>Mostrando {displayData.length} de {actualTotalCount} registros</div>

          <div className="ui-table-pager">
            <Button
              className="ui-table-pager-btn"
              disabled={actualPage <= 1 || loading}
              onClick={() => handlePageChange(actualPage - 1)}
              aria-label="Página anterior"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
            <span>Página {actualPage} de {totalPages}</span>
            <Button
              className="ui-table-pager-btn"
              disabled={actualPage >= totalPages || loading}
              onClick={() => handlePageChange(actualPage + 1)}
              aria-label="Próxima página"
            >
              <FontAwesomeIcon icon={faArrowRight} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
