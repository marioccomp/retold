// Imported first by run-eval.ts: ESM evaluates imports in order, so this runs
// before any module creates its logger.
process.env.LOG_LEVEL ??= "error";
