# FitVault — Agent Instructions

## What This App Does

FitVault is a cross-platform mobile app (React Native + Expo + TypeScript) that lets users save, organize, discover, and execute workout content from external sources (YouTube, Instagram, TikTok, websites) and photos.

Core features:
- **My Workouts** — save and manage workout links/photos, tagged by body part and source
- **Browse** — filter saved workouts by category; view safety flags and series membership per workout
- **Discover** — AI-powered suggestions for top workouts by body part (premium)
- **Plan** — build routines from saved workouts, schedule them on a weekly grid, execute guided workout sessions with timers and set logging
- **Activity** — streak tracker, weekly stats, and full session history
- **For You** — personalized AI recommendations based on user goals, fitness level, equipment, and duration (premium)
- **Fix My Workout** — voice-to-coach: speak a workout, get AI diagnosis of issues (redundant patterns, missing elements, overload gaps, injury risk), receive an optimized plan with exercise swaps and video suggestions (premium)
- **What Should I Do Today?** — decision engine that considers last workout, recovery, goals, equipment, and time available; returns a ready-to-execute recommendation
- **Progression Engine** — tracks weights/reps/duration per exercise over time; auto-suggests next session targets; shows progress in WorkoutDetailModal
- **Safety Scoring** — flags high-risk exercises per user profile (sensitive areas, age, universal risk rules); shown in WorkoutDetailModal
- **Workout Adaptation** — reduces UI guidance as user masters an exercise (full → reduced → minimal); detects plateaus and surfaces a nudge during execution
- **Set Recording & Analysis** — post-set video recording analyzed entirely on-device via Apple Vision (rep count, tempo); never stored or uploaded
- **Workout Series** — groups multi-part workouts (Part N / Day N / Week N patterns); "Start Series" chains all parts in WorkoutExecutionModal
- **Gym Machine Scan** — identify a machine from a photo → pre-fill exercise name, sets, weight
- **Split Templates** — Push/Pull/Legs, Upper/Lower, Full Body, Bro Split, Custom; generates a ready-to-use routine

AI features are powered by the Claude API (`mobile/services/claudeService.ts`, `mobile/services/photoAnalysisService.ts`). Subscriptions gate premium features — currently mocked, ready for `react-native-iap` or RevenueCat wiring (`mobile/context/SubscriptionContext.tsx`).

---

## Current Priorities

### ✅ AI Caching Layer (complete — proxy requires deployment to activate)

An audit of all Claude API calls found **zero caching** at any layer. The following fixes have been applied or are still pending.

**Status by item:**

#### 1. ✅ Discover Tab — `fetchTopWorkouts` / `fetchSimilarWorkouts`
- **Implemented:** Results cached in AsyncStorage via `aiResultCache.ts`, keyed on a stable hash of `{bodyPart, platforms, workoutTypes}` (for top workouts) or `{workoutId, platforms, workoutTypes}` (for similar workouts). TTL: 24 hours.
- **Estimated savings:** 80–95% reduction in Discover API calls for active users.

#### 2. ✅ For You Tab — `fetchRecommendations`
- **Implemented:** Results cached in AsyncStorage via `aiResultCache.ts`, keyed on a stable hash of all profile params `{goals, fitnessLevel, equipment, durationMinutes, platforms, workoutTypes}`. TTL: 7 days. Invalidates automatically when any profile field changes.
- **Estimated savings:** Eliminates redundant calls for users who don't change their profile between sessions.

#### 3. Photo Analysis — `analyzeWorkoutPhotos`
- **Gap:** Most expensive call (image tokens). If a user imports the same photo twice (re-picks, re-opens, upgrades after picking), it re-analyzes.
- **Fix needed:** For the import flow: cache in-memory within the modal session so upgrade → auto-analysis doesn't re-send images already analyzed. Long-term: hash image content and cache to AsyncStorage.
- **Estimated savings:** Eliminates duplicate calls on the same image content.

#### 4. ✅ Claude API Prompt Caching (all calls)
- **Implemented:** `cache_control: { type: "ephemeral" }` added to the `system` block in both `claudeService.ts` and `photoAnalysisService.ts`. System prompts expanded to exceed the 2048-token Haiku minimum. `anthropic-beta: prompt-caching-2024-07-31` header added to all requests.
- **Estimated savings:** 90% token cost reduction on the system prompt portion of every call.

