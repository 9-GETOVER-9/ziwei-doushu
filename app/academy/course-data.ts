import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cache } from 'react';

export interface TianjiEntry {
  book: string;
  h2: string;
  h3: string;
  quote: string;
  section: number;
  t_hms: string;
  note: string;
  bvid: string;
  part: number;
}

export interface TianjiCourse { id: string; title: string; summary: string; count: number; part: number; file: string }

export const getTianjiEntries = cache((): TianjiEntry[] => {
  const content = readFileSync(path.join(process.cwd(), 'docs', 'tianji-ziwei', 'entries.jsonl'), 'utf8');
  return content.trim().split(/\r?\n/).map(line => JSON.parse(line) as TianjiEntry);
});

export const getTianjiCourses = cache((): TianjiCourse[] => {
  const directory = path.join(process.cwd(), 'docs', 'tianji-ziwei');
  const index = readFileSync(path.join(directory, 'README.md'), 'utf8');
  return Array.from(index.matchAll(/^\| (\d+[上下]) \| (.+?) \| (\d+) \| \[[^\]]+\]\(\.\/([^\)]+)\) \|$/gm)).map(match => {
    const content = readFileSync(path.join(directory, match[4]), 'utf8');
    const part = Number(content.match(/\?p=(\d+)/)?.[1]);
    return { id: match[1], title: `${match[1]} · ${Number(match[1].replace(/\D/g, '')) > 15 ? '补充学习' : '紫微斗数'}`, summary: match[2], count: getTianjiEntries().filter(entry => entry.part === part).length, part, file: match[4] };
  });
});

export function getEntryVideo(entry: TianjiEntry) {
  const [hours, minutes, seconds] = entry.t_hms.split(':').map(Number);
  return `https://www.bilibili.com/video/${entry.bvid}?p=${entry.part}&t=${hours * 3600 + minutes * 60 + seconds}`;
}
