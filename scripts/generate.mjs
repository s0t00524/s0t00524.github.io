import fs from 'node:fs/promises';
import path from 'node:path';
import { displayDate, generateNews, latexEscape, normalizePublications, parseBibTeX, readYaml, root } from './lib.mjs';

const [profile, metadata, customNews, awards, education, experience, service, bibSource] = await Promise.all([
  readYaml('data/profile.yaml'),
  readYaml('data/publications-meta.yaml'),
  readYaml('data/news.yaml'),
  readYaml('data/awards.yaml'),
  readYaml('data/education.yaml'),
  readYaml('data/experience.yaml'),
  readYaml('data/service.yaml'),
  fs.readFile(path.join(root, 'data/publications.bib'), 'utf8'),
]);

const entries = parseBibTeX(bibSource);
const keys = new Set(entries.map((entry) => entry.key));
for (const key of Object.keys(metadata)) {
  if (!keys.has(key)) throw new Error(`Publication metadata references unknown key: ${key}`);
}
const publications = normalizePublications(entries, metadata, profile);
const news = generateNews(publications, metadata, customNews);

await fs.mkdir(path.join(root, 'generated'), { recursive: true });
await fs.writeFile(path.join(root, 'generated/publications.json'), `${JSON.stringify(publications, null, 2)}\n`);
await fs.writeFile(path.join(root, 'generated/news.json'), `${JSON.stringify(news, null, 2)}\n`);

await fs.mkdir(path.join(root, 'cv/generated'), { recursive: true });
const listItems = (values) => values.map((value) => `\\item ${latexEscape(value)}`).join('\n');
const profileTex = `\\newcommand{\\CVName}{${latexEscape(profile.name.english)}}
\\newcommand{\\CVNameJapanese}{${latexEscape(profile.name.japanese)}}
\\newcommand{\\CVPosition}{${latexEscape(profile.position)}}
\\newcommand{\\CVAffiliation}{${latexEscape(profile.laboratory)}}
\\newcommand{\\CVEmail}{${latexEscape(profile.email)}}
\\newcommand{\\CVWebsite}{s0t00524.github.io/s0t00524/}
\\newcommand{\\CVSummary}{${latexEscape(profile.research_statement)}}
`;
const researchTex = `\\cvsection{Research Interests}
\\begin{itemize}[leftmargin=1.5em,itemsep=2pt,topsep=3pt]
${profile.research_interests.map((interest) => `\\item \\textbf{${latexEscape(interest.title)}:} ${latexEscape(interest.description)}`).join('\n')}
\\end{itemize}`;
const timeline = (items, heading, titleKey, orgKey) => `\\cvsection{${heading}}
${items.map((item) => `\\cventry{${latexEscape(item[titleKey])}}{${latexEscape(item[orgKey])}${item.location ? `, ${latexEscape(item.location)}` : ''}}{${latexEscape(displayDate(item.start))} -- ${latexEscape(displayDate(item.end))}}${item.note ? `{${latexEscape(item.note)}}` : '{}'}
${item.details?.length ? `\\begin{itemize}[leftmargin=1.2em,itemsep=0pt,topsep=2pt]\n${listItems(item.details)}\n\\end{itemize}` : ''}`).join('\n')}`;
const awardsTex = `\\cvsection{Awards}
${awards.map((award) => `\\cvline{${latexEscape(displayDate(award.date))}}{${latexEscape(award.title)}}`).join('\n')}`;
const serviceTex = `\\cvsection{Academic Service}
\\cvline{Steering}{${service.steering.map((item) => `${latexEscape(item.organization)} (${latexEscape(item.period)})`).join('; ')}}
\\cvline{TPC}{${service.tpc.map((item) => `${latexEscape(item.organization)} ${item.year}`).join('; ')}}
\\cvline{Reviewing}{${latexEscape([...service.reviewing.journals, ...service.reviewing.conferences].join('; '))}}`;
const categories = new Map();
for (const publication of publications.filter((item) => item.cv)) {
  const category = publication.category === 'journal' ? 'journals'
    : publication.category === 'international-conference' ? 'international'
      : publication.category === 'domestic-conference' ? 'domestic' : 'otherpubs';
  categories.set(category, [...(categories.get(category) ?? []), publication.key]);
}
const categoriesTex = [...categories.entries()].map(([category, citationKeys]) => `\\addtocategory{${category}}{${citationKeys.join(',')}}`).join('\n');

await Promise.all([
  fs.writeFile(path.join(root, 'cv/generated/profile.tex'), profileTex),
  fs.writeFile(path.join(root, 'cv/generated/research.tex'), researchTex),
  fs.writeFile(path.join(root, 'cv/generated/education.tex'), timeline(education, 'Education', 'degree', 'institution')),
  fs.writeFile(path.join(root, 'cv/generated/experience.tex'), timeline(experience, 'Experience', 'role', 'organization')),
  fs.writeFile(path.join(root, 'cv/generated/awards.tex'), awardsTex),
  fs.writeFile(path.join(root, 'cv/generated/service.tex'), serviceTex),
  fs.writeFile(path.join(root, 'cv/generated/categories.tex'), `${categoriesTex}\n`),
]);

console.log(`Generated ${publications.length} publications and ${news.length} news items.`);
