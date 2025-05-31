import type { RecordModel } from 'pocketbase';

export interface Document extends RecordModel {
  id: string;
  user: string; // User ID
  collection: string; // Collection ID
  database: string; // Database ID
  data: Record<string, any>; // Document data
  embeds: any[]; // Array of embedded documents
  created: string; // ISO date string
  updated: string; // ISO date string
}