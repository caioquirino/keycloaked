import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "./KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-config-totp.ftl" });

const meta = {
    title: "login/login-config-totp.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                totp: {
                    totpSecretEncoded: "JBSWY3DPEHPK3PXP",
                    totpSecret: "JBSWY3DPEHPK3PXP",
                    totpSecretQrCode: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
                    qrUrl: "#",
                    manualUrl: "#",
                    policy: {
                        type: "totp",
                        algorithm: "HmacSHA1",
                        digits: 6,
                        period: 30,
                        lookAheadWindow: 1,
                        getAlgorithmKey: () => "HmacSHA1"
                    },
                    supportedApplications: ["Google Authenticator", "1Password"],
                    username: "user@example.com",
                    otpCredentials: []
                }
            }}
        />
    )
};
