import type { RecordModel } from 'pocketbase';
import PocketBase from 'pocketbase';

export interface Document extends RecordModel {
  id: string;
  user: string; // User ID
  collection: string; // Collection ID
  database: string; // Database ID
  data: Record<string, any>; // Document data
  created: string; // ISO date string
  updated: string; // ISO date string
}

export async function getDocumentsForCollection(pb: PocketBase, collectionId: string, userId: string): Promise<Document[]> {
  try {
    const records = await pb.collection('documents').getFullList({
      filter: `collection = "${collectionId}" && user = "${userId}"`
    });
    return records as Document[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
}

export async function getDocumentByDataProperty(
  pb: PocketBase,
  collectionId: string,
  propertyName: string,
  propertyValue: any
): Promise<Document | null> {
  try {
    const records = await pb.collection('documents').getFullList({
      filter: `collection = "${collectionId}" && data.${propertyName} = "${propertyValue}"`
    });
    return records.length > 0 ? (records[0] as Document) : null;
  } catch (error) {
    console.error('Error fetching document by property:', error);
    throw error;
  }
}

export async function getLastDocumentInCollection(
  pb: PocketBase,
  collectionId: string,
  userId: string
): Promise<Document | null> {
  try {
    const records = await pb.collection('documents').getList(1, 1, {
      filter: `collection = "${collectionId}" && user = "${userId}"`,
      sort: '-created'
    });
    return records.items.length > 0 ? (records.items[0] as Document) : null;
  } catch (error) {
    console.error('Error fetching last document:', error);
    throw error;
  }
}

export async function insertDocument(
  pb: PocketBase,
  userId: string,
  databaseId: string,
  collectionId: string,
  data: Record<string, any>
): Promise<Document> {
  try {
    const newDoc = await pb.collection('documents').create({
      user: userId,
      collection: collectionId,
      database: databaseId,
      data
    });
    return newDoc as Document;
  } catch (error) {
    console.error('Error inserting document:', error);
    throw error;
  }
}