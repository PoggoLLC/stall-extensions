import { $ } from "bun";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

export interface BuildOptions {
  entry: string;
  output: string;
  tempOutput: string;
  dist: string;
  externalModules?: string[];
}

export interface SharedModule {
  name: string;
  globalPath: string;
}

const external_modules = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "sonner",
  "dexie-react-hooks",
  "framer-motion",
  "@use-stall/icons",
  "@use-stall/ui",
  "@use-stall/types",
  "@use-stall/core",
  "react-router-dom",
  "zustand",
  "zustand/middleware",
];

const DEFAULT_SHARED_MODULES: SharedModule[] = (() =>
  external_modules.map((module) => ({
    name: module,
    globalPath: `window.__STALL_SHARED_MODULES__["${module}"]`,
  })))();

const fixAs = (named: string): string => named.replace(/\s+as\s+/g, ":");

interface ReplacementRule {
  pattern: RegExp;
  replacement: string | ((...args: string[]) => string);
}

const generateReplacements = (module: SharedModule): ReplacementRule[] => {
  const moduleName = module.name;
  const globalPath = module.globalPath;
  const modulePath = `"${moduleName}"`;
  const modulePathNoSpace = `from"${moduleName}"`;

  return [
    {
      pattern: new RegExp(`import\\*as ([\\w$]+) from${modulePath}`, "g"),
      replacement: `const $1=${globalPath}`,
    },
    {
      pattern: new RegExp(`import\\*as ([\\w$]+)${modulePathNoSpace}`, "g"),
      replacement: `const $1=${globalPath}`,
    },
    {
      pattern: new RegExp(
        `import ([\\w$]+),\\{([^}]+)\\} from${modulePath}`,
        "g",
      ),
      replacement: (_match: string, def: string, named: string): string =>
        `const ${def}=${globalPath};const{${fixAs(named)}}=${globalPath}`,
    },
    {
      pattern: new RegExp(
        `import ([\\w$]+),\\{([^}]+)\\}${modulePathNoSpace}`,
        "g",
      ),
      replacement: (_match: string, def: string, named: string): string =>
        `const ${def}=${globalPath};const{${fixAs(named)}}=${globalPath}`,
    },
    {
      pattern: new RegExp(`import ([\\w$]+) from${modulePath}`, "g"),
      replacement: `const $1=${globalPath}`,
    },
    {
      pattern: new RegExp(`import ([\\w$]+)${modulePathNoSpace}`, "g"),
      replacement: `const $1=${globalPath}`,
    },
    {
      pattern: new RegExp(`import\\{([^}]+)\\} from${modulePath}`, "g"),
      replacement: (_match: string, named: string): string =>
        `const{${fixAs(named)}}=${globalPath}`,
    },
    {
      pattern: new RegExp(`import\\{([^}]+)\\}${modulePathNoSpace}`, "g"),
      replacement: (_match: string, named: string): string =>
        `const{${fixAs(named)}}=${globalPath}`,
    },
  ];
};

const postProcessCode = (
  code: string,
  sharedModules: SharedModule[] = DEFAULT_SHARED_MODULES,
): string => {
  let processedCode = code;

  for (const module of sharedModules) {
    const replacements = generateReplacements(module);
    for (const rule of replacements) {
      processedCode = processedCode.replace(
        rule.pattern,
        rule.replacement as any,
      );
    }
  }

  return processedCode;
};

export const rebuild = async (
  options: BuildOptions,
  sharedModules: SharedModule[] = DEFAULT_SHARED_MODULES,
): Promise<void> => {
  try {
    const { entry, output, tempOutput, dist, externalModules = [] } = options;

    mkdirSync(dist, { recursive: true });
    const externalArgs = externalModules.flatMap((m) => ["--external", m]);

    await $`bun build --minify --format=esm ${externalArgs} ${entry} --outfile ${tempOutput}`.quiet();
    let code = readFileSync(tempOutput, "utf-8");
    code = postProcessCode(code, sharedModules);

    const finalCode = `if(!window.__STALL_SHARED_MODULES__)throw new Error("Shared modules not available");${code}`;
    writeFileSync(output, finalCode);

    const date = new Date().toLocaleTimeString();
    console.log(`[✓] Built at ${date}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Build failed";
    console.error(`[x] Build error: ${message}`);
  }
};

export const getDefaultBuildOptions = (
  overrides?: Partial<BuildOptions>,
): BuildOptions => {
  return {
    entry: "./src/index.ts",
    dist: "dist",
    output: "dist/index.js",
    tempOutput: "dist/temp.js",
    externalModules: external_modules,
    ...overrides,
  };
};
