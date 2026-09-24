import type { ExtractiveAnswerResponse, SearchResult } from '@peanut/contracts';
import { searchRecords, type SearchRow } from '@peanut/contracts';
import { WorkspaceError } from './workspace';

interface ChunkMatchRow { documentId:string;title:string;snippet:string;page:number|null;score:number;category:string|null;tags:string|null;version:string;mimeType:string;updatedAt:string }
type QueryToken={type:'term';value:string;exact:boolean}|{type:'operator';value:'AND'|'OR'|'NOT'};

function tokenize(input:string):QueryToken[]{const tokens:QueryToken[]=[];let index=0;while(index<input.length){if(/\s/u.test(input[index]??'')){index+=1;continue;}if(input[index]==='"'){const end=input.indexOf('"',index+1);if(end<0)throw new WorkspaceError(400,'Search phrase is missing a closing quote.','INVALID_SEARCH_QUERY');const value=input.slice(index+1,end).trim();if(value)tokens.push({type:'term',value,exact:true});index=end+1;continue;}let end=index;while(end<input.length&&!/\s/u.test(input[end]??''))end+=1;const value=input.slice(index,end),operator=value.toUpperCase();tokens.push(operator==='AND'||operator==='OR'||operator==='NOT'?{type:'operator',value:operator}:{type:'term',value,exact:false});index=end;}return tokens;}
function quoteTerm(value:string,exact:boolean):string{const normalized=value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase(),safe=normalized.match(/[\p{L}\p{N}_-]+/gu)?.join(' ')??'';if(!safe)throw new WorkspaceError(400,'Enter searchable words.','INVALID_SEARCH_QUERY');const quoted=`"${safe.replaceAll('"','""')}"`;return exact?quoted:`${quoted}*`;}
function buildFtsQuery(input:string):string{if(!input.trim())throw new WorkspaceError(400,'Enter something to search for.','EMPTY_SEARCH_QUERY');if(input.length>500)throw new WorkspaceError(400,'Search queries are limited to 500 characters.','INVALID_SEARCH_QUERY');const raw=tokenize(input.trim()),tokens=raw.filter((token,index)=>!(token.type==='operator'&&token.value==='AND'&&raw[index+1]?.type==='operator'&&raw[index+1]?.value==='NOT'));if(tokens[0]?.type!=='term'||tokens.at(-1)?.type!=='term')throw new WorkspaceError(400,'Boolean searches must start and end with a word or quoted phrase.','INVALID_SEARCH_QUERY');const output:string[]=[];let previous:QueryToken|undefined;for(const token of tokens){if(token.type==='term'){if(previous?.type==='term')output.push('AND');output.push(quoteTerm(token.value,token.exact));}else{if(previous?.type==='operator')throw new WorkspaceError(400,'Two boolean operators cannot appear together.','INVALID_SEARCH_QUERY');output.push(token.value);}previous=token;}return output.join(' ');}

async function documentMatches(db:D1Database,owner:string,query:string):Promise<SearchResult[]>{const ftsQuery=buildFtsQuery(query);const matches=await db.prepare(`
SELECT dc.document_id AS documentId,d.title,
snippet(document_chunks_fts,0,'[[[PINIT_MATCH]]]','[[[/PINIT_MATCH]]]',' … ',40) AS snippet,
dc.page_number AS page,bm25(document_chunks_fts) AS score,c.name AS category,
(SELECT GROUP_CONCAT(t.name,' ') FROM document_tags dt JOIN tags t ON t.id=dt.tag_id AND t.owner_id=dt.owner_id WHERE dt.owner_id=dc.owner_id AND dt.document_id=dc.document_id) AS tags,
v.version_label AS version,v.mime_type AS mimeType,d.updated_at AS updatedAt
FROM document_chunks_fts
JOIN document_chunks dc ON dc.rowid=document_chunks_fts.rowid
JOIN documents d ON d.id=dc.document_id AND d.owner_id=dc.owner_id
JOIN document_versions v ON v.id=dc.version_id AND v.owner_id=dc.owner_id AND v.is_current=1
LEFT JOIN categories c ON c.id=d.category_id AND c.owner_id=d.owner_id
WHERE document_chunks_fts MATCH ? AND dc.owner_id=?
ORDER BY bm25(document_chunks_fts),d.updated_at DESC LIMIT 100`).bind(ftsQuery,owner).all<ChunkMatchRow>();const grouped=new Map<string,SearchResult>();for(const row of matches.results){const current=grouped.get(row.documentId)??{entityType:'document' as const,entityId:row.documentId,title:row.title,snippet:'',snippets:[],matchCount:0,matchPages:[],rank:-row.score,category:row.category,tags:row.tags?.split(' ').filter(Boolean)??[],version:row.version,mimeType:row.mimeType,integrationFolderId:null,updatedAt:row.updatedAt};const clean=row.snippet.replaceAll('[[[PINIT_MATCH]]]','').replaceAll('[[[/PINIT_MATCH]]]','').trim(),duplicate=current.snippets?.some(snippet=>snippet.replaceAll('[[[PINIT_MATCH]]]','').replaceAll('[[[/PINIT_MATCH]]]','').trim()===clean);if(!duplicate){current.snippets=[...(current.snippets??[]),row.snippet];current.matchPages=[...(current.matchPages??[]),row.page];current.matchCount=(current.matchCount??0)+1;if(!current.snippet)current.snippet=row.snippet;}grouped.set(row.documentId,current);}return[...grouped.values()];}

