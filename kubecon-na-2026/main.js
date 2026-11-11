import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./style.css";
import { initAuth } from "../lib/auth.js";
import { NOTES_TUE, NOTES_WED, NOTES_THU, TRACKS, ORDER } from "./data.js";
import schedule from "./schedule.json";
import LEGACY_IDS from "./legacy-ids.json";

const DESC = schedule.desc;

const pad = (t) => (t.length === 4 ? "0" + t : t);
const DAYS = [
  {
    k: "tue",
    date: "2026-11-10",
    label: "Tue",
    long: "Tuesday, Nov 10",
    key: schedule.days.tue.keynotes,
    notes: NOTES_TUE,
    rows: schedule.days.tue.sessions,
  },
  {
    k: "wed",
    date: "2026-11-11",
    label: "Wed",
    long: "Wednesday, Nov 11",
    key: schedule.days.wed.keynotes,
    notes: NOTES_WED,
    rows: schedule.days.wed.sessions,
  },
  {
    k: "thu",
    date: "2026-11-12",
    label: "Thu",
    long: "Thursday, Nov 12",
    key: schedule.days.thu.keynotes,
    notes: NOTES_THU,
    rows: schedule.days.thu.sessions,
  },
];
DAYS.forEach((d) => {
  d.key.forEach((k) => (k[0] = pad(k[0])));
  // [Sessionize id, start, end, track, title, speakers, room, level, format]
  d.S = d.rows.map((r) => ({
    id: r[0],
    t: pad(r[1]),
    e: pad(r[2]),
    tr: r[3],
    title: r[4],
    sp: r[5],
    room: r[6],
    lvl: r[7],
    fmt: r[8],
    day: d.k,
  }));
});

// Talk ids used to be built from time, track and title. They are now
// Sessionize session ids; move marks and notes saved under the old ids.
function migrateIds(obj) {
  let changed = false;
  for (const [old, id] of Object.entries(LEGACY_IDS)) {
    if (!(old in obj)) continue;
    if (!(id in obj)) obj[id] = obj[old];
    delete obj[old];
    changed = true;
  }
  return changed;
}
const ALL = DAYS.flatMap((d) => d.S);
const BYID = Object.fromEntries(ALL.map((s) => [s.id, s]));

let marks = {},
  sel = new Set(),
  view = "all",
  tab = null,
  mineView = "all";
try {
  const m = localStorage.getItem("kc-tue-marks");
  if (m) marks = JSON.parse(m);
  else
    JSON.parse(localStorage.getItem("kc-tue-picks") || "[]").forEach(
      (id) => (marks[id] = "go"),
    );
} catch (e) {}
try {
  localStorage.removeItem("kc-tue-sel");
} catch (e) {}
const saveLocal = () => {
  try {
    localStorage.setItem("kc-tue-marks", JSON.stringify(marks));
    localStorage.setItem("kc-tue-sel", JSON.stringify([...sel]));
  } catch (e) {}
};
if (migrateIds(marks)) saveLocal();
// Marks and notes are kept in this browser (localStorage); there is no cross-device sync.
function save() {
  saveLocal();
}

