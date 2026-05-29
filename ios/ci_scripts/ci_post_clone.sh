#!/bin/sh
set -e

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE

if ! command -v node >/dev/null 2>&1; then
    brew install node
fi

cd "$CI_PRIMARY_REPOSITORY_PATH"

npm ci

cd ios

if ! command -v pod >/dev/null 2>&1; then
    brew install cocoapods
fi

pod install