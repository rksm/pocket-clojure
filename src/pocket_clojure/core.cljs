(ns pocket-clojure.core
  (:require cljs-bootstrap.core
            medley.core
            [reagent.core :as r]))

(enable-console-print!)

(defn dev-area
  []
  [:div [:pre {:id "editor"} "empty"]])

(defn mountit []
  (let [el (.getElementById js/document "dev-area")]
    (r/render-component [dev-area] el)))

(mountit)
