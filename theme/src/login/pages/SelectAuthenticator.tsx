import { useState } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Badge } from "@keycloaked/ui";

interface EnrichedSelection {
    key: string;
    authExecId: string;
    channel?: "sms" | "email" | "whatsapp";
    icon: string;
    title: string;
    badge: string;
    badgeVariant: "blue" | "neutral";
    description: string;
}

function expandAuthenticationSelections(
    selections: Array<{ authExecId: string; displayName: string; helpText?: string; iconCssClass?: string }> | undefined
): EnrichedSelection[] {
    if (!selections || selections.length === 0) return [];

    const items: EnrichedSelection[] = [];

    for (const s of selections) {
        const text = `${s.displayName} ${s.helpText || ""}`.toLowerCase();

        // 1. WhatsApp OTP (whatsapp-otp-authenticator) -> Only present if phone number and whatsapp_enabled is configured!
        if (text.includes("whatsapp-otp") || text.includes("whatsapp verification") || text.includes("whatsapp otp") || text.includes("whatsapp")) {
            items.push({
                key: `${s.authExecId}-whatsapp`,
                authExecId: s.authExecId,
                channel: "whatsapp",
                icon: "💬",
                title: "WhatsApp Verification Code",
                badge: "WhatsApp",
                badgeVariant: "blue",
                description: "Receive a 6-digit one-time code via WhatsApp message"
            });
            continue;
        }

        // 2. SMS OTP (sms-otp-authenticator) -> Only present if phone number is configured for user!
        if (text.includes("sms-otp") || text.includes("sms verification") || text.includes("sms otp")) {
            items.push({
                key: `${s.authExecId}-sms`,
                authExecId: s.authExecId,
                channel: "sms",
                icon: "💬",
                title: "SMS Verification Code",
                badge: "Text Message",
                badgeVariant: "blue",
                description: "Receive a 6-digit one-time code on your mobile phone"
            });
            continue;
        }

        // 3. Email OTP (email-otp-authenticator) -> Only present if email is configured for user!
        if (text.includes("email-otp") || text.includes("email verification") || text.includes("email otp")) {
            items.push({
                key: `${s.authExecId}-email`,
                authExecId: s.authExecId,
                channel: "email",
                icon: "✉️",
                title: "Email Verification Code",
                badge: "Inbox Code",
                badgeVariant: "neutral",
                description: "Receive a 6-digit one-time code at your email address"
            });
            continue;
        }

        // 4. Fallback for legacy unified channel-otp
        if (text.includes("channel-otp") || text.includes("channel") || text.includes("keycloaked email")) {
            items.push({
                key: `${s.authExecId}-sms`,
                authExecId: s.authExecId,
                channel: "sms",
                icon: "💬",
                title: "SMS Verification Code",
                badge: "Text Message",
                badgeVariant: "blue",
                description: "Receive a 6-digit one-time code on your mobile phone"
            });
            items.push({
                key: `${s.authExecId}-email`,
                authExecId: s.authExecId,
                channel: "email",
                icon: "✉️",
                title: "Email Verification Code",
                badge: "Inbox Code",
                badgeVariant: "neutral",
                description: "Receive a 6-digit one-time code at your email address"
            });
            continue;
        }

        // 2. WebAuthn / Passkey
        if (text.includes("webauthn") || text.includes("passkey") || text.includes("biometric") || text.includes("security key")) {
            items.push({
                key: `${s.authExecId}-webauthn`,
                authExecId: s.authExecId,
                icon: "🔑",
                title: "Passkey or Biometrics",
                badge: "Recommended",
                badgeVariant: "blue",
                description: "Verify instantly using Touch ID, Face ID, or device passkey"
            });
            continue;
        }

        // 3. Authenticator App (TOTP - auth-otp-form)
        if (text.includes("otp-display-name") || text.includes("totp") || text.includes("authenticator app") || text.includes("otp form")) {
            items.push({
                key: `${s.authExecId}-totp`,
                authExecId: s.authExecId,
                icon: "📱",
                title: "Authenticator App (TOTP)",
                badge: "High Security",
                badgeVariant: "blue",
                description: "Enter the 6-digit code from Google Authenticator, 1Password, etc."
            });
            continue;
        }

        // 4. Password
        if (text.includes("password")) {
            items.push({
                key: `${s.authExecId}-password`,
                authExecId: s.authExecId,
                icon: "🔒",
                title: "Account Password",
                badge: "Password",
                badgeVariant: "neutral",
                description: "Sign in with your traditional account password"
            });
            continue;
        }

        // Fallback for any other provider
        items.push({
            key: s.authExecId,
            authExecId: s.authExecId,
            icon: "🔐",
            title: s.displayName,
            badge: "Security",
            badgeVariant: "neutral",
            description: s.helpText || "Verify your identity with this factor"
        });
    }

    // Desired priority order: Passkey -> TOTP -> WhatsApp -> SMS -> Email -> Password
    const orderPriority: Record<string, number> = {
        "Passkey or Biometrics": 1,
        "Authenticator App (TOTP)": 2,
        "WhatsApp Verification Code": 3,
        "SMS Verification Code": 4,
        "Email Verification Code": 5,
        "Account Password": 6
    };

    return items.sort((a, b) => (orderPriority[a.title] ?? 99) - (orderPriority[b.title] ?? 99));
}

