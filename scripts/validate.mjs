import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { generateNews, normalizePublications, parseBibTeX, readYaml, root } from './lib.mjs';

const dated = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const profileSchema = z.object({
  name: z.object({ english: z.string().min(1), japanese: z.string().min(1), display: z.string().min(1) }),
  degree: z.string().min(1), affiliation: z.string().min(1), laboratory: z.string().min(1),
  position: z.string().min(1), email: z.string().email(), biography: z.string().min(1),
  research_statement: z.string().min(1), research_interests: z.array(z.object({ title: z.string(), description: z.string() })).min(1),
  memberships: z.array(z.object({ name: z.string(), url: z.string().url() })),
  links: z.object({ scholar: z.string().url(), github: z.string().url(), affiliation: z.string().url() }),
  author_aliases: z.array(z.string()).min(1),
});
const awardSchema = z.array(z.object({ title: z.string().min(1), date: dated, url: z.string().url().optional() }));
const timelineSchema = z.array(z.object({
  start: dated, end: z.union([dated, z.literal('Present')]),
}).passthrough());
const metricSchema = z.object({
  value: z.union([
    z.string(),
    z.number(),
  ]),
  year: z.number().int(),
});

const venueSchema = z.record(
  z.object({
    icore: metricSchema.optional(),
    impact_factor: metricSchema.optional(),
    quartile: z.object({
      value: z.enum(['Q1', 'Q2', 'Q3', 'Q4']),
      year: z.number().int(),
    }).optional(),
    scimago: metricSchema.optional(),
  })
);

const [profile, metadata, news, awards, education, experience, venues, bib] = await Promise.all([
  readYaml('data/profile.yaml'), readYaml('data/publications-meta.yaml'), readYaml('data/news.yaml'),
  readYaml('data/awards.yaml'), readYaml('data/education.yaml'), readYaml('data/experience.yaml'), readYaml('data/venue.yaml'),
  fs.readFile(path.join(root, 'data/publications.bib'), 'utf8'),
]);
profileSchema.parse(profile);
awardSchema.parse(awards);
timelineSchema.parse(education);
timelineSchema.parse(experience);
venueSchema.parse(venues);
const entries = parseBibTeX(bib);
const keySet = new Set(entries.map((entry) => entry.key));
for (const key of Object.keys(metadata)) if (!keySet.has(key)) throw new Error(`Metadata references unknown publication: ${key}`);
const publications = normalizePublications(entries, metadata, profile, venues);
for (const publication of publications) {
  const declared =
    metadata[publication.key]?.equal_contribution ?? [];

  const matched =
    publication.authors.filter((author) => author.equalContribution).length;

  if (declared.length !== matched) {
    throw new Error(
      `Equal-contribution author mismatch in ${publication.key}: ` +
      `declared ${declared.length}, matched ${matched}`
    );
  }
}
generateNews(publications, metadata, news);
if (!publications.some((publication) => publication.authors.some((author) => author.self))) throw new Error('No self author aliases matched');
console.log(`Validation passed: ${publications.length} publications, ${awards.length} awards.`);

