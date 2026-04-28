// =============================================================
// KARL - Scripts dos Code Nodes do n8n
// Cole cada seção no Code Node correspondente do workflow
// =============================================================


// =============================================================
// NODE: "Parse JSON da IA"
// Posição no fluxo: após o HTTP Request da IA
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Parse JSON da IA" --

const aiResponse = $input.first().json;
const content = aiResponse.choices?.[0]?.message?.content || '';

let parsed;
try {
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  parsed = JSON.parse(clean);
} catch(e) {
  parsed = {
    intent: 'mensagem_desconhecida',
    motivo: 'erro ao interpretar',
    pergunta: 'Pode tentar de outro jeito?'
  };
}

// Horário do Brasil (UTC-3)
const now = new Date();
const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
const pad = n => String(n).padStart(2, '0');
const dateStr = `${brNow.getUTCFullYear()}-${pad(brNow.getUTCMonth()+1)}-${pad(brNow.getUTCDate())}`;
const timeStr = `${pad(brNow.getUTCHours())}:${pad(brNow.getUTCMinutes())}:${pad(brNow.getUTCSeconds())}`;

parsed._phone = $('Normalizar Entrada').first().json.phone;
parsed._created_at = `${dateStr} ${timeStr}`;
parsed._current_date = dateStr;

return [{ json: parsed }];


// =============================================================
// NODE: "Preparar Lancamento"
// Posição: entre Switch e Google Sheets (para saida e entrada)
// Recebe saídas 0 e 1 do Switch (registrar_saida, registrar_entrada)
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Preparar Lancamento" --

const d = $input.first().json;
const ts = Date.now();
const prefix = d.tipo === 'entrada' ? 'ent' : 'sai';

return [{
  json: {
    id: `${prefix}_${ts}`,
    data: d.data || d._current_date,
    tipo: d.tipo,
    valor: parseFloat(d.valor) || 0,
    categoria: (d.categoria || 'outros').toLowerCase(),
    descricao: d.descricao || '',
    forma_pagamento: d.forma_pagamento || '',
    status: d.status || (d.tipo === 'entrada' ? 'recebido' : 'pago'),
    origem: 'whatsapp',
    observacao: d.observacao || '',
    telefone_usuario: d._phone,
    created_at: d._created_at,
    _phone: d._phone,
    _tipo: d.tipo,
    _valor: parseFloat(d.valor) || 0,
    _categoria: (d.categoria || 'outros').toLowerCase(),
    _descricao: d.descricao || '',
    _data: d.data || d._current_date
  }
}];


// =============================================================
// NODE: "Resposta Lancamento"
// Posição: após Google Sheets salvar em Lancamentos
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Resposta Lancamento" --

const d = $input.first().json;
const phone = d._phone || $('Normalizar Entrada').first().json.phone;
const tipo = d._tipo === 'entrada' ? 'Entrada' : 'Saída';
const valor = parseFloat(d._valor || 0).toFixed(2)
  .replace('.', ',')
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const [y, m, day] = (d._data || '').split('-');
const dataDisplay = day ? `${day}/${m}/${y}` : d._data;

const resposta = `Registrado ✅\n\n${tipo}: R$ ${valor}\nCategoria: ${d._categoria}\nDescrição: ${d._descricao}\nData: ${dataDisplay}`;

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Preparar Conta Pagar"
// Posição: entre Switch (saída 2) e Google Sheets Contas_Pagar
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Preparar Conta Pagar" --

const d = $input.first().json;
const ts = Date.now();

return [{
  json: {
    id: `pagar_${ts}`,
    vencimento: d.vencimento || '',
    conta: d.conta || '',
    valor: parseFloat(d.valor) || 0,
    categoria: (d.categoria || 'outros').toLowerCase(),
    recorrente: d.recorrente === true || d.recorrente === 'true' ? 'true' : 'false',
    status: 'pendente',
    observacao: d.observacao || '',
    telefone_usuario: d._phone,
    created_at: d._created_at,
    _phone: d._phone,
    _conta: d.conta || '',
    _valor: parseFloat(d.valor) || 0,
    _vencimento: d.vencimento || ''
  }
}];


// =============================================================
// NODE: "Resposta Conta Pagar"
// Posição: após Google Sheets salvar em Contas_Pagar
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Resposta Conta Pagar" --

const d = $input.first().json;
const phone = d._phone || $('Normalizar Entrada').first().json.phone;
const valor = parseFloat(d._valor || 0).toFixed(2)
  .replace('.', ',')
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const [y, m, day] = (d._vencimento || '').split('-');
const vencDisplay = day ? `${day}/${m}/${y}` : (d._vencimento || 'não informado');

const resposta = `Conta registrada ✅\n\n${d._conta}\nValor: R$ ${valor}\nVencimento: ${vencDisplay}\nStatus: pendente`;

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Preparar Conta Receber"
// Posição: entre Switch (saída 3) e Google Sheets Contas_Receber
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Preparar Conta Receber" --

const d = $input.first().json;
const ts = Date.now();

