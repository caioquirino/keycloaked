# ------------------------------------------------------------------------------
# Playground Realm
# ------------------------------------------------------------------------------
resource "keycloak_realm" "playground" {
  realm             = var.realm_name
  enabled           = true
  display_name      = "Playground"
  display_name_html = "<b>Playground</b>"

  # Use the Keycloakify React login theme
  login_theme = var.login_theme

  # User management options (bound to usl-workflow.yaml)
  login_with_email_allowed       = true
  registration_allowed           = local.usl_workflow.flow.allow_registration
  registration_email_as_username = false
  remember_me                    = local.usl_workflow.flow.remember_me
  reset_password_allowed         = local.usl_workflow.factors.password.enabled
  verify_email                   = true
  edit_username_allowed          = false

  smtp_server {
    host              = "notifier"
    port              = "1025"
    from              = "no-reply@keycloaked.local"
    from_display_name = "Keycloaked Accounts"
    ssl               = false
    starttls          = false
  }

  attributes = {
    usl_workflow = jsonencode(local.usl_workflow)
  }

  access_code_lifespan     = "1h"
  sso_session_idle_timeout = "30m"
  sso_session_max_lifespan = "10h"
}
