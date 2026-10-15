// Case-study content for the works panel. Each project is a short header
// (what, when, built with) and a run of sections; a section is a label, a
// one-line title and visual blocks. Copy stays minimal on purpose — the
// blocks carry the story, and the zoom tours hold the reasoning.

export type Img = {
  type: 'image';
  /** Full-resolution file (2× the size it's laid out at on desktop). */
  src: string;
  /** Optional half-resolution copy for phones and 1× screens. */
  small?: string;
  /** Intrinsic size of `src`, so the frame reserves its box before load. */
  w: number;
  h: number;
  alt: string;
};

export type Vid = {
  type: 'video';
  src: string;
  poster: string;
  w: number;
  h: number;
  alt: string;
};

export type Media = Img | Vid;

/** How a screenshot is presented: in browser chrome, a phone, or bare. */
export type Frame = 'browser' | 'phone' | 'plain';

/** A region of an image, as fractions of its width and height. */
export type Spot = {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  note: string;
  /** The corner the number sits on (default top left). */
  pin?: 'tr' | 'bl' | 'br';
};

/** One before/after pair; several pairs in a block become tabs. */
export type ComparePair = {
  label: string;
  before: Media;
  after: Media;
  /** Address shown in the browser chrome for this pair. */
  url?: string;
};

export type Block =
  | { kind: 'media'; media: Media; frame?: Frame; caption?: string; size?: 'wide' | 'narrow' }
  | {
      kind: 'compare';
      pairs: ComparePair[];
      frame?: Frame;
      caption?: string;
      labels?: [string, string];
      size?: 'wide' | 'narrow';
      /** Where the divider rests, in percent from the left (default 50). */
      start?: number;
    }
  | { kind: 'zoom'; media: Media; frame?: Frame; spots: Spot[]; caption?: string }
  | {
      kind: 'gallery';
      items: {
        media: Media;
        caption?: string;
        frame?: Frame;
        span?: 1 | 2;
        /** Show at design size, centred on a plate, instead of stretching a
         *  small piece to the column width: `true` for 2× captures, or the
         *  capture's pixel density (3 for phone shots). */
        natural?: boolean | number;
      }[];
      columns?: 2 | 3;
    }
  | { kind: 'flow'; items: { media: Media; label: string }[]; frame?: Frame }
  | { kind: 'stats'; items: { value: string; label: string }[] }
  | { kind: 'notes'; items: { title: string; body: string }[] }
  | { kind: 'diagram'; diagram: DiagramId; caption?: string }
  | {
      /** An expert review by interface pattern: per area, what was missing
       *  and where each one landed in the redesign. */
      kind: 'patterns';
      groups: { area: string; items: { name: string; where: string }[] }[];
      caption?: string;
    }
  | {
      /** A style tile: swatches plus component renders, each shown at its
       *  design size (sources are 2× exports, laid out at half their pixels). */
      kind: 'tile';
      swatches: { name: string; hex: string }[];
      groups: { label: string; wide?: boolean; items: { media: Img; caption?: string }[] }[];
      /** Sheet colour behind the components, and the text colour on it
       *  (for a dark sheet). */
      paper?: string;
      paperInk?: string;
      caption?: string;
    };

export type DiagramId =
  | 'arampig-architecture'
  | 'arampig-pipeline'
  | 'arampig-update'
  | 'arampig-cache'
  | 'arampig-score'
  | 'veracity-plan';

export type Section = {
  id: string;
  label: string;
  title: string;
  /** One or two sentences at most. */
  lede?: string;
  blocks: Block[];
};

export type Project = {
  id: string;
  name: string;
  role: string;
  tags: string;
  year: string;
  /** Transparent artwork for the orbit, the reveal and the reduced-motion list. */
  icon: string;
  starColor: string;
  bg: string;
  ink: string;
  accent: string;
  /** A dark page: light ink on a deep ground (plates and bezels flip). */
  scheme?: 'dark';
  /** The one line under the title. */
  summary: string;
  link?: { href: string; label: string };
  /** Shown in the browser chrome around this project's screenshots. */
  domain?: string;
  facts: { label: string; value: string }[];
  /** What it was made with, grouped (e.g. Frontend / Backend / Design). */
  stack: { label: string; items: string[] }[];
  cover?: Block;
  sections: Section[];
};

// Media helpers. Stills ship as 2× WebP with a half-size `-sm` sibling;
// clips as muted H.264 with a WebP poster of the same name.
const img = (src: string, w: number, h: number, alt: string): Img => ({
  type: 'image',
  src,
  small: src.replace(/\.webp$/, '-sm.webp'),
  w,
  h,
  alt,
});
const vid = (src: string, w: number, h: number, alt: string): Vid => ({
  type: 'video',
  src,
  poster: src.replace(/\.mp4$/, '.webp'),
  w,
  h,
  alt,
});

const KL = '/works/korabova-lovich';
const AP = '/works/aram-pig';
const OP = '/works/omas-pantry';

