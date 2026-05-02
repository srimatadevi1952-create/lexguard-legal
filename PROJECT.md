# LexGuard Legal — Product Overview

## About

LexGuard Legal is a premium legal intelligence platform built for the Indian legal market by Para Systems AI (Srimatadevi Systems LLP). It serves solo advocates, boutique firms, large law firms, and corporate legal teams at price points from ₹15,000 to ₹75,000 per month. The platform brings AI-assisted contract analysis, compliance monitoring, M&A deal support, and execution workflows under a single, India-first interface.

LexGuard Legal is the premium tier of the LexGuard product line, stepping up from LexGuard Lite with deeper automation, multi-user firm management, custom clause libraries, and integrations with Indian-market tools such as the MCA21 portal, GST compliance systems, SEBI filings, and Leegality eSign. Every feature is designed around Indian law, Indian regulatory timelines, and Indian language requirements — including first-class Hindi/Devanagari support throughout the UI.

The platform is built on Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (auth, database, storage), and Anthropic Claude for AI capabilities. It is hosted on Vercel and targets a November 2026 launch after a 16-week build cycle.

---

## The Five Modules

### 1. Contract Intelligence
AI-powered contract review, redlining, clause extraction, risk scoring, and version comparison. Handles NDA, service agreements, vendor contracts, employment agreements, shareholder agreements, and custom templates. Outputs annotated PDFs with risk flags mapped to Indian legal standards.

### 2. Compliance Suite
Deadline-driven compliance calendar for RoC filings, GST returns, FEMA remittances, labour law returns, and sector-specific obligations. Automated reminders, compliance status dashboards, and AI-generated filing summaries. Supports Companies Act 2013, FEMA, GST, PF/ESI, and SEBI regulations.

### 3. M&A & Regulatory
Due diligence workflow management, regulatory approval tracking (CCI, SEBI, RBI), and deal-room document organisation. Tracks open conditions precedent, KYC/AML checklists, and regulatory filing timelines. Integrates MCA21 corporate data lookups.

### 4. Calendar
Unified legal calendar aggregating court dates, regulatory deadlines, contract renewal dates, and compliance milestones. Integrates with Compliance Suite. WhatsApp and email reminders via MSG91/Resend. Jurisdiction-aware holiday exclusions for Indian courts.

### 5. Execution
End-to-end document execution: generate execution-ready PDFs, route for internal approval, trigger Leegality eSign workflows, and archive signed originals to Supabase Storage. Tracks execution status across parties and supports conditional execution chains.

---

## The Forbidden List

This product is NOT:

- **A litigation or case management system** — that is the domain of Provakil and similar tools. LexGuard Legal does not track court hearings, manage briefs, or organise litigation strategy.
- **A legal research database** — that is Manupatra, SCC Online, and Indian Kanoon. LexGuard Legal does not provide bare-act search, case law retrieval, or citation databases.
- **A standalone eSign provider** — that is Leegality's job. We integrate with Leegality's API; we do not replicate its signing infrastructure.
- **A practice management or billing tool** — time-tracking, invoicing, and client billing are Year 2 features in a separate product roadmap.
- **A US or global legal tool** — LexGuard Legal is India-first. Every workflow, every regulatory reference, every default must reflect Indian law. US GAAP, Delaware corporate law, and English solicitor conventions are out of scope.

---

## Build Phases

### Phase 0 — Infrastructure & Foundation (Weeks 1–2)
Next.js 14 scaffold, Supabase auth, route protection middleware, app shell (sidebar, topbar, right rail), stub pages for all 8 destinations, Vercel deployment, GitHub repository. No product features, no database schema.

### Phase 1 — Contract Intelligence (Weeks 3–5)
Supabase schema for contracts and clauses. File upload to Supabase Storage. Claude-powered contract analysis API route. Risk scoring display. Clause extraction and clause library population. Redline diff view. PDF annotation export.

### Phase 2 — Compliance Suite (Weeks 6–8)
Compliance obligation database (RoC, GST, FEMA, labour, SEBI). Deadline engine with rolling calendar generation. Compliance dashboard with RAG status. Email and WhatsApp reminders (Resend + MSG91). Filing-status audit trail.

### Phase 3 — M&A & Regulatory (Weeks 9–11)
Deal room structure in Supabase. Due diligence checklist engine. Regulatory tracker (CCI/SEBI/RBI approval timelines). MCA21 API integration for corporate data. Conditions precedent tracker. AI-generated diligence summaries.

### Phase 4 — Calendar (Weeks 12–13)
Unified calendar aggregating data from Compliance Suite, Contracts, and M&A modules. Court holiday exclusions by jurisdiction. MSG91 WhatsApp notification integration. iCal export. Reminder escalation rules.

### Phase 5 — Execution (Weeks 14–15)
Execution checklist builder. Leegality API integration for eSign routing. Multi-party signing workflow. Signed document archiving in Supabase Storage. Execution status dashboard. Conditional execution chains.

### Phase 6 — QA, Hardening & Launch (Week 16)
End-to-end testing across all modules. Performance optimisation. Security audit (RLS policies, API key hygiene, input validation). Onboarding flow. Admin panel for firm management. Soft launch to design partners.
