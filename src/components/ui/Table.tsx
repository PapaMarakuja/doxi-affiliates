import React, { useState } from "react";
import { Button } from "./Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight } from "@fortawesome/free-solid-svg-icons";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  style?: React.CSSProperties;
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
}

export function Table<T extends Record<string, any>>({
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

  // Sorting
  let processedData = [...data];
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
    <div className="ui-table-container" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--card-bg)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--hover)" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="table-th-text"
                  style={{
                    padding: "16px",
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: "none",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    ...col.style
                  }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {col.header}
                    {col.sortable && actualOrderBy === col.key && (
                      <span style={{ fontSize: "12px", color: "var(--pink-dark)" }}>{actualOrderDesc ? "↓" : "↑"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: limit }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: "16px" }}>
                      <div className="ui-skeleton" style={{ height: "16px", width: "80%", borderRadius: "4px" }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              displayData.map((row, i) => (
                <tr 
                  key={i} 
                  style={{ 
                    borderBottom: "1px solid var(--border)", 
                    transition: "background 0.2s",
                    cursor: onRowClick ? "pointer" : "default" 
                  }} 
                  className="table-row-hover"
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: "16px", color: "var(--text-main)", fontSize: "14px" }}>
                      {col.render ? col.render(row) : row[col.key as keyof T]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Mostrando {displayData.length} de {actualTotalCount} registros
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Button
            disabled={actualPage <= 1 || loading}
            onClick={() => handlePageChange(actualPage - 1)}
            style={{ padding: "8px", minHeight: "unset", width: "auto" }}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          <span style={{ fontSize: "14px", fontWeight: 500 }}>
            Página {actualPage} de {totalPages}
          </span>
          <Button
            disabled={actualPage >= totalPages || loading}
            onClick={() => handlePageChange(actualPage + 1)}
            style={{ padding: "8px", minHeight: "unset", width: "auto" }}
          >
            <FontAwesomeIcon icon={faArrowRight} />
          </Button>
        </div>
      </div>
    </div>
  );
}
