import PocketBase from 'pocketbase';
import type { RecordModel, RecordAuthResponse } from 'pocketbase';
import { getVariable } from './../lib/env.ts';

export interface User extends RecordModel {
  id: string;
  email: string;
  username: string;
  creditBalance?: number;
}

export interface ValidationResult {
  valid: boolean;
  user?: RecordModel;
  error?: string;
}

export async function validateUserToken(token: string): Promise<ValidationResult> {
  // ensure we are dealing with a new pocketbase instance every time (security)
  const pb = new PocketBase(getVariable('PUBLIC_POCKETBASE_URL'));
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

export async function getUserByUsername(pb: PocketBase, username: string): Promise<User> {
  try {
    const user = await pb.collection('users').getFirstListItem(`username="${username}"`);
    return user as User;
  } catch (error) {
    console.error(`Error fetching user by username ${username}:`, error);
    throw error;
  }
}

export async function decrementUserCreditBalance(pb: PocketBase, userId: string): Promise<User> {
  try {
    const user = await pb.collection('users').update(userId, {
      'creditBalance-': 1
    });
    return user as User;
  } catch (error: any) {
    if (error.message?.includes('creditBalance') || error.status === 400) {
      throw new Error('Insufficient credit balance. User has reached 0 credits.');
    }
    console.error(`Error decrementing credit balance for user ${userId}:`, error);
    throw error;
  }
}