return [{
  json: {
    id: `receber_${ts}`,
    previsao: d.previsao || '',
    cliente: d.cliente || '',
    valor: parseFloat(d.valor) || 0,
    status: 'pendente',
    descricao: d.descricao || 'valor a receber',
    observacao: d.observacao || '',
    telefone_usuario: d._phone,
    created_at: d._created_at,
    _phone: d._phone,
    _cliente: d.cliente || '',
    _valor: parseFloat(d.valor) || 0,
    _previsao: d.previsao || ''
  }
}];


// =============================================================
// NODE: "Resposta Conta Receber"
// Posição: após Google Sheets salvar em Contas_Receber
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Resposta Conta Receber" --

const d = $input.first().json;
const phone = d._phone || $('Normalizar Entrada').first().json.phone;
const valor = parseFloat(d._valor || 0).toFixed(2)
  .replace('.', ',')
  .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const [y, m, day] = (d._previsao || '').split('-');
const prevDisplay = day ? `${day}/${m}/${y}` : 'não informado';

const resposta = `Valor a receber registrado ✅\n\nCliente: ${d._cliente}\nValor: R$ ${valor}\nPrevisão: ${prevDisplay}\nStatus: pendente`;

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Calcular Gastos"
// Posição: após Google Sheets ler Lancamentos (branch gastos)
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Calcular Gastos" --

const rows = $input.all();
const parsed = $('Parse JSON da IA').first().json;
const phone = parsed._phone;

// Mês atual no Brasil (UTC-3)
const now = new Date();
const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
const monthPrefix = `${brNow.getUTCFullYear()}-${String(brNow.getUTCMonth()+1).padStart(2, '0')}`;
const catFiltro = (parsed.categoria || '').toLowerCase();

const saidas = rows.filter(r => {
  const row = r.json;
  return row.tipo === 'saida'
    && row.data && row.data.startsWith(monthPrefix)
    && (!phone || row.telefone_usuario === phone)
    && (!catFiltro || row.categoria === catFiltro);
});

const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const total = saidas.reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);

const byCat = {};
saidas.forEach(r => {
  const cat = r.json.categoria || 'outros';
  byCat[cat] = (byCat[cat] || 0) + parseFloat(r.json.valor || 0);
});
const top3 = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);

let resposta = `Seus gastos em ${monthPrefix.split('-')[1]}/${monthPrefix.split('-')[0]}:\n\nTotal: ${fmt(total)}`;
if (top3.length > 0) {
  resposta += '\n\nPrincipais categorias:';
  top3.forEach(([cat, val], i) => {
    resposta += `\n${i+1}. ${cat} — ${fmt(val)}`;
  });
}
if (saidas.length === 0) resposta = 'Nenhum gasto registrado neste período.';

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Calcular Entradas"
// Posição: após Google Sheets ler Lancamentos (branch entradas)
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Calcular Entradas" --

const rows = $input.all();
const parsed = $('Parse JSON da IA').first().json;
const phone = parsed._phone;

const now = new Date();
const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
const monthPrefix = `${brNow.getUTCFullYear()}-${String(brNow.getUTCMonth()+1).padStart(2, '0')}`;

const entradas = rows.filter(r => {
  const row = r.json;
  return row.tipo === 'entrada'
    && row.data && row.data.startsWith(monthPrefix)
    && (!phone || row.telefone_usuario === phone);
});

const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const total = entradas.reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);

const byDesc = {};
entradas.forEach(r => {
  const desc = r.json.descricao || r.json.categoria || 'outros';
  byDesc[desc] = (byDesc[desc] || 0) + parseFloat(r.json.valor || 0);
});
const top3 = Object.entries(byDesc).sort((a, b) => b[1] - a[1]).slice(0, 3);

let resposta = `Suas entradas em ${monthPrefix.split('-')[1]}/${monthPrefix.split('-')[0]}:\n\nTotal: ${fmt(total)}`;
if (top3.length > 0) {
  resposta += '\n\nPrincipais fontes:';
  top3.forEach(([fonte, val], i) => {
    resposta += `\n${i+1}. ${fonte} — ${fmt(val)}`;
  });
}
if (entradas.length === 0) resposta = 'Nenhuma entrada registrada neste período.';

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Calcular Saldo"
// Posição: após Google Sheets ler Lancamentos (branch saldo)
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Calcular Saldo" --

const rows = $input.all();
const parsed = $('Parse JSON da IA').first().json;
const phone = parsed._phone;

const now = new Date();
const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
const monthPrefix = `${brNow.getUTCFullYear()}-${String(brNow.getUTCMonth()+1).padStart(2, '0')}`;

const mes = rows.filter(r => {
  const row = r.json;
  return row.data && row.data.startsWith(monthPrefix)
    && (!phone || row.telefone_usuario === phone);
});

const totalEntradas = mes.filter(r => r.json.tipo === 'entrada')
  .reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);
const totalSaidas = mes.filter(r => r.json.tipo === 'saida')
  .reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);
const saldo = totalEntradas - totalSaidas;

const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const saldoStr = saldo >= 0 ? fmt(saldo) : `-${fmt(Math.abs(saldo))}`;

const mes_ano = `${monthPrefix.split('-')[1]}/${monthPrefix.split('-')[0]}`;
const resposta = `Resumo de ${mes_ano}:\n\nEntradas: ${fmt(totalEntradas)}\nSaídas: ${fmt(totalSaidas)}\nSaldo: ${saldoStr}`;

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Listar Contas Pagar"
// Posição: após Google Sheets ler Contas_Pagar
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Listar Contas Pagar" --

const rows = $input.all();
const parsed = $('Parse JSON da IA').first().json;
const phone = parsed._phone;

const pendentes = rows.filter(r => {
  const row = r.json;
  return row.status === 'pendente'
    && (!phone || row.telefone_usuario === phone);
}).sort((a, b) => (a.json.vencimento || '').localeCompare(b.json.vencimento || ''));

const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

if (pendentes.length === 0) {
  return [{ json: { resposta: 'Nenhuma conta pendente no momento.', phone } }];
}

const total = pendentes.reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);

let resposta = 'Contas pendentes:';
pendentes.slice(0, 10).forEach((r, i) => {
  const row = r.json;
  const [y, m, d] = (row.vencimento || '').split('-');
  const vencDisplay = d ? `${d}/${m}/${y}` : 'sem data';
  resposta += `\n${i+1}. ${row.conta} — ${fmt(row.valor)} — vence ${vencDisplay}`;
});
resposta += `\n\nTotal pendente: ${fmt(total)}`;

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Listar Contas Receber"
// Posição: após Google Sheets ler Contas_Receber
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Listar Contas Receber" --

const rows = $input.all();
const parsed = $('Parse JSON da IA').first().json;
const phone = parsed._phone;

const pendentes = rows.filter(r => {
  const row = r.json;
  return row.status === 'pendente'
    && (!phone || row.telefone_usuario === phone);
}).sort((a, b) => (a.json.previsao || 'z').localeCompare(b.json.previsao || 'z'));

const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

if (pendentes.length === 0) {
  return [{ json: { resposta: 'Nenhum valor a receber no momento.', phone } }];
}

const total = pendentes.reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);

let resposta = 'Valores a receber:';
pendentes.slice(0, 10).forEach((r, i) => {
  const row = r.json;
  const [y, m, d] = (row.previsao || '').split('-');
  const prevDisplay = d ? `${d}/${m}/${y}` : 'sem previsão';
  resposta += `\n${i+1}. ${row.cliente} — ${fmt(row.valor)} — previsão: ${prevDisplay}`;
});
resposta += `\n\nTotal a receber: ${fmt(total)}`;

return [{ json: { resposta, phone } }];


// =============================================================
// NODE: "Calcular Resumo"
// Posição: após Google Sheets ler Lancamentos (branch resumo)
// Lê também Contas_Pagar via $('Ler Contas Pagar Resumo').all()
// =============================================================

// -- COLE ESTE CÓDIGO NO NODE "Calcular Resumo" --

const rows = $input.all();
const parsed = $('Parse JSON da IA').first().json;
const phone = parsed._phone;

const now = new Date();
const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));

// Semana atual: de segunda a hoje
const dayOfWeek = brNow.getUTCDay(); // 0=dom, 1=seg...
const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
const monday = new Date(brNow);
monday.setUTCDate(brNow.getUTCDate() + diffToMonday);
const pad = n => String(n).padStart(2, '0');
const mondayStr = `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth()+1)}-${pad(monday.getUTCDate())}`;
const todayStr = `${brNow.getUTCFullYear()}-${pad(brNow.getUTCMonth()+1)}-${pad(brNow.getUTCDate())}`;

const semana = rows.filter(r => {
  const row = r.json;
  return row.data >= mondayStr && row.data <= todayStr
    && (!phone || row.telefone_usuario === phone);
});

const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

const totalEntradas = semana.filter(r => r.json.tipo === 'entrada')
  .reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);
const totalSaidas = semana.filter(r => r.json.tipo === 'saida')
  .reduce((s, r) => s + parseFloat(r.json.valor || 0), 0);
const saldo = totalEntradas - totalSaidas;

const byCat = {};
semana.filter(r => r.json.tipo === 'saida').forEach(r => {
  const cat = r.json.categoria || 'outros';
  byCat[cat] = (byCat[cat] || 0) + parseFloat(r.json.valor || 0);
});
const top3 = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);

const saldoStr = saldo >= 0 ? fmt(saldo) : `-${fmt(Math.abs(saldo))}`;

let resposta = `Resumo da semana:\n\nEntradas: ${fmt(totalEntradas)}\nSaídas: ${fmt(totalSaidas)}\nSaldo: ${saldoStr}`;

if (top3.length > 0) {
  resposta += '\n\nMaiores gastos:';
  top3.forEach(([cat, val], i) => {
    resposta += `\n${i+1}. ${cat} — ${fmt(val)}`;
  });
}

return [{ json: { resposta, phone } }];
