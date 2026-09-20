import { useEffect } from "react";
import type { TemplateProps } from "keycloakify/login/TemplateProps";
import { useSetClassName } from "keycloakify/tools/useSetClassName";
import { useInitialize } from "keycloakify/login/Template.useInitialize";
import type { I18n } from "./i18n";
import type { KcContext } from "./KcContext";
import { Logo, Card, Alert, ThemeToggle, useTheme } from "@keycloaked/ui";

export default function Template(props: TemplateProps<KcContext, I18n>) {
    const {
        displayMessage = true,
        headerNode,
        socialProvidersNode = null,
        infoNode = null,
        documentTitle,
        kcContext,
        i18n,
        children
    } = props;

    // Use theme hook to synchronize with system or URL query param (?theme=dark|light)
    const { theme } = useTheme();

    const { currentLanguage, enabledLanguages } = i18n;
    const { realm, message } = kcContext;

    useEffect(() => {
        document.title = documentTitle ?? `${realm.displayName || realm.name} | Keycloaked`;
    }, [documentTitle, realm.displayName, realm.name]);

    useSetClassName({
        qualifiedName: "html",
        className: "keycloaked-keycloak-html"
    });

    useSetClassName({
        qualifiedName: "body",
        className: "keycloaked-keycloak-body"
    });

    const { isReadyToRender } = useInitialize({ kcContext, doUseDefaultCss: false });

    if (!isReadyToRender) {
        return null;
    }

    const alertType = message?.type === "error" ? "error" : message?.type === "warning" ? "warning" : "info";

    return (
        <div
            className="keycloaked-auth-viewport"
            data-theme-active={theme}
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem 1rem",
                backgroundColor: "var(--keycloaked-bg, #FCFAF6)",
                fontFamily: "var(--font-keycloaked, 'Plus Jakarta Sans', sans-serif)",
                color: "var(--keycloaked-text, #191420)",
                position: "relative",
                overflow: "hidden",
                transition: "background-color 0.25s ease, color 0.25s ease"
            }}
        >
            {/* Background Decorative Accent Gradients */}
            <div
                style={{
                    position: "absolute",
                    top: "-15%",
                    right: "-10%",
                    width: "45vw",
                    height: "45vw",
                    background: "radial-gradient(circle, var(--glow-coral, rgba(255,128,72,0.18)) 0%, transparent 70%)",
                    pointerEvents: "none",
                    filter: "blur(90px)"
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "-15%",
                    left: "-10%",
                    width: "45vw",
                    height: "45vw",
                    background: "radial-gradient(circle, var(--glow-blue, rgba(34,94,226,0.15)) 0%, transparent 70%)",
                    pointerEvents: "none",
                    filter: "blur(90px)"
                }}
            />

            {/* Top Controls: Theme Toggle & Language Switcher */}
            <div
                style={{
                    position: "absolute",
                    top: "1.5rem",
                    right: "2rem",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                }}
            >
                <ThemeToggle />

                {enabledLanguages.length > 1 && (
                    <select
                        value={currentLanguage.languageTag}
                        onChange={(e) => {
                            const selected = enabledLanguages.find(l => l.languageTag === e.target.value);
                            if (selected) {
                                window.location.href = selected.href;
                            }
                        }}
                        style={{
                            padding: "0.4rem 0.8rem",
                            borderRadius: "var(--radius-pill, 9999px)",
                            border: "1px solid var(--keycloaked-border, #E2E8F0)",
                            backgroundColor: "var(--keycloaked-bg-surface, #FFFFFF)",
                            color: "var(--keycloaked-text, #191420)",
                            fontFamily: "inherit",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            outline: "none"
                        }}
                    >
                        {enabledLanguages.map((lang) => (
                            <option key={lang.languageTag} value={lang.languageTag}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Central Auth Container */}
            <div style={{ width: "100%", maxWidth: "440px", zIndex: 1 }}>
                <Card
                    variant="elevated"
                    padding="lg"
                    style={{
                        borderRadius: "var(--radius-xl, 24px)",
                        boxShadow: "var(--shadow-elevated, 0 24px 48px -12px rgba(25, 20, 32, 0.12))",
                        border: "1px solid var(--keycloaked-border, #E2E8F0)"
                    }}
                >
                    {/* Header with Keycloaked Logo */}
                    <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                        <div style={{ display: "inline-flex", marginBottom: "1rem" }}>
                            <Logo variant="blue" size="lg" />
                        </div>
                        {headerNode && (
                            <h1
                                style={{
                                    fontSize: "1.4rem",
                                    fontWeight: 700,
                                    letterSpacing: "-0.02em",
                                    color: "var(--keycloaked-text, #191420)",
                                    margin: 0
                                }}
                            >
                                {headerNode}
                            </h1>
                        )}
                        <p style={{ color: "var(--keycloaked-text-muted, #626773)", fontSize: "0.88rem", marginTop: "0.35rem" }}>
                            {realm.displayName ? `${realm.displayName} · Secure Access` : "Find and finance your home"}
                        </p>
                    </div>

                    {/* Server Error / Info Alert Banner */}
                    {displayMessage && message !== undefined && (
                        <div style={{ marginBottom: "1.25rem" }}>
                            <Alert type={alertType}>
                                <span dangerouslySetInnerHTML={{ __html: message.summary }} />
                            </Alert>
                        </div>
                    )}

                    {/* Form Body */}
                    {children}

                    {/* Social Providers */}
                    {socialProvidersNode}

                    {/* Additional Links / Registration */}
                    {infoNode && (
                        <div
                            style={{
                                marginTop: "1.5rem",
                                paddingTop: "1.25rem",
                                borderTop: "1px solid var(--keycloaked-border, #E2E8F0)",
                                textAlign: "center",
                                fontSize: "0.88rem",
                                color: "var(--keycloaked-text-muted, #626773)"
                            }}
                        >
                            {infoNode}
                        </div>
                    )}
                </Card>

                {/* Footer */}
                <div
                    style={{
                        textAlign: "center",
                        marginTop: "1.75rem",
                        fontSize: "0.78rem",
                        color: "var(--keycloaked-text-subtle, #9499A5)"
                    }}
                >
                    Protected by Keycloak &middot; Powered by Keycloaked Design System
                </div>
            </div>
        </div>
    );
}
