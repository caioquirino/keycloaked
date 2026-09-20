import type { Meta, StoryObj } from "@storybook/react";
import { createKcPageStory } from "./KcPageStory";

const { KcPageStory } = createKcPageStory({ pageId: "error.ftl" });

const meta = {
    title: "login/error.ftl",
    component: KcPageStory
} satisfies Meta<typeof KcPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => <KcPageStory />
};

export const CustomError: Story = {
    render: () => (
        <KcPageStory
            kcContext={{
                message: {
                    type: "error",
                    summary: "An internal server error occurred while processing your request."
                }
            }}
        />
    )
};
