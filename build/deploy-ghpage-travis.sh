#!/usr/bin/env sh
## register ssh key
chmod 600 travis_deploy
eval `ssh-agent -s`
ssh-add travis_deploy

## create deploy script
rm -rf out || exit 0;
mkdir out
cd out/
git clone -b gh-pages https://github.com/Orange-OpenSource/hasplayer.js.git .
git config user.name "Travis-CI"
git config user.email "mbrechet.ext@orange.com"
cp  -r ../dist/* ./dev/
git add --all
git commit -am "automatic deploy from Travis-CI"
git push "git@github.com:Orange-OpenSource/hasplayer.js.git" gh-pages:gh-pages