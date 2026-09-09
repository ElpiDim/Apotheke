import type { ExtractiveAnswerResponse, SearchResult } from '@peanut/contracts';

interface SearchRow {
  entityType: 'document' | 'note' | 'integration' | 'category';
  entityId: string;
  title: string;
  content: string;
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

function excerpt(content: string, terms: string[]): string {
  const clean = content.replace(/\s+/gu, ' ').trim();
  if (!clean) return '';
  const folded = normalizedWithMap(clean);
  const positions = terms.map((term) => folded.normalized.indexOf(term)).filter((position) => position >= 0);
  const normalizedPosition = positions.length ? Math.min(...positions) : 0;
  const characterPosition = folded.map[normalizedPosition] ?? 0;
  const start = Math.max(0, characterPosition - 90);
  const end = Math.min(clean.length, start + 280);
  const selected = clean.slice(start, end);
  return `${start ? '…' : ''}${highlight(selected, terms)}${end < clean.length ? '…' : ''}`;
}

async function rows(db: D1Database, owner: string): Promise<SearchRow[]> {
  const result = await db.prepare(`
    SELECT 'document' AS entityType,d.id AS entityId,d.title,(d.title||' '||v.original_filename||' '||v.extracted_text) AS content,c.name AS category,GROUP_CONCAT(t.name,' ') AS tags,v.version_label AS version,v.mime_type AS mimeType,NULL AS integrationFolderId,d.updated_at AS updatedAt
    FROM documents d JOIN document_versions v ON v.document_id=d.id AND v.owner_id=d.owner_id AND v.is_current=1 LEFT JOIN categories c ON c.id=d.category_id AND c.owner_id=d.owner_id LEFT JOIN document_tags dt ON dt.document_id=d.id AND dt.owner_id=d.owner_id LEFT JOIN tags t ON t.id=dt.tag_id AND t.owner_id=dt.owner_id WHERE d.owner_id=? GROUP BY d.id
    UNION ALL SELECT 'note',n.id,n.title,(n.title||' '||n.content),c.name,GROUP_CONCAT(t.name,' '),NULL,NULL,NULL,n.updated_at FROM notes n LEFT JOIN categories c ON c.id=n.category_id AND c.owner_id=n.owner_id LEFT JOIN note_tags nt ON nt.note_id=n.id AND nt.owner_id=n.owner_id LEFT JOIN tags t ON t.id=nt.tag_id AND t.owner_id=nt.owner_id WHERE n.owner_id=? GROUP BY n.id
    UNION ALL SELECT 'integration',e.id,e.title,(e.title||' '||e.description||' '||COALESCE(e.original_filename,'')||' '||f.name||' '||s.name),NULL,NULL,NULL,e.mime_type,e.folder_id,e.updated_at FROM integration_entries e JOIN integration_folders f ON f.id=e.folder_id AND f.owner_id=e.owner_id JOIN integration_spaces s ON s.id=f.space_id AND s.owner_id=f.owner_id WHERE e.owner_id=?
    UNION ALL SELECT 'category',c.id,c.name,c.name,c.name,NULL,NULL,NULL,NULL,c.updated_at FROM categories c WHERE c.owner_id=?
  `).bind(owner, owner, owner, owner).all<SearchRow>();
  return result.results;
}

export async function searchWorkspace(db: D1Database, owner: string, query: string) {
  const parsed = parseQuery(query.trim());
  if (parsed.groups.length === 0) return { query, results: [] };
  const results: SearchResult[] = (await rows(db, owner)).flatMap((row) => {
    const content = [row.title, row.content, row.category, row.tags].filter(Boolean).join(' ');
    const haystack = normalize(content);
    if (!matches(haystack, parsed)) return [];
    const title = normalize(row.title);
    const titleHits = parsed.highlighted.filter((term) => title.includes(term)).length;
    return [{
      entityType: row.entityType,
      entityId: row.entityId,
      title: row.title,
      snippet: excerpt(row.content, parsed.highlighted),
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

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'from', 'how', 'in', 'is', 'it', 'me', 'of', 'on', 'the', 'to', 'what', 'when', 'where', 'which', 'who', 'why',
  'απο', 'για', 'δε', 'δεν', 'ειναι', 'εχει', 'θα', 'και', 'με', 'μια', 'μου', 'να', 'ο', 'οι', 'ποια', 'ποιο', 'πως', 'σε', 'στη', 'στην', 'στο', 'τα', 'τη', 'την', 'τι', 'το', 'των',
]);

function answerQuery(question: string): string {
  return [...new Set(normalize(question).match(/[\p{L}\p{N}_-]+/gu) ?? [])]
    .filter((word) => word.length > 1 && !stopWords.has(word))
    .slice(0, 12)
    .join(' OR ');
}

function cleanMarkers(value: string): string {
  return value.replaceAll('[[[PINIT_MATCH]]]', '').replaceAll('[[[/PINIT_MATCH]]]', '');
}

export async function answerWorkspace(db: D1Database, owner: string, question: string): Promise<ExtractiveAnswerResponse> {
  const query = answerQuery(question);
  if (!query) return { question, answer: null, sources: [] };
  const { results } = await searchWorkspace(db, owner, query);
  const sources = results.filter((result) => result.entityType !== 'category' && !(result.mimeType?.startsWith('image/')))
    .slice(0, 5)
    .map((result) => ({
      entityType: result.entityType as 'document' | 'note' | 'integration',
      entityId: result.entityId,
      title: result.title,
      excerpt: cleanMarkers(result.snippet),
      category: result.category,
      mimeType: result.mimeType,
      integrationFolderId: result.integrationFolderId,
    }));
  return { question, answer: sources[0]?.excerpt || null, sources };
}

