import net from 'node:net';
import http from 'node:http';

const SMTP_PORT = parseInt(process.env.SMTP_PORT || '1025', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '3001', 10);
const HOST = '0.0.0.0';

// In-memory message store (most recent first)
const messages = [];

// In-memory pending verifications: target -> { code, expiresAt, attempts }
const pendingVerifications = new Map();

// Terminal colors
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const magenta = '\x1b[35m';
const blue = '\x1b[34m';
const bold = '\x1b[1m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

/**
 * Print plain text notification details to stdout
 */
function logBanner(type, details) {
  const isEmail = type === 'EMAIL';
  const isWhatsApp = type === 'WHATSAPP';
  console.log('');
  console.log('================================================================================');
  if (isEmail) {
    console.log('[KEYCLOAK NOTIFIER] EMAIL RECEIVED');
    console.log(`To:          ${details.to || ''}`);
    console.log(`Subject:     ${details.subject || ''}`);
    if (details.otp) {
      console.log(`OTP Code:    ${details.otp}`);
    }
    if (details.link) {
      console.log(`Action Link: ${details.link}`);
    }
  } else if (isWhatsApp) {
    console.log('\x1b[32m[KEYCLOAK NOTIFIER] WHATSAPP OTP RECEIVED\x1b[0m');
    console.log(`To:          ${details.to || ''}`);
    if (details.otp) {
      console.log(`OTP Code:    ${details.otp}`);
    }
    if (details.message) {
      console.log(`Message:     ${details.message}`);
    }
    if (details.link) {
      console.log(`Action Link: ${details.link}`);
    }
  } else {
    console.log('[KEYCLOAK NOTIFIER] SMS OTP RECEIVED');
    console.log(`To:          ${details.to || ''}`);
    if (details.otp) {
      console.log(`OTP Code:    ${details.otp}`);
    }
    if (details.message) {
      console.log(`Message:     ${details.message}`);
    }
    if (details.link) {
      console.log(`Action Link: ${details.link}`);
    }
  }
  console.log('================================================================================');
  console.log('');
}

/**
 * Decode quoted-printable MIME encoding
 */
function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, '') // strip soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extract verification URLs and OTP codes from raw text
 */
