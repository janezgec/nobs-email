import PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Database extends RecordModel {
  id: string;
  name: string;
  user: string; // User ID
  created: string; // ISO date string
  updated: string; // ISO date string
}

export async function ensureDatabase(pb: PocketBase, userId: string, databaseName: string): Promise<RecordModel> {
  try {
    const databaseRecord = await pb.collection('databases').getFirstListItem(`name="${databaseName}" && user="${userId}"`);
    return databaseRecord as RecordModel;
  } catch (error) {
    if(error && typeof error === 'object' && 'status' in error && error.status === 404) {
      const databaseRecord = await pb.collection('databases').create({
        name: databaseName,
        user: userId
      });
      console.log(`Database ${databaseName} created for user ${userId}`);
      return databaseRecord as RecordModel;
    } else {
      console.error(`Error ensuring database ${databaseName} for user ${userId}:`, error);
      throw error;
    }
  }
}

export async function getDatabasesForUser(pb: PocketBase, userId: string): Promise<Database[]> {
  try {
    const records = await pb.collection('databases').getFullList({
      filter: `user = "${userId}"`
    });
    return records as Database[];
  } catch (error) {
    console.error('Error fetching databases:', error);
    throw error;
  }
}

export async function listenToDatabases(
  pb: PocketBase, 
  userId: string, 
  callback: (databases: Database[]) => void
): Promise<() => void> {
  const fetchAndNotify = async () => {
    try {
      const records = await getDatabasesForUser(pb, userId);
      callback(records);
    } catch (error) {
      console.error('Error fetching databases:', error);
    }
  };

  // Initial fetch
  await fetchAndNotify();

  // Subscribe to real-time updates
  const unsubscribe = pb.collection('databases').subscribe('*', (e) => {
    console.log('Database update:', e);
    fetchAndNotify();
  }, {
    filter: `user = "${userId}"`
  }).catch((error) => {
    console.error('Error subscribing to database updates:', error);
    throw error;
  });
    
  // Return unsubscribe function
  return async () => {
    (await unsubscribe)?.();
  };
}

export async function createDatabase(pb: PocketBase, userId: string, databaseName: string): Promise<Database> {
  try {
    // Check if database already exists
    const existingDb = await pb.collection('databases').getFirstListItem(`name="${databaseName}" && user="${userId}"`);
    throw new Error(`Database "${databaseName}" already exists`);
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      // Database doesn't exist, create it
      const databaseRecord = await pb.collection('databases').create({
        name: databaseName,
        user: userId
      });
      console.log(`Database ${databaseName} created for user ${userId}`);
      return databaseRecord as Database;
    } else {
      // Re-throw the error if it's not a 404
      throw error;
    }
  }
}

export async function deleteDatabase(pb: PocketBase, userId: string, databaseId: string): Promise<void> {
  try {
    // Verify ownership
    const database = await pb.collection('databases').getOne(databaseId);
    if (database.user !== userId) {
      throw new Error('You can only delete your own databases');
    }
    
    // Delete all collections in this database
    const collections = await pb.collection('collections').getFullList({
      filter: `database = "${databaseId}" && user = "${userId}"`
    });
    
    for (const collection of collections) {
      // Delete all documents in this collection
      await pb.collection('documents').delete(collection.id);
    }
    
    // Delete all collections
    for (const collection of collections) {
      await pb.collection('collections').delete(collection.id);
    }
    
    // Delete the database
    await pb.collection('databases').delete(databaseId);
    console.log(`Database ${databaseId} deleted for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting database ${databaseId} for user ${userId}:`, error);
    throw error;
  }
}