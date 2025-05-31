// use dotenv to load environment variables
import dotenv from 'dotenv';
dotenv.config({
  path: '../.env',
});

import { getPB, authSuperAdmin } from '../src/lib/pb';
import { getUserByEmail } from '../src/models/user';
import { ensureDatabase } from '../src/models/database';
import { ensureCollection } from '../src/models/collection';

(async function () {
  const pb = getPB();
  await authSuperAdmin(pb);

  const user = await getUserByEmail(pb, 'janez@gec.si');
  const uid = user.id;

  const db = await ensureDatabase(pb, uid, 'default');

  const col = await ensureCollection(pb, uid, db.id, 'test');
  console.log(user, db, col);
})();