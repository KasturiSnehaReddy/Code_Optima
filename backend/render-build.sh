#!/usr/bin/env bash

# Download and install Java without requiring root (for Render free tier)
echo "Downloading Java..."

if [ ! -d "$HOME/jdk" ]; then
  cd $HOME
  curl -L https://download.java.net/java/GA/jdk11/9/GPL/openjdk-11.0.2_linux-x64_bin.tar.gz -o jdk.tar.gz
  tar -xzf jdk.tar.gz
  mv jdk-11.0.2 jdk
  rm jdk.tar.gz
  echo "Java installed to $HOME/jdk"
else
  echo "Java already installed"
fi

# Set Java environment variables
export JAVA_HOME=$HOME/jdk
export PATH=$JAVA_HOME/bin:$PATH

echo "Java version:"
java -version || echo "Java not found yet, will be available after restart"

echo "Build complete!"
