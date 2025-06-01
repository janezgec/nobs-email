import { useState, useEffect } from 'preact/hooks';
import type { FunctionalComponent } from 'preact';
import { getPB } from '../lib/pb';
import type { Collection } from '../models/collection';
import type { Document } from '../models/document';
import { listenToDatabases } from '../models/database';
import { listenToCollections } from '../models/collection';
import { getDocumentsForCollection } from '../models/document';

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
  const [databases, setDatabases] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [collectionData, setCollectionData] = useState<Document[]>([]);

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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Ready for <span className="line-through">emails</span> data!</h1>
          <p className="text-lg text-gray-700 leading-relaxed">
            Send <CyclingText /> emails to{' '}
            <span className="font-semibold text-purple-600">janez@nobs.email</span>{' '}
            to start seeing data.
          </p>
          <div className="text-gray-400">
            <WaitingDataLoader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-1">
          {databases.map((database) => (
            <button
              key={database.id}
              onClick={() => setSelectedTab(database.id)}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-colors duration-200 ${
                selectedTab === database.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
              }`}
            >
              {database.name || database.id}
            </button>
          ))}
        </nav>
      </div>
      
      {selectedTab && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-auto">
          <div className="flex h-[600px]">
            {/* Collections sidebar */}
            <div className="w-64 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Collections</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {collections.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No collections found</p>
                    <p className="text-xs mt-1">Send emails to create collections</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {collections.map((collection) => (
                      <button
                        key={collection.id}
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
                  <div className="flex-1 overflow-hidden p-6">
                    {collectionData.length === 0 ? (
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
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
                        <div className="overflow-auto h-full">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Collection
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Database
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Data
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Embeds
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Updated
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {collectionData.map((item, index) => (
                                <tr key={item.id || index} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.id || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.user || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.collection || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.database || 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded max-w-md overflow-auto max-h-32">
                                      {JSON.stringify(item.data, null, 2)}
                                    </pre>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded max-w-md overflow-auto max-h-32">
                                      {JSON.stringify(item.embeds, null, 2)}
                                    </pre>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.created ? new Date(item.created).toLocaleString() : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.updated ? new Date(item.updated).toLocaleString() : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
    </div>
  );
};

export default App;