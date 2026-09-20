package com.keycloaked.keycloak.authenticator.otp;

import jakarta.ws.rs.core.MultivaluedMap;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.keycloak.authentication.AuthenticationFlowContext;
import org.keycloak.authentication.AuthenticationFlowError;
import org.keycloak.authentication.Authenticator;
import org.keycloak.email.EmailSenderProvider;
import org.keycloak.forms.login.LoginFormsProvider;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.RealmModel;
import org.keycloak.models.UserModel;
import org.keycloak.sessions.AuthenticationSessionModel;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Map;

public class ChannelOtpAuthenticator implements Authenticator {

    private static final Logger logger = Logger.getLogger(ChannelOtpAuthenticator.class);

    public static final String AUTH_NOTE_CODE = "CHANNEL_OTP_CODE";
    public static final String AUTH_NOTE_EXPIRES = "CHANNEL_OTP_EXPIRES";
    public static final String AUTH_NOTE_CHANNEL = "CHANNEL_OTP_ACTIVE_CHANNEL";
    public static final String AUTH_NOTE_COOLDOWN = "CHANNEL_OTP_RESEND_COOLDOWN";
    public static final String DEFAULT_SMS_URL = "http://notifier:3001/sms/send";
    public static final String DEFAULT_WHATSAPP_URL = "http://notifier:3001/whatsapp/send";

    private static final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    private final String enforcedChannel;

    public ChannelOtpAuthenticator() {
        this(null);
    }

    public ChannelOtpAuthenticator(String enforcedChannel) {
        this.enforcedChannel = enforcedChannel;
    }

