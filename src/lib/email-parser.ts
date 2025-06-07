interface EmailPerson {
  email: string;
  name: string;
  mailboxHash: string;
}

interface EmailHeader {
  name: string;
  value: string;
}

interface EmailData {
  messageId: string;
  messageStream: string;
  from: string;
  fromName: string;
  fromFull: EmailPerson;
  to: string;
  toFull: EmailPerson[];
  cc: string;
  ccFull: EmailPerson[];
  bcc: string;
  bccFull: EmailPerson[];
  originalRecipient: string;
  replyTo: string;
  subject: string;
  date: string;
  mailboxHash: string;
  textBody: string;
  htmlBody: string;
  strippedTextReply: string;
  tag: string;
  headers: EmailHeader[];
}

export function postmarkPayloadToEmailData(payload: any): EmailData {
  return {
    messageId: payload.MessageID,
    messageStream: payload.MessageStream,
    from: payload.From,
    fromName: payload.FromName,
    fromFull: {
      email: payload.FromFull.Email,
      name: payload.FromFull.Name,
      mailboxHash: payload.FromFull.MailboxHash
    },
    to: payload.To,
    toFull: payload.ToFull.map((person: any) => ({
      email: person.Email,
      name: person.Name,
      mailboxHash: person.MailboxHash
    })),
    cc: payload.Cc,
    ccFull: payload.CcFull.map((person: any) => ({
      email: person.Email,
      name: person.Name,
      mailboxHash: person.MailboxHash
    })),
    bcc: payload.Bcc,
    bccFull: payload.BccFull.map((person: any) => ({
      email: person.Email,
      name: person.Name,
      mailboxHash: person.MailboxHash
    })),
    originalRecipient: payload.OriginalRecipient,
    replyTo: payload.ReplyTo,
    subject: payload.Subject,
    date: payload.Date,
    mailboxHash: payload.MailboxHash,
    textBody: payload.TextBody,
    htmlBody: payload.HtmlBody,
    strippedTextReply: payload.StrippedTextReply,
    tag: payload.Tag,
    headers: payload.Headers.map((header: any) => ({
      name: header.Name,
      value: header.Value
    }))
    // skipping attachments for now
  };
}

export function getUsernameFromEmail(email: string): string {
  email = email.trim().toLowerCase();
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return '';
  const str = email.substring(0, atIndex).split('+')[0].trim();
  return str.replace(/[^a-z0-9]/g, '');
}

export function getDatabaseFromEmail(email: string): string {
  email = email.trim().toLowerCase();
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return '';
  const beforeAt = email.split('@')[0];
  if (beforeAt.includes('+')) {
    return beforeAt.split('+')[1].replace(/[^a-z0-9]/g, '');
  } else {
    return '';
  }
}
