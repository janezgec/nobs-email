import { useState } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import type { SchemaField } from '../../models/collection';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, schema: SchemaField[]) => Promise<void>;
}

const CreateCollectionModal: FunctionalComponent<CreateCollectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [schema, setSchema] = useState<SchemaField[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const addField = () => {
    setSchema([...schema, { name: '', type: 'string', required: false }]);
  };

  const removeField = (index: number) => {
    setSchema(schema.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: Partial<SchemaField>) => {
    const newSchema = [...schema];
    newSchema[index] = { ...newSchema[index], ...field };
    setSchema(newSchema);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    // Validate schema fields
    const validFields = schema.filter(field => field.name.trim() !== '');
    const fieldNames = validFields.map(field => field.name.trim());
    const uniqueFieldNames = new Set(fieldNames);
    
    if (fieldNames.length !== uniqueFieldNames.size) {
      setError('Field names must be unique');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSubmit(name.trim(), validFields);
      setName('');
      setSchema([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSchema([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Create New Collection</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="collection-name" className="block text-sm font-medium text-gray-700 mb-2">
              Collection Name
            </label>
            <input
              id="collection-name"
              type="text"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter collection name..."
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-800">Schema (Columns)</h3>
              <button
                type="button"
                onClick={addField}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                disabled={isLoading}
              >
                + Add Column
              </button>
            </div>

            {schema.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No columns defined yet.</p>
                <p className="text-sm mt-1">Click "Add Column" to define your data structure.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schema.map((field, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => updateField(index, { name: (e.target as HTMLInputElement).value })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Column name..."
                          disabled={isLoading}
                        />
                      </div>
                      <div className="w-32">
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: (e.target as HTMLSelectElement).value as SchemaField['type'] })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={isLoading}
                        >
                          <option value="string">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="email">Email</option>
                          <option value="url">URL</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                        disabled={isLoading}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={field.description || ''}
                        onChange={(e) => updateField(index, { description: (e.target as HTMLInputElement).value })}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Description (optional)..."
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Collection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCollectionModal;
