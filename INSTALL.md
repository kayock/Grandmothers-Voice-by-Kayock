# Installation

Grandmothers voice by Kayock needs **no installation** in the usual sense: it is a
folder of files you keep anywhere on your computer. The only requirement is
any reasonably modern web browser (Chrome, Edge, Firefox, or Safari from
roughly 2023 onward). No internet connection is needed at any point.

---

## Windows 10 / 11

1. Unzip the release folder anywhere convenient (e.g. `Documents\Kayock`).
   Right-click the ZIP → *Extract all…* — the app must live in a real
   folder, not inside the ZIP.
2. Double-click **`RUN_GED_LEGACY_BUILDER.bat`** — it simply opens
   `Grandmothers_Voice_by_Kayock.html` in your default browser. Alternatively
   double-click `Grandmothers_Voice_by_Kayock.html` itself.
3. If Windows SmartScreen asks about the `.bat` file, click *More info →
   Run anyway* (the file contains only `start "" "%~dp0Grandmothers_Voice_by_Kayock.html"`).
4. To pin it: right-click the `.bat` → *Show more options → Pin to taskbar*,
   or create a desktop shortcut.

**Recommended browsers on Windows:** Chrome or Edge (full feature set
including folder import and ZIP compression).

## macOS 12+

1. Unzip the release folder (double-click the ZIP), then move it anywhere
   (e.g. `~/Documents/Kayock`).
2. Double-click **`RUN_GED_LEGACY_BUILDER.command`**. The first time, macOS
   may say the file is from an unidentified developer — right-click it →
   *Open* → *Open*. The `.command` file contains one line that opens the
   HTML file.
3. If you prefer, double-click `Grandmothers_Voice_by_Kayock.html` directly — it opens
   in your default browser. You can also drag it onto the Safari/Dock icon.

**Folder import on Safari:** Safari does not support choosing a whole
folder. Use *Add files…* and select the media files themselves, or use
Chrome for the folder-picker feature. Everything else works in Safari.

## Linux (any modern distribution)

1. Unzip the release folder:
   ```
   unzip Kayock_Legacy_Builder.zip -d ~/kayock
   ```
2. Launch either way:
   ```
   ~/kayock/RUN_GED_LEGACY_BUILDER.sh        # uses xdg-open
   ```
   or double-click `Grandmothers_Voice_by_Kayock.html` from your file manager, or
   open it directly in a browser:
   ```
   firefox ~/kayock/Grandmothers_Voice_by_Kayock.html      # or chromium, chrome…
   ```
3. Optional desktop entry: create `~/.local/share/applications/kayock.desktop`
   with `Exec=xdg-open /home/you/kayock/Grandmothers_Voice_by_Kayock.html`.

**Folder import** works in Chrome/Chromium and Firefox.

---

## Running the automated tests (optional)

The tests need Node.js 18 or newer (`node --version` to check):

```
cd Kayock_Legacy_Builder
node tests/run_tests.mjs              # expect: ALL TESTS PASSED
node tests/run_tests.mjs --perf       # large-tree performance benchmark
node tests/fixtures/make_fixtures.js  # regenerate synthetic fixtures
```

## Verifying offline operation

After installation you can confirm the app never touches the network:

1. Disconnect from the internet entirely (or block your browser's network
   access with your firewall).
2. Open `Grandmothers_Voice_by_Kayock.html`, load the Sample Family, parse it, and
   generate every output. Everything works identically.
3. The generated explorer files behave the same way — they contain no
   external references at all.

## Updating

This tool stores nothing outside its own folder except refinement notes in
your browser's local storage. To update: keep the new folder, and move your
notes by exporting **refinement backups** (JSON) from the old version and
importing them in the new one. Your GED files are never touched.
