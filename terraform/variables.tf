variable "keycloak_url" {
  description = "Base URL of Keycloak"
  type        = string
  default     = "http://localhost:8080"
}

variable "keycloak_admin_username" {
  description = "Keycloak admin bootstrap username"
  type        = string
  default     = "admin"
}

variable "keycloak_admin_password" {
  description = "Keycloak admin bootstrap password"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "realm_name" {
  description = "Name/ID of the realm"
  type        = string
  default     = "playground"
}

variable "login_theme" {
  description = "Login theme name to assign to the realm"
  type        = string
  default     = "keycloakify-starter"
}

variable "client_id" {
  description = "Client ID for the playground client"
  type        = string
  default     = "playground-app"
}
