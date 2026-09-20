import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button, Input, Badge } from "@keycloaked/ui";

export default function LoginUsername(
    props: PageProps<Extract<KcContext, { pageId: "login-username.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { social, realm, url, login, registrationDisabled, messagesPerField } = kcContext;

    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("username")}
            headerNode={
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>What's your email or phone?</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--keycloaked-text-muted, #626773)", fontWeight: 400 }}>
                        Enter your identifier to sign in or create an account
                    </p>
                </div>
            }
            displayInfo={realm.password && realm.registrationAllowed && !registrationDisabled}
            infoNode={
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <Badge variant="blue" size="sm">Passwordless</Badge>
                    <span style={{ fontSize: "0.85rem", color: "var(--keycloaked-text-muted, #626773)" }}>
                        Sign in instantly with Passkey, SMS, or Email OTP.
                    </span>
                </div>
            }
            socialProvidersNode={
                social?.providers && social.providers.length > 0 ? (
                    <div style={{ marginTop: "1.5rem" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                marginBottom: "1rem"
                            }}
                        >
                            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--keycloaked-border, #E2E8F0)" }} />
                            <span style={{ fontSize: "0.8rem", color: "var(--keycloaked-text-muted, #626773)", fontWeight: 500 }}>
                                or continue with
                            </span>
                            <div style={{ flex: 1, height: "1px", backgroundColor: "var(--keycloaked-border, #E2E8F0)" }} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                            {social.providers.map((p) => (
                                <a
                                    key={p.alias}
                                    href={p.loginUrl}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "0.65rem",
                                        padding: "0.65rem 1rem",
                                        borderRadius: "var(--radius-pill, 9999px)",
                                        border: "1.5px solid var(--keycloaked-border, #E2E8F0)",
                                        backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                                        color: "var(--keycloaked-text, #191420)",
                                        textDecoration: "none",
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <span>{p.displayName}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : null
            }
        >
            <form
                id="kc-form-login"
                action={url.loginAction}
                method="post"
                onSubmit={() => {
                    setIsSubmitting(true);
                    return true;
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
                <Input
                    id="username"
                    name="username"
                    label="Email address or phone number"
                    defaultValue={login?.username ?? ""}
                    autoFocus
                    autoComplete="username webauthn"
                    placeholder="name@example.com or +31600000000"
                    error={messagesPerField.getFirstError("username")}
                />

                {messagesPerField.existsError("username") && realm.registrationAllowed && !registrationDisabled && (
                    <div
                        style={{
                            padding: "0.85rem 1rem",
                            borderRadius: "14px",
                            backgroundColor: "var(--keycloaked-coral-light, #FFF0E8)",
                            border: "1px solid rgba(255, 128, 72, 0.4)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem"
                        }}
                    >
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--keycloaked-text, #191420)" }}>
                            Account not found
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--keycloaked-text-muted, #626773)" }}>
                            We couldn't find an account matching this identifier. Would you like to create one or link it?
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.3rem" }}>
                            <a
                                href={
                                    login?.username
                                        ? `${url.registrationUrl}${url.registrationUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(login.username)}`
                                        : url.registrationUrl
                                }
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "0.4rem 0.9rem",
                                    borderRadius: "var(--radius-pill, 9999px)",
                                    backgroundColor: "var(--keycloaked-coral, #FF8048)",
                                    color: "#FFFFFF",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    textDecoration: "none"
                                }}
                            >
                                Sign up with this identifier ➔
                            </a>
                        </div>
                    </div>
                )}

                {realm.rememberMe && (
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            color: "var(--keycloaked-text-muted, #626773)",
                            userSelect: "none"
                        }}
                    >
                        <input
                            type="checkbox"
                            id="rememberMe"
                            name="rememberMe"
                            defaultChecked={!!login?.rememberMe}
                            style={{
                                width: "16px",
                                height: "16px",
                                accentColor: "var(--keycloaked-blue, #225EE2)",
                                borderRadius: "4px"
                            }}
                        />
                        <span>Remember my identifier on this device</span>
                    </label>
                )}

                <div style={{ marginTop: "0.5rem" }}>
                    <Button
                        type="submit"
                        name="login"
                        id="kc-login"
                        variant="primary"
                        size="md"
                        fullWidth
                        isLoading={isSubmitting}
                    >
                        Continue ➔
                    </Button>
                </div>
            </form>
        </Template>
    );
}
