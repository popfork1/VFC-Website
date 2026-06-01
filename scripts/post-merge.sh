#!/bin/bash
set -e
npm install --ignore-scripts
npx tsx scripts/migrate-neon.ts
