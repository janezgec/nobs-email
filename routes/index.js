var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/webhook', async function(req, res) {
  if(req.params.secret !== process.env.POSTMARK_WEBHOOK_SECRET) {
    console.error('Invalid Postmark webhook secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    // Log the incoming webhook for debugging
    console.log('Received Postmark webhook:', JSON.stringify(req.body, null, 2));
    
    // Extract email data from Postmark webhook payload
    const emailData = {
      messageId: req.body.MessageID,
      from: req.body.From,
      fromName: req.body.FromName,
      to: req.body.To,
      toFull: req.body.ToFull,
      cc: req.body.Cc,
      ccFull: req.body.CcFull,
      bcc: req.body.Bcc,
      bccFull: req.body.BccFull,
      replyTo: req.body.ReplyTo,
      subject: req.body.Subject,
      date: req.body.Date,
      mailboxHash: req.body.MailboxHash,
      textBody: req.body.TextBody,
      htmlBody: req.body.HtmlBody,
      strippedTextReply: req.body.StrippedTextReply,
      tag: req.body.Tag,
      headers: req.body.Headers,
      attachments: req.body.Attachments || []
    };

    // Process attachments if any
    if (emailData.attachments.length > 0) {
      console.log(`Email has ${emailData.attachments.length} attachment(s):`);
      emailData.attachments.forEach((attachment, index) => {
        console.log(`Attachment ${index + 1}:`, {
          name: attachment.Name,
          contentType: attachment.ContentType,
          contentLength: attachment.ContentLength,
          contentId: attachment.ContentID
        });
      });
    }

    // Log extracted email data
    console.log('Parsed email data:', {
      messageId: emailData.messageId,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: emailData.attachments.length > 0
    });

    // TODO: Add your email processing logic here
    // Examples:
    // - Save to database
    // - Forward to another service
    // - Send auto-reply
    // - Process attachments
    // - Extract specific data from email content

    // Respond with 200 OK to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Email webhook processed successfully',
      messageId: emailData.messageId
    });

  } catch (error) {
    console.error('Error processing Postmark webhook:', error);
    
    // Return error response
    res.status(500).json({ 
      success: false, 
      message: 'Error processing webhook',
      error: error.message 
    });
  }
});

module.exports = router;
