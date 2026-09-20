# ------------------------------------------------------------------------------
# Dedicated Direct Grant Flow for Sudo Mode (Step-Up Password Verification)
# ------------------------------------------------------------------------------
# By default, Keycloak's direct grant flow requires OTP if the user has TOTP
# configured. For Sudo Mode (re-authenticating identity to perform sensitive
# actions like removing an OTP device), we authenticate the primary credential
# (password) without enforcing the second factor in the direct grant flow.
# ------------------------------------------------------------------------------

resource "keycloak_authentication_flow" "sudo_direct_grant" {
  realm_id    = keycloak_realm.playground.id
  alias       = "sudo-direct-grant"
  description = "Direct grant flow for in-app Sudo Mode step-up password verification"
}

resource "keycloak_authentication_execution" "sudo_dg_username" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_flow.sudo_direct_grant.alias
  authenticator     = "direct-grant-validate-username"
  requirement       = "REQUIRED"
  priority          = 10
}

resource "keycloak_authentication_execution" "sudo_dg_password" {
  realm_id          = keycloak_realm.playground.id
  parent_flow_alias = keycloak_authentication_flow.sudo_direct_grant.alias
  authenticator     = "direct-grant-validate-password"
  requirement       = "REQUIRED"
  priority          = 20
  depends_on        = [keycloak_authentication_execution.sudo_dg_username]
}
