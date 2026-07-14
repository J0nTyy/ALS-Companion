/**
 * Stable section ids for the in-app User Guide. These match the GitHub-style
 * heading slugs the guide renders with (see {@link slugify}), so an ⓘ hint can deep
 * link straight to the relevant topic at `/help#<id>`. Keep in sync with the
 * headings in `USER_GUIDE.md`.
 */
export const HELP = {
  gettingStarted: "1-getting-started",
  dataModel: "2-how-your-data-is-organized",
  dashboard: "3-dashboard-home",
  studies: "4-studies",
  protocol: "5-study-protocol",
  animals: "6-animals-mouse-database",
  observations: "7-observations",
  timeline: "8-experiment-timeline",
  mriHistology: "9-mri--histology-sessions",
  assets: "10-research-assets--files",
  viewer: "11-mri-images--the-image-viewer",
  annotations: "12-annotations",
  comparison: "13-mri-comparison-workspace",
  search: "14-search",
  publication: "15-publication-workspace",
  settings: "16-settings",
  deleting: "17-deleting-vs-archiving-and-where-your-data-lives",
  contextMenus: "18-right-click-context-menus",
  shortcuts: "19-keyboard-shortcuts",
  troubleshooting: "20-tips--troubleshooting",
  glossary: "21-glossary",
} as const;

export type HelpSection = (typeof HELP)[keyof typeof HELP];
