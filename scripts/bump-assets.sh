#!/bin/sh
# Cache-bust the stylesheet and scripts.
#
# GitHub Pages serves every file with `Cache-Control: max-age=600`, and that
# cannot be configured. Within those ten minutes a browser reuses whatever it
# already has without revalidating. The bad case is a fresh index.html paired
# with a stale styles.css — the page renders, but wrongly. Versioning the URLs
# means new markup can only ever load the CSS and JS it shipped with.
#
# Run before committing a change to css/ or js/.
set -e
cd "$(dirname "$0")/.."
v=$(date +%Y%m%d%H%M)
sed -i '' -E "s#(css/styles\.css|js/water\.js|js/main\.js)(\?v=[0-9]+)?#\1?v=$v#g" index.html
echo "assets versioned: v=$v"
grep -o '\(css/styles\.css\|js/water\.js\|js/main\.js\)?v=[0-9]*' index.html
