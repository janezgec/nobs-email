import PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Collection extends RecordModel {
  id: string;
  name: string;
  database: string;
  user: string; // User ID
  docDataSchema: any; // JSON schema for document data
  created: string; // ISO date string
  updated: string; // ISO date string
}

export async function ensureCollection(pb: PocketBase, userId: string, databaseId: string, collectionName: string): Promise<RecordModel> {
  try {
    const collectionRecord = await pb.collection('collections').getFirstListItem(`name="${collectionName}" && database="${databaseId}"`);
    return collectionRecord as RecordModel;
  } catch (error) {
    if(error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const collectionRecord = await pb.collection('collections').create({
        name: collectionName,
        database: databaseId,
        user: userId
      });
      console.log(`Collection ${collectionName} created in database ${databaseId} for user ${userId}`);
      return collectionRecord as RecordModel;
    } else {
      console.error(`Error ensuring collection ${collectionName} in database ${databaseId} for user ${userId}:`, error);
      throw error;
    }
  }
}

export async function getCollectionsForDatabase(pb: PocketBase, databaseId: string, userId: string): Promise<Collection[]> {
  try {
    const records = await pb.collection('collections').getFullList({
      filter: `database = "${databaseId}" && user = "${userId}"`
    });
    return records as Collection[];
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
}

export async function listenToCollections(
  pb: PocketBase, 
  databaseId: string, 
  userId: string, 
  callback: (collections: Collection[]) => void
): Promise<() => void> {
  const fetchAndNotify = async () => {
    try {
      const records = await getCollectionsForDatabase(pb, databaseId, userId);
      callback(records);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // Initial fetch
  await fetchAndNotify();

  // Subscribe to real-time updates
  const unsubscribe = pb.collection('collections').subscribe('*', (e) => {
    console.log('Collection update:', e);
    fetchAndNotify();
  }, {
    filter: `database = "${databaseId}" && user = "${userId}"`
  });

  // Return unsubscribe function
  return async () => {
    (await unsubscribe)?.();
  };
}