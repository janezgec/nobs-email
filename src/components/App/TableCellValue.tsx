import type { FunctionalComponent } from 'preact';

interface TableCellValueProps {
  value: any;
  maxWidth?: string;
}

const TableCellValue: FunctionalComponent<TableCellValueProps> = ({ 
  value, 
  maxWidth = "max-w-xs" 
}) => {
  // Helper function to safely convert value to string
  const getStringValue = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const stringValue = getStringValue(value);

  return (
    <div className={maxWidth}>
      {(() => {
        // If value is an array of strings, render as a list
        if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
          return (
            <ul className="list-disc list-inside  space-y-1">
              {value.map((item, i) => (
                <li key={i} className="break-words">{item}</li>
              ))}
            </ul>
          );
        }
        
        // If the value looks like JSON, display it in a code block
        if (stringValue.startsWith('{') || stringValue.startsWith('[')) {
          try {
            const parsed = JSON.parse(stringValue);
            // Check if parsed JSON is an array of strings
            if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
              return (
                <ul className="list-disc list-inside  space-y-1">
                  {parsed.map((item, i) => (
                    <li key={i} className="break-words">{item}</li>
                  ))}
                </ul>
              );
            }
            // For other JSON objects/arrays, show formatted JSON
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
          <div className="break-words text-xs">
            {stringValue.split('\n').map((line, i) => (
              <div key={i}>{line || '\u00A0'}</div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default TableCellValue;
