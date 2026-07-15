import * as React from 'react';
import { Loader } from './Loader';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  width?: string;
  align?: ColumnAlign;
  /** Si es true, el contenido se renderiza con fuente monoespaciada. */
  mono?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  tableClassName?: string;
}

const alignClasses: Record<ColumnAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No hay datos para mostrar.',
  isLoading = false,
  className = '',
  tableClassName = '',
}: TableProps<T>) {
  const isClickable = Boolean(onRowClick);

  return (
    <div
      className={[
        'w-full overflow-hidden rounded-lg border border-[#1F1F23] bg-[#121214]',
        className,
      ].join(' ')}
    >
      <table
        className={[
          'w-full border-collapse text-left',
          tableClassName,
        ].join(' ')}
      >
        <thead>
          <tr className="border-b border-[#1F1F23] bg-[#161619]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#A1A1AA]',
                  alignClasses[column.align ?? 'left'],
                ].join(' ')}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center"
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader size="md" color="violet" />
                  <span className="text-sm text-[#52525B]">Cargando datos...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-[#52525B]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const rowKey = keyExtractor(row, rowIndex);
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-b border-[#1F1F23] last:border-b-0',
                    'transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]',
                    'hover:bg-[#161619]/80',
                    isClickable
                      ? 'cursor-pointer hover:bg-[#161619]'
                      : '',
                  ].join(' ')}
                >
                  {columns.map((column) => {
                    const cellContent = column.render
                      ? column.render(row, rowIndex)
                      : (row as Record<string, unknown>)[column.key] as React.ReactNode;

                    return (
                      <td
                        key={`${rowKey}-${column.key}`}
                        className={[
                          'px-4 py-3 text-sm text-[#F4F4F5]',
                          column.mono ? 'font-mono' : '',
                          alignClasses[column.align ?? 'left'],
                        ].join(' ')}
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