    @Override
    public void authenticate(AuthenticationFlowContext context) {
        UserModel user = context.getUser();
        if (user == null) {
            context.failure(AuthenticationFlowError.UNKNOWN_USER);
            return;
        }

        String email = user.getEmail();
        String phone = getPhoneNumber(user);
        boolean hasEmail = email != null && !email.isBlank();
        boolean hasPhone = phone != null && !phone.isBlank();
        boolean hasWhatsApp = hasPhone && isWhatsAppEnabled(user);

        if (!hasEmail && !hasPhone) {
            logger.warnf("User %s has neither email nor phone number configured for Channel OTP.", user.getUsername());
            context.failure(AuthenticationFlowError.INVALID_USER);
            return;
        }

        // Determine channel (check explicit request from selector first)
        String requestedChannel = null;
        try {
            MultivaluedMap<String, String> formParams = context.getHttpRequest().getDecodedFormParameters();
            if (formParams != null && formParams.containsKey("channel")) {
                requestedChannel = formParams.getFirst("channel");
            }
            if (requestedChannel == null && context.getHttpRequest().getUri().getQueryParameters() != null) {
                requestedChannel = context.getHttpRequest().getUri().getQueryParameters().getFirst("channel");
            }
        } catch (Exception e) {
            logger.debug("Could not read requested channel parameter: " + e.getMessage());
        }

        String preferred = user.getFirstAttribute("preferred_otp_channel");

        // 1. WhatsApp Execution
        if ("whatsapp".equalsIgnoreCase(enforcedChannel)) {
            // Yield if another channel was explicitly selected
            if ("sms".equalsIgnoreCase(requestedChannel) || "email".equalsIgnoreCase(requestedChannel)) {
                context.attempted();
                return;
            }
            // If default flow (no explicit channel requested), yield unless user explicitly prefers whatsapp
            if (requestedChannel == null) {
                if (!"whatsapp".equalsIgnoreCase(preferred) || !hasWhatsApp) {
                    context.attempted();
                    return;
                }
            }
            // If user explicitly picked WhatsApp or preferred it, but WhatsApp is not linked:
            if (!hasWhatsApp) {
                if (hasPhone) {
                    logger.infof("WhatsApp not linked for user %s; gracefully falling back to SMS OTP.", user.getUsername());
                    AuthenticationSessionModel authSession = context.getAuthenticationSession();
                    authSession.setAuthNote(AUTH_NOTE_CHANNEL, "sms");
                    dispatchNewCode(context, "sms");
                    context.challenge(createInfoChallenge(context, "WhatsApp is not linked to your account. We sent a code via SMS to " + maskPhone(phone) + " instead."));
                    return;
                } else if (hasEmail) {
                    logger.infof("WhatsApp not linked for user %s; gracefully falling back to Email OTP.", user.getUsername());
                    AuthenticationSessionModel authSession = context.getAuthenticationSession();
                    authSession.setAuthNote(AUTH_NOTE_CHANNEL, "email");
                    dispatchNewCode(context, "email");
                    context.challenge(createInfoChallenge(context, "WhatsApp is not linked to your account. We sent a code via Email to " + maskEmail(email) + " instead."));
                    return;
                } else {
                    context.attempted();
                    return;
                }
            }
        }

        // 2. SMS Execution
        if ("sms".equalsIgnoreCase(enforcedChannel)) {
            // Yield if another channel was explicitly selected
            if ("whatsapp".equalsIgnoreCase(requestedChannel) || "email".equalsIgnoreCase(requestedChannel)) {
                context.attempted();
                return;
            }
            // If default flow, yield if user prefers WhatsApp (and has it) or Email (and has it)
            if (requestedChannel == null) {
                if ("whatsapp".equalsIgnoreCase(preferred) && hasWhatsApp) {
                    logger.debugf("User %s prefers WhatsApp OTP, passing SMS execution.", user.getUsername());
                    context.attempted();
                    return;
                }
                if ("email".equalsIgnoreCase(preferred) && hasEmail) {
                    logger.debugf("User %s prefers Email OTP, passing SMS execution.", user.getUsername());
                    context.attempted();
                    return;
                }
            }
            // If SMS was requested/default, but user has no phone:
            if (!hasPhone) {
                if ("sms".equalsIgnoreCase(requestedChannel) && hasEmail) {
                    logger.infof("SMS not configured for user %s; gracefully falling back to Email OTP.", user.getUsername());
                    AuthenticationSessionModel authSession = context.getAuthenticationSession();
                    authSession.setAuthNote(AUTH_NOTE_CHANNEL, "email");
                    dispatchNewCode(context, "email");
                    context.challenge(createInfoChallenge(context, "No mobile phone registered. We sent a code via Email to " + maskEmail(email) + " instead."));
                    return;
                }
                context.attempted();
                return;
            }
        }

        // 3. Email Execution
        if ("email".equalsIgnoreCase(enforcedChannel)) {
            // Yield if another channel was explicitly selected
            if ("sms".equalsIgnoreCase(requestedChannel) || "whatsapp".equalsIgnoreCase(requestedChannel)) {
                context.attempted();
                return;
            }
            // If email is not configured:
            if (!hasEmail) {
                if ("email".equalsIgnoreCase(requestedChannel) && hasPhone) {
                    logger.infof("Email not configured for user %s; gracefully falling back to SMS OTP.", user.getUsername());
                    AuthenticationSessionModel authSession = context.getAuthenticationSession();
                    authSession.setAuthNote(AUTH_NOTE_CHANNEL, "sms");
                    dispatchNewCode(context, "sms");
                    context.challenge(createInfoChallenge(context, "No email address registered. We sent a code via SMS to " + maskPhone(phone) + " instead."));
                    return;
                }
                context.attempted();
                return;
            }
        }

        String initialChannel;
        if ("whatsapp".equalsIgnoreCase(enforcedChannel)) {
            initialChannel = "whatsapp";
        } else if ("sms".equalsIgnoreCase(enforcedChannel)) {
            initialChannel = "sms";
        } else if ("email".equalsIgnoreCase(enforcedChannel)) {
            initialChannel = "email";
        } else if ("whatsapp".equalsIgnoreCase(requestedChannel) && hasWhatsApp) {
            initialChannel = "whatsapp";
        } else if ("sms".equalsIgnoreCase(requestedChannel) && hasPhone) {
            initialChannel = "sms";
        } else if ("email".equalsIgnoreCase(requestedChannel) && hasEmail) {
            initialChannel = "email";
        } else if ("whatsapp".equalsIgnoreCase(preferred) && hasWhatsApp) {
            initialChannel = "whatsapp";
        } else if ("sms".equalsIgnoreCase(preferred) && hasPhone) {
            initialChannel = "sms";
        } else if ("email".equalsIgnoreCase(preferred) && hasEmail) {
            initialChannel = "email";
        } else if (hasWhatsApp) {
            initialChannel = "whatsapp";
        } else if (hasPhone) {
            initialChannel = "sms";
        } else {
            initialChannel = "email";
        }

        AuthenticationSessionModel authSession = context.getAuthenticationSession();
        authSession.setAuthNote(AUTH_NOTE_CHANNEL, initialChannel);

        // Generate and dispatch code
        dispatchNewCode(context, initialChannel);

        context.challenge(createChallenge(context, null));
    }

