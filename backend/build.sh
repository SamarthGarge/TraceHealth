#!/usr/bin/env bash
# Render build script — ensures a clean pip install on every deploy.
# Set this as the "Build Command" in Render dashboard settings.

set -o errexit  # exit on error

if [ -d "backend" ]; then
    cd backend
fi

pip install --upgrade pip
pip install -r requirements.txt
