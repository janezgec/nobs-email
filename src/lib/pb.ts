import PocketBase from 'pocketbase';
import type { RecordAuthResponse } from 'pocketbase';

export function getPB(): PocketBase {
  const pb = new PocketBase(process.env.PUBLIC_POCKETBASE_URL);
  return pb;
}

export async function authSuperAdmin(pb: PocketBase): Promise<RecordAuthResponse> {
  try {
    const authData = await pb.collection('_superusers').authWithPassword(
      process.env.POCKETBASE_ADMIN_USERNAME!,
      process.env.POCKETBASE_ADMIN_PASSWORD!
    );
    return authData;
  } catch (error) {
    console.error('Error authenticating super admin:', error);
    throw error;
  }
}