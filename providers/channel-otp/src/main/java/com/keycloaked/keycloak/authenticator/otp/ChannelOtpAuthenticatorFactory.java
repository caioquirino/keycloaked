package com.keycloaked.keycloak.authenticator.otp;

import org.keycloak.Config;
import org.keycloak.authentication.Authenticator;
import org.keycloak.authentication.AuthenticatorFactory;
import org.keycloak.models.AuthenticationExecutionModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

import java.util.ArrayList;
import java.util.List;

public class ChannelOtpAuthenticatorFactory implements AuthenticatorFactory {

    public static final String PROVIDER_ID = "channel-otp-authenticator";
    private static final ChannelOtpAuthenticator SINGLETON = new ChannelOtpAuthenticator();

    private static final AuthenticationExecutionModel.Requirement[] REQUIREMENT_CHOICES = {
            AuthenticationExecutionModel.Requirement.REQUIRED,
            AuthenticationExecutionModel.Requirement.ALTERNATIVE,
            AuthenticationExecutionModel.Requirement.DISABLED,
            AuthenticationExecutionModel.Requirement.CONDITIONAL
    };

    private static final List<ProviderConfigProperty> CONFIG_PROPERTIES = new ArrayList<>();

    static {
        ProviderConfigProperty property = new ProviderConfigProperty();
        property.setName("sms_endpoint");
        property.setLabel("SMS Webhook Endpoint URL");
        property.setType(ProviderConfigProperty.STRING_TYPE);
        property.setHelpText("The HTTP endpoint URL that receives POST requests with { to, code, message }");
        property.setDefaultValue("http://notifier:3001/sms/send");
        CONFIG_PROPERTIES.add(property);
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public String getDisplayType() {
        return "Keycloaked Email & SMS Channel OTP";
    }

    @Override
    public String getReferenceCategory() {
        return "otp";
    }

    @Override
    public boolean isConfigurable() {
        return true;
    }

    @Override
    public AuthenticationExecutionModel.Requirement[] getRequirementChoices() {
        return REQUIREMENT_CHOICES;
    }

    @Override
    public boolean isUserSetupAllowed() {
        return false;
    }

    @Override
    public String getHelpText() {
        return "Prompts user for a 6-digit one-time code dispatched via Email (SMTP) or SMS (Webhook), supporting live channel switching.";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return CONFIG_PROPERTIES;
    }

    @Override
    public Authenticator create(KeycloakSession session) {
        return SINGLETON;
    }

    @Override
    public void init(Config.Scope config) {
    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {
    }

    @Override
    public void close() {
    }
}
