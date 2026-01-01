#!/bin/bash
set -e

# Install Node.js dependencies
npm install

# Install Playwright browsers (Chromium and others if needed)
npx playwright install chromium

# Note: Full browser support (WebKit, Firefox) requires system dependencies
# that may not be available in all environments.
# To run all tests, install system deps via: npx playwright install-deps
