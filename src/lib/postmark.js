var postmark = require('postmark');
var client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
module.exports = client;