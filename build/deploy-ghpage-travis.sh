#!/usr/bin/env sh
rm -rf out || exit 0;
mkdir -p out/dev/ 
cd out/
git init
git config user.name "Travis-CI"
git config user.email "mbrechet.ext@orange.com"
cp  -r ../dist/ ./dev/
git add .
git commit -m "automatic deploy from Travis-CI"
git push --force --quiet "https://github.com/Orange-OpenSource/hasplayer.js.git" master:gh-pages > /dev/null 2>&1