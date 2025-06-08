import PocketBase from 'pocketbase';
import type { RecordAuthResponse } from 'pocketbase';
import { getVariable } from './../lib/env.ts';

let pb: null|PocketBase = null;

export function getPB(): PocketBase {
  if (!pb) {
    pb = new PocketBase(getVariable('PUBLIC_POCKETBASE_URL'));
    pb.autoCancellation(false);
  }
  return pb;
}

export async function authSuperAdmin(pb: PocketBase): Promise<RecordAuthResponse> {
  try {
    const authData = await pb.collection('_superusers').authWithPassword(
      getVariable('POCKETBASE_ADMIN_USERNAME'),
      getVariable('POCKETBASE_ADMIN_PASSWORD')
    );
    return authData;
  } catch (error) {
    console.error('Error authenticating super admin:', error);
    throw error;
  }
}