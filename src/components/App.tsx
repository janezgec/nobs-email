import { useState, useEffect } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import { getPB } from '../lib/pb';
import type { Collection, SchemaField } from '../models/collection';
import type { Document } from '../models/document';
import type { Database } from '../models/database';
import { listenToDatabases, createDatabase, deleteDatabase } from '../models/database';
import { listenToCollections, createCollection, updateCollectionSchema, deleteCollection } from '../models/collection';
import { getDocumentsForCollection, insertDocument } from '../models/document';
import DocumentTable from './App/DocumentTable';
import CreateDatabaseModal from './App/CreateDatabaseModal';
import CreateCollectionModal from './App/CreateCollectionModal';
import EditSchemaModal from './App/EditSchemaModal';
import AddDocumentModal from './App/AddDocumentModal';

const pb = getPB();

const WaitingDataLoader: FunctionalComponent = () => {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev >= 3 ? 0 : prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <h2 className="text-xl font-semibold text-gray-600">
      {'.'.repeat(dots) || (<span>&nbsp;</span>)}
    </h2>
  );
};

const CyclingText: FunctionalComponent = () => {
  const options = [
    'asana notifications',
    'blog comments',
    'facebook notifications',
    'system emails',
    'slack notifications',
    'ai newsletter'
  ];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % options.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-semibold text-red-600 underline" style={{ width: '240px', display: 'inline-block' }}>
      {options[currentIndex]}
    </span>
  );
};

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
      return;
    }

    const setupCollectionListener = async () => {
      try {
        const unsubscribe = await listenToCollections(pb, selectedTab, user.id, (records) => {
          setCollections(records);
          
          // Set first collection as selected if none selected
          if (records.length > 0 && !selectedCollection) {
            setSelectedCollection(records[0].id);
          }
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
      await createDatabase(pb, user.id, name);
      // Database list will update automatically via the listener
    } catch (error) {
      console.error('Error creating database:', error);
      throw error;
    }
  };

  const handleCreateCollection = async (name: string, schema: SchemaField[]) => {
    if (!selectedTab) return;
    try {
      await createCollection(pb, user.id, selectedTab, name, schema);
      // Collection list will update automatically via the listener
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  };

  const handleUpdateSchema = async (schema: SchemaField[]) => {
    if (!selectedCollection) return;
    try {
      await updateCollectionSchema(pb, user.id, selectedCollection, schema);
      // Collections will update automatically via the listener
    } catch (error) {
      console.error('Error updating schema:', error);
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
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors duration-200 ${
                  selectedTab === database.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                }`}
              >
                {database.name || database.id}
              </button>
              {selectedTab === database.id && (
                <button
                  onClick={() => handleDeleteDatabase(database.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete database"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowCreateDatabaseModal(true)}
            className="px-4 py-3 font-medium text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-t-lg transition-colors duration-200"
            title="Create new database"
          >
            +
          </button>
        </nav>
      </div>
      
      {selectedTab && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-auto">
          <div className="flex h-[600px]">
            {/* Collections sidebar */}
            <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Collections</h3>
                <button
                  onClick={() => setShowCreateCollectionModal(true)}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                    {collections.map((collection) => (
                      <div key={collection.id} className="relative group">
                        <button
                          onClick={() => setSelectedCollection(collection.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                            selectedCollection === collection.id
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                          }`}
                        >
                          <div className="truncate">{collection.name}</div>
                          <div className="text-xs opacity-75 truncate">
                            {new Date(collection.created).toLocaleDateString()}
                          </div>
                        </button>
                        {selectedCollection === collection.id && (
                          <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex space-x-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowEditSchemaModal(true);
                                }}
                                className="w-5 h-5 bg-gray-700 text-white text-xs rounded hover:bg-gray-800"
                                title="Edit schema"
                              >
                                ⚙
                              </button>
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
                          {collectionData.length} documents
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Live
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Data table */}
                  <div className="flex-1 overflow-hidden">
                    <DocumentTable documents={collectionData} />
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