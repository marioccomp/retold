/**
 * Import extraction and resolution, per language, with plain regexes.
 *
 * Deliberately lightweight (no compiler, no tree-sitter): the goal is a good
 * enough dependency graph to rank files by importance, not exact semantics.
 * Known gaps: conditional/dynamic imports built from variables, C# namespaces,
 * PHP. Unresolved imports are counted, never guessed.
 */
import path from "path";

export type ImportLanguage =
  | "js"
  | "python"
  | "go"
  | "jvm"
  | "c"
  | "rust"
  | "ruby"
  | "gdscript";

const EXTENSION_LANGUAGE: Record<string, ImportLanguage> = {
  ".ts": "js",
  ".tsx": "js",
  ".js": "js",
  ".jsx": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".vue": "js",
  ".svelte": "js",
  ".py": "python",
  ".go": "go",
  ".java": "jvm",
  ".kt": "jvm",
  ".c": "c",
  ".h": "c",
  ".cc": "c",
  ".cpp": "c",
  ".cxx": "c",
  ".hpp": "c",
  ".hh": "c",
  ".rs": "rust",
  ".rb": "ruby",
  ".gd": "gdscript",
};

export function importLanguageOf(filePath: string): ImportLanguage | null {
  return EXTENSION_LANGUAGE[path.posix.extname(filePath).toLowerCase()] ?? null;
}

function matchAll(content: string, pattern: RegExp, group = 1) {
  return [...content.matchAll(pattern)].map((m) => m[group]).filter(Boolean);
}

