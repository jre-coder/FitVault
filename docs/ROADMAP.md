# FitVault — Product Roadmap & Execution Plan

> Living document. Update as phases complete or priorities shift.

---

## Product Vision

FitVault is not a workout saver. It is a **personalized workout intelligence system** — a 1-minute AI coach that diagnoses, fixes, and adapts your training so you spend less time thinking and more time getting results.

**Core loop:**
1. Save or speak content
2. System converts to structured workout
3. AI decides what to do + what to fix
4. User executes
5. System learns and improves

**Real moat:** Personalized progression + decision-making — not storing videos, not AI parsing. The system *adapts workouts over time, learns user behavior, reduces friction, and delivers results.*

---

## Critical Product Principles (Non-Negotiable)

- **Zero-friction start** — No heavy onboarding. Users start immediately.
- **Progressive data collection** — Ask for info only when it improves the experience. Never nag.
- **Execution-first design** — Gym experience must be fast and clean.
- **Intelligence over volume** — Fewer, better recommendations.
- **Don't give away the engine for free** — Show the problem, hint at the solution, then stop.
- **Adapt over time** — As a user learns a workout, reduce prompts. The system should learn how much guidance each person needs.

---

## Freemium Model

### Free Tier (hook — not satisfy)
- Save workout links manually
- Build workouts manually
- Weekly planner (static, repeating)
- Execution mode: timer + set/rep logging
- **1–3 lifetime "Fix My Workout" previews** — show what's wrong, lock the fix behind paywall

### Paid Tier — $9–15/month (intelligence)
- Unlimited "Fix My Workout" (voice → diagnosis → optimized plan)
- Progression engine (auto-adjusts weights, reps, duration over time)
- "What should I do today?" decision engine
- Smart AI recommendations (exercise swaps, video suggestions)
- Personalization (injuries, age, goals, body feedback)
- Multi-week adaptive plans with variability
- Workout quality analysis (video comment sentiment, safety scoring)
- Advanced AI parsing (video/image → structured workout)

### Cost Control
- Cache identical AI inputs aggressively — same input reuses result
- Free users: lighter model, shorter outputs
- Paid users: deeper model, full analysis
- Run heavy AI (video analysis, comment scraping) only on explicit user request

### Conversion Trigger (the paywall moment)
User speaks workout → AI shows:
- ❌ "You're repeating the same movement pattern"
- ❌ "You're missing stretch-based loading"
- 🔒 *"Unlock your optimized workout plan"*

That moment of seeing the problem clearly but not the fix — that is the conversion.

---

## Immediate Fixes (Blocking — Do First)

- [x] **AI links not returning specific workouts** — AI now returns creator handles and links directly to channel/profile pages (`youtube.com/@handle`, `instagram.com/handle/`, `tiktok.com/@handle`); falls back to Google site-search when handle is unknown
- [x] **TikTok links going to YouTube** — stale closure bug in `handleFind` fixed (selectedPlatforms added to dep array)
- [x] **Platform enforcement** — Claude's returned platform is validated against user's selection post-response; mismatched platforms are overridden and handles cleared to prevent wrong-platform URLs
- [x] **Search URL quality** — creator name included in all search queries; TikTok falls back to `google.com/search?q=site:tiktok.com+...` for better results
- [x] **Share sheet integration** — iOS Share Extension (`FitVaultShareExtension`) reads incoming URLs, detects platform, lets user tag body parts, writes to App Group shared defaults; main app polls on foreground via `usePendingShareItems`
- [x] **Image import with OCR** — multi-photo import via `PhotoImportModal`; Claude Vision parses screenshots/photos into structured workout data (title, exercises, sets/reps/weight)

---

## Phase 1 — Make It Usable + Sticky (MVP)

**Goal:** A user can save a workout and actually do it.

- [x] Save link from any platform (YouTube, IG, TikTok) with Share Extension
- [x] Multi-image import: take photos of workout content → AI Vision → structured workout
- [x] AI parses link/image into structured workout (title, exercises, sets/reps/duration, muscle groups)
- [x] Manual edit of parsed workout (`EditWorkoutModal`)
- [x] Simple workout builder (non-AI, free tier — `AddWorkoutModal`)
- [x] Execution mode:
  - [x] Integrated timer (exercise duration + rest periods)
  - [x] Set/rep logging
  - [x] Rest timer between sets
  - [x] "Next exercise" flow
- [x] Content creator shown on all AI results
- [x] Gym machine entry via photo (identify machine → pre-fill sets/weight)

---

## Phase 2 — Structure + Routines (Free Tier Backbone)

**Goal:** Users can build and follow consistent weekly plans.

- [x] Weekly workout planner (non-AI, free tier — weekly grid in Plan tab, routines repeat)
- [x] Workout split templates:
  - [x] Push / Pull / Legs
  - [x] Back + Biceps / Chest + Triceps / Legs + Shoulders (bro split)
  - [x] Upper / Lower
  - [x] Full Body
  - [x] Custom (user-defined)
