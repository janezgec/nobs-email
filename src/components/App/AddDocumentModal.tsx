import { useState, useEffect } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import type { SchemaField, Collection } from '../../models/collection';
import { jsonSchemaToSchemaFields } from '../../models/collection';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  collection: Collection | null;
}

const AddDocumentModal: FunctionalComponent<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  collection
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (collection && isOpen) {
      const existingSchema = jsonSchemaToSchemaFields(collection.docDataSchema);
      setSchema(existingSchema);
      
      // Initialize form data with empty values
      const initialData: Record<string, any> = {};
      existingSchema.forEach(field => {
        initialData[field.name] = '';
      });
      setFormData(initialData);
    }
  }, [collection, isOpen]);

  const updateField = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    // Validate required fields and convert data types
    const processedData: Record<string, any> = {};
    let hasError = false;

    for (const field of schema) {
      const value = formData[field.name];
      
      if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        setError(`${field.name} is required`);
        hasError = true;
        break;
      }

      // Convert values based on field type
      if (value !== '' && value != null) {
        switch (field.type) {
          case 'number':
            const numValue = Number(value);
            if (isNaN(numValue)) {
              setError(`${field.name} must be a valid number`);
              hasError = true;
            } else {
              processedData[field.name] = numValue;
            }
            break;
          case 'boolean':
            processedData[field.name] = Boolean(value);
            break;
          case 'date':
            if (value) {
              processedData[field.name] = new Date(value).toISOString();
            }
            break;
          default:
            processedData[field.name] = String(value);
        }
      }

      if (hasError) break;
    }

    if (hasError) return;

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(processedData);
      setFormData({});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setError('');
    onClose();
  };

  const renderField = (field: SchemaField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateField(field.name, (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        );
      case 'boolean':
        return (
          <select
            value={value ? 'true' : 'false'}
            onChange={(e) => updateField(field.name, (e.target as HTMLSelectElement).value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="false">False</option>
            <option value="true">True</option>
          </select>
        );
      case 'date':
        return (
          <input
            type="datetime-local"
            value={value ? new Date(value).toISOString().slice(0, 16) : ''}
            onChange={(e) => updateField(field.name, (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={(e) => updateField(field.name, (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            value={value}
            onChange={(e) => updateField(field.name, (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateField(field.name, (e.target as HTMLInputElement).value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        );
    }
  };

  if (!isOpen || !collection) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Add Document - {collection.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        {schema.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No schema defined for this collection.</p>
            <p className="text-sm mt-1">Please add columns to the collection schema first.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              {schema.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {field.description && (
                      <span className="text-gray-500 font-normal"> - {field.description}</span>
                    )}
                  </label>
                  {renderField(field)}
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Adding...' : 'Add Document'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddDocumentModal;
