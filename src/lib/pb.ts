import PocketBase from 'pocketbase';
import type { RecordAuthResponse } from 'pocketbase';

let pb: null|PocketBase = null;

export function getPB(): PocketBase {
  if (!pb) {
    pb = new PocketBase(typeof process === 'undefined'? import.meta.env.PUBLIC_POCKETBASE_URL! : process.env.PUBLIC_POCKETBASE_URL);
    pb.autoCancellation(false);
  }
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