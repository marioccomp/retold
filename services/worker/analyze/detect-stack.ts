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
  const hasPath = (fragment: string) =>
    files.some((f) => f.path.includes(fragment));

  const readFile = (name: string) => {
    const f = files.find((f) => f.name === name);
    if (!f) return null;
    return fs.readFileSync(f.path, "utf-8");
  };

  /* ===================== NODE / JS ===================== */

  if (hasFile("package.json")) {
    const pkg = JSON.parse(readFile("package.json")!);
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    if (deps.typescript) stack.languages.push("TypeScript");

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

    // Lint / format
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
  }

  /* ===================== PYTHON ===================== */

  if (hasFile("requirements.txt") || hasFile("pyproject.toml")) {
    stack.languages.push("Python");

    const req = readFile("requirements.txt")?.toLowerCase() ?? "";
    const pyproject = readFile("pyproject.toml")?.toLowerCase() ?? "";
    const pythonDeps = req + pyproject;

    // Frameworks
    if (pythonDeps.includes("fastapi")) stack.frameworks.push("FastAPI");
    if (pythonDeps.includes("django")) stack.frameworks.push("Django");
    if (pythonDeps.includes("flask")) stack.frameworks.push("Flask");

    // ORMs / APIs
    if (pythonDeps.includes("sqlalchemy")) stack.tools.push("SQLAlchemy");
    if (pythonDeps.includes("django-rest-framework")) {
      stack.tools.push("Django REST Framework");
    }

    // Async / background
    if (pythonDeps.includes("celery")) stack.tools.push("Celery");

    // Testing
    if (pythonDeps.includes("pytest")) stack.tools.push("Pytest");
    if (pythonDeps.includes("unittest")) stack.tools.push("unittest");

    // Lint / format
    if (pythonDeps.includes("black")) stack.tools.push("Black");
    if (pythonDeps.includes("ruff")) stack.tools.push("Ruff");
  }

  /* ===================== GO ===================== */

  if (hasFile("go.mod")) {
    stack.languages.push("Go");

    const goMod = readFile("go.mod") ?? "";

    // Frameworks
    if (goMod.includes("gin-gonic/gin")) stack.frameworks.push("Gin");
    if (goMod.includes("gofiber/fiber")) stack.frameworks.push("Fiber");
    if (goMod.includes("labstack/echo")) stack.frameworks.push("Echo");

    // ORM
    if (goMod.includes("gorm.io/gorm")) stack.tools.push("GORM");

    // Testing
    if (goMod.includes("stretchr/testify")) stack.tools.push("Testify");

    // CLI
    if (goMod.includes("spf13/cobra")) stack.tools.push("Cobra");
  }

  /* ===================== JAVA / SPRING ===================== */

  if (hasFile("pom.xml") || hasFile("build.gradle")) {
    stack.languages.push("Java");

    const pom = readFile("pom.xml") ?? "";
    const gradle = readFile("build.gradle") ?? "";
    const javaDeps = pom + gradle;

    if (
      javaDeps.includes("spring-boot") ||
      javaDeps.includes("org.springframework")
    ) {
      stack.frameworks.push("Spring Boot");
    }

    // Build
    if (hasFile("pom.xml")) stack.tools.push("Maven");
    if (hasFile("build.gradle")) stack.tools.push("Gradle");

    // ORM
    if (javaDeps.includes("hibernate")) stack.tools.push("Hibernate");

    // Testing
    if (javaDeps.includes("junit")) stack.tools.push("JUnit");
    if (javaDeps.includes("mockito")) stack.tools.push("Mockito");
  }

  /* ===================== PHP / LARAVEL ===================== */

  if (hasFile("composer.json")) {
    const composer = JSON.parse(readFile("composer.json")!);

    stack.languages.push("PHP");

    const deps = {
      ...composer.require,
      ...composer["require-dev"],
    };

    if (deps?.["laravel/framework"] || hasFile("artisan")) {
      stack.frameworks.push("Laravel");
    }

    // ORM
    if (deps?.["illuminate/database"]) stack.tools.push("Eloquent");

    // Testing
    if (deps?.phpunit) stack.tools.push("PHPUnit");
    if (deps?.pestphp?.pest) stack.tools.push("Pest");
  }

  /* ===================== RUBY / RAILS ===================== */

  if (hasFile("Gemfile")) {
    stack.languages.push("Ruby");

    const gemfile = readFile("Gemfile") ?? "";

    if (
      gemfile.includes('gem "rails"') ||
      gemfile.includes("gem 'rails'") ||
      hasFile("config/application.rb") ||
      hasFile("bin/rails")
    ) {
      stack.frameworks.push("Ruby on Rails");
    }

    // ORM
    if (gemfile.includes("activerecord")) stack.tools.push("ActiveRecord");

    // Testing
    if (gemfile.includes("rspec")) stack.tools.push("RSpec");
    if (gemfile.includes("minitest")) stack.tools.push("Minitest");
  }

  /* ===================== MOBILE ===================== */

  // Flutter
  if (hasFile("pubspec.yaml")) {
    stack.languages.push("Dart");
    stack.frameworks.push("Flutter");
  }

  // React Native
  if (hasFile("package.json") && hasPath("/android") && hasPath("/ios")) {
    stack.frameworks.push("React Native");
  }

  // Android (Kotlin)
  if (hasFile("AndroidManifest.xml")) {
    stack.languages.push("Kotlin");
    stack.frameworks.push("Android");
  }

  // iOS (Swift)
  if (
    files.some(
      (f) => f.ext === ".xcodeproj" || f.ext === ".xcworkspace"
    )
  ) {
    stack.languages.push("Swift");
    stack.frameworks.push("iOS");
  }

  /* ===================== OUTRAS ===================== */

  // .NET
  if (files.some((f) => f.ext === ".csproj")) {
    stack.languages.push("C#");
    stack.frameworks.push(".NET");

    if (files.some((f) => f.path.toLowerCase().includes("entityframework"))) {
      stack.tools.push("Entity Framework");
    }
  }

  // Rust
  if (hasFile("Cargo.toml")) {
    stack.languages.push("Rust");

    const cargo = readFile("Cargo.toml") ?? "";
    if (cargo.includes("actix-web")) stack.frameworks.push("Actix");
    if (cargo.includes("axum")) stack.frameworks.push("Axum");
    if (cargo.includes("diesel")) stack.tools.push("Diesel");
  }

  /* ===================== C / C++ / SYSTEMS ===================== */

  if (stack.languages.includes("C") || stack.languages.includes("C++")) {
    if (hasFile("Makefile")) stack.tools.push("Make");
    if (hasFile("CMakeLists.txt")) stack.tools.push("CMake");
    if (hasFile("configure.ac") || hasFile("configure")) stack.tools.push("Autotools");

    // Simple heuristic for common C libs (scan first few C files)
    const cFiles = files.filter(f => f.ext === ".c" || f.ext === ".cpp" || f.ext === ".h").slice(0, 3);
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
