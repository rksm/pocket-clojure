(ns pocket-clojure.editor
  (:require [medley.core :refer [distinct-by]]
            cljs_bootstrap.core))

(defn eval-and-print
  ([code] (eval-and-print code (fn [result])))
  ([code cb]
   (let [code (str "(do\n" code "\n)")]
     (cljs_bootstrap.core/read_eval_print
     code
     (fn [success result]
       (if success
         (.log js/console result)
         (let [cause (some-> result .-cause .-cause)]
           (if cause
             (.error js/console cause)
             (.error js/console result))))
       (if cb (cb result)))))))


(def custom-commands
  [{:name "pocket-clojure.eval"
    :exec (fn [ed args]
            (let [range (.. ed -selection getRange)
                  range (if (.isEmpty range)
                          (let [pos (.getCursorPosition ed)
                                row (.-row pos)
                                Range (.-constructor range)]
                            (Range. row 0 row (.. ed -session (getLine row) -length)))
                          range)
                  code (.. ed -session (getTextRange range))]
              (eval-and-print code)))}
   {:name "pocket-clojure.eval-all"
    :exec (fn [ed args] (eval-and-print (.getValue ed)))}])

(def key-bindings {"Command-d" "pocket-clojure.eval",
                  "Command-s" "pocket-clojure.eval-all",
                  "Tab" "pareditExpandSnippetOrIndent"})

(defn prepare-editor
  [editor]
  (let [opts {:enableBasicAutocompletion true
              :enableSnippets true
              :showGutter false
              :highlightActiveLine false
              :showPrintMargin false
              :fontSize 11}
        mode "ace/mode/clojure"
        theme "ace/theme/solarized_light"]
    (doto editor
      (.setTheme theme)
      (.setOptions (clj->js opts))
      (.. getSession (setMode mode)))))

(defn setup-commands
  [editor]
  (let [occur (-> js/ace (.require "ace/commands/occur_commands") .-occurStartCommand)
        commands (.. (array occur)
                     (concat (clj->js custom-commands))
                     (concat (.. js/ace -ext -lang -astCommands))
                     (concat (.. js/ace -ext -lang -paredit -commands)))
        ; commands (medley.core/distinct-by (fn [cmd] (or (:name cmd) (.-name cmd))) commands)
        ]
    (.. editor -commands (addCommands commands))))

(defn setup-key-bindings [editor]
  (let [emacs-handler (-> js/ace (.require "ace/keyboard/emacs") .-handler)
        spec (clj->js {"modes" ["ace/mode/clojure"]
                       "commandKeyBinding" key-bindings})]
    (.. editor -keyBinding (addKeyboardHandler emacs-handler))
    (.. js/ace -ext -keys (addKeyCustomizationLayer "pocket-clojure.keys" spec))))

(defn setup-auto-save
  [editor]
  (.on editor "change"
       (fn []
         (let [id (.. editor -renderer getContainerElement -id)
               name (str "pocket-clojure.workspace." id)
               saved (js-obj
                      "content" (.getValue editor)
                      "cursor" (.getCursorPosition editor))]
           (aset js/localStorage name (js/JSON.stringify saved))))))

(defn restore
  [editor]
  (let [id (.. editor -renderer getContainerElement -id)
        name (str "pocket-clojure.workspace." id)
        content (aget js/localStorage name)]
    (when content
      (try
        (let [saved (js/JSON.parse content)
              code (.-content saved)
              pos (.-cursor saved)]
          (when code (.setValue editor code))
          (when pos (.moveCursorToPosition editor pos))
          (.. editor -selection clearSelection))
        (catch js/Error e (.error js/console e))))))

(defn setup
  [editor]
  (doto editor
    prepare-editor
    setup-commands
    setup-key-bindings
    setup-auto-save
    ; .focus
    )
  (js/setTimeout (fn [] (restore editor)) 100)
  )

(defn setup-by-id
  [id]
  (let [e (js/ace.edit id)]
    (setup e)
    (aset js/window id e)))
