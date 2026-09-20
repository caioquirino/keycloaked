import { useState, useEffect, useRef } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button, Badge } from "@keycloaked/ui";

export default function LoginOtp(
    props: PageProps<
        Extract<KcContext, { pageId: "login-otp.ftl" | "login-channel-otp.ftl" }>,
        I18n
    >
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, messagesPerField } = kcContext;

    // Multi-channel OTP attributes (passed by ChannelOtpAuthenticator or extended KcContext)
    const ctx = kcContext as any;
    const channel: "sms" | "whatsapp" | "email" | undefined = ctx.channel;
    const destination: string | undefined = ctx.destination || ctx.destinationMasked;
    const canSwitch: boolean = Boolean(ctx.canSwitch);
    const switchChannel: string | undefined = ctx.switchChannel;
    const switchLabel: string | undefined = ctx.switchLabel;
    const attemptedUsername: string = ctx.auth?.attemptedUsername || ctx.username || "";

    // Standard Keycloak TOTP attributes
    const otpLogin = (kcContext as Extract<KcContext, { pageId: "login-otp.ftl" }>).otpLogin;
    const userOtpCredentials = otpLogin?.userOtpCredentials || [];
    const selectedCredentialId = otpLogin?.selectedCredentialId;

    const [code, setCode] = useState("");
    const [action, setAction] = useState<"submit_code" | "switch_channel" | "resend">("submit_code");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Auto-focus on load
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // 30s countdown timer for Resend
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const hasError = messagesPerField.existsError("totp") || messagesPerField.existsError("code");
    const errorMessage = messagesPerField.getFirstError("totp") || messagesPerField.getFirstError("code");

    const isChannelOtp = Boolean(channel || destination);

    const handleSwitchChannel = () => {
        setAction("switch_channel");
        setIsSubmitting(true);
        setTimeout(() => {
            formRef.current?.submit();
        }, 50);
    };

    const handleResend = () => {
        if (resendCooldown > 0) return;
        setAction("resend");
        setIsSubmitting(true);
        setResendCooldown(30);
        setTimeout(() => {
            formRef.current?.submit();
        }, 50);
    };

    const handleTryAnotherWay = () => {
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
    };

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasError}
            headerNode={
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>
                            {isChannelOtp
                                ? channel === "whatsapp"
                                    ? "WhatsApp Verification"
                                    : channel === "sms"
                                    ? "SMS Verification"
                                    : "Email Verification"
                                : "Two-Factor Verification"}
                        </span>
                    </div>

                    {attemptedUsername && (
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "var(--radius-pill, 9999px)",
                                backgroundColor: "var(--keycloaked-bg-subtle, #F7F5F0)",
                                border: "1px solid var(--keycloaked-border, #E2E8F0)",
                                alignSelf: "flex-start",
                                fontSize: "0.825rem",
                                color: "var(--keycloaked-text, #191420)",
                                fontWeight: 500
                            }}
                        >
                            <span>{attemptedUsername}</span>
                            {url.loginRestartFlowUrl && (
                                <a
                                    href={url.loginRestartFlowUrl}
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--keycloaked-blue, #225EE2)",
                                        fontWeight: 600,
                                        textDecoration: "none"
                                    }}
                                >
                                    Edit
                                </a>
                            )}
                        </div>
                    )}
                </div>
            }
            displayInfo={false}
        >
            <form
                ref={formRef}
                id="kc-otp-login-form"
                action={url.loginAction}
                method="post"
                onSubmit={() => {
                    setIsSubmitting(true);
                    return true;
                }}
                style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
                {/* Hidden inputs to bridge both standard Keycloak OTP (otp) and Channel OTP (code + action) */}
                <input type="hidden" name="action" id="otp-action" value={action} />
                <input type="hidden" name="otp" value={code} />
                <input type="hidden" name="code" value={code} />

                {/* Subtitle / Delivery Info */}
                <div style={{ marginTop: "-0.25rem" }}>
                    {isChannelOtp && destination ? (
                        <p
                            style={{
                                margin: 0,
                                fontSize: "0.9rem",
                                color: "var(--keycloaked-text-muted, #626773)",
                                lineHeight: 1.5
                            }}
                        >
                            We sent a 6-digit verification code{" "}
                            {channel === "whatsapp"
                                ? "to your WhatsApp at "
                                : channel === "sms"
                                ? "via SMS to "
                                : "to "}
                            <strong style={{ color: "var(--keycloaked-text, #191420)", fontWeight: 600 }}>
                                {destination}
                            </strong>
                            .
                        </p>
                    ) : (
                        <p
                            style={{
                                margin: 0,
                                fontSize: "0.9rem",
                                color: "var(--keycloaked-text-muted, #626773)",
                                lineHeight: 1.5
                            }}
                        >
                            Enter the 6-digit security code generated by your authenticator app.
                        </p>
                    )}
                </div>

                {/* Authenticator selection (if multiple TOTP devices are enrolled) */}
                {userOtpCredentials.length > 1 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label
                            style={{
                                fontSize: "0.85rem",
                                fontWeight: 500,
                                color: "var(--keycloaked-text, #191420)"
                            }}
                        >
                            Select Device:
                        </label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            {userOtpCredentials.map((cred) => (
                                <label
                                    key={cred.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: "var(--radius-md, 8px)",
                                        border: "1px solid var(--keycloaked-border, #E2E8F0)",
                                        backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                                        fontSize: "0.85rem",
                                        cursor: "pointer"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="selectedCredentialId"
                                        value={cred.id}
                                        defaultChecked={cred.id === selectedCredentialId}
                                        style={{ accentColor: "var(--keycloaked-blue, #225EE2)" }}
                                    />
                                    <span>{cred.userLabel}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* 6-Digit Code Input Box */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label
                        htmlFor="kc-otp-input"
                        style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--keycloaked-text, #191420)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                        }}
                    >
                        <span>Verification Code</span>
                        {isChannelOtp && (
                            <Badge
                                variant={channel === "whatsapp" ? "success" : channel === "sms" ? "coral" : "blue"}
                                size="sm"
                            >
                                {channel === "whatsapp"
                                    ? "WhatsApp OTP"
                                    : channel === "sms"
                                    ? "SMS OTP"
                                    : "Email OTP"}
                            </Badge>
                        )}
                    </label>

                    <div style={{ position: "relative" }}>
                        <input
                            ref={inputRef}
                            id="kc-otp-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete="one-time-code"
                            autoFocus
                            placeholder="······"
                            value={code}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                                setCode(val);
                            }}
                            onPaste={(e) => {
                                e.preventDefault();
                                const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
                                setCode(paste);
                            }}
                            style={{
                                width: "100%",
                                boxSizing: "border-box",
                                height: "3.5rem",
                                padding: "0 1rem",
                                fontSize: "1.75rem",
                                fontWeight: 700,
                                fontFamily: "monospace, 'Plus Jakarta Sans', sans-serif",
                                letterSpacing: "0.35em",
                                textAlign: "center",
                                borderRadius: "var(--radius-lg, 12px)",
                                border: hasError
                                    ? "2px solid var(--keycloaked-danger, #EF4444)"
                                    : "1.5px solid var(--keycloaked-border, #E2E8F0)",
                                backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                                color: "var(--keycloaked-text, #191420)",
                                outline: "none",
                                transition: "all 0.15s ease",
                                boxShadow: hasError
                                    ? "0 0 0 3px rgba(239, 68, 68, 0.15)"
                                    : "0 1px 2px rgba(0,0,0,0.04)"
                            }}
                        />
                    </div>

                    {hasError && errorMessage && (
                        <span
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--keycloaked-danger, #EF4444)",
                                marginTop: "0.2rem",
                                fontWeight: 500
                            }}
                        >
                            {errorMessage}
                        </span>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <Button
                        type="submit"
                        name="login"
                        id="kc-login"
                        variant="primary"
                        size="md"
                        fullWidth
                        disabled={code.length < 6 || isSubmitting}
                        isLoading={isSubmitting && action === "submit_code"}
                    >
                        Verify &amp; Continue
                    </Button>

                    {/* Live Channel Switching (SMS <-> Email) */}
                    {canSwitch && (
                        <button
                            type="button"
                            onClick={handleSwitchChannel}
                            disabled={isSubmitting}
                            style={{
                                background: "none",
                                border: "1.5px solid var(--keycloaked-border, #E2E8F0)",
                                borderRadius: "var(--radius-md, 12px)",
                                padding: "0.65rem 1rem",
                                color: "var(--keycloaked-blue, #225EE2)",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                backgroundColor: "var(--keycloaked-blue-subtle, #EBF1FD)",
                                textAlign: "center"
                            }}
                        >
                            {switchLabel || `Send code via ${switchChannel === "whatsapp" ? "WhatsApp" : switchChannel === "sms" ? "SMS" : "Email"}`}
                        </button>
                    )}

                    {/* Prominent Recovery Card for Authenticator App (TOTP) */}
                    {!isChannelOtp && (
                        <div
                            style={{
                                padding: "0.85rem 1rem",
                                borderRadius: "var(--radius-lg, 14px)",
                                backgroundColor: "var(--keycloaked-bg-subtle, #F7F5F0)",
                                border: "1px solid var(--keycloaked-border, #E2E8F0)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.4rem",
                                marginTop: "0.25rem",
                                textAlign: "left"
                            }}
                        >
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--keycloaked-text, #191420)" }}>
                                Don't have your Authenticator App?
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--keycloaked-text-muted, #626773)" }}>
                                Sign in with a one-time code sent to your phone/email or with a Passkey.
                            </div>
                            <button
                                type="button"
                                onClick={handleTryAnotherWay}
                                style={{
                                    alignSelf: "flex-start",
                                    padding: "0.4rem 0.85rem",
                                    borderRadius: "var(--radius-pill, 9999px)",
                                    backgroundColor: "var(--keycloaked-blue, #225EE2)",
                                    color: "#FFFFFF",
                                    border: "none",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    marginTop: "0.25rem"
                                }}
                            >
                                Verify another way ➔
                            </button>
                        </div>
                    )}

                    {/* Resend Code Link */}
                    {isChannelOtp && (
                        <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || isSubmitting}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: resendCooldown > 0
                                        ? "var(--keycloaked-text-muted, #626773)"
                                        : "var(--keycloaked-text-muted, #626773)",
                                    fontSize: "0.825rem",
                                    cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                                    padding: "0.25rem",
                                    textDecoration: "none"
                                }}
                            >
                                Didn't receive the code?{" "}
                                <strong
                                    style={{
                                        color: resendCooldown > 0
                                            ? "var(--keycloaked-text-muted, #626773)"
                                            : "var(--keycloaked-blue, #225EE2)",
                                        textDecoration: resendCooldown > 0 ? "none" : "underline"
                                    }}
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                                </strong>
                            </button>
                        </div>
                    )}

                    {/* Intuitive Try Another Way Link for Channel OTP */}
                    {isChannelOtp && (
                        <div style={{ textAlign: "center", marginTop: "0.25rem" }}>
                            <button
                                type="button"
                                onClick={handleTryAnotherWay}
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
                                Can't receive code? Verify another way ➔
                            </button>
                        </div>
                    )}

                    {/* Return / Change Account */}
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
