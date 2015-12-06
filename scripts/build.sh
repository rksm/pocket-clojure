#!/bin/bash

export VERBOSE=1
time lein run -m clojure.main scripts/build.clj

./scripts/gen_single.sh
# ln -fs `pwd`/repl-web.js $WORKSPACE_LK/cljs-repl/repl-web.js