export const projects: Project[] = [
  {
    id: 'korabova-lovich',
    name: 'Korabova & Lovich',
    role: 'Law Firm',
    tags: 'UX Research · Brand Identity · Web',
    year: '2026',
    icon: '/works/korabova-lovich-icon-256.png',
    // The firm's indigo and cream paper, softened to sit beside the site.
    starColor: '#4B4A77',
    bg: '#EEEAD8',
    ink: '#2D2A52',
    accent: '#665F9C',
    summary:
      "A Bratislava law firm's website, rebuilt from a stock WordPress theme into a calm, fast site in four languages.",
    link: { href: 'https://korabova.eu', label: 'korabova.eu' },
    domain: 'korabova.eu',
    facts: [
      { label: 'Client', value: 'Law firm, Bratislava' },
      { label: 'Role', value: 'Research, design & development' },
      { label: 'Year', value: '2026' },
    ],
    stack: [
      { label: 'Design', items: ['Figma', 'Illustrator'] },
      { label: 'Front end', items: ['SvelteKit 2', 'Svelte 5', 'TypeScript', 'Vite'] },
      { label: 'Platform', items: ['Cloudflare Pages', 'Workers', 'Turnstile'] },
      { label: 'Integrations', items: ['Microsoft Graph', 'OpenStreetMap', 'JSON-LD'] },
    ],
    cover: {
      kind: 'compare',
      frame: 'browser',
      pairs: [
        {
          label: 'Home',
          url: 'korabova.eu',
          before: img(`${KL}/compare/home-old.webp`, 2400, 1500, 'The old homepage: a large seal, an uppercase menu and a black-and-white stock banner'),
          after: img(`${KL}/compare/home-new.webp`, 2400, 1500, 'The new homepage: a glass nav pill, a serif headline and two calls to action'),
        },
        {
          label: 'Services',
          url: 'korabova.eu/services',
          before: img(`${KL}/compare/services-old.webp`, 2400, 1500, 'The old services page: a grid of stock photos'),
          after: img(`${KL}/compare/services-new.webp`, 2400, 1500, 'The new services page: an etched grid of twelve practice areas'),
        },
        {
          label: 'Family law',
          url: 'korabova.eu/services/family-law',
          before: img(`${KL}/compare/practice-area-old.webp`, 2400, 1500, 'The old family law page with a stock photo of a crying child'),
          after: img(`${KL}/compare/practice-area-new.webp`, 2400, 1500, 'The new family law page: typographic masthead and an overview band'),
        },
        {
          label: 'Contact',
          url: 'korabova.eu/contact',
          before: img(`${KL}/compare/contact-old.webp`, 2400, 1800, 'The old contact page with a broken Google Maps embed'),
          after: img(`${KL}/compare/contact-new.webp`, 2400, 1800, 'The new contact page: copyable details, opening hours and a drawn map'),
        },
        {
          label: 'Form',
          url: 'korabova.eu/#write',
          before: img(`${KL}/compare/inquiry-form-old.webp`, 2400, 1800, 'The old contact form with native selects and a visible captcha'),
          after: img(`${KL}/compare/inquiry-form-new.webp`, 2400, 1800, 'The new inquiry card on an ink band'),
        },
      ],
    },
    sections: [
      {
        id: 'audit',
        label: 'Audit',
        title: 'What the old site got wrong.',
        blocks: [
          {
            kind: 'zoom',
            frame: 'browser',
            media: img(`${KL}/compare/home-old.webp`, 2400, 1500, 'The old homepage'),
            spots: [
              {
                x: 0.085, y: 0.015, w: 0.14, h: 0.185,
                pin: 'br',
                title: 'A billboard seal',
                note: 'The seal fills a 240-pixel header; the logo shouts while nothing else on screen can be acted on.',
              },
              {
                x: 0.31, y: 0.075, w: 0.6, h: 0.06,
                title: 'Browse, never act',
                note: 'Seven uppercase links and two flags for languages — and no way to get in touch from the top of the page.',
              },
              {
                x: 0.088, y: 0.236, w: 0.81, h: 0.39,
                title: 'A banner that says nothing',
                note: 'A black-and-white stock banner and a slogan take the whole fold. The form sat at the very bottom of the page.',
              },
              {
                x: 0.665, y: 0.49, w: 0.155, h: 0.045,
                // Below the number, not over the e-mail beside it.
                pin: 'br',
                title: 'The number you came for',
                note: 'The phone number fades into the photo at barely visible contrast.',
              },
              {
                x: 0.09, y: 0.715, w: 0.82, h: 0.285,
                title: 'Walls of text',
                note: 'Justified, half-bold paragraphs: big word gaps on phones, and nothing to scan.',
              },
            ],
          },
          {
            kind: 'zoom',
            frame: 'browser',
            media: img(`${KL}/compare/home-new.webp`, 2400, 1500, 'The new homepage'),
            spots: [
              {
                x: 0.042, y: 0.012, w: 0.93, h: 0.075,
                pin: 'bl',
                title: 'One glass pill',
                note: 'Seal, six links, the language and a “Write to us” button, always in reach.',
              },
              {
                x: 0.81, y: 0.026, w: 0.055, h: 0.045,
                pin: 'bl',
                title: 'Languages by name',
                note: 'A globe and “SK” instead of flags; each language lives on its own domain.',
              },
              {
                x: 0.37, y: 0.25, w: 0.26, h: 0.2,
                title: 'The firm’s own words',
                note: '“Every step matters” — the client’s line, set large in a serif, with the promise in italics.',
              },
              {
                x: 0.35, y: 0.61, w: 0.3, h: 0.065,
                title: 'Two doors',
                note: 'Write about your matter, or see the services: the two things people come to do.',
              },
              {
                x: 0.16, y: 0.1, w: 0.68, h: 0.83,
                pin: 'bl',
                title: 'The seal, quieter',
                note: 'The old billboard seal survives as a 6% watermark: identity without the shouting.',
              },
            ],
          },
        ],
      },
      {
        id: 'mobile',
        label: 'On phones',
        title: 'Thumb-first.',
        blocks: [
          {
            kind: 'compare',
            frame: 'phone',
            pairs: [
              {
                label: 'Home',
                before: img(`${KL}/compare/home-phone-old.webp`, 760, 1644, 'The old homepage on a phone: a banner, then justified text'),
                after: img(`${KL}/compare/home-phone-new.webp`, 760, 1644, 'The new homepage on a phone: headline and two full-width buttons'),
              },
            ],
          },
          {
            kind: 'media',
            frame: 'plain',
            media: vid(`${KL}/clips/task-phone.mp4`, 1600, 900, 'Reaching the contact form on a phone, old site and new side by side'),
            caption: 'Reaching the form on a phone. Old on the left: scroll until it turns up. New: one tap from the first screen.',
          },
        ],
      },
      {
        id: 'roadmap',
        label: 'Roadmap',
        title: 'Three steps, drawn as you arrive.',
        lede: 'What happens after you write? First contact, a meeting, a resolution — the homepage answers before anyone has to ask.',
        blocks: [
          {
            kind: 'media',
            frame: 'browser',
            media: vid(`${KL}/clips/journey.mp4`, 1600, 710, 'The “How we work” section: three glass icons and the lines between them draw in'),
          },
          {
            kind: 'gallery',
            items: [
              {
                media: img(`${KL}/components/journey-phone.webp`, 1146, 1762, 'The same three steps as a vertical timeline on a phone'),
                caption: 'On phones the roadmap turns into a vertical timeline.',
                natural: 3,
              },
              {
                media: img(`${KL}/components/pricing-arc.webp`, 2400, 644, 'Fees as three stages: initial guidance, legal advice, representation'),
                caption: 'Fees follow the same three-step arc — the first one free.',
              },
            ],
          },
        ],
      },
      {
        id: 'interactions',
        label: 'Interactions',
        title: 'Small motions that explain themselves.',
        blocks: [
          {
            kind: 'gallery',
            items: [
              {
                media: vid(`${KL}/clips/nav-split.mp4`, 1600, 400, 'The nav changing colour where a dark band passes under it'),
                caption: 'The nav re-colours at the exact pixel where a dark band passes under it.',
                span: 2,
              },
              {
                media: vid(`${KL}/clips/lang-menu.mp4`, 1080, 676, 'The language menu unfolding from the nav pill'),
                caption: 'Languages unfold out of the pill itself.',
              },
              {
                media: vid(`${KL}/clips/hero-cta.mp4`, 1200, 676, 'A glass button on hover and press'),
                caption: 'Glass buttons: a turning rim, a sliding sheen, a real press.',
              },
              {
                media: vid(`${KL}/clips/bento.mp4`, 1600, 992, 'A light following the cursor across the practice-area grid'),
                caption: 'A light follows the cursor across the twelve practice areas.',
              },
              {
                media: vid(`${KL}/clips/dual-cta.mp4`, 1600, 1242, 'Private and business cards with their situation lists'),
                caption: 'Two doors, private or business, each listing the situations it covers.',
              },
              {
                media: vid(`${KL}/clips/countup.mp4`, 1600, 378, 'The case count counting up next to a marquee of client logos'),
                caption: 'The case count grows in place without nudging the line around it.',
                span: 2,
              },
              {
                media: vid(`${KL}/clips/testimonials.mp4`, 1600, 532, 'A stacked deck of client reviews being shuffled'),
                caption: 'Reviews as a stacked deck; swipe on phones.',
                span: 2,
              },
              {
                media: vid(`${KL}/clips/contact-copy.mp4`, 1200, 1438, 'Copying the e-mail address and phone number on the contact page'),
                caption: 'One tap copies. A live pill says whether the office is open right now.',
              },
              {
                media: vid(`${KL}/clips/drawer.mp4`, 780, 1688, 'The mobile menu opening from the nav pill'),
                caption: 'On phones, the pill becomes the menu.',
                frame: 'phone',
              },
            ],
          },
        ],
      },
      {
        id: 'form',
        label: 'Writing in',
        title: 'One card, in the order people think.',
        blocks: [
          {
            kind: 'zoom',
            frame: 'plain',
            media: img(`${KL}/components/inquiry-filled.webp`, 1256, 1396, 'The inquiry card, filled in'),
            spots: [
              {
                x: 0.07, y: 0.085, w: 0.86, h: 0.115,
                title: 'What you need, first',
                note: 'It opens on intent — consultation, representation and so on. Optional, but it frames the message.',
              },
              {
                x: 0.07, y: 0.205, w: 0.86, h: 0.115,
                title: 'Areas by typing',
                note: 'A custom listbox with type-ahead that ignores diacritics: “rod” lands on Rodinné právo.',
              },
              {
                x: 0.07, y: 0.325, w: 0.86, h: 0.21,
                title: 'The matter before the name',
                note: 'People describe their problem first and say who they are after.',
              },
              {
                x: 0.07, y: 0.815, w: 0.86, h: 0.105,
                title: 'Send waits until it’s ready',
                note: 'The button stays dim until every required field is filled, instead of scolding after a click.',
              },
            ],
          },
          {
            kind: 'media',
            frame: 'plain',
            media: vid(`${KL}/clips/task.mp4`, 1920, 706, 'Finding family law and writing to the firm, old site and new side by side'),
            caption: 'The same task on both sites: find family law, then write to the firm. Old on the left.',
          },
        ],
      },
      {
        id: 'components',
        label: 'Components',
        title: 'Built to be looked at closely.',
        blocks: [
          {
            kind: 'gallery',
            items: [
              { media: img(`${KL}/components/nav-light.webp`, 2400, 170, 'The nav pill over a light band'), span: 2 },
              { media: img(`${KL}/components/nav-seam.webp`, 2400, 170, 'The nav pill split between a light and a dark band'), span: 2 },
              {
                media: img(`${KL}/components/nav-dark.webp`, 2400, 170, 'The nav pill over the dark mediation page'),
                caption: 'One nav, three states: light, split at the seam, dark.',
                span: 2,
              },
              {
                media: img(`${KL}/components/lang-menu.webp`, 468, 500, 'The open language menu'),
                caption: 'Language sheet',
                natural: true,
              },
              {
                media: img(`${KL}/components/status-pill.webp`, 354, 154, 'An “Open now” status pill'),
                caption: 'Live opening hours',
                natural: true,
              },
              {
                media: img(`${KL}/components/testimonials.webp`, 2400, 782, 'The testimonial deck'),
                span: 2,
              },
              {
                media: img(`${KL}/components/service-register.webp`, 2400, 1246, 'The register of other practice areas with the current one marked'),
                caption: 'Every practice page ends on a register of the others, the current one marked.',
                span: 2,
              },
              {
                media: img(`${KL}/components/map.webp`, 2400, 866, 'The office map band on the homepage'),
                caption: 'The office map, drawn from OpenStreetMap at build time; street names ride each street’s straight runs.',
                span: 2,
              },
              {
                media: img(`${KL}/components/mediation-head.webp`, 2400, 1500, 'The dark mediation page'),
                caption: 'Mediation gets the site’s only dark page — nav, footer and all.',
                span: 2,
              },
            ],
          },
        ],
      },
      {
        id: 'engineering',
        label: 'Engineering',
        title: 'Fast, private, four languages.',
        blocks: [
          {
            kind: 'stats',
            items: [
              { value: '4', label: 'languages, each on its own domain' },
              { value: '72', label: 'static pages across them' },
              { value: '41', label: 'old URLs redirected, none lost' },
              { value: '0.5\u202fs', label: 'style recalculation over a full scroll, from 1.8\u00a0s' },
            ],
          },
          {
            kind: 'notes',
            items: [
              {
                title: 'A map without Google',
                body: 'Drawn from OpenStreetMap at build time as SVG: 43 KB, and no visitor’s IP sent anywhere on load.',
              },
              {
                title: 'One build per language',
                body: 'Each domain gets its own static build carrying only its language; hreflang links tie the four together.',
              },
              {
                title: 'A nav painted twice',
                body: 'Two painted copies of the nav, each clipped to the bands beneath it, split its colour at the exact pixel.',
              },
              {
                title: 'Mail without a mail server',
                body: 'A Cloudflare Worker checks Turnstile, rate-limits per hashed IP and sends through Microsoft Graph.',
              },
            ],
          },
        ],
      },
      {
        id: 'identity',
        label: 'Identity',
        title: 'From seal to signature.',
        blocks: [
          {
            kind: 'gallery',
            items: [
              { media: img(`${KL}/brand/card-front.webp`, 2000, 1112, 'Business card, front'), caption: 'Business card, front' },
              { media: img(`${KL}/brand/card-back.webp`, 2000, 1112, 'Business card, back'), caption: 'and back' },
              {
                media: img(`${KL}/brand/signature-en.webp`, 1508, 722, 'The office e-mail signature'),
                caption: 'E-mail signatures, built to survive Outlook and forced dark modes.',
              },
              {
                media: img(`${KL}/brand/og-sk.webp`, 1200, 630, 'The Slovak share card'),
                caption: 'A share card per language.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'aram-pig',
    name: 'ARAM PIG',
    role: 'Data Analytics Website',
    tags: 'Data Science · Development · Gaming · Web',
    year: '2026',
    icon: '/works/aram-pig-icon-256.png',
    // The Howling Abyss navy and the site's gold: the one dark page.
    starColor: '#273D51',
    bg: '#132435',
    ink: '#E7DDC7',
    accent: '#D3BB86',
    scheme: 'dark',
    summary:
      "A stats site for League of Legends' ARAM mode: its own performance score, builds ranked from millions of games, and the crawler that feeds them.",
    link: { href: 'https://arampig.lol', label: 'arampig.lol' },
    domain: 'arampig.lol',
    facts: [
      { label: 'Role', value: 'Design, data & full-stack development' },
      { label: 'Year', value: '2025–2026' },
    ],
    stack: [
      { label: 'Front end', items: ['Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS 4', 'TanStack Query', 'Motion'] },
      { label: 'Back end', items: ['Route handlers', 'PostgreSQL 18', 'Riot Games REST API', 'Data Dragon'] },
      { label: 'Infrastructure', items: ['Hetzner VPS', 'Dokploy', 'Traefik', 'Cloudflare', 'GitHub Actions'] },
      { label: 'Data & tests', items: ['Vitest', 'Python', 'scikit-learn', 'Parquet'] },
    ],
    cover: {
      kind: 'media',
      frame: 'browser',
      media: img(`${AP}/shots/home.webp`, 2400, 1500, 'The ARAM PIG home page: the title logo over the Howling Abyss and a search box'),
    },
    sections: [
      {
        id: 'product',
        label: 'Product',
        title: 'Built for the mode nobody builds for.',
        lede:
          "Most League stats sites are made for Summoner's Rift. ARAM — one lane, random champions — plays by different rules, so here builds, runes and player ratings are measured in ARAM alone.",
        blocks: [
          {
            kind: 'zoom',
            frame: 'browser',
            media: img(`${AP}/shots/champion.webp`, 2400, 1500, 'A champion page'),
            spots: [
              {
                x: 0.14, y: 0.115, w: 0.32, h: 0.16,
                title: 'The numbers that matter',
                note: 'Tier, win rate, pick rate, games — and damage as mean and spread, so a number reads against how much it varies.',
              },
              {
                x: 0.73, y: 0.11, w: 0.18, h: 0.06,
                title: 'Any patch, or a range',
                note: 'Stats are summed from per-patch tallies on request, so a range costs a query, not a rebuild.',
              },
              {
                x: 0.148, y: 0.365, w: 0.145, h: 0.58,
                title: 'Ranked for confidence',
                note: 'Core builds are ordered by a confidence bound, not raw win rate: a rare build that got lucky can’t top the list.',
              },
              {
                x: 0.305, y: 0.355, w: 0.39, h: 0.45,
                title: 'Every slot on its own',
                note: 'Win rate and games for each item in each slot — what to buy first, second, sixth.',
              },
              {
                x: 0.698, y: 0.355, w: 0.204, h: 0.45,
                title: 'Runes as a tree',
                note: 'The most-picked path drawn through the real rune tree, win rate on every pick.',
              },
              {
                x: 0.305, y: 0.81, w: 0.6, h: 0.16,
                title: 'The small decisions',
                note: 'Starting items, summoner spells and skill order, each with its own win rate and sample size.',
              },
            ],
          },
          {
            kind: 'gallery',
            items: [
              {
                media: img(`${AP}/shots/tier-list.webp`, 2400, 1500, 'The champion tier list'),
                caption: 'The tier list: S+ to COAL, recomputed as the patch goes on.',
              },
              {
                media: img(`${AP}/shots/profile.webp`, 2400, 1500, 'A player profile with match history'),
                caption: 'Profiles: every game scored, with labels for what stood out.',
              },
              {
                media: img(`${AP}/shots/items-expanded.webp`, 2400, 1500, 'The item tier list with an item opened into its six slots'),
                caption: 'Items: a tier and a best slot for each.',
              },
              {
                media: img(`${AP}/shots/mayhem.webp`, 2400, 1500, 'The ARAM: Mayhem augment tier list'),
                caption: 'Mayhem: augment tiers curated with top players.',
              },
            ],
          },
        ],
      },
      {
        id: 'architecture',
        label: 'Architecture',
        title: 'Two paths into one database.',
        lede:
          'One small server runs everything. Players read through two caches; a crawler writes in the background, and the two coordinate so a player never waits behind it.',
        blocks: [
          {
            kind: 'diagram',
            diagram: 'arampig-architecture',
            caption:
              'Reads come through the edge and the Next.js cache; a separate scraper writes in the background and tells the site when to refresh.',
          },
        ],
      },
      {
        id: 'scraper',
        label: 'Data pipeline',
        title: 'A crawler that follows players.',
        blocks: [
          {
            kind: 'diagram',
            diagram: 'arampig-pipeline',
            caption:
              'Every match it reads queues the other nine players, so the crawl spreads through the people who actually play ARAM.',
          },
          {
            kind: 'stats',
            items: [
              { value: '6.4M', label: 'player-games on a single patch' },
              { value: '2,200', label: 'new matches an hour, deduplicated' },
              { value: '173', label: 'champions, each with its own baselines' },
              { value: '26', label: 'patches of history kept — about a season' },
            ],
          },
        ],
      },
      {
        id: 'update',
        label: 'Profile updates',
        title: 'The button answers at once.',
        lede:
          'Importing a profile can mean hundreds of Riot calls. The request returns a job id straight away and the page shows real progress while the work runs behind it.',
        blocks: [
          { kind: 'diagram', diagram: 'arampig-update' },
          {
            kind: 'media',
            frame: 'plain',
            size: 'narrow',
            media: vid(`${AP}/clips/match.mp4`, 1600, 1560, 'A match row opening into both teams’ scoreboards'),
            caption: 'A match opens into both scoreboards, damage bars scaled to the game’s top damage. (Placeholder names: a test profile.)',
          },
        ],
      },
      {
        id: 'interface',
        label: 'Interface',
        title: 'Dense data, calm to read.',
        lede:
          'Dark navy for the Howling Abyss, gold for what matters, cyan for what you can press. Every control explains itself in place.',
        blocks: [
          {
            kind: 'media',
            frame: 'browser',
            media: vid(`${AP}/clips/search.mp4`, 1600, 1000, 'Typing a champion name in the search box and landing on its page'),
            caption: 'One box for champions, summoners, favourites and recent searches; a champion goes straight to its page.',
          },
          {
            kind: 'gallery',
            items: [
              {
                media: vid(`${AP}/clips/patch-picker.mp4`, 1600, 1240, 'Dragging across a bar chart of patches to pick a range'),
                caption: 'A bar per patch, sized by games played. Drag a range; nothing loads until Apply.',
              },
              {
                media: vid(`${AP}/clips/core-builds.mp4`, 1600, 1106, 'Switching between core builds'),
                caption: 'A ring glides to the picked build and the slot grid follows; Worst flips the list.',
              },
              {
                media: vid(`${AP}/clips/tooltips.mp4`, 1600, 1124, 'Hovering items to show their tooltips'),
                caption: 'Item tooltips carry the real numbers, read from the game’s own data.',
              },
              {
                media: vid(`${AP}/clips/tier-list.mp4`, 1600, 930, 'Sorting the tier list by different columns'),
                caption: 'Sort by any column; rows light up under the cursor.',
              },
              {
                media: vid(`${AP}/clips/items.mp4`, 1600, 808, 'Opening items into their six slots'),
                caption: 'Each item opens into its six slots, the best one marked.',
              },
              {
                media: vid(`${AP}/clips/mayhem.mp4`, 1280, 1000, 'Browsing Mayhem augments by tier'),
                caption: 'Mayhem augments by tier, filtered by Silver, Gold and Prismatic.',
              },
            ],
          },
          {
            kind: 'gallery',
            columns: 3,
            items: [
              {
                frame: 'phone',
                media: img(`${AP}/shots/phone-champion.webp`, 1170, 2532, 'Jinx’s champion page on a phone'),
                caption: 'On a phone the rail becomes a top bar; the numbers stay first.',
              },
              {
                frame: 'phone',
                media: img(`${AP}/shots/phone-profile.webp`, 1170, 2532, 'The test profile on a phone'),
                caption: 'Profiles lead with the average PIG.',
              },
              {
                frame: 'phone',
                media: img(`${AP}/shots/phone-tier-list.webp`, 1170, 2532, 'The tier list on a phone'),
                caption: 'Tier and win rate up front; each row opens for the rest.',
              },
            ],
          },
          {
            kind: 'tile',
            paper: '#00091B',
            paperInk: '#E4DCC6',
            swatches: [
              { name: 'Abyss', hex: '#000C1E' },
              { name: 'Gold', hex: '#CCBC8F' },
              { name: 'Bronze', hex: '#6F572A' },
              { name: 'Action', hex: '#189FC5' },
              { name: 'Loss', hex: '#E84057' },
              { name: 'S+', hex: '#FFE657' },
            ],
            groups: [
              {
                label: 'Tier list',
                wide: true,
                items: [{ media: img(`${AP}/shots/tier-rows.webp`, 2176, 940, 'Tier list rows with tier badges') }],
              },
              {
                label: 'Core builds',
                items: [{ media: img(`${AP}/shots/core-builds.webp`, 448, 1096, 'Core build cards') }],
              },
              {
                label: 'Runes',
                items: [{ media: img(`${AP}/shots/runes-card.webp`, 572, 800, 'The runes card') }],
              },
              {
                label: 'Controls',
                wide: true,
                items: [
                  { media: img(`${AP}/shots/patch-picker.webp`, 644, 378, 'The patch picker: a bar per patch, sized by games played') },
                  { media: img(`${AP}/shots/settings.webp`, 404, 406, 'Settings toggles in the rail') },
                ],
              },
              {
                label: 'Profile',
                wide: true,
                items: [{ media: img(`${AP}/shots/profile-head.webp`, 1400, 380, 'Profile header with level ring and Update button') }],
              },
              {
                label: 'Tiers & labels',
                wide: true,
                items: [
                  { media: img(`${AP}/shots/tiers.webp`, 636, 108, 'Tier badges from S+ to COAL') },
                  {
                    media: img(
                      `${AP}/shots/labels.webp`,
                      998,
                      108,
                      'Match labels: a PIG score, MOG, Penta Kill, DPS Threat, Look Who’s Back and King PIG',
                    ),
                  },
                ],
              },
            ],
            caption: 'One flat panel style with gold hairlines; colour is kept for tiers and the labels a game earns.',
          },
        ],
      },
      {
        id: 'score',
        label: 'PIG score',
        title: 'Judged against your own champion.',
        lede:
          'KDA rewards whoever got the kills. PIG asks how well you played your champion — against that champion’s typical ARAM game, weighted by what the champion is for.',
        blocks: [
          { kind: 'diagram', diagram: 'arampig-score' },
          {
            kind: 'gallery',
            items: [
              {
                media: img(`${AP}/shots/match-row.webp`, 1540, 256, 'A match row with its PIG badge and labels'),
                caption: 'Every match carries its score and what stood out.',
                span: 2,
              },
              {
                media: img(`${AP}/shots/aram-history.webp`, 1512, 436, 'The ARAM history card: win rate ring, KDA and recent champions'),
                caption: 'The history card sums it up.',
              },
              {
                media: img(`${AP}/shots/performance-card.webp`, 640, 272, 'The performance card with the PIG arc'),
                caption: 'The average PIG, as an arc.',
                natural: true,
              },
            ],
          },
        ],
      },
      {
        id: 'cache',
        label: 'Caching',
        title: 'Five layers before the database.',
        blocks: [
          { kind: 'diagram', diagram: 'arampig-cache' },
          {
            kind: 'notes',
            items: [
              {
                title: 'Never cache an outage',
                body: 'A build without database access once baked an empty tier list into the cache. Pages now throw instead, so a failure is never stored — and edge copies live five minutes, not an hour.',
              },
              {
                title: 'Interactive users first',
                body: 'Riot’s rate limits go through one token broker. A player pressing Update makes the crawler back off their region until the import is done.',
              },
            ],
          },
        ],
      },
      {
        id: 'performance',
        label: 'Performance',
        title: 'Measured, then made faster.',
        blocks: [
          {
            kind: 'stats',
            items: [
              { value: '0.2\u202fs', label: 'tier list, down from 1.1–3.5\u00a0s' },
              { value: '−93%', label: 'data read per champion page, 15\u00a0MB → 1\u00a0MB' },
              { value: '4\u202fms', label: 'to fold the tier list across patches; the old blob merge took ~10\u00a0s per champion' },
              { value: '150\u202fMB', label: 'server image, from 1.24\u00a0GB' },
            ],
          },
          {
            kind: 'notes',
            items: [
              {
                title: 'Blobs to tables',
                body: 'Stats moved from one JSON document per champion and patch into counter columns, with a custom SQL aggregate for running means — 6.6M rows backfilled and checked for parity.',
              },
              {
                title: 'A glow at 60 fps',
                body: 'The cursor spotlight cost 166 ms of style work per mouse move on big pages; it now writes to one tiny element instead.',
              },
              {
                title: 'Private stays private',
                body: 'Scoring code is server-only. A build step walks every client import graph and fails if private logic could reach the browser.',
              },
              {
                title: 'Art served locally',
                body: 'Game art is re-encoded as lossless WebP and served through Cloudflare, instead of uncached third-party requests of half a second each.',
              },
            ],
          },
        ],
      },
      {
        id: 'research',
        label: 'Research',
        title: 'Checking the score against the game.',
        blocks: [
          {
            kind: 'notes',
            items: [
              {
                title: 'Per-champion baselines',
                body: 'Comparing each champion with itself beat one pooled baseline by 38.9% on held-out games.',
              },
              {
                title: 'Builds above expectation',
                body: 'A gradient-boosted model of the game state before the third item (AUC 0.85) ranks builds by wins above expectation: +1.33 points, against +0.25 for the most popular pick.',
              },
              {
                title: 'No lucky outliers',
                body: 'In a stress test, rare “fake-good” builds topped the old ranking 222 times in 300 — and never under the new one.',
              },
              {
                title: 'Timelines, audited',
                body: '16,197 stored timelines (7.8M events) checked; snapshots trail their events, so state is now read from the frame before.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'veracity',
    name: 'Veracity',
    role: 'AI Startup',
    tags: 'Business Model · Product Design · Brand Identity',
    year: '2026',
    icon: '/works/veracity-icon-256.png',
    // The brand's green and mint, met in the middle.
    starColor: '#3C8469',
    bg: '#DAEDE6',
    ink: '#193A2E',
    accent: '#257355',
    summary: 'A start-up for real-time AI fact-checking, built into the browser and pitched to a panel of investors.',
    facts: [
      { label: 'Course', value: 'UX in Business' },
      { label: 'Team', value: 'Five students' },
      { label: 'Role', value: 'Business model, product & identity' },
      { label: 'Year', value: '2026' },
    ],
    stack: [
      { label: 'Strategy', items: ['Business Model Canvas', 'Value Proposition Canvas', 'Trend canvas', 'Unit economics'] },
      { label: 'Design', items: ['Figma', 'Prototyping', 'Identity'] },
    ],
    cover: {
      kind: 'media',
      frame: 'plain',
      size: 'narrow',
      media: img(
        '/works/veracity/light-round.webp',
        2430,
        692,
        'The Veracity logo: the rounded green mark beside the wordmark, on white',
      ),
    },
    sections: [
      {
        id: 'concept',
        label: 'Concept',
        title: 'Fact-checking while you read.',
        lede: 'Checking a claim by hand takes about two minutes, so hardly anyone does. Veracity reads along in your browser, checks each claim against several fact-checkers and marks it green, yellow or red — thirty checks a month free, unlimited for €9.99.',
        blocks: [],
      },
      {
        id: 'identity',
        label: 'Identity',
        title: 'Two greens, one cut.',
        blocks: [
          {
            kind: 'tile',
            swatches: [
              { name: 'Deep green', hex: '#216C53' },
              { name: 'Mint', hex: '#40D2A1' },
              { name: 'White', hex: '#FFFFFF' },
              { name: 'Ink', hex: '#1C1C1C' },
            ],
            groups: [
              {
                label: 'Mark',
                wide: true,
                items: [
                  {
                    // Vector, so it stays sharp at any size.
                    media: {
                      type: 'image',
                      src: '/works/veracity/mark.svg',
                      w: 320,
                      h: 320,
                      alt: 'The Veracity mark: a rounded square cut on the diagonal into a mint triangle and a mint-to-deep-green one',
                    },
                  },
                ],
              },
              {
                label: 'Reversed',
                wide: true,
                items: [{ media: img('/works/veracity/dark-round.webp', 2430, 692, 'Veracity logo on ink') }],
              },
              {
                label: 'On mint',
                wide: true,
                items: [{ media: img('/works/veracity/accent-round.webp', 2430, 692, 'Veracity logo in white on mint') }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'omas-pantry',
    name: "Oma's Pantry",
    role: 'Online Store',
    tags: 'UX Research · Web · Ecommerce',
    year: '2025',
    icon: '/works/omas-pantry-icon-256.png',
    // Pantry green on Oma's cream, with the clay of the add-to-cart button.
    starColor: '#265351',
    bg: '#F7E4D8',
    ink: '#0D3D3C',
    accent: '#A65831',
    summary:
      'thedutchstore.com, a U.S. shop for Dutch groceries, audited pattern by pattern and redesigned as Oma’s Pantry: a store you can browse.',
    facts: [
      { label: 'Course', value: 'Interaction Design II' },
      { label: 'Team', value: 'Three students' },
      { label: 'Role', value: 'Concept, layout & interaction design' },
      { label: 'Year', value: '2025' },
    ],
    stack: [
      { label: 'Method', items: ['Pattern audit', 'Concept testing', 'Style tile'] },
      { label: 'Design', items: ['Figma', 'Prototyping'] },
    ],
    cover: {
      kind: 'compare',
      frame: 'browser',
      pairs: [
        {
          label: 'Home',
          before: img(`${OP}/compare/home-old.webp`, 2400, 1364, 'The Dutch Store: a category list and a table of products'),
          after: img(`${OP}/compare/home-new.webp`, 2400, 1364, 'Oma’s Pantry: search, a category bar and a weekly offer'),
        },
        {
          label: 'Product',
          before: img(`${OP}/compare/product-old.webp`, 2400, 1364, 'The Dutch Store product page'),
          after: img(`${OP}/compare/product-new.webp`, 2400, 1364, 'The Oma’s Pantry product page'),
        },
      ],
    },
    sections: [
      {
        id: 'before',
        label: 'Before',
        title: 'A table of 696 products.',
        blocks: [
          {
            kind: 'zoom',
            frame: 'browser',
            media: img(`${OP}/compare/home-old.webp`, 2400, 1364, 'The original store'),
            spots: [
              {
                x: 0.165, y: 0.0, w: 0.67, h: 0.185,
                // The top corners sit on the frame's edge, where a pin is cut.
                pin: 'br',
                title: 'Everything at once',
                note: 'Phone number, account links, a cart drawing and a Facebook button compete for the top of the page.',
              },
              {
                x: 0.165, y: 0.19, w: 0.155, h: 0.51,
                title: 'One long list',
                note: 'Twenty categories as plain text — no images, no grouping, nothing to filter by.',
              },
              {
                x: 0.325, y: 0.315, w: 0.29, h: 0.035,
                // On the page numbers' end, clear of the rows' corner below.
                pin: 'tr',
                title: '696 products found',
                note: 'And ten numbered pages of them to wade through.',
              },
              {
                x: 0.32, y: 0.365, w: 0.395, h: 0.635,
                title: 'Rows, not products',
                note: 'A code, an underlined link and a thumbnail the size of a fingernail: browsing means reading.',
              },
              {
                x: 0.72, y: 0.32, w: 0.1, h: 0.68,
                title: 'Type a number per row',
                note: 'Quantities go into a column of text boxes, sent by one “Add to Cart” button at the top.',
              },
            ],
          },
        ],
      },
      {
        id: 'audit',
        label: 'Audit',
        title: 'What it was missing.',
        lede: 'An expert review against the patterns in Designing Interfaces, and where each missing one landed in the redesign.',
        blocks: [
          {
            kind: 'patterns',
            groups: [
              {
                area: 'Getting around',
                items: [
                  { name: 'Breadcrumbs', where: 'on every product page' },
                  { name: 'Fat menu', where: 'under each category' },
                  { name: 'Escape hatch', where: '‹ Back beside the trail' },
                  { name: 'Progress indicator', where: 'checkout steps that lead back' },
                ],
              },
              {
                area: 'Layout',
                items: [
                  { name: 'Visual hierarchy', where: 'one big banner, products under it' },
                  { name: 'Call to action', where: 'the clay Add to cart' },
                ],
              },
              {
                area: 'Lists',
                items: [
                  { name: 'Thumbnail grid', where: 'even when filtered' },
                  { name: 'Carousel', where: 'seasonal offers up top' },
                ],
              },
              {
                area: 'Doing things',
                items: [
                  { name: 'Smart menu item', where: 'the button becomes a stepper' },
                  { name: 'Assumed next step', where: 'Proceed to payment' },
                  { name: 'Cancelability', where: 'a bin at one item' },
                ],
              },
              {
                area: 'Getting input',
                items: [
                  { name: 'Input hints', where: 'prompts in search and forms' },
                  { name: 'Autocompletion', where: 'address search at checkout' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'concepts',
        label: 'Concepts',
        title: 'The frame that stayed.',
        lede: 'Each of us drew a concept, and mine became the frame: layout, filters and categories. Testers liked its colours but found it too premium for a pantry, so the final wears a teammate’s warmer branding and one big banner instead of a wall of products.',
        blocks: [
          {
            kind: 'gallery',
            items: [
              {
                media: img(`${OP}/screens/draft.webp`, 1600, 1334, 'My concept: a serif logo, red buttons, a category bar and a filtered grid'),
                caption: 'My concept: serif and red, with the search, category bar, filters and grid the final kept.',
              },
              {
                media: img(`${OP}/screens/final.webp`, 1600, 1334, 'The final design: script logo on green, clay buttons'),
                caption: 'Final: the same frame in pantry green and clay, under a teammate’s script logo.',
              },
            ],
          },
        ],
      },
      {
        id: 'after',
        label: 'After',
        title: 'A shop you can browse.',
        blocks: [
          {
            kind: 'zoom',
            frame: 'browser',
            media: img(`${OP}/screens/home-grid.webp`, 2400, 1700, 'The redesigned product grid with filters'),
            // The grid comes before the card inside it, so the card's region
            // sits on top and stays clickable.
            spots: [
              {
                x: 0.07, y: 0.145, w: 0.19, h: 0.555,
                title: 'Filters that count',
                note: 'Brand, diet, price and allergens. Every option shows how many products it leaves, and an ⓘ explains the group.',
              },
              {
                x: 0.315, y: 0.145, w: 0.61, h: 0.84,
                title: 'Twelve at a time',
                note: 'A page of twelve products instead of a 696-row table.',
              },
              {
                x: 0.535, y: 0.145, w: 0.19, h: 0.215,
                title: 'Price first',
                note: 'Price large, weight small, name below — and a round + that adds to the cart without leaving the grid.',
              },
              {
                x: 0.44, y: 0.055, w: 0.12, h: 0.08,
                title: 'One ornament',
                note: 'Oma’s tulip, hand-drawn, is the only decoration on the page.',
              },
            ],
          },
          {
            kind: 'media',
            frame: 'plain',
            media: img(`${OP}/screens/fat-menu.webp`, 2400, 546, 'The category bar with Supplies open'),
            caption: 'Nine broad categories, each opening into a short menu of its own.',
          },
        ],
      },
      {
        id: 'cart',
        label: 'Add to cart',
        title: 'The button becomes the stepper.',
        blocks: [
          {
            kind: 'compare',
            frame: 'plain',
            size: 'narrow',
            labels: ['Before', 'Added'],
            pairs: [
              {
                label: 'Buy',
                before: img(`${OP}/screens/buy-before.webp`, 1200, 232, 'The price and an Add to cart button'),
                after: img(`${OP}/screens/buy-after.webp`, 1200, 232, 'The price and a quantity stepper in the button’s place'),
              },
            ],
            caption: 'Once added, the button turns into a quantity stepper in place — no pop-up, no second step.',
          },
          {
            kind: 'media',
            frame: 'browser',
            media: img(`${OP}/screens/cart.webp`, 2400, 1334, 'The shopping cart with steppers and a summary card'),
            caption: 'In the cart, “−” becomes a bin at one item, so removing is the same gesture as reducing.',
          },
        ],
      },
      {
        id: 'flow',
        label: 'Checkout',
        title: 'Three steps, always in view.',
        lede: 'The steps at the top of checkout double as the way back, and the confirmation hands you straight back to the shop.',
        blocks: [
          {
            kind: 'flow',
            frame: 'plain',
            items: [
              { label: 'Browse', media: img(`${OP}/flow/home.webp`, 1000, 764, 'Home') },
              { label: 'Add', media: img(`${OP}/flow/item.webp`, 1000, 764, 'Product page with the stepper') },
              { label: 'Cart', media: img(`${OP}/flow/cart.webp`, 1000, 764, 'Shopping cart') },
              { label: 'Pay', media: img(`${OP}/flow/payment.webp`, 1000, 764, 'Payment with the progress steps') },
              { label: 'Done', media: img(`${OP}/flow/confirmation.webp`, 1000, 764, 'Order confirmation signed “With love, Oma”') },
            ],
          },
        ],
      },
      {
        id: 'tile',
        label: 'Style tile',
        title: 'Everything the shop is made of.',
        blocks: [
          {
            kind: 'tile',
            swatches: [
              { name: 'Pantry green', hex: '#073B3A' },
              { name: 'Clay', hex: '#C95600' },
              { name: 'Cream', hex: '#F9EAE1' },
              { name: 'Stone', hex: '#989898' },
              { name: 'Mist', hex: '#B5B5B5' },
            ],
            groups: [
              {
                label: 'Logo',
                wide: true,
                items: [{ media: img(`${OP}/tile/logos.webp`, 646, 500, 'The Oma’s Pantry logo on white, green and cream') }],
              },
              {
                label: 'Type',
                wide: true,
                items: [
                  { media: img(`${OP}/tile/title.webp`, 944, 172, 'Product title in Bona Nova'), caption: 'Bona Nova · titles' },
                  { media: img(`${OP}/tile/with-love.webp`, 580, 422, 'Signed With love, Oma'), caption: 'Script · sign-off' },
                ],
              },
              {
                label: 'Buttons',
                items: [
                  { media: img(`${OP}/tile/add-to-cart.webp`, 344, 112, 'Add to cart button') },
                  { media: img(`${OP}/tile/stepper.webp`, 344, 112, 'Quantity stepper') },
                ],
              },
              {
                label: 'Steppers',
                items: [
                  { media: img(`${OP}/tile/stepper-bin.webp`, 306, 84, 'Stepper with a bin at one item'), caption: 'one left: bin' },
                  { media: img(`${OP}/tile/stepper-minus.webp`, 306, 84, 'Stepper with a minus'), caption: 'more: minus' },
                ],
              },
              {
                label: 'Wayfinding',
                wide: true,
                items: [
                  { media: img(`${OP}/tile/breadcrumb.webp`, 1204, 108, 'Back link and breadcrumb') },
                  { media: img(`${OP}/tile/steps.webp`, 848, 84, 'Checkout progress steps') },
                ],
              },
              {
                label: 'Ornament',
                wide: true,
                items: [{ media: img(`${OP}/tile/divider.webp`, 754, 132, 'Tulip divider') }],
              },
              {
                label: 'Cards',
                wide: true,
                items: [
                  { media: img(`${OP}/tile/product-card.webp`, 452, 406, 'Product card') },
                  { media: img(`${OP}/tile/filter.webp`, 480, 338, 'Filter group') },
                ],
              },
              {
                label: 'Summary',
                wide: true,
                items: [{ media: img(`${OP}/tile/summary.webp`, 720, 524, 'Cart summary card with Proceed to payment') }],
              },
            ],
          },
        ],
      },
    ],
  },
];
