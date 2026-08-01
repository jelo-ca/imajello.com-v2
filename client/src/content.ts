import raw from './content.json';

export type SectionKey = 'journey' | 'quests' | 'experience' | 'hobbies' | 'contact';

export interface CharStat { name: string; mod: string; w: string; }
export interface Char { src: string; name: string; cls: string; stats: CharStat[]; }

export interface JourneyStop {
  id: string;
  worldLabel: string;
  statusLabel: string;
  current: boolean;
  title: string;
  body: string;
}

export interface Job { dateRange: string; title: string; org: string; bullets: string[]; skills?: string[]; }
export interface Achievement { icon: string; title: string; desc: string; }
export interface EducationEntry { title: string; meta: string; }
export interface TimelineBar {
  tag?: string;
  title: string;
  titleSize: number;
  org?: string;
  top: number; left: number; width: number; height: number;
  padding: string;
  variant: 'education-pink' | 'education-uci' | 'main' | 'side';
}

export interface Discovery { key: string; name: string; how: string; }

export interface InvPhoto { id: string; placeholder: string; }
export interface InvItem { key: string; icon: string; tag: string; label: string; desc: string; photos: InvPhoto[]; }

export interface Project {
  id: string;
  repoUrl: string;
  imageId: string;
  imageSrc?: string;
  imagePlaceholder: string;
  rank: 'S' | 'A';
  title: string;
  status: 'complete' | 'in-progress';
  statusLabel: string;
  meta: string;
  bullets: string[];
  loot: string[];
}

export interface SectionCopy { navLabel: string; navSublabel: string; dialogTitle: string; dialogSub: string; }

export interface PlatformRectSpec { top: number; left: number; width: number; height: number; }

export interface LevelSpec {
  girders: PlatformRectSpec[];
  ladders: PlatformRectSpec[];
  goal: PlatformRectSpec;
  barrelSpawn: { top: number; left: number };
}

export interface ContentShape {
  meta: { pageTitle: string };
  chars: Char[];
  journey: JourneyStop[];
  familiar: {
    animals: string[];
    food: string[];
    greetings: Record<string, string>;
    fallbackGreeting: string;
  };
  quests: {
    main: Job[];
    side: Job[];
    achievements: Achievement[];
    education: EducationEntry[];
    timelineBars: TimelineBar[];
  };
  discoveries: {
    items: Discovery[];
    chatQuestionLimit: number;
    konami: string[];
    sectionOpenedToast: Record<SectionKey, string>;
    sectionToDiscovery: Record<SectionKey, string>;
  };
  invItems: {
    items: InvItem[];
    gridSize: number;
    filledPositions: number[];
  };
  projects: Project[];
  ui: {
    sections: Record<SectionKey, SectionCopy>;
    misc: { escHint: string; closeGlyph: string };
    topBar: { resume: string; github: string; linkedin: string; sfxOn: string; sfxOff: string; linksMenuAriaLabel: string; hamburgerGlyph: string };
    keybinds: { heading: string; changeCharacter: string; summonFamiliar: string; close: string; move: string; climb: string; jump: string; stopPlaying: string; startGame: string };
    playerBar: { playerPlate: string; level: string; hp: string; en: string; konamiHint: string; konamiUnlocked: string; xpMaxLabel: string; familiarLabel: string };
    hero: {
      name: { first: string; nickname: string; lastPre: string; lastAccent: string; lastPost: string };
      eyebrow: string;
      nameToggleAriaLabel: string;
      statsLabel: string;
      prevAriaLabel: string;
      nextAriaLabel: string;
      startBtn: string;
    };
    battleLog: { repoLink: string; rankPrefix: string; lootLabel: string };
    worldMap: { photoPrefix: string };
    inventory: { hint: string; back: string; itemPrefix: string };
    questLog: {
      tabs: { main: string; side: string; timeline: string };
      mobileSelectAriaLabel: string;
      mainIntro: string;
      sideIntro: string;
      sideTag: string;
      skillsLabel: string;
      achievementsHeading: string;
      achievementsTag: string;
      educationLabel: string;
    };
    timeline: {
      intro: string;
      futureLabel: string;
      legend: { main: string; side: string; eduPink: string; eduUci: string };
      yearLabels: Array<{ top: number; text: string; now?: boolean }>;
    };
    contact: {
      continueTag: string;
      headingPrefix: string;
      headingAccent: string;
      intro: string;
      links: { email: string; github: string; linkedin: string; resume: string };
      statusHeading: string;
      status: Array<{ label: string; value: string }>;
      formLabel: string;
      placeholders: { name: string; email: string; message: string };
      sendBtn: string;
      finePrint: string;
      footer: string;
      mailto: { subjectPrefix: string; subjectFallback: string; signaturePrefix: string };
    };
    familiarChat: {
      sleepingPlaceholder: string;
      outOfQuestionsPlaceholder: string;
      defaultPlaceholder: string;
      sleepingLabel: string;
      questionsLeftSuffix: string;
      questionSingular: string;
      questionPlural: string;
      panelHeader: string;
      sleepBannerPrefix: string;
      sleepBannerSuffix: string;
      sendBtn: string;
      chatPrefixes: { familiar: string; you: string };
      errors: { requestFailed: string; malformedResponse: string; noCredits: string };
    };
    discoveryPanel: { triggerIcon: string; triggerLabel: string; intro: string; foundLabel: string; undiscoveredLabel: string; hiddenPlaceholder: string };
    imageSlot: { comingSoon: string };
    toast: { discoveredLabel: string; levelUp: string };
    rotateNotice: { glyph: string; heading: string; text: string };
    mobileNotice: { text: string; dismissAriaLabel: string };
    dialogHost: { closeGlyph: string };
    platformer: {
      maxLives: number;
      goalGlyph: string;
      banners: { win: string; gameOver: string; lifeSingular: string; lifePlural: string; tryAgain: string };
      level: LevelSpec;
      levelMobile: LevelSpec;
      controls: {
        leftGlyph: string; rightGlyph: string; upGlyph: string; downGlyph: string; jumpGlyph: string;
        leftAriaLabel: string; rightAriaLabel: string; upAriaLabel: string; downAriaLabel: string; jumpAriaLabel: string;
      };
    };
  };
}

export const content = raw as ContentShape;
export const ui = content.ui;
