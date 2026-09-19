import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

export const root = path.resolve(import.meta.dirname, '..');

export async function readYaml(relativePath) {
  const source = await fs.readFile(path.join(root, relativePath), 'utf8');
  return YAML.parse(source);
}

function findMatchingBrace(source, start) {
  const open = source[start];
  const close = open === '{' ? '}' : ')';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    if (quoted) continue;
    if (char === open) depth += 1;
    if (char === close) depth -= 1;
    if (depth === 0) return i;
  }
  throw new Error(`Unclosed BibTeX entry starting at character ${start}`);
}

function splitTopLevel(source, delimiter = ',') {
  const result = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') quoted = !quoted;
    if (!quoted && char === '{') depth += 1;
    if (!quoted && char === '}') depth -= 1;
    if (!quoted && depth === 0 && char === delimiter) {
      result.push(source.slice(start, i));
      start = i + 1;
    }
  }
  result.push(source.slice(start));
  return result;
}

function cleanBibValue(value) {
  let clean = value.trim().replace(/,$/, '').trim();
  while ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('"') && clean.endsWith('"'))) {
    clean = clean.slice(1, -1).trim();
  }
  return clean
    .replace(/[{}]/g, '')
    .replace(/--/g, '–')
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\%/g, '%')
    .replace(/\\textendash\s*/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBibTeX(source) {
  const entries = [];
  const seen = new Set();
  let cursor = 0;
  while (cursor < source.length) {
    const at = source.indexOf('@', cursor);
    if (at === -1) break;
    const match = source.slice(at).match(/^@([A-Za-z]+)\s*([({])/);
    if (!match) throw new Error(`Invalid BibTeX entry near character ${at}`);
    const type = match[1].toLowerCase();
    const openIndex = at + match[0].lastIndexOf(match[2]);
    const closeIndex = findMatchingBrace(source, openIndex);
    const content = source.slice(openIndex + 1, closeIndex);
    const parts = splitTopLevel(content);
    const key = parts.shift()?.trim();
    if (!key) throw new Error(`Missing citation key near character ${at}`);
    if (seen.has(key)) throw new Error(`Duplicate citation key: ${key}`);
    seen.add(key);
    const fields = {};
    for (const part of parts) {
      if (!part.trim()) continue;
      const eq = part.indexOf('=');
      if (eq < 1) throw new Error(`Malformed field in ${key}: ${part.trim()}`);
      fields[part.slice(0, eq).trim().toLowerCase()] = cleanBibValue(part.slice(eq + 1));
    }
    entries.push({ key, type, fields });
    cursor = closeIndex + 1;
  }
  if (entries.length === 0) throw new Error('No BibTeX entries found');
  return entries;
}

function splitAuthors(authorString) {
  return authorString.split(/\s+and\s+/i).map((raw) => {
    const value = raw.trim();
    if (value.includes(',')) {
      const [family, ...given] = value.split(',').map((part) => part.trim());
      return { raw: value, given: given.join(' '), family, display: `${given.join(' ')} ${family}`.trim() };
    }
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s]+$/u.test(value)) {
      return { raw: value, given: '', family: value.replace(/\s/g, ''), display: value };
    }
    const bits = value.split(/\s+/);
    return { raw: value, given: bits.slice(0, -1).join(' '), family: bits.at(-1) ?? value, display: value };
  });
}

const normalizedName = (value) => value.normalize('NFKC').toLowerCase().replace(/[\s,.-]/g, '');

function defaultCategory(type) {
  if (type === 'article') return 'journal';
  if (['inproceedings', 'conference'].includes(type)) return 'international-conference';
  if (['incollection', 'book', 'inbook'].includes(type)) return 'book-chapter';
  return 'other';
}

function venueFor(fields) {
  return fields.journal || fields.booktitle || fields.publisher || '';
}

export function normalizePublications(entries, metadata, profile) {
  const aliases = new Set(profile.author_aliases.map(normalizedName));
  return entries.map(({ key, type, fields }) => {
    if (!fields.title || !fields.author || !fields.year) {
      throw new Error(`${key} must include title, author, and year`);
    }
    const meta = metadata[key] ?? {};
    const authors = splitAuthors(fields.author).map((author) => ({
      ...author,
      self: aliases.has(normalizedName(author.display)) || aliases.has(normalizedName(author.raw)),
      equalContribution: (meta.equal_contribution ?? []).some((name) => normalizedName(name) === normalizedName(author.display)),
    }));
    return {
      key,
      type,
      title: fields.title,
      authors,
      year: Number.parseInt(fields.year, 10),
      month: fields.month ?? null,
      venue: venueFor(fields),
      volume: fields.volume ?? null,
      number: fields.number ?? null,
      pages: fields.pages ?? null,
      publisher: fields.publisher ?? null,
      address: fields.address ?? null,
      note: fields.note ?? null,
      doi: fields.doi ?? null,
      url: fields.url ?? (fields.doi ? `https://doi.org/${fields.doi}` : null),
      category: meta.category ?? defaultCategory(type),
      featured: meta.featured ?? false,
      cv: meta.cv ?? true,
      links: meta.links ?? {},
      tags: meta.tags ?? [],
    };
  }).sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

export function generateNews(publications, metadata, customNews) {
  const byKey = new Map(publications.map((publication) => [publication.key, publication]));
  const generated = [];
  for (const [key, meta] of Object.entries(metadata)) {
    const publication = byKey.get(key);
    for (const item of meta.news ?? []) {
      generated.push({
        date: item.date,
        type: item.type,
        publication: key,
        title: publication.title,
        venue: item.venue || publication.venue,
        text: item.type === 'accepted'
          ? `Our paper “${publication.title}” was accepted at ${item.venue || publication.venue}.`
          : `Our paper “${publication.title}” was ${item.type}.`,
        url: publication.url,
      });
    }
  }
  for (const item of customNews) {
    if (item.publication && !byKey.has(item.publication)) throw new Error(`News references unknown publication: ${item.publication}`);
    const publication = item.publication ? byKey.get(item.publication) : null;
    generated.push({ ...item, title: publication?.title ?? null, url: item.url ?? publication?.url ?? null });
  }
  return generated.sort((a, b) => b.date.localeCompare(a.date));
}

export function latexEscape(value = '') {
  return String(value)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([#$%&_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/–|—/g, '--');
}

export function displayDate(value) {
  if (value === 'Present') return value;
  const [year, month] = value.split('-');
  const names = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
  return month ? `${names[Number(month) - 1]} ${year}` : year;
}
