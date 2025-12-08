export interface YoutubeVideoResource {
  slug: string;
  title: string;
  url: string;
  description?: string;
}

export const deriveYoutubeId = (input: string): string => {
  try {
    const parsed = new URL(input);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      return parsed.pathname.replace('/', '');
    }

    if (parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v') ?? input;
    }

    const segments = parsed.pathname.split('/');
    return segments[segments.length - 1] || input;
  } catch {
    return input;
  }
};

export const buildYoutubeEmbedUrl = (urlOrId: string, autoplay = false): string => {
  const id = deriveYoutubeId(urlOrId);
  const params = autoplay ? '?autoplay=1' : '';
  return `https://www.youtube.com/embed/${id}${params}`;
};

export const buildYoutubeThumbnailUrl = (urlOrId: string): string =>
  `https://img.youtube.com/vi/${deriveYoutubeId(urlOrId)}/hqdefault.jpg`;

/**
 * Static list of YouTube videos that can be manually curated until an API-driven
 * integration is introduced. Update the URLs/titles as new @HighSchool-HowTo videos ship.
 */
export const youtubeVideos: YoutubeVideoResource[] = [
  {
    slug: 'ultimate-gpa-calculation-guide',
    title: 'The ULTIMATE GPA Calculation Guide',
    url: 'https://www.youtube.com/watch?v=fcECDsCmxD0',
    description: "How to find your weighted, unweighted, and capped GPA and why it matters."
  },
  {
    slug: 'sat-vs-act-guide',
    title: 'To Test or Not to Test? The SAT, the ACT, and YOU!',
    url: 'https://www.youtube.com/watch?v=V5amSLLPFoA',
    description: 'What is the SAT? What is the ACT? What’s the difference? Does it matter? Your comprehensive guide to everything college standardized testing!'
  }
];
