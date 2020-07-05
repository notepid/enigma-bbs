/*
 * Generated by PEG.js 0.10.0.
 *
 * http://pegjs.org/
 */

"use strict";

function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function peg$SyntaxError(message, expected, found, location) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.location = location;
  this.name     = "SyntaxError";

  if (typeof Error.captureStackTrace === "function") {
    Error.captureStackTrace(this, peg$SyntaxError);
  }
}

peg$subclass(peg$SyntaxError, Error);

peg$SyntaxError.buildMessage = function(expected, found) {
  var DESCRIBE_EXPECTATION_FNS = {
        literal: function(expectation) {
          return "\"" + literalEscape(expectation.text) + "\"";
        },

        "class": function(expectation) {
          var escapedParts = "",
              i;

          for (i = 0; i < expectation.parts.length; i++) {
            escapedParts += expectation.parts[i] instanceof Array
              ? classEscape(expectation.parts[i][0]) + "-" + classEscape(expectation.parts[i][1])
              : classEscape(expectation.parts[i]);
          }

          return "[" + (expectation.inverted ? "^" : "") + escapedParts + "]";
        },

        any: function(expectation) {
          return "any character";
        },

        end: function(expectation) {
          return "end of input";
        },

        other: function(expectation) {
          return expectation.description;
        }
      };

  function hex(ch) {
    return ch.charCodeAt(0).toString(16).toUpperCase();
  }

  function literalEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/"/g,  '\\"')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function classEscape(s) {
    return s
      .replace(/\\/g, '\\\\')
      .replace(/\]/g, '\\]')
      .replace(/\^/g, '\\^')
      .replace(/-/g,  '\\-')
      .replace(/\0/g, '\\0')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/[\x00-\x0F]/g,          function(ch) { return '\\x0' + hex(ch); })
      .replace(/[\x10-\x1F\x7F-\x9F]/g, function(ch) { return '\\x'  + hex(ch); });
  }

  function describeExpectation(expectation) {
    return DESCRIBE_EXPECTATION_FNS[expectation.type](expectation);
  }

  function describeExpected(expected) {
    var descriptions = new Array(expected.length),
        i, j;

    for (i = 0; i < expected.length; i++) {
      descriptions[i] = describeExpectation(expected[i]);
    }

    descriptions.sort();

    if (descriptions.length > 0) {
      for (i = 1, j = 1; i < descriptions.length; i++) {
        if (descriptions[i - 1] !== descriptions[i]) {
          descriptions[j] = descriptions[i];
          j++;
        }
      }
      descriptions.length = j;
    }

    switch (descriptions.length) {
      case 1:
        return descriptions[0];

      case 2:
        return descriptions[0] + " or " + descriptions[1];

      default:
        return descriptions.slice(0, -1).join(", ")
          + ", or "
          + descriptions[descriptions.length - 1];
    }
  }

  function describeFound(found) {
    return found ? "\"" + literalEscape(found) + "\"" : "end of input";
  }

  return "Expected " + describeExpected(expected) + " but " + describeFound(found) + " found.";
};

