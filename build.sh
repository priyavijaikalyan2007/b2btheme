#!/bin/bash

set -e
rm -f -R ./dist/
rm -f -R ./node_modules/

npm install
npm audit fix
npm run build

cp -R ./cloud-icons/ ./dist/