    @Override
    public void action(AuthenticationFlowContext context) {
        MultivaluedMap<String, String> formData = context.getHttpRequest().getDecodedFormParameters();
        AuthenticationSessionModel authSession = context.getAuthenticationSession();

        String actionType = formData.getFirst("action");
        if (actionType == null) {
            actionType = "submit_code";
        }

        UserModel user = context.getUser();
        String email = user.getEmail();
        String phone = getPhoneNumber(user);
        boolean hasEmail = email != null && !email.isBlank();
        boolean hasPhone = phone != null && !phone.isBlank();
        boolean hasWhatsApp = hasPhone && isWhatsAppEnabled(user);
        String currentChannel = authSession.getAuthNote(AUTH_NOTE_CHANNEL);
        if (currentChannel == null) {
            currentChannel = "email";
        }

        if ("resend".equalsIgnoreCase(actionType)) {
            // Check cooldown
            String cooldownStr = authSession.getAuthNote(AUTH_NOTE_COOLDOWN);
            if (cooldownStr != null && Long.parseLong(cooldownStr) > System.currentTimeMillis()) {
                context.challenge(createChallenge(context, "Please wait before requesting a new code."));
                return;
            }

            dispatchNewCode(context, currentChannel);
            context.challenge(createChallenge(context, null));
            return;
        }

        if ("switch_channel".equalsIgnoreCase(actionType)) {
            String newChannel;
            if ("whatsapp".equalsIgnoreCase(currentChannel)) {
                newChannel = (phone != null && !phone.isBlank()) ? "sms" : "email";
            } else if ("sms".equalsIgnoreCase(currentChannel)) {
                newChannel = hasWhatsApp ? "whatsapp" : ((email != null && !email.isBlank()) ? "email" : "sms");
            } else {
                newChannel = hasWhatsApp ? "whatsapp" : ((phone != null && !phone.isBlank()) ? "sms" : "email");
            }

            if ("whatsapp".equalsIgnoreCase(newChannel) && !hasWhatsApp) {
                context.challenge(createChallenge(context, "WhatsApp is not linked to account."));
                return;
            }
            if ("sms".equalsIgnoreCase(newChannel) && !hasPhone) {
                context.challenge(createChallenge(context, "No phone number configured on account."));
                return;
            }
            if ("email".equalsIgnoreCase(newChannel) && !hasEmail) {
                context.challenge(createChallenge(context, "No email configured on account."));
                return;
            }

            authSession.setAuthNote(AUTH_NOTE_CHANNEL, newChannel);
            dispatchNewCode(context, newChannel);
            context.challenge(createChallenge(context, null));
            return;
        }

        // Action: verify submitted code
        String enteredCode = formData.getFirst("code");
        if (enteredCode == null || enteredCode.trim().isEmpty()) {
            enteredCode = formData.getFirst("otp");
        }
        String storedCode = authSession.getAuthNote(AUTH_NOTE_CODE);
        String expiresStr = authSession.getAuthNote(AUTH_NOTE_EXPIRES);

        if (enteredCode == null || enteredCode.trim().isEmpty()) {
            context.challenge(createChallenge(context, "Please enter the 6-digit verification code."));
            return;
        }

        if (storedCode == null || expiresStr == null) {
            context.challenge(createChallenge(context, "Verification code expired. Please request a new code."));
            return;
        }

        long expiresAt = Long.parseLong(expiresStr);
        if (System.currentTimeMillis() > expiresAt) {
            context.challenge(createChallenge(context, "Verification code expired. Please request a new code."));
            return;
        }

        if (!storedCode.trim().equals(enteredCode.trim())) {
            context.challenge(createChallenge(context, "Invalid verification code. Please try again."));
            return;
        }

        // Code matches successfully!
        authSession.removeAuthNote(AUTH_NOTE_CODE);
        authSession.removeAuthNote(AUTH_NOTE_EXPIRES);
        authSession.removeAuthNote(AUTH_NOTE_COOLDOWN);
        context.success();
    }

    private void dispatchNewCode(AuthenticationFlowContext context, String channel) {
        String code = String.format("%06d", new SecureRandom().nextInt(1000000));
        AuthenticationSessionModel authSession = context.getAuthenticationSession();

        authSession.setAuthNote(AUTH_NOTE_CODE, code);
        authSession.setAuthNote(AUTH_NOTE_EXPIRES, String.valueOf(System.currentTimeMillis() + (5 * 60 * 1000))); // 5 mins
        authSession.setAuthNote(AUTH_NOTE_COOLDOWN, String.valueOf(System.currentTimeMillis() + 30000)); // 30s cooldown

        UserModel user = context.getUser();
        if ("whatsapp".equalsIgnoreCase(channel)) {
            String phone = getPhoneNumber(user);
            sendWhatsAppCode(context, phone, code);
        } else if ("sms".equalsIgnoreCase(channel)) {
            String phone = getPhoneNumber(user);
            sendSmsCode(context, phone, code);
        } else {
            String email = user.getEmail();
            sendEmailCode(context, email, code);
        }
    }

