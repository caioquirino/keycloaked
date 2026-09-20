# Keycloaked Notifier (Dummy Standalone Notification Backend)

A zero-dependency standalone developer utility service that intercepts and captures all outbound verification emails and SMS OTPs triggered during Keycloak authentication flows (login, registration, reset password, email verification, etc.).

## Features

1. **RFC 5321 SMTP Server (`:1025`)**:
   - Acts as a local mail drop for Keycloak's JavaMailSender.
   - Automatically parses incoming MIME emails, subjects, recipients, and bodies.
   - Intelligently extracts action tokens and verification URLs (`login-actions/action-token?...`) and 4–8 digit OTP codes.

2. **HTTP SMS Webhook (`:3001`)**:
   - Receives SMS dispatch requests via `POST /sms/send` or `POST /api/sms`.
   - Supports both JSON (`{ "to": "+...", "message": "...", "code": "..." }`) and form urlencoded payloads.

3. **High-Visibility Terminal `stdout` Output**:
   - Prints clear ANSI-styled colored box banners directly to the terminal stdout as soon as any notification arrives.
   - Highlights the recipient, OTP code, and clickable action link so developers never have to dig through raw logs.

4. **Web Inbox Dashboard (`http://localhost:3001`)**:
   - Minimalist, real-time web dashboard designed in Keycloaked styling.
   - Live polls incoming messages every 2.5 seconds.
   - 1-click "Copy OTP" and "Open Action Link" buttons.
   - "Clear All" button to empty the in-memory inbox during test sessions.

5. **REST API**:
   - `GET /api/messages`: Returns JSON array of recent notifications (max 200).
   - `DELETE /api/messages`: Clears message history.

---

## How It Integrates with Keycloak

In Docker Compose (`docker-compose.yml`), the `notifier` container runs alongside Keycloak on the internal Docker network.

Terraform (`terraform/realm_playground.tf`) automatically configures Keycloak's SMTP settings:
```hcl
smtp_server {
  host              = "notifier"
  port              = "1025"
  from              = "no-reply@keycloaked.local"
  from_display_name = "Keycloaked Accounts"
  ssl               = false
  starttls          = false
}
```

---

## Commands

```bash
# View live stdout logs from the notifier container
make notifier-logs

# Or run directly on host with Node
make notifier-dev
```

## Sending a Test SMS via curl

```bash
curl -X POST http://localhost:3001/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+31600000000",
    "message": "Your Keycloaked verification code is 123456.",
    "code": "123456"
  }'
```
