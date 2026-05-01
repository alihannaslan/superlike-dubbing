# Subtitle Re-Render — Design

**Date:** 2026-05-01
**Status:** Approved, ready for implementation

## Problem

After a dubbing job reaches `COMPLETED`, a user who is unhappy with the rendered subtitle styling (font too small, wrong color, etc.) currently has only one option: upload the same source video again and re-pay for the entire ElevenLabs dubbing call. This wastes money and time, and discourages users from iterating on subtitle aesthetics.

## Goal

Allow a user to return from a `COMPLETED` job to the subtitle styling step, adjust style controls, and re-render the final video — without re-uploading or re-dubbing. The expensive part (ElevenLabs dubbing) runs once. The cheap part (FFmpeg subtitle burn on the kept intermediate file) can run unlimited times.

## Non-Goals

- **No version history.** Each re-render overwrites the previous final video. The user wants the latest result, not a comparison archive.
- **No segment text editing in re-render.** Editing translation text would require re-calling ElevenLabs (paid). Re-render flow is style-only. If the user needs to change text, they go through the existing REVIEW flow on a new job.
- **No simultaneous renders.** A single render at a time per job; the second tab reload reflects the in-progress status.

## User Flow

```
COMPLETED page
   ↓ user clicks "Altyazıyı Düzenle"
SUBTITLE_REVIEW (with previous style pre-loaded)
   ↓ user adjusts font/size/color/bg/opacity (live preview, no render)
   ↓ user clicks "Altyazılı Olarak Tamamla" or "Altyazısız İndir"
FINALIZING (FFmpeg burn, ~30 sec - 2 min)
   ↓
COMPLETED with new download
   ↓ optional: edit again, unlimited times
```

The same `SUBTITLE_REVIEW` UI handles both first-render and re-edit. The preview frame extracted from the dubbed video is reused — no re-extraction needed.

## Architecture Changes

### Status Transitions

| From | To | Trigger |
|---|---|---|
| `COMPLETED` | `SUBTITLE_REVIEW` | `POST /api/dubbing/[id]/edit-subtitle` (new) |
| `SUBTITLE_REVIEW` | `FINALIZING` | `POST /api/dubbing/[id]/finalize` (existing) |
| `FINALIZING` | `COMPLETED` | finalize handler success (existing) |

No new statuses; only a new backwards transition.

### Backend

**New route:** `src/app/api/dubbing/[id]/edit-subtitle/route.ts`

Method: `POST`. Behavior:
1. Authenticate user via `getUser()`.
2. Look up job by `id` + `userId`.
3. Validate: `status === "COMPLETED"` AND `intermediateFilePath` is set AND that file exists on disk.
4. If validation fails → return 400 with reason.
5. Update job: `status = "SUBTITLE_REVIEW"`, `completedAt = null`, `dubbedFilePath = null` (the previous final is about to be replaced).
6. Return `{ success: true }`.

Note: previous subtitle style fields (`subtitleFont`, `subtitleSize`, `subtitleColor`, `subtitleBgColor`, `subtitleBgOpacity`) stay in DB so the SUBTITLE_REVIEW UI loads them and the user starts from the last known style — they're tweaking, not starting fresh.

**Modified route:** `src/app/api/dubbing/[id]/finalize/route.ts`

After writing the new final file (subtitled or not), delete any orphan from the previous render variant:
- If the new render is `subtitled.mp4`, delete the corresponding `final.mp4` (no-subs path) if it exists.
- If the new render is `final.mp4` (no subs), delete the corresponding `subtitled.mp4` if it exists.
- Use `fs.promises.unlink` wrapped in try/catch — failure to delete the orphan must not fail the request.

This guarantees a single final artifact per job and prevents disk accumulation across many re-renders.

**No change** needed to:
- `/api/dubbing/[id]/route.ts` (GET — already returns all relevant fields)
- `/api/dubbing/[id]/status/route.ts` (terminal states already include COMPLETED and SUBTITLE_REVIEW)
- `/api/dubbing/[id]/preview-frame/route.ts` (frame is reused as-is)
- `/api/dubbing/[id]/dub/route.ts` (Stage 1, runs only on first dubbing)
- Prisma schema (existing fields are sufficient)

