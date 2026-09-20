import { useEffect, useState } from "react";
import { useScript } from "keycloakify/login/pages/WebauthnAuthenticate.useScript";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { Button } from "@keycloaked/ui";

export default function WebauthnAuthenticate(
    props: PageProps<Extract<KcContext, { pageId: "webauthn-authenticate.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, authenticators } = kcContext;

    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const authButtonId = "authenticateWebAuthnButton";

    // Bind Keycloakify's native WebAuthn client script
    useScript({
        authButtonId,
        kcContext,
        i18n
    });

    useEffect(() => {
        // Automatically prompt the user for their passkey on page mount
        const timer = setTimeout(() => {
            const btn = document.getElementById(authButtonId);
            if (btn) {
                btn.click();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={true}
            headerNode="Sign in with Passkey"
            displayInfo={false}
        >
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                    style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        backgroundColor: "var(--keycloaked-blue-light, #EEF2FD)",
                        color: "var(--keycloaked-blue, #225EE2)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "2rem",
                        marginBottom: "1rem"
                    }}
                >
                    🔑
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--keycloaked-text, #191420)" }}>
                    Touch your passkey or sensor
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--keycloaked-text-muted, #626773)", margin: "0 auto 1.5rem auto", maxWidth: "340px" }}>
                    Your device will prompt you for Touch ID, Face ID, Windows Hello, or your security key.
                </p>

                {/* Form expected by Keycloak webauthnAuthenticate.js to POST response back */}
                <form id="webauth" action={url.loginAction} method="post" style={{ display: "none" }}>
                    <input type="hidden" id="clientDataJSON" name="clientDataJSON" />
                    <input type="hidden" id="authenticatorData" name="authenticatorData" />
                    <input type="hidden" id="signature" name="signature" />
                    <input type="hidden" id="credentialId" name="credentialId" />
                    <input type="hidden" id="userHandle" name="userHandle" />
                    <input type="hidden" id="error" name="error" />
                </form>

                {/* Hidden form read by getAllowCredentials() in webauthnAuthenticate.js */}
                {authenticators && authenticators.authenticators && (
                    <form id="authn_select" style={{ display: "none" }}>
                        {authenticators.authenticators.map((authenticator) => (
                            <input
                                key={authenticator.credentialId}
                                type="hidden"
                                name="authn_use_chk"
                                value={authenticator.credentialId}
                            />
                        ))}
                    </form>
                )}

                <div style={{ maxWidth: "380px", margin: "0 auto" }}>
                    <Button
                        type="button"
                        id={authButtonId}
                        variant="primary"
                        size="md"
                        fullWidth
                        isLoading={isAuthenticating}
                        onClick={() => {
                            setIsAuthenticating(true);
                        }}
                    >
                        {isAuthenticating ? "Waiting for sensor..." : "Verify with Passkey"}
                    </Button>
                </div>

                {authenticators && authenticators.authenticators && authenticators.authenticators.length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--keycloaked-text-muted, #626773)" }}>
                            Configured keys: {authenticators.authenticators.map((a) => a.label).join(", ")}
                        </span>
                    </div>
                )}

                <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <form action={url.loginAction} method="post" style={{ margin: 0 }}>
                        <input type="hidden" name="tryAnotherWay" value="on" />
                        <button
                            type="submit"
                            style={{
                                width: "100%",
                                padding: "0.85rem 1rem",
                                borderRadius: "var(--radius-lg, 14px)",
                                border: "1.5px solid var(--keycloaked-border, #E2E8F0)",
                                backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                                color: "var(--keycloaked-blue, #225EE2)",
                                fontSize: "0.88rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.5rem",
                                transition: "all 0.15s ease",
                                boxShadow: "var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))"
                            }}
                        >
                            <span>Can't use Passkey? Verify another way</span>
                            <span>➔</span>
                        </button>
                    </form>

                    <div style={{ textAlign: "center" }}>
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
                </div>
            </div>
        </Template>
    );
}
