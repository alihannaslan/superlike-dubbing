# Subtitle Re-Render Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to return from a `COMPLETED` dubbing job to the subtitle styling step, change the style, and re-render the final video — without re-uploading or re-dubbing.

**Architecture:** Add `POST /api/dubbing/[id]/edit-subtitle` that flips status `COMPLETED → SUBTITLE_REVIEW`. Modify the existing finalize endpoint to delete the orphan file from the previous render variant so disk does not accumulate. Add an "Altyazıyı Düzenle" button on the COMPLETED state of the job detail page that calls the new endpoint. No DB schema change.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, React 19, FFmpeg via Node `execFile`. No test framework exists in this codebase — manual verification with curl + dev server is the only option and is used throughout this plan.

**Spec:** `docs/superpowers/specs/2026-05-01-subtitle-re-render-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/app/api/dubbing/[id]/edit-subtitle/route.ts` | Create | New POST endpoint that validates a COMPLETED job and flips its status back to SUBTITLE_REVIEW |
| `src/app/api/dubbing/[id]/finalize/route.ts` | Modify | After writing the new final file, unlink the orphan variant from any previous render |
| `src/app/dashboard/jobs/[id]/page.tsx` | Modify | Add "Altyazıyı Düzenle" button + click handler in the COMPLETED block |

---

## Task 1: Create `edit-subtitle` API route

**Files:**
- Create: `src/app/api/dubbing/[id]/edit-subtitle/route.ts`

- [ ] **Step 1: Create the route file with full handler**

Write this exact content to `src/app/api/dubbing/[id]/edit-subtitle/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { access } from "fs/promises";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    if (job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Sadece tamamlanmış işlerde düzenleme yapılabilir" },
        { status: 400 }
      );
    }

    if (!job.intermediateFilePath) {
      return NextResponse.json(
        { error: "Ara dosya kayıtlı değil" },
        { status: 400 }
      );
    }

    try {
      await access(job.intermediateFilePath);
    } catch {
      return NextResponse.json(
        { error: "Ara dosya bulunamadı, yeni job başlatın" },
        { status: 400 }
      );
    }

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        status: "SUBTITLE_REVIEW",
        completedAt: null,
        dubbedFilePath: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/dubbing/[id]/edit-subtitle error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu, lütfen tekrar deneyin" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean exit). If errors, fix them and re-run.

- [ ] **Step 3: Manual smoke test against an existing COMPLETED job**

Run dev server in another terminal: `PORT=3457 npm run dev`

Wait for "Ready". Then:

1. Find a real COMPLETED job in the database. Quick way:
   ```bash
   psql "$DATABASE_URL" -c "SELECT id, status FROM \"DubbingJob\" WHERE status = 'COMPLETED' ORDER BY \"createdAt\" DESC LIMIT 3;"
   ```
2. Pick one ID. Without authenticating (which is hard from curl in this app), the easiest verification is: log in via the browser at `http://localhost:3457/login`, then in DevTools console:
   ```js
   await fetch("/api/dubbing/<JOB_ID>/edit-subtitle", { method: "POST" }).then(r => r.json())
   ```
   Expected: `{ success: true }`.
3. Re-query the DB:
   ```bash
   psql "$DATABASE_URL" -c "SELECT id, status, \"completedAt\", \"dubbedFilePath\" FROM \"DubbingJob\" WHERE id = '<JOB_ID>';"
   ```
   Expected: `status = SUBTITLE_REVIEW`, `completedAt = NULL`, `dubbedFilePath = NULL`.
4. Re-run the same fetch a second time. Expected: 400 with `Sadece tamamlanmış işlerde düzenleme yapılabilir` (since status is no longer COMPLETED).
5. Manually flip the job back to COMPLETED in the DB so the user is unaffected:
   ```bash
   psql "$DATABASE_URL" -c "UPDATE \"DubbingJob\" SET status = 'COMPLETED', \"dubbedFilePath\" = '<the path you saw before>', \"completedAt\" = NOW() WHERE id = '<JOB_ID>';"
   ```

If you cannot run the DB query, skip the DB-level verification and rely on `{ success: true }` plus the second-call 400. The frontend integration (Task 3) will exercise the full path.

- [ ] **Step 4: Stop the dev server**

Press Ctrl+C in the dev server terminal, or `kill $(lsof -ti :3457)`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dubbing/\[id\]/edit-subtitle/route.ts
git commit -m "$(cat <<'EOF'
feat: add POST /api/dubbing/[id]/edit-subtitle endpoint

Flips a COMPLETED job back to SUBTITLE_REVIEW so the user can re-style
the subtitle and re-render without re-uploading or re-dubbing.
Validates that the intermediate (subtitle-less) dubbed file still
exists on disk before allowing the transition.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Clean up orphan files in finalize route

**Files:**
- Modify: `src/app/api/dubbing/[id]/finalize/route.ts`

