import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "./KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-otp.ftl" });

const meta = {
    title: "login/login-otp.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StandardTotp: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    attemptedUsername: "jane.doe@example.com"
                }
            }}
        />
    )
};

export const MultiChannelOtpSms: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    attemptedUsername: "user@example.com"
                },
                channel: "sms",
                destination: "+316 ••••• 0000",
                canSwitch: true,
                switchChannel: "email",
                switchLabel: "Send code via Email to u•••••r@example.com"
            } as any}
        />
    )
};

export const MultiChannelOtpEmail: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    attemptedUsername: "user@example.com"
                },
                channel: "email",
                destination: "u•••••r@example.com",
                canSwitch: true,
                switchChannel: "sms",
                switchLabel: "Send code via SMS to +316 ••••• 0000"
            } as any}
        />
    )
};

export const WithInvalidCodeError: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                auth: {
                    attemptedUsername: "user@example.com"
                },
                channel: "sms",
                destination: "+316 ••••• 0000",
                message: {
                    type: "error",
                    summary: "Invalid verification code. Please try again."
                }
            } as any}
        />
    )
};
