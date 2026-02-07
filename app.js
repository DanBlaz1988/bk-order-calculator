const STORAGE_KEY = "bk_bread_salad_order_v1";

const items = [
  { nr: 10,  name: '5" Bun',        normalPack: 20, reservePack: 30 },
  { nr: 20,  name: '4" Bun',        normalPack: 60, reservePack: 48 },
  { nr: 39,  name: '7" Bun',        normalPack: 48, reservePack: 32 },
  { nr: 916, name: "Eisbergsalat (kg)", normalPack: 6,  reservePack: 6  },
  { nr: 910, name: "Tomaten (kg)",      normalPack: 5,  reservePack: 5  },
  { nr: 912, name: "Zwiebeln (kg)",     normalPack: 20, reservePack: 20 },
];

const els = {
  plannedUmsatz: document.getElementById("plannedUmsatz"),
  yesterdayUmsatz: document.getElementById("yesterdayUmsatz"),
  tbody: document.getElementById("tbody"),
  btnSave: document.getElementById("btnSave"),
  btnLoad: document.getElementById("btnLoad"),
  btnReset: document.getElementById("btnReset"),
  btnClearSaved: document.getElementById("btnClearSaved"),
};

function n(v){
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function fmt(v, decimals=2){
  if (!Number.isFinite(v)) return "0";
  return v.toFixed(decimals);
}
function fmt0(v){
  if (!Number.isFinite(v)) return "0";
  // ако е близу цел број -> прикажи без децимали
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-9) return String(r);
  return String(v);
}
function ceilDiv(a,b){
  if (b <= 0) return 0;
  return Math.ceil(a / b);
}

function buildRow(item){
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${item.nr}</td>
    <td>${item.name}</td>
    <td>${fmt0(item.normalPack)}</td>
    <td>${fmt0(item.reservePack)}</td>

    <td><input class="num" type="number" inputmode="decimal" data-k="yUsed" placeholder="0"/></td>
    <td><span class="out zero" data-k="pro1000">0.00</span></td>

    <td><input class="num" type="number" inputmode="decimal" data-k="workStock" placeholder="0"/></td>
    <td><input class="num" type="number" inputmode="decimal" data-k="tkStock" placeholder="0"/></td>

    <td><input class="num" type="number" inputmode="decimal" data-k="inc1" placeholder="0"/></td>
    <td><input class="num" type="number" inputmode="decimal" data-k="inc2" placeholder="0"/></td>
    <td><span class="out zero" data-k="incUnits">0</span></td>

    <td><span class="out zero" data-k="needed">0</span></td>
    <td><span class="out zero" data-k="available">0</span></td>
    <td><span class="out zero" data-k="toOrderUnits">0</span></td>
    <td><span class="out zero" data-k="toOrderPacks">0</span></td>
    <td><span class="out zero" data-k="surplus">0</span></td>
  `;

  // attach listeners
  tr.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => recalc());
  });

  return tr;
}

function init(){
  items.forEach(item => {
    const tr = buildRow(item);
    tr.dataset.nr = String(item.nr);
    els.tbody.appendChild(tr);
  });

  els.plannedUmsatz.addEventListener("input", recalc);
  els.yesterdayUmsatz.addEventListener("input", recalc);

  els.btnSave.addEventListener("click", saveState);
  els.btnLoad.addEventListener("click", loadState);
  els.btnReset.addEventListener("click", resetInputs);
  els.btnClearSaved.addEventListener("click", clearSaved);

  // IMPORTANT: стартува празно (НЕ автолоад)
  recalc();
}

function getRowState(tr){
  const get = (k) => n(tr.querySelector(`[data-k="${k}"]`).value);
  return {
    yUsed: get("yUsed"),
    workStock: get("workStock"),
    tkStock: get("tkStock"),
    inc1: get("inc1"),
    inc2: get("inc2"),
  };
}

function setRowState(tr, st){
  const set = (k, v) => { tr.querySelector(`[data-k="${k}"]`).value = (v ?? ""); };
  set("yUsed", st.yUsed ?? "");
  set("workStock", st.workStock ?? "");
  set("tkStock", st.tkStock ?? "");
  set("inc1", st.inc1 ?? "");
  set("inc2", st.inc2 ?? "");
}

function setOut(tr, k, val, decimals=null){
  const el = tr.querySelector(`[data-k="${k}"]`);
  let text = "0";
  if (decimals === null) text = fmt0(val);
  else text = fmt(val, decimals);

  el.textContent = text;

  const isZero = Math.abs(n(val)) < 1e-9;
  el.classList.toggle("zero", isZero);
}

function recalc(){
  const planned = n(els.plannedUmsatz.value);
  const yUms = n(els.yesterdayUmsatz.value);

  els.tbody.querySelectorAll("tr").forEach(tr => {
    const nr = Number(tr.dataset.nr);
    const item = items.find(i => i.nr === nr);
    const st = getRowState(tr);

    // pro1000
    const pro1000 = (yUms > 0) ? (st.yUsed / yUms) * 1000 : 0;

    // needed units
    const needed = planned * pro1000;

    // incoming units: user enters packs (normal packs), we convert to units
    const incPacks = st.inc1 + st.inc2;
    const incUnits = incPacks * item.normalPack;

    // available units
    const available = st.workStock - st.tkStock + incUnits;

    // to order
    const toOrderUnits = Math.max(0, needed - available);
    const toOrderPacks = ceilDiv(toOrderUnits, item.normalPack);

    const surplus = available - needed;

    setOut(tr, "pro1000", pro1000, 2);
    setOut(tr, "incUnits", incUnits, null);
    setOut(tr, "needed", needed, null);
    setOut(tr, "available", available, null);
    setOut(tr, "toOrderUnits", toOrderUnits, null);
    setOut(tr, "toOrderPacks", toOrderPacks, null);
    setOut(tr, "surplus", surplus, null);
  });
}

function saveState(){
  const data = {
    plannedUmsatz: els.plannedUmsatz.value ?? "",
    yesterdayUmsatz: els.yesterdayUmsatz.value ?? "",
    rows: {}
  };

  els.tbody.querySelectorAll("tr").forEach(tr => {
    data.rows[tr.dataset.nr] = getRowState(tr);
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  els.plannedUmsatz.value = data.plannedUmsatz ?? "";
  els.yesterdayUmsatz.value = data.yesterdayUmsatz ?? "";

  els.tbody.querySelectorAll("tr").forEach(tr => {
    const st = data.rows?.[tr.dataset.nr];
    if (st) setRowState(tr, st);
  });

  recalc();
}

function resetInputs(){
  els.plannedUmsatz.value = "";
  els.yesterdayUmsatz.value = "";
  els.tbody.querySelectorAll("tr").forEach(tr => {
    setRowState(tr, {});
  });
  recalc();
}

function clearSaved(){
  localStorage.removeItem(STORAGE_KEY);
}

init();
