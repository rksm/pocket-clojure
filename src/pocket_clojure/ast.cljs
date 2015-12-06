(ns pocket-clojure.ast)

(def walk (.-walk js/paredit))

(defn source-for-last-sexp-before-cursor
  [editor]
  (let [ast (-> editor .-session (aget "$ast"))
        idx (.. editor getCursorIndex)
        lastSexp (if ast (.prevSexp walk ast idx))]
    (if lastSexp
      (let [end (.-end lastSexp)
            start (loop [start (.-start lastSexp)]
                    (if-let [directLeftSpecial (last (.sexpsAt walk ast start (fn [n]
                                                                                (and (= (.-type n) "special")
                                                                                     (< (.-start n) start)
                                                                                     (= (.-end n) start)))))]
                      (recur (.-start directLeftSpecial))
                      start))]
        (.. editor getValue (slice start end)))
      "")))
