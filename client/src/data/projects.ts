export interface Project {
  id: string;
  repoUrl: string;
  imageId: string;
  imageSrc?: string;   // only PlanPal has one (planpal-thumb.png); all others are undefined -> ImageSlot placeholder
  imagePlaceholder: string;
  rank: 'S' | 'A';
  title: string;
  status: 'complete' | 'in-progress';
  statusLabel: string; // '✓ QUEST COMPLETE' or '◆ IN PROGRESS'
  meta: string;        // e.g. 'VIA EXTERN · JAN–MAR 2026 · REMOTE'
  bullets: string[];
  loot: string[];
}

export const PROJECTS: Project[] = [
  { id: 'pfizer', repoUrl: 'https://github.com/jelo-ca/pharma_rag', imageId: 'proj-pfizer', imagePlaceholder: 'screenshot: pipeline / demo', rank: 'S', title: 'AI/ML Extern — Pfizer', status: 'complete', statusLabel: '✓ QUEST COMPLETE', meta: 'VIA EXTERN · JAN–MAR 2026 · REMOTE', bullets: [
    'Document pipeline extracting structured data from scanned pharma PDFs with Tesseract, PaddleOCR, and frontier LLMs.',
    'Multi-agent RAG system with LlamaIndex for semantic search over unstructured regulatory documents.',
    'Regression harness — 20+ factual-retrieval and hallucination queries across 500+ documents.' ], loot: ['PYTHON', 'LLAMAINDEX', 'TESSERACT', 'PADDLEOCR'] },
  { id: 'scheduler', repoUrl: 'https://github.com/jelo-ca/agentic-task-scheduler', imageId: 'proj-scheduler', imageSrc: '/sprites/planpal-thumb.png', imagePlaceholder: 'screenshot: PlanPal', rank: 'S', title: 'PlanPal', status: 'complete', statusLabel: '✓ QUEST COMPLETE', meta: 'CODEPATH · SPRING 2026', bullets: [
    'AI-assisted scheduler converting natural-language requests into structured, confidence-scored tasks through a multi-agent Gemini pipeline (Parser → Temporal → Normalization → Validation).',
    'RAG chatbot grounded in live task context, answering scheduling questions via Gemini 2.0 Flash with a FastAPI backend and Streamlit UI.',
    'Built a 3-tier evaluation harness (baseline vs. few-shot, adversarial robustness, context sensitivity) — few-shot prompting scored 96.7% vs. 88.3% baseline across 12 test cases.' ], loot: ['PYTHON', 'FASTAPI', 'GEMINI', 'RAG'] },
  { id: 'studyguild', repoUrl: 'https://github.com/jelo-ca/study-guild', imageId: 'proj-studyguild', imagePlaceholder: 'screenshot: Study Guild', rank: 'A', title: 'Study Guild', status: 'in-progress', statusLabel: '◆ IN PROGRESS', meta: 'PERSONAL · DEC 2025 – PRESENT', bullets: [
    'Gamified multi-agent AI study tool generating in-scope study guides and quizzes from class modules and notes.',
    'Database design that lets collected modules improve AI-generated quiz specialization per user.' ], loot: ['REACT', 'RAG', 'SUPABASE'] },
  { id: 'scantry', repoUrl: 'https://github.com/jelo-ca/scantry', imageId: 'proj-scantry', imagePlaceholder: 'screenshot: Scantry', rank: 'A', title: 'Scantry', status: 'in-progress', statusLabel: '◆ IN PROGRESS', meta: 'HACK YOUR SUMMER · JUL 2026 – PRESENT', bullets: [
    'Building a grocery inventory tracking system using Raspberry Pi and open-source Grocy.' ], loot: ['RASPBERRY PI', 'GROCY'] },
];
