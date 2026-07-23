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

export const MAIN_QUESTS: Job[] = [
  { dateRange: 'MAR 2025 – PRESENT', title: 'Software Engineering Intern', org: 'Unimode AI · Fremont, CA', bullets: [
    'Semantic search API over 1.3M+ indexed records — cut p95 latency from 700ms to 200ms.',
    'Automated onboarding pipeline — demo setup from ~3 days to under 4 hours.',
    'Multi-agent adapter normalizing client schemas — hours of manual mapping to seconds.' ] },
  { dateRange: 'JAN – MAR 2026', title: 'AI/ML Extern', org: 'Pfizer · Remote', bullets: [
    'Document pipeline extracting structured data from scanned pharma PDFs with Tesseract, PaddleOCR, and frontier LLMs.',
    'Multi-agent RAG system with LlamaIndex for semantic search over unstructured regulatory documents.',
    'Regression harness — 20+ factual-retrieval and hallucination queries across 500+ documents.' ] },
];

export const SIDE_QUESTS: Job[] = [
  { dateRange: 'OCT 2021 – JUN 2024', title: 'Assistant Restaurant Manager — Country Gourmet American Bistro', org: 'Food Service · Sunnyvale, CA', bullets: [
    'Managed and trained a front service team of 9, resolving customer conflicts to raise overall service quality.',
    'Oversaw technical operations to streamline daily processes, keeping the team efficient without burning out.' ], skills: ['TEAM LEADERSHIP', 'GRACE UNDER FIRE'] },
  { dateRange: 'SEP 2025 – MAR 2026', title: 'STEM Teaching Assistant', org: 'De Anza College · Cupertino, CA', bullets: [
    'Tutored 30+ students per term in calculus, linear algebra, and physics.' ] },
  { dateRange: 'JUN 2024 – MAR 2026', title: 'STEM Teacher', org: 'Young Gates · Milpitas, CA', bullets: [
    'Delivered 20+ hands-on workshops in programming, game dev, drones, and 3D design.' ] },
  { dateRange: 'FEB 2026 – JUN 2026', title: 'STEM Tutor', org: 'MESA De Anza · Cupertino, CA', bullets: [
    'Embedded in-class tutor, working alongside instructors on real-time problem-solving; mentored underrepresented students in STEM.' ] },
];

export const ACHIEVEMENTS: Achievement[] = [
  { icon: '🏆 GUILD MASTER', title: 'Club President, Game Dev Club', desc: 'Grew from 5 founding members to an online community of 200+.' },
  { icon: '🏆 JAM DIRECTOR ×2', title: 'Two annual game jams', desc: '145 → 300 participants, 69 submissions, 4 industry sponsors.' },
  { icon: '🏆 EXPO FOUNDER', title: 'Co-Founder & Director, De Anza Expo', desc: 'Built a student tech showcase from scratch — logistics, sponsors, and a funding plan for the long haul.' },
  { icon: '🏆 SCHOLAR', title: 'AS-T CS · GPA 3.74', desc: 'De Anza College, March 2026 — Magna Cum Laude in CS and Math. C++, data structures, x86 assembly, SQL.' },
];

export const EDUCATION: EducationEntry[] = [
  { title: 'UC Irvine — B.S. Computer Science', meta: '2026 – Present · Irvine, CA' },
  { title: 'De Anza College — AS-T Computer Science', meta: 'GPA 3.74 · March 2026 · Cupertino, CA' },
];

// Pixel positions, padding, and text roles ported verbatim from reference lines 614-651.
export const TIMELINE_BARS: TimelineBar[] = [
  { tag: 'EDUCATION', title: 'AS-T CS', titleSize: 11, org: 'De Anza College', top: 184, left: 14, width: 118, height: 532, padding: '8px', variant: 'education-pink' },
  { title: 'UC Irvine · Sept 2026 →', titleSize: 9, top: 44, left: 14, width: 118, height: 46, padding: '0 8px', variant: 'education-uci' },
  { tag: 'MAIN', title: 'SWE Intern', titleSize: 10, org: 'Unimode AI', top: 128, left: 138, width: 84, height: 224, padding: '8px 6px', variant: 'main' },
  { title: 'Pfizer Extern', titleSize: 9.5, top: 184, left: 228, width: 74, height: 28, padding: '2px 6px', variant: 'main' },
  { tag: 'SIDE', title: 'PlanPal', titleSize: 9.5, top: 227, left: 228, width: 74, height: 42, padding: '4px 6px', variant: 'side' },
  { tag: 'SIDE', title: 'STEM Teacher', titleSize: 11, org: 'Young Gates', top: 184, left: 308, width: 88, height: 294, padding: '8px', variant: 'side' },
  { tag: 'SIDE', title: 'STEM TA', titleSize: 10.5, top: 184, left: 402, width: 88, height: 84, padding: '6px 8px', variant: 'side' },
  { tag: 'SIDE', title: 'STEM Tutor', titleSize: 10, top: 142, left: 496, width: 88, height: 56, padding: '5px 8px', variant: 'side' },
  { tag: 'SIDE', title: 'Asst. Restaurant Manager', titleSize: 11, org: 'Country Gourmet', top: 478, left: 308, width: 88, height: 448, padding: '8px', variant: 'side' },
];
