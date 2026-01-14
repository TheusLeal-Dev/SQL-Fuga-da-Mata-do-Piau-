// ==========================
// BANCO FAKE (Capítulo 1)
// ==========================

const frutas_encontradas = [
  { id: 1, nome: "Coco",      origem: "Piauí", comestivel: 1, alerta: 0 },
  { id: 2, nome: "Banana",    origem: "Piauí", comestivel: 1, alerta: 0 },
  { id: 3, nome: "Pitomba",   origem: "Piauí", comestivel: 1, alerta: 0 },
  { id: 4, nome: "Caju",      origem: "Piauí", comestivel: 1, alerta: 0 },
  { id: 5, nome: "Manga",     origem: "Piauí", comestivel: 1, alerta: 0 },

  // “perigosas / não comer”
  { id: 6, nome: "Fruta Desconhecida", origem: "Mata",  comestivel: 0, alerta: 1 },
  { id: 7, nome: "Baga Vermelha",      origem: "Mata",  comestivel: 0, alerta: 1 },
  { id: 8, nome: "CoguMelo",           origem: "Mata",  comestivel: 0, alerta: 1 },
];

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

const nextCard   = document.querySelector("#nextCard");
const nextBtn    = document.querySelector("#nextBtn");

const resultWrap = document.querySelector("#resultWrap");
const emptyState = document.querySelector("#emptyState");
const resultHead = document.querySelector("#resultHead");
const resultBody = document.querySelector("#resultBody");

// ==========================
// Progressão
// ==========================
// etapa 1: qualquer SELECT em frutas_encontradas (pra “descobrir” a tabela)
// etapa 2: selecionar só frutas seguras (várias formas aceitas)
let etapa = 1;

// ==========================
// Helpers
// ==========================

function setStatus(type, text){
  statusPill.classList.remove("ok","bad");
  if(type === "ok") statusPill.classList.add("ok");
  if(type === "bad") statusPill.classList.add("bad");
  statusPill.textContent = text;
}

function ok(msg){
  setStatus("ok","OK ✅");
  outputText.textContent = msg;
}

function fail(msg){
  setStatus("bad","Não foi ❌");
  outputText.textContent = msg;
  nextCard.hidden = true;
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

function normalize(sql){
  return sql.toLowerCase().replace(/\s+/g," ").trim();
}

function hasFrom(sqlN, table){
  return sqlN.includes(`from ${table}`) || sqlN.includes(`from ${table};`);
}

function pickColumns(rows, colsRequested){
  // se colsRequested for null => retorna tudo
  if(!colsRequested) return rows;

  // colsRequested = ["nome","origem"] etc
  return rows.map(r => {
    const obj = {};
    colsRequested.forEach(c => {
      if(c in r) obj[c] = r[c];
    });
    return obj;
  });
}

function parseSelectColumns(sqlN){
  // pega entre "select" e "from"
  const m = sqlN.match(/^select\s+(.+)\s+from\s+/);
  if(!m) return null;
  const part = m[1].trim();
  if(part === "*" || part.includes("*")) return null;

  // remove DISTINCT se tiver
  const cleaned = part.replace(/^distinct\s+/,"").trim();
  // split simples por vírgula
  const cols = cleaned.split(",").map(s => s.trim());
  // remove aliases "as"
  return cols.map(c => c.split(" as ")[0].trim());
}

function isSafeRow(r){
  return r.comestivel === 1 && r.alerta === 0;
}

// aceita várias formas de “solução”
function queryLooksLikeSafeFilter(sqlN){
  // soluções comuns
  const patterns = [
    /where\s+comestivel\s*=\s*1/,
    /where\s+comestivel\s*!=\s*0/,
    /where\s+comestivel\s*<>\s*0/,
    /where\s+alerta\s*=\s*0/,
    /where\s+alerta\s*!=\s*1/,
    /where\s+alerta\s*<>\s*1/,
    /where\s+comestivel\s*=\s*1\s+and\s+alerta\s*=\s*0/,
    /where\s+alerta\s*=\s*0\s+and\s+comestivel\s*=\s*1/,
    /where\s+nome\s+not\s+in\s*\(/,
    /where\s+nome\s+!=\s*'/,
    /where\s+nome\s*<>\s*'/,
  ];

  return patterns.some(rx => rx.test(sqlN));
}

function applyVerySimpleWhere(sqlRaw, sqlN, rows){
  // NÃO é um SQL parser completo.
  // Só filtra o básico pra deixar o jogo flexível sem travar.

  if(!sqlN.includes("where")) return rows;

  // 1) comestivel = 1
  if(/comestivel\s*=\s*1/.test(sqlN) || /comestivel\s*!=\s*0/.test(sqlN) || /comestivel\s*<>\s*0/.test(sqlN)){
    rows = rows.filter(r => r.comestivel === 1);
  }

  // 2) alerta = 0
  if(/alerta\s*=\s*0/.test(sqlN) || /alerta\s*!=\s*1/.test(sqlN) || /alerta\s*<>\s*1/.test(sqlN)){
    rows = rows.filter(r => r.alerta === 0);
  }

  // 3) nome NOT IN ('x','y')
  const notIn = sqlRaw.match(/nome\s+not\s+in\s*\(([^)]+)\)/i);
  if(notIn){
    const inside = notIn[1];
    const quoted = [...inside.matchAll(/'([^']+)'/g)].map(m => m[1].toLowerCase());
    rows = rows.filter(r => !quoted.includes(r.nome.toLowerCase()));
  }

  // 4) nome != 'x' ou nome <> 'x' (só 1)
  const neq = sqlRaw.match(/nome\s*(!=|<>)\s*'([^']+)'/i);
  if(neq){
    const val = neq[2].toLowerCase();
    rows = rows.filter(r => r.nome.toLowerCase() !== val);
  }

  return rows;
}

