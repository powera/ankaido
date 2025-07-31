import React from 'react';
import { SortDirection } from '../../Utilities/types';
import AudioButton from '../AudioButton';

// Type for individual row data - flexible to allow any properties
export interface TableRowData {
  id?: string | number;
  [key: string]: any;
}

// Type for column configuration
export interface TableColumn {
  key?: string;
  header: string;
  accessor?: string;
  render?: (rowData: TableRowData, rowIndex: number) => React.ReactNode;
  
  // Styling properties
  align?: 'left' | 'center' | 'right';
  width?: string;
  bold?: boolean;
  fontSize?: string;
  italic?: boolean;
  color?: string;
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  
  // Sorting properties
  sortable?: boolean;
  sortKey?: string;
  
  // Audio column specific properties
  type?: 'audio' | string;
  audioWord?: string;
  audioSize?: 'small' | 'normal' | 'large';
}

// Props interface for DataTable component
export interface DataTableProps {
  columns: TableColumn[];
  data: TableRowData[];
  sortable?: boolean;
  sortField?: string;
  sortDirection?: SortDirection;
  onSort?: (field: string) => void;
  audioEnabled?: boolean;
  playAudio?: (word: string) => Promise<boolean>;
  maxHeight?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  className?: string;
}

const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  data, 
  sortable = false, 
  sortField, 
  sortDirection, 
  onSort,
  audioEnabled = false,
  playAudio,
  maxHeight = '60vh',
  stickyHeader = true,
  striped = true,
  className = ''
}) => {

  const renderCell = (column: TableColumn, rowData: TableRowData, rowIndex: number): React.ReactNode => {
    // Handle audio column type first
    if (column.type === 'audio') {
      return (
        <AudioButton 
          word={column.audioWord ? rowData[column.audioWord] : ''}
          size={column.audioSize || 'small'}
          audioEnabled={audioEnabled}
          playAudio={playAudio}
        />
      );
    }
    
    const value = column.accessor ? rowData[column.accessor] : column.render?.(rowData, rowIndex);
    
    return value;
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid var(--color-border)'
  };

  const containerStyle: React.CSSProperties = {
    maxHeight,
    overflowY: 'auto',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--border-radius)'
  };

  const headerCellStyle: React.CSSProperties = {
    padding: 'var(--spacing-small)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-annotation-bg)',
    textAlign: 'left',
    ...(stickyHeader && {
      position: 'sticky',
      top: 0,
      zIndex: 1
    })
  };

  const bodyCellStyle: React.CSSProperties = {
    padding: 'var(--spacing-small)',
    border: '1px solid var(--color-border)'
  };

  return (
    <div className={`data-table-container ${className}`} style={containerStyle}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || index}
                style={{
                  ...headerCellStyle,
                  textAlign: column.align || 'left',
                  width: column.width,
                  cursor: sortable && column.sortable !== false ? 'pointer' : 'default'
                }}
                onClick={sortable && column.sortable !== false && onSort ? 
                  () => onSort(column.sortKey || column.accessor || '') : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{column.header}</span>
                  {sortable && column.sortable !== false && (
                    <span style={{ marginLeft: '0.5rem', minWidth: '12px', textAlign: 'center' }}>
                      {sortField === (column.sortKey || column.accessor) && 
                        (sortDirection === 'asc' ? '↑' : '↓')
                      }
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((rowData, rowIndex) => (
            <tr 
              key={rowData.id || rowIndex}
              style={{
                backgroundColor: striped && rowIndex % 2 === 0 ? 
                  'var(--color-card-bg)' : 
                  striped ? 'var(--color-card-bg-alt)' : 'transparent'
              }}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || colIndex}
                  style={{
                    ...bodyCellStyle,
                    textAlign: column.align || 'left',
                    fontWeight: column.bold ? 'bold' : 'normal',
                    fontSize: column.fontSize,
                    fontStyle: column.italic ? 'italic' : 'normal',
                    color: column.color,
                    textTransform: column.textTransform
                  }}
                >
                  {renderCell(column, rowData, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;