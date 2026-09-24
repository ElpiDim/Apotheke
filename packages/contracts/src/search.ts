import type { SearchResult } from './index.js';

export interface SearchRow {
  entityType: 'document' | 'note' | 'integration' | 'category';
  entityId: string;
  title: string;
  content: string;
  metadata?: string | null;
  category: string | null;
  tags: string | null;
  version: string | null;
  mimeType: string | null;
  integrationFolderId: string | null;
  updatedAt: string;
}

interface ParsedQuery {
  groups: string[][];
  excluded: string[];
  highlighted: string[];
}

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();

function parseQuery(query: string): ParsedQuery {
  const tokens = [...query.matchAll(/"([^"]+)"|(\S+)/gu)]
    .map((match) => (match[1] ?? match[2] ?? '').trim())
    .filter(Boolean);
  const groups: string[][] = [[]];
  const excluded: string[] = [];
  let excluding = false;

  for (const rawToken of tokens) {
    const operator = rawToken.toLocaleUpperCase();
    if (operator === 'AND') continue;
    if (operator === 'OR') {
      if (groups.at(-1)?.length) groups.push([]);
      excluding = false;
      continue;
    }
    if (operator === 'NOT') {
      excluding = true;
      continue;
    }
    const token = normalize(rawToken);
    if (!token) continue;
    if (excluding) {
      excluded.push(token);
      excluding = false;
    } else {
      groups.at(-1)!.push(token);
    }
  }

  const activeGroups = groups.filter((group) => group.length > 0);
  return {
    groups: activeGroups,
    excluded,
    highlighted: [...new Set(activeGroups.flat())],
  };
}

function matches(haystack: string, query: ParsedQuery): boolean {
  if (query.groups.length === 0 || query.excluded.some((term) => haystack.includes(term))) return false;
  return query.groups.some((group) => group.every((term) => haystack.includes(term)));
}

function normalizedWithMap(value: string): { normalized: string; map: number[] } {
  let normalized = '';
  const map: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const folded = normalize(value[index] ?? '');
    for (const character of folded) {
      normalized += character;
      map.push(index);
    }
  }
  return { normalized, map };
}

function highlight(value: string, terms: string[]): string {
  const folded = normalizedWithMap(value);
  const ranges: Array<[number, number]> = [];
  for (const term of terms) {
    let from = 0;
    while (term && from < folded.normalized.length) {
      const found = folded.normalized.indexOf(term, from);
      if (found < 0) break;
      const start = folded.map[found] ?? 0;
      const end = (folded.map[found + term.length - 1] ?? start) + 1;
      ranges.push([start, end]);
      from = found + Math.max(1, term.length);
    }
  }
  if (!ranges.length) return value;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  let result = '';
  let cursor = 0;
  for (const [start, end] of merged) {
    result += value.slice(cursor, start);
    result += `[[[PINIT_MATCH]]]${value.slice(start, end)}[[[/PINIT_MATCH]]]`;
    cursor = end;
  }
  return result + value.slice(cursor);
}

function termPositions(value: string, term: string): number[] {
  const positions: number[] = [];
  let from = 0;
  while (term && from < value.length) {
    const found = value.indexOf(term, from);
    if (found < 0) break;
    positions.push(found);
    from = found + Math.max(1, term.length);
  }
  return positions;
}

