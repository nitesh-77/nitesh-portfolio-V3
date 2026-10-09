import { getCollection, type CollectionEntry } from 'astro:content';

export type Work = CollectionEntry<'work'>;
export type WorkKind = Work['data']['kind'];
export type Media = NonNullable<Work['data']['media']>;

export function workSection(kind: WorkKind) {
  return kind === 'project' ? 'projects' : 'oss';
}

export function workPath(entry: Work) {
  return `/${workSection(entry.data.kind)}/${entry.id}/`;
}

export async function getWork() {
  return (await getCollection('work')).sort(
    (a, b) => a.data.order - b.data.order || a.id.localeCompare(b.id),
  );
}

export async function getPublishedBlog() {
  return (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime() || a.id.localeCompare(b.id),
  );
}
