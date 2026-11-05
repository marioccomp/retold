import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import { analyzeRepository } from "../../../../services/worker/analyze";

const tempDirs: string[] = [];

function createStaticSiteFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "retold-static-site-"));
  tempDirs.push(dir);

  fs.writeFileSync(
    path.join(dir, "index.html"),
    "<!doctype html><html><head><link rel=\"stylesheet\" href=\"styles.css\"></head><body><main>Home</main></body></html>"
  );
  fs.writeFileSync(path.join(dir, "about.html"), "<html><body><section>About</section></body></html>");
  fs.writeFileSync(path.join(dir, "styles.css"), "body { font-family: sans-serif; }");

  return dir;
}

describe("worker repository analysis", () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("classifies a plain HTML/CSS repository as a frontend web project", async () => {
    const repoDir = createStaticSiteFixture();

    const analysis = await analyzeRepository(repoDir, {
      readme: "",
      includeCodeSamples: false,
    });

    expect(analysis.summary.primaryLanguage).toBe("HTML");
    expect(analysis.summary.appType).toBe("Frontend");
    expect(analysis.classification.domain).toBe("web");
    expect(analysis.classification.languageFamily).toBe("web");
    expect(analysis.stats.sourceFiles).toBe(3);
    expect(analysis.stats.unknownFiles).toBe(0);
  });
});
