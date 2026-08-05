import { AppError } from '../../middleware/errors.js';

type Token =
  | { type: 'term'; value: string }
  | { type: 'operator'; value: 'AND' | 'OR' | 'NOT' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    if (/\s/.test(input[index] ?? '')) {
      index += 1;
      continue;
    }

    if (input[index] === '"') {
      const end = input.indexOf('"', index + 1);
      if (end === -1) {
        throw new AppError(400, 'Search phrase is missing a closing quote.', 'INVALID_SEARCH_QUERY');
      }
      const phrase = input.slice(index + 1, end).trim();
      if (phrase) tokens.push({ type: 'term', value: phrase });
      index = end + 1;
      continue;
    }

    let end = index;
    while (end < input.length && !/\s/.test(input[end] ?? '')) end += 1;
    const value = input.slice(index, end);
    const upper = value.toUpperCase();
    if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
      tokens.push({ type: 'operator', value: upper });
    } else {
      tokens.push({ type: 'term', value });
    }
    index = end;
  }

  return tokens;
}

function quoteTerm(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildFtsQuery(input: string): string {
  const query = input.trim();
  if (!query) throw new AppError(400, 'Enter something to search for.', 'EMPTY_SEARCH_QUERY');
  if (query.length > 500) {
    throw new AppError(400, 'Search queries are limited to 500 characters.', 'INVALID_SEARCH_QUERY');
  }

  const rawTokens = tokenize(query);
  if (rawTokens.length === 0) {
    throw new AppError(400, 'Enter something to search for.', 'EMPTY_SEARCH_QUERY');
  }

  // FTS5 NOT is binary. "alpha AND NOT beta" is normalized to "alpha NOT beta".
  const tokens = rawTokens.filter((token, index) => {
    if (
      token.type === 'operator' && token.value === 'AND' &&
      rawTokens[index + 1]?.type === 'operator' && rawTokens[index + 1]?.value === 'NOT'
    ) {
      return false;
    }
    return true;
  });

  if (tokens[0]?.type !== 'term' || tokens[tokens.length - 1]?.type !== 'term') {
    throw new AppError(
      400,
      'Boolean searches must start and end with a word or quoted phrase.',
      'INVALID_SEARCH_QUERY',
    );
  }

  const output: string[] = [];
  let previous: Token | undefined;
  for (const token of tokens) {
    if (token.type === 'term') {
      if (previous?.type === 'term') output.push('AND');
      output.push(quoteTerm(token.value));
    } else {
      if (previous?.type === 'operator') {
        throw new AppError(400, 'Two boolean operators cannot appear together.', 'INVALID_SEARCH_QUERY');
      }
      output.push(token.value);
    }
    previous = token;
  }

  return output.join(' ');
}