/** Raw import specifiers found in a file, as written in the source. */
export function extractImports(content: string, language: ImportLanguage): string[] {
  switch (language) {
    case "js":
      return [
        ...matchAll(content, /\b(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"'\n]+)["']/g),
        ...matchAll(content, /\brequire\(\s*["']([^"'\n]+)["']\s*\)/g),
        ...matchAll(content, /\bimport\(\s*["']([^"'\n]+)["']\s*\)/g),
      ];
    case "python": {
      // Names end at the end of the line, unless parenthesized (which may span lines).
      const fromImports = [...content.matchAll(/^[ \t]*from\s+([.\w]+)\s+import\s+(\([^)]*\)|[^\n#]+)/gm)].flatMap(
        ([, module, names]) => {
          // "from . import a, b" imports modules a and b of the current package.
          if (/^\.+$/.test(module)) {
            return names
              .replace(/[()]/g, "")
              .split(",")
              .map((n) => n.trim().split(/\s+as\s+/)[0])
              .filter((n) => n && n !== "*")
              .map((n) => `${module}${n}`);
          }
          return [module];
        }
      );
      const plainImports = [...content.matchAll(/^\s*import\s+([\w.]+(?:\s+as\s+\w+)?(?:\s*,\s*[\w.]+(?:\s+as\s+\w+)?)*)/gm)].flatMap(
        ([, list]) => list.split(",").map((part) => part.trim().split(/\s+as\s+/)[0])
      );
      return [...fromImports, ...plainImports];
    }
    case "go": {
      const single = matchAll(content, /^\s*import\s+(?:[\w.]+\s+)?"([^"]+)"/gm);
      const blocks = matchAll(content, /^\s*import\s*\(([\s\S]*?)\)/gm).flatMap((block) =>
        matchAll(block, /"([^"]+)"/g)
      );
      return [...single, ...blocks];
    }
    case "jvm":
      return matchAll(content, /^\s*import\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;?\s*$/gm);
    case "c":
      return [
        ...matchAll(content, /^\s*#\s*include\s*"([^"]+)"/gm),
        // <...> includes count only when they resolve to a repository file (-Iinclude style).
        ...matchAll(content, /^\s*#\s*include\s*<([^>]+)>/gm).map((m) => `<${m}>`),
      ];
    case "rust": {
      const uses = [...content.matchAll(/^\s*(?:pub(?:\([\w:]+\))?\s+)?use\s+([^;]+);/gm)].flatMap(
        ([, tree]) => expandRustUseTree(tree.replace(/\s+/g, ""))
      );
      return [
        ...matchAll(content, /^\s*(?:pub(?:\([\w:]+\))?\s+)?mod\s+(\w+)\s*;/gm).map((m) => `mod:${m}`),
        ...uses,
      ];
    }
    case "ruby":
      return matchAll(content, /^\s*require_relative\s+["']([^"']+)["']/gm).map((m) => `./${m}`);
    case "gdscript":
      return matchAll(content, /\b(?:pre)?load\(\s*["']res:\/\/([^"']+)["']\s*\)/g).map((m) => `res://${m}`);
  }
}

/** Facts about the repository needed to resolve specifiers to files. */
export type ResolutionContext = {
  /** All repository files (POSIX relative paths). */
  files: Set<string>;
  /** TS/JS path aliases, from tsconfig/jsconfig `paths`, scoped to the config's directory. */
  aliases: { scopeDir: string; prefix: string; targets: string[] }[];
  /** Workspace package name -> package directory (e.g. "@repo/database" -> "packages/database"). */
  workspacePackages: Map<string, string>;
  /** Go module path from go.mod (e.g. "github.com/spf13/cobra") and its directory. */
  goModules: { modulePath: string; dir: string }[];
  /** Fully qualified JVM class name -> file (built from file paths). */
  jvmClasses: Map<string, string>;
};

export type ResolvedImport =
  | { kind: "internal"; files: string[] }
  | { kind: "external"; name: string }
  | { kind: "unresolved" };

const JS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"];
const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "crypto", "dgram", "dns", "events", "fs",
  "http", "http2", "https", "net", "os", "path", "perf_hooks", "process", "querystring",
  "readline", "stream", "string_decoder", "timers", "tls", "tty", "url", "util", "v8", "vm",
  "worker_threads", "zlib", "module", "async_hooks", "inspector",
]);

function firstExisting(candidates: string[], files: Set<string>) {
  return candidates.find((candidate) => files.has(candidate)) ?? null;
}

/** "a/b" -> a/b.ts, a/b/index.ts, ... ; "a/b.js" -> also a/b.ts (TS ESM style). */
function jsCandidates(base: string) {
  const normalized = path.posix.normalize(base).replace(/^\.\//, "");
  // require("..") from test/ resolves to the repository root: only index files apply.
  if (normalized === "." || normalized === "") return JS_EXTENSIONS.map((ext) => `index${ext}`);
  const withoutJsExt = normalized.replace(/\.(m|c)?js$/, "");
  return [
    normalized,
    ...JS_EXTENSIONS.map((ext) => `${withoutJsExt}${ext}`),
    ...JS_EXTENSIONS.map((ext) => `${normalized}/index${ext}`),
  ];
}

function resolveJs(fromFile: string, specifier: string, ctx: ResolutionContext): ResolvedImport {
  if (specifier.startsWith(".")) {
    const target = firstExisting(jsCandidates(path.posix.join(path.posix.dirname(fromFile), specifier)), ctx.files);
    return target ? { kind: "internal", files: [target] } : { kind: "unresolved" };
  }

  // Path aliases from the closest tsconfig/jsconfig that applies to this file.
  const applicable = ctx.aliases
    .filter((a) => a.scopeDir === "" || fromFile.startsWith(`${a.scopeDir}/`))
    .filter((a) => specifier.startsWith(a.prefix))
    .sort((a, b) => b.scopeDir.length - a.scopeDir.length || b.prefix.length - a.prefix.length);
  for (const alias of applicable) {
    const rest = specifier.slice(alias.prefix.length);
    for (const target of alias.targets) {
      const resolved = firstExisting(jsCandidates(path.posix.join(target, rest)), ctx.files);
      if (resolved) return { kind: "internal", files: [resolved] };
    }
  }

  const packageName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];

  // Workspace packages (monorepos) are internal.
  const packageDir = ctx.workspacePackages.get(packageName);
  if (packageDir !== undefined) {
    const subpath = specifier.slice(packageName.length).replace(/^\//, "");
    const base = subpath ? path.posix.join(packageDir, subpath) : packageDir;
    const resolved =
      firstExisting(jsCandidates(base), ctx.files) ??
      (subpath ? null : firstExisting(jsCandidates(path.posix.join(packageDir, "src")), ctx.files));
    return resolved ? { kind: "internal", files: [resolved] } : { kind: "unresolved" };
  }

  if (specifier.startsWith("node:") || NODE_BUILTINS.has(packageName)) {
    return { kind: "external", name: "node:builtin" };
  }

  return { kind: "external", name: packageName };
}

function resolvePython(fromFile: string, specifier: string, ctx: ResolutionContext): ResolvedImport {
  const dots = specifier.match(/^\.*/)?.[0].length ?? 0;
  const modulePath = specifier.slice(dots).split(".").filter(Boolean).join("/");

  let bases: string[];
  if (dots > 0) {
    let dir = path.posix.dirname(fromFile);
    for (let i = 1; i < dots; i++) dir = path.posix.dirname(dir);
    bases = [dir === "." ? "" : dir];
  } else {
    // Absolute imports: repository root, src/ layout, and every package root
    // that contains the importing file (e.g. "backend/" for backend/app/main.py).
    const parents: string[] = [];
    let dir = path.posix.dirname(fromFile);
    while (dir !== "." && dir !== "") {
      parents.push(dir);
      dir = path.posix.dirname(dir);
    }
    bases = ["", "src", ...parents];
  }

  for (const base of bases) {
    const joined = modulePath ? (base ? `${base}/${modulePath}` : modulePath) : base;
    if (!joined) continue;
    const resolved = firstExisting([`${joined}.py`, `${joined}/__init__.py`], ctx.files);
    if (resolved) return { kind: "internal", files: [resolved] };
  }

  if (dots > 0) return { kind: "unresolved" };
  return { kind: "external", name: specifier.split(".")[0] };
}

function filesInDir(dir: string, files: Set<string>, extension: string) {
  const prefix = dir ? `${dir}/` : "";
  return [...files].filter(
    (f) =>
      f.startsWith(prefix) &&
      !f.slice(prefix.length).includes("/") &&
      f.endsWith(extension) &&
      !f.endsWith(`_test${extension}`)
  );
}

function resolveGo(specifier: string, ctx: ResolutionContext): ResolvedImport {
  const goModule = ctx.goModules
    .filter((m) => specifier === m.modulePath || specifier.startsWith(`${m.modulePath}/`))
    .sort((a, b) => b.modulePath.length - a.modulePath.length)[0];

  if (!goModule) {
    // Standard library packages have no dot in their first segment.
    return specifier.split("/")[0].includes(".")
      ? { kind: "external", name: specifier.split("/").slice(0, 3).join("/") }
      : { kind: "external", name: "go:stdlib" };
  }

  const rest = specifier.slice(goModule.modulePath.length).replace(/^\//, "");
  const dir = [goModule.dir, rest].filter(Boolean).join("/");
  const packageFiles = filesInDir(dir, ctx.files, ".go");
  return packageFiles.length > 0 ? { kind: "internal", files: packageFiles } : { kind: "unresolved" };
}

function resolveJvm(specifier: string, ctx: ResolutionContext): ResolvedImport {
  const file = ctx.jvmClasses.get(specifier);
  if (file) return { kind: "internal", files: [file] };
  const segments = specifier.split(".");
  if (["java", "javax", "kotlin", "jdk", "sun"].includes(segments[0])) {
    return { kind: "external", name: "jvm:stdlib" };
  }
  return { kind: "external", name: segments.slice(0, 2).join(".") };
}

function resolveC(fromFile: string, rawSpecifier: string, ctx: ResolutionContext): ResolvedImport {
  const isAngle = rawSpecifier.startsWith("<");
  const specifier = isAngle ? rawSpecifier.slice(1, -1) : rawSpecifier;
  const resolved = resolveCInclude(fromFile, specifier, ctx);
  // An unresolved <...> include is a system/library header, not a broken import.
  if (resolved.kind === "unresolved" && isAngle) return { kind: "external", name: "c:system" };
  return resolved;
}

function resolveCInclude(fromFile: string, specifier: string, ctx: ResolutionContext): ResolvedImport {
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  const direct = firstExisting(
    [relative, specifier, `include/${specifier}`, `src/${specifier}`],
    ctx.files
  );
  if (direct) return { kind: "internal", files: [direct] };

  // Fall back to a unique file with that name anywhere in the repository.
  const suffix = `/${specifier}`;
  const matches = [...ctx.files].filter((f) => f.endsWith(suffix));
  return matches.length === 1 ? { kind: "internal", files: matches } : { kind: "unresolved" };
}

const RUST_STD = new Set(["std", "core", "alloc"]);

/** "crate::{a::B, c}" -> ["crate::a::B", "crate::c"] (one level of nesting is enough in practice). */
export function expandRustUseTree(tree: string): string[] {
  const brace = tree.indexOf("{");
  if (brace === -1) return [tree];
  const prefix = tree.slice(0, brace);
  const inner = tree.slice(brace + 1, tree.lastIndexOf("}"));

  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of inner) {
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.filter(Boolean).flatMap((part) => expandRustUseTree(`${prefix}${part}`));
}

function rustModuleFile(dir: string, segments: string[], files: Set<string>) {
  // Longest existing module path wins: a::b::C -> a/b.rs or a/b/mod.rs, else a.rs ...
  for (let length = segments.length; length >= 1; length--) {
    const base = [dir, ...segments.slice(0, length)].filter((s) => s && s !== ".").join("/");
    const resolved = firstExisting([`${base}.rs`, `${base}/mod.rs`], files);
    if (resolved) return resolved;
  }
  return null;
}

function resolveRust(fromFile: string, specifier: string, ctx: ResolutionContext): ResolvedImport {
  const dir = path.posix.dirname(fromFile);
  const stem = path.posix.basename(fromFile, ".rs");
  const isRootLike = ["main", "lib", "mod"].includes(stem);
  // Where this file's own submodules live, and where its siblings live.
  const selfDir = isRootLike ? dir : `${dir}/${stem}`;
  const parentDir = stem === "mod" ? path.posix.dirname(dir) : dir;

  if (specifier.startsWith("mod:")) {
    const resolved = rustModuleFile(selfDir, [specifier.slice(4)], ctx.files);
    return resolved ? { kind: "internal", files: [resolved] } : { kind: "unresolved" };
  }

  const [root, ...segments] = specifier.split("::").filter((s) => s && s !== "*");

  if (root === "crate" || root === "self" || root === "super") {
    const srcIndex = fromFile.lastIndexOf("src/");
    const srcDir = srcIndex >= 0 ? fromFile.slice(0, srcIndex + 3) : "src";
    const baseDir = root === "crate" ? srcDir : root === "self" ? selfDir : parentDir;
    const resolved =
      rustModuleFile(baseDir, segments, ctx.files) ??
      // Items defined directly in the crate root (lib.rs / main.rs).
      (root === "crate" ? firstExisting([`${srcDir}/lib.rs`, `${srcDir}/main.rs`], ctx.files) : null);
    return resolved ? { kind: "internal", files: [resolved] } : { kind: "unresolved" };
  }

  if (!root || RUST_STD.has(root)) return { kind: "external", name: "rust:std" };
  return { kind: "external", name: root };
}

export function resolveImport(
  fromFile: string,
  specifier: string,
  language: ImportLanguage,
  ctx: ResolutionContext
): ResolvedImport {
  switch (language) {
    case "js":
      return resolveJs(fromFile, specifier, ctx);
    case "python":
      return resolvePython(fromFile, specifier, ctx);
    case "go":
      return resolveGo(specifier, ctx);
    case "jvm":
      return resolveJvm(specifier, ctx);
    case "c":
      return resolveC(fromFile, specifier, ctx);
    case "rust":
      return resolveRust(fromFile, specifier, ctx);
    case "ruby": {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
      const resolved = firstExisting([base, `${base}.rb`], ctx.files);
      return resolved ? { kind: "internal", files: [resolved] } : { kind: "unresolved" };
    }
    case "gdscript": {
      const target = specifier.replace(/^res:\/\//, "");
      // res:// paths are relative to the Godot project (the dir with project.godot).
      const projectRoots = [...ctx.files]
        .filter((f) => f === "project.godot" || f.endsWith("/project.godot"))
        .map((f) => path.posix.dirname(f));
      const resolved = firstExisting(
        projectRoots.map((root) => (root === "." ? target : `${root}/${target}`)),
        ctx.files
      );
      return resolved ? { kind: "internal", files: [resolved] } : { kind: "unresolved" };
    }
  }
}

/** Parses JSON that may contain comments and trailing commas (tsconfig style). */
export function parseLooseJson(text: string): unknown {
  // Strip comments outside strings ("@/*" inside a string is not a comment).
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (inString) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        i++;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
      out += char;
    } else if (char === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (char === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
    } else {
      out += char;
    }
  }

  try {
    return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
  } catch {
    return null;
  }
}

/** Builds the JVM class index: "org.x.Foo" -> "src/main/java/org/x/Foo.java". */
export function buildJvmClassIndex(files: Iterable<string>) {
  const index = new Map<string, string>();
  for (const file of files) {
    if (!/\.(java|kt)$/.test(file)) continue;
    const segments = file.replace(/\.(java|kt)$/, "").split("/");
    // Register every suffix with 2+ segments; a source root such as
    // src/main/java is simply never part of an import.
    for (let i = 0; i < segments.length - 1; i++) {
      const fqn = segments.slice(i).join(".");
      if (!index.has(fqn)) index.set(fqn, file);
    }
  }
  return index;
}