#### 5. ✅ Backend Proxy (code complete — requires deployment to activate)
- **Implemented:** Supabase Edge Function at `supabase/functions/claude-proxy/index.ts`. Both `claudeService.ts` and `photoAnalysisService.ts` read `EXPO_PUBLIC_PROXY_URL` at call time — when set, requests route to the proxy without the API key; when unset, direct API calls continue (for local dev). The proxy injects the real `CLAUDE_API_KEY` from its Supabase secret.
- **To activate before App Store release:**
  1. `supabase login && supabase link --project-ref <your-ref>`
  2. `supabase secrets set CLAUDE_API_KEY=sk-ant-...`
  3. `supabase functions deploy claude-proxy`
  4. Set `EXPO_PUBLIC_PROXY_URL=https://<project>.supabase.co/functions/v1/claude-proxy` in EAS build secrets (preview + production profiles only — leave unset for local dev)
  5. Remove `EXPO_PUBLIC_CLAUDE_API_KEY` from production build config
- **Deno tests:** `deno test --allow-env supabase/functions/claude-proxy/index.test.ts`

**All AI caching items complete. ✅**

---

## Do NOT Touch

- **`mobile/.env` / `mobile/.env.local`** — never commit; contains real API keys
- **`mobile/android/` / `mobile/ios/`** — generated by `expo prebuild`; do not hand-edit (exception: `ios/FitVault/Info.plist` for permission strings)
- **`mobile/context/SubscriptionContext.tsx` product IDs** — must match store configurations exactly when real IAP is wired
- **`mobile/types/index.ts`** — shared contract; coordinate any changes across all consumers
- **`.gitignore`** — do not remove entries; do not add `.env` or secrets files
- **Global git config or SSH keys** — never modify
- **`FitVault/` and `FitVault.xcodeproj/`** — original iOS reference implementation; leave intact

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React Native + Expo SDK 55 |
| Navigation | Expo Router v4 (file-based) |
| Persistence | AsyncStorage (JSON) |
| AI | Claude API — `claude-haiku-4-5` (direct HTTPS, client-side key — move to backend proxy before release) |
| On-device ML | Apple Vision (`VNDetectHumanBodyPoseRequest`) via custom Expo module (`expo-set-analyzer`) |
| Subscriptions | Mocked context — wire `react-native-iap` or RevenueCat for production |
| Platform | iOS-first (simulator: iPhone 17 Pro); Android untested |
| Build | Local: `npx expo run:ios` · Cloud: EAS (preview + production) |
| Tests | Jest + React Native Testing Library (759 tests, enforced via pre-commit hook + CI) + Deno tests for Edge Function |

---

## Key Files

