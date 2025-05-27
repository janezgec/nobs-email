export async function POST({ request }) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== process.env.POSTMARK_WEBHOOK_SECRET) {
      console.error('Invalid Postmark webhook secret');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extract email data from Postmark webhook payload
    const emailData = {
      messageId: body.MessageID,
      from: body.From,
      fromName: body.FromName,
      to: body.To,
      toFull: body.ToFull,
      cc: body.Cc,
      ccFull: body.CcFull,
      bcc: body.Bcc,
      bccFull: body.BccFull,
      replyTo: body.ReplyTo,
      subject: body.Subject,
      date: body.Date,
      mailboxHash: body.MailboxHash,
      textBody: body.TextBody,
      htmlBody: body.HtmlBody,
      strippedTextReply: body.StrippedTextReply,
      tag: body.Tag,
      headers: body.Headers,
      attachments: body.Attachments || []
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
    
    return new Response(JSON.stringify({
      success: true, 
      message: 'Email webhook processed successfully',
      messageId: emailData.messageId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}