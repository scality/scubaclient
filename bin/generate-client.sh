#!/usr/bin/env bash

set -ex

if [ ! -f "openapi.yaml" ]; then
    printf 'No spec file found at %s/%s\n' "$PWD" "openapi.yaml"
    exit 1
fi

export TS_POST_PROCESS_FILE="yarn format"

exec yarn openapi-generator-cli generate  -i openapi.yaml -g typescript-axios -o src/ --enable-post-process-file
