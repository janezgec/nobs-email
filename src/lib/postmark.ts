import postmark from 'postmark';
var client = new postmark.ServerClient(import.meta.env.POSTMARK_SERVER_TOKEN);
module.exports = client;