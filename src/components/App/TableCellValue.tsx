import type { FunctionalComponent } from 'preact';
import { useState } from 'preact/hooks';

interface TableCellValueProps {
  value: any;
  maxWidth?: string;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
}

const TableCellValue: FunctionalComponent<TableCellValueProps> = ({ 
  value, 
  maxWidth = "max-w-xs",
  type = 'string'
}) => {
  const [showHtmlModal, setShowHtmlModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // Helper function to safely convert value to string
  const getStringValue = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

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

  const stringValue = getStringValue(value);

  return (
    <div className={maxWidth}>
      {(() => {
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return <div className="text-gray-400 text-xs">N/A</div>;
        }

        // Type-specific rendering
        switch (type) {
          case 'date':
            try {
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                return <div className="break-words text-xs">{stringValue}</div>;
              }
              return (
                <span title={date.toLocaleString()} className="text-xs">
                  {getRelativeTime(value)}
                </span>
              );
            } catch {
              return <div className="break-words text-xs">{stringValue}</div>;
            }

          case 'email':
            if (typeof value === 'string' && value.includes('@')) {
              return (
                <a 
                  href={`mailto:${value}`}
                  className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {value}
                </a>
              );
            }
            return <div className="break-words text-xs">{stringValue}</div>;

          case 'url':
            if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('www.'))) {
              const href = value.startsWith('www.') ? `https://${value}` : value;
              
              // Check if URL is an image by looking at file extension
              const isImage = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i.test(value);
              
              if (isImage) {
                return (
                  <img
                    src={href}
                    alt="Image"
                    className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(href, '_blank', 'noopener,noreferrer');
                    }}
                    onError={(e) => {
                      // If image fails to load, replace with a text link
                      const target = e.target as HTMLImageElement;
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline text-xs break-all">${getShortenedUrl(value)}</a>`;
                      }
                    }}
                  />
                );
              }
              
              // For non-image URLs, show shortened version
              const getShortenedUrl = (url: string): string => {
                try {
                  const urlObj = new URL(url.startsWith('www.') ? `https://${url}` : url);
                  const domain = urlObj.hostname.replace(/^www\./, '');
                  const path = urlObj.pathname;
                  
                  if (path.length <= 10) {
                    return domain + path;
                  } else {
                    return domain + path.substring(0, 10) + '...';
                  }
                } catch {
                  return url.length > 20 ? url.substring(0, 20) + '...' : url;
                }
              };
              
              return (
                <a 
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                  onClick={(e) => e.stopPropagation()}
                  title={value}
                >
                  {getShortenedUrl(value)}
                </a>
              );
            }
            return <div className="break-words text-xs">{stringValue}</div>;

          case 'number':
            if (typeof value === 'number') {
              return (
                <div className="text-xs font-mono text-right">
                  {value.toLocaleString()}
                </div>
              );
            }
            return <div className="break-words text-xs">{stringValue}</div>;

          case 'boolean':
            if (typeof value === 'boolean') {
              return (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  value 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {value ? 'True' : 'False'}
                </span>
              );
            }
            return <div className="break-words text-xs">{stringValue}</div>;

          case 'string':
          default:
            // If value contains HTML, show a "View" link to open in modal
            if (typeof value === 'string' && value.includes('<html')) {
              return (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHtmlModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 underline text-xs cursor-pointer"
                  >
                    View HTML
                  </button>
                  {showHtmlModal && (
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                      onClick={() => setShowHtmlModal(false)}
                    >
                      <div 
                        className="bg-white rounded-lg shadow-lg max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center p-4 border-b">
                          <h3 className="text-lg font-medium">HTML Content</h3>
                          <button
                            onClick={() => setShowHtmlModal(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                          >
                            ×
                          </button>
                        </div>
                        <div className="p-4 h-96 overflow-auto">
                          <iframe
                            srcDoc={value}
                            className="w-full h-full border border-gray-200 rounded"
                            sandbox="allow-scripts allow-same-origin"
                            title="HTML Content"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            } else if (typeof value === 'string' && value.length > 300) {
              // If value is a long string (>200 chars), show truncated with "Read more"
              return (
                <>
                  <div className="break-words text-xs">
                    {value.substring(0, 200)}...{' '}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTextModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Read more
                    </button>
                  </div>
                  {showTextModal && (
                    <div 
                      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                      onClick={() => setShowTextModal(false)}
                    >
                      <div 
                        className="bg-white rounded-lg shadow-lg max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-between items-center p-4 border-b">
                          <h3 className="text-lg font-medium">Full Text</h3>
                          <button
                            onClick={() => setShowTextModal(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                          >
                            ×
                          </button>
                        </div>
                        <div className="p-4 h-96 overflow-auto">
                          <pre className="whitespace-pre-wrap text-sm break-words">
                            {value}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            }
            
            // If value is an array of strings, render as a list
            if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
              return (
                <ul className="list-disc list-inside space-y-1">
                  {value.map((item, i) => (
                    <li key={i} className="break-words text-xs">{item}</li>
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
                    <ul className="list-disc list-inside space-y-1">
                      {parsed.map((item, i) => (
                        <li key={i} className="break-words text-xs">{item}</li>
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
        }
      })()}
    </div>
  );
};

export default TableCellValue;
