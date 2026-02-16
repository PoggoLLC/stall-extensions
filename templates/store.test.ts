import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type {
  ExtensionLookupAction,
  ExtensionLookupGroup,
  StallExtension,
  StallExtensionConfig,
} from "@use-stall/types";
import { app, config, ui, utils } from "./src/index";
import { getDefaultBuildOptions } from "./stall.build";

const extension_app: StallExtension = app;
const extension_config = config as StallExtensionConfig;

const is_non_empty_string = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const get_source_files = (base_dir: string): string[] => {
  const results: string[] = [];
  const queue = [base_dir];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const entries = readdirSync(current);

    for (const entry of entries) {
      const full_path = join(current, entry);
      const stat = statSync(full_path);

      if (stat.isDirectory()) {
        queue.push(full_path);
        continue;
      }

      if (!/\.(ts|tsx|js|jsx)$/i.test(entry)) continue;
      results.push(full_path);
    }
  }

  return results;
};

describe("Extension Architecture Contract", () => {
  test("required root files exist", () => {
    const required_files = [
      "stall.config.ts",
      "stall.build.ts",
      "src/index.ts",
      "src/app.ts",
      "src/ui.tsx",
      "src/extension.json",
    ];

    for (const file_path of required_files) {
      expect(existsSync(file_path)).toBe(true);
    }
  });

  test("index exports extension modules", () => {
    expect(extension_app).toBeDefined();
    expect(extension_config).toBeDefined();
    expect(ui).toBeDefined();
    expect(utils).toBeDefined();
  });

  test("config shape is valid", () => {
    expect(is_non_empty_string(extension_config.id)).toBe(true);
    expect(is_non_empty_string(extension_config.name)).toBe(true);
    expect(is_non_empty_string(extension_config.description)).toBe(true);
    expect(is_non_empty_string(extension_config.icon)).toBe(true);
    expect(is_non_empty_string(extension_config.version)).toBe(true);
    expect(Array.isArray(extension_config.keywords)).toBe(true);
    expect(Array.isArray(extension_config.authors)).toBe(true);
    expect(typeof extension_config.offline_ready).toBe("boolean");
    expect(is_non_empty_string(extension_config.entrypoint.id)).toBe(true);
    expect(["lookup", "page"]).toContain(extension_config.entrypoint.type);
  });

  test("app shape is valid", () => {
    expect(Array.isArray(extension_app.pages)).toBe(true);
    expect(Array.isArray(extension_app.lookup)).toBe(true);
  });

  test("pages are well-defined and unique", () => {
    const page_ids = new Set<string>();

    for (const page of extension_app.pages) {
      expect(typeof page.index).toBe("boolean");
      expect(is_non_empty_string(page.id)).toBe(true);
      expect(is_non_empty_string(page.title)).toBe(true);
      expect(is_non_empty_string(page.description)).toBe(true);
      expect(is_non_empty_string(page.ui)).toBe(true);

      expect(page_ids.has(page.id)).toBe(false);
      page_ids.add(page.id);
    }
  });

  test("ui components map contains all page ui keys", () => {
    const components = (ui as { components?: Record<string, unknown> })
      .components;
    expect(components && typeof components === "object").toBe(true);

    for (const page of extension_app.pages) {
      const component_type = typeof components?.[page.ui];
      expect(["function", "object"]).toContain(component_type);
      expect(components?.[page.ui]).toBeTruthy();
    }
  });

  test("lookup groups and actions match contract", () => {
    const all_group_ids = new Set<string>();

    for (const group of extension_app.lookup as ExtensionLookupGroup[]) {
      expect(is_non_empty_string(group.id)).toBe(true);
      expect(is_non_empty_string(group.title)).toBe(true);
      expect(is_non_empty_string(group.description)).toBe(true);
      expect(["local", "remote"]).toContain(group.data_origin);
      expect(Array.isArray(group.filters)).toBe(true);
      expect(group.sorting && typeof group.sorting === "object").toBe(true);
      expect(is_non_empty_string(group.sorting.key)).toBe(true);
      expect(["asc", "desc"]).toContain(group.sorting.order);
      expect(group.keys && typeof group.keys === "object").toBe(true);
      expect(is_non_empty_string(group.keys.id)).toBe(true);
      expect(is_non_empty_string(group.keys.image)).toBe(true);
      expect(group.keys.title && typeof group.keys.title === "object").toBe(
        true,
      );
      expect(is_non_empty_string(group.keys.title.value)).toBe(true);
      expect(
        [
          "string",
          "number",
          "array",
          "date",
          "price",
          "status",
          "none",
        ],
      ).toContain(group.keys.title.format);
      expect(Array.isArray(group.actions)).toBe(true);

      if (group.data_origin === "local") {
        expect(is_non_empty_string(group.source)).toBe(true);
      } else {
        expect(is_non_empty_string(group.source)).toBe(true);
        expect(typeof group.fetch).toBe("function");
      }

      expect(all_group_ids.has(group.id)).toBe(false);
      all_group_ids.add(group.id);

      const action_ids = new Set<string>();
      for (const action of group.actions as ExtensionLookupAction[]) {
        expect(is_non_empty_string(action.id)).toBe(true);
        expect(is_non_empty_string(action.label)).toBe(true);
        expect(typeof action.run).toBe("function");

        if (action.paths) {
          expect(Array.isArray(action.paths)).toBe(true);
          for (const path of action.paths) {
            expect(is_non_empty_string(path)).toBe(true);
            expect(path.startsWith("/")).toBe(true);
          }
        }

        if (action.static_args !== undefined) {
          expect(typeof action.static_args).toBe("object");
          expect(action.static_args).not.toBeNull();
        }

        if (action.close_on_complete !== undefined) {
          expect(typeof action.close_on_complete).toBe("boolean");
        }

        expect(action_ids.has(action.id)).toBe(false);
        action_ids.add(action.id);
      }
    }
  });

  test("entrypoint points to an existing app target", () => {
    if (extension_config.entrypoint.type === "lookup") {
      const has_lookup = extension_app.lookup.some(
        (group) => group.id === extension_config.entrypoint.id,
      );
      expect(has_lookup).toBe(true);
      return;
    }

    const has_page = extension_app.pages.some(
      (page) => page.id === extension_config.entrypoint.id,
    );
    expect(has_page).toBe(true);
  });

  test("build defaults follow extension bundling contract", () => {
    const defaults = getDefaultBuildOptions();

    expect(defaults.entry).toBe("./src/index.ts");
    expect(defaults.dist).toBe("dist");
    expect(defaults.output).toBe("dist/index.js");
    expect(defaults.tempOutput).toBe("dist/temp.js");
    expect(Array.isArray(defaults.externalModules)).toBe(true);
    expect(defaults.externalModules).toContain("react");
    expect(defaults.externalModules).toContain("@use-stall/types");
  });

  test("source files do not contain high-risk runtime patterns", () => {
    const source_files = get_source_files("src");
    const blocked_patterns = [
      /eval\(/,
      /new Function\(/,
      /child_process/,
      /Bun\.spawn\(/,
      /execSync\(/,
      /spawnSync\(/,
      /Deno\.run\(/,
    ];
    const matches: string[] = [];

    for (const file_path of source_files) {
      const content = readFileSync(file_path, "utf-8");
      for (const pattern of blocked_patterns) {
        if (!pattern.test(content)) continue;
        matches.push(`${file_path} -> ${pattern}`);
      }
    }

    expect(matches).toHaveLength(0);
  });
});
