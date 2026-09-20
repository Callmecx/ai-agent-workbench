import { z } from 'zod';
import type { ToolResult } from '../../shared/types.js';
import { AppError } from '../utils/errors.js';
import { searchKnowledge } from './knowledge.js';
import { db } from './database.js';
/** Recursive descent arithmetic parser; no eval, Function, identifiers or property access. */
export function calculate(expression: string): number {
  if (expression.length > 200 || /[^\d\s.+*/()%-]/.test(expression))
    throw new AppError(
      400,
      'INVALID_EXPRESSION',
      'Use numbers, parentheses and arithmetic operators only (max 200 characters).',
    );
  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/%-]/g) || [];
  let index = 0;
  const primary = (): number => {
    const token = tokens[index++];
    if (token === '+' || token === '-') return (token === '-' ? -1 : 1) * primary();
    if (token === '(') {
      const value = sum();
      if (tokens[index++] !== ')')
        throw new AppError(400, 'INVALID_EXPRESSION', 'Missing closing parenthesis.');
      return value;
    }
    if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token))
      throw new AppError(400, 'INVALID_EXPRESSION', 'Expected a number.');
    return Number(token);
  };
  const product = (): number => {
    let value = primary();
    while (['*', '/', '%'].includes(tokens[index] || '')) {
      const op = tokens[index++];
      const right = primary();
      value = op === '*' ? value * right : op === '/' ? value / right : value % right;
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    while (['+', '-'].includes(tokens[index] || '')) {
      const op = tokens[index++];
      const right = product();
      value = op === '+' ? value + right : value - right;
    }
    return value;
  };
  const value = sum();
  if (index !== tokens.length || !Number.isFinite(value))
    throw new AppError(
      400,
      'INVALID_EXPRESSION',
      'Expression is invalid or produces a non-finite result.',
    );
  return value;
}
export function executeTool(name: string, args: Record<string, unknown>): ToolResult {
  if (name === 'calculate') {
    const { expression } = z.object({ expression: z.string().min(1).max(200) }).parse(args);
    return { output: { expression, value: calculate(expression) }, mock: false };
  }
  if (name === 'get_market_data') {
    const data = z
      .object({ symbol: z.string().min(1).max(12), interval: z.enum(['1h', '24h', '7d']) })
      .parse(args);
    return {
      mock: true,
      output: {
        ...data,
        price: 64280.5,
        changePercent: 2.34,
        volume: 28400000000,
        currency: 'USD',
        notice: 'Fictional sample data. Not current market information.',
      },
    };
  }
  if (name === 'get_weather') {
    const data = z.object({ city: z.string().min(1).max(100) }).parse(args);
    return {
      mock: true,
      output: {
        ...data,
        temperature: 24,
        condition: 'Partly cloudy',
        unit: 'C',
        notice: 'Fictional weather fixture.',
      },
    };
  }
  if (name === 'search_knowledge') {
    const data = z
      .object({ query: z.string().min(1).max(2000), top_k: z.coerce.number().int().min(1).max(10) })
      .parse(args);
    return {
      mock: true,
      output: {
        results: searchKnowledge(data.query, db.bases[0]?.id || '', data.top_k, 0),
        method: 'Demo lexical scoring',
      },
    };
  }
  throw new AppError(400, 'UNKNOWN_TOOL', 'Tool is not in the server allowlist.');
}
