package com.keycloaked.keycloak.authenticator.registration;

import jakarta.ws.rs.core.MultivaluedMap;
import org.jboss.logging.Logger;
import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormContext;
import org.keycloak.authentication.ValidationContext;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.sessions.AuthenticationSessionModel;

import java.util.UUID;

public class GenerateUuidUsernameAction implements FormAction {

    private static final Logger logger = Logger.getLogger(GenerateUuidUsernameAction.class);
    public static final String GENERATED_USER_UUID_NOTE = "GENERATED_USER_UUID";

    @Override
    public void buildPage(FormContext context, LoginFormsProvider form) {
        // No UI rendered by this action
    }

    @Override
    public void validate(ValidationContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        AuthenticationSessionModel authSession = context.getAuthenticationSession();

        if (formData != null) {
            String username = formData.getFirst("username");
            if (username == null || username.trim().isEmpty()) {
                String generatedUuid = UUID.randomUUID().toString();
                formData.putSingle("username", generatedUuid);
                authSession.setAuthNote(GENERATED_USER_UUID_NOTE, generatedUuid);
                logger.infof("Server-side UUID generated for new user registration: %s", generatedUuid);
            }
        }
        context.success();
    }

    @Override
    public void success(FormContext context) {
        UserModel user = context.getUser();
        if (user != null) {
            AuthenticationSessionModel authSession = context.getAuthenticationSession();
            String uuid = authSession != null ? authSession.getAuthNote(GENERATED_USER_UUID_NOTE) : null;
            if (uuid == null || uuid.isBlank()) {
                uuid = user.getUsername();
            }
            if (uuid == null || uuid.isBlank()) {
                uuid = UUID.randomUUID().toString();
                user.setUsername(uuid);
            }
            user.setSingleAttribute("preferred_username", uuid);
            logger.infof("Assigned preferred_username attribute %s to user %s", uuid, user.getId());
        }
    }

    @Override
    public boolean requiresUser() {
        return false;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        return true;
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
    }

    @Override
    public void close() {
    }
}
