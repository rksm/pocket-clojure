# pocket-clojure

Develop ClojureScript on a web page.

## build

```sh
$ git clone https://github.com/clojure/clojurescript
$ git clone --branch cljs-bootstrap https://github.com/swannodette/tools.reader
$ git clone https://github.com/kanaka/cljs-bootstrap

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

cd clojurescript
./script/build
# Note the version of ClojureScript that is built.
cd ..

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

cd tools.reader
lein install
cd ..

cd cljs-bootstrap;
# version="1.7.192"
# cat project.clj
# lein npm install

lein run -m clojure.main script/build.clj

wget http://dl.google.com/closure-compiler/compiler-latest.zip
unzip compiler-latest.zip

lein install

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

lein uberjar
java -cp target/pocket-clojure-0.1.0-SNAPSHOT-standalone.jar:src clojure.main scripts/build.clj 
```
