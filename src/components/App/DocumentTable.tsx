import { useMemo } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import type { Document } from '../../models/document';

interface DocumentTableProps {
  documents: Document[];
}

const DocumentTable: FunctionalComponent<DocumentTableProps> = ({ documents }) => {
  // Sort documents by created time in descending order (newest first)
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const dateA = new Date(a.created || 0).getTime();
      const dateB = new Date(b.created || 0).getTime();
      return dateB - dateA; // Descending order
    });
  }, [documents]);

  // Extract all unique columns from the data properties of all documents
  const columns = useMemo(() => {
    const columnSet = new Set<string>();
    
    documents.forEach(doc => {
      if (doc.data && typeof doc.data === 'object') {
        Object.keys(doc.data).forEach(key => columnSet.add(key));
      }
    });
    
    return Array.from(columnSet).sort();
  }, [documents]);

  // Helper function to safely get nested values
  const getValue = (obj: any, key: string): string => {
    if (!obj || typeof obj !== 'object') return 'N/A';
    const value = obj[key];
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data yet</h3>
          <p className="text-gray-500 max-w-sm">
            Send emails to this collection to see data appear here in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden h-full">
      <div className="overflow-auto h-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {/* Dynamic columns from data properties */}
              {columns.map(column => (
                <th 
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
              {/* Fixed created column */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center space-x-1">
                  <span>Created</span>
                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDocuments.map((item, index) => (
              <tr key={item.id || index} className="hover:bg-gray-50">
                {/* Dynamic data columns */}
                {columns.map(column => (
                  <td 
                    key={column}
                    className="px-6 py-4 text-sm text-gray-900"
                  >
                    <div className="max-w-xs">
                      {(() => {
                        const value = getValue(item.data, column);
                        // If the value looks like JSON, display it in a code block
                        if (value.startsWith('{') || value.startsWith('[')) {
                          try {
                            const parsed = JSON.parse(value);
                            return (
                              <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto max-h-32">
                                {JSON.stringify(parsed, null, 2)}
                              </pre>
                            );
                          } catch {
                            // Fall through to regular text display
                          }
                        }
                        // Regular text display with line breaks
                        return (
                          <div className="break-words">
                            {value.split('\n').map((line, i) => (
                              <div key={i}>{line || '\u00A0'}</div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                ))}
                {/* Created date column */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.created ? new Date(item.created).toLocaleString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentTable;
