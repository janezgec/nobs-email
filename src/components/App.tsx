import { useState, useEffect } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import { getPB } from '../lib/pb';
import type { Collection, SchemaField } from '../models/collection';
import type { Document } from '../models/document';
import type { Database } from '../models/database';
import { listenToDatabases, createDatabase, deleteDatabase } from '../models/database';
import { listenToCollections, createCollection, updateCollectionSchema, updateCollectionDescription, deleteCollection } from '../models/collection';
import { getDocumentsForCollection, insertDocument } from '../models/document';
import DocumentTable from './App/DocumentTable';
import CreateDatabaseModal from './App/CreateDatabaseModal';
import CreateCollectionModal from './App/CreateCollectionModal';
import EditSchemaModal from './App/EditSchemaModal';
import AddDocumentModal from './App/AddDocumentModal';

const pb = getPB();

const App: FunctionalComponent = () => {
  console.log('App component rendering...');
  
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionData, setCollectionData] = useState<Document[]>([]);
  
  // Modal states
  const [showCreateDatabaseModal, setShowCreateDatabaseModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showEditSchemaModal, setShowEditSchemaModal] = useState(false);
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  
  // Reprocessing state
  const [showReprocessPrompt, setShowReprocessPrompt] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  
  // Copy button state
  const [copiedDatabase, setCopiedDatabase] = useState<string | null>(null);

  useEffect(() => {
    console.log('App component mounted - useEffect running');
    
    // Check if user is authenticated
    const checkAuth = () => {
      console.log('checkAuth function called');
      try {
        const authData = pb.authStore.record;
        console.log('Auth data from store:', authData);
        setUser(authData as any);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      console.log('Auth store onChange triggered');
      checkAuth();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const setupDatabaseListener = async () => {
      try {
        const unsubscribe = await listenToDatabases(pb, user.id, (records) => {
          setDatabases(records);
          
          // Set first database as selected if none selected
          if (records.length > 0 && !selectedTab) {
            setSelectedTab(records[0].id);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up database listener:', error);
      }
    };

    let unsubscribePromise = setupDatabaseListener();

    return () => {
      unsubscribePromise?.then(unsub => unsub?.());
    };
  }, [user]);

  // Fetch collections when database is selected
  useEffect(() => {
    if (!selectedTab || !user) {
      setCollections([]);
      setSelectedCollection(null);
      setShowReprocessPrompt(false); // Hide prompt when switching databases
      return;
    }

    const setupCollectionListener = async () => {
      try {
        const unsubscribe = await listenToCollections(pb, selectedTab, user.id, (records) => {
          setCollections(records);
          
          // Set first collection as selected if none selected
          setTimeout(() => {
            if (records.length > 0 && !selectedCollection) {
              // setSelectedCollection(records[0].id);
            }
          },300);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error setting up collection listener:', error);
      }
    };

    let unsubscribePromise = setupCollectionListener();

    return () => {
      unsubscribePromise?.then(unsub => unsub?.());
    };
  }, [selectedTab, user]);

  // Fetch collection data when collection is selected
  useEffect(() => {
    if (!selectedCollection || !user) {
      setCollectionData([]);
      return;
    }

    setShowReprocessPrompt(false); // Hide prompt when switching collections

    const fetchCollectionData = async () => {
      try {
        const documents = await getDocumentsForCollection(pb, selectedCollection, user.id);
        setCollectionData(documents);
      } catch (error) {
        console.error('Error fetching collection data:', error);
      }
    };

    fetchCollectionData();
  }, [selectedCollection, user]);

  // Modal handlers
  const handleCreateDatabase = async (name: string) => {
    try {
      const database = await createDatabase(pb, user.id, name);
      // Database list will update automatically via the listener
      
      // Kickstart the database with default collections
      try {
        const response = await fetch('/api/kickstart-db', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            databaseId: database.id,
            token: pb.authStore.token
          })
        });

        const result = await response.json();
        
        if (!result.success) {
          console.error('Failed to kickstart database:', result.error);
          // Don't throw error here - database was created successfully
        }
      } catch (kickstartError) {
        console.error('Error kickstarting database:', kickstartError);
        // Don't throw error here - database was created successfully
      }
    } catch (error) {
      console.error('Error creating database:', error);
      throw error;
    }
  };

  const handleCreateCollection = async (name: string, description: string, schema: SchemaField[]) => {
    if (!selectedTab) return;
    try {
      await createCollection(pb, user.id, selectedTab, name, schema, description);
      // Collection list will update automatically via the listener
      
      // Show reprocess prompt if schema is defined and not an emails collection
      if (schema.length > 0 && name !== 'emails') {
        setShowReprocessPrompt(true);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  };

  const handleUpdateSchema = async (description: string, schema: SchemaField[]) => {
    if (!selectedCollection) return;
    try {
      // Update both description and schema
      await Promise.all([
        updateCollectionDescription(pb, user.id, selectedCollection, description),
        updateCollectionSchema(pb, user.id, selectedCollection, schema)
      ]);
      // Collections will update automatically via the listener
      
      // Show reprocess prompt if schema is defined and not an emails collection
      const collection = collections.find(c => c.id === selectedCollection);
      if (schema.length > 0 && collection?.name !== 'emails') {
        setShowReprocessPrompt(true);
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      throw error;
    }
  };

  const handleAddDocument = async (data: Record<string, any>) => {
    if (!selectedCollection || !selectedTab) return;
    try {
      await insertDocument(pb, user.id, selectedTab, selectedCollection, data);
      // Refresh collection data
      const documents = await getDocumentsForCollection(pb, selectedCollection, user.id);
      setCollectionData(documents);
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  };

  const handleDeleteDatabase = async (databaseId: string) => {
    if (confirm('Are you sure you want to delete this database? All collections and documents will be deleted.')) {
      try {
        await deleteDatabase(pb, user.id, databaseId);
        // Database list will update automatically via the listener
        if (selectedTab === databaseId) {
          setSelectedTab(null);
        }
      } catch (error) {
        console.error('Error deleting database:', error);
        alert('Failed to delete database: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (confirm('Are you sure you want to delete this collection? All documents will be deleted.')) {
      try {
        await deleteCollection(pb, user.id, collectionId);
        // Collection list will update automatically via the listener
        if (selectedCollection === collectionId) {
          setSelectedCollection(null);
        }
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('Failed to delete collection: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleReprocessEmails = async () => {
    if (!selectedTab || !user) return;
    
    setIsReprocessing(true);
    try {
      const response = await fetch('/api/reprocess-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          databaseId: selectedTab,
          token: pb.authStore.token
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Successfully reprocessed ${result.processedEmails} emails and extracted ${result.extractedDocuments} documents!`);
        // Refresh collection data
        if (selectedCollection) {
          const documents = await getDocumentsForCollection(pb, selectedCollection, user.id);
          setCollectionData(documents);
        }
      } else {
        alert('Failed to reprocess emails: ' + result.error);
      }
    } catch (error) {
      console.error('Error reprocessing emails:', error);
      alert('Failed to reprocess emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsReprocessing(false);
      setShowReprocessPrompt(false);
    }
  };

  const handleExportCollection = async () => {
    if (!selectedCollection || !selectedTab || !user) return;
    
    try {
      const response = await fetch('/api/export-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collectionId: selectedCollection,
          databaseId: selectedTab,
          token: pb.authStore.token
        })
      });

      if (response.ok) {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'collection-export.csv';
        if (contentDisposition) {
          const matches = contentDisposition.match(/filename="?([^"]+)"?/);
          if (matches) {
            filename = matches[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const result = await response.json();
        alert('Failed to export collection: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error exporting collection:', error);
      alert('Failed to export collection: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center flex-col">
        {isLoading ? (
          <h1 className="text-2xl font-bold text-gray-700">Loading...</h1>
        ) : (
          <h1 className="text-2xl font-bold text-gray-700">Please log in</h1>
        )}
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div className="flex justify-top items-center flex-col text-center px-4 py-16">
        <div className="max-w-lg mx-auto space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Create your first database!</h1>
          <p className="text-lg text-gray-700 leading-relaxed">
            Get started by creating a database to organize your data collections.
          </p>
          <button
            onClick={() => setShowCreateDatabaseModal(true)}
            className="px-6 py-3 bg-cyan-600 text-white font-medium rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Create Database
          </button>
        </div>
        
        <CreateDatabaseModal
          isOpen={showCreateDatabaseModal}
          onClose={() => setShowCreateDatabaseModal(false)}
          onSubmit={handleCreateDatabase}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex items-center space-x-1">
          {databases.map((database) => (
            <div key={database.id} className="relative group">
                <button
                onClick={() => setSelectedTab(database.id)}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors duration-200 select-text ${
                  selectedTab === database.id
                  ? 'bg-cyan-600 text-white shadow-lg'
                  : 'text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50'
                }`}
                >
                {user?.username}+{database.name || database.id}@nobs.email
                </button>
              {selectedTab === database.id && (
                <div className="absolute -top-1 -right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      const email = `${user?.username}+${database.name || database.id}@nobs.email`;
                      navigator.clipboard.writeText(email);
                      setCopiedDatabase(database.id);
                      setTimeout(() => setCopiedDatabase(null), 2000);
                    }}
                    className="w-5 h-5 bg-cyan-600 text-white text-xs rounded-full hover:bg-cyan-400 flex items-center justify-center"
                    title="Copy email address"
                  >
                    {copiedDatabase === database.id ? (
                      <span className="text-[8px] font-bold">✓</span>
                    ) : (
                      '📋'
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteDatabase(database.id)}
                    className="w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600"
                    title="Delete database"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowCreateDatabaseModal(true)}
            className="px-4 py-3 font-medium text-sm text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-t-lg transition-colors duration-200"
            title="Create new database"
          >
            +
          </button>
        </nav>
      </div>
      
      {/* Reprocess prompt banner */}
      {showReprocessPrompt && selectedTab && (
        <div className="bg-cyan-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-cyan-700">
                  <span className="font-medium">Collection schema updated!</span>
                  {' '}Would you like to re-process all past emails in this database to extract data using the new schema?
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReprocessEmails}
                disabled={isReprocessing}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReprocessing ? 'Processing...' : 'Yes, Re-process'}
              </button>
              <button
                onClick={() => setShowReprocessPrompt(false)}
                disabled={isReprocessing}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                Later
              </button>
              <button
                onClick={() => setShowReprocessPrompt(false)}
                disabled={isReprocessing}
                className="text-gray-400 hover:text-gray-600 p-1"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedTab && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-auto">
          <div className="flex h-[600px]">
            {/* Collections sidebar */}
            <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Collections</h3>
                <button
                  onClick={() => setShowCreateCollectionModal(true)}
                  className="text-xs px-2 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                  title="Create new collection"
                >
                  + Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {collections.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No collections found</p>
                    <p className="text-xs mt-1">Click "Add" to create a collection</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {collections
                      .sort((a, b) => {
                        // Always put "emails" collection first
                        if (a.name === 'emails') return -1;
                        if (b.name === 'emails') return 1;
                        // Sort everything else alphabetically
                        return a.name.localeCompare(b.name);
                      })
                      .map((collection) => (
                      <div key={collection.id} className="relative group">
                        <button
                          onClick={() => setSelectedCollection(collection.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                            selectedCollection === collection.id
                              ? 'bg-cyan-600 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                          }`}
                        >
                          <div className="truncate">{collection.name}</div>
                        </button>
                        {selectedCollection === collection.id && (
                          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              {collection.name !== 'emails' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCollection(collection.id);
                                    setShowEditSchemaModal(true);
                                  }}
                                  className="w-5 h-5 bg-gray-700 text-white text-xs rounded hover:bg-gray-800"
                                  title="Edit schema"
                                >
                                  ⚙
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCollection(collection.id);
                                }}
                                className="w-5 h-5 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                title="Delete collection"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Main content area */}
            <div className="flex-1 flex flex-col">
              {selectedCollection ? (
                <>
                  {/* Collection header */}
                  <div className="p-6 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">
                          {collections.find(c => c.id === selectedCollection)?.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {collectionData.length} records
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleExportCollection}
                          disabled={collectionData.length === 0}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Export collection data as CSV"
                        >
                          Export CSV
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Data table */}
                  <div className="flex-1 overflow-hidden">
                    <DocumentTable
                      user={user || null}
                      database={databases.find(db => db.id === selectedTab) || null} 
                      documents={collectionData} 
                      collection={collections.find(c => c.id === selectedCollection) || null} 
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a collection</h3>
                    <p className="text-gray-500">
                      Choose a collection from the sidebar to view its data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modals */}
      <CreateDatabaseModal
        isOpen={showCreateDatabaseModal}
        onClose={() => setShowCreateDatabaseModal(false)}
        onSubmit={handleCreateDatabase}
      />
      
      <CreateCollectionModal
        isOpen={showCreateCollectionModal}
        onClose={() => setShowCreateCollectionModal(false)}
        onSubmit={handleCreateCollection}
      />
      
      <EditSchemaModal
        isOpen={showEditSchemaModal}
        onClose={() => setShowEditSchemaModal(false)}
        onSubmit={handleUpdateSchema}
        collection={collections.find(c => c.id === selectedCollection) || null}
      />
      
      <AddDocumentModal
        isOpen={showAddDocumentModal}
        onClose={() => setShowAddDocumentModal(false)}
        onSubmit={handleAddDocument}
        collection={collections.find(c => c.id === selectedCollection) || null}
      />
    </div>
  );
};

export default App;