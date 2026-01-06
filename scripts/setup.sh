#!/bin/bash
set -e

# Install Node.js dependencies
npm install

# Install Playwright browsers (Chromium and others if needed)
# Installing WebKit is required for Mobile Safari tests
npx playwright install chromium webkit

# Install system dependencies required for browsers
# This handles libraries like libgtk, libgstreamer, etc.
npx playwright install-deps
