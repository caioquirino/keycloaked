import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button, Input } from "@keycloaked/ui";

export default function Login(props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;

    const { social, realm, url, usernameHidden, login, registrationDisabled, messagesPerField } = kcContext;

    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("username", "password")}
            headerNode="Welcome back"
            displayInfo={realm.password && realm.registrationAllowed && !registrationDisabled}
            infoNode={
                realm.password && realm.registrationAllowed && !registrationDisabled ? (
                    <div>
                        <span>Don't have an account? </span>
                        <a
                            href={url.registrationUrl}
                            style={{
                                color: "var(--keycloaked-blue, #225EE2)",
                                fontWeight: 600,
                                textDecoration: "none"
                            }}
                        >
                            Sign up now ➔
                        </a>
                    </div>
                ) : null
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
                style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}
            >
                {!usernameHidden && (
                    <Input
                        id="username"
                        name="username"
                        label={!realm.loginWithEmailAllowed ? "Username" : "Email address or phone number"}
                        defaultValue={login.username ?? ""}
                        autoFocus
                        autoComplete="username"
                        placeholder="you@example.com or +31600000000"
                        error={messagesPerField.getFirstError("username")}
                    />
                )}

                <div>
                    <Input
                        id="password"
                        name="password"
                        label="Password"
                        type="password"
                        isPassword
                        autoComplete="current-password"
                        placeholder="••••••••"
                        error={messagesPerField.getFirstError("password")}
                    />

                    {realm.resetPasswordAllowed && (
                        <div style={{ textAlign: "right", marginTop: "0.4rem" }}>
                            <a
                                href={url.loginResetCredentialsUrl}
                                style={{
                                    fontSize: "0.82rem",
                                    color: "var(--keycloaked-blue, #225EE2)",
                                    fontWeight: 500,
                                    textDecoration: "none"
                                }}
                            >
                                Forgot password?
                            </a>
                        </div>
                    )}
                </div>

                {realm.rememberMe && !usernameHidden && (
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
                            defaultChecked={!!login.rememberMe}
                            style={{
                                width: "16px",
                                height: "16px",
                                accentColor: "var(--keycloaked-blue, #225EE2)",
                                borderRadius: "4px"
                            }}
                        />
                        <span>Remember me for 30 days</span>
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
                        Sign in to Keycloaked
                    </Button>
                </div>
            </form>
        </Template>
    );
}
