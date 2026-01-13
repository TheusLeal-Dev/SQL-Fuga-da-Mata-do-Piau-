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
//    -> após isso, mostramos a tabela rotas automaticamente (pra guiar)
// 3) UPDATE rotas ... WHERE id_rota=1 (mudar de atravessar -> acompanhar)

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
  // rios
  if(contains(sqlN, "from rios")){
    showTable(rios);

    if(etapa === 1){
      etapa = 2;
      const perto = [...rios].sort((a,b) => a.distancia_km - b.distancia_km)[0];

      storyText.innerHTML =
        `Depois de ver o mapa, você conclui que está mais perto do <b>Rio ${perto.nome}</b>.
        Como ele está a <b>${perto.distancia_km} km</b>, você decide ir até lá.
        <br><br>
        Você caminha por um tempo… e finalmente ouve água correndo. Você chegou ao <b>Rio Canindé</b>.
        A água parece viva — tem movimento demais.`;

      missionText.innerHTML =
        "<b>MISSÃO:</b> Analise o rio e veja quais espécies aparecem. (Dica: tabela <b>peixes</b> com WHERE rio='Canindé')";
      hintText.textContent = "Agora investigue o rio pelo terminal.";

      ok(
`Você achou os rios. O mais perto é ${perto.nome}.
Agora você decidiu ir ao Rio Canindé.
Investigue quais peixes aparecem lá.`
      );
    } else {
      ok("Rios listados.");
    }
    return;
  }

  // peixes
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
        `Você observa o rio com atenção. No reflexo da água, você vê perigo:
        <b>arraia</b>, <b>piranhas</b>, <b>puraquê</b>, <b>bagres</b> e <b>mandis</b>.
        <br><br>
        A travessia direta seria suicídio. Só que o mapa antigo sugere uma rota que cruza o rio…
        <br><br>
        Você acessa as <b>rotas</b> registradas no sistema.`;

      // Aqui: guia o usuário mostrando a tabela rotas automaticamente
      showTable(rotas);

      missionText.innerHTML =
        "<b>MISSÃO:</b> A rota <b>id_rota=1</b> tenta <b>atravessar</b>. Troque para <b>acompanhar</b> o curso do Rio Canindé usando <b>UPDATE rotas</b> (com WHERE).";
      hintText.textContent = "Agora você tem as rotas na tela. Escolha a estratégia segura.";

      ok(
`Perigo detectado. Não dá pra atravessar.
O sistema tem rotas registradas. A rota 1 está errada (atravessar).
Use UPDATE para mudar a rota 1 para acompanhar o rio.`
      );
    } else {
      ok("Peixes listados.");
    }

    return;
  }

  // rotas (opcional)
  if(contains(sqlN, "from rotas")){
    showTable(rotas);
    ok("Rotas listadas.");
    return;
  }

  fail("SELECT não reconhecido. Dica: comece com SELECT * FROM rios;");
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

  // Atualizações possíveis
  // estrategia='acompanhar' OU destino='Rio Canindé' etc.
  const quoted = extractAllQuoted(sqlRaw);

  // estrategia
  if(contains(sqlN, "estrategia")){
    const val = quoted[0] ?? null;
    if(!val) return fail("Pra estrategia, use aspas: estrategia='acompanhar'");
    rota.estrategia = val;
  }

  // destino (se tiver)
  if(contains(sqlN, "destino")){
    const val = quoted.length >= 2 ? quoted[1] : quoted[0];
    if(val) rota.destino = val;
  }

  // titulo (se tiver)
  if(contains(sqlN, "titulo")){
    const val = quoted[0] ?? null;
    if(val) rota.titulo = val;
  }

  // status (se tiver)
  if(contains(sqlN, "status")){
    const val = quoted[quoted.length - 1] ?? null;
    if(val) rota.status = val;
  }

  // após update, mostramos as rotas atualizadas
  showTable(rotas);

  if(etapa < 3){
    return fail(
      "Antes do UPDATE, você precisa ver os rios e analisar os peixes do Canindé.\n" +
      "Dica: SELECT * FROM rios; depois SELECT * FROM peixes WHERE rio='Canindé';"
    );
  }

  // Vitória: rota 1 precisa virar "acompanhar"
  if(id === 1){
    const okEstrategia = (rota.estrategia || "").toLowerCase().includes("acompanhar");
    const okDestino = (rota.destino || "").toLowerCase().includes("canind");

    if(!okEstrategia){
      return fail(
        "Você atualizou, mas ainda não mudou a estratégia da rota 1 para 'acompanhar'.\n" +
        "Exemplo:\nUPDATE rotas SET estrategia='acompanhar' WHERE id_rota=1;"
      );
    }

    // deixar a rota segura “ativa” também (opcional)
    rota.status = "ativa";

    setStatus("ok", "Concluído ✅");
    outputText.textContent =
`Boa. A rota 1 agora acompanha o curso do Rio Canindé.
Você evita a travessia perigosa e segue em direção a sinais de civilização.

Capítulo 2 concluído.`;

    nextCard.hidden = false;
    nextCard.scrollIntoView({ behavior: "smooth", block: "start" });

    // narrativa final
    storyText.innerHTML =
      `Você guarda o mapa, respira fundo e começa a caminhar pela margem.
      O som do rio vira seu guia. Entre as árvores, você imagina: <b>se existe água, existe gente.</b>
      <br><br>
      Você segue o <b>Rio Canindé</b>…`;

    return;
  }

  ok("UPDATE aplicado.");
}

// ======= Execução =======

runBtn.addEventListener("click", () => {
  const raw = sqlInput.value.trim();
  const sqlN = normalize(raw);

  if(!sqlN) return fail("Digita um comando SQL primeiro.");

  if(sqlN.startsWith("select")) return runSelect(raw, sqlN);
  if(sqlN.startsWith("update")) return runUpdate(raw, sqlN);

  fail("Nesse capítulo, só aceito SELECT e UPDATE.");
});

resetBtn.addEventListener("click", () => {
  // reset dados
  rotas[0] = {
    id_rota: 1,
    titulo: "Rota do mapa",
    estrategia: "atravessar",
    destino: "Rio Canindé (travessia direta)",
    status: "ativa"
  };
  rotas[1] = {
    id_rota: 2,
    titulo: "Rota alternativa",
    estrategia: "acompanhar",
    destino: "Seguir o curso do Rio Canindé (civilização)",
    status: "inativa"
  };

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
  alert("Capítulo 3 vem depois 😄\nQuando tu pedir, eu faço com DELETE ou TRIGGER!");
});

// estado inicial
resetResult();
sqlInput.value = "";