function peg$parse(input, options) {
  options = options !== void 0 ? options : {};

  var peg$FAILED = {},

      peg$startRuleFunctions = { start: peg$parsestart },
      peg$startRuleFunction  = peg$parsestart,

      peg$c0 = "|",
      peg$c1 = peg$literalExpectation("|", false),
      peg$c2 = "&",
      peg$c3 = peg$literalExpectation("&", false),
      peg$c4 = "!",
      peg$c5 = peg$literalExpectation("!", false),
      peg$c6 = "(",
      peg$c7 = peg$literalExpectation("(", false),
      peg$c8 = ")",
      peg$c9 = peg$literalExpectation(")", false),
      peg$c10 = function(left, right) { return left || right; },
      peg$c11 = function(left, right) { return left && right; },
      peg$c12 = function(value) { return !value; },
      peg$c13 = function(value) { return value; },
      peg$c14 = ",",
      peg$c15 = peg$literalExpectation(",", false),
      peg$c16 = " ",
      peg$c17 = peg$literalExpectation(" ", false),
      peg$c18 = "[",
      peg$c19 = peg$literalExpectation("[", false),
      peg$c20 = "]",
      peg$c21 = peg$literalExpectation("]", false),
      peg$c22 = function(acs, a) { return checkAccess(acs, a); },
      peg$c23 = /^[A-Z]/,
      peg$c24 = peg$classExpectation([["A", "Z"]], false, false),
      peg$c25 = function(c) { return c.join(''); },
      peg$c26 = /^[A-Za-z0-9\-_+]/,
      peg$c27 = peg$classExpectation([["A", "Z"], ["a", "z"], ["0", "9"], "-", "_", "+"], false, false),
      peg$c28 = function(a) { return a.join('') },
      peg$c29 = function(v) { return v; },
      peg$c30 = function(start, last) { return start.concat(last); },
      peg$c31 = function(l) { return l; },
      peg$c32 = /^[0-9]/,
      peg$c33 = peg$classExpectation([["0", "9"]], false, false),
      peg$c34 = function(d) { return parseInt(d.join(''), 10); },

      peg$currPos          = 0,
      peg$savedPos         = 0,
      peg$posDetailsCache  = [{ line: 1, column: 1 }],
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$savedPos, peg$currPos);
  }

  function location() {
    return peg$computeLocation(peg$savedPos, peg$currPos);
  }

  function expected(description, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildStructuredError(
      [peg$otherExpectation(description)],
      input.substring(peg$savedPos, peg$currPos),
      location
    );
  }

  function error(message, location) {
    location = location !== void 0 ? location : peg$computeLocation(peg$savedPos, peg$currPos)

    throw peg$buildSimpleError(message, location);
  }

  function peg$literalExpectation(text, ignoreCase) {
    return { type: "literal", text: text, ignoreCase: ignoreCase };
  }

  function peg$classExpectation(parts, inverted, ignoreCase) {
    return { type: "class", parts: parts, inverted: inverted, ignoreCase: ignoreCase };
  }

  function peg$anyExpectation() {
    return { type: "any" };
  }

  function peg$endExpectation() {
    return { type: "end" };
  }

  function peg$otherExpectation(description) {
    return { type: "other", description: description };
  }

  function peg$computePosDetails(pos) {
    var details = peg$posDetailsCache[pos], p;

    if (details) {
      return details;
    } else {
      p = pos - 1;
      while (!peg$posDetailsCache[p]) {
        p--;
      }

      details = peg$posDetailsCache[p];
      details = {
        line:   details.line,
        column: details.column
      };

      while (p < pos) {
        if (input.charCodeAt(p) === 10) {
          details.line++;
          details.column = 1;
        } else {
          details.column++;
        }

        p++;
      }

      peg$posDetailsCache[pos] = details;
      return details;
    }
  }

  function peg$computeLocation(startPos, endPos) {
    var startPosDetails = peg$computePosDetails(startPos),
        endPosDetails   = peg$computePosDetails(endPos);

    return {
      start: {
        offset: startPos,
        line:   startPosDetails.line,
        column: startPosDetails.column
      },
      end: {
        offset: endPos,
        line:   endPosDetails.line,
        column: endPosDetails.column
      }
    };
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildSimpleError(message, location) {
    return new peg$SyntaxError(message, null, null, location);
  }

  function peg$buildStructuredError(expected, found, location) {
    return new peg$SyntaxError(
      peg$SyntaxError.buildMessage(expected, found),
      expected,
      found,
      location
    );
  }

  function peg$parsestart() {
    var s0;

    s0 = peg$parseorExpr();

    return s0;
  }

  function peg$parseOR() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 124) {
      s0 = peg$c0;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c1); }
    }

    return s0;
  }

  function peg$parseAND() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 38) {
      s0 = peg$c2;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c3); }
    }

    return s0;
  }

  function peg$parseNOT() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 33) {
      s0 = peg$c4;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c5); }
    }

    return s0;
  }

  function peg$parsegroupOpen() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 40) {
      s0 = peg$c6;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c7); }
    }

    return s0;
  }

  function peg$parsegroupClose() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 41) {
      s0 = peg$c8;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c9); }
    }

    return s0;
  }

  function peg$parseorExpr() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseandExpr();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseOR();
      if (s2 !== peg$FAILED) {
        s3 = peg$parseorExpr();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c10(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseandExpr();
    }

    return s0;
  }

  function peg$parseandExpr() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsenotExpr();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseAND();
      if (s2 === peg$FAILED) {
        s2 = null;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseorExpr();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c11(s1, s3);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parsenotExpr();
    }

    return s0;
  }

  function peg$parsenotExpr() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseNOT();
    if (s1 !== peg$FAILED) {
      s2 = peg$parseatom();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c12(s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parseatom();
    }

    return s0;
  }

  function peg$parseatom() {
    var s0, s1, s2, s3;

    s0 = peg$parseacsCheck();
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsegroupOpen();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseorExpr();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsegroupClose();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c13(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    }

    return s0;
  }

  function peg$parsecomma() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 44) {
      s0 = peg$c14;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c15); }
    }

    return s0;
  }

  function peg$parsews() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 32) {
      s0 = peg$c16;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c17); }
    }

    return s0;
  }

  function peg$parseoptWs() {
    var s0, s1;

    s0 = [];
    s1 = peg$parsews();
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      s1 = peg$parsews();
    }

    return s0;
  }

  function peg$parselistOpen() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 91) {
      s0 = peg$c18;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c19); }
    }

    return s0;
  }

  function peg$parselistClose() {
    var s0;

    if (input.charCodeAt(peg$currPos) === 93) {
      s0 = peg$c20;
      peg$currPos++;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c21); }
    }

    return s0;
  }

  function peg$parseacsCheck() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = peg$parseacsCode();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsearg();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c22(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parseacsCode() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$currPos;
    if (peg$c23.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c24); }
    }
    if (s2 !== peg$FAILED) {
      if (peg$c23.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c24); }
      }
      if (s3 !== peg$FAILED) {
        s2 = [s2, s3];
        s1 = s2;
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
    } else {
      peg$currPos = s1;
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c25(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parseargVar() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c26.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c27); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c26.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c27); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c28(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsecommaList() {
    var s0, s1, s2, s3, s4, s5, s6;

    s0 = peg$currPos;
    s1 = [];
    s2 = peg$currPos;
    s3 = peg$parseargVar();
    if (s3 !== peg$FAILED) {
      s4 = peg$parseoptWs();
      if (s4 !== peg$FAILED) {
        s5 = peg$parsecomma();
        if (s5 !== peg$FAILED) {
          s6 = peg$parseoptWs();
          if (s6 !== peg$FAILED) {
            peg$savedPos = s2;
            s3 = peg$c29(s3);
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    } else {
      peg$currPos = s2;
      s2 = peg$FAILED;
    }
    while (s2 !== peg$FAILED) {
      s1.push(s2);
      s2 = peg$currPos;
      s3 = peg$parseargVar();
      if (s3 !== peg$FAILED) {
        s4 = peg$parseoptWs();
        if (s4 !== peg$FAILED) {
          s5 = peg$parsecomma();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseoptWs();
            if (s6 !== peg$FAILED) {
              peg$savedPos = s2;
              s3 = peg$c29(s3);
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseargVar();
      if (s2 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c30(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parselist() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parselistOpen();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsecommaList();
      if (s2 !== peg$FAILED) {
        s3 = peg$parselistClose();
        if (s3 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c31(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$FAILED;
    }

    return s0;
  }

  function peg$parsenumber() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c32.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c33); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c32.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c33); }
        }
      }
    } else {
      s1 = peg$FAILED;
    }
    if (s1 !== peg$FAILED) {
      peg$savedPos = s0;
      s1 = peg$c34(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsearg() {
    var s0;

    s0 = peg$parselist();
    if (s0 === peg$FAILED) {
      s0 = peg$parsenumber();
      if (s0 === peg$FAILED) {
        s0 = null;
      }
    }

    return s0;
  }


  	const UserProps	= require('./user_property.js');
  	const Log       = require('./logger.js').log;
  	const User		= require('./user.js');

  	const _			= require('lodash');
  	const moment	= require('moment');

  	const client	= _.get(options, 'subject.client');
  	const user		= _.get(options, 'subject.user');

  	function checkAccess(acsCode, value) {
  		try {
  			return {
  				LC	: function isLocalConnection() {
  					return client && client.isLocal();
  				},
  				AG	: function ageGreaterOrEqualThan() {
  					return !isNaN(value) && user && user.getAge() >= value;
  				},
  				AS	: function accountStatus() {
  					if(!user) {
  						return false;
  					}
  					if(!Array.isArray(value)) {
  						value = [ value ];
  					}
  					const userAccountStatus = user.getPropertyAsNumber(UserProps.AccountStatus);
  					return value.map(n => parseInt(n, 10)).includes(userAccountStatus);
  				},
  				EC	: function isEncoding() {
  					const encoding = _.get(client, 'term.outputEncoding', '').toLowerCase();
  					switch(value) {
  						case 0	: return 'cp437' === encoding;
  						case 1	: return 'utf-8' === encoding;
  						default	: return false;
  					}
  				},
  				GM	: function isOneOfGroups() {
  					if(!user) {
  						return false;
  					}
  					if(!Array.isArray(value)) {
  						return false;
  					}
  					return value.some(groupName => user.isGroupMember(groupName));
  				},
  				NN	: function isNode() {
  					if(!client) {
  						return false;
  					}
  					if(!Array.isArray(value)) {
  						value = [ value ];
  					}
  					return value.map(n => parseInt(n, 10)).includes(client.node);
  				},
  				NP	: function numberOfPosts() {
  					if(!user) {
  						return false;
  					}
  					const postCount = user.getPropertyAsNumber(UserProps.PostCount) || 0;
  					return !isNaN(value) && postCount >= value;
  				},
  				NC	: function numberOfCalls() {
  					if(!user) {
  						return false;
  					}
  					const loginCount = user.getPropertyAsNumber(UserProps.LoginCount);
  					return !isNaN(value) && loginCount >= value;
  				},
  				AA	: function accountAge() {
  					if(!user) {
  						return false;
  					}
  					const accountCreated = moment(user.getProperty(UserProps.AccountCreated));
  					const now = moment();
  					const daysOld = accountCreated.diff(moment(), 'days');
  					return !isNaN(value) &&
  						accountCreated.isValid() && 
  						now.isAfter(accountCreated) && 
  						daysOld >= value;
  				},
  				BU	: function bytesUploaded() {
  					if(!user) {
  						return false;
  					}
  					const bytesUp = user.getPropertyAsNumber(UserProps.FileUlTotalBytes) || 0;
  					return !isNaN(value) && bytesUp >= value;
  				},
  				UP	: function uploads() {
  					if(!user) {
  						return false;
  					}
  					const uls = user.getPropertyAsNumber(UserProps.FileUlTotalCount) || 0;
  					return !isNaN(value) && uls >= value;
  				},
  				BD	: function bytesDownloaded() {
  					if(!user) {
  						return false;
  					}
  					const bytesDown = user.getPropertyAsNumber(UserProps.FileDlTotalBytes) || 0;
  					return !isNaN(value) && bytesDown >= value;
  				},
  				DL	: function downloads() {
  					if(!user) {
  						return false;
  					}
  					const dls = user.getPropertyAsNumber(UserProps.FileDlTotalCount) || 0;
  					return !isNaN(value) && dls >= value;
  				},
  				NR	: function uploadDownloadRatioGreaterThan() {
  					if(!user) {
  						return false;
  					}
  					const ulCount = user.getPropertyAsNumber(UserProps.FileUlTotalCount) || 0;
  					const dlCount = user.getPropertyAsNumber(UserProps.FileDlTotalCount) || 0;
  					const ratio = ~~((ulCount / dlCount) * 100);
  					return !isNaN(value) && ratio >= value;
  				},
  				KR	: function uploadDownloadByteRatioGreaterThan() {
  					if(!user) {
  						return false;
  					}
  					const ulBytes = user.getPropertyAsNumber(UserProps.FileUlTotalBytes) || 0;
  					const dlBytes = user.getPropertyAsNumber(UserProps.FileDlTotalBytes) || 0;
  					const ratio = ~~((ulBytes / dlBytes) * 100);
  					return !isNaN(value) && ratio >= value;
  				},
  				PC	: function postCallRatio() {
  					if(!user) {
  						return false;
  					}
  					const postCount		= user.getPropertyAsNumber(UserProps.PostCount) || 0;
  					const loginCount	= user.getPropertyAsNumber(UserProps.LoginCount) || 0;
  					const ratio = ~~((postCount / loginCount) * 100);
  					return !isNaN(value) && ratio >= value;
  				},
  				SC 	: function isSecureConnection() {
  					return _.get(client, 'session.isSecure', false);
  				},
  				AF	: function currentAuthFactor() {
  					if(!user) {
  						return false;
  					}
  					return !isNaN(value) && user.authFactor >= value;
  				},
  				AR	: function authFactorRequired() {
  					if(!user) {
  						return false;
  					}
  					switch(value) {
  						case 1 : return true;
  						case 2 : return user.getProperty(UserProps.AuthFactor2OTP) ? true : false;
  						default : return false;
  					}
  				},
  				ML	: function minutesLeft() {
  					//	:TODO: implement me!
  					return false;
  				},
  				TH	: function termHeight() {
  					return !isNaN(value) && _.get(client, 'term.termHeight', 0) >= value;
  				},
  				TM	: function isOneOfThemes() {
  					if(!Array.isArray(value)) {
  						return false;
  					}
  					return value.includes(_.get(client, 'currentTheme.name'));
  				},
  				TT	: function isOneOfTermTypes() {
  					if(!Array.isArray(value)) {
  						return false;
  					}
  					return value.includes(_.get(client, 'term.termType'));
  				},
  				TW	: function termWidth() {
  					return !isNaN(value) && _.get(client, 'term.termWidth', 0) >= value;
  				},
  				ID	: function isUserId() {
  					if(!user) {
  						return false;
  					}
  					if(!Array.isArray(value)) {
  						value = [ value ];
  					}
  					return value.map(n => parseInt(n, 10)).includes(user.userId);
  				},
  				WD	: function isOneOfDayOfWeek() {
  					if(!Array.isArray(value)) {
  						value = [ value ];
  					}
  					return value.map(n => parseInt(n, 10)).includes(new Date().getDay());
  				},
  				MM	: function isMinutesPastMidnight() {
  					const now = moment();
  					const midnight = now.clone().startOf('day')
  					const minutesPastMidnight = now.diff(midnight, 'minutes');
  					return !isNaN(value) && minutesPastMidnight >= value;
  				},
  				AC	: function achievementCount() {
  					if(!user) {
  						return false;
  					}
  					const count = user.getPropertyAsNumber(UserProps.AchievementTotalCount) || 0;
  					return !isNan(value) && points >= value;
  				},
  				AP	: function achievementPoints() {
  					if(!user) {
  						return false;
  					}
  					const points = user.getPropertyAsNumber(UserProps.AchievementTotalPoints) || 0;
  					return !isNan(value) && points >= value;
  				},
  				PV	: function userPropValue() {
  					if (!user || !Array.isArray(value) || value.length !== 2) {
  						return false;
  					}
  					const [propName, propValue] = value;
  					const actualPropValue = user.getProperty(propName);
  					return actualPropValue === propValue;
  				}
  			}[acsCode](value);
  		} catch (e) {
  			const logger = _.get(client, 'log', Log);
  			logger.warn( { acsCode : acsCode, value : value }, 'Invalid ACS string!');

  			return false;
  		}
  	}


  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail(peg$endExpectation());
    }

    throw peg$buildStructuredError(
      peg$maxFailExpected,
      peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
      peg$maxFailPos < input.length
        ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
        : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
    );
  }
}

module.exports = {
  SyntaxError: peg$SyntaxError,
  parse:       peg$parse
};
