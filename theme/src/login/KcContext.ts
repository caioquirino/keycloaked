/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { ExtendKcContext } from "keycloakify/login";
import type { KcEnvName, ThemeName } from "../kc.gen";

export type KcContextExtension = {
    themeName: ThemeName;
    properties: Record<KcEnvName, string> & {};
    // NOTE: Here you can declare more properties to extend the KcContext
    // See: https://docs.keycloakify.dev/faq-and-help/some-values-you-need-are-missing-from-in-kccontext
};

export type KcContextExtensionPerPage = {
    "login-otp.ftl": {
        channel?: string;
        destination?: string;
        destinationMasked?: string;
        canSwitch?: boolean;
        switchChannel?: string;
        switchLabel?: string;
        username?: string;
    };
    "login-channel-otp.ftl": {
        channel?: string;
        destination?: string;
        destinationMasked?: string;
        canSwitch?: boolean;
        switchChannel?: string;
        switchLabel?: string;
        username?: string;
    };
};

export type KcContext = ExtendKcContext<KcContextExtension, KcContextExtensionPerPage>;
