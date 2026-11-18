// [agent:claude] [purpose:querylanguage:the structure of a query]
// The source of truth for the grammar in specs/search/query-language.spec.md §5.
// Precedence: not binds tightest, then and, then or. Side by side means and.
parser grammar QlParser;

options { tokenVocab = QlLexer; }

query        : expression? returnClause? EOF ;

expression   : andExpr ( OR andExpr )* ;
andExpr      : unary ( AND? unary )* ;
unary        : ( NOT | BANG | MINUS ) unary          # negated
             | primary                              # positive
             ;
primary      : LPAREN expression RPAREN             # group
             | filter                               # filterPrimary
             | comparison                           # comparisonPrimary
             | textTerm                             # textPrimary
             ;

filter       : key linkClause? condition ;
condition    : COLON value?                                  # colonCondition
             | compareOp value                               # compareCondition
             | IN LPAREN scalar ( COMMA scalar )* RPAREN     # inCondition
             | IS boolean                                    # isCondition
             | IS_NOT boolean                                # isNotCondition
             | EXISTS                                        # existsCondition
             | MISSING                                       # missingCondition
             | WHERE LPAREN expression RPAREN                # whereCondition
             ;
linkClause   : LINK LPAREN expression RPAREN ;

comparison   : VARIABLE compareOp VARIABLE ;

value        : scalar | VARIABLE | PARAMETER ;
scalar       : QUOTED | number | DATE | RELATIVE | boolean | word ;
number       : MINUS? NUMBER ;
boolean      : TRUE | FALSE ;

// A key may be spelled like a contextual keyword, such as contains:x. A
// keyword added later must not turn an existing key into an operator (spec §15).
key          : WORD | contextKeyword ;
word         : WORD | OTHER | contextKeyword ;
textTerm     : QUOTED | word | NUMBER | DATE | RELATIVE ;

returnClause : RETURN VARIABLE ( COMMA? VARIABLE )* ;

compareOp    : EQUALS | EQ | NOT_EQUALS | NE
             | GREATER_THAN | GT | GREATER_OR_EQUAL | GE
             | LESS_THAN | LT | LESS_OR_EQUAL | LE
             | AFTER | BEFORE | ON | ON_OR_AFTER | ON_OR_BEFORE
             | CONTAINS | STARTS_WITH | ENDS_WITH | DESCENDANT_OF
             ;

// Every keyword except and, or and not. Where the grammar wants a word,
// one of these is a word.
contextKeyword : EQUALS | NOT_EQUALS | GREATER_THAN | GREATER_OR_EQUAL | LESS_THAN | LESS_OR_EQUAL
               | AFTER | BEFORE | ON | ON_OR_AFTER | ON_OR_BEFORE | IN | CONTAINS | STARTS_WITH
               | ENDS_WITH | DESCENDANT_OF | IS | IS_NOT | EXISTS | MISSING | WHERE | LINK | RETURN
               | TRUE | FALSE
               ;
