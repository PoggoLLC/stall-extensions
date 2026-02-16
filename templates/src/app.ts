import type { StallExtension } from "@use-stall/types";
import { LOOK_UP } from "./look-up";

const app: StallExtension = {
  pages: [
    {
      index: false,
      id: "template-page",
      title: "Template Page",
      description: "A starter page for your extension",
      ui: "template_page",
    },
  ],
  lookup: LOOK_UP,
};

export default app;
