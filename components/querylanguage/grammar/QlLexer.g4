// [agent:claude] [purpose:querylanguage:the words, symbols and values of the query language]
// The source of truth for the lexical rules in specs/search/query-language.spec.md §5.
// Rules that match the same length are decided by order, so keywords come
// before WORD, and WORD comes before OTHER.
lexer grammar QlLexer;

options { caseInsensitive = true; }

// Reserved. These three are operators wherever they appear.
AND : 'and' ;
OR  : 'or' ;
NOT : 'not' ;

// Contextual keywords. The parser treats each as an operator only where it
// expects one. Anywhere else, the parser reads it as a plain word.
EQUALS           : 'equals' | 'eq' ;
NOT_EQUALS       : 'not-equals' | 'neq' ;
GREATER_THAN     : 'greater-than' | 'gt' ;
GREATER_OR_EQUAL : 'greater-or-equal' | 'gte' | 'geq' ;
LESS_THAN        : 'less-than' | 'lt' ;
LESS_OR_EQUAL    : 'less-or-equal' | 'lte' | 'leq' ;
AFTER            : 'after' ;
BEFORE           : 'before' ;
ON               : 'on' ;
ON_OR_AFTER      : 'on-or-after' ;
ON_OR_BEFORE     : 'on-or-before' ;
IN               : 'in' ;
CONTAINS         : 'contains' ;
STARTS_WITH      : 'starts-with' ;
ENDS_WITH        : 'ends-with' ;
DESCENDANT_OF    : 'descendant-of' ;
IS               : 'is' ;
IS_NOT           : 'is-not' ;
EXISTS           : 'exists' ;
MISSING          : 'missing' ;
WHERE            : 'where' ;
LINK             : 'link' ;
RETURN           : 'return' ;
TRUE             : 'true' ;
FALSE            : 'false' ;

// Symbols. A two-character symbol is listed before the one it starts with.
GE     : '>=' ;
LE     : '<=' ;
NE     : '!=' | '!:' ;
GT     : '>' ;
LT     : '<' ;
EQ     : '=' ;
COLON  : ':' ;
BANG   : '!' ;
MINUS  : '-' ;
LPAREN : '(' ;
RPAREN : ')' ;
COMMA  : ',' ;

// Values. A zone suffix is part of its date, so '@' never stands alone, and
// an address such as a@b.com stays one piece of text.
DATE      : DIGIT DIGIT DIGIT DIGIT '-' DIGIT DIGIT '-' DIGIT DIGIT
            ( 'T' DIGIT DIGIT ':' DIGIT DIGIT ( ':' DIGIT DIGIT ( '.' DIGIT+ )? )? 'Z'? )?
            ZONE_SUFFIX? ;
RELATIVE  : ( [+-] DIGIT+ ( 'h' | 'd' | 'w' | 'mo' | 'y' ) | 'today' | 'yesterday' | 'now' ) ZONE_SUFFIX? ;
NUMBER    : DIGIT+ ( '.' DIGIT+ )? ;
VARIABLE  : '?' NAME ;
PARAMETER : '$' NAME ;

// Inside quotes, \" is a quote and \\ is one backslash (#375). A quote that
// never closes is its own token, so the parser can say where it started.
QUOTED             : '"' ( '\\' . | ~["\\] )* '"' ;
UNTERMINATED_QUOTE : '"' ( '\\' . | ~["\\] )* ;

// A word may hold '.', '_', '/' and '-' between its letters and digits.
WORD  : WORD_CHAR ( ( WORD_CHAR | [./\-] )* WORD_CHAR )? ;

// Anything else that is not a symbol, such as //example.com/a or a@b.com.
// It cannot start with '-', '?' or '$', which mean something before a term.
OTHER : ~[ \t\r\n"():,<>=!\-?$] ~[ \t\r\n"():,<>=!]* ;

WS : [ \t\r\n]+ -> skip ;

fragment ZONE_SUFFIX : '@' [\p{L}\p{N}_/+\-:]+ ;
fragment DIGIT       : [0-9] ;
fragment NAME        : [\p{L}_] [\p{L}\p{N}_]* ;
fragment WORD_CHAR   : [\p{L}\p{N}_] ;
