import PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

export interface Quota extends RecordModel {
  id: string;
  user: string; // User ID
  used: number; // Number of emails processed
  total: number; // Total allowed emails
  created: string; // ISO date string
  updated: string; // ISO date string
}

export class QuotaExceededError extends Error {
  constructor(used: number, total: number) {
    super(`Quota exceeded: ${used}/${total} emails processed`);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Ensures a quota record exists for the user and returns it
 */
export async function ensureQuota(pb: PocketBase, userId: string): Promise<Quota> {
  try {
    const quotaRecord = await pb.collection('quotas').getFirstListItem(`user="${userId}"`);
    return quotaRecord as Quota;
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      // Create new quota record with default values
      const quotaRecord = await pb.collection('quotas').create({
        user: userId,
        used: 0,
        total: 100
      });
      console.log(`Quota created for user ${userId} with default limit of 100`);
      return quotaRecord as Quota;
    } else {
      console.error(`Error ensuring quota for user ${userId}:`, error);
      throw error;
    }
  }
}

/**
 * Uses one unit of the user's quota and throws an error if they've reached their limit
 */
export async function useQuota(pb: PocketBase, userId: string): Promise<void> {
  const quota = await ensureQuota(pb, userId);
  
  if (quota.used >= quota.total) {
    throw new QuotaExceededError(quota.used, quota.total);
  }
  
  // Increment the used count
  await pb.collection('quotas').update(quota.id, {
    used: quota.used + 1
  });
  
  console.log(`Quota used for user ${userId}: ${quota.used + 1}/${quota.total}`);
}

/**
 * Gets the current quota status for a user
 */
export async function getQuotaStatus(pb: PocketBase, userId: string): Promise<Quota> {
  return await ensureQuota(pb, userId);
}

/**
 * Resets the quota usage for a user (admin function)
 */
export async function resetQuota(pb: PocketBase, userId: string): Promise<void> {
  const quota = await ensureQuota(pb, userId);
  
  await pb.collection('quotas').update(quota.id, {
    used: 0
  });
  
  console.log(`Quota reset for user ${userId}`);
}

/**
 * Updates the quota limit for a user (admin function)
 */
export async function updateQuotaLimit(pb: PocketBase, userId: string, newTotal: number): Promise<void> {
  const quota = await ensureQuota(pb, userId);
  
  await pb.collection('quotas').update(quota.id, {
    total: newTotal
  });
  
  console.log(`Quota limit updated for user ${userId}: ${newTotal}`);
}