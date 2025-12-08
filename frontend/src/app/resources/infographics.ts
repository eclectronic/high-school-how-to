export interface InfographicResource {
  slug: string;
  title: string;
  webImage: string;
  printableImage: string;
  description?: string;
}

/**
 * Local set of infographic assets surfaced on the homepage.
 * Update the paths/titles to feature new graphics without touching templates.
 */
export const infographics: InfographicResource[] = [
  {
    slug: 'five-tips-hair-dye',
    title: 'Five Tips Before You Dye Your Hair',
    webImage: '/assets/infographics/web/five-tips-for-hair-dye.jpeg',
    printableImage: '/assets/infographics/printable/five-tips-for-hair-dye.jpeg',
    description: 'Prep, patch test, and care steps before trying that new color.'
  },
  {
    slug: 'discover-new-music',
    title: 'How to Discover New Music',
    webImage: '/assets/infographics/web/how-to-discover-music.jpeg',
    printableImage: '/assets/infographics/printable/how-to-discover-music.jpeg',
    description: 'Quick cheatsheet for finding playlists, radio shows, and concerts.'
  },
  {
    slug: 'daily-routine',
    title: 'Daily Routine',
    webImage: '/assets/infographics/web/daily-routine.png',
    printableImage: '/assets/infographics/printable/daily-routine.png',
    description: 'My ideal daily routine for productivity and well-being.'
  },
  {
    slug: 'un-boring-your-annotations',
    title: 'Un-Boring Your Annotations',
    webImage: '/assets/infographics/web/un-boring-your-annotations.jpeg',
    printableImage: '/assets/infographics/printable/un-boring-your-annotations.jpeg',
    description: 'Tips for making annotations that stick out and help you learn.'
  }
];
