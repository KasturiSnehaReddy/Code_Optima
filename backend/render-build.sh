#!/usr/bin/env bash
# Install dependencies
npm install

# Install Java (OpenJDK)
echo "Installing Java..."
apt-get update && apt-get install -y openjdk-11-jdk

echo "Build complete!"