// ==========================
// Execução SELECT
// ==========================

function runSelect(sqlRaw, sqlN){
  if(!hasFrom(sqlN, "frutas_encontradas")){
    return fail("O terminal não encontrou essa tabela.");
  }

  // base
  let rows = [...frutas_encontradas];

  // aplica where simples
  rows = applyVerySimpleWhere(sqlRaw, sqlN, rows);

  // aplica colunas
  const cols = parseSelectColumns(sqlN);
  const projected = pickColumns(rows, cols);

  showTable(projected);

  // progressão
  if(etapa === 1){
    etapa = 2;

    hintText.textContent = "Você sente o estômago roncar…";
    missionText.innerHTML =
      "<b>MISSÃO:</b> Selecione apenas as frutas seguras pra comer.";

    ok("Agora você já sabe o que tem no cesto. Só falta separar o que dá pra comer.");
    return;
  }

  if(etapa === 2){
    // se query parece filtrar seguro e o resultado só tem seguros e pelo menos 2 itens
    const originalFiltered = rows; // rows já está filtrado na estrutura completa

    const allSafe = originalFiltered.length > 0 && originalFiltered.every(isSafeRow);
    const looksLike = queryLooksLikeSafeFilter(sqlN);

    if(allSafe && looksLike){
      setStatus("ok", "Concluído ✅");
      outputText.textContent =
        "Boa. Você separou só o que é seguro e comeu pra recuperar força.\n\nCapítulo 1 concluído.";

      storyText.innerHTML =
        `Você come as frutas seguras e sente a energia voltando.
        <br><br>
        No chão, entre folhas, você acha um mapa rasgado… e decide seguir viagem.`;

      nextCard.hidden = false;
      nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    ok("Você fez uma seleção, mas ainda não ficou claro que separou só as frutas seguras.");
    return;
  }
}

// ==========================
// Execução principal
// ==========================

function runSQL(){
  const raw = sqlInput.value.trim();
  const sqlN = normalize(raw);

  if(!sqlN) return fail("...");

  if(sqlN.startsWith("select")) return runSelect(raw, sqlN);

  fail("Nesse capítulo, o terminal só responde SELECT.");
}

// ==========================
// Eventos
// ==========================

runBtn.addEventListener("click", runSQL);

resetBtn.addEventListener("click", () => {
  etapa = 1;
  sqlInput.value = "";
  setStatus("", "Aguardando comando...");
  outputText.textContent = "...";
  hintText.textContent = "O terminal está pronto.";
  missionText.innerHTML = "<b>MISSÃO:</b> Use o terminal pra entender o que tem nesse cesto.";
  nextCard.hidden = true;

  storyText.innerHTML =
    `Você acorda no meio da mata, fraco e com fome. Depois de caminhar entre as árvores,
    encontra um cesto com frutas e um terminal antigo coberto de folhas.
    <br><br>
    O terminal parece ter registros em uma tabela chamada <b>frutas_encontradas</b>.
    Nem tudo é seguro. Você precisa sobreviver.`;

  resetResult();
});

nextBtn.addEventListener("click", () => {
  // ajusta pro teu caminho real do capítulo 2
  window.location.href = "/capitulo2/index.html";
});

// estado inicial
resetResult();
sqlInput.value = "";
