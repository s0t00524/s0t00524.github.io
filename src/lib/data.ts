import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import publications from '../../generated/publications.json';
import news from '../../generated/news.json';

const root = path.resolve(process.cwd());
const yaml = <T>(file: string): T => YAML.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8')) as T;

export type Author = { display: string; self: boolean; equalContribution: boolean };
export type Publication = {
  key: string; title: string; authors: Author[]; year: number; month?: string | null;
  venue: string; volume?: string | null; number?: string | null; pages?: string | null;
  address?: string | null; note?: string | null; doi?: string | null; url?: string | null;
  category: string; featured: boolean; links: Record<string, string>; tags: string[];
};
export type NewsItem = { date: string; type: string; text: string; url?: string | null };

export const profile = yaml<any>('profile.yaml');
export const awards = yaml<any[]>('awards.yaml');
export const education = yaml<any[]>('education.yaml');
export const experience = yaml<any[]>('experience.yaml');
export const service = yaml<any>('service.yaml');
export const allPublications = publications as Publication[];
export const allNews = news as NewsItem[];

export const categoryLabels: Record<string, string> = {
  journal: 'Journal Articles',
  'international-conference': 'International Conferences',
  'domestic-conference': 'Domestic Conferences',
  workshop: 'Workshops',
  demo: 'Demos',
  'book-chapter': 'Book Chapters',
  other: 'Other Publications',
};

export function sitePath(relative = '') {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${relative.replace(/^\//, '')}`;
}

export function formatMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatPeriod(start: string, end: string) {
  return `${formatMonth(start)} — ${end === 'Present' ? end : formatMonth(end)}`;
}
