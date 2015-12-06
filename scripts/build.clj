(ns script.bootstrap.build
  (:require [clojure.java.io :as io]
            [cljs.build.api :as api]
            [cognitect.transit :as transit]
            [clojure.java.shell :as shell])
  (:import [java.io ByteArrayOutputStream]))

(defn extract-analysis-cache [out-path]
  (let [out (ByteArrayOutputStream. 1000000)
        writer (transit/writer out :json)
        cache (read-string
                (slurp (io/resource "cljs/core.cljs.cache.aot.edn")))]
    (transit/write writer cache)
    (spit (io/file out-path) (.toString out))))


(println "Building pocket_clojure")

(cljs.build.api/watch (api/inputs "src/pocket_clojure")
  {:output-dir         ".pocket_clojure"
  :output-to          ".pocket_clojure/deps.js"
  :cache-analysis     true
  :source-map         true
  ;:source-map         ".pocket_clojure/source-map.json"
  :optimizations      :none
  ;:optimizations      :simple
  :static-fns         true
  :optimize-constants true
  :dump-core          false
  :verbose            true
   :watch-fn (fn []
               (println "Compilation done, generating standalon cljs....")
               (println (shell/sh "./scripts/gen_single.sh")))})

; (api/build (api/inputs "src/pocket_clojure")
;   {:output-dir         ".pocket_clojure"
;   :output-to          ".pocket_clojure/deps.js"
;   :cache-analysis     true
;   :source-map         true
;   ;:source-map         ".pocket_clojure/source-map.json"
;   :optimizations      :none
;   ;:optimizations      :simple
;   :static-fns         true
;   :optimize-constants true
;   :dump-core          false
;   :verbose            true})

(println "Extracting Google Closure Library node compatibility shim")
(let [path ".pocket_clojure/goog/bootstrap/nodejs.js"]
  (io/make-parents path)
  (spit path (slurp (io/resource "cljs/bootstrap_node.js"))))

(println "Using transit to extract core analysis cache")
(extract-analysis-cache ".pocket_clojure/cljs/core.cljs.cache.aot.json")

(println "Done building pocket_clojure")
(System/exit 0)
