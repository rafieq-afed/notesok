const STORAGE_KEY = "notesok_v1";

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { notes: [], activeId: null };
    const d = JSON.parse(raw);
    const notes = Array.isArray(d.notes)
      ? d.notes.filter((n) => n && n.id && typeof n.title === "string" && typeof n.body === "string")
      : [];
    const activeId = typeof d.activeId === "string" && notes.some((n) => n.id === d.activeId) ? d.activeId : notes[0]?.id ?? null;
    return { notes, activeId };
  } catch {
    return { notes: [], activeId: null };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes: state.notes, activeId: state.activeId }));
}

let state = loadState();

const noteListEl = document.getElementById("note-list");
const emptyState = document.getElementById("empty-state");
const editorWrap = document.getElementById("editor-wrap");
const noteTitle = document.getElementById("note-title");
const noteBody = document.getElementById("note-body");
const notePreview = document.getElementById("note-preview");
const btnNew = document.getElementById("btn-new");
const btnExportAll = document.getElementById("btn-export-all");
const btnExportOne = document.getElementById("btn-export-one");
const btnDelete = document.getElementById("btn-delete");
const tabEdit = document.getElementById("tab-edit");
const tabPreview = document.getElementById("tab-preview");
const tplNoteRow = document.getElementById("tpl-note-row");

let saveTimer = null;
let previewMode = false;

function activeNote() {
  return state.notes.find((n) => n.id === state.activeId) ?? null;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

function renderList() {
  noteListEl.replaceChildren();
  const sorted = [...state.notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  for (const n of sorted) {
    const node = tplNoteRow.content.cloneNode(true);
    const btn = node.querySelector(".note-row");
    btn.dataset.id = n.id;
    if (n.id === state.activeId) btn.classList.add("active");
    node.querySelector(".note-row-title").textContent = n.title.trim() || "Untitled";
    node.querySelector(".note-row-date").textContent = formatDate(n.updatedAt);
    btn.addEventListener("click", () => {
      state.activeId = n.id;
      saveState();
      renderList();
      renderEditor();
    });
    noteListEl.appendChild(node);
  }
}

function runPreview() {
  const note = activeNote();
  const md = note ? note.body : "";
  try {
    if (typeof marked !== "undefined" && marked.parse) {
      notePreview.innerHTML = marked.parse(md);
    } else {
      notePreview.textContent = "Preview unavailable.";
    }
  } catch {
    notePreview.textContent = "Could not render preview.";
  }
}

function setTabPreview(on) {
  previewMode = on;
  tabEdit.classList.toggle("active", !on);
  tabEdit.setAttribute("aria-selected", String(!on));
  tabPreview.classList.toggle("active", on);
  tabPreview.setAttribute("aria-selected", String(on));
  noteBody.hidden = on;
  notePreview.hidden = !on;
  if (on) runPreview();
}

function renderEditor() {
  const note = activeNote();
  if (!note) {
    emptyState.hidden = false;
    editorWrap.hidden = true;
    return;
  }
  emptyState.hidden = true;
  editorWrap.hidden = false;
  noteTitle.value = note.title;
  noteBody.value = note.body;
  if (previewMode) runPreview();
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const note = activeNote();
    if (!note) return;
    note.title = noteTitle.value;
    note.body = noteBody.value;
    note.updatedAt = new Date().toISOString();
    saveState();
    renderList();
  }, 350);
}

btnNew.addEventListener("click", () => {
  const n = {
    id: uid(),
    title: "",
    body: "",
    updatedAt: new Date().toISOString(),
  };
  state.notes.unshift(n);
  state.activeId = n.id;
  saveState();
  setTabPreview(false);
  renderList();
  renderEditor();
  noteTitle.focus();
});

btnDelete.addEventListener("click", () => {
  const note = activeNote();
  if (!note || !confirm("Delete this note?")) return;
  state.notes = state.notes.filter((n) => n.id !== note.id);
  state.activeId = state.notes[0]?.id ?? null;
  saveState();
  setTabPreview(false);
  renderList();
  renderEditor();
});

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}

btnExportAll.addEventListener("click", () => {
  downloadJson("notesok-export.json", { notes: state.notes, exportedAt: new Date().toISOString() });
});

btnExportOne.addEventListener("click", () => {
  const note = activeNote();
  if (!note) return;
  const safe = (note.title || "note").replace(/[^\w\-]+/g, "_").slice(0, 40);
  downloadJson(`notesok-${safe}.json`, note);
});

noteTitle.addEventListener("input", scheduleSave);
noteBody.addEventListener("input", () => {
  scheduleSave();
  if (previewMode) runPreview();
});

tabEdit.addEventListener("click", () => setTabPreview(false));
tabPreview.addEventListener("click", () => setTabPreview(true));

renderList();
renderEditor();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
