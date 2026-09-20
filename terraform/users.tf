# ------------------------------------------------------------------------------
# Test User & Assigned Roles
# ------------------------------------------------------------------------------
resource "keycloak_user" "test_user" {
  realm_id = keycloak_realm.playground.id
  username = "4f8eee18-19bd-479a-ac9d-0e25ba3a2ce6"
  enabled  = true

  email          = "testuser@example.com"
  first_name     = "Test"
  last_name      = "User"
  email_verified = true

  initial_password {
    value     = "password123"
    temporary = false
  }

  attributes = {
    phone_number          = "+31600000000"
    preferred_otp_channel = "sms"
    preferred_username    = "4f8eee18-19bd-479a-ac9d-0e25ba3a2ce6"
  }
}

data "keycloak_openid_client" "account" {
  realm_id  = keycloak_realm.playground.id
  client_id = "account"
}

data "keycloak_role" "account_manage_account" {
  realm_id  = keycloak_realm.playground.id
  client_id = data.keycloak_openid_client.account.id
  name      = "manage-account"
}

data "keycloak_role" "account_view_profile" {
  realm_id  = keycloak_realm.playground.id
  client_id = data.keycloak_openid_client.account.id
  name      = "view-profile"
}

resource "keycloak_user_roles" "test_user_roles" {
  realm_id = keycloak_realm.playground.id
  user_id  = keycloak_user.test_user.id
  role_ids = [
    keycloak_role.realm_user.id,
    keycloak_role.realm_admin.id,
    data.keycloak_role.account_manage_account.id,
    data.keycloak_role.account_view_profile.id
  ]
}
