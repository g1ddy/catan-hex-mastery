# Scripts & Environment Management

This directory contains utility scripts for managing the development environment and CI/CD workflows.

## `setup.sh`

The `setup.sh` script is the **Single Source of Truth** for the development environment. It defines the exact state of a "fresh" machine required to run, build, and test this project.

### Usage

Run this script to bootstrap or repair your development environment:

```bash
./scripts/setup.sh
```

### Configuring a Jules Environment Snapshot

We treat the development environment as code. To "configure" the snapshot, you simply update `setup.sh`.

**Rules for Dependency Management:**

1.  **No Silent Installs:** Do not manually install tools (e.g., `apt-get install` or `pip install`) without recording it. If a tool is missing, the environment is broken.
2.  **The "Fix & Record" Pattern:**
    *   If you find a missing dependency, fix it locally to unblock yourself.
    *   **Immediately** add the installation command to `setup.sh`.
    *   This ensures the next person (or bot) gets the correct environment automatically.

**Example: Adding a new system tool**

If you need `jq` for a script:

1.  Install it: `sudo apt-get install -y jq`
2.  Update `setup.sh`:

```bash
# ... inside setup.sh
# Install system utilities
sudo apt-get install -y jq
```

### What `setup.sh` Handles

*   **Node.js Dependencies:** Runs `npm install` to sync `node_modules`.
*   **Playwright Browsers:** Installs Chromium, WebKit, etc., via `npx playwright install`.
*   **System Libraries:** Installs OS-level dependencies (like `libgtk`, `libgstreamer`) required by headless browsers via `npx playwright install-deps`.
