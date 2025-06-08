import postmark from 'postmark';
import { getVariable } from './../lib/env.ts';
var client = new postmark.ServerClient(getVariable('POSTMARK_SERVER_TOKEN'));
module.exports = client;