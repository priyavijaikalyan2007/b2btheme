// Generated from QlParser.g4 by ANTLR 4.13.1
// noinspection ES6UnusedImports,JSUnusedGlobalSymbols,JSUnusedLocalSymbols

import {
	ATN,
	ATNDeserializer, DecisionState, DFA, FailedPredicateException,
	RecognitionException, NoViableAltException, BailErrorStrategy,
	Parser, ParserATNSimulator,
	RuleContext, ParserRuleContext, PredictionMode, PredictionContextCache,
	TerminalNode, RuleNode,
	Token, TokenStream,
	Interval, IntervalSet
} from 'antlr4';
// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;

export default class QlParser extends Parser {
	public static readonly AND = 1;
	public static readonly OR = 2;
	public static readonly NOT = 3;
	public static readonly EQUALS = 4;
	public static readonly NOT_EQUALS = 5;
	public static readonly GREATER_THAN = 6;
	public static readonly GREATER_OR_EQUAL = 7;
	public static readonly LESS_THAN = 8;
	public static readonly LESS_OR_EQUAL = 9;
	public static readonly AFTER = 10;
	public static readonly BEFORE = 11;
	public static readonly ON = 12;
	public static readonly ON_OR_AFTER = 13;
	public static readonly ON_OR_BEFORE = 14;
	public static readonly IN = 15;
	public static readonly CONTAINS = 16;
	public static readonly STARTS_WITH = 17;
	public static readonly ENDS_WITH = 18;
	public static readonly DESCENDANT_OF = 19;
	public static readonly IS = 20;
	public static readonly IS_NOT = 21;
	public static readonly EXISTS = 22;
	public static readonly MISSING = 23;
	public static readonly WHERE = 24;
	public static readonly LINK = 25;
	public static readonly RETURN = 26;
	public static readonly TRUE = 27;
	public static readonly FALSE = 28;
	public static readonly GE = 29;
	public static readonly LE = 30;
	public static readonly NE = 31;
	public static readonly GT = 32;
	public static readonly LT = 33;
	public static readonly EQ = 34;
	public static readonly COLON = 35;
	public static readonly BANG = 36;
	public static readonly MINUS = 37;
	public static readonly LPAREN = 38;
	public static readonly RPAREN = 39;
	public static readonly COMMA = 40;
	public static readonly DATE = 41;
	public static readonly RELATIVE = 42;
	public static readonly NUMBER = 43;
	public static readonly VARIABLE = 44;
	public static readonly PARAMETER = 45;
	public static readonly QUOTED = 46;
	public static readonly UNTERMINATED_QUOTE = 47;
	public static readonly WORD = 48;
	public static readonly OTHER = 49;
	public static readonly WS = 50;
	public static readonly EOF = Token.EOF;
	public static readonly RULE_query = 0;
	public static readonly RULE_expression = 1;
	public static readonly RULE_andExpr = 2;
	public static readonly RULE_unary = 3;
	public static readonly RULE_primary = 4;
	public static readonly RULE_filter = 5;
	public static readonly RULE_condition = 6;
	public static readonly RULE_linkClause = 7;
	public static readonly RULE_comparison = 8;
	public static readonly RULE_value = 9;
	public static readonly RULE_scalar = 10;
	public static readonly RULE_number = 11;
	public static readonly RULE_boolean = 12;
	public static readonly RULE_key = 13;
	public static readonly RULE_word = 14;
	public static readonly RULE_textTerm = 15;
	public static readonly RULE_returnClause = 16;
	public static readonly RULE_compareOp = 17;
	public static readonly RULE_contextKeyword = 18;
	public static readonly literalNames: (string | null)[] = [ null, "'and'", 
                                                            "'or'", "'not'", 
                                                            null, null, 
                                                            null, null, 
                                                            null, null, 
                                                            "'after'", "'before'", 
                                                            "'on'", "'on-or-after'", 
                                                            "'on-or-before'", 
                                                            "'in'", "'contains'", 
                                                            "'starts-with'", 
                                                            "'ends-with'", 
                                                            "'descendant-of'", 
                                                            "'is'", "'is-not'", 
                                                            "'exists'", 
                                                            "'missing'", 
                                                            "'where'", "'link'", 
                                                            "'return'", 
                                                            "'true'", "'false'", 
                                                            "'>='", "'<='", 
                                                            null, "'>'", 
                                                            "'<'", "'='", 
                                                            "':'", "'!'", 
                                                            "'-'", "'('", 
                                                            "')'", "','" ];
	public static readonly symbolicNames: (string | null)[] = [ null, "AND", 
                                                             "OR", "NOT", 
                                                             "EQUALS", "NOT_EQUALS", 
                                                             "GREATER_THAN", 
                                                             "GREATER_OR_EQUAL", 
                                                             "LESS_THAN", 
                                                             "LESS_OR_EQUAL", 
                                                             "AFTER", "BEFORE", 
                                                             "ON", "ON_OR_AFTER", 
                                                             "ON_OR_BEFORE", 
                                                             "IN", "CONTAINS", 
                                                             "STARTS_WITH", 
                                                             "ENDS_WITH", 
                                                             "DESCENDANT_OF", 
                                                             "IS", "IS_NOT", 
                                                             "EXISTS", "MISSING", 
                                                             "WHERE", "LINK", 
                                                             "RETURN", "TRUE", 
                                                             "FALSE", "GE", 
                                                             "LE", "NE", 
                                                             "GT", "LT", 
                                                             "EQ", "COLON", 
                                                             "BANG", "MINUS", 
                                                             "LPAREN", "RPAREN", 
                                                             "COMMA", "DATE", 
                                                             "RELATIVE", 
                                                             "NUMBER", "VARIABLE", 
                                                             "PARAMETER", 
                                                             "QUOTED", "UNTERMINATED_QUOTE", 
                                                             "WORD", "OTHER", 
                                                             "WS" ];
	// tslint:disable:no-trailing-whitespace
	public static readonly ruleNames: string[] = [
		"query", "expression", "andExpr", "unary", "primary", "filter", "condition", 
		"linkClause", "comparison", "value", "scalar", "number", "boolean", "key", 
		"word", "textTerm", "returnClause", "compareOp", "contextKeyword",
	];
	public get grammarFileName(): string { return "QlParser.g4"; }
	public get literalNames(): (string | null)[] { return QlParser.literalNames; }
	public get symbolicNames(): (string | null)[] { return QlParser.symbolicNames; }
	public get ruleNames(): string[] { return QlParser.ruleNames; }
	public get serializedATN(): number[] { return QlParser._serializedATN; }