### Frontend

**Modified file:** `src/app/dashboard/jobs/[id]/page.tsx`

Add to the `COMPLETED` block, immediately after the existing "Çevrilmiş Videoyu İndir" download link:

```tsx
<button
  onClick={handleEditSubtitle}
  disabled={editingSubtitle}
  className="block w-full bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-center"
>
  {editingSubtitle ? "Hazırlanıyor..." : "Altyazıyı Düzenle"}
</button>
```

Add a new state hook `editingSubtitle` and a handler:

```tsx
async function handleEditSubtitle() {
  setEditingSubtitle(true);
  const res = await fetch(`/api/dubbing/${id}/edit-subtitle`, { method: "POST" });
  if (res.ok) {
    setSegments([]);
    setEditedSegments({});
    fetchJob();
  } else {
    const data = await res.json();
    alert(data.error || "Düzenleme başlatılamadı");
  }
  setEditingSubtitle(false);
}
```

Resetting `segments` and `editedSegments` is important — the page's `useEffect` for fetching segments triggers when the job moves into SUBTITLE_REVIEW, and we want the segments to reload (sample text for preview is taken from the first segment).

The existing `fetchJob()` already loads previous subtitle style values from the DB into the `style` state, so the SUBTITLE_REVIEW UI opens pre-populated with what the user last picked. No change needed there.

**No change** needed to:
- `SubtitlePreview` component (works with whatever `style` state it receives)
- `StatusBadge` (existing labels handle these statuses)
- Any other dashboard page

## Edge Cases

| Scenario | Behavior |
|---|---|
| User clicks "Düzenle" while a render is in progress | Cannot happen — button only renders in COMPLETED state |
| User clicks "Düzenle" twice (network race) | Second request gets 400 (status no longer COMPLETED) |
| Intermediate file missing on disk (manual cleanup, FS issue) | `/edit-subtitle` returns 400, "Ara dosya bulunamadı, yeni job başlatın" |
| User opened the page in two tabs, edits in one, downloads in the other | Tab 2's stored "Download" link points to the deleted previous file → 404. Acceptable; rare. |
| User picked subtitled mode, re-renders without subs | finalize endpoint writes `final.mp4`, deletes orphan `subtitled.mp4`. Download link auto-updates after `fetchJob`. |
| User picked no-subs mode, re-renders with subs | Mirror case: writes `subtitled.mp4`, deletes orphan `final.mp4`. |
| User abandons re-edit (closes tab from SUBTITLE_REVIEW) | Job stuck in SUBTITLE_REVIEW indefinitely. They can return any time and finalize, or close-and-reopen tab. No download available until they finalize. |

The "abandons re-edit" case is a UX consideration rather than a bug — the job state correctly reflects what happened. If the user comes back later and decides not to re-render after all, they'd need a "cancel" path back to COMPLETED. Out of scope for v1; if it surfaces as a real complaint we can add it.

## Code Footprint

- New route file: ~40 lines
- Finalize route additions (orphan delete + try/catch): ~12 lines
- Frontend additions (state + handler + button): ~20 lines
- Total: ~75 lines, no DB migration, no new dependencies

## Testing Approach

Manual end-to-end testing on the deployed dev environment:

1. Run a fresh job through to COMPLETED with subtitles enabled.
2. Click "Altyazıyı Düzenle" → confirm SUBTITLE_REVIEW page loads with previous style pre-populated and preview frame visible.
3. Change font + color, click "Altyazılı Olarak Tamamla" → wait for FINALIZING → COMPLETED.
4. Download the new file → verify the new style is applied.
5. Click "Altyazıyı Düzenle" again → verify second re-render works.
6. Try once with "Altyazısız İndir" → verify orphan `subtitled.mp4` is gone from `dubbed/` directory.
7. Race test: open job page in two tabs, click "Düzenle" in both — confirm the second one gets a clean error.

No automated tests exist for this codebase; matching that bar.
