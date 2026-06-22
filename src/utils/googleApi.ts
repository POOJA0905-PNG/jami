/**
 * Utility functions for Google Gmail and Google Sheets APIs
 */

import { EmailMessage, ContactProfile, EmailSummary, Priority } from '../types';

// Helper to decode Base64Url string to UTF-8
export function decodeBase64Url(str: string): string {
  if (!str) return '';
  // Convert standard base64url characters to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '=' to make length a multiple of 4
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    // Try browser base64 decoding with Unicode support
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(base64);
    } catch (err) {
      console.error('Base64 decode error:', err);
      return '[Unparseable content]';
    }
  }
}

// Extract human-friendly details from header array
export function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

// Extract display name and email address from "From" header (e.g. "Jane Doe <jane@example.com>")
export function parseFromHeader(fromStr: string): { name: string; email: string } {
  if (!fromStr) return { name: 'Unknown', email: '' };
  
  const emailMatch = fromStr.match(/<([^>]+)>/);
  if (emailMatch && emailMatch[1]) {
    const email = emailMatch[1].trim().toLowerCase();
    const name = fromStr.replace(/<[^>]+>/, '').replace(/"/g, '').trim();
    return { name: name || email, email };
  }
  
  return { name: fromStr.replace(/"/g, '').trim(), email: fromStr.trim().toLowerCase() };
}

// Recursively traverse email payload parts to extract body text
export function getMessageBody(payload: any): string {
  if (!payload) return '';
  
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }
  
  if (payload.parts) {
    // Look for text/plain first
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    
    // Look for text/html next
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        // Strip html tags or pass HTML (plain text is better for display cards)
        const html = decodeBase64Url(part.body.data);
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
    
    // Recurse deeper if multipart/alternative contains other multiparts
    for (const part of payload.parts) {
      if (part.parts) {
        const bodyContent = getMessageBody(part);
        if (bodyContent) return bodyContent;
      }
    }
  }
  
  return payload.snippet || '';
}

// Fetch list of latest messages from Gmail
export async function fetchGmailInbox(accessToken: string, maxResults = 15): Promise<EmailMessage[]> {
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=is:inbox`;
  
  const response = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    throw new Error(`Gmail API list error: ${response.status} ${response.statusText}`);
  }
  
  const listData = await response.json();
  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }
  
  // Fetch detailed email content for each message
  const detailsPromises = listData.messages.map(async (msg: { id: string }) => {
    try {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const detailRes = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!detailRes.ok) return null;
      
      const emailDetail = await detailRes.json();
      const headers = emailDetail.payload?.headers || [];
      const fromStr = getHeader(headers, 'from');
      const { name: fromName, email: fromEmail } = parseFromHeader(fromStr);
      
      return {
        id: emailDetail.id,
        threadId: emailDetail.threadId,
        subject: getHeader(headers, 'subject') || '(No Subject)',
        fromName,
        fromEmail,
        date: getHeader(headers, 'date') || '',
        snippet: emailDetail.snippet || '',
        body: getMessageBody(emailDetail.payload),
      };
    } catch (e) {
      console.error(`Error fetching detail for email ID ${msg.id}:`, e);
      return null;
    }
  });
  
  const results = await Promise.all(detailsPromises);
  return results.filter((r): r is EmailMessage => r !== null);
}

// Fetch all tabs metadata from Google Sheets
export async function fetchSpreadsheetTabs(accessToken: string, spreadsheetId: string): Promise<Array<{ title: string; id: number }>> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=false`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    throw new Error(`Sheets API metadata error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return (data.sheets || []).map((sheet: any) => ({
    title: sheet.properties.title as string,
    id: sheet.properties.sheetId as number,
  }));
}

// Fetch spreadsheet values for a range
export async function fetchSheetValues(accessToken: string, spreadsheetId: string, range: string): Promise<any[][] | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    console.warn(`Could not fetch spreadsheet range ${range}: ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  return data.values || [];
}

// Parse profiles values dynamically
export function parseContactProfiles(rows: any[][]): ContactProfile[] {
  if (!rows || rows.length <= 1) return [];
  
  const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
  
  // Find indices based on resilient lowercase matcher
  const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail') || h === 'to' || h === 'contact');
  const nameIdx = headers.findIndex((h) => h.includes('name') || h === 'contact' || h.includes('person'));
  const companyIdx = headers.findIndex((h) => h.includes('company') || h.includes('org') || h.includes('firm') || h.includes('business'));
  const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('role') || h.includes('job') || h.includes('position'));
  const bioIdx = headers.findIndex((h) => h.includes('bio') || h.includes('note') || h.includes('context') || h.includes('relationship') || h.includes('desc'));
  const priorityIdx = headers.findIndex((h) => h.includes('priority') || h.includes('prio') || h.includes('level') || h === 'p1');

  if (emailIdx === -1) {
    console.warn('Could not find mandatory Email column in contact profiles sheet');
    return [];
  }

  return rows.slice(1).map((row) => {
    const email = String(row[emailIdx] || '').trim().toLowerCase();
    const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
    const company = companyIdx !== -1 ? String(row[companyIdx] || '').trim() : '';
    const title = titleIdx !== -1 ? String(row[titleIdx] || '').trim() : '';
    const bio = bioIdx !== -1 ? String(row[bioIdx] || '').trim() : '';
    
    let priorityStr = priorityIdx !== -1 ? String(row[priorityIdx] || '').trim().toUpperCase() : '';
    let priority: Priority | null = null;
    if (priorityStr.includes('P1') || priorityStr === '1' || priorityStr.includes('HIGH')) priority = 'P1';
    else if (priorityStr.includes('P2') || priorityStr === '2' || priorityStr.includes('MED')) priority = 'P2';
    else if (priorityStr.includes('P3') || priorityStr === '3' || priorityStr.includes('LOW')) priority = 'P3';
    
    return { email, name: name || email, company, title, bio, priority };
  }).filter(p => !!p.email);
}

// Parse email summaries values dynamically
export function parseEmailSummaries(rows: any[][]): EmailSummary[] {
  if (!rows || rows.length <= 1) return [];
  
  const headers = rows[0].map((h) => String(h || '').trim().toLowerCase());
  
  // Resilient column match
  const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('sender') || h === 'from' || h.includes('mail') || h.includes('contact'));
  const subjectIdx = headers.findIndex((h) => h.includes('subject') || h.includes('title') || h.includes('topic'));
  const summaryIdx = headers.findIndex((h) => h.includes('summary') || h.includes('context') || h.includes('brief') || h.includes('notes') || h.includes('content'));
  const replyIdx = headers.findIndex((h) => h.includes('draft') || h.includes('reply') || h.includes('response') || h.includes('suggested') || h.includes('text') || h.includes('template'));
  const priorityIdx = headers.findIndex((h) => h.includes('priority') || h.includes('prio') || h.includes('level') || h === 'p1');

  if (summaryIdx === -1) {
    console.warn('Could not find mandatory Summary column in email summaries sheet');
    return [];
  }

  // Set default lookup strategies
  const fallbackEmailIdx = emailIdx !== -1 ? emailIdx : headers.findIndex(h => h !== '');

  return rows.slice(1).map((row) => {
    const email = fallbackEmailIdx !== -1 ? String(row[fallbackEmailIdx] || '').trim().toLowerCase() : '';
    const subject = subjectIdx !== -1 ? String(row[subjectIdx] || '').trim() : '';
    const summary = String(row[summaryIdx] || '').trim();
    const suggestedReply = replyIdx !== -1 ? String(row[replyIdx] || '').trim() : '';
    
    let priorityStr = priorityIdx !== -1 ? String(row[priorityIdx] || '').trim().toUpperCase() : '';
    let priority: Priority | null = null;
    if (priorityStr.includes('P1') || priorityStr === '1' || priorityStr.includes('HIGH')) priority = 'P1';
    else if (priorityStr.includes('P2') || priorityStr === '2' || priorityStr.includes('MED')) priority = 'P2';
    else if (priorityStr.includes('P3') || priorityStr === '3' || priorityStr.includes('LOW')) priority = 'P3';
    
    return { email, subject, summary, suggestedReply, priority };
  });
}

// Convert message payload to MIME string and send via Gmail API
export async function sendGmailReply(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<boolean> {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
  ];
  
  const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;
  
  // Safe Unicode base64url encoding
  const base64UrlSafe = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
    
  const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  
  const sendBody: { raw: string; threadId?: string } = {
    raw: base64UrlSafe,
  };
  if (threadId) {
    sendBody.threadId = threadId;
  }
  
  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sendBody),
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API send failed: ${response.status} - ${errText}`);
  }
  
  return true;
}
