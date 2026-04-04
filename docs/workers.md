# Workers (Background Processing)

This document describes the system workers responsible for heavy background processing using **BullMQ** and **Redis**.

## General Structure

Workers are located in `services/worker/` and run as independent processes. They share the Redis connection with the applications to process task queues asynchronously.

## Security Hardening

The worker layer now enforces server-side guards before reading cloned repositories or using queue payloads for privileged operations.

- **Strict `projectId` validation:** workers only accept positive safe integers before touching the database or filesystem.
- **Scoped temp directories:** temporary clone paths are created under fixed worker-specific roots, and cleanup is restricted to those roots to prevent path traversal and path escape.
- **Repository origin rehydration:** the main project analysis worker no longer trusts `repoUrl` from queue payloads. It reloads the linked repository from the database, validates ownership consistency, and only accepts `https://github.com/<owner>/<repo>` origins.
- **Symlink and path-escape blocking:** repository scanning skips symbolic links and rejects any file whose real path escapes the cloned repository root. README loading also refuses symbolic links and escaped paths.

### Operational Note

- These protections assume the database remains the source of truth for project-to-repository linkage.
- Redis transport hardening, credential handling during `git clone`, and broader LLM payload minimization remain follow-up work.

---

## 1. User Worker (`user-analyze`)

**File:** [services/worker/user-worker.ts](services/worker/user-worker.ts)

This worker is responsible for performing a deep analysis of a specific user's contributions within a project (Git repository).

### What it does:

- **Local Cloning:** Clones the project repository into a worker-scoped directory under the OS temp root.
- **Git Log Extraction:** Executes native Git commands to extract commit history, filtering by author (GitHub email or username).
- **Metrics Calculation:**
  - Total commit count.
  - First and last commit dates.
  - Total lines added and deleted (via `git log --numstat`).
  - Active days (count of unique days with commits).
- **Impact Score:** Generates an `impactScore` based on code volume and commits.
- **Persistence:** Updates or creates records in the `userProjectStats` table.
- **Cleanup:** Removes temporary files after execution.

---

## 2. Last Commit Worker (`github-last-commit`)

**File:** [services/worker/last-commit-worker.ts](services/worker/last-commit-worker.ts)

This worker has a more focused goal on the GitHub API: identifying the user's most recent activity across all their linked projects.

### What it does:

- **Repository Aggregation:** Collects all repository names (`fullName`) linked to the user's projects in the database.
- **API Integration (Octokit):** Makes calls to the GitHub API to list the user's most recent commit for each repository.
- **Global Comparison:** Compares the dates of all these commits to find the "winner" (the most recent commit across all repositories).
- **Status Persistence:** Saves the result (message, date, and repo name) in the `lastCommit` JSON field of the `githubStats` table.

### Caching and Automatic Triggers:

The refresh of the last commit status is managed by a dual-strategy caching mechanism:

- **Event-Driven Refresh:** The worker is automatically triggered whenever a project is **created** or **deleted**. This ensures the profile accurately reflects changes in the linked repositories.
- **On-Demand Stale Refresh:** When a user's profile is visited, the system checks the `lastCommitFetchedAt` field. If the data is older than **24 hours** (stale), a new job is enqueued to refresh the stats in the background.

---

## Queues and Concurrency

- **User Analyze:** Has low concurrency (`concurrency: 1`) as it is a process that consumes significant I/O and CPU (cloning and log parsing).
- **Last Commit:** Also operates with low concurrency (2), focusing on GitHub API call efficiency and respecting rate limits.

> **Note:** The full project analysis workers are currently being refactored and will be documented soon.
