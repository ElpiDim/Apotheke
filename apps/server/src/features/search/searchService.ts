import type { SearchResult } from '@apotheke/contracts';
import type { ApothekeDatabase } from '../../database/database.js';
import { buildFtsQuery } from './queryParser.js';

interface MatchRow {
  entityType: 'document' | 'note';
  entityId: string;
  title: string;
  snippet: string;
  rank: number;
}

interface DetailsRow {
  category: string | null;
  tags: string | null;
  version: string | null;
  updatedAt: string;
}

export function search(database: ApothekeDatabase, rawQuery: string): SearchResult[] {
  const ftsQuery = buildFtsQuery(rawQuery);
  const matches = database
    .prepare(
      `SELECT entity_type AS entityType,
              entity_id AS entityId,
              title,
              snippet(search_index, -1, '', '', ' … ', 28) AS snippet,
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
            d.updated_at AS updatedAt
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
            n.updated_at AS updatedAt
     FROM notes n
     LEFT JOIN categories c ON c.id = n.category_id
     LEFT JOIN note_tags nt ON nt.note_id = n.id
     LEFT JOIN tags t ON t.id = nt.tag_id
     WHERE n.id = ?
     GROUP BY n.id`,
  );

  return matches.flatMap((match) => {
    const details = (match.entityType === 'document'
      ? documentDetails.get(match.entityId)
      : noteDetails.get(match.entityId)) as DetailsRow | undefined;
    if (!details) return [];

    return [{
      ...match,
      category: details.category,
      tags: details.tags ? details.tags.split(',') : [],
      version: details.version,
      updatedAt: details.updatedAt,
    }];
  });
}
