#!/bin/sh
set -e

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

if ! command -v pod >/dev/null 2>&1; then
    brew install cocoapods
fi

pod install