- [x] Body part category organization (Browse tab — cards by muscle group)
- [x] Workout series detection — title pattern matching (Part N, Day N, Week N, Episode N, Vol N, N/M); offers to group into a series on save
- [x] Multi-part workout support — series groups ordered WorkoutItems; "Start Series" in WorkoutDetailModal chains all parts in WorkoutExecutionModal
- [x] User profile basics:
  - [x] Age
  - [x] Fitness level
  - [x] Sensitive areas / injury history (hips, knees, shoulders, lower back, etc.)
  - [x] Goals (fat loss, muscle growth, endurance, specific areas)

---

## Phase 3 — Intelligence Engine (Core Paid Feature)

**Goal:** The system tells users what to do and fixes what's wrong.

### "Fix My Workout" (Voice-to-Coach)
- [x] Voice input (iOS Speech-to-Text)
- [x] Raw transcript → structured workout JSON (LLM)
- [x] Diagnosis engine (rules + AI hybrid):
  - [x] Detect redundant movement patterns
  - [x] Identify missing elements (stretch-loaded, heavy compound, tempo, etc.)
  - [x] Flag progressive overload gaps
  - [x] Flag joint/injury risk by age and stated sensitive areas
- [x] Output:
  - [x] Clear list of issues
  - [x] Optimized workout plan
  - [x] Specific exercise swaps with reasoning
  - [x] Video suggestions for recommended exercises
- [x] One-tap "Start this workout" from the output
- [x] Paywall: free users see issues only; fix requires upgrade

### "What Should I Do Today?" Engine
- [x] Looks at: last workout, muscle recovery, goals, available equipment, time available
- [x] Returns: today's recommended workout (with execution mode ready)

### Progression Engine
- [x] Track weights, reps, duration per exercise over time
- [x] Auto-suggest progression (heavier weight, more reps, shorter rest)
- [x] Account for: fitness level, age, injury flags
- [x] Show user their actual progress visually

---

## Phase 3.5 — Set Recording & Analysis (On-Device, Privacy-First)

**Goal:** After a set, the user can see objective metrics — rep count and tempo — without any form diagnosis that creates liability.

**Privacy principle:** Video is analyzed entirely on-device using Apple Vision. It is never stored, never uploaded, and deleted immediately after analysis. Users must explicitly consent before each recording session.

**Liability boundary:** FitVault reports objective facts (rep count, seconds per rep). It never says form is wrong or that the user will get hurt. Observations that suggest a gap route to educational content, not direct advice.

### Phase 3.5a — Post-Set Analysis (current)
- [x] Custom native Expo module (`ExpoSetAnalyzer`) wrapping Apple Vision `VNDetectHumanBodyPoseRequest`
- [x] Sample video at 10 fps, track primary joint angle, count rep cycles, measure tempo
- [x] `setAnalysisService.ts` — interprets raw data, builds liability-safe insight copy
- [x] `SetRecordingModal.tsx` — consent → record → 2-3s on-device processing → results card
- [x] "Record this set" entry in `WorkoutExecutionModal`
- [x] Content routing: fast tempo → surfaces tempo-focused workout content

### Phase 3.5b — Real-Time Feedback (future)
- [ ] Live frame processing on background thread while recording (Vision Camera frame processor)
- [ ] Real-time rep counter displayed mid-set
- [ ] Voice cue after set completes: "4 reps at 1.8 seconds — want tempo training content?"
- [ ] Configurable: users can turn off voice cues

---

## Phase 4 — Advanced AI (Wow Factor)

**Goal:** Recommendations that feel like a smart personal trainer reviewed everything.

- [ ] YouTube video deep analysis:
  - [ ] Pull captions/transcript via YouTube API
  - [ ] AI summary of exactly what the workout contains
  - [ ] AI quality score with reasoning
  - [ ] Suggestions for improvement based on content
- [ ] Comment sentiment analysis:
  - [ ] Scrape top comments
  - [ ] Score positive vs negative feedback
  - [ ] Extract useful improvement suggestions from comments
  - [ ] Factor into recommendation ranking (popularity ≠ quality)
- [x] Safety scoring:
  - [x] Identify high joint-risk exercises
  - [x] Age-appropriate filtering
  - [x] Injury flag filtering (per user profile)
  - [x] Flag exercises that are popular but potentially harmful for certain profiles
- [x] Workout adaptation intelligence:
  - [x] System learns how much guidance a user needs (reduces prompts as they learn a routine)
  - [x] Detects plateau patterns and triggers recommendations

---

## Phase 5 — Personalization Engine

**Goal:** The system knows you and tailors everything to you specifically.

- [ ] Extended user profile (collected progressively, never forced):
  - [ ] Height, weight, sex
  - [ ] Age
  - [ ] Injury history / sensitive joints
  - [ ] Body goals (specific areas — glutes, arms, belly fat, etc.)
  - [ ] Optional physique photos for visual progression tracking
  - [ ] Verbal goal input ("I want bigger biceps but I feel like I'm not progressing")
- [ ] AI body analysis (optional):
  - [ ] Accept physique photos
  - [ ] Identify areas to focus on
  - [ ] Track visual changes over time
  - [ ] Combine with stated goals for hyper-personalized plans