	protected createFailedPredicateException(predicate?: string, message?: string): FailedPredicateException {
		return new FailedPredicateException(this, predicate, message);
	}

	constructor(input: TokenStream) {
		super(input);
		this._interp = new ParserATNSimulator(this, QlParser._ATN, QlParser.DecisionsToDFA, new PredictionContextCache());
	}
	// @RuleVersion(0)
	public query(): QueryContext {
		let localctx: QueryContext = new QueryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 0, QlParser.RULE_query);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 39;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 0, this._ctx) ) {
			case 1:
				{
				this.state = 38;
				this.expression();
				}
				break;
			}
			this.state = 42;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===26) {
				{
				this.state = 41;
				this.returnClause();
				}
			}

			this.state = 44;
			this.match(QlParser.EOF);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public expression(): ExpressionContext {
		let localctx: ExpressionContext = new ExpressionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 2, QlParser.RULE_expression);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 46;
			this.andExpr();
			this.state = 51;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===2) {
				{
				{
				this.state = 47;
				this.match(QlParser.OR);
				this.state = 48;
				this.andExpr();
				}
				}
				this.state = 53;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public andExpr(): AndExprContext {
		let localctx: AndExprContext = new AndExprContext(this, this._ctx, this.state);
		this.enterRule(localctx, 4, QlParser.RULE_andExpr);
		let _la: number;
		try {
			let _alt: number;
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 54;
			this.unary();
			this.state = 61;
			this._errHandler.sync(this);
			_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
			while (_alt !== 2 && _alt !== ATN.INVALID_ALT_NUMBER) {
				if (_alt === 1) {
					{
					{
					this.state = 56;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
					if (_la===1) {
						{
						this.state = 55;
						this.match(QlParser.AND);
						}
					}

					this.state = 58;
					this.unary();
					}
					}
				}
				this.state = 63;
				this._errHandler.sync(this);
				_alt = this._interp.adaptivePredict(this._input, 4, this._ctx);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public unary(): UnaryContext {
		let localctx: UnaryContext = new UnaryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 6, QlParser.RULE_unary);
		let _la: number;
		try {
			this.state = 67;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 3:
			case 36:
			case 37:
				localctx = new NegatedContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 64;
				_la = this._input.LA(1);
				if(!(_la===3 || _la===36 || _la===37)) {
				this._errHandler.recoverInline(this);
				}
				else {
					this._errHandler.reportMatch(this);
				    this.consume();
				}
				this.state = 65;
				this.unary();
				}
				break;
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 27:
			case 28:
			case 38:
			case 41:
			case 42:
			case 43:
			case 44:
			case 46:
			case 48:
			case 49:
				localctx = new PositiveContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 66;
				this.primary();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public primary(): PrimaryContext {
		let localctx: PrimaryContext = new PrimaryContext(this, this._ctx, this.state);
		this.enterRule(localctx, 8, QlParser.RULE_primary);
		try {
			this.state = 76;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 6, this._ctx) ) {
			case 1:
				localctx = new GroupContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 69;
				this.match(QlParser.LPAREN);
				this.state = 70;
				this.expression();
				this.state = 71;
				this.match(QlParser.RPAREN);
				}
				break;
			case 2:
				localctx = new FilterPrimaryContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 73;
				this.filter();
				}
				break;
			case 3:
				localctx = new ComparisonPrimaryContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 74;
				this.comparison();
				}
				break;
			case 4:
				localctx = new TextPrimaryContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 75;
				this.textTerm();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public filter(): FilterContext {
		let localctx: FilterContext = new FilterContext(this, this._ctx, this.state);
		this.enterRule(localctx, 10, QlParser.RULE_filter);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 78;
			this.key();
			this.state = 80;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===25) {
				{
				this.state = 79;
				this.linkClause();
				}
			}

			this.state = 82;
			this.condition();
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public condition(): ConditionContext {
		let localctx: ConditionContext = new ConditionContext(this, this._ctx, this.state);
		this.enterRule(localctx, 12, QlParser.RULE_condition);
		let _la: number;
		try {
			this.state = 114;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 35:
				localctx = new ColonConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 84;
				this.match(QlParser.COLON);
				this.state = 86;
				this._errHandler.sync(this);
				switch ( this._interp.adaptivePredict(this._input, 8, this._ctx) ) {
				case 1:
					{
					this.state = 85;
					this.value();
					}
					break;
				}
				}
				break;
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 16:
			case 17:
			case 18:
			case 19:
			case 29:
			case 30:
			case 31:
			case 32:
			case 33:
			case 34:
				localctx = new CompareConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 88;
				this.compareOp();
				this.state = 89;
				this.value();
				}
				break;
			case 15:
				localctx = new InConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 91;
				this.match(QlParser.IN);
				this.state = 92;
				this.match(QlParser.LPAREN);
				this.state = 93;
				this.scalar();
				this.state = 98;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				while (_la===40) {
					{
					{
					this.state = 94;
					this.match(QlParser.COMMA);
					this.state = 95;
					this.scalar();
					}
					}
					this.state = 100;
					this._errHandler.sync(this);
					_la = this._input.LA(1);
				}
				this.state = 101;
				this.match(QlParser.RPAREN);
				}
				break;
			case 20:
				localctx = new IsConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 103;
				this.match(QlParser.IS);
				this.state = 104;
				this.boolean_();
				}
				break;
			case 21:
				localctx = new IsNotConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 105;
				this.match(QlParser.IS_NOT);
				this.state = 106;
				this.boolean_();
				}
				break;
			case 22:
				localctx = new ExistsConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 107;
				this.match(QlParser.EXISTS);
				}
				break;
			case 23:
				localctx = new MissingConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 7);
				{
				this.state = 108;
				this.match(QlParser.MISSING);
				}
				break;
			case 24:
				localctx = new WhereConditionContext(this, localctx);
				this.enterOuterAlt(localctx, 8);
				{
				this.state = 109;
				this.match(QlParser.WHERE);
				this.state = 110;
				this.match(QlParser.LPAREN);
				this.state = 111;
				this.expression();
				this.state = 112;
				this.match(QlParser.RPAREN);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public linkClause(): LinkClauseContext {
		let localctx: LinkClauseContext = new LinkClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 14, QlParser.RULE_linkClause);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 116;
			this.match(QlParser.LINK);
			this.state = 117;
			this.match(QlParser.LPAREN);
			this.state = 118;
			this.expression();
			this.state = 119;
			this.match(QlParser.RPAREN);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public comparison(): ComparisonContext {
		let localctx: ComparisonContext = new ComparisonContext(this, this._ctx, this.state);
		this.enterRule(localctx, 16, QlParser.RULE_comparison);
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 121;
			this.match(QlParser.VARIABLE);
			this.state = 122;
			this.compareOp();
			this.state = 123;
			this.match(QlParser.VARIABLE);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public value(): ValueContext {
		let localctx: ValueContext = new ValueContext(this, this._ctx, this.state);
		this.enterRule(localctx, 18, QlParser.RULE_value);
		try {
			this.state = 128;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 27:
			case 28:
			case 37:
			case 41:
			case 42:
			case 43:
			case 46:
			case 48:
			case 49:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 125;
				this.scalar();
				}
				break;
			case 44:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 126;
				this.match(QlParser.VARIABLE);
				}
				break;
			case 45:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 127;
				this.match(QlParser.PARAMETER);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public scalar(): ScalarContext {
		let localctx: ScalarContext = new ScalarContext(this, this._ctx, this.state);
		this.enterRule(localctx, 20, QlParser.RULE_scalar);
		try {
			this.state = 136;
			this._errHandler.sync(this);
			switch ( this._interp.adaptivePredict(this._input, 12, this._ctx) ) {
			case 1:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 130;
				this.match(QlParser.QUOTED);
				}
				break;
			case 2:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 131;
				this.number_();
				}
				break;
			case 3:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 132;
				this.match(QlParser.DATE);
				}
				break;
			case 4:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 133;
				this.match(QlParser.RELATIVE);
				}
				break;
			case 5:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 134;
				this.boolean_();
				}
				break;
			case 6:
				this.enterOuterAlt(localctx, 6);
				{
				this.state = 135;
				this.word();
				}
				break;
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public number_(): NumberContext {
		let localctx: NumberContext = new NumberContext(this, this._ctx, this.state);
		this.enterRule(localctx, 22, QlParser.RULE_number);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 139;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			if (_la===37) {
				{
				this.state = 138;
				this.match(QlParser.MINUS);
				}
			}

			this.state = 141;
			this.match(QlParser.NUMBER);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public boolean_(): BooleanContext {
		let localctx: BooleanContext = new BooleanContext(this, this._ctx, this.state);
		this.enterRule(localctx, 24, QlParser.RULE_boolean);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 143;
			_la = this._input.LA(1);
			if(!(_la===27 || _la===28)) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public key(): KeyContext {
		let localctx: KeyContext = new KeyContext(this, this._ctx, this.state);
		this.enterRule(localctx, 26, QlParser.RULE_key);
		try {
			this.state = 147;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 48:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 145;
				this.match(QlParser.WORD);
				}
				break;
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 27:
			case 28:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 146;
				this.contextKeyword();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public word(): WordContext {
		let localctx: WordContext = new WordContext(this, this._ctx, this.state);
		this.enterRule(localctx, 28, QlParser.RULE_word);
		try {
			this.state = 152;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 48:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 149;
				this.match(QlParser.WORD);
				}
				break;
			case 49:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 150;
				this.match(QlParser.OTHER);
				}
				break;
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 27:
			case 28:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 151;
				this.contextKeyword();
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public textTerm(): TextTermContext {
		let localctx: TextTermContext = new TextTermContext(this, this._ctx, this.state);
		this.enterRule(localctx, 30, QlParser.RULE_textTerm);
		try {
			this.state = 159;
			this._errHandler.sync(this);
			switch (this._input.LA(1)) {
			case 46:
				this.enterOuterAlt(localctx, 1);
				{
				this.state = 154;
				this.match(QlParser.QUOTED);
				}
				break;
			case 4:
			case 5:
			case 6:
			case 7:
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 25:
			case 26:
			case 27:
			case 28:
			case 48:
			case 49:
				this.enterOuterAlt(localctx, 2);
				{
				this.state = 155;
				this.word();
				}
				break;
			case 43:
				this.enterOuterAlt(localctx, 3);
				{
				this.state = 156;
				this.match(QlParser.NUMBER);
				}
				break;
			case 41:
				this.enterOuterAlt(localctx, 4);
				{
				this.state = 157;
				this.match(QlParser.DATE);
				}
				break;
			case 42:
				this.enterOuterAlt(localctx, 5);
				{
				this.state = 158;
				this.match(QlParser.RELATIVE);
				}
				break;
			default:
				throw new NoViableAltException(this);
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public returnClause(): ReturnClauseContext {
		let localctx: ReturnClauseContext = new ReturnClauseContext(this, this._ctx, this.state);
		this.enterRule(localctx, 32, QlParser.RULE_returnClause);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 161;
			this.match(QlParser.RETURN);
			this.state = 162;
			this.match(QlParser.VARIABLE);
			this.state = 169;
			this._errHandler.sync(this);
			_la = this._input.LA(1);
			while (_la===40 || _la===44) {
				{
				{
				this.state = 164;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
				if (_la===40) {
					{
					this.state = 163;
					this.match(QlParser.COMMA);
					}
				}

				this.state = 166;
				this.match(QlParser.VARIABLE);
				}
				}
				this.state = 171;
				this._errHandler.sync(this);
				_la = this._input.LA(1);
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public compareOp(): CompareOpContext {
		let localctx: CompareOpContext = new CompareOpContext(this, this._ctx, this.state);
		this.enterRule(localctx, 34, QlParser.RULE_compareOp);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 172;
			_la = this._input.LA(1);
			if(!(((((_la - 4)) & ~0x1F) === 0 && ((1 << (_la - 4)) & 2113992703) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}
	// @RuleVersion(0)
	public contextKeyword(): ContextKeywordContext {
		let localctx: ContextKeywordContext = new ContextKeywordContext(this, this._ctx, this.state);
		this.enterRule(localctx, 36, QlParser.RULE_contextKeyword);
		let _la: number;
		try {
			this.enterOuterAlt(localctx, 1);
			{
			this.state = 174;
			_la = this._input.LA(1);
			if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 536870896) !== 0))) {
			this._errHandler.recoverInline(this);
			}
			else {
				this._errHandler.reportMatch(this);
			    this.consume();
			}
			}
		}
		catch (re) {
			if (re instanceof RecognitionException) {
				localctx.exception = re;
				this._errHandler.reportError(this, re);
				this._errHandler.recover(this, re);
			} else {
				throw re;
			}
		}
		finally {
			this.exitRule();
		}
		return localctx;
	}

	public static readonly _serializedATN: number[] = [4,1,50,177,2,0,7,0,2,
	1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,2,6,7,6,2,7,7,7,2,8,7,8,2,9,7,9,2,
	10,7,10,2,11,7,11,2,12,7,12,2,13,7,13,2,14,7,14,2,15,7,15,2,16,7,16,2,17,
	7,17,2,18,7,18,1,0,3,0,40,8,0,1,0,3,0,43,8,0,1,0,1,0,1,1,1,1,1,1,5,1,50,
	8,1,10,1,12,1,53,9,1,1,2,1,2,3,2,57,8,2,1,2,5,2,60,8,2,10,2,12,2,63,9,2,
	1,3,1,3,1,3,3,3,68,8,3,1,4,1,4,1,4,1,4,1,4,1,4,1,4,3,4,77,8,4,1,5,1,5,3,
	5,81,8,5,1,5,1,5,1,6,1,6,3,6,87,8,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,5,6,
	97,8,6,10,6,12,6,100,9,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,6,1,
	6,1,6,3,6,115,8,6,1,7,1,7,1,7,1,7,1,7,1,8,1,8,1,8,1,8,1,9,1,9,1,9,3,9,129,
	8,9,1,10,1,10,1,10,1,10,1,10,1,10,3,10,137,8,10,1,11,3,11,140,8,11,1,11,
	1,11,1,12,1,12,1,13,1,13,3,13,148,8,13,1,14,1,14,1,14,3,14,153,8,14,1,15,
	1,15,1,15,1,15,1,15,3,15,160,8,15,1,16,1,16,1,16,3,16,165,8,16,1,16,5,16,
	168,8,16,10,16,12,16,171,9,16,1,17,1,17,1,18,1,18,1,18,0,0,19,0,2,4,6,8,
	10,12,14,16,18,20,22,24,26,28,30,32,34,36,0,4,2,0,3,3,36,37,1,0,27,28,3,
	0,4,14,16,19,29,34,1,0,4,28,193,0,39,1,0,0,0,2,46,1,0,0,0,4,54,1,0,0,0,
	6,67,1,0,0,0,8,76,1,0,0,0,10,78,1,0,0,0,12,114,1,0,0,0,14,116,1,0,0,0,16,
	121,1,0,0,0,18,128,1,0,0,0,20,136,1,0,0,0,22,139,1,0,0,0,24,143,1,0,0,0,
	26,147,1,0,0,0,28,152,1,0,0,0,30,159,1,0,0,0,32,161,1,0,0,0,34,172,1,0,
	0,0,36,174,1,0,0,0,38,40,3,2,1,0,39,38,1,0,0,0,39,40,1,0,0,0,40,42,1,0,
	0,0,41,43,3,32,16,0,42,41,1,0,0,0,42,43,1,0,0,0,43,44,1,0,0,0,44,45,5,0,
	0,1,45,1,1,0,0,0,46,51,3,4,2,0,47,48,5,2,0,0,48,50,3,4,2,0,49,47,1,0,0,
	0,50,53,1,0,0,0,51,49,1,0,0,0,51,52,1,0,0,0,52,3,1,0,0,0,53,51,1,0,0,0,
	54,61,3,6,3,0,55,57,5,1,0,0,56,55,1,0,0,0,56,57,1,0,0,0,57,58,1,0,0,0,58,
	60,3,6,3,0,59,56,1,0,0,0,60,63,1,0,0,0,61,59,1,0,0,0,61,62,1,0,0,0,62,5,
	1,0,0,0,63,61,1,0,0,0,64,65,7,0,0,0,65,68,3,6,3,0,66,68,3,8,4,0,67,64,1,
	0,0,0,67,66,1,0,0,0,68,7,1,0,0,0,69,70,5,38,0,0,70,71,3,2,1,0,71,72,5,39,
	0,0,72,77,1,0,0,0,73,77,3,10,5,0,74,77,3,16,8,0,75,77,3,30,15,0,76,69,1,
	0,0,0,76,73,1,0,0,0,76,74,1,0,0,0,76,75,1,0,0,0,77,9,1,0,0,0,78,80,3,26,
	13,0,79,81,3,14,7,0,80,79,1,0,0,0,80,81,1,0,0,0,81,82,1,0,0,0,82,83,3,12,
	6,0,83,11,1,0,0,0,84,86,5,35,0,0,85,87,3,18,9,0,86,85,1,0,0,0,86,87,1,0,
	0,0,87,115,1,0,0,0,88,89,3,34,17,0,89,90,3,18,9,0,90,115,1,0,0,0,91,92,
	5,15,0,0,92,93,5,38,0,0,93,98,3,20,10,0,94,95,5,40,0,0,95,97,3,20,10,0,
	96,94,1,0,0,0,97,100,1,0,0,0,98,96,1,0,0,0,98,99,1,0,0,0,99,101,1,0,0,0,
	100,98,1,0,0,0,101,102,5,39,0,0,102,115,1,0,0,0,103,104,5,20,0,0,104,115,
	3,24,12,0,105,106,5,21,0,0,106,115,3,24,12,0,107,115,5,22,0,0,108,115,5,
	23,0,0,109,110,5,24,0,0,110,111,5,38,0,0,111,112,3,2,1,0,112,113,5,39,0,
	0,113,115,1,0,0,0,114,84,1,0,0,0,114,88,1,0,0,0,114,91,1,0,0,0,114,103,
	1,0,0,0,114,105,1,0,0,0,114,107,1,0,0,0,114,108,1,0,0,0,114,109,1,0,0,0,
	115,13,1,0,0,0,116,117,5,25,0,0,117,118,5,38,0,0,118,119,3,2,1,0,119,120,
	5,39,0,0,120,15,1,0,0,0,121,122,5,44,0,0,122,123,3,34,17,0,123,124,5,44,
	0,0,124,17,1,0,0,0,125,129,3,20,10,0,126,129,5,44,0,0,127,129,5,45,0,0,
	128,125,1,0,0,0,128,126,1,0,0,0,128,127,1,0,0,0,129,19,1,0,0,0,130,137,
	5,46,0,0,131,137,3,22,11,0,132,137,5,41,0,0,133,137,5,42,0,0,134,137,3,
	24,12,0,135,137,3,28,14,0,136,130,1,0,0,0,136,131,1,0,0,0,136,132,1,0,0,
	0,136,133,1,0,0,0,136,134,1,0,0,0,136,135,1,0,0,0,137,21,1,0,0,0,138,140,
	5,37,0,0,139,138,1,0,0,0,139,140,1,0,0,0,140,141,1,0,0,0,141,142,5,43,0,
	0,142,23,1,0,0,0,143,144,7,1,0,0,144,25,1,0,0,0,145,148,5,48,0,0,146,148,
	3,36,18,0,147,145,1,0,0,0,147,146,1,0,0,0,148,27,1,0,0,0,149,153,5,48,0,
	0,150,153,5,49,0,0,151,153,3,36,18,0,152,149,1,0,0,0,152,150,1,0,0,0,152,
	151,1,0,0,0,153,29,1,0,0,0,154,160,5,46,0,0,155,160,3,28,14,0,156,160,5,
	43,0,0,157,160,5,41,0,0,158,160,5,42,0,0,159,154,1,0,0,0,159,155,1,0,0,
	0,159,156,1,0,0,0,159,157,1,0,0,0,159,158,1,0,0,0,160,31,1,0,0,0,161,162,
	5,26,0,0,162,169,5,44,0,0,163,165,5,40,0,0,164,163,1,0,0,0,164,165,1,0,
	0,0,165,166,1,0,0,0,166,168,5,44,0,0,167,164,1,0,0,0,168,171,1,0,0,0,169,
	167,1,0,0,0,169,170,1,0,0,0,170,33,1,0,0,0,171,169,1,0,0,0,172,173,7,2,
	0,0,173,35,1,0,0,0,174,175,7,3,0,0,175,37,1,0,0,0,19,39,42,51,56,61,67,
	76,80,86,98,114,128,136,139,147,152,159,164,169];

	private static __ATN: ATN;
	public static get _ATN(): ATN {
		if (!QlParser.__ATN) {
			QlParser.__ATN = new ATNDeserializer().deserialize(QlParser._serializedATN);
		}

		return QlParser.__ATN;
	}


	static DecisionsToDFA = QlParser._ATN.decisionToState.map( (ds: DecisionState, index: number) => new DFA(ds, index) );

}

export class QueryContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EOF(): TerminalNode {
		return this.getToken(QlParser.EOF, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public returnClause(): ReturnClauseContext {
		return this.getTypedRuleContext(ReturnClauseContext, 0) as ReturnClauseContext;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_query;
	}
}


export class ExpressionContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public andExpr_list(): AndExprContext[] {
		return this.getTypedRuleContexts(AndExprContext) as AndExprContext[];
	}
	public andExpr(i: number): AndExprContext {
		return this.getTypedRuleContext(AndExprContext, i) as AndExprContext;
	}
	public OR_list(): TerminalNode[] {
	    	return this.getTokens(QlParser.OR);
	}
	public OR(i: number): TerminalNode {
		return this.getToken(QlParser.OR, i);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_expression;
	}
}


export class AndExprContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public unary_list(): UnaryContext[] {
		return this.getTypedRuleContexts(UnaryContext) as UnaryContext[];
	}
	public unary(i: number): UnaryContext {
		return this.getTypedRuleContext(UnaryContext, i) as UnaryContext;
	}
	public AND_list(): TerminalNode[] {
	    	return this.getTokens(QlParser.AND);
	}
	public AND(i: number): TerminalNode {
		return this.getToken(QlParser.AND, i);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_andExpr;
	}
}


export class UnaryContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_unary;
	}
	public copyFrom(ctx: UnaryContext): void {
		super.copyFrom(ctx);
	}
}
export class NegatedContext extends UnaryContext {
	constructor(parser: QlParser, ctx: UnaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public unary(): UnaryContext {
		return this.getTypedRuleContext(UnaryContext, 0) as UnaryContext;
	}
	public NOT(): TerminalNode {
		return this.getToken(QlParser.NOT, 0);
	}
	public BANG(): TerminalNode {
		return this.getToken(QlParser.BANG, 0);
	}
	public MINUS(): TerminalNode {
		return this.getToken(QlParser.MINUS, 0);
	}
}
export class PositiveContext extends UnaryContext {
	constructor(parser: QlParser, ctx: UnaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public primary(): PrimaryContext {
		return this.getTypedRuleContext(PrimaryContext, 0) as PrimaryContext;
	}
}


export class PrimaryContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_primary;
	}
	public copyFrom(ctx: PrimaryContext): void {
		super.copyFrom(ctx);
	}
}
export class FilterPrimaryContext extends PrimaryContext {
	constructor(parser: QlParser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public filter(): FilterContext {
		return this.getTypedRuleContext(FilterContext, 0) as FilterContext;
	}
}
export class TextPrimaryContext extends PrimaryContext {
	constructor(parser: QlParser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public textTerm(): TextTermContext {
		return this.getTypedRuleContext(TextTermContext, 0) as TextTermContext;
	}
}
export class ComparisonPrimaryContext extends PrimaryContext {
	constructor(parser: QlParser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public comparison(): ComparisonContext {
		return this.getTypedRuleContext(ComparisonContext, 0) as ComparisonContext;
	}
}
export class GroupContext extends PrimaryContext {
	constructor(parser: QlParser, ctx: PrimaryContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(QlParser.LPAREN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(QlParser.RPAREN, 0);
	}
}


export class FilterContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public key(): KeyContext {
		return this.getTypedRuleContext(KeyContext, 0) as KeyContext;
	}
	public condition(): ConditionContext {
		return this.getTypedRuleContext(ConditionContext, 0) as ConditionContext;
	}
	public linkClause(): LinkClauseContext {
		return this.getTypedRuleContext(LinkClauseContext, 0) as LinkClauseContext;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_filter;
	}
}


export class ConditionContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_condition;
	}
	public copyFrom(ctx: ConditionContext): void {
		super.copyFrom(ctx);
	}
}
export class InConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public IN(): TerminalNode {
		return this.getToken(QlParser.IN, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(QlParser.LPAREN, 0);
	}
	public scalar_list(): ScalarContext[] {
		return this.getTypedRuleContexts(ScalarContext) as ScalarContext[];
	}
	public scalar(i: number): ScalarContext {
		return this.getTypedRuleContext(ScalarContext, i) as ScalarContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(QlParser.RPAREN, 0);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(QlParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(QlParser.COMMA, i);
	}
}
export class IsNotConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public IS_NOT(): TerminalNode {
		return this.getToken(QlParser.IS_NOT, 0);
	}
	public boolean_(): BooleanContext {
		return this.getTypedRuleContext(BooleanContext, 0) as BooleanContext;
	}
}
export class WhereConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public WHERE(): TerminalNode {
		return this.getToken(QlParser.WHERE, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(QlParser.LPAREN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(QlParser.RPAREN, 0);
	}
}
export class ExistsConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public EXISTS(): TerminalNode {
		return this.getToken(QlParser.EXISTS, 0);
	}
}
export class MissingConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public MISSING(): TerminalNode {
		return this.getToken(QlParser.MISSING, 0);
	}
}
export class ColonConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public COLON(): TerminalNode {
		return this.getToken(QlParser.COLON, 0);
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
}
export class IsConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public IS(): TerminalNode {
		return this.getToken(QlParser.IS, 0);
	}
	public boolean_(): BooleanContext {
		return this.getTypedRuleContext(BooleanContext, 0) as BooleanContext;
	}
}
export class CompareConditionContext extends ConditionContext {
	constructor(parser: QlParser, ctx: ConditionContext) {
		super(parser, ctx.parentCtx, ctx.invokingState);
		super.copyFrom(ctx);
	}
	public compareOp(): CompareOpContext {
		return this.getTypedRuleContext(CompareOpContext, 0) as CompareOpContext;
	}
	public value(): ValueContext {
		return this.getTypedRuleContext(ValueContext, 0) as ValueContext;
	}
}


export class LinkClauseContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public LINK(): TerminalNode {
		return this.getToken(QlParser.LINK, 0);
	}
	public LPAREN(): TerminalNode {
		return this.getToken(QlParser.LPAREN, 0);
	}
	public expression(): ExpressionContext {
		return this.getTypedRuleContext(ExpressionContext, 0) as ExpressionContext;
	}
	public RPAREN(): TerminalNode {
		return this.getToken(QlParser.RPAREN, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_linkClause;
	}
}


export class ComparisonContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public VARIABLE_list(): TerminalNode[] {
	    	return this.getTokens(QlParser.VARIABLE);
	}
	public VARIABLE(i: number): TerminalNode {
		return this.getToken(QlParser.VARIABLE, i);
	}
	public compareOp(): CompareOpContext {
		return this.getTypedRuleContext(CompareOpContext, 0) as CompareOpContext;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_comparison;
	}
}


export class ValueContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public scalar(): ScalarContext {
		return this.getTypedRuleContext(ScalarContext, 0) as ScalarContext;
	}
	public VARIABLE(): TerminalNode {
		return this.getToken(QlParser.VARIABLE, 0);
	}
	public PARAMETER(): TerminalNode {
		return this.getToken(QlParser.PARAMETER, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_value;
	}
}


export class ScalarContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public QUOTED(): TerminalNode {
		return this.getToken(QlParser.QUOTED, 0);
	}
	public number_(): NumberContext {
		return this.getTypedRuleContext(NumberContext, 0) as NumberContext;
	}
	public DATE(): TerminalNode {
		return this.getToken(QlParser.DATE, 0);
	}
	public RELATIVE(): TerminalNode {
		return this.getToken(QlParser.RELATIVE, 0);
	}
	public boolean_(): BooleanContext {
		return this.getTypedRuleContext(BooleanContext, 0) as BooleanContext;
	}
	public word(): WordContext {
		return this.getTypedRuleContext(WordContext, 0) as WordContext;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_scalar;
	}
}


