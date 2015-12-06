(function () {

var isWindows = window.navigator && window.navigator.platform == "Win32",
    isLinux = window.navigator && window.navigator.platform.match(/^Linux/),
    isMacOS = window.navigator && window.navigator.platform.match(/^Mac/);

ace.config.loadModule(["keybinding", 'ace/keyboard/emacs'], function(emacsKeys) {
  var handler = emacsKeys.handler;
  handler.platform = isLinux || isWindows ? 'win' : 'mac';
  setupEmacsSpecificCommands(handler);
});

function setupEmacsSpecificCommands(kbd) {

  // we have our own alt-x
  delete kbd.commandKeyBinding['m-x'];

  // ------------------
  // key command setup
  // ------------------
  kbd.addCommands([{
      name: 'markword',
      exec: function(ed) {
          var sel = ed.selection;
          var range = sel.getRange();
          ed.moveCursorToPosition(range.end);
          sel.moveCursorWordRight();
          range.setEnd(sel.lead.row, sel.lead.column);
          sel.setRange(range, true);
      },
      multiSelectAction: 'forEach',
      readOnly: false
  }, {
      name: 'jumpToMark',
      exec: function(ed) {
          var sel = ed.selection;
          var p = sel.isEmpty() ? ed.getLastEmacsMark() : sel.anchor;
          p && ed.moveCursorToPosition(p);
      },
      readOnly: true
  }, {
      name: 'pushMark',
      exec: function(ed) { ed.pushEmacsMark(ed.getCursorPosition()); },
      readOnly: true
  }, {
     name: "dividercomment",
     exec: function(editor) {
         editor.insert("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-");
         editor.toggleCommentLines();
      }
  },

  // commandline
  {
      name: 'returnorcommandlineinput',
      exec: function(ed) {
          if (!ed.isCommandLine) { ed.insert("\n"); return; }
          ed.commandLineInput && ed.commandLineInput(ed.getValue());
      }
  }]);

  var shiftCmdPrefix = kbd.platform === 'mac' ? 'S-CMD-' : 'S-C-',
      cmdLPrefix = shiftCmdPrefix + 'l ';
  function bind(keys, command) { var binding = {}; binding[keys] = command; return binding; };

  kbd.bindKeys({"C-_": 'undo'});
  kbd.bindKeys({"C-S--": 'undo'});
  kbd.bindKeys({"C-x u": 'undo'});
  kbd.bindKeys({"C-x C-s": 'doSave'});

  kbd.bindKeys({"C-Up": 'gotoPrevParagraph'});
  kbd.bindKeys({"C-Down": 'gotoNextParagraph'});

  kbd.bindKeys({"M-g": 'null'});
  kbd.bindKeys({"M-g g": 'gotoline'});
  kbd.bindKeys({"M-g n": 'gotoNextErrorOrWarning'});
  kbd.bindKeys({"M-g p": 'gotoPrevErrorOrWarning'});

  kbd.bindKeys({"CMD-2": "pushMark"});
  kbd.bindKeys({"CMD-3": "jumpToMark"});
  kbd.bindKeys({"S-M-2": "markword"});

  kbd.bindKeys({"C-x C-u": "touppercase"});
  kbd.bindKeys({"C-x C-l": "tolowercase"});

  // lines
  kbd.bindKeys({"C-M-P": "addCursorAbove"});
  kbd.bindKeys({"C-M-N": "addCursorBelow"});
  kbd.bindKeys({"C-CMD-Up": "movelinesup"});
  kbd.bindKeys({"C-CMD-P": "movelinesup"});
  kbd.bindKeys({"C-CMD-Down": "movelinesdown"});
  kbd.bindKeys({"C-CMD-N": "movelinesdown"});
  kbd.bindKeys({"C-c j": "joinLineAbove"});
  kbd.bindKeys({"C-c S-j": "joinLineBelow"});
  kbd.bindKeys({'C-c p': "duplicateLine"});
  kbd.bindKeys({'C-c CMD-j': "curlyBlockOneLine"});
  kbd.bindKeys(bind(cmdLPrefix + "c a r", "alignSelection"));

  kbd.bindKeys({'C-x C-x': "exchangePointAndMark"});

  kbd.bindKeys(bind(cmdLPrefix + "j s s t r", "stringifySelection"));
  kbd.bindKeys(bind(cmdLPrefix + "d i f f", "openDiffer"));
  kbd.bindKeys(bind(cmdLPrefix + "m o d e", "changeTextMode"));

  kbd.bindKeys(bind(cmdLPrefix + "l t", "toggleLineWrapping"));

  kbd.bindKeys(bind(cmdLPrefix + "/ d", "dividercomment"));
  kbd.bindKeys(bind(cmdLPrefix + "/ b", "commentBox"));

  // evaluation
  kbd.bindKeys({"C-x C-e": "printit"});
  kbd.bindKeys(bind(cmdLPrefix + "x b", {command: "evalAll", args: {confirm: true}}));
  kbd.bindKeys({"CMD-i": "printInspect"}); // re-apply to be able to use count arg
  kbd.bindKeys({"CMD-g": "doAutoEvalPrintItComments"});

  kbd.bindKeys({"C-h k": "describeKey"});

  kbd.bindKeys({"C-x h": "selectall"});
  kbd.bindKeys({"C-c C-S-,": "selectAllLikeThis"});
  kbd.bindKeys({"CMD-f": 'moveForwardToMatching'});
  kbd.bindKeys({"CMD-b": 'moveBackwardToMatching'});
  // conflict with invoke search...
  // kbd.bindKeys({"S-CMD-f": 'selectToMatchingForward'});
  // kbd.bindKeys({"S-CMD-b": 'selectToMatchingBackward'});

  kbd.bindKeys(bind(cmdLPrefix + "s n i p", 'browseSnippets'));
  // kbd.bindKeys(bind("S-CMD-c", 'browseSnippets'));

  kbd.bindKeys({"M-q": 'fitTextToColumn'});
  kbd.bindKeys(bind(cmdLPrefix + "w t", 'cleanupWhitespace'));
}

})();