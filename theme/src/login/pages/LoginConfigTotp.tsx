import { useState, useRef } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button, Input } from "@keycloaked/ui";

export default function LoginConfigTotp(
    props: PageProps<Extract<KcContext, { pageId: "login-config-totp.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, isAppInitiatedAction, totp, messagesPerField } = kcContext;

    const [activeTab, setActiveTab] = useState<"qr" | "manual">("qr");
    const [copied, setCopied] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [code, setCode] = useState("");
    const [deviceLabel, setDeviceLabel] = useState("");

    const formRef = useRef<HTMLFormElement>(null);

    const handleCopy = () => {
        if (totp.totpSecretEncoded) {
            navigator.clipboard.writeText(totp.totpSecretEncoded);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const hasTotpError = messagesPerField.existsError("totp");
    const hasLabelError = messagesPerField.existsError("userLabel");

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={!hasTotpError && !hasLabelError}
            headerNode={
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <span>Set up Authenticator App</span>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--keycloaked-text-muted, #626773)", fontWeight: 400 }}>
                        Use Google Authenticator, 1Password, or any TOTP authenticator
                    </p>
                </div>
            }
            displayInfo={false}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Method Tabs: QR Code vs Manual Key */}
                <div
                    style={{
                        display: "flex",
                        backgroundColor: "var(--keycloaked-bg-subtle, #F7F5F0)",
                        padding: "0.25rem",
                        borderRadius: "var(--radius-pill, 9999px)",
                        border: "1px solid var(--keycloaked-border, #E2E8F0)"
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setActiveTab("qr")}
                        style={{
                            flex: 1,
                            padding: "0.45rem 0.75rem",
                            borderRadius: "var(--radius-pill, 9999px)",
                            border: "none",
                            backgroundColor: activeTab === "qr" ? "var(--keycloaked-bg-surface, #FFFFFF)" : "transparent",
                            color: activeTab === "qr" ? "var(--keycloaked-text, #191420)" : "var(--keycloaked-text-muted, #626773)",
                            fontWeight: activeTab === "qr" ? 600 : 500,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: activeTab === "qr" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            transition: "all 0.15s ease"
                        }}
                    >
                        📷 Scan QR Code
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("manual")}
                        style={{
                            flex: 1,
                            padding: "0.45rem 0.75rem",
                            borderRadius: "var(--radius-pill, 9999px)",
                            border: "none",
                            backgroundColor: activeTab === "manual" ? "var(--keycloaked-bg-surface, #FFFFFF)" : "transparent",
                            color: activeTab === "manual" ? "var(--keycloaked-text, #191420)" : "var(--keycloaked-text-muted, #626773)",
                            fontWeight: activeTab === "manual" ? 600 : 500,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: activeTab === "manual" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                            transition: "all 0.15s ease"
                        }}
                    >
                        🔑 Enter Key Manually
                    </button>
                </div>

                {/* QR Code Presentation */}
                {activeTab === "qr" ? (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "1.25rem",
                            backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                            borderRadius: "var(--radius-lg, 16px)",
                            border: "1px solid var(--keycloaked-border, #E2E8F0)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.03)"
                        }}
                    >
                        <div
                            style={{
                                padding: "0.75rem",
                                backgroundColor: "#FFFFFF",
                                borderRadius: "12px",
                                border: "1px solid #E2E8F0"
                            }}
                        >
                            <img
                                id="kc-totp-secret-qr-code"
                                src={`data:image/png;base64, ${totp.totpSecretQrCode}`}
                                alt="TOTP QR Code"
                                style={{ display: "block", width: "160px", height: "160px" }}
                            />
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--keycloaked-text-muted, #626773)", textAlign: "center" }}>
                            Point your authenticator app's camera at this code
                        </span>
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                            padding: "1.25rem",
                            backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                            borderRadius: "var(--radius-lg, 16px)",
                            border: "1px solid var(--keycloaked-border, #E2E8F0)"
                        }}
                    >
                        <span style={{ fontSize: "0.825rem", color: "var(--keycloaked-text-muted, #626773)" }}>
                            Type this key into your authenticator app:
                        </span>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.75rem 1rem",
                                backgroundColor: "var(--keycloaked-bg-subtle, #F7F5F0)",
                                borderRadius: "var(--radius-md, 8px)",
                                border: "1px solid var(--keycloaked-border, #E2E8F0)",
                                fontFamily: "monospace",
                                fontSize: "1rem",
                                fontWeight: 700,
                                color: "var(--keycloaked-text, #191420)",
                                letterSpacing: "0.15em",
                                wordBreak: "break-all"
                            }}
                        >
                            <span>{totp.totpSecretEncoded}</span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                style={{
                                    marginLeft: "0.5rem",
                                    padding: "0.3rem 0.6rem",
                                    borderRadius: "var(--radius-sm, 6px)",
                                    border: "1px solid var(--keycloaked-border, #E2E8F0)",
                                    backgroundColor: copied ? "var(--keycloaked-blue, #225EE2)" : "var(--keycloaked-bg-surface, #FFFFFF)",
                                    color: copied ? "#FFFFFF" : "var(--keycloaked-text, #191420)",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap"
                                }}
                            >
                                {copied ? "✓ Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Enrollment Form */}
                <form
                    ref={formRef}
                    id="kc-totp-settings-form"
                    action={url.loginAction}
                    method="post"
                    onSubmit={() => {
                        setIsSubmitting(true);
                        return true;
                    }}
                    style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                >
                    <input type="hidden" id="totpSecret" name="totpSecret" value={totp.totpSecret} />

                    <div>
                        <Input
                            id="userLabel"
                            name="userLabel"
                            label="Device Name"
                            placeholder="e.g. My Phone, 1Password"
                            value={deviceLabel}
                            onChange={(e) => setDeviceLabel(e.target.value)}
                            error={messagesPerField.getFirstError("userLabel")}
                        />
                    </div>

                    <div>
                        <Input
                            id="totp"
                            name="totp"
                            label="6-Digit Verification Code"
                            placeholder="123456"
                            autoComplete="off"
                            inputMode="numeric"
                            value={code}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                                setCode(val);
                            }}
                            error={messagesPerField.getFirstError("totp")}
                        />
                    </div>

                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <Button
                            type="submit"
                            name="login"
                            id="kc-login"
                            variant="primary"
                            size="md"
                            fullWidth
                            disabled={code.length < 6 || isSubmitting}
                            isLoading={isSubmitting}
                        >
                            Save &amp; Continue
                        </Button>

                        {isAppInitiatedAction && (
                            <Button
                                type="submit"
                                name="cancel-action"
                                id="kc-cancel"
                                variant="outline"
                                size="md"
                                fullWidth
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </Template>
    );
}
