#!/bin/bash

set -e
npm install
npm audit fix
npm run build

cp -R ./cloud-icons/ ./dist/