    private void sendEmailCode(AuthenticationFlowContext context, String email, String code) {
        try {
            EmailSenderProvider emailSender = context.getSession().getProvider(EmailSenderProvider.class);
            Map<String, String> smtpConfig = context.getRealm().getSmtpConfig();

            String subject = "Keycloaked Verification Code: " + code;
            String text = "Your Keycloaked one-time verification code is: " + code + "\n\nThis code expires in 5 minutes.\nDo not share this code with anyone.";
            String html = "<div style=\"font-family: sans-serif; padding: 20px;\">" +
                    "<h2>Keycloaked Verification Code</h2>" +
                    "<p>Your one-time verification code is:</p>" +
                    "<p style=\"font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #225EE2;\">" + code + "</p>" +
                    "<p>This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.</p>" +
                    "</div>";

            emailSender.send(smtpConfig, context.getUser(), subject, text, html);
            logger.infof("Email OTP %s dispatched to %s for user %s", code, email, context.getUser().getUsername());
        } catch (Exception e) {
            logger.errorf(e, "Failed to dispatch email OTP to %s", email);
        }
    }

    private void sendSmsCode(AuthenticationFlowContext context, String phone, String code) {
        try {
            String smsUrl = getSmsEndpoint(context);
            String jsonPayload = String.format("{\"to\":\"%s\",\"code\":\"%s\",\"message\":\"Keycloaked verification code: %s. Do not share this code with anyone.\"}",
                    phone, code, code);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(smsUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            httpClient.send(req, HttpResponse.BodyHandlers.discarding());
            logger.infof("SMS OTP %s dispatched to %s for user %s", code, phone, context.getUser().getUsername());
        } catch (Exception e) {
            logger.errorf(e, "Failed to dispatch SMS OTP to %s", phone);
        }
    }

    private Response createChallenge(AuthenticationFlowContext context, String errorMessage) {
        return createChallenge(context, errorMessage, true);
    }

    private Response createInfoChallenge(AuthenticationFlowContext context, String infoMessage) {
        return createChallenge(context, infoMessage, false);
    }

    private Response createChallenge(AuthenticationFlowContext context, String message, boolean isError) {
        UserModel user = context.getUser();
        String email = user.getEmail();
        String phone = getPhoneNumber(user);

        AuthenticationSessionModel authSession = context.getAuthenticationSession();
        String currentChannel = authSession.getAuthNote(AUTH_NOTE_CHANNEL);
        if (currentChannel == null) {
            currentChannel = "email";
        }

        boolean hasEmail = email != null && !email.isBlank();
        boolean hasPhone = phone != null && !phone.isBlank();
        boolean hasWhatsApp = hasPhone && isWhatsAppEnabled(user);
        boolean canSwitch = (hasEmail ? 1 : 0) + (hasPhone ? 1 : 0) + (hasWhatsApp ? 1 : 0) > 1;

        String destination;
        if ("whatsapp".equalsIgnoreCase(currentChannel)) {
            destination = maskPhone(phone);
        } else if ("sms".equalsIgnoreCase(currentChannel)) {
            destination = maskPhone(phone);
        } else {
            destination = maskEmail(email);
        }

        String switchChannel = null;
        String switchLabel = null;
        if ("whatsapp".equalsIgnoreCase(currentChannel)) {
            if (hasPhone) {
                switchChannel = "sms";
                switchLabel = "Send code via SMS to " + maskPhone(phone);
            } else if (hasEmail) {
                switchChannel = "email";
                switchLabel = "Send code via Email to " + maskEmail(email);
            }
        } else if ("sms".equalsIgnoreCase(currentChannel)) {
            if (hasWhatsApp) {
                switchChannel = "whatsapp";
                switchLabel = "Send code via WhatsApp to " + maskPhone(phone);
            } else if (hasEmail) {
                switchChannel = "email";
                switchLabel = "Send code via Email to " + maskEmail(email);
            }
        } else {
            if (hasWhatsApp) {
                switchChannel = "whatsapp";
                switchLabel = "Send code via WhatsApp to " + maskPhone(phone);
            } else if (hasPhone) {
                switchChannel = "sms";
                switchLabel = "Send code via SMS to " + maskPhone(phone);
            }
        }

        LoginFormsProvider form = context.form();
        form.setAttribute("channel", currentChannel);
        form.setAttribute("destination", destination);
        form.setAttribute("isWhatsApp", "whatsapp".equalsIgnoreCase(currentChannel));
        form.setAttribute("isSms", "sms".equalsIgnoreCase(currentChannel));
        form.setAttribute("isEmail", "email".equalsIgnoreCase(currentChannel));
        form.setAttribute("canSwitch", canSwitch);
        form.setAttribute("switchChannel", switchChannel);
        form.setAttribute("switchLabel", switchLabel);
        form.setAttribute("username", user.getUsername());

        if (message != null) {
            if (isError) {
                form.setError(message);
            } else {
                form.setInfo(message);
            }
        }

        return form.createForm("login-channel-otp.ftl");
    }

    private String getPhoneNumber(UserModel user) {
        String phone = user.getFirstAttribute("phone_number");
        if (phone == null || phone.isBlank()) {
            phone = user.getFirstAttribute("phone");
        }
        if (phone == null || phone.isBlank()) {
            phone = user.getFirstAttribute("mobile");
        }
        return phone;
    }

    private String getSmsEndpoint(AuthenticationFlowContext context) {
        if (context.getAuthenticatorConfig() != null &&
                context.getAuthenticatorConfig().getConfig() != null &&
                context.getAuthenticatorConfig().getConfig().containsKey("sms_endpoint")) {
            return context.getAuthenticatorConfig().getConfig().get("sms_endpoint");
        }
        return DEFAULT_SMS_URL;
    }

    private void sendWhatsAppCode(AuthenticationFlowContext context, String phone, String code) {
        try {
            String whatsappUrl = getWhatsAppEndpoint(context);
            String jsonPayload = String.format("{\"to\":\"%s\",\"code\":\"%s\",\"channel\":\"whatsapp\",\"message\":\"Keycloaked WhatsApp verification code: %s. Do not share this code with anyone.\"}",
                    phone, code, code);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(whatsappUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            httpClient.send(req, HttpResponse.BodyHandlers.discarding());
            logger.infof("WhatsApp OTP %s dispatched to %s for user %s", code, phone, context.getUser().getUsername());
        } catch (Exception e) {
            logger.errorf(e, "Failed to dispatch WhatsApp OTP to %s", phone);
        }
    }

    private String getWhatsAppEndpoint(AuthenticationFlowContext context) {
        if (context.getAuthenticatorConfig() != null &&
                context.getAuthenticatorConfig().getConfig() != null &&
                context.getAuthenticatorConfig().getConfig().containsKey("whatsapp_endpoint")) {
            return context.getAuthenticatorConfig().getConfig().get("whatsapp_endpoint");
        }
        return DEFAULT_WHATSAPP_URL;
    }

    public boolean isWhatsAppEnabled(UserModel user) {
        if (user == null) return false;
        String val = user.getFirstAttribute("whatsapp_enabled");
        return "true".equalsIgnoreCase(val) || "1".equals(val);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int atIndex = email.indexOf('@');
        String name = email.substring(0, atIndex);
        String domain = email.substring(atIndex);
        if (name.length() <= 2) {
            return name.charAt(0) + "•" + domain;
        }
        return name.charAt(0) + "•••••" + name.charAt(name.length() - 1) + domain;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) return phone;
        String prefix = phone.substring(0, 4);
        String suffix = phone.substring(phone.length() - 4);
        return prefix + " ••••• " + suffix;
    }

    @Override
    public boolean requiresUser() {
        return true;
    }

    @Override
    public boolean configuredFor(KeycloakSession session, RealmModel realm, UserModel user) {
        String email = user.getEmail();
        String phone = getPhoneNumber(user);
        boolean hasEmail = email != null && !email.isBlank();
        boolean hasPhone = phone != null && !phone.isBlank();

        if ("whatsapp".equalsIgnoreCase(enforcedChannel)) {
            return hasPhone;
        }
        if ("sms".equalsIgnoreCase(enforcedChannel)) {
            return hasPhone;
        }
        if ("email".equalsIgnoreCase(enforcedChannel)) {
            return hasEmail;
        }
        return hasEmail || hasPhone;
    }

    @Override
    public void setRequiredActions(KeycloakSession session, RealmModel realm, UserModel user) {
    }

    @Override
    public void close() {
    }
}
