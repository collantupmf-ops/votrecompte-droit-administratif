/* Générateur de QCM : une question à la fois, réponse immédiate, renvoi au cours. */
"use strict";

const PDF_URL = "Droit%20administratif%20global%20(avec%20index).pdf";
const LETTRES = ["A", "B", "C", "D"];

const state = {
  data: null,
  pool: [],
  queue: [],
  current: 0,
  score: 0,
  selected: null,
  dataset: "qcm",
};

function $(id) { return document.getElementById(id); }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function bestKey(theme) {
  return "da_best_" + state.dataset + "_" + theme;
}

function renvoiHTML(item) {
  if (!item.r) return "";
  const page = item.pg || item.p;
  let html = "Renvoi au cours : " + escapeHTML(item.r);
  if (page) {
    html += ' — <a href="' + PDF_URL + '#page=' + page +
            '" target="_blank" rel="noopener">ouvrir la page ' + page + "</a>";
  }
  return '<p class="renvoi">' + html + "</p>";
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function init(dataset, file) {
  state.dataset = dataset;
  const res = await fetch(file);
  state.data = await res.json();
  const sel = $("theme");
  const items = dataset === "qcm" ? state.data.qcm : state.data.juris;
  const groupKey = dataset === "qcm" ? "t" : "p";
  const labels = dataset === "qcm" ? state.data.themes : state.data.parties;
  for (const [k, name] of Object.entries(labels)) {
    const n = items.filter(x => String(x[groupKey]) === String(k)).length;
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = name + " (" + n + " questions)";
    sel.appendChild(opt);
  }
  sel.addEventListener("change", updateLengths);
  $("lancer").addEventListener("click", start);
  updateLengths();
  afficherMeilleurs();
}

function themePool(k) {
  const items = state.dataset === "qcm" ? state.data.qcm : state.data.juris;
  const groupKey = state.dataset === "qcm" ? "t" : "p";
  if (k === "all") return items.slice();
  return items.filter(x => String(x[groupKey]) === String(k));
}

function updateLengths() {
  const k = $("theme").value;
  const n = themePool(k).length;
  const len = $("longueur");
  const olds = [...len.options].map(o => o.value);
  len.innerHTML = "";
  const choices = [20, 50, 100, n];
  const seen = new Set();
  for (const c of choices) {
    if (c > n || seen.has(c)) continue;
    seen.add(c);
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c === n ? "Tout le lot (" + c + " questions)" : c + " questions";
    len.appendChild(opt);
  }
  const optAll = document.createElement("option");
  optAll.value = n;
  optAll.textContent = "Tout (" + n + " questions)";
  if (!seen.has(n)) len.appendChild(optAll);
  len.value = String(Math.min(20, n));
}

function start() {
  const k = $("theme").value;
  const n = parseInt($("longueur").value, 10);
  state.pool = themePool(k);
  state.queue = shuffle(state.pool).slice(0, n);
  state.current = 0;
  state.score = 0;
  $("ecran-accueil").style.display = "none";
  $("ecran-fin").style.display = "none";
  $("ecran-question").style.display = "block";
  afficherQuestion();
}

function afficherQuestion() {
  state.selected = null;
  const item = state.queue[state.current];
  $("progression").style.width = (100 * state.current / state.queue.length) + "%";
  $("num").textContent = "Question " + (state.current + 1) + " / " + state.queue.length +
                         " — score : " + state.score;
  $("texte").textContent = item.q;
  const zone = $("options");
  zone.innerHTML = "";
  item.o.forEach((opt, k) => {
    const b = document.createElement("button");
    b.className = "option";
    b.innerHTML = '<span class="lettre">' + LETTRES[k] + '.</span> ' + escapeHTML(opt);
    b.addEventListener("click", () => repondre(k));
    zone.appendChild(b);
  });
  $("verdict").textContent = "";
  $("verdict").className = "verdict";
  $("renvoi").innerHTML = "";
  $("suivant").style.display = "none";
  $("suivant").textContent = state.current + 1 === state.queue.length
    ? "Voir le score" : "Question suivante";
}

function repondre(k) {
  if (state.selected !== null) return;
  state.selected = k;
  const item = state.queue[state.current];
  const ok = k === item.a;
  if (ok) state.score++;
  const boutons = [...$("options").children];
  boutons.forEach((b, i) => {
    b.disabled = true;
    if (i === item.a) b.classList.add("bonne");
    else if (i === k) b.classList.add("mauvaise");
  });
  const v = $("verdict");
  v.textContent = ok ? "✔ Bonne réponse !" : "✘ Mauvaise réponse — la bonne réponse était : " +
    LETTRES[item.a] + ".";
  v.className = "verdict " + (ok ? "ok" : "ko");
  $("renvoi").innerHTML = renvoiHTML(item);
  $("suivant").style.display = "inline-block";
}

function suivant() {
  state.current++;
  if (state.current >= state.queue.length) { fin(); return; }
  afficherQuestion();
}

function fin() {
  $("ecran-question").style.display = "none";
  $("ecran-fin").style.display = "block";
  const n = state.queue.length;
  const pct = Math.round(100 * state.score / n);
  $("score").textContent = state.score + " / " + n + " (" + pct + " %)";
  $("phrase-score").textContent =
    pct >= 80 ? "Excellent — le cours est bien maîtrisé." :
    pct >= 60 ? "Bon niveau — continuez sur les thèmes plus faibles." :
    pct >= 40 ? "Des bases à consolider : relisez les passages indiqués dans les corrigés." :
                "Reprenez le cours (passages indiqués dans les corrigés) puis réessayez.";
  const k = $("theme").value;
  const prev = parseInt(localStorage.getItem(bestKey(k)) || "0", 10);
  if (state.score > prev) {
    localStorage.setItem(bestKey(k), String(state.score));
    $("record").textContent = "Nouveau record pour ce thème !";
  } else {
    $("record").textContent = prev > 0 ? "Votre record sur ce thème : " + prev + " / " + n : "";
  }
  $("rejouer").onclick = () => {
    $("ecran-fin").style.display = "none";
    $("ecran-accueil").style.display = "block";
    afficherMeilleurs();
  };
}

function afficherMeilleurs() {
  const zone = $("records");
  zone.innerHTML = "";
  const labels = state.dataset === "qcm" ? state.data.themes : state.data.parties;
  let lignes = 0;
  for (const [k, name] of Object.entries(labels)) {
    const v = localStorage.getItem(bestKey(k));
    if (!v) continue;
    lignes++;
    const p = document.createElement("p");
    p.className = "muet";
    p.textContent = "Record — " + name + " : " + v;
    zone.appendChild(p);
  }
  if (lignes) {
    const h = document.createElement("h2");
    h.textContent = "Vos records (mémorisés dans ce navigateur)";
    zone.prepend(h);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("suivant").addEventListener("click", suivant);
  document.addEventListener("keydown", e => {
    if ($("ecran-question").style.display !== "block") return;
    if (state.selected === null) {
      const m = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
      const k = m[e.key.toLowerCase()];
      if (k !== undefined) { e.preventDefault(); repondre(k); }
    } else if (e.key === "Enter") {
      e.preventDefault(); suivant();
    }
  });
  init(window.QUIZ_DATASET, window.QUIZ_FILE);
});
