# Industry Authentication Benchmark & Comparative Architecture Analysis

> **Evaluating Keycloaked against Consumer & Enterprise Identity Leaders**  
> Technical breakdown focusing **strictly on the Sign-In / Sign-Up / OAuth2 / OIDC mobile and web authentication frontends** across Uber (USL), Google Identity, GitHub, Shopify (Shop Pay), WhatsApp/Meta, Apple ID, and Airbnb.

---

## Table of Contents

- [Scope & Definitions: The Auth Frontend Layer](#scope--definitions-the-auth-frontend-layer)
- [Executive Summary & Competitive Matrix](#executive-summary--competitive-matrix)
- [Platform-by-Platform Sign-In/Sign-Up Frontend Architecture](#platform-by-platform-sign-insign-up-frontend-architecture)
  - [1. Uber (Unified Signup and Login — USL)](#1-uber-unified-signup-and-login--usl)
  - [2. Google Identity](#2-google-identity)
  - [3. GitHub Mobile & Web OAuth](#3-github-mobile--web-oauth)
  - [4. Shopify (Shop Pay & Customer Account API)](#4-shopify-shop-pay--customer-account-api)
  - [5. WhatsApp & Meta](#5-whatsapp--meta)
  - [6. Apple ID](#6-apple-id)
  - [7. Airbnb (Flexible Authentication)](#7-airbnb-flexible-authentication)
  - [8. Keycloaked (This Repository)](#8-keycloaked-this-repository)
- [The Four Auth Frontend Paradigms: Trade-Off Analysis](#the-four-auth-frontend-paradigms-trade-off-analysis)
  - [1. Server-Rendered Web SPA on WebView / TWA (Uber Model)](#1-server-rendered-web-spa-on-webview--twa-uber-model)
  - [2. System Browser Session / RFC 8252 AppAuth (GitHub / Keycloaked Model)](#2-system-browser-session--rfc-8252-appauth-github--keycloaked-model)
  - [3. Native Server-Driven UI (Airbnb Model)](#3-native-server-driven-ui-airbnb-model)
  - [4. OS-Level Daemon / Out-of-Process (Apple ID / Google Credential Manager)](#4-os-level-daemon--out-of-process-apple-id--google-credential-manager)
- [Detailed Feature Dimension Benchmark](#detailed-feature-dimension-benchmark)
  - [1. Unified Identifier-First Entry (USL)](#1-unified-identifier-first-entry-usl)
  - [2. Multi-Channel OTP & Fallback Routing](#2-multi-channel-otp--fallback-routing)
  - [3. Zero Usernames & UUID Identity](#3-zero-usernames--uuid-identity)
  - [4. In-App Sudo Mode (Step-Up Re-Authentication)](#4-in-app-sudo-mode-step-up-re-authentication)
- [Gap Analysis: Where Keycloaked Leads vs. Opportunities for Improvement](#gap-analysis-where-keycloaked-leads-vs-opportunities-for-improvement)
- [Architectural Judgment: How Our Flow Should Be](#architectural-judgment-how-our-flow-should-be)
- [Conclusion & Actionable Roadmap](#conclusion--actionable-roadmap)

---

## Scope & Definitions: The Auth Frontend Layer

> [!IMPORTANT]
> **Strict Scope Notice**: This benchmark evaluates **only the Sign-In, Sign-Up, and OAuth2/OIDC execution frontends**. It does *not* evaluate the general mobile application architecture (which may use different technologies for maps, feeds, or checkout). Where internal implementation details of an identity provider are not publicly disclosed by engineering teams or whitepapers, it is explicitly marked as **Unknown / Proprietary**.

### Terminology
- **Embedded WebView**: In-app `WKWebView` (iOS) or `android.webkit.WebView` running inside the application's process.
- **Trusted Web Activity (TWA) / Custom Tabs**: Chrome-backed browser instances hosted within an Android app that share the system browser state without URL bar chrome.
- **System Browser Session (RFC 8252)**: Secure, ephemeral browser sheets (`ASWebAuthenticationSession` on iOS, Chrome Custom Tabs on Android) mandated by OAuth 2.0 specifications.
- **Native Server-Driven UI (SDUI)**: Backend returns layout/state JSON schemas; the client renders pure native UI widgets (SwiftUI/Compose).
- **OS-Level Daemon**: Dialogs rendered completely out-of-process by the operating system kernel/security daemons (`authd`, Google Play Services).

---

## Executive Summary & Competitive Matrix

| Dimension / Feature | **Keycloaked** | **Uber (USL)** | **Google Identity** | **GitHub** | **Shopify (Shop Pay)** | **WhatsApp / Meta** | **Apple ID** | **Airbnb** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Auth FE Implementation** | **System Browser (AppAuth) or Direct Grant** | **Server-Rendered Web SPA on WebView/TWA** | **Native OS Daemon (Android) / System Browser (iOS)** | **System Browser (ASWebAuth / CCT)** | **Hybrid Web Sheet (Checkout Kit) / Unknown Internal** | **100% Pure Native Platform UI** | **100% OS Daemon (`authd`)** | **100% Native UI via Server-Driven UI** |
| **Auth Rendering Technology** | React 18 (Keycloakify) + `@keycloaked/ui` | Node.js Server-Rendered SPA + WebViews/TWAs | Android Credential Manager / Web OAuth | Web HTML/Rails inside System Browser | Web Checkout Kit inside Native Sheet | Pure UIKit (iOS) / Jetpack Compose (Android) | Apple Private OS Frameworks | Swift / Kotlin Native UI Widgets |
| **Public Disclosure Status** | 100% Open Source | Verified via Uber Eng Blog | Verified via Android & Google Docs | Verified via GitHub Eng Docs | Partially Disclosed (Checkout Kit public) | Verified via Client Decompilation | Verified via Apple Developer Specs | Verified via Airbnb Eng Blog |
| **Unified Identifier-First (USL)** | ✅ Full | ✅ Full (Pioneer) | ✅ Full | ⚠️ Separate screens | ✅ Full | ✅ Full (Phone-only) | ⚠️ Separate modal | ✅ Full |
| **Zero Usernames (UUID Identity)** | ✅ Auto UUID | ✅ Internal UUID | ❌ User-facing | ❌ User-facing | ✅ Internal ID | ✅ Phone number | ✅ Apple ID / Email | ✅ Internal ID |
| **Multi-Channel OTP Routing** | ✅ SMS, WA, Email | ✅ SMS, WA, Email | ❌ SMS, Voice | ❌ SMS, TOTP | ❌ SMS, Email | ❌ SMS, WA | ❌ SMS, Push | ⚠️ SMS, WA (Select regions) |
| **Live Factor / Channel Switch** | ✅ In-session switch | ✅ In-session switch | ⚠️ "Try another way" | ⚠️ Fallback modal | ⚠️ Email fallback | ❌ Rigid retry | ⚠️ Device / SMS | ⚠️ Fallback modal |
| **Passkeys / WebAuthn** | ✅ Full + Cond. UI | ✅ Native & WebAuthn | ✅ Default Factor | ✅ Autofill + Security | ⚠️ Biometric in app | ✅ Passkeys in app | ✅ Platform Default | ⚠️ Native Biometrics |
| **In-App Sudo Mode (Step-Up)** | ✅ Dedicated Direct Grant | ⚠️ Card edit re-auth | ✅ Critical Action Check | ✅ 2-hr Sudo Window | ❌ Direct checkout | ❌ Biometric lock only | ✅ Device Passcode | ⚠️ High-trust booking check |
| **Single-Use Replay & Cooldown** | ✅ Session burn + 30s | ✅ Strict cooldown | ✅ Dynamic backoff | ✅ Cooldown | ✅ 60s cooldown | ✅ Progressive backoff | ✅ Rate limited | ✅ Rate limited |
| **Shared Design System with IdP** | ✅ `@keycloaked/ui` (1:1) | ✅ Base Web Design | ⚠️ Material 3 | ⚠️ Primer | ⚠️ Polaris | ❌ Native only | ❌ Human Interface | ⚠️ DLS (Design Lang Sys) |

---

## Platform-by-Platform Sign-In/Sign-Up Frontend Architecture

### 1. Uber (Unified Signup and Login — USL)
- **Strict Auth Flow Implementation**: **Server-Rendered Single-Page Application (SPA) loaded over mobile WebViews / Trusted Web Activities (TWA)**.
- **Architectural Reality**:
  - While Uber’s primary mobile applications (Rider, Driver, Eats) are famously built using pure native RIBs (Swift/Kotlin), Uber **deliberately unified the authentication flow on top of a web-based architecture**.
  - On Android, the login/signup flow is launched using **Trusted Web Activities (TWAs)** (which build upon Chrome Custom Tabs). On iOS, it runs inside a customized web container.
  - A backend **Node.js server** renders and serves dynamic HTML, CSS, and JavaScript to the client. When user interactions occur, the web client submits state transitions to backend microservices, which return the next screen (e.g. OTP verification, WhatsApp fallback, or password).
  - Native bridging is retained only for device-level integrations, such as the Android SMS Retriever API for auto-reading verification codes.
- **Why Uber Used WebViews for USL**:
  1. *Rapid Global Deployments*: Bypasses App Store and Google Play binary review cycles to roll out security fixes, regulatory compliance, or country-specific auth channels (like WhatsApp in India/Brazil) instantly.
  2. *Single Source of Truth*: A single web codebase serves dozens of Uber apps (Uber, Uber Eats, Uber Driver, Freight) and mobile web browsers without diverging.

---

### 2. Google Identity
- **Strict Auth Flow Implementation**: **100% Native OS-Level Daemon (Android) & System Browser Sheet (iOS)**.
- **Architectural Reality**:
  - **On Android**: Google Sign-In and Passkey verification are rendered out-of-process by **Google Play Services** and the **Android Credential Manager** (`androidx.credentials`). The calling application has zero visibility into the input fields; Google renders a native system bottom sheet that handles biometrics and credentials directly.
  - **On iOS**: When authenticating with a Google Account, Google uses `ASWebAuthenticationSession` (via the `GoogleSignIn-iOS` SDK), loading Google’s web-based accounts page (`accounts.google.com`).
  - **Anti-WebView Enforcement**: Google **strictly forbids embedded WebViews** (`WKWebView` or Android `WebView`) for OAuth. Google's identity servers detect embedded web views and throw a `403 disallowed_useragent` fatal error to prevent credential harvesting.

---

### 3. GitHub Mobile & Web OAuth
- **Strict Auth Flow Implementation**: **System Browser Session (`ASWebAuthenticationSession` / Chrome Custom Tabs)**.
- **Architectural Reality**:
  - Even within the official **GitHub Mobile** native app (built with Swift and Kotlin), the sign-in flow is **not** a custom native form.
  - When you tap "Sign In" in GitHub Mobile, the app opens an `ASWebAuthenticationSession` (iOS) or a Chrome Custom Tab (Android) pointing to `github.com/login`.
  - **Why System Browsers instead of Native Forms**:
    1. *Cookie & Session Sharing*: Automatically detects if the user is already logged into GitHub on Safari or Chrome, enabling 1-tap Single Sign-On (SSO).
    2. *WebAuthn & Passkey Support*: Directly leverages the browser’s native FIDO2/WebAuthn engine and hardware security key support (YubiKey over NFC/Lightning) without needing native SDK wrappers.
    3. *RFC 8252 Compliance*: Complies with modern IETF standards for native app authentication.

---

### 4. Shopify (Shop Pay & Customer Account API)
- **Strict Auth Flow Implementation**: **Hybrid Web Sheet (Checkout Sheet Kit) / Unknown Internal Implementation for Consumer App**.
- **Architectural Reality**:
  - For merchant mobile applications: Shopify provides the **Shopify Checkout Sheet Kit** (Swift, Kotlin, React Native). This kit presents a native sheet that hosts an optimized, secure web view loading Shopify's web checkout and Shop Pay authentication, authenticated via the Customer Account API (OAuth 2.0 with PKCE).
  - Inside the standalone **Shop consumer app**: The app is built with React Native. The exact internal sign-in/up pipeline is a hybrid combining React Native biometric bridges (`LocalAuthentication` / `BiometricPrompt`) with web-based payment vault handoffs. *Detailed low-level internals of the standalone Shop App sign-in screen are proprietary to Shopify.*

---

### 5. WhatsApp & Meta
- **Strict Auth Flow Implementation**: **100% Pure Native Platform UI (Zero WebViews)**.
- **Architectural Reality**:
  - WhatsApp's onboarding and authentication flow (Phone number entry, SMS carrier verification, 6-digit verification code input, Two-Step Verification PIN, and Passkey registration) is **100% native platform UI** (UIKit/Swift on iOS, Android Views/Jetpack Compose on Android).
  - WhatsApp uses **no WebViews, no React Native, and no browser sheets** anywhere in its registration or authentication lifecycle.
  - The client communicates directly with WhatsApp servers over raw TCP/Noise protocol connections.
  - Passkeys are triggered via direct native calls to the Android `CredentialManager` API and iOS `AuthenticationServices`.

---

### 6. Apple ID
- **Strict Auth Flow Implementation**: **100% Native OS Daemon (`authd`)**.
- **Architectural Reality**:
  - Apple ID authentication is completely native to iOS, iPadOS, and macOS.
  - When third-party apps invoke "Sign in with Apple", they call `AuthenticationServices.framework` (`ASAuthorizationController`).
  - The UI (Face ID/Touch ID modal, password prompt, "Hide My Email" picker) is rendered out-of-process by the operating system daemon (`authd` and SpringBoard). The host application cannot inspect the view hierarchy, capture keystrokes, or intercept credentials.

---

### 7. Airbnb (Flexible Authentication)
- **Strict Auth Flow Implementation**: **100% Pure Native UI driven by Server-Driven UI (SDUI)**.
- **Architectural Reality**:
  - While Airbnb famously abandoned React Native in 2018 in favor of pure native codebases (Swift on iOS, Kotlin on Android), they did **not** adopt WebViews for their login flow.
  - Instead, Airbnb built **"Flexible Authentication"**: an **Identify-then-Challenge** architecture driven by a centralized server-side policy engine.
  - The backend server evaluates user context (phone, email, device reputation, country risk) and returns a declarative JSON schema specifying the required challenge (e.g. WhatsApp OTP in Brazil, SMS in the US, password fallback).
  - The mobile client parses this JSON schema and renders **100% native iOS and Android widgets** (buttons, text inputs, phone formatters). This combines server-side agility with native rendering performance.

---

### 8. Keycloaked (This Repository)
- **Strict Auth Flow Implementation**: **Keycloakify React 18 Web Theme served in System Browser (RFC 8252) OR Headless Native REST API**.
- **Architectural Reality**:
  - **Web & Desktop**: Uses Keycloakify to compile React 18 components into Keycloak 26 FreeMarker templates, perfectly styled using `@keycloaked/ui` design tokens.
  - **Mobile Client Integration**:
    - *Default Paradigm (System Browser via AppAuth)*: Aligns directly with **GitHub** and **Google on iOS**. Mobile apps launch `ASWebAuthenticationSession` or Chrome Custom Tabs using `AppAuth-iOS`/`AppAuth-Android` or `react-native-app-auth`. It gives teams instant zero-recompile IdP updates, WebAuthn Conditional UI autofill, and shared Safari/Chrome sessions.
    - *Headless Native Paradigm (Direct Grant)*: For teams wanting an **Airbnb-style pure native UI** or **WhatsApp-style zero-webview experience**, Keycloaked's custom SPIs and dedicated Direct Grant flows (`flow_sudo_direct_grant.tf`) can be consumed directly via REST by native Swift, Kotlin, or React Native screens.

---

## The Four Auth Frontend Paradigms: Trade-Off Analysis

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ 1. Server-Rendered Web SPA on WebView / TWA (Uber USL)                        │
│    Fastest deployment iteration; single web codebase; no app store delays;   │
│    can feel slightly less responsive than pure native on low-end devices.    │
├───────────────────────────────────────────────────────────────────────────────┤
│ 2. System Browser Session / RFC 8252 AppAuth (GitHub, Keycloaked Default)     │
│    Mandated for secure OAuth; shares OS browser cookies and passkeys;         │
│    immune to host-app tampering; displays a brief system browser sheet.      │
├───────────────────────────────────────────────────────────────────────────────┤
│ 3. Native Server-Driven UI (Airbnb Flexible Auth)                             │
│    100% native UI rendering with server-controlled flow logic; requires       │
│    building custom JSON-to-Native UI parsers in both Swift and Kotlin.       │
├───────────────────────────────────────────────────────────────────────────────┤
│ 4. OS-Level System Daemon (Apple ID, Google Play Services)                    │
│    Unmatched security and zero-click biometrics; strictly restricted to OS   │
│    owners (Apple, Google); unavailable for custom third-party auth stacks.    │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Detailed Trade-Off Comparison

| Paradigm | Exemplar | Latency | Passkey Support | Security Model | Update Velocity |
|---|---|:---:|:---:|:---:|:---:|
| **Server Web on WebView/TWA** | Uber USL | ~200–500ms | ⚠️ Requires TWA / bridge | App-isolated storage | Instant (Server deploy) |
| **System Browser (AppAuth)** | GitHub, Keycloaked | ~150–350ms | ✅ Native Browser WebAuthn | Sandboxed from host app | Instant (Server deploy) |
| **Native Server-Driven UI** | Airbnb | ~10–30ms | ✅ Native OS APIs | Host app process | Dynamic via JSON schema |
| **OS-Level System Daemon** | Apple ID, Google | Instant (~0ms) | ✅ Platform Authenticator | Hardware/Daemon isolated | OS updates only |

---

## Detailed Feature Dimension Benchmark

### 1. Unified Identifier-First Entry (USL)
- **Uber & Keycloaked**: Merge login and registration into a single input field. The user inputs their email or E.164 phone number, and the backend determines the next challenge.
- **GitHub**: Still presents distinct "Sign in" and "Create an account" pages.
- **WhatsApp**: Requires phone numbers exclusively; does not support email as an initial identifier.

### 2. Multi-Channel OTP & Fallback Routing
- **Uber & Keycloaked**: Lead the benchmark by supporting **live, in-session switching** between SMS, WhatsApp, and Email. If SMS delivery is delayed, users can click *"Send via WhatsApp instead"* without resetting their session.
- **Google & GitHub**: Emphasize TOTP authenticator apps and hardware security keys over carrier-dependent channels (WhatsApp).

### 3. Zero Usernames & UUID Identity
- **Keycloaked, Uber, Shopify, and Airbnb**: Abstract away user-facing usernames entirely. Users authenticate using real-world identifiers (phone/email), while backend systems bind state to immutable UUIDs (`preferred_username`).
- **Google & GitHub**: Require user-facing usernames/handles due to legacy namespaces and public profile conventions (`github.com/:username`).

### 4. In-App Sudo Mode (Step-Up Re-Authentication)
- **GitHub**: Pioneers the 2-hour Sudo Mode window for sensitive mutations (SSH keys, repository transfers, billing).
- **Keycloaked**: Replicates this pattern via a dedicated Keycloak direct grant flow (`flow_sudo_direct_grant.tf`) with a 15-minute elevated clearance token, allowing in-app modal verification without resetting the browser's primary SSO session.

---

## Gap Analysis: Where Keycloaked Leads vs. Opportunities for Improvement

### Where Keycloaked Leads the Pack
1. **Open-Source Enterprise Flexibility**: Replicates proprietary architectures (Uber's USL and WhatsApp OTP switching, GitHub's Sudo Mode) on a modern **Keycloak 26** foundation.
2. **True Design System Parity**: Keycloakify + `@keycloaked/ui` ensures pixel-for-pixel visual alignment between client SPAs and Keycloak login screens.
3. **Multi-Protocol Adaptability**: Can be deployed via standard RFC 8252 System Browsers (like GitHub) or headless Direct Grant APIs (like Airbnb/WhatsApp).

### High-Priority Improvement Opportunities
1. **Silent Network Authentication (Carrier SNA)**:
   - *Industry benchmark*: Uber silently verifies mobile device SIMs over cellular headers (GSMA Mobile Connect) in emerging markets.
   - *Keycloaked roadmap*: Add a carrier lookup SPI to authenticate mobile numbers without sending an SMS OTP.
2. **WebOTP Mobile Auto-Fill**:
   - *Industry benchmark*: Shopify and Uber auto-read incoming SMS verification codes.
   - *Keycloaked roadmap*: Add `navigator.credentials.get({ otp: { transport: ["sms"] } })` to the Keycloakify login-otp page.
3. **WhatsApp Interactive Button Templates**:
   - *Industry benchmark*: Uber and Meta utilize WhatsApp Cloud API templates with interactive "Copy Code" or 1-tap verification buttons.

---

## Architectural Judgment: How Our Flow Should Be

### Optimal Sequence:
1. **Identifier Entry + Conditional UI**: A single input field supporting Email or E.164 Phone numbers, augmented with `autocomplete="webauthn"`. Platform passkeys (Touch ID, Face ID, Windows Hello) trigger instantly before typing completes.
2. **Account Existence Check**: Constant-time lookup to prevent enumeration timing attacks.
3. **Factor Resolution**: Enforce strict priority hierarchy:
   - Passkey (Rank #1) -> TOTP (Rank #2) -> Preferred OTP Channel (Rank #3: WhatsApp / SMS / Email) -> Password Fallback (Rank #4).
4. **Live In-Place Channel Switching**: Retain active session context when switching between SMS and WhatsApp. Auto-revoke older codes and enforce a 30-second cooldown.
5. **Post-Auth Passkey Nudge**: Upon successful OTP login on WebAuthn-capable devices, present a 1-tap prompt: *"Sign in faster next time with Touch ID / Face ID"*.
6. **Zero-Trust Sudo Mode**: Protect factor promotion, phone updates, and email modifications with a 15-minute re-authentication clearance window.

---

## Conclusion & Actionable Roadmap

Keycloaked delivers an industry-grade identity experience that bridges Uber’s multi-channel consumer velocity with enterprise standards.

### Implementation Milestones:
- [ ] **Phase 1**: Implement Post-Auth Passkey Enrollment Nudge after SMS/WhatsApp OTP verification.
- [ ] **Phase 2**: Add WebOTP API (`navigator.credentials`) support in the Keycloakify theme for 1-tap mobile autofill.
- [ ] **Phase 3**: Add WhatsApp Cloud API template webhook handlers with interactive "Copy Code" buttons.
- [ ] **Phase 4**: Add AAGUID parser in `@keycloaked/ui` to display platform badges (Apple, Google, Windows Hello) on registered passkeys.
