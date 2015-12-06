(ns pocket-clojure.core
  (:require cljs-bootstrap.core
            [medley.core :as m]
            [reagent.core :as r :refer [render-component]]
            reagent.ratom
            [pocket-clojure.editor :as editor]
            [pocket-clojure.ast :as ast]))

(enable-console-print!)

(def editor nil)

(def browser
  (r/atom {:type :browser
           :code-pane {:type :editor
                       :id "editor-2"
                       :width 700
                       :height 700}}))

(defmulti render (fn [x] (:type
                          (if (instance? reagent.ratom/RAtom x)
                            (deref x) x))))

(defmethod render :text [{:keys [content]}]
  [:div [:span content]])

(defn editor-component [{:keys [width height id] :as c}]
  [:div
   {:style {:width (str width "px") :height (str height "px")}}
   [:pre {:id id :style {:width "100%" :height "100%"}} "test"]])

(defmethod render :editor [c]
  [(with-meta (partial editor-component c)
     {:component-did-mount
      (fn [this]
        (let [e (-> this r/dom-node js/ace.edit)]
          (editor/setup e)
          (set! editor e)))})])

(defmethod render :browser [browser-state]
  (let [{:keys [code-pane]} @browser-state]
    [:div (str "browser")
     (render code-pane)]))

(defmethod render :default [c]
  [:div (str "unknown: " (pr-str c))])

(defn root []
  [:div (render browser)])

(defn mountit []
  (render-component [root]
                    (.getElementById js/document "dev-area")))

(mountit)
