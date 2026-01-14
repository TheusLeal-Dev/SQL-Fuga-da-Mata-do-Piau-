// ==========================
// BANCO FAKE (Capítulo 2)
// ==========================

const rios = [
  { id_rio: 1, nome: "Parnaíba", distancia_km: 85 },
  { id_rio: 2, nome: "Poti",     distancia_km: 60 },
  { id_rio: 3, nome: "Longá",    distancia_km: 72 },
  { id_rio: 4, nome: "Canindé",  distancia_km: 8  }
];

const peixes = [
  { id_peixe: 1, nome: "Curimatã", rio: "Canindé", perigo: 0 },
  { id_peixe: 2, nome: "Traíra",   rio: "Canindé", perigo: 0 },
  { id_peixe: 3, nome: "Arraia",   rio: "Canindé", perigo: 1 },
  { id_peixe: 4, nome: "Piranhas", rio: "Canindé", perigo: 1 },
  { id_peixe: 5, nome: "Puraquê",  rio: "Canindé", perigo: 1 },
  { id_peixe: 6, nome: "Bagres",   rio: "Canindé", perigo: 1 },
  { id_peixe: 7, nome: "Mandis",   rio: "Canindé", perigo: 1 },
];

const rotasDefault = () => ([
  {
    id_rota: 1,
    titulo: "Rota do mapa",
    estrategia: "atravessar",
    destino: "Rio Canindé (travessia direta)",
    status: "ativa"
  },
  {
    id_rota: 2,
    titulo: "Rota alternativa",
    estrategia: "acompanhar",
    destino: "Seguir o curso do Rio Canindé (civilização)",
    status: "inativa"
  }
]);

let rotas = rotasDefault();

// ==========================
// UI
// ==========================

const storyText   = document.querySelector("#storyText");
const hintText    = document.querySelector("#hintText");
const missionText = document.querySelector("#missionText");

const sqlInput   = document.querySelector("#sqlInput");
const runBtn     = document.querySelector("#runBtn");
const resetBtn   = document.querySelector("#resetBtn");
const outputText = document.querySelector("#outputText");
const statusPill = document.querySelector("#statusPill");

const nextCard    = document.querySelector("#nextCard");
const nextBtn     = document.querySelector("#nextBtn");

const resultWrap  = document.querySelector("#resultWrap");
const emptyState  = document.querySelector("#emptyState");
const resultHead  = document.querySelector("#resultHead");
const resultBody  = document.querySelector("#resultBody");

// ==========================
// Progressão
// ==========================

let etapa = 1; // 1=rios, 2=peixes, 3=rotas, 4=ativar segura, vitória
let switchBtn = null;

// ==========================
// Helpers
// ==========================

function setStatus(type, text){
  statusPill.classList.remove("ok","bad");
  if(type === "ok") statusPill.classList.add("ok");
  if(type === "bad") statusPill.classList.add("bad");
  statusPill.textContent = text;
}

function normalize(sql){
  return sql.toLowerCase().replace(/\s+/g, " ").trim();
}

function contains(sqlN, part){
  return sqlN.includes(part);
}

function extractAllQuoted(sqlRaw){
  return [...sqlRaw.matchAll(/'([^']+)'/g)].map(m => m[1]);
}