export class NumberContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public NUMBER(): TerminalNode {
		return this.getToken(QlParser.NUMBER, 0);
	}
	public MINUS(): TerminalNode {
		return this.getToken(QlParser.MINUS, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_number;
	}
}


export class BooleanContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public TRUE(): TerminalNode {
		return this.getToken(QlParser.TRUE, 0);
	}
	public FALSE(): TerminalNode {
		return this.getToken(QlParser.FALSE, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_boolean;
	}
}


export class KeyContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public WORD(): TerminalNode {
		return this.getToken(QlParser.WORD, 0);
	}
	public contextKeyword(): ContextKeywordContext {
		return this.getTypedRuleContext(ContextKeywordContext, 0) as ContextKeywordContext;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_key;
	}
}


export class WordContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public WORD(): TerminalNode {
		return this.getToken(QlParser.WORD, 0);
	}
	public OTHER(): TerminalNode {
		return this.getToken(QlParser.OTHER, 0);
	}
	public contextKeyword(): ContextKeywordContext {
		return this.getTypedRuleContext(ContextKeywordContext, 0) as ContextKeywordContext;
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_word;
	}
}


export class TextTermContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public QUOTED(): TerminalNode {
		return this.getToken(QlParser.QUOTED, 0);
	}
	public word(): WordContext {
		return this.getTypedRuleContext(WordContext, 0) as WordContext;
	}
	public NUMBER(): TerminalNode {
		return this.getToken(QlParser.NUMBER, 0);
	}
	public DATE(): TerminalNode {
		return this.getToken(QlParser.DATE, 0);
	}
	public RELATIVE(): TerminalNode {
		return this.getToken(QlParser.RELATIVE, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_textTerm;
	}
}