| File | Purpose |
|---|---|
| `mobile/app/_layout.tsx` | Root layout, context providers |
| `mobile/app/(tabs)/_layout.tsx` | Tab bar configuration |
| `mobile/app/(tabs)/index.tsx` | My Workouts tab |
| `mobile/app/(tabs)/browse.tsx` | Browse/filter tab; hosts WorkoutDetailModal + series execution |
| `mobile/app/(tabs)/discover.tsx` | AI discovery tab (premium) |
| `mobile/app/(tabs)/plan.tsx` | Weekly plan + routine execution |
| `mobile/app/(tabs)/history.tsx` | Activity log + streak stats |
| `mobile/app/(tabs)/for-you.tsx` | Personalized AI recommendations (premium) |
| `mobile/types/index.ts` | All shared TypeScript types |
| `mobile/constants/index.ts` | Colors, icons, body parts, source types |
| **Services** | |
| `mobile/services/claudeService.ts` | Discover + For You Claude API calls (prompt caching, result caching, proxy routing) |
| `mobile/services/photoAnalysisService.ts` | Photo → workout analysis (Claude Vision, prompt caching, proxy routing) |
| `mobile/services/fixMyWorkoutService.ts` | Voice transcript → diagnosis + optimized plan + exercise swaps (Claude) |
| `mobile/services/machineIdentificationService.ts` | Gym machine photo → exercise name (Claude Vision) |
| `mobile/services/progressionService.ts` | Per-exercise history lookup + next-session suggestion (weight/reps/trend) |
| `mobile/services/safetyService.ts` | Rules-based safety scoring — injury flags, age filtering, universal risk rules |
| `mobile/services/adaptationService.ts` | Guidance level (full/reduced/minimal) + plateau detection from workout logs |
| `mobile/services/seriesDetectionService.ts` | Regex-based title pattern matching for workout series (Part N, Day N, Week N…) |
| `mobile/services/seriesExecutionBuilder.ts` | Converts a WorkoutSeries + WorkoutItems into an ephemeral Routine for execution |
| `mobile/services/setAnalysisService.ts` | Interprets raw Apple Vision body-pose data into liability-safe rep/tempo insights |
| `mobile/services/splitTemplates.ts` | Push/Pull/Legs, Upper/Lower, Full Body, Bro Split, Custom template definitions |
| `mobile/services/todayRecommendationService.ts` | "What Should I Do Today?" decision logic |
| `mobile/services/aiResultCache.ts` | AsyncStorage result cache — `getCachedResults`, `setCachedResults`, `hashParams`, TTLs |
| `mobile/services/storage.ts` | Saved workouts AsyncStorage wrapper |
| `mobile/services/routineStorage.ts` | Routines + weekly schedule persistence |
| `mobile/services/workoutLogStorage.ts` | Completed session log persistence |
| `mobile/services/workoutSeriesStorage.ts` | WorkoutSeries CRUD in AsyncStorage (`@fitvault:workoutSeries`) |
| `mobile/services/profileStorage.ts` | User profile AsyncStorage persistence (`@fitvault:userProfile`) |
| **Context** | |
| `mobile/context/WorkoutContext.tsx` | Workout CRUD + persistence |
| `mobile/context/RoutineContext.tsx` | Routine + weekly schedule state |
| `mobile/context/WorkoutLogContext.tsx` | Activity log + computed stats (streak, weekly totals) |
| `mobile/context/WorkoutSeriesContext.tsx` | Workout series list + CRUD; `getSeriesForWorkout` for sync lookup |
| `mobile/context/SubscriptionContext.tsx` | Premium status (mock IAP) |
| `mobile/context/ProfileContext.tsx` | User profile state — goals, fitness level, age, sensitive areas, equipment; auto-persists |
| **Components** | |
| `mobile/components/WorkoutExecutionModal.tsx` | Guided workout execution — timer, set logging, adaptive guidance, plateau nudge |
| `mobile/components/WorkoutDetailModal.tsx` | Workout detail view — progression history, safety flags, series membership |
| `mobile/components/RoutineBuilderModal.tsx` | Build/edit routines |
| `mobile/components/AddWorkoutModal.tsx` | Manual workout entry + series detection step (inline, no modal stacking) |
| `mobile/components/FixMyWorkoutModal.tsx` | Voice-to-coach UI — diagnosis, swaps, video suggestions, paywall gate |
| `mobile/components/WhatShouldIDoModal.tsx` | Today's recommendation UI |
| `mobile/components/SplitTemplateModal.tsx` | Split template picker → generates routine |
| `mobile/components/SetRecordingModal.tsx` | Consent → record → on-device analysis → insights card |
| `mobile/components/MachineScanModal.tsx` | Gym machine photo → exercise pre-fill |
| `mobile/components/PhotoImportModal.tsx` | Photo import + AI analysis |
| **Hooks** | |
| `mobile/hooks/useWorkoutTimer.ts` | Stopwatch + rest countdown for execution mode |
| `mobile/hooks/useSpeechRecognition.ts` | iOS Speech-to-Text wrapper for Fix My Workout voice input |
| `mobile/hooks/useVideoRecording.ts` | Camera access + recording lifecycle for SetRecordingModal |
| **Native module** | |
| `mobile/modules/expo-set-analyzer/` | Custom Expo module — wraps Apple Vision body-pose detection for rep counting |
| **Backend** | |
| `supabase/functions/claude-proxy/index.ts` | Supabase Edge Function proxy — holds real API key, strips browser-access header |
| `supabase/functions/claude-proxy/index.test.ts` | Deno tests for the proxy (run with `deno test`) |
| `supabase/config.toml` | Supabase function config (`verify_jwt = false`) |
| `mobile/.env.example` | Required env var template |

---

## Getting Started

```bash
cd mobile
cp .env.example .env.local   # add real Claude API key
npm install
npx expo run:ios
npm test
```