- [ ] Multi-week adaptive plans:
  - [ ] Generate 4–12 week programs
  - [ ] Built-in variability (paid feature)
  - [ ] Progression baked in week over week
  - [ ] Adjust based on feedback and actual performance

---

## Phase 6 — Integrations + Environment Intelligence

**Goal:** The app knows your environment and adjusts automatically.

### Wearable + Health Integration
- [ ] Apple Health (height, weight, resting HR, activity)
- [ ] Apple Watch (real-time heart rate during workout)
- [ ] MyZone / other heart rate monitors
- [ ] Use heart rate to measure actual exertion level
- [ ] AI adjusts progression based on exertion data (not just reps logged)

### Environment / Rules Engine
- [ ] Travel mode:
  - [ ] Hotel gym: pull available equipment, tailor workout
  - [ ] No gym / bodyweight only fallback
  - [ ] Airport: step/movement suggestions during layover
- [ ] Location-aware workout suggestions (home vs gym vs outdoor vs travel)
- [ ] Rules engine (user-configurable):
  - [ ] "On weekday mornings I have 30 min and only bodyweight"
  - [ ] "When traveling, assume bodyweight only unless I say otherwise"
  - [ ] Schedule-based workout reminders
  - [ ] Proactive alarm suggestions ("Want me to set a 6am alarm for your leg day?")

### Phone Interruption Handling
- [ ] User-configurable interrupt rules:
  - [ ] Block all calls during workout
  - [ ] Allow specific contacts
  - [ ] Auto-reply options
  - [ ] Spam/unknown = always blocked
- [ ] Pause/resume workout on interruption

### Music Integration
- [ ] Volume ducking: lower music when voice cues play
- [ ] Mix control between music and workout audio/instructor
- [ ] Integration with Apple Music / Spotify

---

## Phase 7 — Social + Creator Ecosystem

**Goal:** Mutual benefit relationships that grow the user base organically.

- [ ] Creator partnerships:
  - [ ] FitVault promotes their content → they promote FitVault
  - [ ] Verified creator profiles in-app
  - [ ] Revenue share or referral model with top creators
- [ ] In-app personal training marketplace:
  - [ ] Users can book specialized help from vetted trainers
  - [ ] Trainers can create and sell programs through the app
- [ ] Social sharing:
  - [ ] Share workout completions
  - [ ] Share programs you've built
- [ ] Community features (future):
  - [ ] Follow creators
  - [ ] Follow other users
  - [ ] Workout challenges

---

## Future Considerations

### Specific Video Links via Platform APIs

**Context:** The current AI recommendation flow links users to creator profile pages (e.g. `youtube.com/@jeffnippard`) rather than specific workout videos. This is the best a standalone LLM can do — no model tier (Haiku, Sonnet, or Opus) can return reliable direct video URLs because they lack real-time internet access and video URLs change.

**The real solution** is a two-step architecture:
1. Claude picks the best creators and workout types for the user's goal
2. A backend service calls platform search APIs to return specific video links with thumbnails and view counts

**Platform API landscape:**
- **YouTube Data API v3** — free up to 10,000 queries/day; returns direct video links, thumbnails, titles, view counts. Most viable for V1.
- **TikTok Research API** — restricted; requires business approval. Low priority.
- **Instagram Graph API** — similarly restricted. Low priority.

**Architecture requirement:** API keys cannot live in the mobile app (exposed in the bundle). Requires a lightweight backend proxy (Cloudflare Worker, Vercel Edge Function, or full backend). This is also the natural gate for the premium subscription tier — free users get creator profile links, paid users get specific video results.

**UI approach:** Surface as a user-configurable "Search Mode" toggle on Discover and For You screens:
- **Creator Browse** (default, free) — links to creator channel/profile
- **Find Videos** (enhanced, paid) — returns specific videos via YouTube API

This feature is architecturally dependent on the backend proxy work and should be built alongside or after the subscription infrastructure.

---

## Architecture (Target State)

```
1. Ingestion Service
   - Share Extension (iOS) — receive links from any app
   - Image import (multi-photo) + OCR (Apple Vision)
   - YouTube transcript/caption pull

2. AI Processing Layer
   - OCR text → structured data
   - Transcript → workout structure
   - LLM: clean, structure, summarize, evaluate, diagnose

3. Workout Engine (most important)
   - Structured workout storage
   - Splits, scheduling, progression logic
   - Exercise library + normalization

4. Recommendation Engine
   - "What today?" decision logic
   - Progression suggestions
   - Personalization layer

5. Execution Engine
   - Timer (exercise + rest)
   - Set/rep/weight logging
   - Adaptive guidance (reduce prompts as user learns routine)
   - Heart rate integration

6. Context Engine (Phase 6)
   - Location awareness
   - Schedule / rules
   - Device integrations (Watch, Health, music)
   - Interruption handling
```

---

## Key Differentiator (Say This Clearly)

> Most apps track workouts. FitVault *fixes* them.

Users don't pay for features. They pay when they see a clear gap between where they are and where they could be. FitVault creates that gap — then closes it.
