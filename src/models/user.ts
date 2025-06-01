import PocketBase from 'pocketbase';
import type { RecordModel, RecordAuthResponse } from 'pocketbase';

export interface User extends RecordModel {
  id: string;
  email: string;
  username: string;
}

export interface ValidationResult {
  valid: boolean;
  user?: RecordModel;
  error?: string;
}

export async function validateUserToken(token: string): Promise<ValidationResult> {
  // ensure we are dealing with a new pocketbase instance every time (security)
  const pb = new PocketBase(process.env.PUBLIC_POCKETBASE_URL);
  try {
    pb.authStore.save(token);
    const user = await pb.collection('users').authRefresh();
    return {
      valid: true,
      user: user.record
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message
    };
  }
}

export async function getUserByEmail(pb: PocketBase, email: string): Promise<User> {
  try {
    const user = await pb.collection('users').getFirstListItem(`email="${email}"`);
    return user as User;
  } catch (error) {
    console.error(`Error fetching user by email ${email}:`, error);
    throw error;
  }
}