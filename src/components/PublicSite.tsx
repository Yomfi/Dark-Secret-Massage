import React, { createContext, useContext, useEffect } from 'react';
import { usePublicSite, type PublicFaq, type PublicPage } from '../lib/cmsCatalogue';
import { applySeo } from '../lib/seo';

type SiteValue = {
  settings: Record<string, string>;
  pages: PublicPage[];
  faqs: PublicFaq[];
  loading: boolean;
  error: string | null;
};

const DEFAULT_TITLE = 'Massager Studio — Massage Services Near You';
const DEFAULT_DESCRIPTION =
  'Book vetted massage therapists in Accra, Tema and across Ghana — in studio or at home, with private booking details.';

const SiteContext = createContext<SiteValue>({
  settings: {},
  pages: [],
  faqs: [],
  loading: true,
  error: null,
});

export const PublicSiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const site = usePublicSite();

  useEffect(() => {
    if (site.loading || site.error) return;
    applySeo(
      {
        title: site.settings.seo_title,
        description: site.settings.seo_description,
        image: site.settings.og_image,
        url: typeof window !== 'undefined' ? window.location.href : null,
      },
      { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION }
    );
  }, [site.loading, site.error, site.settings.seo_title, site.settings.seo_description, site.settings.og_image]);

  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
};

export const useSite = (): SiteValue => useContext(SiteContext);

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION };
