const frutas = [
  { id: 1,  nome: "Coco",     origem: "coqueiro",  comestivel: 1, alerta: "ok" },
  { id: 2,  nome: "Banana",   origem: "bananeira", comestivel: 1, alerta: "ok" },
  { id: 3,  nome: "Caju",     origem: "cajueiro",  comestivel: 1, alerta: "ok" },
  { id: 4,  nome: "Manga",    origem: "mangueira", comestivel: 1, alerta: "ok" },
  { id: 5,  nome: "Pitomba",  origem: "mato",      comestivel: 1, alerta: "ok" },
  { id: 6,  nome: "Umbu",     origem: "mato",      comestivel: 1, alerta: "ok" },
  { id: 7,  nome: "Cajá",     origem: "mato",      comestivel: 1, alerta: "ok" },
  { id: 8,  nome: "Murici",   origem: "mato",      comestivel: 1, alerta: "ok" },
  { id: 9,  nome: "Buriti",   origem: "vereda",    comestivel: 1, alerta: "ok" },

  // inventadas (não come)
  { id: 10, nome: "Fruta-olho-de-sapo", origem: "mato", comestivel: 0, alerta: "desconhecida" },
  { id: 11, nome: "Baguinha preta",     origem: "mato", comestivel: 0, alerta: "amarga" },
  { id: 12, nome: "Cipó-leitoso",       origem: "mato", comestivel: 0, alerta: "irritante" },
  { id: 13, nome: "Carocinho vermelho", origem: "mato", comestivel: 0, alerta: "tóxica" },
];

const sqlInput   = document.querySelector("#sqlInput");
const runBtn     = document.querySelector("#runBtn");
const resetBtn   = document.querySelector("#resetBtn");
const outputText = document.querySelector("#outputText");
const statusPill = document.querySelector("#statusPill");

const missionText = document.querySelector("#missionText");
const nextCard    = document.querySelector("#nextCard");
const nextBtn     = document.querySelector("#nextBtn");

// resultado (tabela do terminal)
const resultWrap  = document.querySelector("#resultWrap");
const emptyState  = document.querySelector("#emptyState");
const resultHead  = document.querySelector("#resultHead");
const resultBody  = document.querySelector("#resultBody");

let etapa = 1;
// 1: descobrir frutas (SELECT ... FROM frutas_encontradas)
// 2: filtrar comestíveis (WHERE comestivel = 1)

function setStatus(type, text){
  statusPill.classList.remove("ok", "bad");
  if(type === "ok") statusPill.classList.add("ok");
  if(type === "bad") statusPill.classList.add("bad");
  statusPill.textContent = text;
}

function normalize(sql){
  return sql.toLowerCase().replace(/\s+/g, " ").trim();
}

function isSelect(sqlN){
  return sqlN.startsWith("select");
}

function isFromFrutas(sqlN){
  return sqlN.includes("from frutas_encontradas");
}

function hasWhere(sqlN){
  return sqlN.includes(" where ");
}

function hasComestivelFilter(sqlN){
  const patterns = [
    /where .*comestivel\s*=\s*1/,
    /where .*comestivel\s*==\s*1/,
    /where .*comestivel\s*!=\s*0/,
    /where .*comestivel\s*<>\s*0/,
    /where .*comestivel\s*>\s*0/,
  ];
  return patterns.some(r => r.test(sqlN));
}

function simulate(sqlN){
  if(hasComestivelFilter(sqlN)) return frutas.filter(f => f.comestivel === 1);
  return frutas;
}

function renderResultTable(rows){
  emptyState.style.display = "none";
  resultWrap.style.display = "block";

  const cols = Object.keys(rows[0] ?? { id: "", nome: "", origem: "", comestivel: "", alerta: "" });

  resultHead.innerHTML = cols.map(c => `<th>${c}</th>`).join("");
  resultBody.innerHTML = rows.map(r => {
    const tds = cols.map(c => `<td>${r[c]}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");
}

function successStep1(rows){
  setStatus("ok", "Boa! ✅");
  renderResultTable(rows);

  outputText.textContent =
`Você listou o que tem no cesto.
Agora vem a parte perigosa: nem tudo aí é seguro.

MISSÃO NOVA:
- selecione apenas as frutas SEGURAS (filtrando a coluna comestivel).`;

  etapa = 2;
  missionText.innerHTML =
    "<b>MISSÃO:</b> Agora filtre e liste apenas as frutas que você pode comer (sem pegar as perigosas).";
}

function successStep2(rows){
  setStatus("ok", "Sobreviveu ✅");
  renderResultTable(rows);

  outputText.textContent =
`Você separou só o que é seguro e recuperou energia.
O estômago para de doer… e você consegue pensar.

Você vê um mapa rasgado no chão… mas as coordenadas estão erradas.`;

  nextCard.hidden = false;
  nextCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fail(msg){
  setStatus("bad", "Não foi ❌");
  outputText.textContent = msg;
  nextCard.hidden = true;
}

runBtn.addEventListener("click", () => {
  const sql = sqlInput.value;
  const sqlN = normalize(sql);

  if(!sqlN) return fail("Digita um comando SQL primeiro.");

  if(!isSelect(sqlN)){
    return fail("Nesse capítulo, o terminal só entende SELECT.");
  }

  if(!isFromFrutas(sqlN)){
    return fail(
      "O terminal parece ter dados em uma tabela chamada frutas_encontradas.\n" +
      "Tenta algo tipo:\nSELECT * FROM frutas_encontradas;"
    );
  }

  const rows = simulate(sqlN);

  // ETAPA 1: qualquer SELECT FROM frutas_encontradas vale (mesmo sem WHERE)
  if(etapa === 1){
    // se ele já filtrar certo direto, passa
    if(hasComestivelFilter(sqlN)) return successStep2(rows);
    return successStep1(rows);
  }

  // ETAPA 2: exige filtro comestivel
  if(etapa === 2){
    if(!hasWhere(sqlN)){
      return fail(
        "Você listou tudo de novo… perigoso.\n" +
        "Use WHERE para filtrar só as frutas seguras.\n" +
        "Dica: WHERE comestivel = 1"
      );
    }
    if(!hasComestivelFilter(sqlN)){
      return fail(
        "Você usou WHERE, mas não filtrou o comestivel.\n" +
        "Dica: WHERE comestivel = 1"
      );
    }
    return successStep2(rows);
  }
});

resetBtn.addEventListener("click", () => {
  sqlInput.value = "";
  setStatus("", "Aguardando comando...");
  outputText.textContent = "Digite um SELECT para continuar.";

  etapa = 1;
  missionText.innerHTML =
    "<b>MISSÃO:</b> Descubra quais frutas você encontrou. Comece listando o conteúdo da tabela.";

  nextCard.hidden = true;

  resultWrap.style.display = "none";
  emptyState.style.display = "block";
  resultHead.innerHTML = "";
  resultBody.innerHTML = "";
});

nextBtn.addEventListener("click", () => {
  alert("Capítulo 2 (UPDATE) vem depois 😄\nQuando tu mandar, eu faço ele no mesmo estilo!");
});

// começa sem mostrar resultados (estilo SQL Island)
resultWrap.style.display = "none";
emptyState.style.display = "block";
sqlInput.value = "";