**Why:** When a user re-renders, they may switch between subtitled and no-subs modes. Each mode writes to a different deterministic path (`-subtitled.mp4` vs `-final.mp4`). Without cleanup, the previous variant lingers on disk forever and consumes space across many re-renders. The fix unlinks the unused variant after the new render lands.

- [ ] **Step 1: Update the imports and finalize logic**

Open `src/app/api/dubbing/[id]/finalize/route.ts`.

Find the import line:
```typescript
import { copyFile } from "fs/promises";
```

Replace with:
```typescript
import { copyFile, unlink } from "fs/promises";
```

Find the block that writes the final file (currently around line 90-110):
```typescript
    let finalPath: string;

    if (subtitleEnabled && style) {
      const srtContent = await getTranscriptSRT(job.dubbingId, job.targetLang);
      const subtitledPath = path.join(
        process.cwd(),
        "dubbed",
        `${job.dubbingId}-${job.targetLang}-subtitled.mp4`
      );
      await burnSubtitles(job.intermediateFilePath, srtContent, subtitledPath, style);
      finalPath = subtitledPath;
    } else {
      const noSubsPath = path.join(
        process.cwd(),
        "dubbed",
        `${job.dubbingId}-${job.targetLang}-final.mp4`
      );
      await copyFile(job.intermediateFilePath, noSubsPath);
      finalPath = noSubsPath;
    }
```

Replace it with:
```typescript
    const subtitledPath = path.join(
      process.cwd(),
      "dubbed",
      `${job.dubbingId}-${job.targetLang}-subtitled.mp4`
    );
    const noSubsPath = path.join(
      process.cwd(),
      "dubbed",
      `${job.dubbingId}-${job.targetLang}-final.mp4`
    );

    let finalPath: string;

    if (subtitleEnabled && style) {
      const srtContent = await getTranscriptSRT(job.dubbingId, job.targetLang);
      await burnSubtitles(job.intermediateFilePath, srtContent, subtitledPath, style);
      finalPath = subtitledPath;
      await unlink(noSubsPath).catch(() => {});
    } else {
      await copyFile(job.intermediateFilePath, noSubsPath);
      finalPath = noSubsPath;
      await unlink(subtitledPath).catch(() => {});
    }
```

The `.catch(() => {})` is intentional: if the orphan does not exist (first render of the job), `unlink` rejects with ENOENT and we want to silently ignore that. Any other failure also gets swallowed because finalize succeeding is more important than orphan cleanup.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Manual smoke test (optional, can be deferred to Task 4 e2e test)**

This is hard to test in isolation because the finalize endpoint requires a SUBTITLE_REVIEW job and a real intermediate file. The full path is exercised in Task 4. To at least verify the code change does not break the existing single-render flow, run a fresh job through the regular UI flow on a small video, confirm it reaches COMPLETED, and verify `dubbed/` only contains `-subtitled.mp4` OR `-final.mp4` (not both, not neither).

```bash
ls -la dubbed/ | grep <YOUR_DUBBING_ID>
```

Expected: exactly one of `-subtitled.mp4` or `-final.mp4` for that dubbingId, plus `-frame.jpg` and the intermediate `<dubbingId>-<lang>.mp4`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dubbing/\[id\]/finalize/route.ts
git commit -m "$(cat <<'EOF'
feat: delete orphan variant in finalize so disk does not accumulate

When a user re-renders, they may switch between subtitled and no-subs
modes. Each mode writes a deterministic file path. Without cleanup, the
previous variant would linger forever. After a successful render, unlink
the unused variant; ENOENT and other errors are silently swallowed
because finalize success outranks orphan cleanup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Add "Altyazıyı Düzenle" button on COMPLETED state

**Files:**
- Modify: `src/app/dashboard/jobs/[id]/page.tsx`

- [ ] **Step 1: Add the `editingSubtitle` state hook**

Open `src/app/dashboard/jobs/[id]/page.tsx`. Find the block of `useState` declarations near the top of `JobDetailPage()`:

```typescript
  const [finalizing, setFinalizing] = useState(false);
```

Add directly below it:

```typescript
  const [editingSubtitle, setEditingSubtitle] = useState(false);
```

- [ ] **Step 2: Add the `handleEditSubtitle` handler**

Find `async function handleFinalize(withSubtitle: boolean)` and add this new function directly above it:

```typescript
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

The `setSegments([])` reset is important: the page's `useEffect` for fetching segments runs when `segments.length === 0` and the job is in REVIEW or SUBTITLE_REVIEW. Clearing segments before `fetchJob()` ensures the segments reload after the status flips, so the SubtitlePreview receives fresh `sampleText`.

- [ ] **Step 3: Replace the COMPLETED block to render both buttons**

Find the existing block (around line 280):

```tsx
        {job.status === "COMPLETED" && (
          <a
            href={`/api/dubbing/${job.id}/download`}
            className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
          >
            Çevrilmiş Videoyu İndir
          </a>
        )}
