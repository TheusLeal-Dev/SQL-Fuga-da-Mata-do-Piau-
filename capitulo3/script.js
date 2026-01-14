// ==========================
// "BANCO" FAKE (memória)
// ==========================

const npc = [
  { id_npc: 1, nome: "Alysson" }
];

const comidas = [
  // típicas do Piauí (tipica=1)
  { id_comida: 1, nome: "Maria Isabel", tipica: 1, energia: 35 },
  { id_comida: 2, nome: "Panelada",     tipica: 1, energia: 40 },
  { id_comida: 3, nome: "Cuscuz",       tipica: 1, energia: 25 },
  { id_comida: 4, nome: "Buchada",      tipica: 1, energia: 45 },
  { id_comida: 5, nome: "Beiju",        tipica: 1, energia: 20 },

  // não típicas / “de fora” (tipica=0)
  { id_comida: 6, nome: "Pizza",        tipica: 0, energia: 30 },
  { id_comida: 7, nome: "Hambúrguer",   tipica: 0, energia: 30 },
  { id_comida: 8, nome: "Sushi",        tipica: 0, energia: 18 },
  { id_comida: 9, nome: "Lasanha",      tipica: 0, energia: 28 },
];

let itens_prato = []; // { id_item, id_comida, qtd }
let nextItemId = 1;

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
const finishText = document.querySelector("#finishText");

const resultWrap = document.querySelector("#resultWrap");
const emptyState = document.querySelector("#emptyState");
const resultHead = document.querySelector("#resultHead");
const resultBody = document.querySelector("#resultBody");

// ==========================
// Progressão / regras
// ==========================
// 1) descobrir nome (SELECT em npc)
// 2) descobrir comidas típicas (VIEW ou WHERE tipica=1)
// 3) montar prato (INSERTs diversos)
// 4) finalizar (SELECT prato_atual) com pelo menos 3 típicas

const TIPICAS_MIN = 3;

let nomeRevelado = false;        // só vira true quando o user fizer SELECT em npc
let nomeNpc = "NPC";             // quando revelar, vira "Alysson"

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

function npcLine(text){
  return `${nomeNpc}: ${text}`;
}

function revealName(){
  if(nomeRevelado) return;

  nomeRevelado = true;
  nomeNpc = npc[0].nome; // Alysson

  // Troca todos os "NPC:" do texto principal por "Alysson:" (só no que já existe)
  storyText.innerHTML = storyText.innerHTML.replaceAll("<b>NPC:</b>", `<b>${nomeNpc}:</b>`);

  // Adiciona revelação
  storyText.innerHTML +=
    `<br><br><b>${nomeNpc}:</b> “Eu me chamo <b>${nomeNpc}</b>. Bora fazer direito, visse? Só comida da terra.”`;
}

// ==========================
// VIEWs (simuladas)
// ==========================

function view_cardapio_tipico(){
  return comidas
    .filter(c => c.tipica === 1)
    .map(c => ({ id_comida: c.id_comida, nome: c.nome, energia: c.energia }));
}

function view_prato_atual(){
  return itens_prato.map(it => {
    const c = comidas.find(x => x.id_comida === it.id_comida);
    const energia_total = (c?.energia ?? 0) * it.qtd;
    return {
      id_item: it.id_item,
      nome: c?.nome ?? "???",
      qtd: it.qtd,
      energia_total
    };
  });
}

// ==========================
// TRIGGER (simulada)
// BEFORE INSERT ON itens_prato
// Bloqueia se comida.tipica = 0
// ==========================

function trigger_bloquear_nao_tipica(id_comida){
  const c = comidas.find(x => x.id_comida === id_comida);
  if(!c) throw new Error("Isso aí nem existe no rancho, homem.");
  if(c.tipica === 0){
    throw new Error("Ô fih d’uma égua! Isso aí num é comida da terra não, visse? Só as típica!");
  }
}

// ==========================
// Parser de SQL (simples e flexível)
// ==========================

