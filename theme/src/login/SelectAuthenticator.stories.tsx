import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "./KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "select-authenticator.ftl" });

const meta = {
    title: "login/select-authenticator.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllFactorsAvailable: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    authenticationSelections: [
                        {
                            authExecId: "webauthn-exec-id",
                            displayName: "webauthn-authenticator-passwordless-display-name",
                            helpText: "webauthn-authenticator-passwordless-help-text"
                        },
                        {
                            authExecId: "totp-exec-id",
                            displayName: "otp-display-name",
                            helpText: "otp-display-name"
                        },
                        {
                            authExecId: "sms-exec-id",
                            displayName: "sms-otp-authenticator-display-name",
                            helpText: "sms-otp-authenticator-help-text"
                        },
                        {
                            authExecId: "email-exec-id",
                            displayName: "email-otp-authenticator-display-name",
                            helpText: "email-otp-authenticator-help-text"
                        },
                        {
                            authExecId: "password-exec-id",
                            displayName: "auth-password-form-display-name",
                            helpText: "auth-password-form-help-text"
                        }
                    ]
                }
            }}
        />
    )
};

export const EmailOnlyUserNoPhone: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    authenticationSelections: [
                        {
                            authExecId: "totp-exec-id",
                            displayName: "otp-display-name",
                            helpText: "otp-display-name"
                        },
                        {
                            authExecId: "email-exec-id",
                            displayName: "email-otp-authenticator-display-name",
                            helpText: "email-otp-authenticator-help-text"
                        }
                    ]
                }
            }}
        />
    )
};

export const PhoneOnlyUserNoEmail: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    authenticationSelections: [
                        {
                            authExecId: "sms-exec-id",
                            displayName: "sms-otp-authenticator-display-name",
                            helpText: "sms-otp-authenticator-help-text"
                        }
                    ]
                }
            }}
        />
    )
};
