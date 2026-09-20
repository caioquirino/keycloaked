# ------------------------------------------------------------------------------
# Realm Roles
# ------------------------------------------------------------------------------
resource "keycloak_role" "realm_user" {
  realm_id    = keycloak_realm.playground.id
  name        = "user"
  description = "Standard user role for playground applications"
}

resource "keycloak_role" "realm_admin" {
  realm_id    = keycloak_realm.playground.id
  name        = "admin"
  description = "Administrator role for playground applications"
}
