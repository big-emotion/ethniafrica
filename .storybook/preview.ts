import type { Preview } from "@storybook/react";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "hsl(35, 35%, 97%)" },
        { name: "dark", value: "hsl(25, 20%, 12%)" },
        { name: "white", value: "#ffffff" },
      ],
    },
  },
  decorators: [
    (Story) => {
      if (typeof document !== "undefined") {
        const linkId = "storybook-google-fonts";
        if (!document.getElementById(linkId)) {
          const link = document.createElement("link");
          link.id = linkId;
          link.rel = "stylesheet";
          link.href =
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap";
          document.head.appendChild(link);
        }
      }
      return Story();
    },
  ],
};

export default preview;