```

Replace it with:

```tsx
        {job.status === "COMPLETED" && (
          <div className="space-y-2">
            <a
              href={`/api/dubbing/${job.id}/download`}
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors text-center"
            >
              Çevrilmiş Videoyu İndir
            </a>
            <button
              onClick={handleEditSubtitle}
              disabled={editingSubtitle}
              className="block w-full bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors text-center"
            >
              {editingSubtitle ? "Hazırlanıyor..." : "Altyazıyı Düzenle"}
            </button>
          </div>
        )}
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Run lint and confirm no new errors**

Run: `npm run lint 2>&1 | grep -E "error" | head -20`

The codebase has 3 pre-existing errors:
- `src/app/api/admin/users/[id]/route.ts:63:30 — Unexpected any`
- `src/app/dashboard/jobs/[id]/page.tsx — two setState-in-effect errors`

If you see exactly those 3 (or fewer), you have not introduced new errors. If you see more, fix them before committing.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/jobs/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
feat: add 'Altyazıyı Düzenle' button on COMPLETED job page

Lets the user re-enter the SUBTITLE_REVIEW state to change subtitle
style and re-render without re-uploading. The button calls
POST /api/dubbing/[id]/edit-subtitle, then clears segments and refetches
the job so the existing SUBTITLE_REVIEW UI re-mounts with the previous
style values pre-populated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: End-to-end manual verification

This task does not change code. It exercises the full flow on a real job to catch any integration issue the unit-level steps missed.

- [ ] **Step 1: Start dev server**

Run: `PORT=3457 npm run dev`
Wait for "Ready".

- [ ] **Step 2: Run a fresh small dubbing job**

In the browser at `http://localhost:3457`:
1. Log in.
2. Click "Yeni Çeviri".
3. Upload a small video (≤30 seconds is enough; longer wastes ElevenLabs credit).
4. Pick source language and a different target language.
5. Submit. Wait through PROCESSING → REVIEW.
6. In REVIEW, click "Onayla ve Dublajı Oluştur". Wait through DUBBING → SUBTITLE_REVIEW.
7. In SUBTITLE_REVIEW, pick a noticeable style (e.g., font size 24, red text, white background, 100% opacity).
8. Click "Altyazılı Olarak Tamamla". Wait through FINALIZING → COMPLETED.
9. Click "Çevrilmiş Videoyu İndir". Open the file; confirm the subtitles look as styled.

- [ ] **Step 3: Verify "Altyazıyı Düzenle" button works**

On the same job page, you should now see two buttons:
- "Çevrilmiş Videoyu İndir" (green)
- "Altyazıyı Düzenle" (white, outlined)

Click "Altyazıyı Düzenle". Expected:
- Button briefly shows "Hazırlanıyor..."
- Page transitions to the SUBTITLE_REVIEW UI within ~1 second
- Preview frame is visible (the same frame from the first render)
- Style controls are pre-populated with your previous choices (font size 24, red, etc.)

- [ ] **Step 4: Re-render with a different style**

Change the style noticeably (e.g., font size 14, blue text, black background, 70% opacity, different font family). Click "Altyazılı Olarak Tamamla". Wait for COMPLETED.

Click "Çevrilmiş Videoyu İndir". Open. Confirm the new style is applied (NOT the previous red-on-white).

- [ ] **Step 5: Verify orphan cleanup**

```bash
ls -la dubbed/ | grep <DUBBING_ID>
```

Expected: exactly one of `-subtitled.mp4` or `-final.mp4` (not both), plus `-frame.jpg` and the intermediate `<dubbingId>-<lang>.mp4`. The file size of `-subtitled.mp4` should match the latest re-render, not the first.

- [ ] **Step 6: Verify "Altyazısız İndir" path works after re-edit**

Click "Altyazıyı Düzenle" again. In SUBTITLE_REVIEW, click "Altyazısız İndir". Wait for COMPLETED.

```bash
ls -la dubbed/ | grep <DUBBING_ID>
```

Expected: now `<dubbingId>-<lang>-final.mp4` exists, and `-subtitled.mp4` is gone (orphan was deleted).

Click "Çevrilmiş Videoyu İndir". Confirm the downloaded file has NO subtitles.

- [ ] **Step 7: Verify error path — second click race**

In two browser tabs, open the same job in COMPLETED state. In tab 1, click "Altyazıyı Düzenle". Quickly in tab 2, click "Altyazıyı Düzenle".

Expected: tab 1 succeeds and navigates to SUBTITLE_REVIEW. Tab 2 shows an alert with "Sadece tamamlanmış işlerde düzenleme yapılabilir" (or similar 400 message). Tab 2's UI stays on the stale COMPLETED view; refreshing reveals the SUBTITLE_REVIEW state.

- [ ] **Step 8: Stop dev server**

Press Ctrl+C in the dev terminal, or `kill $(lsof -ti :3457)`.

- [ ] **Step 9: Push the branch**

```bash
git push origin main
```

This deploys via Vercel auto-deploy (per project history) within 1-2 minutes.

---

## Done When

- [ ] All tasks above checked off
- [ ] Dev server e2e flow successfully completed including a re-render
- [ ] Disk shows exactly one final variant per job after each render
- [ ] Pushed to origin/main
