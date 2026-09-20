# ------------------------------------------------------------------------------
# Uber-Style USL (Unified Signup & Login) Browser Authentication Flow
# Governed Declaratively by usl-workflow.yaml
# ------------------------------------------------------------------------------

locals {
  usl_workflow = yamldecode(file("${path.module}/../usl-workflow.yaml"))
}

# Top-level flow: usl-browser
resource "keycloak_authentication_flow" "usl_browser" {
  realm_id    = keycloak_realm.playground.id
  alias       = "usl-browser"
  description = "Uber-style Unified Login and Signup browser authentication flow"
}

# Step 1: Cookie (Check existing session)
resource "keycloak_authentication_execution" "cookie" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_flow.usl_browser.alias
  authenticator     = "auth-cookie"
  requirement       = "ALTERNATIVE"
  priority          = 10
}

# Step 2: IdP Redirector
resource "keycloak_authentication_execution" "idp_redirector" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_flow.usl_browser.alias
  authenticator     = "identity-provider-redirector"
  requirement       = "ALTERNATIVE"
  priority          = 20
  depends_on        = [keycloak_authentication_execution.cookie]
}

# Step 3: USL Forms Subflow (Identifier-First entry)
resource "keycloak_authentication_subflow" "usl_forms" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_flow.usl_browser.alias
  alias             = "usl-forms"
  requirement       = "ALTERNATIVE"
  priority          = 30
  depends_on        = [keycloak_authentication_execution.idp_redirector]
}

# 3a. Identifier-First: Prompt for username / email / phone
resource "keycloak_authentication_execution" "username_form" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_forms.alias
  authenticator     = "auth-username-form"
  requirement       = "REQUIRED"
  priority          = 10
}

# 3b. Factor selection subflow (WebAuthn / Passkey vs Password)
resource "keycloak_authentication_subflow" "usl_auth_methods" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_forms.alias
  alias             = "usl-auth-methods"
  requirement       = "REQUIRED"
  priority          = 20
  depends_on        = [keycloak_authentication_execution.username_form]
}

# 3b.1 WebAuthn Passwordless Authenticator (Bound to usl-workflow.yaml factors.webauthn.enabled)
resource "keycloak_authentication_execution" "webauthn_passwordless" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_auth_methods.alias
  authenticator     = "webauthn-authenticator-passwordless"
  requirement       = local.usl_workflow.factors.webauthn.enabled ? "ALTERNATIVE" : "DISABLED"
  priority          = 10
}

# 3b.2 Authenticator App (TOTP) Form (Bound to usl-workflow.yaml factors.otp.channels.available contains 'totp')
resource "keycloak_authentication_execution" "totp_form" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_auth_methods.alias
  authenticator     = "auth-otp-form"
  requirement       = contains(local.usl_workflow.factors.otp.channels.available, "totp") ? "ALTERNATIVE" : "DISABLED"
  priority          = 20
  depends_on        = [keycloak_authentication_execution.webauthn_passwordless]
}

# 3b.3 SMS OTP Execution (Passwordless)
resource "keycloak_authentication_execution" "sms_otp" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_auth_methods.alias
  authenticator     = "sms-otp-authenticator"
  requirement       = contains(local.usl_workflow.factors.otp.channels.available, "sms") ? "ALTERNATIVE" : "DISABLED"
  priority          = 30
  depends_on        = [keycloak_authentication_execution.totp_form]
}

# 3b.4 WhatsApp OTP Execution (Passwordless)
resource "keycloak_authentication_execution" "whatsapp_otp" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_auth_methods.alias
  authenticator     = "whatsapp-otp-authenticator"
  requirement       = contains(local.usl_workflow.factors.otp.channels.available, "whatsapp") ? "ALTERNATIVE" : "DISABLED"
  priority          = 35
  depends_on        = [keycloak_authentication_execution.sms_otp]
}

# 3b.5 Email OTP Execution (Passwordless)
resource "keycloak_authentication_execution" "email_otp" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_auth_methods.alias
  authenticator     = "email-otp-authenticator"
  requirement       = contains(local.usl_workflow.factors.otp.channels.available, "email") ? "ALTERNATIVE" : "DISABLED"
  priority          = 40
  depends_on        = [keycloak_authentication_execution.whatsapp_otp]
}

# 3b.5 Password Fallback (Optional / "Try another way")
resource "keycloak_authentication_execution" "password_form" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_auth_methods.alias
  authenticator     = "auth-password-form"
  requirement       = local.usl_workflow.factors.password.enabled ? "ALTERNATIVE" : "DISABLED"
  priority          = 50
  depends_on        = [keycloak_authentication_execution.email_otp]
}

# ------------------------------------------------------------------------------
# Bind USL Browser Flow to Playground Realm
# ------------------------------------------------------------------------------
resource "keycloak_authentication_bindings" "browser_flow_binding" {
  realm_id          = keycloak_realm.playground.id
  browser_flow      = keycloak_authentication_flow.usl_browser.alias
  registration_flow = "usl-registration"
  direct_grant_flow = keycloak_authentication_flow.sudo_direct_grant.alias

  depends_on = [
    keycloak_authentication_execution.cookie,
    keycloak_authentication_execution.idp_redirector,
    keycloak_authentication_execution.username_form,
    keycloak_authentication_execution.webauthn_passwordless,
    keycloak_authentication_execution.totp_form,
    keycloak_authentication_execution.sms_otp,
    keycloak_authentication_execution.email_otp,
    keycloak_authentication_execution.password_form,
    keycloak_authentication_execution.sudo_dg_password,
  ]
}