export class ReturnClauseContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public RETURN(): TerminalNode {
		return this.getToken(QlParser.RETURN, 0);
	}
	public VARIABLE_list(): TerminalNode[] {
	    	return this.getTokens(QlParser.VARIABLE);
	}
	public VARIABLE(i: number): TerminalNode {
		return this.getToken(QlParser.VARIABLE, i);
	}
	public COMMA_list(): TerminalNode[] {
	    	return this.getTokens(QlParser.COMMA);
	}
	public COMMA(i: number): TerminalNode {
		return this.getToken(QlParser.COMMA, i);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_returnClause;
	}
}


export class CompareOpContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EQUALS(): TerminalNode {
		return this.getToken(QlParser.EQUALS, 0);
	}
	public EQ(): TerminalNode {
		return this.getToken(QlParser.EQ, 0);
	}
	public NOT_EQUALS(): TerminalNode {
		return this.getToken(QlParser.NOT_EQUALS, 0);
	}
	public NE(): TerminalNode {
		return this.getToken(QlParser.NE, 0);
	}
	public GREATER_THAN(): TerminalNode {
		return this.getToken(QlParser.GREATER_THAN, 0);
	}
	public GT(): TerminalNode {
		return this.getToken(QlParser.GT, 0);
	}
	public GREATER_OR_EQUAL(): TerminalNode {
		return this.getToken(QlParser.GREATER_OR_EQUAL, 0);
	}
	public GE(): TerminalNode {
		return this.getToken(QlParser.GE, 0);
	}
	public LESS_THAN(): TerminalNode {
		return this.getToken(QlParser.LESS_THAN, 0);
	}
	public LT(): TerminalNode {
		return this.getToken(QlParser.LT, 0);
	}
	public LESS_OR_EQUAL(): TerminalNode {
		return this.getToken(QlParser.LESS_OR_EQUAL, 0);
	}
	public LE(): TerminalNode {
		return this.getToken(QlParser.LE, 0);
	}
	public AFTER(): TerminalNode {
		return this.getToken(QlParser.AFTER, 0);
	}
	public BEFORE(): TerminalNode {
		return this.getToken(QlParser.BEFORE, 0);
	}
	public ON(): TerminalNode {
		return this.getToken(QlParser.ON, 0);
	}
	public ON_OR_AFTER(): TerminalNode {
		return this.getToken(QlParser.ON_OR_AFTER, 0);
	}
	public ON_OR_BEFORE(): TerminalNode {
		return this.getToken(QlParser.ON_OR_BEFORE, 0);
	}
	public CONTAINS(): TerminalNode {
		return this.getToken(QlParser.CONTAINS, 0);
	}
	public STARTS_WITH(): TerminalNode {
		return this.getToken(QlParser.STARTS_WITH, 0);
	}
	public ENDS_WITH(): TerminalNode {
		return this.getToken(QlParser.ENDS_WITH, 0);
	}
	public DESCENDANT_OF(): TerminalNode {
		return this.getToken(QlParser.DESCENDANT_OF, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_compareOp;
	}
}


