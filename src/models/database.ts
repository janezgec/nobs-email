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