import type { ExtractiveAnswerResponse, SearchResult } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { buildFtsQuery } from './queryParser.js';

interface MatchRow {
  entityType: 'document' | 'note' | 'integration';
  entityId: string;
  title: string;
  snippet: string;
  rank: number;
}

interface DetailsRow {
  category: string | null;
  tags: string | null;
  version: string | null;
  mimeType: string | null;
  updatedAt: string;
  integrationFolderId: string | null;
}

export function search(database: ApothekeDatabase, rawQuery: string): SearchResult[] {
  const ftsQuery = buildFtsQuery(rawQuery);
  const matches = database
    .prepare(
      `SELECT entity_type AS entityType,
              entity_id AS entityId,
              title,
              snippet(search_index, -1, '[[[PINIT_MATCH]]]', '[[[/PINIT_MATCH]]]', ' … ', 48) AS snippet,
              bm25(search_index, 6.0, 1.0, 0.5) AS rank
       FROM search_index
       WHERE search_index MATCH ?
       ORDER BY rank
       LIMIT 100`,
    )
    .all(ftsQuery) as MatchRow[];

  const documentDetails = database.prepare(
    `SELECT c.name AS category,
            GROUP_CONCAT(DISTINCT t.name) AS tags,
            v.version_label AS version,
            v.mime_type AS mimeType,
            d.updated_at AS updatedAt,
            NULL AS integrationFolderId
     FROM documents d
     JOIN document_versions v ON v.document_id = d.id AND v.is_current = 1
     LEFT JOIN categories c ON c.id = d.category_id
     LEFT JOIN document_tags dt ON dt.document_id = d.id
     LEFT JOIN tags t ON t.id = dt.tag_id
     WHERE d.id = ?
     GROUP BY d.id, v.id`,
  );
  const noteDetails = database.prepare(
    `SELECT c.name AS category,
            GROUP_CONCAT(DISTINCT t.name) AS tags,
            NULL AS version,
            NULL AS mimeType,
            n.updated_at AS updatedAt,
            NULL AS integrationFolderId
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id
     LEFT JOIN note_tags nt ON nt.note_id = n.id
     LEFT JOIN tags t ON t.id = nt.tag_id
     WHERE n.id = ?
     GROUP BY n.id`,
  );
  const integrationDetails = database.prepare(
    `SELECT s.name || ' / ' || f.name AS category,
            CASE WHEN e.original_filename IS NOT NULL THEN e.original_filename ELSE e.url END AS tags,
            NULL AS version,
            NULL AS mimeType,
            e.updated_at AS updatedAt,
            e.folder_id AS integrationFolderId
     FROM integration_entries e
     JOIN integration_folders f ON f.id = e.folder_id
     JOIN integration_spaces s ON s.id = f.space_id
     WHERE e.id = ?`,
  );

  return matches.flatMap((match) => {
    const details = (match.entityType === 'document'
      ? documentDetails.get(match.entityId)
      : match.entityType === 'note'
        ? noteDetails.get(match.entityId)
        : integrationDetails.get(match.entityId)) as DetailsRow | undefined;
    if (!details) return [];

    return [{
      ...match,
      category: details.category,
      tags: details.tags ? details.tags.split(',') : [],
      version: details.version,
      mimeType: details.mimeType,
      integrationFolderId: details.integrationFolderId,
      updatedAt: details.updatedAt,
    }];
  });
}

const questionStopWords = new Set([
  'a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'from', 'how', 'in', 'is', 'it', 'me', 'of', 'on', 'the', 'to', 'what', 'when', 'where', 'which', 'who', 'why',
  'απο', 'για', 'δε', 'δεν', 'ειναι', 'εχει', 'θα', 'και', 'με', 'μια', 'μου', 'να', 'ο', 'οι', 'ποια', 'ποιο', 'πως', 'σε', 'στη', 'στην', 'στο', 'τα', 'τη', 'την', 'τι', 'το', 'των',
]);

function questionKeywords(question: string): string[] {
  return [...new Set(question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}_-]+/gu) ?? [])]
    .filter((word) => word.length > 1 && !questionStopWords.has(word))
    .slice(0, 12);
}

function cleanExcerpt(snippet: string): string {
  return snippet
    .replaceAll('[[[PINIT_MATCH]]]', '')
    .replaceAll('[[[/PINIT_MATCH]]]', '')
    .replace(/\s+/g, ' ')
    .replace(/^\s*…\s*/, '')
    .replace(/\s*…\s*$/, '')
    .trim();
}

function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

function sourceContent(database: ApothekeDatabase, match: SearchResult): string {
  if (match.entityType === 'document') {
    const row = database.prepare(
      `SELECT v.extracted_text AS content
       FROM document_versions v
       WHERE v.document_id = ? AND v.is_current = 1`,
    ).get(match.entityId) as { content: string } | undefined;
    return row?.content ?? '';
  }
  if (match.entityType === 'note') {
    const row = database.prepare('SELECT content FROM notes WHERE id = ?')
      .get(match.entityId) as { content: string } | undefined;
    return row?.content ?? '';
  }
  const row = database.prepare('SELECT description AS content FROM integration_entries WHERE id = ?')
    .get(match.entityId) as { content: string } | undefined;
  return row?.content ?? '';
}

function completePassage(content: string, keywords: string[], fallback: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;

  const sentences = cleaned
    .split(/(?<=[.!?;])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length === 0) return fallback;

  let bestIndex = -1;
  let bestScore = 0;
  sentences.forEach((sentence, index) => {
    const normalized = normalizeForMatch(sentence);
    const score = keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  if (bestIndex < 0) return fallback;

  const best = sentences[bestIndex] ?? fallback;
  // Very short matches often depend on the following sentence for their meaning.
  const next = best.length < 100 ? sentences[bestIndex + 1] : undefined;
  return next ? `${best} ${next}` : best;
}

export function answerQuestion(database: ApothekeDatabase, question: string): ExtractiveAnswerResponse {
  const keywords = questionKeywords(question);
  if (keywords.length === 0) return { question, answer: null, sources: [] };

  const matches = search(database, keywords.join(' OR '));
  const sources = matches
    .filter((match) => match.entityType !== 'document' || !match.mimeType?.startsWith('image/'))
    .map((match) => {
      const fallback = cleanExcerpt(match.snippet);
      return {
        entityType: match.entityType,
        entityId: match.entityId,
        title: match.title,
        excerpt: completePassage(sourceContent(database, match), keywords, fallback),
        category: match.category,
        mimeType: match.mimeType,
        integrationFolderId: match.integrationFolderId,
      };
    })
    .filter((source) => source.excerpt.length >= 12)
    .slice(0, 4);

  return {
    question,
    answer: sources[0]?.excerpt ?? null,
    sources,
  };
}
