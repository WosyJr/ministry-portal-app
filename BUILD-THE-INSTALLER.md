# Building the proper Windows installer

The ready-to-run folder works as it stands. Build the installer only if you want
a real `MinistrySetup.exe` with the seal as the file icon and a proper
Add/Remove Programs entry.

It has to be built **on Windows** — the icon-stamping step needs Windows itself.

## Once

1. Install Node.js from https://nodejs.org (the LTS button).
2. Unzip this folder somewhere, open it, click the address bar, type `cmd`, press Enter.
3. Run:

       npm install
       npm run build

4. The installer lands in `dist\Ministry-1.0.0-x64.exe`.

## Changing the address it opens

`main.js`, line 5:

    const DEFAULT_URL = 'https://koministry.com';

Anyone can also change it from the tray icon without rebuilding.
