import React from 'react';
import { EmptyState } from './EmptyState';
import type { LucideIcon } from 'lucide-react';

export const DataTable: React.FC<{
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  minWidth?: string;
  /** Fixed widths per column; keeps cells from overlapping on narrow screens. */
  columnWidths?: string[];
}> = ({
  headers,
  children,
  empty,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  minWidth = '640px',
  columnWidths,
}) => (
  <div className="max-w-full overflow-x-auto">
    <table className="w-full table-fixed" style={{ minWidth }}>
      {columnWidths?.length === headers.length ? (
        <colgroup>
          {columnWidths.map((width, index) => (
            <col key={`${width}-${index}`} style={{ width }} />
          ))}
        </colgroup>
      ) : null}
      <thead>
        <tr className="border-b border-[#ede4f7] bg-[#faf7ff]/80">
          {headers.map((h) => (
            <th
              key={h}
              className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7e22ce] sm:px-4"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {empty ? (
          <tr>
            <td colSpan={headers.length} className="p-0">
              <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
);

export const DataRow: React.FC<{
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}> = ({ children, selected, onClick }) => (
  <tr
    className={`border-t border-[#ede4f7] transition-colors ${
      selected ? 'bg-[#faf7ff]' : 'hover:bg-[#faf7ff]/70'
    } ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const DataCell: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
  truncate?: boolean;
}> = ({ children, className = '', title, truncate }) => (
  <td
    className={`px-3 py-3.5 align-middle text-[13.5px] text-[#161616] sm:px-4 ${
      truncate ? 'min-w-0 max-w-0 overflow-hidden' : ''
    } ${className}`}
    title={title}
  >
    {truncate ? (
      <div className="min-w-0 truncate whitespace-nowrap">{children}</div>
    ) : (
      children
    )}
  </td>
);
