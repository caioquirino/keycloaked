import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button, Input } from "@keycloaked/ui";

export default function LoginPassword(
    props: PageProps<Extract<KcContext, { pageId: "login-password.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { realm, url, auth, messagesPerField } = kcContext;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const attemptedUsername = auth?.attemptedUsername ?? "";

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("password")}
            headerNode={
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <span>Enter your password</span>
                    {attemptedUsername && (
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                padding: "0.4rem 0.75rem",
                                borderRadius: "var(--radius-pill, 9999px)",
                                backgroundColor: "var(--keycloaked-bg-subtle, #F7F5F0)",
                                border: "1px solid var(--keycloaked-border, #E2E8F0)",
                                alignSelf: "flex-start"
                            }}
                        >
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--keycloaked-text, #191420)" }}>
                                {attemptedUsername}
                            </span>
                            <a
                                href={url.loginRestartFlowUrl}
                                style={{
                                    fontSize: "0.75rem",
                                    color: "var(--keycloaked-blue, #225EE2)",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    cursor: "pointer"
                                }}
                            >
                                Edit
                            </a>
                        </div>
                    )}
                </div>
            }
            displayInfo={false}
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
                <div>
                    <Input
                        id="password"
                        name="password"
                        label="Password"
                        type="password"
                        isPassword
                        autoFocus
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

                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <Button
                        type="submit"
                        name="login"
                        id="kc-login"
                        variant="primary"
                        size="md"
                        fullWidth
                        isLoading={isSubmitting}
                    >
                        Sign in
                    </Button>

                    <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                        <button
                            type="button"
                            onClick={() => {
                                const form = document.createElement("form");
                                form.method = "POST";
                                form.action = url.loginAction;
                                const input = document.createElement("input");
                                input.type = "hidden";
                                input.name = "tryAnotherWay";
                                input.value = "on";
                                form.appendChild(input);
                                document.body.appendChild(form);
                                form.submit();
                            }}
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--keycloaked-blue, #225EE2)",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                padding: "0.25rem 0.5rem"
                            }}
                        >
                            Prefer passwordless? Sign in with Passkey or OTP ➔
                        </button>
                    </div>

                    {url.loginRestartFlowUrl && (
                        <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                            <a
                                href={url.loginRestartFlowUrl}
                                style={{
                                    fontSize: "0.82rem",
                                    color: "var(--keycloaked-text-muted, #626773)",
                                    textDecoration: "none",
                                    fontWeight: 500
                                }}
                            >
                                ← Sign in with a different account
                            </a>
                        </div>
                    )}
                </div>
            </form>
        </Template>
    );
}
