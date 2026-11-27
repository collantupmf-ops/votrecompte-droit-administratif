/* Questions de cours : liste avec réponses modèles dépliables. */
"use strict";

const PDF_URL = "Droit%20administratif%20global%20(avec%20index).pdf";

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

let DATA = null;
let ORDRE = [];

async function init() {
  const res = await fetch("data/cours.json");
  DATA = await res.json();
  const sel = document.getElementById("theme");
  for (const [k, name] of Object.entries(DATA.themes)) {
    const n = DATA.cours.filter(x => String(x.t) === String(k)).length;
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = name + " (" + n + " questions)";
    sel.appendChild(opt);
  }
  sel.addEventListener("change", afficher);
  document.getElementById("melanger").addEventListener("click", () => {
    ORDRE = shuffle(ORDRE);
    afficher();
  });
  document.getElementById("tout").addEventListener("click", () => {
    document.querySelectorAll(".reponse-cachee").forEach(r => r.classList.add("ouverte"));
  });
  ORDRE = DATA.cours.map(x => x.n);
  afficher();
}

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function afficher() {
  const k = document.getElementById("theme").value;
  const items = k === "all" ? DATA.cours : DATA.cours.filter(x => String(x.t) === String(k));
  const ids = new Set(items.map(x => x.n));
  ORDRE = ORDRE.filter(n => ids.has(n)).concat(
    items.map(x => x.n).filter(n => !ORDRE.includes(n)));
  const zone = document.getElementById("liste");
  zone.innerHTML = "";
  const cart = document.createElement("div");
  cart.className = "carte";
  for (const n of ORDRE) {
    const item = DATA.cours.find(x => x.n === n);
    const div = document.createElement("div");
    div.className = "qcm-item";
    const page = item.p;
    let renvoi = item.r ? escapeHTML(item.r) : "";
    if (page) {
      renvoi += ' — <a href="' + PDF_URL + '#page=' + page +
                '" target="_blank" rel="noopener">ouvrir la page ' + page + "</a>";
    }
    const extrait = item.x ? '<p class="renvoi extrait">Extrait : « ' + escapeHTML(item.x) + ' »</p>' : "";
    div.innerHTML =
      '<p class="q">' + escapeHTML(item.q) + "</p>" +
      '<button class="btn secondaire voir">Voir la réponse modèle</button>' +
      '<div class="reponse-cachee">' +
      '<p class="rep">' + escapeHTML(item.a) + "</p>" +
      (renvoi ? '<p class="renvoi">Renvoi au cours : ' + renvoi + "</p>" : "") +
      extrait +
      "</div>";
    cart.appendChild(div);
  }
  zone.appendChild(cart);
  cart.querySelectorAll(".voir").forEach(b => {
    b.addEventListener("click", () => {
      const rep = b.nextElementSibling;
      const ouvert = rep.classList.toggle("ouverte");
      b.textContent = ouvert ? "Masquer la réponse" : "Voir la réponse modèle";
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
