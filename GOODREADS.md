# Goodreads shelf sync

Goodreads no longer offers RSS feeds, so the **Book Tracker** page reads your shelves from Goodreads **custom widgets** instead. Synced books are normal shelf books, so they also show up in the Dashboard's **Book Tracker** ring and in search. **No Supabase setup is needed.**

## How it works

- You paste each shelf's widget HTML once. The site keeps only the widget's script address (one `goodreads_settings` record in `dashboard_records`), so every device uses it.
- To sync, the site loads that Goodreads script inside a hidden, locked-down frame, reads the books it shows and closes the frame. The frame has no access to the page, your sign-in or your data.
- Goodreads shelves become reading statuses:

  | Goodreads shelf | Book Tracker status |
  |---|---|
  | Currently Reading | Reading |
  | Read | Finished |
  | Did Not Finish | Did not finish (new status) |
  | Want to Read | Want to read |

- A book you already added by hand (same title and author) is matched rather than added twice.
- **Goodreads is in charge of synced books.** Move a book between shelves on Goodreads; if you change its status in the dashboard instead, the next sync puts it back.
- Removing a book on Goodreads never deletes it from the dashboard. Remove it on the Book Tracker page if you want it gone.
- The site syncs again by itself whenever you open it and the last sync was more than 6 hours ago. **Save & sync** with an empty box syncs right away.
- Each widget is asked for at least 100 books, even if the code says 5. If Goodreads only gives back what the widget was set to show, regenerate that widget with a bigger **Number of books** (see step 1).
- If Goodreads doesn't answer for a shelf, the first sync uses the books in the code you pasted, and the message tells you which shelf that was.

## Setup, step by step (about 10 minutes)

### 1. Copy the widget code for each shelf
You already have this for Read, Currently Reading, Want to Read and Did Not Finish. To make one again:
1. On a computer, go to https://www.goodreads.com and sign in.
2. Click **My Books**. Scroll to the bottom of the left column and click **Widgets**.
3. Under the custom widget section, click to customize it.
4. Set **Shelf** to the shelf you want, and set **Number of books** as high as it allows (for example `100` or `200`).
5. Click **Update preview**, then copy **all** of the HTML in the code box. It ends with a `<script src="https://www.goodreads.com/review/custom_widget/…"></script>` line, which is the part the dashboard needs.
6. Repeat for each shelf.

### 2. Put the site changes on GitHub
The changed files are:
- `index.html` (the **Goodreads shelves** panel and the new **Did not finish** status on the Book Tracker page)
- `service-worker.js` (cache bumped to `ultimate-shell-v7` so phones pick up the new page)
- `GOODREADS.md` (this guide) and `START-HERE.md` (now points here)

To upload them:
1. Unzip `goodreads-update.zip` on your computer.
2. Go to https://github.com/sottyon/ultimate-dashboard and click **Add file → Upload files**.
3. Open the unzipped `goodreads-update` folder, select all four files and drag them onto the GitHub page.
4. Type a message such as `Add Goodreads shelf sync` and click **Commit changes**.
5. Wait 1–2 minutes for GitHub Pages to publish.

### 3. Connect your shelves
1. Open https://sottyon.github.io/ultimate-dashboard/ and reload the page twice (the first reload fetches the new version, the second shows it). On the iPhone home-screen app, close it fully and reopen it.
2. Open **Book Tracker** in the sidebar.
3. Under **Goodreads shelves**, paste the widget code. You can paste one shelf at a time, or all four codes back to back in one go.
4. Click **Save & sync**. You'll see something like "Synced 42 books from Goodreads: 40 added, 2 updated." Next to the button, **Connected:** lists the shelves that are saved.
5. Pasting a new code for a shelf you already connected replaces that shelf's widget. Your other shelves stay connected.

## Troubleshooting

| Message | What to do |
|---|---|
| "No Goodreads widget found." | Copy the whole widget code, including the last `<script src=…custom_widget…>` line. |
| "Only the Currently Reading, Read, Want to Read and Did Not Finish shelves can be synced." | The widget is for another shelf. Remake it with one of those four shelves. |
| "…used the pasted copy because Goodreads didn't answer" | Goodreads was slow or blocked (an ad or content blocker can do this). The sync still worked with the pasted books. Sync again later. |
| "Goodreads didn't answer for …" | Same cause, on a later sync. Nothing is lost; the next sync tries again. |
| Only 5 (or a few) books per shelf | Remake that shelf's widget with a higher **Number of books** and paste it again. |
| Old page with no Goodreads panel | Reload twice, or close and reopen the home-screen app. |

## Stop syncing
Delete the `goodreads_settings` record in Supabase (**Table Editor → dashboard_records**, find the row whose `record` contains `goodreads_settings`). Books already synced stay on your shelf.
