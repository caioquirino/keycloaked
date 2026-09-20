# ------------------------------------------------------------------------------
# Demo OpenID Connect Client (for playground testing)
# ------------------------------------------------------------------------------
resource "keycloak_openid_client" "playground_app" {
  realm_id  = keycloak_realm.playground.id
  client_id = var.client_id
  name      = "Playground Web App"
  enabled   = true

  access_type                  = "PUBLIC"
  standard_flow_enabled        = true
  direct_access_grants_enabled = true

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