// ---------- sign-in ----------
// The schedule is public. Marking talks, notes and "My talks" need sign-in.
let signedIn = false;
let auth = null;
function setSync(cls, text) {
  const el = document.getElementById("sync");
  el.className = "sync " + cls;
  el.textContent = text;
}
function applyAuth() {
  document.body.classList.toggle("signed-in", signedIn);
  const btn = document.getElementById("authBtn");
  btn.hidden = !auth;
  btn.textContent = signedIn ? "Sign out" : "Sign in";
  if (!signedIn) {
    view = "all";
    if (openId) closeNotes();
  }
}
async function startAuth() {
  setSync("busy", "Checking sign-in…");
  try {
    auth = await initAuth();
  } catch (e) {
    console.error("Sign-in check failed", e);
    auth = null;
    setSync("err", "Couldn’t check sign-in · reload to try again");
    return;
  }
  signedIn = !!auth.user;
  if (signedIn) {
    const who = auth.user.name || auth.user.email || "you";
    setSync(
      "ok",
      `Signed in as ${who} · marks and notes are saved in this browser`,
    );
  } else {
    setSync("", "Sign in to mark talks and take notes");
  }
  applyAuth();
  readHash();
  render();
}
document.getElementById("authBtn").addEventListener("click", () => {
  if (!auth) return;
  if (signedIn) auth.logout();
  else auth.login();
});
const mins = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fmt = (t) => {
  let [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
};
const esc = (s) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const cvar = (tr) => `--c:var(--${tr});--cs:var(--${tr}-s)`;

function denverNow() {
  let p;
  try {
    p = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
  } catch (e) {
    return null;
  }
  const g = (k) => p.find((x) => x.type === k).value;
  return {
    date: `${g("year")}-${g("month")}-${g("day")}`,
    min: (+g("hour") % 24) * 60 + +g("minute"),
  };
}
function defaultTab() {
  const n = denverNow();
  const d = n && DAYS.find((d) => d.date === n.date);
  return d ? d.k : "tue";
}
function readHash() {
  const h = location.hash.slice(1);
  tab =
    DAYS.some((d) => d.k === h) || (h === "mine" && signedIn)
      ? h
      : defaultTab();
}

function tabs() {
  const nGo = ALL.filter((s) => marks[s.id] === "go").length,
    nL = ALL.filter((s) => marks[s.id] === "later").length;
  const today = (denverNow() || {}).date;
  document.getElementById("tabs").innerHTML =
    DAYS.map(
      (d) =>
        `<button class="tab" id="tab-${d.k}" data-tab="${d.k}" aria-current="${tab === d.k ? "page" : "false"}">${d.label}<span>${d.long.split(", ")[1]}${d.date === today ? " · today" : ""}</span></button>`,
    ).join("") +
    `<button class="tab mine" id="tab-mine" data-tab="mine" aria-current="${tab === "mine" ? "page" : "false"}">My talks<span>${nGo} attending · ${nL} later</span></button>` +
    `<button class="tab gen-tab" id="tab-gen" data-note="general">General notes</button>`;
}
function chips(day) {
  return;
  const counts = {};
  day.S.forEach((s) => (counts[s.tr] = (counts[s.tr] || 0) + 1));
  document.getElementById("trackChips").innerHTML =
    ORDER.filter((k) => counts[k])
      .map(
        (k) =>
          `<button class="tchip" id="tc-${k}" data-k="${k}" style="${cvar(k)}" aria-pressed="${sel.has(k)}"><i></i>${TRACKS[k]} <span style="opacity:.6">${counts[k]}</span></button>`,
      )
      .join("") +
    (sel.size
      ? `<button class="tchip clear" id="tc-clear" data-k="clear">Show all tracks</button>`
      : "");
}
let resetStrip = null;
function render() {
  readHashOnce();
  tabs();
  const isMine = tab === "mine";
  document.getElementById("dayBar").hidden = isMine;
  document.getElementById("mineBar").hidden = !isMine;
  const list = document.getElementById("list");
  const keep = {};
  list
    .querySelectorAll(".strip[data-t]")
    .forEach((el) => (keep[el.dataset.t] = el.scrollLeft));
  if (isMine) {
    renderMine(list);
    return;
  }
  const day = DAYS.find((d) => d.k === tab);
  chips(day);
  document.getElementById("dayTitle").textContent = day.long;
  const rows = day.S.filter(
    (s) =>
      (!sel.size || sel.has(s.tr)) && (view === "all" || marks[s.id] === view),
  );
  const now = denverNow();
  const n = now && now.date === day.date ? now.min : null;
  const slots = [];
  if (view === "all")
    day.notes.forEach((x) => slots.push({ t: x[0], e: x[1], note: x[2] }));
  [...new Set(rows.map((s) => s.t))].forEach((t) => {
    const rank = (s) =>
      marks[s.id] === "go" ? 0 : marks[s.id] === "later" ? 1 : 2;
    const ss = rows
      .filter((s) => s.t === t)
      .sort(
        (a, b) =>
          rank(a) - rank(b) || ORDER.indexOf(a.tr) - ORDER.indexOf(b.tr),
      );
    slots.push({
      t,
      e: ss.map((s) => s.e).sort((a, b) => mins(a) - mins(b))[0],
      sessions: ss,
    });
  });
  slots.sort((a, b) => mins(a.t) - mins(b.t) || (a.note ? -1 : 1));
  if (!rows.length && view !== "all") {
    list.innerHTML = `<div class="empty">Nothing marked “${view === "go" ? "Attend" : "Later"}” on ${day.long}. Switch to “All sessions” and use the buttons on each session.</div>`;
  } else
    list.innerHTML = slots
      .map((sl) => {
        let body;
        if (sl.note === "kn")
          body = `<div class="full"><div class="kn"><h2>Keynotes <span>· Salt Palace L1, Hall DE</span></h2><ol>${day.key.map((k) => `<li><time>${fmt(k[0])}</time><div>${esc(k[1])}<div class="who">${esc(k[2])}</div></div></li>`).join("")}</ol></div></div>`;
        else if (sl.note)
          body = `<div class="full"><div class="note">${sl.note}</div></div>`;
        else
          body = `<div class="strip" data-t="${sl.t}">${sl.sessions.map(card).join("")}</div>`;
        const live = n != null && n >= mins(sl.t) && n < mins(sl.e);
        const att = sl.sessions
          ? day.S.filter(
              (s) =>
                marks[s.id] === "go" &&
                mins(s.t) <= mins(sl.t) &&
                mins(sl.t) < mins(s.e),
            )
          : [];
        const clash =
          att.length > 1
            ? `<div class="clash">Conflict: you're attending ${att.length} sessions at once here</div>`
            : "";
        const cnt = sl.sessions
          ? `<span class="hint">${sl.sessions.length} at once</span>`
          : "";
        const endTxt =
          sl.e && sl.e !== sl.t
            ? `<span class="end">to ${fmt(sl.e)}</span>`
            : "";
        return `<section class="slot${live ? " now" : ""}"><div class="time">${fmt(sl.t)}${endTxt}${cnt}${live ? "<small>Now</small>" : ""}</div>${body}${clash}</section>`;
      })
      .join("");
  list.querySelectorAll(".strip[data-t]").forEach((el) => {
    if (el.dataset.t === resetStrip) el.scrollLeft = 0;
    else if (keep[el.dataset.t]) el.scrollLeft = keep[el.dataset.t];
  });
  resetStrip = null;
  const nGo = day.S.filter((s) => marks[s.id] === "go").length,
    nL = day.S.filter((s) => marks[s.id] === "later").length;
  document.getElementById("count").textContent =
    `${day.label}: ${nGo} attending · ${nL} check later · ${day.S.length} sessions`;
  document
    .querySelectorAll("#viewSeg button")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === view));
}
function renderMine(list) {
  document
    .querySelectorAll("#mineSeg button")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === mineView));
  const want = (s) =>
    mineView === "all"
      ? !!marks[s.id]
      : mineView === "notes"
        ? hasNotes(s.id)
        : marks[s.id] === mineView;
  const any = ALL.some(want);
  const g = hasNotes("general")
    ? pend.general
      ? pend.general.text
      : notes.general
    : "";
  const gen = `<section class="gen"><div class="gen-h"><h2>General notes</h2><button class="nbtn gen-b${g ? " has" : ""}" id="nb-general" data-note="general">${g ? "Edit" : "Add general notes"}</button></div>${g ? notesHTML(g) : `<p class="gen-empty">Notes that aren’t about one talk: hallway conversations, booths to revisit, people to follow up with, takeaways for your team.</p>`}</section>`;
  if (!any) {
    list.innerHTML =
      gen +
      (mineView === "notes"
        ? `<div class="empty">No notes yet. Use “Add notes” on any session.</div>`
        : `<div class="empty">No talks marked${mineView === "go" ? " Attend" : mineView === "later" ? " Later" : ""} yet. Open a day and use the Attend or Later buttons on a session.</div>`);
    return;
  }
  list.innerHTML =
    gen +
    DAYS.map((d) => {
      const ss = d.S.filter(want).sort(
        (a, b) =>
          mins(a.t) - mins(b.t) || ORDER.indexOf(a.tr) - ORDER.indexOf(b.tr),
      );
      if (!ss.length) return "";
      const nGo = ss.filter((s) => marks[s.id] === "go").length,
        nL = ss.filter((s) => marks[s.id] === "later").length;
      return `<section class="mday"><h2><button class="daylink" data-tab="${d.k}">${d.long}</button><span>${[nGo ? `${nGo} attending` : "", nL ? `${nL} later` : ""].filter(Boolean).join(" · ")}</span></h2><ol class="mlist">${ss
        .map((s) => {
          const clash =
            marks[s.id] === "go" &&
            d.S.some(
              (o) =>
                o !== s &&
                marks[o.id] === "go" &&
                mins(o.t) < mins(s.e) &&
                mins(s.t) < mins(o.e),
            );
          return `<li class="mrow ${marks[s.id]}" style="${cvar(s.tr)}"><time>${fmt(s.t)}<span>${fmt(s.e)}</span></time><div class="mbody"><button class="title tlink" id="db-${s.id}" data-detail="${s.id}" title="Show details">${esc(s.title)}</button><span class="sp">${esc(s.sp)}</span><span class="meta"><span class="chip">${esc(s.tr === "M" || s.tr === "Z" ? s.fmt : TRACKS[s.tr])}</span><span class="chip${s.room.startsWith("Hyatt") ? " hyatt" : " plain"}">${esc(s.room)}</span>${clash ? `<span class="chip clashchip">Overlaps another talk</span>` : ""}</span></div><div class="side">${markBtns(s)}</div>${hasNotes(s.id) ? notesHTML(pend[s.id] ? pend[s.id].text : notes[s.id]) : ""}</li>`;
        })
        .join("")}</ol></section>`;
    }).join("");
}
function markBtns(s) {
  const m = marks[s.id] || "";
  return `<span class="marks"><button class="mk go" id="go-${s.id}" data-id="${s.id}" data-m="go" aria-pressed="${m === "go"}">${m === "go" ? "✓ Attend" : "Attend"}</button><button class="mk later" id="lt-${s.id}" data-id="${s.id}" data-m="later" aria-pressed="${m === "later"}">${m === "later" ? "✓ Later" : "Later"}</button></span><button class="nbtn${hasNotes(s.id) ? " has" : ""}" id="nb-${s.id}" data-note="${s.id}">Notes</button>`;
}
function card(s) {
  const m = marks[s.id] || "";
  const hy = s.room.startsWith("Hyatt");
  const special = s.tr === "M" || s.tr === "Z";
  const badge = m
    ? `<span class="badge ${m}">${m === "go" ? "Attending" : "Check later"}</span>`
    : "";
  return `<div class="card ${m}" style="${cvar(s.tr)}">${badge}<button class="title tlink" id="db-${s.id}" data-detail="${s.id}" title="Show details">${esc(s.title)}</button><span class="sp">${esc(s.sp)}</span><span class="meta"><span class="chip">${esc(special ? s.fmt : TRACKS[s.tr])}</span><span class="chip${hy ? " hyatt" : " plain"}">${esc(s.room)}</span>${s.lvl ? `<span class="chip plain">${s.lvl}</span>` : ""}${!special && s.fmt ? `<span class="chip plain">${s.fmt}</span>` : ""}</span>${markBtns(s)}</div>`;
}
let hashRead = false;
function readHashOnce() {
  if (!hashRead) {
    readHash();
    hashRead = true;
  }
}
document.getElementById("list").addEventListener("click", (e) => {
  const dl = e.target.closest("button.daylink");
  if (dl) {
    tab = dl.dataset.tab;
    hashRead = true;
    try {
      history.replaceState(null, "", "#" + tab);
    } catch (err) {}
    render();
    window.scrollTo(0, 0);
    return;
  }
  const db = e.target.closest("button[data-detail]");
  if (db) {
    openDetails(db.dataset.detail);
    return;
  }
  const nb = e.target.closest("button[data-note]");
  if (nb) {
    openNotes(nb.dataset.note);
    return;
  }
  const b = e.target.closest("button.mk");
  if (!b || !signedIn) return;
  const id = b.dataset.id,
    m = b.dataset.m;
  if (marks[id] === m) delete marks[id];
  else marks[id] = m;
  if (marks[id] && BYID[id]) resetStrip = BYID[id].t;
  render();
  save();
});
document.getElementById("trackChips")?.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const k = b.dataset.k;
  if (k === "clear") sel.clear();
  else sel.has(k) ? sel.delete(k) : sel.add(k);
  saveLocal();
  render();
});
document.getElementById("viewSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  view = b.dataset.v;
  render();
});
document.getElementById("mineSeg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  mineView = b.dataset.v;
  render();
});
document.getElementById("tabs").addEventListener("click", (e) => {
  const nb = e.target.closest("button[data-note]");
  if (nb) {
    openNotes(nb.dataset.note);
    return;
  }
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  if (b.dataset.tab === "mine" && !signedIn) return;
  tab = b.dataset.tab;
  hashRead = true;
  try {
    history.replaceState(null, "", "#" + tab);
  } catch (err) {}
  render();
  window.scrollTo(0, 0);
});
window.addEventListener("hashchange", () => {
  readHash();
  render();
  window.scrollTo(0, 0);
});

