# ------------------------------------------------------------------------------
# Uber-Style USL Registration Flow
# Mirrors Keycloak's built-in "registration" flow, but swaps in the custom
# GenerateUuidUsernameAction SPI (run before and after user creation) and
# disables password/reCAPTCHA/terms-and-conditions, since USL auth is
# identifier-first and passwordless.
# ------------------------------------------------------------------------------

resource "keycloak_authentication_flow" "usl_registration" {
  realm_id    = keycloak_realm.playground.id
  alias       = "usl-registration"
  description = "Registration flow"
}

# Top-level step: the registration form. "registration-page-form" is a
# form-flow provider (not a plain execution) — Keycloak's Admin Console
# auto-names it "<flow alias> registration form"; we set that alias
# explicitly since Terraform can't manage an auto-created subflow.
resource "keycloak_authentication_subflow" "usl_registration_form" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_flow.usl_registration.alias
  alias             = "usl-registration registration form"
  provider_id       = "form-flow"
  authenticator     = "registration-page-form"
  requirement       = "REQUIRED"
  priority          = 10
}

# Step 1a: Generate UUID username/preferred username (before user creation)
resource "keycloak_authentication_execution" "usl_registration_uuid_username_pre" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_registration_form.alias
  authenticator     = "registration-uuid-username-action"
  requirement       = "REQUIRED"
  priority          = 20
  depends_on        = [keycloak_authentication_subflow.usl_registration_form]
}

# Step 1b: Registration user profile creation
resource "keycloak_authentication_execution" "usl_registration_user_creation" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_registration_form.alias
  authenticator     = "registration-user-creation"
  requirement       = "REQUIRED"
  priority          = 50
  depends_on        = [keycloak_authentication_execution.usl_registration_uuid_username_pre]
}

# Step 1c: Generate UUID username/preferred username (after user creation)
resource "keycloak_authentication_execution" "usl_registration_uuid_username_post" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_registration_form.alias
  authenticator     = "registration-uuid-username-action"
  requirement       = "REQUIRED"
  priority          = 60
  depends_on        = [keycloak_authentication_execution.usl_registration_user_creation]
}

# Step 1d: Password validation (disabled — USL registration is passwordless)
resource "keycloak_authentication_execution" "usl_registration_password" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_registration_form.alias
  authenticator     = "registration-password-action"
  requirement       = "DISABLED"
  priority          = 70
  depends_on        = [keycloak_authentication_execution.usl_registration_uuid_username_post]
}

# Step 1e: reCAPTCHA (disabled)
resource "keycloak_authentication_execution" "usl_registration_recaptcha" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_registration_form.alias
  authenticator     = "registration-recaptcha-action"
  requirement       = "DISABLED"
  priority          = 71
  depends_on        = [keycloak_authentication_execution.usl_registration_password]
}

# Step 1f: Terms and conditions (disabled)
resource "keycloak_authentication_execution" "usl_registration_terms" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_subflow.usl_registration_form.alias
  authenticator     = "registration-terms-and-conditions"
  requirement       = "DISABLED"
  priority          = 72
  depends_on        = [keycloak_authentication_execution.usl_registration_recaptcha]
}
