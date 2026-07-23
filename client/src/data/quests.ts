export interface Job { dateRange: string; title: string; org: string; bullets: string[]; skills?: string[]; }
export interface Achievement { icon: string; title: string; desc: string; }
export interface EducationEntry { title: string; meta: string; }
export interface TimelineBar {
  label: string;
  sublabel?: string;
  top: number; left: number; width: number; height: number;
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

// Pixel positions ported verbatim from reference lines 614-651 (px values are exact, do not recompute).
export const TIMELINE_BARS: TimelineBar[] = [
  { label: 'EDUCATION', sublabel: 'AS-T CS', top: 184, left: 14, width: 118, height: 532, variant: 'education-pink' },
  { label: 'UC Irvine · Sept 2026 →', top: 44, left: 14, width: 118, height: 46, variant: 'education-uci' },
  { label: 'MAIN', sublabel: 'SWE Intern · Unimode AI', top: 128, left: 138, width: 84, height: 224, variant: 'main' },
  { label: 'Pfizer Extern', top: 184, left: 228, width: 74, height: 28, variant: 'main' },
  { label: 'SIDE', sublabel: 'PlanPal', top: 227, left: 228, width: 74, height: 42, variant: 'side' },
  { label: 'SIDE', sublabel: 'STEM Teacher · Young Gates', top: 184, left: 308, width: 88, height: 294, variant: 'side' },
  { label: 'SIDE', sublabel: 'STEM TA', top: 184, left: 402, width: 88, height: 84, variant: 'side' },
  { label: 'SIDE', sublabel: 'STEM Tutor', top: 142, left: 496, width: 88, height: 56, variant: 'side' },
  { label: 'SIDE', sublabel: 'Asst. Restaurant Manager · Country Gourmet', top: 478, left: 308, width: 88, height: 448, variant: 'side' },
];
