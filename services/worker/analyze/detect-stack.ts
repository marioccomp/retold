import fs from "fs";
import path from "path";
import { FileEntry } from "./scan-repository.js";

export function detectStack(files: FileEntry[], languages: string[]) {
  const stack = {
    languages: [...languages],
    frameworks: [] as string[],
    tools: [] as string[],
  };

  const hasFile = (name: string) => files.some((f) => f.name === name);

  // Game engines are identified by their project file, not by dependencies.
  if (hasFile("project.godot")) stack.frameworks.push("Godot");
  const hasPath = (fragment: string) => files.some((f) => f.path.includes(fragment));

  const byDepth = (a: FileEntry, b: FileEntry) =>
    a.path.split(path.sep).length - b.path.split(path.sep).length;

  /**
   * Lê o "melhor" arquivo pelo nome: o mais próximo da raiz (menor depth).
   * Isso evita pegar package.json de apps num monorepo.
   */
  const readBestMatch = (name: string) => {
    const candidates = files.filter((f) => f.name === name).sort(byDepth);
    const f = candidates[0];
    if (!f) return null;
    return fs.readFileSync(f.path, "utf-8");
  };

  /**
   * Lê TODOS os arquivos com esse nome (ex.: todos os package.json).
   * Útil para monorepos: junta deps/devDeps de todos os pacotes.
   */
  const readAllMatches = (name: string) => {
    const matches = files.filter((f) => f.name === name).sort(byDepth);
    const out: string[] = [];
    for (const f of matches) {
      try {
        out.push(fs.readFileSync(f.path, "utf-8"));
      } catch {
        // ignore
      }
    }
    return out;
  };

  /**
   * Útil pra detectar tooling por arquivo
   */
  const hasAnyFile = (names: string[]) => names.some((n) => files.some((f) => f.name === n));

  /**
   * Sinal de monorepo simples: muitos package.json fora de node_modules/build (você já ignora no scan ideal)
   */
  const packageJsonCount = files.filter((f) => f.name === "package.json").length;

  /* ===================== NODE / JS ===================== */

  if (hasFile("package.json")) {
    // ✅ SUBSTITUI O BLOCO ANTIGO: agora lê todos os package.json e faz união de deps/devDeps
    const pkgRaws = readAllMatches("package.json");
    if (!pkgRaws.length) return stack;

    // merge de deps/devDeps de todos os pacotes
    const deps: Record<string, any> = {};
    for (const raw of pkgRaws) {
      try {
        const pkg = JSON.parse(raw);
        Object.assign(deps, pkg.dependencies ?? {});
        Object.assign(deps, pkg.devDependencies ?? {});
      } catch {
        // ignore JSON inválido
      }
    }

    // Linguagem
    if (deps.typescript) stack.languages.push("TypeScript");

    // Mobile / React Native / Expo
    if (deps["react-native"]) stack.frameworks.push("React Native");

    if (deps["expo"] || deps["expo-router"]) {
      stack.frameworks.push("Expo");
      stack.frameworks.push("React Native");
    }

    if (deps["react-native-web"]) stack.tools.push("React Native Web");

    // ===================== Monorepo / tooling =====================
    // Agora como você não está mais lendo só o root, workspaces podem aparecer em qualquer pkg.
    // Ainda assim, arquivos clássicos são bons sinais:
    if (hasAnyFile(["turbo.json"])) stack.tools.push("Turborepo");
    if (hasAnyFile(["nx.json", "workspace.json"])) stack.tools.push("Nx");
    if (hasAnyFile(["lerna.json"])) stack.tools.push("Lerna");
    if (hasAnyFile(["pnpm-workspace.yaml"])) stack.tools.push("pnpm workspaces");
    if (hasAnyFile(["rush.json"])) stack.tools.push("Rush");

    // Lockfiles = package manager sinal
    if (hasAnyFile(["pnpm-lock.yaml"])) stack.tools.push("pnpm");
    else if (hasAnyFile(["yarn.lock"])) stack.tools.push("Yarn");
    else if (hasAnyFile(["package-lock.json"])) stack.tools.push("npm");
    else if (hasAnyFile(["bun.lockb"])) stack.tools.push("Bun");

    // Sinal adicional de monorepo (leve)
    if (packageJsonCount >= 3) stack.tools.push("Multi-package repo");

    // Frameworks
    if (deps.react) stack.frameworks.push("React");
    if (deps.next) stack.frameworks.push("Next.js");
    if (deps.express) stack.frameworks.push("Express");
    if (deps["@nestjs/core"]) stack.frameworks.push("NestJS");
    if (deps["@adonisjs/core"]) stack.frameworks.push("AdonisJS");

    // AdonisJS ecosystem
    if (deps["@adonisjs/lucid"]) stack.tools.push("Lucid ORM");
    if (deps["@adonisjs/auth"]) stack.tools.push("Adonis Auth");
    if (deps["@adonisjs/validator"]) stack.tools.push("Adonis Validator");

    // Fullstack bridges
    if (deps["@inertiajs/react"] || deps["@inertiajs/inertia"]) {
      stack.tools.push("Inertia.js");
    }

    // ORMs / DB
    if (deps.prisma) stack.tools.push("Prisma");
    if (deps.typeorm) stack.tools.push("TypeORM");
    if (deps.mongoose) stack.tools.push("Mongoose");
    if (deps.sequelize) stack.tools.push("Sequelize");

    // HTTP / API
    if (deps.axios) stack.tools.push("Axios");

    // Testing
    if (deps.jest) stack.tools.push("Jest");
    if (deps.vitest) stack.tools.push("Vitest");
    if (deps.mocha) stack.tools.push("Mocha");

    // Lint / format (arquivos de config ainda contam)
    if (deps.eslint || hasFile(".eslintrc") || hasFile(".eslintrc.js")) {
      stack.tools.push("ESLint");
    }
    if (deps.prettier || hasFile(".prettierrc") || hasFile(".prettierrc.js")) {
      stack.tools.push("Prettier");
    }

    // Styling / build
    if (deps.tailwindcss) stack.tools.push("Tailwind");
    if (deps.postcss || hasFile("postcss.config.js")) {
      stack.tools.push("PostCSS");
    }
    if (deps.vite) stack.tools.push("Vite");
    if (deps.webpack) stack.tools.push("Webpack");

    // Monorepo/build (deps também contam)
    if (deps.turbo) stack.tools.push("Turborepo");
    if (deps.nx) stack.tools.push("Nx");

    // Package tooling
    if (deps.biome) stack.tools.push("Biome");
    if (deps["@biomejs/biome"]) stack.tools.push("Biome");

    // API styles / patterns
    if (deps["trpc"] || deps["@trpc/server"]) stack.tools.push("tRPC");
    if (deps["graphql"] || deps["@apollo/server"] || deps["@apollo/client"]) {
      stack.tools.push("GraphQL");
    }
  }

  /* ===================== PYTHON ===================== */

  if (hasFile("requirements.txt") || hasFile("pyproject.toml")) {
    stack.languages.push("Python");

    const req = readBestMatch("requirements.txt")?.toLowerCase() ?? "";
    const pyproject = readBestMatch("pyproject.toml")?.toLowerCase() ?? "";
    const pythonDeps = req + pyproject;

    if (pythonDeps.includes("fastapi")) stack.frameworks.push("FastAPI");
    if (pythonDeps.includes("django")) stack.frameworks.push("Django");
    if (pythonDeps.includes("flask")) stack.frameworks.push("Flask");

    if (pythonDeps.includes("sqlalchemy")) stack.tools.push("SQLAlchemy");
    if (pythonDeps.includes("django-rest-framework")) stack.tools.push("Django REST Framework");

    if (pythonDeps.includes("celery")) stack.tools.push("Celery");

    if (pythonDeps.includes("pytest")) stack.tools.push("Pytest");
    if (pythonDeps.includes("unittest")) stack.tools.push("unittest");

    if (pythonDeps.includes("black")) stack.tools.push("Black");
    if (pythonDeps.includes("ruff")) stack.tools.push("Ruff");
  }

  /* ===================== GO ===================== */

  if (hasFile("go.mod")) {
    stack.languages.push("Go");

    const goMod = readBestMatch("go.mod") ?? "";

    if (goMod.includes("gin-gonic/gin")) stack.frameworks.push("Gin");
    if (goMod.includes("gofiber/fiber")) stack.frameworks.push("Fiber");
    if (goMod.includes("labstack/echo")) stack.frameworks.push("Echo");

    if (goMod.includes("gorm.io/gorm")) stack.tools.push("GORM");
    if (goMod.includes("stretchr/testify")) stack.tools.push("Testify");
    if (goMod.includes("spf13/cobra")) stack.tools.push("Cobra");
  }

  /* ===================== JAVA / SPRING ===================== */

  if (hasFile("pom.xml") || hasFile("build.gradle")) {
    stack.languages.push("Java");

    const pom = readBestMatch("pom.xml") ?? "";
    const gradle = readBestMatch("build.gradle") ?? "";
    const javaDeps = pom + gradle;

    if (javaDeps.includes("spring-boot") || javaDeps.includes("org.springframework")) {
      stack.frameworks.push("Spring Boot");
    }

    if (hasFile("pom.xml")) stack.tools.push("Maven");
    if (hasFile("build.gradle")) stack.tools.push("Gradle");

    if (javaDeps.includes("hibernate")) stack.tools.push("Hibernate");

    if (javaDeps.includes("junit")) stack.tools.push("JUnit");
    if (javaDeps.includes("mockito")) stack.tools.push("Mockito");
  }

  /* ===================== PHP / LARAVEL ===================== */

  if (hasFile("composer.json")) {
    const composer = JSON.parse(readBestMatch("composer.json")!);

    stack.languages.push("PHP");

    const deps = {
      ...composer.require,
      ...composer["require-dev"],
    };

    if (deps?.["laravel/framework"] || hasFile("artisan")) stack.frameworks.push("Laravel");

    if (deps?.["illuminate/database"]) stack.tools.push("Eloquent");

    if (deps?.phpunit) stack.tools.push("PHPUnit");
    if (deps?.pestphp?.pest) stack.tools.push("Pest");
  }

  /* ===================== RUBY / RAILS ===================== */

  if (hasFile("Gemfile")) {
    stack.languages.push("Ruby");

    const gemfile = readBestMatch("Gemfile") ?? "";

    if (
      gemfile.includes('gem "rails"') ||
      gemfile.includes("gem 'rails'") ||
      hasFile("config/application.rb") ||
      hasFile("bin/rails")
    ) {
      stack.frameworks.push("Ruby on Rails");
    }

    if (gemfile.includes("activerecord")) stack.tools.push("ActiveRecord");

    if (gemfile.includes("rspec")) stack.tools.push("RSpec");
    if (gemfile.includes("minitest")) stack.tools.push("Minitest");
  }

  /* ===================== MOBILE ===================== */

  if (hasFile("pubspec.yaml")) {
    stack.languages.push("Dart");
    stack.frameworks.push("Flutter");
  }

  if (hasFile("package.json") && hasPath("/android") && hasPath("/ios")) {
    stack.frameworks.push("React Native");
  }

  if (hasFile("AndroidManifest.xml")) {
    stack.languages.push("Kotlin");
    stack.frameworks.push("Android");
  }

  if (files.some((f) => f.ext === ".xcodeproj" || f.ext === ".xcworkspace")) {
    stack.languages.push("Swift");
    stack.frameworks.push("iOS");
  }

  /* ===================== OUTRAS ===================== */

  if (files.some((f) => f.ext === ".csproj")) {
    stack.languages.push("C#");
    stack.frameworks.push(".NET");

    if (files.some((f) => f.path.toLowerCase().includes("entityframework"))) {
      stack.tools.push("Entity Framework");
    }
  }

  if (hasFile("Cargo.toml")) {
    stack.languages.push("Rust");

    const cargo = readBestMatch("Cargo.toml") ?? "";
    if (cargo.includes("actix-web")) stack.frameworks.push("Actix");
    if (cargo.includes("axum")) stack.frameworks.push("Axum");
    if (cargo.includes("diesel")) stack.tools.push("Diesel");
  }

  /* ===================== C / C++ / SYSTEMS ===================== */

  if (stack.languages.includes("C") || stack.languages.includes("C++")) {
    if (hasFile("Makefile")) stack.tools.push("Make");
    if (hasFile("CMakeLists.txt")) stack.tools.push("CMake");
    if (hasFile("configure.ac") || hasFile("configure")) stack.tools.push("Autotools");

    const cFiles = files
      .filter((f) => f.ext === ".c" || f.ext === ".cpp" || f.ext === ".h")
      .slice(0, 3);
    for (const cf of cFiles) {
      const content = fs.readFileSync(cf.path, "utf-8");
      if (content.includes("ncurses.h")) stack.tools.push("ncurses");
      if (content.includes("SDL.h") || content.includes("SDL2/SDL.h")) stack.tools.push("SDL");
      if (content.includes("raylib.h")) stack.tools.push("Raylib");
      if (content.includes("GL/gl.h")) stack.tools.push("OpenGL");
    }
  }

  /* ===================== FINAL ===================== */

  stack.languages = [...new Set(stack.languages)];
  stack.frameworks = [...new Set(stack.frameworks)];
  stack.tools = [...new Set(stack.tools)];

  return stack;
}