function extractNumberAfter(sqlN, key){
  const m = sqlN.match(new RegExp(`${key}\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : null;
}

function resetResult(){
  resultWrap.style.display = "none";
  emptyState.style.display = "block";
  resultHead.innerHTML = "";
  resultBody.innerHTML = "";
}

function showTable(rows){
  if(!rows || rows.length === 0){
    resetResult();
    emptyState.textContent = "Sem resultados.";
    return;
  }

  emptyState.style.display = "none";
  resultWrap.style.display = "block";

  const cols = Object.keys(rows[0] ?? {});
  resultHead.innerHTML = cols.map(c => `<th>${c}</th>`).join("");
  resultBody.innerHTML = rows.map(r => {
    const tds = cols.map(c => `<td>${r[c]}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
}

function fail(msg){
  setStatus("bad", "Não foi ❌");
  outputText.textContent = msg;
  nextCard.hidden = true;
}

function ok(msg){
  setStatus("ok", "OK ✅");
  outputText.textContent = msg;
}

function rioMaisPerto(){
  return [...rios].sort((a,b) => a.distancia_km - b.distancia_km)[0];
}

function isCaninde(row){
  const n = String(row?.nome ?? "").toLowerCase();
  return n.includes("canind");
}

function rowsContainCaninde(rows){
  return (rows || []).some(r => isCaninde(r) || String(r?.rio ?? "").toLowerCase().includes("canind"));
}

function isDangerFish(p){
  return p.perigo === 1;
}

function safeRoute(){
  return rotas.find(r => r.estrategia.toLowerCase().includes("acompan"));
}

function isSafeRouteActive(){
  const r = safeRoute();
  if(!r) return false;
  return String(r.status).toLowerCase().includes("ativa");
}

// ==========================
// ✅ Botão "Ver peixes do Canindé"
// - Só aparece quando etapa=2
// - Some quando etapa>=3
// ==========================

function createSwitchButton(){
  if(switchBtn) return;

  switchBtn = document.createElement("button");
  switchBtn.id = "switchTableBtn";
  switchBtn.className = "ghost";
  switchBtn.style.marginLeft = "10px";
  switchBtn.textContent = "Ver peixes do Canindé";

  const actions = document.querySelector(".actions");
  actions.appendChild(switchBtn);

  switchBtn.addEventListener("click", () => {
    const peixesCaninde = peixes.filter(p => p.rio.toLowerCase().includes("canind"));
    showTable(peixesCaninde);

    hintText.textContent = "Agora você tá vendo os registros do Rio Canindé.";
    ok("Tabela trocada: peixes do Canindé.");
  });
}

function showSwitchButton(){
  createSwitchButton();
  switchBtn.style.display = "inline-flex";
}

function hideSwitchButton(){
  if(!switchBtn) return;
  switchBtn.style.display = "none";
}

// ==========================
// SELECT (flexível)
// ==========================

function runSelect(sqlRaw, sqlN){
  // rios
  if(contains(sqlN, "from rios")){
    let rows = [...rios];

    if(contains(sqlN, "order by") && contains(sqlN, "distancia_km")){
      const asc = !contains(sqlN, "desc");
      rows.sort((a,b) => asc ? a.distancia_km - b.distancia_km : b.distancia_km - a.distancia_km);
    }

    if(contains(sqlN, "limit 1")){
      rows = [rows.sort((a,b) => a.distancia_km - b.distancia_km)[0]];
    }

    if(contains(sqlN, "min(") && contains(sqlN, "distancia_km")){
      const p = rioMaisPerto();
      rows = [{ min_distancia_km: p.distancia_km }];
    }

    showTable(rows);

    const discovered =
      rowsContainCaninde(rows) ||
      (contains(sqlN, "min(") && contains(sqlN, "distancia_km")) ||
      (sqlN === "select * from rios;" || sqlN === "select * from rios");

    if(etapa === 1 && discovered){
      etapa = 2;
      const perto = rioMaisPerto();

      storyText.innerHTML =
        `Você analisa o mapa pelo terminal e percebe que o rio mais perto é <b>${perto.nome}</b> (<b>${perto.distancia_km} km</b>).
        <br><br>
        Você decide seguir nessa direção. Depois de um tempo andando, ouve água correndo…
        você chegou ao <b>Rio Canindé</b>.
        <br><br>
        A correnteza não parece segura. Antes de atravessar, você precisa entender o que vive ali.`;

      missionText.innerHTML =
        "<b>MISSÃO:</b> Analise os peixes do Rio Canindé e veja se existe perigo.";
      hintText.textContent = "Quando quiser, clique no botão pra ver os peixes do Canindé.";

      // ✅ agora o botão aparece SÓ aqui
      showSwitchButton();

      ok("Rios exibidos. Agora você pode puxar os peixes quando quiser.");
      return;
    }

    ok("Rios exibidos.");
    return;
  }

  // peixes
  if(contains(sqlN, "from peixes")){
    let rows = [...peixes];

    if(contains(sqlN, "where") && contains(sqlN, "rio")){
      const quoted = extractAllQuoted(sqlRaw);
      const rio = quoted[0] ?? null;
      if(rio){
        rows = rows.filter(p => p.rio.toLowerCase().includes(rio.toLowerCase()));
      }
    }

    if(contains(sqlN, "where") && contains(sqlN, "perigo")){
      if(/perigo\s*=\s*1/.test(sqlN) || /perigo\s*!=\s*0/.test(sqlN) || /perigo\s*<>\s*0/.test(sqlN)){
        rows = rows.filter(p => p.perigo === 1);
      }
      if(/perigo\s*=\s*0/.test(sqlN)){
        rows = rows.filter(p => p.perigo === 0);
      }
    }

    const like = sqlRaw.match(/nome\s+like\s+'([^']+)'/i);
    if(like){
      const pattern = like[1].replace(/%/g, "").toLowerCase();
      rows = rows.filter(p => p.nome.toLowerCase().includes(pattern));
    }

    showTable(rows);

    if(etapa < 2){
      return fail("Antes de mexer nos peixes, você ainda não provou que descobriu o rio mais perto.");
    }

    const sawCaninde = rowsContainCaninde(rows) || contains(sqlN, "canind");
    const sawDanger = rows.some(isDangerFish) || /perigo\s*=\s*1/.test(sqlN) || /perigo\s*!=\s*0/.test(sqlN);

    if(etapa === 2 && sawCaninde && sawDanger){
      etapa = 3;

      // ✅ passou da missão dos peixes -> botão some
      hideSwitchButton();

      storyText.innerHTML =
        `Você observa o rio com atenção… e percebe que tem coisa perigosa na água.
        <br><br>
        A travessia direta parece uma má ideia. Pelo mapa, existe uma rota que tenta atravessar…
        e outra que acompanha o curso do rio.`;

      missionText.innerHTML =
        "<b>MISSÃO:</b> Verifique as rotas e elimine a travessia perigosa.";
      hintText.textContent = "Talvez exista mais de um jeito de resolver…";

      ok("Perigo confirmado. Agora lide com as rotas.");
      return;
    }

    ok("Peixes exibidos.");
    return;
  }

  // rotas
  if(contains(sqlN, "from rotas")){
    showTable(rotas);
    ok(etapa < 3 ? "Rotas exibidas." : "Agora decide: atravessar ou acompanhar?");
    return;
  }

  fail("SELECT não reconhecido. Tente consultar rios, peixes ou rotas.");
}

// ==========================
// DELETE (flexível)
// ==========================

function runDelete(sqlRaw, sqlN){
  if(!contains(sqlN, "delete from rotas")){
    return fail("Nesse capítulo, o DELETE aceito é na tabela rotas.");
  }
  if(etapa < 3) return fail("Ainda não está na hora de mexer em rotas.");
  if(!contains(sqlN, "where")) return fail("Faltou WHERE.");

  if(contains(sqlN, "id_rota")){
    const id = extractNumberAfter(sqlN, "id_rota");
    if(!id) return fail("Não consegui ler o id_rota no WHERE.");

    const idx = rotas.findIndex(r => r.id_rota === id);
    if(idx === -1) return fail("Esse id_rota não existe.");

    const isTrav = rotas[idx].estrategia.toLowerCase().includes("atravess");
    if(!(id === 1 || isTrav)) return fail("A perigosa é a de travessia.");

    rotas.splice(idx, 1);
    showTable(rotas);

    etapa = 4;
    missionText.innerHTML = "<b>MISSÃO:</b> Garanta que a rota de acompanhar o rio esteja <b>ativa</b>.";
    ok("Travessia removida. Agora deixe a rota segura ativa.");
    return;
  }

  fail("DELETE aceito, mas faltou um WHERE útil (id_rota).");
}

// ==========================
// UPDATE (flexível)
// ==========================

function runUpdate(sqlRaw, sqlN){
  if(!contains(sqlN, "update rotas")) return fail("Nesse capítulo, o UPDATE aceito é na tabela rotas.");
  if(!contains(sqlN, "set")) return fail("Faltou SET.");
  if(!contains(sqlN, "where")) return fail("Faltou WHERE.");
  if(etapa < 3) return fail("Ainda não é hora de mexer nas rotas.");

  let rota = null;
  if(contains(sqlN, "id_rota")){
    const id = extractNumberAfter(sqlN, "id_rota");
    if(!id) return fail("Não consegui ler o id_rota no WHERE.");
    rota = rotas.find(r => r.id_rota === id);
    if(!rota) return fail("Esse id_rota não existe.");
  } else {
    return fail("Use WHERE com id_rota.");
  }

  const setPart = sqlRaw.split(/set/i)[1]?.split(/where/i)[0] ?? "";
  const setPairs = setPart.split(",").map(s => s.trim()).filter(Boolean);

  for(const pair of setPairs){
    const m = pair.match(/^(\w+)\s*=\s*'([^']+)'/i);
    if(m){
      const col = m[1].toLowerCase();
      const val = m[2];
      if(col in rota) rota[col] = val;
      continue;
    }
    const m2 = pair.match(/^(\w+)\s*=\s*([a-zA-Z_]+)/);
    if(m2){
      const col = m2[1].toLowerCase();
      const val = m2[2];
      if(col in rota) rota[col] = val;
    }
  }

  showTable(rotas);

  if(etapa === 3){
    const trav = rotas.find(r => r.estrategia.toLowerCase().includes("atravess"));
    const travOk = !trav || String(trav.status).toLowerCase().includes("inativ");
    if(travOk){
      etapa = 4;
      missionText.innerHTML = "<b>MISSÃO:</b> Garanta que a rota de acompanhar o rio esteja <b>ativa</b>.";
      ok("Travessia fora do jogo. Agora ative a rota segura.");
      return;
    }
  }

  if(etapa >= 4 && isSafeRouteActive()){
    setStatus("ok", "Concluído ✅");
    outputText.textContent =
`Perfeito. A rota segura agora está ativa.
Você segue acompanhando o curso do Rio Canindé em busca de sinais de civilização.

Capítulo 2 concluído.`;

    nextCard.hidden = false;
    nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  ok("Atualização feita.");
}

// ==========================
// Execução principal
// ==========================

runBtn.addEventListener("click", () => {
  const raw = sqlInput.value.trim();
  const sqlN = normalize(raw);

  if(!sqlN) return fail("...");

  if(sqlN.startsWith("select")) return runSelect(raw, sqlN);
  if(sqlN.startsWith("delete")) return runDelete(raw, sqlN);
  if(sqlN.startsWith("update")) return runUpdate(raw, sqlN);

  fail("Nesse capítulo, só aceito SELECT, DELETE e UPDATE.");
});

resetBtn.addEventListener("click", () => {
  rotas = rotasDefault();
  etapa = 1;

  // ✅ botão some no reset
  hideSwitchButton();

  sqlInput.value = "";
  setStatus("", "Aguardando comando...");
  outputText.textContent = "...";
  hintText.textContent = "O terminal está pronto.";
  missionText.innerHTML = "<b>MISSÃO:</b> Descubra, pelo terminal, qual rio do mapa está mais perto.";
  nextCard.hidden = true;

  storyText.innerHTML =
    `Depois de comer as frutas, você recupera energia e decide andar.
    No caminho, encontra uma casa de taipa antiga, abandonada. Você entra…
    <br><br>
    Lá dentro, acha um mapa velho com rios da região. Um nome te chama atenção: <b>Rio Canindé</b>.
    Se ele estiver perto, seguir o curso do rio pode te levar a sinais de civilização.
    <br><br>
    Você encontra um terminal antigo funcionando. Ele guarda dados da região: <b>rios</b>, <b>peixes</b> e <b>rotas</b>.`;

  resetResult();
});

nextBtn.addEventListener("click", () => {
  window.location.href = "/capitulo3/index.html";
});

// estado inicial
createSwitchButton();
hideSwitchButton();
resetResult();
sqlInput.value = "";
