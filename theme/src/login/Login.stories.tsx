import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "./KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login.ftl" });

const meta = {
    title: "login/login.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <KcPageStory />
};

export const WithErrorMessage: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                message: {
                    type: "error",
                    summary: "Invalid username or password."
                }
            }}
        />
    )
};

export const WithWarningMessage: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                message: {
                    type: "warning",
                    summary: "Your session is about to expire."
                }
            }}
        />
    )
};

export const WithSocialProviders: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                social: {
                    displayInfo: true,
                    providers: [
                        {
                            loginUrl: "#google",
                            alias: "google",
                            providerId: "google",
                            displayName: "Google"
                        },
                        {
                            loginUrl: "#github",
                            alias: "github",
                            providerId: "github",
                            displayName: "GitHub"
                        },
                        {
                            loginUrl: "#microsoft",
                            alias: "microsoft",
                            providerId: "microsoft",
                            displayName: "Microsoft"
                        }
                    ]
                }
            }}
        />
    )
};

export const RegistrationDisabled: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                realm: {
                    registrationAllowed: false
                }
            }}
        />
    )
};
