import { ProjectClassification } from "../analyze/classify-project";

export type Heuristic = {
  summary: {
    primaryLanguage: string;
    appType: string;
  };
  stack: {
    languages: string[];
    frameworks: string[];
    tools: string[];
  };
  infra: {
    hasDockerfile: boolean;
    hasCompose: boolean;
    ciProviders: string[];
    lintTools: string[];
    testTools: string[];
    hasTests: boolean;
    hasKubernetes: boolean;
    hasTerraform: boolean;
  };
  stats: {
    totalFiles: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
    docsFiles: number;
    unknownFiles: number;
  };
  structure: {
    topLevelDirs: string[];
    secondLevelDirs: string[];
    packageJsonCount: number;
    hasAppsDir: boolean;
    hasPackagesDir: boolean;
  };
  classification: ProjectClassification;
  readme?: string;
  codeSamples?: {
    relativePath: string;
    language: string;
    excerpt: string;
    reason: string;
  }[];
  locale?: string;
};
