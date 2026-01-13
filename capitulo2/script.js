// ======= Banco fake =======

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

const rotas = [
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
];

// ======= UI =======

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

// Progressão:
// 1) SELECT * FROM rios
// 2) SELECT * FROM peixes WHERE rio='Canindé'
//    -> mostra rotas automaticamente (guia)
// 3) DELETE FROM rotas WHERE id_rota=1  (apagar rota perigosa)
// 4) UPDATE rotas SET status='ativa' WHERE id_rota=2 (ativar rota segura)

let etapa = 1;

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

function showTable(rows){
  emptyState.style.display = "none";
  resultWrap.style.display = "block";

  const cols = Object.keys(rows[0] ?? {});
  resultHead.innerHTML = cols.map(c => `<th>${c}</th>`).join("");
  resultBody.innerHTML = rows.map(r => {
    const tds = cols.map(c => `<td>${r[c]}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
}

function resetResult(){
  resultWrap.style.display = "none";
  emptyState.style.display = "block";
  resultHead.innerHTML = "";
  resultBody.innerHTML = "";
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

// ======= SELECT =======

function runSelect(sqlRaw, sqlN){
  if(contains(sqlN, "from rios")){
    showTable(rios);

    if(etapa === 1){
      etapa = 2;
      const perto = [...rios].sort((a,b) => a.distancia_km - b.distancia_km)[0];

      storyText.innerHTML =
        `Você confere o mapa e conclui que o rio mais perto é <b>${perto.nome}</b> (<b>${perto.distancia_km} km</b>).
        Você decide ir até ele.
        <br><br>
        Depois de um tempo andando, você ouve água correndo… você chegou ao <b>Rio Canindé</b>.
        A água está agitada demais. Você precisa verificar o que tem ali.`;

      missionText.innerHTML =
        "<b>MISSÃO:</b> Analise o Rio Canindé e veja quais espécies aparecem. (Dica: tabela <b>peixes</b> com WHERE rio='Canindé')";
      hintText.textContent = "Agora investigue o rio pelo terminal.";

      ok(`Rios listados. O mais perto é ${perto.nome}. Agora investigue o Rio Canindé.`);
    } else {
      ok("Rios listados.");
    }
    return;
  }

  if(contains(sqlN, "from peixes")){
    let rows = peixes;

    if(contains(sqlN, "where") && contains(sqlN, "rio")){
      const quoted = extractAllQuoted(sqlRaw);
      const rio = quoted[0] ?? null;
      if(rio){
        rows = peixes.filter(p => p.rio.toLowerCase() === rio.toLowerCase());
      }
    }

    showTable(rows);

    if(etapa === 2){
      const viuCaninde = rows.some(p => p.rio.toLowerCase() === "canindé".toLowerCase());
      if(!viuCaninde){
        return fail(
          "Você ainda não analisou o Rio Canindé.\n" +
          "Dica: SELECT * FROM peixes WHERE rio = 'Canindé';"
        );
      }

      etapa = 3;

      storyText.innerHTML =
        `Você observa o rio com atenção… e identifica perigo:
        <b>arraia</b>, <b>piranhas</b>, <b>puraquê</b>, <b>bagres</b> e <b>mandis</b>.
        <br><br>
        A travessia direta é arriscada. No sistema, existe uma rota que tenta atravessar…
        e uma rota alternativa que acompanha o curso do rio.`;

      // guia: mostra rotas automaticamente
      showTable(rotas);

      missionText.innerHTML =
        "<b>MISSÃO:</b> Apague a rota perigosa que tenta <b>atravessar</b> (id_rota=1) usando <b>DELETE</b> (com WHERE).";
      hintText.textContent = "Agora você vê as rotas na tela.";

      ok("Perigo detectado. Agora apague a rota de travessia (id_rota=1).");
    } else {
      ok("Peixes listados.");
    }
    return;
  }

  if(contains(sqlN, "from rotas")){
    showTable(rotas);
    ok("Rotas listadas.");
    return;
  }

  fail("SELECT não reconhecido. Dica: comece com SELECT * FROM rios;");
}

// ======= DELETE =======

function runDelete(sqlRaw, sqlN){
  if(!contains(sqlN, "delete from rotas")){
    return fail("Nesse capítulo, o DELETE aceito é na tabela rotas.");
  }

  if(!contains(sqlN, "where") || !contains(sqlN, "id_rota")){
    return fail("Faltou WHERE id_rota=... (pra não apagar tudo).");
  }

  const idMatch = sqlN.match(/id_rota\s*=\s*(\d+)/);
  const id = idMatch ? Number(idMatch[1]) : null;
  if(!id) return fail("Não consegui ler o id_rota do WHERE.");

  if(etapa < 3){
    return fail(
      "Antes do DELETE, você precisa ver os rios e analisar os peixes do Canindé.\n" +
      "Dica: SELECT * FROM rios; depois SELECT * FROM peixes WHERE rio='Canindé';"
    );
  }

  const idx = rotas.findIndex(r => r.id_rota === id);
  if(idx === -1) return fail("Esse id_rota não existe.");

  // regra da história: tem que apagar a rota 1 (travessia)
  if(id !== 1){
    return fail("Você até pode apagar outras rotas, mas a perigosa é a id_rota=1 (travessia).");
  }

  rotas.splice(idx, 1);
  showTable(rotas);

  etapa = 4;
  missionText.innerHTML =
    "<b>MISSÃO:</b> Agora ative a rota segura (id_rota=2) colocando <b>status='ativa'</b> com <b>UPDATE</b>.";
  ok("Boa! Você removeu a rota de travessia. Agora ative a rota alternativa (id_rota=2).");
}

// ======= UPDATE =======

function runUpdate(sqlRaw, sqlN){
  if(!contains(sqlN, "update rotas")){
    return fail("Nesse capítulo, o UPDATE aceito é na tabela rotas.");
  }
  if(!contains(sqlN, "set")) return fail("Faltou SET no UPDATE.");
  if(!contains(sqlN, "where") || !contains(sqlN, "id_rota"))
    return fail("Faltou WHERE id_rota=... (pra não atualizar tudo).");

  const idMatch = sqlN.match(/id_rota\s*=\s*(\d+)/);
  const id = idMatch ? Number(idMatch[1]) : null;
  if(!id) return fail("Não consegui ler o id_rota do WHERE.");

  const rota = rotas.find(r => r.id_rota === id);
  if(!rota) return fail("Esse id_rota não existe.");

  if(etapa < 4){
    return fail(
      "Antes do UPDATE final, você precisa apagar a rota perigosa.\n" +
      "Dica: DELETE FROM rotas WHERE id_rota=1;"
    );
  }

  // atualizar status (obrigatório)
  if(!contains(sqlN, "status")){
    return fail("Nesse momento, você precisa atualizar o status. Ex: SET status='ativa'");
  }

  const quoted = extractAllQuoted(sqlRaw);
  const val = quoted[0] ?? null;
  if(!val) return fail("Use aspas no status: status='ativa'");

  rota.status = val;

  showTable(rotas);

  // vitória: id 2 precisa ficar ativa
  if(id === 2 && (rota.status || "").toLowerCase().includes("ativa")){
    setStatus("ok", "Concluído ✅");
    outputText.textContent =
`Perfeito. A rota segura agora está ativa.
Você segue acompanhando o curso do Rio Canindé em busca de sinais de civilização.

Capítulo 2 concluído.`;

    storyText.innerHTML =
      `Você respira fundo e começa a caminhar pela margem.
      O som do rio vira seu guia. Entre as árvores, você pensa:
      <b>se existe água, existe gente.</b>
      <br><br>
      Você segue o <b>Rio Canindé</b>…`;

    nextCard.hidden = false;
    nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  fail("Quase. A ideia é deixar a rota id_rota=2 com status='ativa'.");
}

// ======= Execução =======

runBtn.addEventListener("click", () => {
  const raw = sqlInput.value.trim();
  const sqlN = normalize(raw);

  if(!sqlN) return fail("Digita um comando SQL primeiro.");

  if(sqlN.startsWith("select")) return runSelect(raw, sqlN);
  if(sqlN.startsWith("delete")) return runDelete(raw, sqlN);
  if(sqlN.startsWith("update")) return runUpdate(raw, sqlN);

  fail("Nesse capítulo, só aceito SELECT, DELETE e UPDATE.");
});

resetBtn.addEventListener("click", () => {
  // reset rotas
  rotas.length = 0;
  rotas.push(
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
  );

  etapa = 1;
  sqlInput.value = "";
  setStatus("", "Aguardando comando...");
  outputText.textContent = "Digite um SELECT para continuar.";
  hintText.textContent = "Nada aparece até você executar SQL.";
  missionText.innerHTML =
    "<b>MISSÃO:</b> Veja os rios do mapa e descubra qual está mais perto. (Dica: SELECT na tabela <b>rios</b>)";
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
  alert("Capítulo 3 vem depois 😄\nQuando tu pedir, eu faço com TRIGGER ou PROCEDURE!");
});

// estado inicial
resetResult();
sqlInput.value = "";