export class ContextKeywordContext extends ParserRuleContext {
	constructor(parser?: QlParser, parent?: ParserRuleContext, invokingState?: number) {
		super(parent, invokingState);
    	this.parser = parser;
	}
	public EQUALS(): TerminalNode {
		return this.getToken(QlParser.EQUALS, 0);
	}
	public NOT_EQUALS(): TerminalNode {
		return this.getToken(QlParser.NOT_EQUALS, 0);
	}
	public GREATER_THAN(): TerminalNode {
		return this.getToken(QlParser.GREATER_THAN, 0);
	}
	public GREATER_OR_EQUAL(): TerminalNode {
		return this.getToken(QlParser.GREATER_OR_EQUAL, 0);
	}
	public LESS_THAN(): TerminalNode {
		return this.getToken(QlParser.LESS_THAN, 0);
	}
	public LESS_OR_EQUAL(): TerminalNode {
		return this.getToken(QlParser.LESS_OR_EQUAL, 0);
	}
	public AFTER(): TerminalNode {
		return this.getToken(QlParser.AFTER, 0);
	}
	public BEFORE(): TerminalNode {
		return this.getToken(QlParser.BEFORE, 0);
	}
	public ON(): TerminalNode {
		return this.getToken(QlParser.ON, 0);
	}
	public ON_OR_AFTER(): TerminalNode {
		return this.getToken(QlParser.ON_OR_AFTER, 0);
	}
	public ON_OR_BEFORE(): TerminalNode {
		return this.getToken(QlParser.ON_OR_BEFORE, 0);
	}
	public IN(): TerminalNode {
		return this.getToken(QlParser.IN, 0);
	}
	public CONTAINS(): TerminalNode {
		return this.getToken(QlParser.CONTAINS, 0);
	}
	public STARTS_WITH(): TerminalNode {
		return this.getToken(QlParser.STARTS_WITH, 0);
	}
	public ENDS_WITH(): TerminalNode {
		return this.getToken(QlParser.ENDS_WITH, 0);
	}
	public DESCENDANT_OF(): TerminalNode {
		return this.getToken(QlParser.DESCENDANT_OF, 0);
	}
	public IS(): TerminalNode {
		return this.getToken(QlParser.IS, 0);
	}
	public IS_NOT(): TerminalNode {
		return this.getToken(QlParser.IS_NOT, 0);
	}
	public EXISTS(): TerminalNode {
		return this.getToken(QlParser.EXISTS, 0);
	}
	public MISSING(): TerminalNode {
		return this.getToken(QlParser.MISSING, 0);
	}
	public WHERE(): TerminalNode {
		return this.getToken(QlParser.WHERE, 0);
	}
	public LINK(): TerminalNode {
		return this.getToken(QlParser.LINK, 0);
	}
	public RETURN(): TerminalNode {
		return this.getToken(QlParser.RETURN, 0);
	}
	public TRUE(): TerminalNode {
		return this.getToken(QlParser.TRUE, 0);
	}
	public FALSE(): TerminalNode {
		return this.getToken(QlParser.FALSE, 0);
	}
    public get ruleIndex(): number {
    	return QlParser.RULE_contextKeyword;
	}
}
