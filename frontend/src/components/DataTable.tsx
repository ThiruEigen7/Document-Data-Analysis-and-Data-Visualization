import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: Record<string, string | number>[];
  maxRows?: number;
}

export default function DataTable({ columns, data, maxRows = 10 }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data.slice(0, maxRows);

    return [...data]
      .sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      })
      .slice(0, maxRows);
  }, [data, sortColumn, sortDirection, maxRows]);

  return (
    <div className="bg-[#1E1E1E] rounded-lg border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#2A2A2A] sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 py-3 text-left text-sm font-semibold text-gray-300 border-b border-gray-700
                    ${column.sortable ? 'cursor-pointer hover:text-white transition-colors' : ''}
                  `}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <div className="text-[#1ABC9C]">
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={index}
                className={`
                  border-b border-gray-800 hover:bg-[#2A2A2A] transition-colors
                  ${index % 2 === 0 ? 'bg-[#1E1E1E]' : 'bg-[#252525]'}
                `}
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 text-sm text-gray-300">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length > maxRows && (
        <div className="px-4 py-3 bg-[#2A2A2A] border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing {Math.min(maxRows, data.length)} of {data.length} rows
          </p>
        </div>
      )}
    </div>
  );
}