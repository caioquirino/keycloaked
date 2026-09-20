import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import { AccountLinkPrompt } from "@keycloaked/ui";

export default function LoginIdpLinkConfirm(
    props: PageProps<Extract<KcContext, { pageId: "login-idp-link-confirm.ftl" }>, I18n>
) {
    const { kcContext, i18n, doUseDefaultCss, Template, classes } = props;
    const { url, idpAlias } = kcContext;

    return (
        <Template
            kcContext={kcContext}
            i18n={i18n}
            doUseDefaultCss={doUseDefaultCss}
            classes={classes}
            displayMessage={false}
            headerNode="Account already exists"
            displayInfo={false}
        >
            <form
                id="kc-register-form"
                action={url.loginAction}
                method="post"
            >
                <input type="hidden" name="submitAction" value="linkAccount" />

                <AccountLinkPrompt
                    identifier={idpAlias ?? "your existing account"}
                    conflictingField="Identity Provider / Email"
                    sourceFactorName={idpAlias ?? "New credential"}
                    type="collision"
                    onLink={() => {
                        const form = document.getElementById("kc-register-form") as HTMLFormElement;
                        form?.submit();
                    }}
                    onUseDifferentValue={() => {
                        window.location.href = url.loginRestartFlowUrl;
                    }}
                    onCancel={() => {
                        window.location.href = url.loginRestartFlowUrl;
                    }}
                />
            </form>
        </Template>
    );
}
