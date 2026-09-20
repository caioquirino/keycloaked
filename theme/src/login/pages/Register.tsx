import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button, Input, AccountLinkPrompt, Badge } from "@keycloaked/ui";

export default function Register(
    props: PageProps<Extract<KcContext, { pageId: "register.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, messagesPerField, message, passwordRequired, profile } = kcContext;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dismissCollision, setDismissCollision] = useState(false);

    const emailError = messagesPerField.getFirstError("email");
    const usernameError = messagesPerField.getFirstError("username");
    const summaryText = message?.summary?.toLowerCase() ?? "";

    const isEmailCollision =
        emailError?.toLowerCase().includes("exist") ||
        emailError?.toLowerCase().includes("already") ||
        summaryText.includes("email");

    const isUsernameCollision =
        usernameError?.toLowerCase().includes("exist") ||
        usernameError?.toLowerCase().includes("already") ||
        summaryText.includes("username") ||
        summaryText.includes("user");

    const hasAccountCollision =
        !dismissCollision &&
        (isEmailCollision || isUsernameCollision || summaryText.includes("exist") || summaryText.includes("already"));

    const conflictingField = isEmailCollision
        ? "Email address"
        : isUsernameCollision
        ? "Username"
        : "Authentication factor";

    const collidedIdentifier = isEmailCollision
        ? (profile?.attributesByName?.["email"]?.value || "this email")
        : isUsernameCollision
        ? (profile?.attributesByName?.["username"]?.value || "this username")
        : (profile?.attributesByName?.["email"]?.value || profile?.attributesByName?.["username"]?.value || "this account");

    if (hasAccountCollision) {
        return (
            <Template
                kcContext={kcContext}
                i18n={i18n}
                doUseDefaultCss={doUseDefaultCss}
                classes={classes}
                displayMessage={false}
                headerNode="Account Already Exists"
                displayInfo={false}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <AccountLinkPrompt
                        identifier={collidedIdentifier}
                        conflictingField={conflictingField}
                        type="collision"
                        onLink={() => {
                            window.location.href = url.loginUrl;
                        }}
                        onUseDifferentValue={() => {
                            setDismissCollision(true);
                        }}
                        onCancel={() => {
                            setDismissCollision(true);
                        }}
                    />
                </div>
            </Template>
        );
    }

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!messagesPerField.existsError("firstName", "lastName", "email", "password", "password-confirm")}
            headerNode={
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span>Create your account</span>
                    {!passwordRequired && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                            <Badge variant="blue" size="sm">Passwordless</Badge>
                            <span style={{ fontSize: "0.82rem", color: "var(--keycloaked-text-muted, #626773)", fontWeight: 400 }}>
                                No passwords needed — OTP & Passkeys only.
                            </span>
                        </div>
                    )}
                </div>
            }
            displayInfo={true}
            infoNode={
                <div style={{ textAlign: "center", fontSize: "0.88rem", color: "var(--keycloaked-text-muted, #626773)" }}>
                    Already have an account?{" "}
                    <a
                        href={url.loginUrl}
                        style={{
                            color: "var(--keycloaked-blue, #225EE2)",
                            fontWeight: 600,
                            textDecoration: "none"
                        }}
                    >
                        Sign in ➔
                    </a>
                </div>
            }
        >
            <form
                id="kc-register-form"
                action={url.registrationAction}
                method="post"
                onSubmit={() => setIsSubmitting(true)}
                style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
            >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <Input
                        id="firstName"
                        name="firstName"
                        label="First name"
                        defaultValue={profile?.attributesByName?.["firstName"]?.value ?? ""}
                        autoFocus
                        error={messagesPerField.getFirstError("firstName")}
                    />
                    <Input
                        id="lastName"
                        name="lastName"
                        label="Last name"
                        defaultValue={profile?.attributesByName?.["lastName"]?.value ?? ""}
                        error={messagesPerField.getFirstError("lastName")}
                    />
                </div>

                <Input
                    id="email"
                    name="email"
                    label="Email address"
                    type="email"
                    defaultValue={
                        profile?.attributesByName?.["email"]?.value ??
                        (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("email") ?? "" : "")
                    }
                    autoComplete="email"
                    placeholder="name@example.com"
                    error={emailError}
                />
                {/* Username is generated as an immutable UUID on the backend */ }

                {Boolean(passwordRequired) && (
                    <>
                        <Input
                            id="password"
                            name="password"
                            label="Password"
                            type="password"
                            isPassword
                            autoComplete="new-password"
                            placeholder="••••••••"
                            error={messagesPerField.getFirstError("password")}
                        />
                        <Input
                            id="password-confirm"
                            name="password-confirm"
                            label="Confirm password"
                            type="password"
                            isPassword
                            autoComplete="new-password"
                            placeholder="••••••••"
                            error={messagesPerField.getFirstError("password-confirm")}
                        />
                    </>
                )}

                <div style={{ marginTop: "0.5rem" }}>
                    <Button
                        type="submit"
                        id="kc-register"
                        variant="primary"
                        size="md"
                        fullWidth
                        isLoading={isSubmitting}
                    >
                        Create account ➔
                    </Button>
                </div>
            </form>
        </Template>
    );
}
