# Notesok

Offline-first **markdown notes** in the browser. Static **PWA** for **GitHub Pages**; notes in `localStorage` (`notesok_v1`).

- **marked** is vendored in `vendor/marked.min.js` and cached by the service worker so **preview works offline** after the first successful load.

## Local preview

```bash
python3 -m http.server 8080
```

## New GitHub repo

```bash
cd /path/to/notesok
git init -b main
git add .
git commit -m "Initial commit"
gh repo create notesok --public --source=. --remote=origin --push
```

Enable **Pages** from `main` / root.

Change the **Donate** link in `index.html` if needed.