function excerpts(content: string, groups: string[][], terms: string[]): { snippets: string[]; matchCount: number } {
  const clean = content.replace(/\s+/gu, ' ').trim();
  if (!clean) return { snippets: [], matchCount: 0 };
  const folded = normalizedWithMap(clean);
  const clusters: Array<[number, number]> = [];

  for (const group of groups) {
    const positionSets = group.map((term) => termPositions(folded.normalized, term));
    if (positionSets.some((positions) => positions.length === 0)) continue;
    if (group.length === 1) {
      for (const position of positionSets[0]!) clusters.push([position, position + group[0]!.length]);
      continue;
    }

    // Anchor on the rarest term. On a tie, prefer the last term so repeated
    // leading words do not create duplicate combinations for the same phrase.
    const anchorIndex = positionSets.reduce((best, positions, index) => positions.length <= positionSets[best]!.length ? index : best, 0);
    for (const anchor of positionSets[anchorIndex]!) {
      const selected = positionSets.map((positions) => positions.reduce((nearest, position) => Math.abs(position - anchor) < Math.abs(nearest - anchor) ? position : nearest));
      const start = Math.min(...selected);
      const end = Math.max(...selected.map((position, index) => position + group[index]!.length));
      // Multiple AND terms form one result only when they occur in the same
      // local passage, rather than anywhere else in a potentially long file.
      const characterStart = folded.map[start] ?? 0;
      const characterEnd = (folded.map[Math.max(start, end - 1)] ?? characterStart) + 1;
      const crossesSentence = /[.!?。！？]/u.test(clean.slice(characterStart, characterEnd));
      if (end - start <= 180 && !crossesSentence) clusters.push([start, end]);
    }
  }

  clusters.sort((a, b) => a[0] - b[0]);
  const uniqueClusters = clusters.filter((cluster, index) => index === 0 || cluster[0] !== clusters[index - 1]![0] || cluster[1] !== clusters[index - 1]![1]);
  if (!uniqueClusters.length) return { snippets: [], matchCount: 0 };

  const windows: Array<[number, number]> = [];
  for (const [normalizedStart, normalizedEnd] of uniqueClusters) {
    const position = folded.map[normalizedStart] ?? 0;
    const matchEnd = (folded.map[Math.max(normalizedStart, normalizedEnd - 1)] ?? position) + 1;
    const roughStart = Math.max(0, position - 80);
    const startBoundary = roughStart > 0 ? clean.indexOf(' ', roughStart) : 0;
    const start = startBoundary >= 0 && startBoundary < position ? startBoundary + 1 : roughStart;
    const roughEnd = Math.min(clean.length, Math.max(matchEnd + 160, start + 240));
    const endBoundary = roughEnd < clean.length ? clean.lastIndexOf(' ', roughEnd) : clean.length;
    const end = endBoundary > position ? endBoundary : roughEnd;
    windows.push([start, end]);
  }

  return {
    matchCount: uniqueClusters.length,
    snippets: windows.slice(0, 100).map(([start, end]) => `${start ? '…' : ''}${highlight(clean.slice(start, end), terms)}${end < clean.length ? '…' : ''}`),
  };
}

function contentSections(content: string): Array<{ page: number | null; text: string }> {
  const marker = /\[\[\[PINIT_PAGE:(\d+)\]\]\]/gu;
  const matches = [...content.matchAll(marker)];
  if (matches.length === 0) return [{ page: null, text: content }];
  return matches.map((match, index) => ({
    page: Number(match[1]),
    text: content.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? content.length),
  }));
}

function looksLikeContents(value: string): boolean {
  const folded = normalize(value);
  const dotLeaders = value.match(/(?:\.\s*){8,}/gu)?.length ?? 0;
  const numbers = folded.match(/\b\d{1,4}\b/gu)?.length ?? 0;
  const heading = /\b(?:table\s+of\s+contents|contents)\b/u.test(folded);
  return dotLeaders >= 2 || (heading && numbers >= 3);
}

function snippetWords(value: string): Set<string> {
  return new Set(cleanMarkers(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
}

function cleanMarkers(value: string): string {
  return value.replaceAll('[[[PINIT_MATCH]]]', '').replaceAll('[[[/PINIT_MATCH]]]', '');
}

function nearlyIdentical(left: string, right: string): boolean {
  const a = snippetWords(left);
  const b = snippetWords(right);
  if (a.size === 0 || b.size === 0) return false;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / Math.max(a.size, b.size) >= 0.88;
}

export function searchRecords(records: SearchRow[], query: string) {
  const parsed = parseQuery(query.trim());
  if (parsed.groups.length === 0) return { query, results: [] };
  const results: SearchResult[] = records.flatMap((row) => {
    const content = [row.title, row.metadata, row.content, row.category, row.tags].filter(Boolean).join(' ');
    const haystack = normalize(content);
    if (!matches(haystack, parsed)) return [];
    const title = normalize(row.title);
    const titleHits = parsed.highlighted.filter((term) => title.includes(term)).length;
    const sectionMatches = contentSections(row.content).flatMap(({ page, text }) => {
      if (page !== null && looksLikeContents(text)) return [];
      const found = excerpts(text, parsed.groups, parsed.highlighted);
      return found.snippets.filter((snippet) => !looksLikeContents(snippet)).map((snippet) => ({ snippet, page }));
    });
    const uniqueSectionMatches = sectionMatches.filter((match, index) => !sectionMatches.slice(0, index).some((previous) => nearlyIdentical(previous.snippet, match.snippet)));
    return [{
      entityType: row.entityType,
      entityId: row.entityId,
      title: row.title,
      snippet: uniqueSectionMatches[0]?.snippet ?? '',
      snippets: uniqueSectionMatches.map((match) => match.snippet),
      matchCount: uniqueSectionMatches.length,
      matchPages: uniqueSectionMatches.map((match) => match.page),
      rank: 1 + titleHits,
      category: row.category,
      tags: row.tags?.split(' ').filter(Boolean) ?? [],
      version: row.version,
      mimeType: row.mimeType,
      integrationFolderId: row.integrationFolderId,
      updatedAt: row.updatedAt,
    }];
  }).sort((a, b) => b.rank - a.rank || b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100);
  return { query, results };
}
