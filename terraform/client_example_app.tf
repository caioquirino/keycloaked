# ------------------------------------------------------------------------------
# Dedicated Example Application Client (React + Vite SPA with PKCE)
# ------------------------------------------------------------------------------
resource "keycloak_openid_client" "example_app" {
  realm_id  = keycloak_realm.playground.id
  client_id = "example-app"
  name      = "Example React Vite App"
  enabled   = true

  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = true
  pkce_code_challenge_method   = "S256"

  valid_redirect_uris = [
    "*",
    "http://localhost:*",
    "http://127.0.0.1:*"
  ]

  web_origins = [
    "*",
    "+"
  ]
}

resource "keycloak_openid_audience_protocol_mapper" "example_app_account_audience" {
  realm_id                 = keycloak_realm.playground.id
  client_id                = keycloak_openid_client.example_app.id
  name                     = "account-audience"
  included_client_audience = "account"
  add_to_access_token      = true
  add_to_id_token          = true
}

