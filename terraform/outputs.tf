output "realm_name" {
  description = "Name of the provisioned realm"
  value       = keycloak_realm.playground.realm
}

output "realm_url" {
  description = "URL of the realm OpenID Connect endpoint"
  value       = "${var.keycloak_url}/realms/${keycloak_realm.playground.realm}"
}

output "account_console_url" {
  description = "URL to the user account management console"
  value       = "${var.keycloak_url}/realms/${keycloak_realm.playground.realm}/account"
}

output "login_test_url" {
  description = "Direct URL to test the login theme"
  value       = "${var.keycloak_url}/realms/${keycloak_realm.playground.realm}/protocol/openid-connect/auth?client_id=${keycloak_openid_client.playground_app.client_id}&response_type=code&scope=openid&redirect_uri=http://localhost:8080/"
}

output "demo_client_id" {
  description = "Client ID of the playground application client"
  value       = keycloak_openid_client.playground_app.client_id
}

output "example_app_client_id" {
  description = "Client ID for the standalone example React app"
  value       = keycloak_openid_client.example_app.client_id
}

output "example_app_url" {
  description = "URL for the standalone example React app"
  value       = "http://localhost:5173"
}

output "test_user_username" {
  description = "Username for test user"
  value       = keycloak_user.test_user.username
}

output "test_user_password" {
  description = "Initial password for test user"
  value       = "password123"
  sensitive   = false
}