async function otherRows(db:D1Database,owner:string):Promise<SearchRow[]>{const result=await db.prepare(`
SELECT 'note' AS entityType,n.id AS entityId,n.title,n.content,NULL AS metadata,c.name AS category,GROUP_CONCAT(t.name,' ') AS tags,NULL AS version,NULL AS mimeType,NULL AS integrationFolderId,n.updated_at AS updatedAt
FROM notes n LEFT JOIN categories c ON c.id=n.category_id AND c.owner_id=n.owner_id LEFT JOIN note_tags nt ON nt.note_id=n.id AND nt.owner_id=n.owner_id LEFT JOIN tags t ON t.id=nt.tag_id AND t.owner_id=nt.owner_id WHERE n.owner_id=? GROUP BY n.id
UNION ALL SELECT 'integration',e.id,e.title,e.description,(COALESCE(e.original_filename,'')||' '||f.name||' '||s.name),NULL,NULL,NULL,e.mime_type,e.folder_id,e.updated_at FROM integration_entries e JOIN integration_folders f ON f.id=e.folder_id AND f.owner_id=e.owner_id JOIN integration_spaces s ON s.id=f.space_id AND s.owner_id=f.owner_id WHERE e.owner_id=?
UNION ALL SELECT 'category',c.id,c.name,'',NULL,c.name,NULL,NULL,NULL,NULL,c.updated_at FROM categories c WHERE c.owner_id=?`).bind(owner,owner,owner).all<SearchRow>();return result.results;}

export async function searchWorkspace(db:D1Database,owner:string,query:string){if(!query.trim())return{query,results:[]};const[documents,others]=await Promise.all([documentMatches(db,owner,query),otherRows(db,owner)]);return{query,results:[...documents,...searchRecords(others,query).results].slice(0,100)};}

const stopWords=new Set(['a','an','and','are','can','do','does','for','from','how','in','is','it','me','of','on','the','to','what','when','where','which','who','why','απο','για','δε','δεν','ειναι','εχει','θα','και','με','μια','μου','να','ο','οι','ποια','ποιο','πως','σε','στη','στην','στο','τα','τη','την','τι','το','των']);
const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
function answerQuery(question:string):string{return[...new Set(normalize(question).match(/[\p{L}\p{N}_-]+/gu)??[])].filter(word=>word.length>1&&!stopWords.has(word)).slice(0,12).join(' OR ');}
function cleanMarkers(value:string):string{return value.replaceAll('[[[PINIT_MATCH]]]','').replaceAll('[[[/PINIT_MATCH]]]','');}
export async function answerWorkspace(db:D1Database,owner:string,question:string):Promise<ExtractiveAnswerResponse>{const query=answerQuery(question);if(!query)return{question,answer:null,sources:[]};const{results}=await searchWorkspace(db,owner,query);const sources=results.filter(result=>result.entityType!=='category'&&!(result.mimeType?.startsWith('image/'))).slice(0,5).map(result=>({entityType:result.entityType as 'document'|'note'|'integration',entityId:result.entityId,title:result.title,excerpt:cleanMarkers(result.snippet),category:result.category,mimeType:result.mimeType,integrationFolderId:result.integrationFolderId}));return{question,answer:sources[0]?.excerpt||null,sources};}
