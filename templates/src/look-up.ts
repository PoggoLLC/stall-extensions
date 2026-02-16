/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ExtensionLookupGroup } from "@use-stall/types";

const to_page_path = (path: string, item: any) => {
  if (!item?.id) return path;
  return `${path}?id=${item.id}`;
};

export const LOOK_UP: ExtensionLookupGroup[] = [
  {
    id: "template-items",
    title: "Template Items",
    description: "Generic lookup group starter",
    data_origin: "local",
    source: "products",
    filters: [],
    sorting: {
      key: "title",
      order: "asc",
    },
    keys: {
      id: "id",
      image: "thumbnail",
      fallback: "./icons/product.svg",
      title: { value: "{{title}}", format: "string" },
      description: {
        value: "{{description}}",
        format: "none",
      },
    },
    actions: [
      {
        id: "view-template-item",
        label: "View Item",
        close_on_complete: true,
        reopen_on_return: true,
        run: ({ item, helpers }) => {
          if (!item) return;
          helpers.navigate(
            to_page_path("/extensions/extension-template/template-page", item),
          );
        },
      },
      {
        id: "open-template-page",
        label: "Open Template Page",
        close_on_complete: true,
        always_show: true,
        run: ({ helpers }) => {
          helpers.navigate("/extensions/extension-template/template-page");
        },
      },
    ],
  },
];
