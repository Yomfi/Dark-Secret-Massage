/** Apply CMS-driven SEO tags to the document head. */
export type SeoInput = {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  url?: string | null;
};

function setMeta(attribute: 'name' | 'property', key: string, value: string): void {
  if (!value) return;
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

export function applySeo(input: SeoInput, defaults: { title: string; description: string }): void {
  const title = (input.title || '').trim() || defaults.title;
  const description = (input.description || '').trim() || defaults.description;
  const image = (input.image || '').trim();
  const url = (input.url || '').trim();

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', 'website');
  if (image) setMeta('property', 'og:image', image);
  if (url) {
    setMeta('property', 'og:url', url);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
}
