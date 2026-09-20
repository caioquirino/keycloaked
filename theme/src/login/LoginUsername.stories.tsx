import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "./KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "login-username.ftl" });

const meta = {
    title: "login/login-username.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <KcPageStory />
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
                            loginUrl: "#apple",
                            alias: "apple",
                            providerId: "apple",
                            displayName: "Apple"
                        }
                    ]
                }
            }}
        />
    )
};

export const WithPrepopulatedIdentifier: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                login: {
                    username: "user@example.com"
                }
            }}
        />
    )
};