// ---------- notes (kept in this browser, one entry per talk) ----------
let notesCol = null,
  notesReady = false,
  notesErr = "";
const notes = {}; // id -> saved text
const pend = {}; // id -> {timer, writing, dirty, text, state}
let openId = null;

function notesStatus(id) {
  const p = pend[id];
  if (!notesCol)
    return {
      cls: "err",
      text: notesErr || "Notes can’t be saved in this browser",
    };
  if (!p)
    return notes[id]
      ? { cls: "ok", text: "Saved in this browser" }
      : { cls: "", text: "Notes save in this browser as you type" };
  return {
    cls: p.state === "ok" ? "ok" : p.state === "err" ? "err" : "busy",
    text: p.msg,
  };
}
function paintStatus() {
  if (!openId) return;
  const st = notesStatus(openId);
  const el = document.getElementById("npStatus");
  el.className = "np-status " + st.cls;
  el.textContent = st.text;
}
function hasNotes(id) {
  const p = pend[id];
  const t = p ? p.text : notes[id];
  return !!(t && t.trim());
}

function scheduleNote(id, text) {
  const p =
    pend[id] ||
    (pend[id] = {
      timer: null,
      writing: false,
      dirty: false,
      text: "",
      state: "busy",
      msg: "",
    });
  p.text = text;
  p.dirty = true;
  p.state = "busy";
  p.msg = "Not saved yet…";
  clearTimeout(p.timer);
  p.timer = setTimeout(() => flushNote(id), 800);
  paintStatus();
}
async function flushNote(id, attempt = 0) {
  const p = pend[id];
  if (!p || !notesCol || p.writing || !p.dirty) return;
  p.writing = true;
  p.dirty = false;
  const text = p.text;
  p.msg = "Saving…";
  paintStatus();
  try {
    const ref = notesCol.doc(id);
    if (text.trim())
      await ref.set({ text, talk: id, updatedAt: new Date().toISOString() });
    else await ref.delete();
    if (text.trim()) notes[id] = text;
    else delete notes[id];
    p.writing = false;
    if (p.dirty) {
      flushNote(id);
      return;
    }
    const t = new Date();
    p.state = "ok";
    p.msg = `Saved in this browser · ${t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    paintStatus();
    render();
  } catch (e) {
    p.writing = false;
    p.dirty = true;
    const code = e && e.code;
    if (
      (code === "unavailable" || code === "resource_exhausted") &&
      attempt < 6
    ) {
      p.state = "busy";
      p.msg = "Not saved yet · retrying";
      paintStatus();
      setTimeout(
        () => flushNote(id, attempt + 1),
        1500 * (attempt + 1) + Math.random() * 1000,
      );
    } else {
      p.state = "err";
      p.msg =
        code === "quota_exceeded"
          ? "Not saved: browser storage is full"
          : "Not saved. Your text is still here; keep this panel open and try again";
      paintStatus();
    }
  }
}
function anyUnsaved() {
  return Object.values(pend).some((p) => p.dirty || p.writing);
}
window.addEventListener("beforeunload", (e) => {
  if (anyUnsaved()) {
    e.preventDefault();
    e.returnValue = "";
  }
});

const NOTES_KEY = "kc-notes";
function startNotes() {
  try {
    Object.assign(notes, JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"));
  } catch (e) {}
  const persist = () => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
      throw { code: "quota_exceeded" };
    }
  };
  if (migrateIds(notes)) {
    try {
      persist();
    } catch (e) {}
  }
  notesCol = {
    doc: (id) => ({
      set: async (v) => {
        notes[id] = v.text;
        persist();
      },
      delete: async () => {
        delete notes[id];
        persist();
      },
    }),
  };
  notesReady = true;
}

function openNotes(id) {
  const s = BYID[id];
  if (!signedIn || (!s && id !== "general")) return;
  openId = id;
  if (s) {
    const day = DAYS.find((d) => d.k === s.day);
    document.getElementById("npTitle").textContent = s.title;
    document.getElementById("npMeta").textContent =
      `${day.label} ${fmt(s.t)}–${fmt(s.e)} · ${s.room} · ${s.sp}`;
  }
  document.getElementById("npToDetails").hidden = !s;
  if (narrow()) closeDetails(true);
  if (!s) {
    document.getElementById("npTitle").textContent = "General notes";
    document.getElementById("npMeta").textContent =
      "KubeCon + CloudNativeCon NA 2026 · Salt Lake City · Nov 10–12";
  }
  const ta = document.getElementById("npText");
  ta.value = pend[id] ? pend[id].text : notes[id] || "";
  ta.disabled = !notesCol || !notesReady;
  const panel = document.getElementById("notesPanel");
  panel.hidden = false;
  document.body.classList.add("np-open");
  paintStatus();
  if (!ta.disabled)
    setTimeout(() => {
      ta.focus();
      if (!ta.value) {
        ta.value = "- ";
        ta.setSelectionRange(2, 2);
      }
    }, 30);
}
const narrow = () => window.innerWidth < 1000;
let detId = null;
function openDetails(id) {
  const s = BYID[id];
  if (!s) return;
  detId = id;
  const day = DAYS.find((d) => d.k === s.day);
  document.getElementById("dpTitle").textContent = s.title;
  document.getElementById("dpMeta").textContent =
    `${day.label} ${fmt(s.t)}–${fmt(s.e)} · ${s.room} · ${s.sp}`;
  const t = DESC[id];
  const m =
    marks[id] === "go"
      ? "Attending"
      : marks[id] === "later"
        ? "Check later"
        : "";
  document.getElementById("dpBody").innerHTML =
    (m ? `<p class="dp-mark">${m}</p>` : "") +
    (t
      ? descHTML(t)
      : `<p class="dp-none">The official schedule has no description for this session.</p>`);
  document.getElementById("dpToNotes").textContent = hasNotes(id)
    ? "✎ Notes"
    : "Notes";
  if (narrow() && openId) closeNotes();
  const pnl = document.getElementById("detailsPanel");
  pnl.hidden = false;
  pnl.scrollTop = 0;
  document.getElementById("dpBody").scrollTop = 0;
  document.body.classList.add("dp-open");
  document.getElementById("dpClose").focus({ preventScroll: true });
}
function closeDetails(silent) {
  if (!detId) return;
  const id = detId;
  detId = null;
  document.getElementById("detailsPanel").hidden = true;
  document.body.classList.remove("dp-open");
  if (!silent) {
    const b = document.getElementById("db-" + id);
    if (b) b.focus();
  }
}
function closeNotes() {
  if (!openId) return;
  const id = openId;
  const p = pend[id];
  if (p && p.dirty) {
    clearTimeout(p.timer);
    flushNote(id);
  }
  // drop a lone "- " starter that was never typed into
  openId = null;
  document.getElementById("notesPanel").hidden = true;
  document.body.classList.remove("np-open");
  const b = document.getElementById("nb-" + id);
  if (b) b.focus();
}

// --- outline editing helpers for the textarea ---
function lineBounds(v, a, b) {
  const s = v.lastIndexOf("\n", a - 1) + 1;
  let e = v.indexOf("\n", b);
  if (e < 0) e = v.length;
  return [s, e];
}
function replaceRange(ta, s, e, text, selS, selE) {
  ta.focus();
  ta.setSelectionRange(s, e);
  let ok = false;
  try {
    ok = document.execCommand("insertText", false, text);
  } catch (err) {}
  if (!ok || ta.value.slice(s, s + text.length) !== text) {
    ta.setRangeText(text, s, e, "end");
  }
  ta.setSelectionRange(selS, selE);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}
function shiftLines(ta, dir) {
  const v = ta.value,
    a = ta.selectionStart,
    b = ta.selectionEnd;
  const [s, e] = lineBounds(v, a, b);
  const lines = v.slice(s, e).split("\n");
  let dA = 0,
    dTot = 0;
  const out = lines.map((ln, i) => {
    if (dir > 0) {
      const nl = /^\s*[-*] /.test(ln) || !ln.trim() ? "  " + ln : "  " + ln;
      if (i === 0) dA = 2;
      dTot += 2;
      return nl;
    }
    const m = ln.match(/^( {1,2}|\t)/);
    if (!m) return ln;
    if (i === 0) dA = -m[0].length;
    dTot -= m[0].length;
    return ln.slice(m[0].length);
  });
  replaceRange(
    ta,
    s,
    e,
    out.join("\n"),
    Math.max(s, a + dA),
    Math.max(s, b + dTot),
  );
}
function toggleBullets(ta) {
  const v = ta.value,
    a = ta.selectionStart,
    b = ta.selectionEnd;
  const [s, e] = lineBounds(v, a, b);
  const lines = v.slice(s, e).split("\n");
  const all = lines.every((l) => /^\s*[-*] /.test(l) || !l.trim());
  let d0 = 0,
    dT = 0;
  const out = lines.map((l, i) => {
    if (all) {
      const m = l.match(/^(\s*)[-*] /);
      if (!m) return l;
      if (i === 0) d0 = -2;
      dT -= 2;
      return m[1] + l.slice(m[0].length);
    }
    if (/^\s*[-*] /.test(l)) return l;
    const m = l.match(/^(\s*)/);
    if (i === 0) d0 = 2;
    dT += 2;
    return m[1] + "- " + l.slice(m[1].length);
  });
  replaceRange(
    ta,
    s,
    e,
    out.join("\n"),
    Math.max(s, a + d0),
    Math.max(s, b + dT),
  );
}
function onNoteKey(e) {
  const ta = e.target;
  if (e.key === "Tab") {
    e.preventDefault();
    shiftLines(ta, e.shiftKey ? -1 : 1);
    return;
  }
  if (
    e.key === "Enter" &&
    !e.shiftKey &&
    !e.isComposing &&
    ta.selectionStart === ta.selectionEnd
  ) {
    const v = ta.value,
      c = ta.selectionStart;
    const [s, eol] = lineBounds(v, c, c);
    const line = v.slice(s, eol);
    const m = line.match(/^(\s*)([-*]) (.*)$/);
    if (!m) return;
    e.preventDefault();
    if (!m[3].trim() && c === eol) {
      if (m[1].length) {
        shiftLines(ta, -1);
      } // empty sub-bullet: step out a level
      else replaceRange(ta, s, eol, "", s, s); // empty top bullet: end the list
      return;
    }
    const ins = "\n" + m[1] + m[2] + " ";
    replaceRange(ta, c, c, ins, c + ins.length, c + ins.length);
  }
}

// --- render saved notes as a nested list ---
function descHTML(t) {
  return t
    .split(/\n{2,}/)
    .map((par) =>
      /^\s*- /m.test(par)
        ? notesHTML(par).replace('class="nview"', 'class="dlist"')
        : `<p>${esc(par).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}
function notesHTML(text) {
  let html = "",
    depth = -1;
  const closeAll = () => {
    while (depth >= 0) {
      html += "</li></ul>";
      depth--;
    }
  };
  for (const raw of text.replace(/\t/g, "  ").split("\n")) {
    const m = raw.match(/^(\s*)[-*] (.*)$/);
    if (m) {
      let lvl = Math.min(Math.floor(m[1].length / 2), depth + 1);
      const t = esc(m[2]);
      if (lvl === depth + 1) {
        html += "<ul><li>" + t;
        depth = lvl;
      } else {
        while (depth > lvl) {
          html += "</li></ul>";
          depth--;
        }
        html += "</li><li>" + t;
      }
    } else if (raw.trim()) {
      closeAll();
      html += "<p>" + esc(raw.trim()) + "</p>";
    }
  }
  closeAll();
  return `<div class="nview">${html}</div>`;
}

// --- export everything as Markdown ---
function exportMarkdown() {
  const L = ["# KubeCon NA 2026: my talks and notes", ""];
  const gt = (pend.general ? pend.general.text : notes.general) || "";
  if (gt.trim()) L.push("## General notes", "", gt.trimEnd(), "");
  DAYS.forEach((d) => {
    const ss = d.S.filter((s) => marks[s.id] || hasNotes(s.id)).sort(
      (a, b) => mins(a.t) - mins(b.t),
    );
    if (!ss.length) return;
    L.push(`## ${d.long}`, "");
    ss.forEach((s) => {
      const m =
        marks[s.id] === "go"
          ? "Attending"
          : marks[s.id] === "later"
            ? "Check later"
            : "Not marked";
      L.push(
        `### ${fmt(s.t)}–${fmt(s.e)} · ${s.title}`,
        `*${m}* · ${s.room} · ${s.sp}`,
        "",
      );
      const t = (pend[s.id] ? pend[s.id].text : notes[s.id]) || "";
      if (t.trim()) L.push(t.trimEnd(), "");
    });
  });
  return L.join("\n");
}
function doExport() {
  const msg = document.getElementById("exportMsg");
  const url = URL.createObjectURL(
    new Blob([exportMarkdown()], { type: "text/markdown" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "kubecon-na-2026-my-talks.md";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  msg.textContent = "Downloaded.";
}
async function doCopy() {
  const msg = document.getElementById("exportMsg");
  const md = exportMarkdown();
  try {
    await navigator.clipboard.writeText(md);
    msg.textContent = "Copied as Markdown.";
  } catch (e) {
    msg.textContent = "Copy isn’t allowed here.";
  }
}
document.getElementById("npText").addEventListener("keydown", onNoteKey);
document.getElementById("npText").addEventListener("input", (e) => {
  if (openId) scheduleNote(openId, e.target.value);
});
document.getElementById("npClose").addEventListener("click", closeNotes);
document
  .getElementById("npBullet")
  .addEventListener("click", () =>
    toggleBullets(document.getElementById("npText")),
  );
document
  .getElementById("npIndent")
  .addEventListener("click", () =>
    shiftLines(document.getElementById("npText"), 1),
  );
document
  .getElementById("npOutdent")
  .addEventListener("click", () =>
    shiftLines(document.getElementById("npText"), -1),
  );
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (openId) closeNotes();
  else if (detId) closeDetails();
});
document
  .getElementById("dpClose")
  .addEventListener("click", () => closeDetails());
document.getElementById("dpToNotes").addEventListener("click", () => {
  const id = detId;
  if (id) openNotes(id);
});
document.getElementById("npToDetails").addEventListener("click", () => {
  const id = openId;
  if (id && BYID[id]) openDetails(id);
});
document.getElementById("exportBtn").addEventListener("click", doExport);
document.getElementById("copyBtn").addEventListener("click", doCopy);

startNotes();
applyAuth();
render();
startAuth();
const nw = document.querySelector(".slot.now");
if (nw) setTimeout(() => nw.scrollIntoView({ block: "center" }), 50);
setInterval(render, 60000);