function parseMultiValues(sqlRaw){
  // aceita: VALUES (1,1),(2,1),(3,2)
  const m = sqlRaw.match(/values\s*(.+)$/i);
  if(!m) return [];
  const tail = m[1].trim();

  // pega todas as ocorrências de ( ... )
  const tuples = [...tail.matchAll(/\(\s*([^)]+)\s*\)/g)].map(x => x[1]);
  return tuples.map(t => t.split(",").map(s => s.trim()));
}

function hasFrom(sqlN, table){
  return sqlN.includes(`from ${table}`) || sqlN.includes(`from ${table};`);
}

// ==========================
// Execução: SELECT
// ==========================

function runSelect(sqlRaw, sqlN){
  // 0) Descobrir nome (primeira missão)
  if(hasFrom(sqlN, "npc")){
    showTable(npc);
    revealName();

    hintText.textContent = `${nomeNpc} dá um sorriso torto e aponta pro fogão.`;
    missionText.innerHTML =
      "<b>MISSÃO:</b> Descubra o que é comida da terra e monte um prato só com isso.";

    ok(npcLine("Pronto. Agora tu já sabe com quem tu tá falando. Vai, mexe no terminal aí."));
    return;
  }

  // VIEW cardapio_tipico
  if(hasFrom(sqlN, "cardapio_tipico")){
    const rows = view_cardapio_tipico();
    showTable(rows);

    hintText.textContent = nomeRevelado
      ? `${nomeNpc} observa teu olho correr a lista.`
      : "O homem observa o terminal em silêncio.";

    missionText.innerHTML =
      "<b>MISSÃO:</b> Monte um prato só com comida da terra. (o terminal registra em <b>itens_prato</b>)";

    ok(npcLine("Aí sim… agora tu tá vendo o que presta. Bota no prato."));
    return;
  }

  // SELECT direto em comidas (alternativa)
  if(hasFrom(sqlN, "comidas")){
    let rows = comidas.map(c => ({
      id_comida: c.id_comida, nome: c.nome, tipica: c.tipica, energia: c.energia
    }));

    if(sqlN.includes("where") && /tipica\s*=\s*1/.test(sqlN)){
      rows = comidas
        .filter(c => c.tipica === 1)
        .map(c => ({ id_comida: c.id_comida, nome: c.nome, tipica: c.tipica, energia: c.energia }));

      ok(npcLine("Tu é ligeiro… achou as típica no grito. Agora bota no prato."));
    } else {
      ok("Tabela comidas exibida.");
    }

    showTable(rows);
    return;
  }

  // VIEW prato_atual (finalização)
  if(hasFrom(sqlN, "prato_atual")){
    const rows = view_prato_atual();
    showTable(rows);

    if(rows.length === 0){
      return fail(npcLine("Arriégua! Prato vazio é sofrimento, homem…"));
    }

    const tipicasIds = new Set(comidas.filter(c => c.tipica === 1).map(c => c.id_comida));
    const noPratoTipicas = new Set(itens_prato.filter(i => tipicasIds.has(i.id_comida)).map(i => i.id_comida));
    const qtdTipicas = noPratoTipicas.size;

    if(qtdTipicas >= TIPICAS_MIN){
      setStatus("ok", "Concluído ✅");

      finishText.textContent =
        nomeRevelado
          ? `${nomeNpc} dá uma risada: “Agora tu tá forte. Bora simbora, visse?”`
          : `O homem ri: “Agora tu tá forte. Bora simbora, visse?”`;

      outputText.textContent =
        `${npcLine("Agora sim! De bucho cheio tu aguenta a caminhada. Bora sair dessa mata!")}\n\nCapítulo 3 concluído.`;

      nextCard.hidden = false;
      nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    ok(npcLine(`Tá faltando sustança… tu pegou só ${qtdTipicas} comida(s) da terra. Quero pelo menos ${TIPICAS_MIN}.`));
    return;
  }

  // SELECT itens_prato (alternativa)
  if(hasFrom(sqlN, "itens_prato")){
    showTable(itens_prato.length ? itens_prato : []);
    ok("itens_prato exibido.");
    return;
  }

  fail(npcLine("O terminal num entendeu isso aí não…"));
}

// ==========================
// Execução: INSERT
// ==========================

function insertItem(id_comida, qtd){
  trigger_bloquear_nao_tipica(id_comida);

  const existing = itens_prato.find(i => i.id_comida === id_comida);
  if(existing){
    existing.qtd += qtd;
  } else {
    itens_prato.push({ id_item: nextItemId++, id_comida, qtd });
  }
}

function runInsert(sqlRaw, sqlN){
  if(!sqlN.startsWith("insert into itens_prato")){
    return fail(npcLine("Aqui tu tá mexendo é no prato. Se for inserir, é em itens_prato."));
  }

  // INSERT ... SELECT ... FROM cardapio_tipico
  if(sqlN.includes(" select ") && hasFrom(sqlN, "cardapio_tipico")){
    const qtdMatch = sqlN.match(/select\s+[^,]+,\s*(\d+)\s+from\s+cardapio_tipico/);
    const qtd = qtdMatch ? Number(qtdMatch[1]) : 1;

    const rows = view_cardapio_tipico();
    try{
      rows.forEach(r => insertItem(r.id_comida, qtd));
    } catch(err){
      return fail(npcLine(String(err.message)));
    }

    showTable(view_prato_atual());
    ok(npcLine("Eita! Tu encheu o prato de uma vez só. Aí é macaco velho 😄"));
    return;
  }

  // INSERT ... VALUES (...) e múltiplos
  if(!sqlN.includes("values")){
    return fail(npcLine("Se for inserir assim, tem que ter VALUES ou um SELECT."));
  }

  const tuples = parseMultiValues(sqlRaw);
  if(!tuples.length){
    return fail(npcLine("Eu num consegui ler esse VALUES aí não."));
  }

  try{
    for(const parts of tuples){
      if(parts.length < 2) throw new Error("Faltou quantidade no prato.");
      const id_comida = Number(parts[0]);
      const qtd = Number(parts[1]);

      if(!Number.isFinite(id_comida) || !Number.isFinite(qtd) || qtd <= 0){
        throw new Error("Esses números tão esquisitos, homem.");
      }

      insertItem(id_comida, qtd);
    }
  } catch(err){
    return fail(npcLine(String(err.message)));
  }

  showTable(view_prato_atual());
  ok(npcLine("Aí sim… agora tu tá se arrumando."));
}

// ==========================
// Execução principal
// ==========================

function runSQL(){
  const raw = sqlInput.value.trim();
  const sqlN = normalize(raw);

  if(!sqlN) return fail("...");

  if(sqlN.startsWith("select")) return runSelect(raw, sqlN);
  if(sqlN.startsWith("insert")) return runInsert(raw, sqlN);

  fail(npcLine("Nessa hora, o terminal só responde SELECT e INSERT, visse."));
}

// ==========================
// Eventos
// ==========================

runBtn.addEventListener("click", runSQL);

resetBtn.addEventListener("click", () => {
  itens_prato = [];
  nextItemId = 1;

  nomeRevelado = false;
  nomeNpc = "NPC";

  sqlInput.value = "";
  setStatus("", "Aguardando comando...");
  outputText.textContent = "O homem cruza os braços e espera.";
  hintText.textContent = "O terminal está pronto.";
  missionText.innerHTML =
    "<b>MISSÃO:</b> Descubra o nome desse morador usando o terminal.";
  nextCard.hidden = true;

  storyText.innerHTML =
    `Seguindo o curso do Rio Canindé, você encontra fumaça no meio do mato… sinal de gente.
    Você se aproxima e um cabra aparece do nada, com um facão na cintura.
    <br><br>
    <b>NPC:</b> “<b>Arriégua, homem!</b> O que tu tá fazendo aqui no mei do nada?”
    <br>
    <b>NPC:</b> “<b>Ô fih d’uma égua</b>, tu tá é perdido, visse?”
    <br><br>
    Ele te leva até um rancho. Tem um fogão de lenha e um terminal velho em cima de uma mesa.
    <br><br>
    <b>NPC:</b> “Se tu quer força pra sair dessa mata, come só o que é <b>da terra</b>.
    Aqui tem coisa típica… e tem coisa de fora que eu não deixo nem tu encostar.”`;

  resetResult();
});

nextBtn.addEventListener("click", () => {
  alert("Capítulo 4 vem depois 😄");
});

// estado inicial
resetResult();
sqlInput.value = "";