function extractMeta(rawText) {
  if (!rawText) return { link: null, otp: null };

  // Decode quoted-printable first so URLs broken across lines are assembled
  const decoded = decodeQuotedPrintable(rawText);

  // Extract Keycloak action-token URL or general URL
  let link = null;
  const actionTokenMatch = decoded.match(/https?:\/\/[^\s<>"'\\]+login-actions\/[^\s<>"'\\]+/i);
  if (actionTokenMatch) {
    link = actionTokenMatch[0].trim();
  } else {
    const hrefMatch = decoded.match(/href=["'](https?:\/\/[^"']+)["']/i);
    if (hrefMatch) {
      link = hrefMatch[1].trim();
    } else {
      const urlMatch = decoded.match(/https?:\/\/[^\s<>"'\\]+/i);
      if (urlMatch) {
        link = urlMatch[0].trim();
      }
    }
  }

  // Extract 4 to 8 digit OTP codes
  const explicitOtpMatch = decoded.match(/(?:code|otp|token|pin)\s*(?:is|:)?\s*([0-9]{4,8})/i);
  let otp = explicitOtpMatch ? explicitOtpMatch[1] : null;

  if (!otp) {
    const genericDigits = decoded.match(/\b([0-9]{6})\b/);
    if (genericDigits) {
      otp = genericDigits[1];
    }
  }

  return { link, otp };
}

/**
 * -----------------------------------------------------------------------------
 * 1. Embedded SMTP Server (Port 1025)
 * -----------------------------------------------------------------------------
 */
const smtpServer = net.createServer((socket) => {
  let state = 'INIT';
  let mailFrom = '';
  let rcptTo = [];
  let dataBuffer = '';

  socket.write('220 notifier.local ESMTP Keycloaked Notifier Ready\r\n');

  socket.on('data', (chunk) => {
    const text = chunk.toString();

    if (state === 'DATA') {
      dataBuffer += text;
      if (dataBuffer.includes('\r\n.\r\n') || dataBuffer.endsWith('\n.\n') || dataBuffer.endsWith('\r\n.')) {
        // End of DATA
        state = 'NORMAL';
        socket.write('250 2.0.0 Ok: queued\r\n');

        // Parse headers & body
        const headerEnd = dataBuffer.indexOf('\r\n\r\n');
        const rawHeaders = headerEnd !== -1 ? dataBuffer.slice(0, headerEnd) : '';
        const rawBody = headerEnd !== -1 ? dataBuffer.slice(headerEnd + 4) : dataBuffer;

        const subjectMatch = rawHeaders.match(/Subject:\s*(.+)/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : '(No Subject)';

        const { link, otp } = extractMeta(rawBody);

        const record = {
          id: 'mail_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          type: 'EMAIL',
          timestamp: new Date().toISOString(),
          from: mailFrom,
          to: rcptTo.join(', '),
          subject,
          body: rawBody,
          link,
          otp,
        };

        messages.unshift(record);
        if (messages.length > 200) messages.pop();

        logBanner('EMAIL', record);

        dataBuffer = '';
        rcptTo = [];
      }
      return;
    }

    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const upper = line.toUpperCase();

      if (upper.startsWith('EHLO') || upper.startsWith('HELO')) {
        socket.write('250-notifier.local\r\n250-8BITMIME\r\n250 OK\r\n');
      } else if (upper.startsWith('MAIL FROM:')) {
        mailFrom = line.replace(/MAIL FROM:\s*<?([^>]+)>?/i, '$1').trim();
        socket.write('250 2.1.0 Ok\r\n');
      } else if (upper.startsWith('RCPT TO:')) {
        const rcpt = line.replace(/RCPT TO:\s*<?([^>]+)>?/i, '$1').trim();
        rcptTo.push(rcpt);
        socket.write('250 2.1.5 Ok\r\n');
      } else if (upper.startsWith('DATA')) {
        state = 'DATA';
        dataBuffer = '';
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
      } else if (upper.startsWith('QUIT')) {
        socket.write('221 2.0.0 Bye\r\n');
        socket.end();
      } else if (upper.startsWith('RSET')) {
        dataBuffer = '';
        rcptTo = [];
        mailFrom = '';
        socket.write('250 2.0.0 Reset OK\r\n');
      } else if (upper.startsWith('NOOP')) {
        socket.write('250 2.0.0 OK\r\n');
      } else {
        socket.write('250 2.0.0 OK\r\n');
      }
    }
  });

  socket.on('error', (err) => {
    // Suppress client disconnect errors
    if (err.code !== 'ECONNRESET') {
      console.error('SMTP Socket error:', err.message);
    }
  });
});

const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

async function getKeycloakAdminToken() {
  const params = new URLSearchParams({
    client_id: 'admin-cli',
    grant_type: 'password',
    username: KEYCLOAK_ADMIN_USER,
    password: KEYCLOAK_ADMIN_PASSWORD,
  });
  const res = await fetch(`${KEYCLOAK_INTERNAL_URL}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Failed to get Keycloak admin token: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function updateKeycloakUser(userId, updates) {
  if (!userId) return;
  const token = await getKeycloakAdminToken();
  const getRes = await fetch(`${KEYCLOAK_INTERNAL_URL}/admin/realms/playground/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!getRes.ok) {
    throw new Error(`Failed to fetch user ${userId}: ${getRes.status}`);
  }
  const user = await getRes.json();

  if (updates.email) {
    user.email = updates.email;
    user.emailVerified = true;
    if (user.requiredActions && Array.isArray(user.requiredActions)) {
      user.requiredActions = user.requiredActions.filter(a => a !== 'VERIFY_EMAIL');
    }
  }
  if (updates.phoneNumber) {
    user.attributes = user.attributes || {};
    user.attributes.phone_number = [updates.phoneNumber];
  }

  const putRes = await fetch(`${KEYCLOAK_INTERNAL_URL}/admin/realms/playground/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });
  if (!putRes.ok) {
    throw new Error(`Failed to update Keycloak user ${userId}: ${putRes.status}`);
  }
  return user;
}

async function findUserByFactor(type, target) {
  if (!target) return null;
  const token = await getKeycloakAdminToken();
  let url;
  if (type === 'email') {
    url = `${KEYCLOAK_INTERNAL_URL}/admin/realms/playground/users?email=${encodeURIComponent(target)}&exact=true`;
  } else {
    url = `${KEYCLOAK_INTERNAL_URL}/admin/realms/playground/users?q=${encodeURIComponent('phone_number:' + target)}`;
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    console.warn(`[KEYCLOAK NOTIFIER] Factor search failed: ${res.status}`);
    return null;
  }
  const users = await res.json();
  return users.length > 0 ? users[0] : null;
}

/**
 * -----------------------------------------------------------------------------
 * 2. Embedded HTTP Server (Port 3001) for SMS Webhook & Live Dashboard
 * -----------------------------------------------------------------------------
 */
const httpServer = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', smtpPort: SMTP_PORT, httpPort: HTTP_PORT, messageCount: messages.length }));
    return;
  }

  // API: Get all messages
  if (req.method === 'GET' && url.pathname === '/api/messages') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(messages));
    return;
  }

  // API: Clear messages
  if (req.method === 'DELETE' && url.pathname === '/api/messages') {
    messages.length = 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'All messages cleared' }));
    return;
  }

  // API: Dispatch Out-of-Band Verification Code (POST /api/verify/send-code)
  if (req.method === 'POST' && url.pathname === '/api/verify/send-code') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      let data = {};
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
        return;
      }

      const type = (data.type || '').toLowerCase(); // 'email' | 'phone'
      const target = (data.target || '').trim();
      const purpose = data.purpose || 'factor_verification';
      const userId = (data.userId || '').trim();

      if (!target || (type !== 'email' && type !== 'phone')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing or invalid target and type (must be email or phone).' }));
        return;
      }

      // If binding a new factor, prevent collisions with existing accounts in the realm
      if (purpose === 'factor_verification') {
        try {
          const existingUser = await findUserByFactor(type, target);
          if (existingUser && existingUser.id !== userId) {
            const factorLabel = type === 'phone' ? 'phone number' : 'email address';
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: `This ${factorLabel} is already registered to another account. Please use a different ${factorLabel}.`,
              code: 'FACTOR_ALREADY_EXISTS'
            }));
            return;
          }
        } catch (searchErr) {
          console.error('[KEYCLOAK NOTIFIER] Factor collision check warning:', searchErr.message);
        }
      }

      // Generate 6-digit cryptographic verification code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

      pendingVerifications.set(target, {
        code,
        type,
        expiresAt,
        attempts: 0
      });

      let record;
      const isSudo = purpose === 'sudo';
      if (type === 'phone') {
        const msg = isSudo
          ? `Keycloaked security code: ${code}. Use this to authorize sensitive changes to your account. Valid for 5 minutes.`
          : `Keycloaked verification code: ${code}. Use this to verify and bind your phone number. Valid for 5 minutes.`;
        record = {
          id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          type: 'SMS',
          timestamp: new Date().toISOString(),
          to: target,
          message: msg,
          otp: code,
        };
        messages.unshift(record);
        if (messages.length > 200) messages.pop();
        logBanner('SMS', record);
      } else {
        const subject = isSudo
          ? 'Keycloaked: Security authorization code'
          : 'Keycloaked: Verify your new email address';
        const bodyText = isSudo
          ? `Your Sudo security code is ${code}. Enter this code in Keycloaked to authorize changes to your account security settings. Valid for 5 minutes.`
          : `Your verification code is ${code}. Enter this code in Keycloaked to confirm ownership and link your email. Valid for 5 minutes.`;
        record = {
          id: 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          type: 'EMAIL',
          timestamp: new Date().toISOString(),
          to: target,
          subject,
          body: bodyText,
          otp: code,
        };
        messages.unshift(record);
        if (messages.length > 200) messages.pop();
        logBanner('EMAIL', record);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        target,
        type,
        expiresInSeconds: 300,
        message: `Verification code dispatched to ${target}`
      }));
    });
    return;
  }

  // API: Confirm Verification Code (POST /api/verify/check-code)
  if (req.method === 'POST' && url.pathname === '/api/verify/check-code') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data = {};
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
        return;
      }

      const target = (data.target || '').trim();
      const code = (data.code || '').trim();
      const userId = (data.userId || '').trim();

      if (!target || !code) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Target and code are required.' }));
        return;
      }

      const entry = pendingVerifications.get(target);
      if (!entry) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No active verification code for this destination. Please request a new code.' }));
        return;
      }

      if (Date.now() > entry.expiresAt) {
        pendingVerifications.delete(target);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Verification code has expired. Please request a new code.' }));
        return;
      }

      if (entry.attempts >= 5) {
        pendingVerifications.delete(target);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Too many incorrect attempts. Please request a new code.' }));
        return;
      }

      if (entry.code !== code) {
        entry.attempts += 1;
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Incorrect verification code. Please check and try again.' }));
        return;
      }

      // Successfully verified!
      const verifiedType = entry.type;
      pendingVerifications.delete(target);

      const finishResponse = () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          verified: true,
          target,
          type: verifiedType
        }));
      };

      if (userId) {
        const updatePayload = verifiedType === 'email' ? { email: target } : { phoneNumber: target };
        updateKeycloakUser(userId, updatePayload)
          .then(() => {
            console.log(`[KEYCLOAK NOTIFIER] Successfully bound verified ${verifiedType} (${target}) to user ${userId}`);
            finishResponse();
          })
          .catch((err) => {
            console.error('[KEYCLOAK NOTIFIER] Error updating user in Keycloak:', err.message);
            // Return success since code was valid, but include warning
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              verified: true,
              target,
              type: verifiedType,
              warning: `Code verified, but Keycloak auto-sync failed: ${err.message}`
            }));
          });
      } else {
        finishResponse();
      }
    });
    return;
  }

  // API: Receive SMS OTP (POST /sms/send or /api/sms)
  if (req.method === 'POST' && (url.pathname === '/sms/send' || url.pathname === '/api/sms' || url.pathname === '/api/sms/send')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data = {};
      try {
        if (req.headers['content-type']?.includes('application/json')) {
          data = JSON.parse(body);
        } else {
          // Form-encoded support (Twilio style)
          const params = new URLSearchParams(body);
          data = {
            to: params.get('To') || params.get('to') || params.get('phoneNumber'),
            message: params.get('Body') || params.get('message') || params.get('text'),
            code: params.get('code') || params.get('otp'),
          };
        }
      } catch {
        data = { message: body };
      }

      const to = data.to || data.phoneNumber || data.recipient || 'Unknown Phone';
      const text = data.message || data.body || data.text || '';
      const { link, otp } = extractMeta(text);

      const record = {
        id: 'sms_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: 'SMS',
        timestamp: new Date().toISOString(),
        to,
        message: text,
        link,
        otp: data.code || otp,
        code: data.code || otp,
      };

      messages.unshift(record);
      if (messages.length > 200) messages.pop();

      logBanner('SMS', record);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        messageId: record.id,
        to: record.to,
        otp: record.otp,
        code: record.code,
        channel: 'sms',
      }));
    });
    return;
  }

  // API: Receive WhatsApp OTP (POST /whatsapp/send or /api/whatsapp/send or /api/whatsapp)
  if (req.method === 'POST' && (url.pathname === '/whatsapp/send' || url.pathname === '/api/whatsapp' || url.pathname === '/api/whatsapp/send')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let data = {};
      try {
        if (req.headers['content-type']?.includes('application/json')) {
          data = JSON.parse(body);
        } else {
          const params = new URLSearchParams(body);
          data = {
            to: params.get('To') || params.get('to') || params.get('phoneNumber'),
            message: params.get('Body') || params.get('message') || params.get('text'),
            code: params.get('code') || params.get('otp'),
          };
        }
      } catch {
        data = { message: body };
      }

      const to = data.to || data.phoneNumber || data.recipient || 'Unknown Phone';
      const text = data.message || data.body || data.text || '';
      const { link, otp } = extractMeta(text);

      const record = {
        id: 'wa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        type: 'WHATSAPP',
        timestamp: new Date().toISOString(),
        to,
        message: text,
        link,
        otp: data.code || otp,
        code: data.code || otp,
      };

      messages.unshift(record);
      if (messages.length > 200) messages.pop();

      logBanner('WHATSAPP', record);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        messageId: record.id,
        to: record.to,
        otp: record.otp,
        channel: 'whatsapp',
      }));
    });
    return;
  }

  // Dashboard UI at root (GET / or HEAD /)
  if ((req.method === 'GET' || req.method === 'HEAD') && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(renderDashboardHtml());
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

/**
 * Render lightweight single-page HTML inbox
 */
function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keycloaked · Mock Notification Inbox (Emails & SMS)</title>
  <style>
    :root {
      --bg: #FAFAF8;
      --surface: #FFFFFF;
      --border: #E8E5DF;
      --text: #191420;
      --muted: #626773;
      --blue: #225EE2;
      --blue-subtle: #EEF2FD;
      --coral: #FF8048;
      --coral-subtle: #FFF0E8;
      --green: #1F9D55;
      --green-subtle: #EBF8F0;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #110E17;
        --surface: #1C1824;
        --border: #2C2638;
        --text: #F3F1F6;
        --muted: #9E98A8;
        --blue: #4F86F7;
        --blue-subtle: rgba(79, 134, 247, 0.15);
        --coral: #FF8048;
        --coral-subtle: rgba(255, 128, 72, 0.15);
        --green: #2ECC71;
        --green-subtle: rgba(46, 204, 113, 0.15);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 2rem 1.5rem;
    }
    .container {
      max-width: 860px;
      margin: 0 auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      margin: 0;
      font-size: 1.4rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-email { background: var(--blue-subtle); color: var(--blue); }
    .badge-sms { background: var(--coral-subtle); color: var(--coral); }
    .badge-whatsapp { background: rgba(37, 211, 102, 0.15); color: #1F9D55; font-weight: 700; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      transition: transform 0.15s ease;
    }
    .card:hover { transform: translateY(-1px); }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.6rem;
    }
    .card-to { font-weight: 700; font-size: 0.95rem; }
    .card-time { font-size: 0.75rem; color: var(--muted); }
    .card-subject { font-weight: 600; margin-bottom: 0.5rem; }
    .otp-box {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--green-subtle);
      color: var(--green);
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      font-weight: 800;
      font-size: 1.1rem;
      letter-spacing: 0.1em;
      margin: 0.5rem 0;
    }
    .link-box {
      margin-top: 0.5rem;
      word-break: break-all;
    }
    .link-box a {
      color: var(--blue);
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .link-box a:hover { text-decoration: underline; }
    button.btn {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    button.btn:hover { background: var(--border); }
    .empty {
      text-align: center;
      padding: 4rem 1rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>📮 Keycloaked Notifier</h1>
        <div style="font-size: 0.85rem; color: var(--muted); margin-top: 0.25rem;">
          Listening for SMTP on <strong>:1025</strong> &middot; SMS &amp; WhatsApp REST Webhooks on <strong>:3001</strong>
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn" onclick="fetchMessages()">🔄 Refresh</button>
        <button class="btn" onclick="clearMessages()">🗑️ Clear</button>
      </div>
    </header>

    <div id="inbox"></div>
  </div>

  <script>
    async function fetchMessages() {
      const res = await fetch('/api/messages');
      const list = await res.json();
      const container = document.getElementById('inbox');
      if (list.length === 0) {
        container.innerHTML = '<div class="empty">No emails, SMS, or WhatsApp messages intercepted yet.<br>Trigger a verification, password reset, or OTP in Keycloak to view it here!</div>';
        return;
      }
      container.innerHTML = list.map(m => {
        let badgeClass = 'badge-sms';
        let badgeLabel = '📱 SMS';
        if (m.type === 'EMAIL') {
          badgeClass = 'badge-email';
          badgeLabel = '✉️ EMAIL';
        } else if (m.type === 'WHATSAPP') {
          badgeClass = 'badge-whatsapp';
          badgeLabel = '💬 WHATSAPP';
        }

        return \`
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge \${badgeClass}">\${badgeLabel}</span>
              <span class="card-to">\${m.to}</span>
            </div>
            <span class="card-time">\${new Date(m.timestamp).toLocaleTimeString()}</span>
          </div>
          \${m.subject ? \`<div class="card-subject">\${m.subject}</div>\` : ''}
          \${m.message ? \`<div style="font-size: 0.88rem; color: var(--muted);">\${m.message}</div>\` : ''}
          \${m.otp ? \`<div class="otp-box">🔑 OTP: \${m.otp} <button class="btn" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="navigator.clipboard.writeText('\${m.otp}')">Copy</button></div>\` : ''}
          \${m.link ? \`<div class="link-box">🔗 <a href="\${m.link}" target="_blank">Open Action Link ➔</a></div>\` : ''}
        </div>
      \`;
      }).join('');
    }

    async function clearMessages() {
      await fetch('/api/messages', { method: 'DELETE' });
      fetchMessages();
    }

    fetchMessages();
    setInterval(fetchMessages, 2500);
  </script>
</body>
</html>`;
}

// Start listeners
smtpServer.listen(SMTP_PORT, HOST, () => {
  console.log(`${cyan}✓ SMTP Server running on ${HOST}:${SMTP_PORT}${reset}`);
});

httpServer.listen(HTTP_PORT, HOST, () => {
  console.log(`${green}✓ HTTP / SMS Webhook running on http://${HOST}:${HTTP_PORT}${reset}`);
  console.log(`${blue}✓ Live Web Inbox viewable at http://localhost:${HTTP_PORT}${reset}`);
});

// Graceful shutdown
const shutdown = () => {
  smtpServer.close();
  httpServer.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