export default function SelectAuthenticator(
    props: PageProps<Extract<KcContext, { pageId: "select-authenticator.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, auth } = kcContext;

    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    const enrichedItems = expandAuthenticationSelections(auth?.authenticationSelections);

    const handleSelect = (item: EnrichedSelection) => {
        setSelectedKey(item.key);
        const form = document.getElementById("kc-select-credential-form") as HTMLFormElement;
        if (!form) return;
        const execInput = document.getElementById("selected-exec-id") as HTMLInputElement;
        const chanInput = document.getElementById("selected-channel") as HTMLInputElement;
        if (execInput) execInput.value = item.authExecId;
        if (chanInput) chanInput.value = item.channel || "";
        form.submit();
    };

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode={
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span>Choose how to verify</span>
                    <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--keycloaked-text-muted, #626773)", fontWeight: 400 }}>
                        Select an alternative authentication factor registered to your account.
                    </p>
                </div>
            }
            displayInfo={false}
        >
            <form id="kc-select-credential-form" action={url.loginAction} method="post">
                <input type="hidden" id="selected-exec-id" name="authenticationExecution" value="" />
                <input type="hidden" id="selected-channel" name="channel" value="" />

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    {enrichedItems.map((item) => {
                        const isSelected = selectedKey === item.key;

                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => handleSelect(item)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "1rem",
                                    padding: "1.1rem 1.25rem",
                                    borderRadius: "var(--radius-lg, 16px)",
                                    border: `1.5px solid ${isSelected ? "var(--keycloaked-blue, #225EE2)" : "var(--keycloaked-border, #E2E8F0)"}`,
                                    backgroundColor: isSelected ? "var(--keycloaked-blue-subtle, #EBF1FD)" : "var(--keycloaked-bg-surface, #FFFFFF)",
                                    color: "var(--keycloaked-text, #191420)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s ease",
                                    boxShadow: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))"
                                }}
                            >
                                <div
                                    style={{
                                        width: "42px",
                                        height: "42px",
                                        borderRadius: "12px",
                                        backgroundColor: isSelected ? "var(--keycloaked-blue, #225EE2)" : "rgba(34, 94, 226, 0.08)",
                                        color: isSelected ? "#FFFFFF" : "var(--keycloaked-blue, #225EE2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "1.3rem",
                                        flexShrink: 0
                                    }}
                                >
                                    {item.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                                            {item.title}
                                        </span>
                                        <Badge variant={item.badgeVariant} size="sm">
                                            {item.badge}
                                        </Badge>
                                    </div>
                                    <div style={{ fontSize: "0.82rem", color: "var(--keycloaked-text-muted, #626773)", marginTop: "0.25rem" }}>
                                        {item.description}
                                    </div>
                                </div>
                                <span style={{ fontSize: "1.1rem", color: "var(--keycloaked-blue, #225EE2)", flexShrink: 0 }}>➔</span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ textAlign: "center" }}>
                    <a
                        href={url.loginRestartFlowUrl}
                        style={{
                            fontSize: "0.85rem",
                            color: "var(--keycloaked-text-muted, #626773)",
                            textDecoration: "none",
                            fontWeight: 500
                        }}
                    >
                        ← Sign in with a different account
                    </a>
                </div>
            </form>
        </Template>
    );
}
