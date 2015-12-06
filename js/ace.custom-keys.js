(function(exports) {

exports.attach = attach;

function attach(ed) {
  var kbd = ed.getKeyboardHandler();

  var handlers = ed.keyBinding.$handlers;
  if (kbd.isEmacs && handlers[handlers.indexOf(kbd)-1])
    kbd = handlers[handlers.indexOf(kbd)-1];

  // so that mutli key shortcuts can be transfered from the global
  // key handler:
  ed.keyBinding.$data.keyChain = "";
  setupEvalBindings(kbd);
  setupTextManipulationBindings(kbd);
  setupSelectionAndNavigationBindings(kbd);
  setupMultiSelectBindings(kbd);
  setupEditorConfigBindings(kbd);
  setupInputLineBindings(kbd);
  setupSnippetBindings(kbd);
  setupKeyboardMacroBindings(kbd);
  setupUsefulHelperBindings(kbd);
  // setupJumpChar(kbd);

  // if (lively.Config.get("aceDefaultUseIyGotoChar")) {
  //   require('lively.ide.codeeditor.IyGotoChar').toRun(function() {
  //     lively.ide.codeeditor.IyGotoChar.setupIyGoToChar(kbd);
  //   });
  // }
}

function addCommands(kbd, commands) {
  var platform = kbd.platform; // mac or win

  function lookupCommand(keySpec) {
      return keySpec.split('|').filter(function(keys) {
          var binding = kbd.parseKeys(keys),
              command = kbd.findKeyCommand(binding.hashId, binding.key);
          return command && command.name;
      })[0];
  }

  // first remove a keybinding if one already exists
  commands.forEach(function(cmd) {
      var keys = cmd.bindKey && (cmd.bindKey[platform] || cmd.bindKey),
          existing = keys && typeof keys === "string" && lookupCommand(keys);
      if (existing) kbd.removeCommand(existing);
  });
  kbd.addCommands(commands);
}

function allCommandsOf(ed) {
  return ed.keyBinding.$handlers
    .map(function(h) { return h.commands; })
    .reduce(function(cmds, ea) {
      Object.keys(ea).forEach(function(k) { cmds[k] = ea[k]; });
      return cmds;
    }, {})
}

function lookupCommand(ed, keySpec) {
  var handler = ed.commands,
      binding = handler.parseKeys(keySpec),
      command = handler.findKeyCommand(binding.hashId, binding.key);
  if (!command) return null;
  if (!command.hasOwnProperty('toString')) {
      command.toString = function() { return '[cmd:' + command.name + ']' }
  }
  return command;
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
function setupEvalBindings(kbd) {

  addCommands(kbd, [{
          name: 'evalAll',
          exec: function(ed, args) {
              if (args && args.confirm) {
                  console.log('Evaluating complete text...');
              }
              ed.$morph.saveExcursion(function(whenDone) {
                  ed.$morph.selectAll();
                  maybeUseModeFunction(ed, "doEval", "doit", [false]);
                  whenDone();
              });
          },
          handlesCount: true,
          readOnly: true
      }, {
          name: 'doit',
          bindKey: {win: 'Ctrl-D|Ctrl-Return',  mac: 'Command-D|Command-Return'},
          exec: function(ed) { maybeUseModeFunction(ed, "doEval", "doit", [false]); },
          multiSelectAction: "forEach",
          readOnly: true // false if this command should not apply in readOnly mode
      }, {
          name: 'debugit',
          // bindKey: {win: 'Ctrl-Shift-D',  mac: 'Command-Shift-D'},
          exec: function(ed) { ed.$morph.doDebugit(); },
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: 'printit',
          bindKey: {win: 'Ctrl-P',  mac: 'Command-P'},
          exec: function(ed) { maybeUseModeFunction(ed, "doEval", "doit", [true]); },
          multiSelectAction: "forEach",
          readOnly: false
      }, {
          name: 'list protocol',
          bindKey: {win: 'Ctrl-Shift-P|Alt-Shift-P',  mac: 'Command-Shift-P'},
          exec: function(ed) { maybeUseModeFunction(ed, "doListProtocol", "doListProtocol"); },
          multiSelectAction: "single",
          readOnly: false
      }, {
          name: 'doSave',
          bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
          exec: function(ed, args) { maybeUseModeFunction(ed, "doSave", "doSave"); },
          multiSelectAction: "single",
          readOnly: false
      }, {
          name: 'printInspect',
          bindKey: {win: 'Ctrl-I',  mac: 'Command-I'},
          exec: function(ed, args) {
              maybeUseModeFunction(ed, "printInspect", "printInspect", [{depth: args && args.count}]);
          },
          multiSelectAction: "forEach",
          handlesCount: true,
          readOnly: true
      }, {
          name: 'doInspect',
          bindKey: {win: 'Ctrl-Shift-I',  mac: 'Command-Shift-I'},
          exec: morphBinding("doInspect"),
          multiSelectAction: "forEach",
          readOnly: true
      },

      // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
      {
          name: "openEvalResult",
          multiSelectAction: 'forEach',
          bindKey: {win: "Alt-o|Ctrl-o", mac: "Command-o|Alt-o"},
          exec: function(ed, args) {
              args = args || {};
              var insert = args.insert; // either insert into current editor or open in window
              var content = args.content;
      
              lively.lang.fun.composeAsync(triggerExpand)(function(err) { err && console.error(err); })
      
              return true;
      
              // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
      
              function triggerExpand(next) {
                var msgMorph = ed.$morph.ensureStatusMessageMorph();
                msgMorph = msgMorph && msgMorph.world() ? msgMorph : null;
                if (!msgMorph) return next(null, new Error("No statusmorph to expand!"));
                if (content) msgMorph.insertion = content;
                msgMorph.expand(insert ? ed.$morph : null, ed.$morph.getTextMode());
                next(null);
              }
      
            }
      },
      {
        name: "insertEvalResult",
        bindKey: {win: "Alt-i", mac: "Alt-i"},
        multiSelectAction: "forEach",
        exec: function(ed) {
           ed.execCommand('openEvalResult', {insert: true}); 
        },
      }
      ]);
      // FIXME for some reason this does not work with bindKeys?!
      kbd.bindKey("»", 'runShellCommandOnRegion');

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  function maybeUseModeFunction(ed, featureName, morphMethodName, args) {
      var mode = ed.session.getMode();
      var morph = ed.$morph;
      if (!mode[featureName]) morph[morphMethodName].apply(morph, args);
      else mode[featureName].apply(mode, [morph].concat(args));
  }
}

function setupTextManipulationBindings(kbd) {

  function joinLine(ed) {
      if (!ed.selection.isEmpty()) ed.selection.clearSelection();
      var pos = ed.getCursorPosition(),
          rowString = ed.session.doc.getLine(pos.row),
          whitespaceMatch = rowString.match(/^\s*/),
          col = (whitespaceMatch && whitespaceMatch[0].length) || 0;
      ed.moveCursorToPosition({row: pos.row, column: col});
      ed.removeToLineStart();
      ed.remove('left');
  }

  addCommands(kbd, [{
          name: 'removeSelectionOrLine',
          bindKey: {win: 'Win-X', mac: 'Command-X'},
          exec: function(ed) {
              var sel = ed.selection;
              if (sel.isEmpty()) { sel.selectLine(); }
              // let a normal "cut" to the clipboard happen
              return false;
          },
          multiSelectAction: function(ed) {
              var sel = ed.selection;
              // for all cursors: if range is empty select line
              sel.getAllRanges().forEach(function(range) {
                  if (!range.isEmpty())  return;
                  var row = range.start.row,
                      lineRange = sel.getLineRange(row, true);
                  sel.addRange(lineRange);
              });
              // let a normal "cut" to the clipboard happen
              ed.execCommand('cut');
              return false;
          },
          readOnly: false
      }, {
          name: 'insertLineAbove',
          bindKey: "Shift-Return",
          exec: function(ed) { ed.navigateUp(); ed.navigateLineEnd(); ed.insert('\n'); },
          multiSelectAction: 'forEach',
          readOnly: false
      }, {
          name: 'insertLineBelow',
          bindKey: {mac: "Command-Return", win: "Win-Return"},
          exec: function(ed) { ed.navigateLineEnd(); ed.insert('\n'); },
          multiSelectAction: 'forEach',
          readOnly: false
      }, {
          name: 'joinLineAbove',
          exec: joinLine,
          multiSelectAction: 'forEach',
          readOnly: false
      }, {
          name: 'joinLineBelow',
          exec: function(ed) { ed.navigateDown(); joinLine(ed); },
          multiSelectAction: 'forEach',
          readOnly: false
      }, {
          name: 'duplicateLine',
          exec: function(ed) { ed.execCommand('copylinesdown'); },
          multiSelectAction: 'forEach',
          readOnly: false
      }, {
          name: "movelinesup",
          exec: function(editor) { editor.moveLinesUp(); }
      }, {
          name: "movelinesdown",
          exec: function(editor) { editor.moveLinesDown(); }
      }, {
          name: "blockoutdent",
          bindKey: {win: "Ctrl-[", mac: "Command-["},
          exec: function(ed) { ed.blockOutdent(); },
          multiSelectAction: "forEach"
      }, {
          name: "blockindent",
          bindKey: {win: "Ctrl-]", mac: "Command-]"},
          exec: function(ed) { ed.blockIndent(); },
          multiSelectAction: "forEach"
      }, {
          name: "fitTextToColumn",
          bindKey: "Alt-Q",
          handlesCount: true,
          exec: function(ed, args) {

              // Takes a selection or the current line and will insert line breaks so
              // that all selected lines are not longer than printMarginColumn or the
              // specified count parameter. Breaks at word bounds.
              if (args && args.count === 4/*Ctrl-U*/) { ed.execCommand('joinLines'); return; }

              if (ed.selection.isEmpty()) selectCurrentLine(ed);
              var col                = args && args.count || ed.getOption('printMarginColumn') || 80,
                  rows               = ed.$getSelectedRows(),
                  session            = ed.session,
                  range              = ed.selection.getRange(),
                  splitRe            = /[ ]+/g,
                  // splitRe            = /[^a-zA-Z_0-9\$\-!\?,\.]+/g,
                  whitespacePrefixRe = /^[\s\t]+/;

              function splitLineIntoChunks(line, whitespacePrefix, n) {
                  if (line.length <= col) return [whitespacePrefix + line.trim()];
                  var firstChunk    = line.slice(0, col),
                      splitMatch    = Strings.reMatches(firstChunk, splitRe).last(),
                      lastWordSplit = splitMatch && splitMatch.start > 0 ? splitMatch.start : col,
                      first         = firstChunk.slice(0, lastWordSplit),
                      rest          = whitespacePrefix + (firstChunk.slice(lastWordSplit) + line.slice(col)).trimLeft();
                  return [first].concat(splitLineIntoChunks(rest, whitespacePrefix, n+1));
              }

              function fitRow(row) {
                  if (row.trim() === '') return [''];
                  var whitespacePrefixMatch = row.match(whitespacePrefixRe),
                      whitespacePrefix = whitespacePrefixMatch ? whitespacePrefixMatch[0] : '';
                  return splitLineIntoChunks(whitespacePrefix + row.trim(), whitespacePrefix);
              }

              function fitParagraph(para) {
                  return /^\s*$/.test(para) ?
                      para : fitRow(para.split('\n').join(' ')).join('\n') + '\n';
              }

              var paragraphs = Strings.paragraphs(
                  Array.range(rows.first, rows.last)
                      .map(session.getLine.bind(session))
                      .join('\n'), {keepEmptyLines: true}),
                  newString = paragraphs.map(fitParagraph).flatten().join('\n');

              ed.session.replace(range, newString);
          },
          multiSelectAction: "forEach"
      }, {
          name: "remove duplicate lines / uniq",
          exec: function(ed, args) {
              if (ed.selection.isEmpty()) ed.selection.selectAll();
              var range = ed.selection.getRange(),
                  wholeText = ed.session.getTextRange(range),
                  lines = wholeText.split('\n');
              ed.session.replace(range, lines.uniq().join('\n'));
          },
          multiSelectAction: "forEach"
      }, {
          name: "joinLines",
          exec: function(ed, args) {
              if (ed.selection.isEmpty()) return;
              var rows = ed.$getSelectedRows(),
                  range = ed.selection.getRange(),
                  wholeText = ed.session.getTextRange(range);
              ed.session.replace(range, wholeText.split('\n').join(' '));
          },
          multiSelectAction: "forEach"
      }, {
          name: "alignSelection",
          exec: function(ed, args) {
              if (ed.selection.isEmpty()) return;
              lively.morphic.World.current().prompt('Enter String or RegEx for alignment', function(input) {
                  if (!input || !input.length) return;
                  var needle = /^\/.*\/$/.test(input) ?  new RegExp(input) : needle = input;
                  ed.$morph.alignInSelectionRange(needle);
              });
          },
          multiSelectAction: "forEach"
      }, {
          name: "cleanupWhitespace",
          exec: function(ed, args) {
              var prevPos, sel = ed.selection;
              if (sel.isEmpty()) { prevPos = ed.getCursorPosition(); ed.$morph.selectAll();}
              var range = sel.getRange(),
                  wholeText = ed.session.getTextRange(range);
              ed.session.replace(range, wholeText.split('\n').invoke('replace', /\s+$/, '').join('\n'));
              if (prevPos) { sel.clearSelection(); sel.moveCursorToPosition(prevPos); }
          },
          multiSelectAction: "forEach"
      }, {
          name: "commentBox",
          exec: function(ed, args) {
              var range = ed.selection.getRange();
              if (range.isEmpty()) {
                  ed.selection.selectLine();
                  range = ed.selection.getRange();
              }

              var startLine = range.start.row,
                  endLine = range.end.column === 0 ? range.end.row - 1 : range.end.row,
                  lines = ed.$morph.getSelectionOrLineString().split('\n'),
                  indent = [range.start.column].concat(lines.map(function(line) { return line.match(/^\s*/); }).flatten().compact().pluck('length')).min(),
                  length = lines.pluck('length').max() - indent,
                  fence = Array(Math.ceil(length / 2) + 1).join('-=') + '-';

              // comment range
              ed.toggleCommentLines();
              ed.clearSelection();

              // insert upper fence
              ed.moveCursorTo(startLine, 0);
              if (args && args.count)
                ed.insert(Strings.indent("-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-" + '\n', ' ', indent));
              else
                ed.insert(Strings.indent(fence + '\n', ' ', indent));
              ed.selection.moveCursorUp();
              ed.toggleCommentLines();
              // insert fence below
              ed.moveCursorTo(endLine+2, 0);

              ed.insert(Strings.indent(fence + '\n', ' ', indent));
              ed.selection.moveCursorUp();
              ed.selection.moveCursorLineEnd();
              ed.toggleCommentLines();

              // select it all
              ed.selection.setRange({start: {row: startLine, column: 0}, end: ed.getCursorPosition()});
          },
          multiSelectAction: "forEach",
          handlesCount: true
      }, {
          name: 'curlyBlockOneLine',
          exec: function(ed) {
              // "if (foo) {\n 3+3;\n}" -> "if (foo) { 3+3; }"
              function stringLeftOfPosIncludes(pos, string) {
                  var before = ed.session.getTextRange({start: {column: 0, row: pos.row}, end: pos}),
                      idx = before.indexOf(string);
                  return idx > -1 && idx;
              }

              var pos = ed.selection.getCursor();
              // are we right from a "}" and on the same line?
              var endBracket = ed.find(/\}/, {start: pos, backwards: true, preventScroll: true});
              // if not search forward
              if (!endBracket || endBracket.end.row !== pos.row) {
                  endBracket = ed.find(/\}/, {start: pos, backwards: false, preventScroll: true});
              }
              if (!endBracket) return;
              ed.moveCursorToPosition(endBracket.end);
              pos = endBracket.end;
              var matchingBracketPos = ed.session.findMatchingBracket(pos);
              if (!matchingBracketPos) return;
              while (pos.row !== matchingBracketPos.row) {
                  joinLine(ed); ed.insert(' ');
                  pos = ed.selection.getCursor();
              }
              ed.selection.moveCursorToPosition(matchingBracketPos);
          },
          multiSelectAction: 'forEach',
          readOnly: false
      }]);
}

function setupSelectionAndNavigationBindings(kbd) {
  delete kbd.commandKeyBinding['cmd-l'];
  addCommands(kbd, [{
          name: 'clearSelection',
          bindKey: 'Escape',
          exec: morphBinding("clearSelection"),
          readOnly: true
      }, {
          name: 'selectLine',
          bindKey: {win: "Alt-L|Ctrl-L", mac: "Command-L"},
          exec: function(ed) { selectCurrentLine(ed); },
          multiSelectAction: 'forEach',
          readOnly: true
      }, {
          name: 'moveForwardToMatching',
          bindKey: {win: 'Ctrl-M',  mac: 'Command-Right'},
          exec: morphBinding("moveForwardToMatching", [false, true]),
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: 'moveBackwardToMatching',
          bindKey: {win: 'Ctrl-Alt-M',  mac: 'Command-Left'},
          exec: morphBinding("moveBackwardToMatching", [false, true]),
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: 'selectToMatchingForward',
          bindKey: {win: 'Ctrl-Shift-M',  mac: 'Command-Shift-Right'},
          exec: morphBinding("moveForwardToMatching", [true, true]),
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: 'selectToMatchingBackward',
          bindKey: {win: 'Ctrl-Shift-Alt-M',  mac: 'Command-Shift-Left'},
          exec: morphBinding("moveBackwardToMatching", [true, true]),
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: "selecttolinestart",
          bindKey: 'Shift-Home|Ctrl-Shift-A',
          exec: function(ed) { ed.getSelection().selectLineStart(); ed.renderer.scrollCursorIntoView(); },
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: "gotolinestart",
          bindKey: {win: "Home", mac: "Home|Ctrl-A"},
          exec: function(ed) { ed.navigateLineStart(); ed.renderer.scrollCursorIntoView(); },
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: "selecttolineend",
          bindKey: "Shift-End|Ctrl-Shift-E",
          exec: function(ed) { ed.getSelection().selectLineEnd(); ed.renderer.scrollCursorIntoView(); },
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: "gotolineend",
          bindKey: "End|Ctrl-E",
          exec: function(ed) { ed.navigateLineEnd(); ed.renderer.scrollCursorIntoView(); },
          multiSelectAction: "forEach",
          readOnly: true
      }, {
          name: "gotoline",
          bindKey: "Alt-G",
          exec: function (editor) {
              $world.prompt("Enter line number: ", function(input) {
                  var line = parseInt(input);
                  if (!isNaN(line)) editor.gotoLine(line);
                  editor.renderer.scrollCursorIntoView();
              }, String(editor.getCursorPositionScreen().row + 1));
          },
          readOnly: true
      }, {
          name: 'moveCursorToScreenTop',
          bindKey: 'Alt-Ctrl-,'/*Alt-Ctrl-<*/,
          exec: function(ed) {
              var currentPos = ed.getCursorPosition(),
                  firstRow = ed.renderer.getFirstFullyVisibleRow(),
                  lastRow = ed.renderer.getLastFullyVisibleRow(),
                  middleRow = firstRow+Math.floor((lastRow - firstRow)/2),
                  newPos = currentPos;
              if (currentPos.row <= firstRow) return;
              if (currentPos.row <= middleRow) newPos.row = firstRow;
              else if (currentPos.row <= lastRow) newPos.row = middleRow;
              else newPos.row = lastRow;
              ed.selection.moveCursorToPosition(newPos)
          },
          readOnly: true
      }, {
          name: 'moveCursorToScreenBottom',
          bindKey: 'Alt-Ctrl-.'/*Alt-Ctrl->*/,
          exec: function(ed) {
              var currentPos = ed.getCursorPosition(),
                  firstRow = ed.renderer.getFirstFullyVisibleRow(),
                  lastRow = ed.renderer.getLastFullyVisibleRow(),
                  middleRow = firstRow+Math.floor((lastRow - firstRow)/2),
                  newPos = currentPos;
              if (currentPos.row < firstRow) newPos.row = firstRow;
              else if (currentPos.row < middleRow) newPos.row = middleRow;
              else if (currentPos.row < lastRow) newPos.row = lastRow;
              else return;
              ed.selection.moveCursorToPosition(newPos);
          },
          readOnly: true
      }, {
          name: 'gotoNextParagraph',
          bindKey: 'Ctrl-Down',
          exec: function(ed) {
              var pos = ed.getCursorPosition(), found = -1;
              function isEmptyLine(line) { return /^\s*$/.test(line); }
              var lines = ed.session.getLines(pos.row, ed.session.getLength()), found = -1;
              for (var i = 1; i < lines.length; i++) {
                  found = i;
                  if (!isEmptyLine(lines[i-1]) && isEmptyLine(lines[i])) break;
              }
              ed.selection[ed.emacsMark && ed.emacsMark() ? "selectToPosition": "moveToPosition"]({row: pos.row+found, column: 0});
              ed.renderer.scrollCursorIntoView();
          },
          readOnly: true
      }, {

          name: 'gotoPrevParagraph',
          bindKey: 'Ctrl-Up',
          exec: function(ed) {
              function isEmptyLine(line) { return /^\s*$/.test(line); }
              var pos = ed.getCursorPosition(), found = -1,
                  lines = ed.session.getLines(0, pos.row);
              for (var i = lines.length-2; i >= 0; i--) {
                  found = i;
                  if (!isEmptyLine(lines[i+1]) && isEmptyLine(lines[i])) break;
              }
              ed.selection[ed.emacsMark && ed.emacsMark() ? "selectToPosition": "moveToPosition"]({row: found, column: 0});
              ed.renderer.scrollCursorIntoView();
          },
          readOnly: true
      }, {
          bindKey: {mac: "©"},
          name: "gotolineInsertPreventMac",
          readOnly: true,
          exec: function (ed) {
              // Alt-G = gotoline will insert © in Mac OS, this prevents it
          }
      }]);
      kbd.bindKey("Alt-Shift-.", 'gotoend');

      // move foldall from "Ctrl-Alt-0" to "Ctrl-Alt-Shift-0" on windows
      // b/c of the move commands
      if (kbd.platform === 'win') {
          kbd.bindKey("Ctrl-Alt-0", null);
          kbd.bindKey("Ctrl-Alt-Shift-0", "foldall");
      }
}

function setupMultiSelectBindings(kbd) {
  addCommands(kbd, [{
      name: "multiSelectNext",
      bindKey: "Ctrl-Shift-.",
      exec: function(ed) { console.log("????");multiSelectNext(ed); },
      readOnly: true
  }, {
      name: "multiSelectPrev",
      bindKey: "Ctrl-Shift-,",
      exec: function(ed) { multiSelectPrev(ed); },
      readOnly: true
  }, {
      name: "multiSelectJumpToPrevRange",
      bindKey: "Command-Shift-,",
      exec: function(ed) { multiSelectJump(ed, "prev"); },
      readOnly: true
  }, {
      name: "multiSelectJumpToNextRange",
      bindKey: "Command-Shift-.",
      exec: function(ed) { multiSelectJump(ed, "next"); },
      readOnly: true
  }, {
      name: "selectAllLikeThis",
      bindKey: "Ctrl-Shift-/",
      exec: function(ed) {
          ed.pushEmacsMark && ed.pushEmacsMark(ed.getCursorPosition());
          ed.findAll(ed.session.getTextRange()); },
      readOnly: true
  }]);

  kbd.bindKey("Ctrl-Shift-L", 'selectSymbolReferenceOrDeclarationPrev');
  kbd.bindKey("Ctrl-Shift-º", 'selectSymbolReferenceOrDeclarationNext'); // Ctrl-Shift-:
  kbd.bindKey("Ctrl-Shift-'", 'selectSymbolReferenceOrDeclaration');
}

function setupEditorConfigBindings(kbd) {
      addCommands(kbd, [{
          name: 'increasefontsize',
          bindKey: {win: "Ctrl-+", mac: "Command-="},
          exec: function(ed) { ed.$morph.setFontSize(ed.$morph.getFontSize() + 1); },
          readOnly: true
      }, {
          name: 'decreasefontsize',
          bindKey: {win: "Ctrl-+", mac: "Command--"},
          exec: function(ed) { ed.$morph.setFontSize(ed.$morph.getFontSize() - 1); },
          readOnly: true
      }, {
          name: 'changeTextMode',
          exec: function(ed) {
              var codeEditor = ed.$morph,
                  currentTextMode = codeEditor.getTextMode(),
                  modes = lively.ide.ace.availableTextModes().map(function(mode) {
                      return {string: Strings.format('[%s] %s', mode === currentTextMode ? 'X' : ' ', mode), value: mode, isListItem: true }; });
              lively.ide.tools.SelectionNarrowing.chooseOne(modes,
                  function(err, mode) { codeEditor.setTextMode(mode); },
                  {name: 'lively.ide.CodeEditor.TextMode.NarrowingList', prompt: 'choose mode: '})
              return true;
          },
          handlesCount: true
      }, {
          name: "toggleShowGutter",
          exec: function(ed) { ed.$morph.setShowGutter(!ed.$morph.getShowGutter()); }
      }, {
          name: "toggleShowInvisibles",
          exec: function(ed) { ed.$morph.setShowInvisibles(!ed.$morph.getShowInvisibles()); }
      }, {
          name: "toggleShowPrintMargin",
          exec: function(ed) { ed.$morph.setShowPrintMargin(!ed.$morph.getShowPrintMargin()); }
      }, {
          name: "toggleShowIndents",
          exec: function(ed) { ed.$morph.setShowIndents(!ed.$morph.getShowIndents()); }
      }, {
          name: "toggleShowActiveLine",
          exec: function(ed) { ed.$morph.setShowActiveLine(!ed.$morph.getShowActiveLine()); }
      }, {
          name: "toggleSoftTabs",
          exec: function(ed) { ed.$morph.setSoftTabs(!ed.$morph.getSoftTabs()); }
      }, {
          name: "toggleLineWrapping",
          exec: function(ed) { ed.$morph.setLineWrapping(!ed.$morph.getLineWrapping()); }
      }, {
          name: "set tab size",
          exec: function(ed) {
              $world.prompt('enter new tab size', function(input) {
                  var size = input && Number(input);
                  if (!size) { show("not a valid tab size: %s", size); return; }
                  ed.$morph.setTabSize(size);
                  $world.confirm('Set tab size to ' + size + ' for all editors?', function(input) {
                      if (!input) { ed.$morph.focus(); return; }
                      var size = 2;
                      $world.withAllSubmorphsSelect(function(ea) { return ea.isCodeEditor; })
                        .invoke("setTabSize", size);
                      lively.Config.set('defaultTabSize', size);
                      lively.morphic.CodeEditor.prototype.style.tabSize = size;
                      alertOK('Changed global tab size to ' + size);
                      ed.$morph.focus();
                  });
                  ed.$morph.focus();
              }, ed.$morph.guessTabSize() || ed.$morph.getTabSize() || lively.Config.defaultTabSize);
           }
      }, {
          name: "set line ending mode",
          exec: function(ed) {
              lively.ide.tools.SelectionNarrowing.chooseOne(['auto', 'unix', 'windows'], function(err, choice) {
                  ed.$morph.setNewLineMode(choice || 'auto');
                  ed.$morph.focus();
              });
          }
      }, {
          name: "toggle text overlays",
          exec: function(ed) {
              var enabled = ed.$morph.getTextOverlaysEnabled();
              ed.$morph.setTextOverlaysEnabled(!enabled);
              var method = ed.$morph.jQuery().find('.text-overlay').hasClass('hidden') ?
                  "unhideTextOverlays" : "hideTextOverlays"
              ed.$morph[method]();
          }
      }, {
          name: "toggle showing errors",
          exec: function(ed) {
              var showsErrors = ed.$morph.getShowErrors();
              ed.$morph.setShowErrors(!showsErrors);
              alertOK('showing errors ' + (!showsErrors ? 'enabled': 'disabled'));
          }
      }, {
          name: "toggle showing warnings",
          exec: function(ed) {
              var showsWarnings = ed.$morph.getShowWarnings();
              ed.$morph.setShowWarnings(!showsWarnings);
              alertOK('showing warnings ' + (!showsWarnings ? 'enabled': 'disabled'));
          }
      }, {
          name: "guess tab size",
          exec: function(ed) {
              ed.$morph.guessAndSetTabSize();
          }
      }, {
          name: "describeKey",
          exec: function(ed) {
            var lastKeys = [], found = false;
            var reset = ace.ext.keys.captureEditorCommand(ed,
              function(cmd) { withResultDo(null, cmd); },
              function(hashId, keyString, keyCode, e) {
                if (e) {
                    lively.morphic.EventHandler.prototype.patchEvent(e);
                    lastKeys.push(e.getKeyString({ignoreModifiersIfNoCombo: true}));
                }
              });
            ed.$morph.setStatusMessage("Press key(s) to find out what command the key is bound to");

            lively.lang.fun.waitFor(15*1000, function() { return !!found; },
              function(timeout) {
                if (!timeout) return;
                reset();
                ed.$morph.hideStatusMessage();
              })

            function withResultDo(err, cmd) {
              if (err) return console.error(err.stack || err);
              found = true;
              console.log({
                  title: 'describe key "' + lastKeys.join(' ') + '"',
                  content: Strings.format('"%s" is bound to\n%s',
                      lastKeys.join(' '), Objects.inspect(cmd)),
                  textMode: 'text'
              }).getWindow().comeForward();
            }
          }
      }]);
}

function setupInputLineBindings(kbd) {
  addCommands(kbd, [{
          name: 'linebreak',
          exec: function(ed) { cmdLine.insert("\n"); }
      }, {
          name: 'entercommand',
          exec: function(ed) {
              if (ed.$morph.commandLineInput) {
                  ed.$morph.commandLineInput(ed.getValue());
              } else {
                  lively.morphic.show('CommandLine should implement #commandLineInput');
              }
          }
      }]);
}

function setupSnippetBindings(kbd) {
  addCommands(kbd, [{
      bindKey: 'Tab',
      name: 'expandSnippetOrDoTab',
      exec: function (ed) {
          var success = ed.$morph.getSnippets().getSnippetManager().expandWithTab(ed);

          // the five lines below are for not accidentally re-expanding snippets,
          // e.g. mutliple expands of forEach when first "tabStop" is directly at the
          // key that triggers expansion
          if (ed.tabstopManager) {
              ed.tabstopManager.keyboardHandler.bindKeys({
                  "Tab": function(ed) { ed.tabstopManager.tabNext(1); }
              })
          }

          if (!success) ed.execCommand("indent");
      },
      multiSelectAction: "forEach"
  }, {
      name: 'browseSnippets',
      exec: function(ed) {
          ed.$morph.withSnippetsForCurrentModeDo(function(err, snippets) {
              var list = snippets ?
                  Properties.forEachOwn(snippets, function(name, snippet) {
                      return {isListItem: true, string: name, value: snippet} }) :
                  ['no snippets: ' + err];
              lively.ide.tools.SelectionNarrowing.chooseOne(list, function(err, candidate) {
                  candidate && ed.$morph.insertSnippetNamedAt(candidate.name); });
          });
      },
      multiSelectAction: "forEach"
  }]);
}

function setupKeyboardMacroBindings(kbd) {
  function macroString(macro) {
      var table = macro.map(function(recordStep) {
          // 2-elem-list: 0: command invoked, 1: key press
          return [
              recordStep[1] ? Strings.print(recordStep[1]) : '""',
              recordStep[0] ? recordStep[0].name : 'unknown'];
      });
      return Strings.printTable(table);
  }
  kbd.addCommands([{
      name: "viewrecording",
      exec: function(ed) {
          if (!ed.commands.macro) { show('no recording'); return; }
          show(macroString(ed.commands.macro));
      },
      readOnly: true
  }, {
      name: "togglerecording",
      bindKey: {win: "Ctrl-Alt-E", mac: "Command-Option-E"},
      exec: function(ed) {
          var cmds = ed.commands;
          cmds.toggleRecording(ed);
          var recording = !!cmds.recording;
          ed.$morph.setStatusMessage((recording ? 'Start' : 'Stop') + ' recording keys');
          if (recording) {
              if (!cmds.$showAddCommandToMacro) {
                  cmds.$showAddCommandToMacro = function(e) {
                      var name = e.command ? e.command.name : '', out = name;
                      if (name === 'insertstring') out = e.args || '';
                      ed.$morph.setStatusMessage(out);
                  }
              }
              cmds.on("exec", cmds.$showAddCommandToMacro);
          } else {
              cmds.removeEventListener("exec", cmds.$showAddCommandToMacro);
          }
      },
      readOnly: true
  }, {
      name: "replaymacro",
      bindKey: {win: "Ctrl-Shift-E", mac: "Command-Shift-E"},
      exec: function(ed) {
          ed.$morph.setStatusMessage('Replay recording');
          ed.commands.replay(ed);
      },
      readOnly: true
  }]);
}

function setupUsefulHelperBindings(kbd) {
  kbd.addCommands([{
      name: 'insertDate',
      exec: function(ed, args) {
          var dateString = args && args.count ?
              new Date().format('isoDate')/*short*/ :
              new Date().format('mediumDate')/*long*/;
          ed.onPaste(dateString);
      },
      multiSelectAction: 'forEach',
      handlesCount: true
  }, {
      name: "stringifySelection",
      exec: function(editor) {
          var sel = editor.selection;
          if (!sel || sel.isEmpty()) return;
          var range =  editor.getSelectionRange(),
              selString = editor.session.getTextRange(range),
              stringified = selString
                  .split('\n')
                  .invoke('replace' ,/"/g, '\\"')
                  .invoke('replace' ,/(.+)/g, '"$1\\n"')
                  .join('\n+ ');
          editor.session.doc.replace(range, stringified);
      }
  }, {
      name: 'browseURLOrPathInWebBrowser',
      exec: function(ed, args) {
          var col = ed.getCursorPosition().column,
              source = ed.$morph.getSelectionOrLineString(),
              urlRe = /(?:file|https?):\/\/[^\s]+/g,
              matches = Strings.reMatches(source, urlRe),
              browseThing = '';
          if (matches.length > 0) {
              browseThing = (matches.detect(function(ea) {
                  return ea.start <= col && col <= ea.end;
              }) || matches.first()).match;
          } else {
              var start = Strings.peekLeft(source, col, ' ') || 0,
                  end = Strings.peekRight(source, col, ' ') || source.length;
              browseThing = source.slice(start, end);
          }
          window.open(browseThing);
      },
      multiSelectAction: 'forEach',
      handlesCount: true
  }, {
      name: 'prettyPrintHTMLAndXML',
      exec: function(ed, args) {
          function tidy(xmlString, thenDo) {
              return lively.shell.run(
                  'tidy -i -xml -q -',
                  {stdin: xmlString},
                  function(err, cmd) { thenDo && thenDo(cmd.getCode(), cmd.resultString()); }).resultString();
          }
          var source = ed.$morph.getSelectionOrLineString(),
              range = ed.$morph.getSelectionRangeAce();
          tidy(source, function(err, resultString) {
              ed.$morph.replace(range, resultString); })
      },
      multiSelectAction: 'forEach',
      handlesCount: true
  }]);
}

function morphBinding(arg) {
  console.log("ignoring %s", arg);
}

function setupJumpChar(kbd) {
  lively.ide.codeeditor.JumpChar.setup(kbd);
}

function selectCurrentLine(ed, reverse) {
  var pos = ed.getCursorPosition(),
      sel = ed.selection,
      range = sel.getLineRange(pos.row, true/*exclude last char*/);
  if (range.isEqual(sel.getRange())) {
      // toggle between line selection including starting spaces and
      // line selection without starting spaces
      sel.moveCursorLineStart()
      range.setStart(sel.getCursor());
  }
  sel.setSelectionRange(range, reverse);
}

function getCurrentSearchTerm(ed) {
  return ed.$search
      && ed.$search.$options
      && ed.$search.$options.needle;
}

function multiSelectNext(ed) { multiSelect(ed, {backwards: false}); }
function multiSelectPrev(ed) { multiSelect(ed, {backwards: true}); }

function multiSelect(ed, options) {
  options = options || {};
  // if the text in the current selection matches the last search
  // use the last search string or regexp to add new selections.
  // Otherwise use the currently selected text as the new search
  // term
  var needle, lastSearch = getCurrentSearchTerm(ed);
  if (!ed.selection.inMultiSelectMode && !ed.selection.isEmpty()) {
      var range = ed.selection.getRange();
      needle = ed.session.getTextRange(range);
  }
  if (!needle
    || needle === lastSearch
    || (lastSearch instanceof RegExp && lastSearch.test(needle))) {
      needle = lastSearch;
  }
  if (!needle) needle = '';
  var foundRange = ed.find({
      skipCurrent: true,
      backwards: options.backwards,
      needle: needle,
      preventScroll: true
  });
  ed.selection.addRange(foundRange);
  ed.renderer.scrollCursorIntoView();
}

function multiSelectJump(ed, dir) {
  // When multiple ranges are active, one of them is the "current" that
  // is returned by `ed.getRange()` and that gets the cursor
  // when the selections are deactivated. This method can be used to
  // cycle back and forth between the current range.
  var sel = ed.selection,
      ranges = sel.getAllRanges(),
      range = sel.getRange(),
      multiRange = ranges.filter(function(r) { return r.isEqual(range); })[0],
      i = ranges.indexOf(multiRange),
      nextI = dir === "next" ?
        (i+1) % ranges.length :
        i === 0 ? ranges.length-1 : i-1,
      newRange = ranges[nextI];
  ed.exitMultiSelectMode();
  sel.setRange(newRange);
  ranges
    .filter(function(r) { return r !== newRange; })
    .forEach(function(ea) { sel.addRange(ea, true); });
  ed.centerSelection();
  ed.renderer.scrollCursorIntoView();
}

function collapseSelection(ed, dir) {
    // dir = 'start' || 'end'
    var sel = ed.selection, range = sel.getRange();
    dir && sel.moveCursorToPosition(range[dir]);
    sel.clearSelection();
}

})(window.moreAceKeys || (window.moreAceKeys = {}));
