import { useMemo } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import type { User } from '../../models/user';
import type { Database } from '../../models/database';
import type { Document } from '../../models/document';
import type { Collection } from '../../models/collection';
import { jsonSchemaToSchemaFields } from '../../models/collection';
import TableCellValue from './TableCellValue';

interface DocumentTableProps {
  documents: Document[];
  collection: Collection | null;
  database: Database | null;
  user: User | null;
}

const DocumentTable: FunctionalComponent<DocumentTableProps> = ({ user, database, documents, collection }) => {
  // Get schema information from collection
  const schemaFields = useMemo(() => {
    if (!collection?.docDataSchema) return [];
    return jsonSchemaToSchemaFields(collection.docDataSchema);
  }, [collection]);

  // Create a lookup map for field types
  const fieldTypeMap = useMemo(() => {
    const map: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url'> = {};
    schemaFields.forEach(field => {
      map[field.name] = field.type;
    });
    return map;
  }, [schemaFields]);
  // Helper function to get relative time
  const getRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
    }
  };

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
    
    const allColumns = Array.from(columnSet);
    const priorityColumns = ['name', 'title', 'subject'];
    
    // Separate priority columns that exist and other columns
    const existingPriorityColumns = priorityColumns.filter(col => allColumns.includes(col));
    const otherColumns = allColumns.filter(col => !priorityColumns.includes(col)).sort();
    
    // Return priority columns first, then other columns sorted alphabetically
    return [...existingPriorityColumns, ...otherColumns];
  }, [documents]);

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
            Send emails to <span className="text-sky-600">{user?.username}+{database?.name}@nobs.email</span> to start scraping data in real-time.
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
                    className="px-6 py-4 text-xs text-gray-900"
                  >
                    <TableCellValue 
                      value={item.data?.[column]} 
                      type={fieldTypeMap[column] || 'string'}
                    />
                  </td>
                ))}
                {/* Created date column */}
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                  {item.created ? (
                    <TableCellValue 
                      value={item.created} 
                      type="date"
                    />
                  ) : (
                    'N/A'
                  )}
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
