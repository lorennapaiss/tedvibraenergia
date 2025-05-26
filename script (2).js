let atividades = [];
const temasExpandidos = new Set();

// Função para carregar atividades do JSON
function carregarAtividades(callback) {
    // Verifica se o arquivo atividades.json existe antes de tentar carregar
    // Isso evita erros em páginas que não usam esse arquivo.
    fetch('atividades.json')
        .then(response => {
            if (!response.ok) {
                // Se o arquivo não for encontrado (404), não lança erro, apenas retorna vazio
                if (response.status === 404) {
                    console.warn('Arquivo atividades.json não encontrado. Algumas funcionalidades podem não estar disponíveis.');
                    return []; // Retorna array vazio para não quebrar o resto
                }
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Processa os dados apenas se não for um array vazio (ou seja, se o fetch foi bem-sucedido)
            if (Array.isArray(data) && data.length > 0) {
                 atividades = data.map(row => ({
                    mes: row["Mês"],
                    data: row["Data"],
                    tema: row["Tema"],
                    atividade: row["Atividade"],
                    responsavel: row["Responsável"],
                    status: row["Status"],
                    observacoes: row["Impacto"] || ""
                }));
            } else {
                atividades = []; // Garante que atividades seja um array vazio se o fetch falhar ou retornar vazio
            }

            if (typeof callback === "function") callback();
        })
        .catch(error => {
            console.error('Houve um problema com a operação de fetch para atividades.json:', error);
            atividades = []; // Garante que atividades seja um array vazio em caso de erro
            if (typeof callback === "function") callback(); // Chama o callback mesmo em caso de erro
        });
}

// Função para obter valores únicos
function getUnique(arr, key) {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map(item => item[key]).filter(Boolean))]; // Filtra valores nulos/undefined
}

// ----------- SUMÁRIO EXECUTIVO (index.html) -----------
function preencherFiltrosSumario() {
    const mesSelect = document.getElementById('mes');
    const responsavelSelect = document.getElementById('responsavel');
    const temaSelect = document.getElementById('tema');

    // Só preenche se os elementos existirem E houver atividades carregadas
    if ((mesSelect || responsavelSelect || temaSelect) && atividades.length > 0) {
        const meses = getUnique(atividades, 'mes');
        const responsaveis = getUnique(atividades, 'responsavel');
        const temas = getUnique(atividades, 'tema');

        if (mesSelect) mesSelect.innerHTML = '<option value="">Todos</option>' + meses.map(m => `<option value="${m}">${m}</option>`).join('');
        if (responsavelSelect) responsavelSelect.innerHTML = '<option value="">Todos</option>' + responsaveis.map(r => `<option value="${r}">${r}</option>`).join('');
        if (temaSelect) temaSelect.innerHTML = '<option value="">Todos</option>' + temas.map(t => `<option value="${t}">${t}</option>`).join('');
    }
}

function filtrarSumario() {
    const mesSelect = document.getElementById('mes');
    const responsavelSelect = document.getElementById('responsavel');
    const temaSelect = document.getElementById('tema');
    const mes = mesSelect ? mesSelect.value : '';
    const responsavel = responsavelSelect ? responsavelSelect.value : '';
    const tema = temaSelect ? temaSelect.value : '';

    const atividadesFiltradasSumario = atividades.filter(a =>
        (mes === "" || a.mes === mes) &&
        (responsavel === "" || a.responsavel === responsavel) &&
        (tema === "" || a.tema === tema)
    );
    renderKPIs(atividadesFiltradasSumario);
    renderGraficos(atividadesFiltradasSumario);
}

function resetarFiltrosSumario() {
    const mesSelect = document.getElementById('mes');
    const responsavelSelect = document.getElementById('responsavel');
    const temaSelect = document.getElementById('tema');
    if (mesSelect) mesSelect.value = '';
    if (responsavelSelect) responsavelSelect.value = '';
    if (temaSelect) temaSelect.value = '';
    renderKPIs(atividades); // Mostra KPIs com todos os dados
    renderGraficos(atividades); // Mostra gráficos com todos os dados
}

// KPIs
function renderKPIs(data) {
    const elTotal = document.getElementById('kpi-total');
    const elConcluidas = document.getElementById('kpi-concluidas');
    const elAndamento = document.getElementById('kpi-andamento');
    const elPendentes = document.getElementById('kpi-pendentes');

    // Só renderiza se os elementos existirem
    if (elTotal || elConcluidas || elAndamento || elPendentes) {
        const total = data.length;
        const concluidas = data.filter(a => a.status === "Realizado").length;
        const andamento = data.filter(a => a.status === "Em andamento").length;
        const pendentes = data.filter(a => a.status === "A fazer").length;

        if (elTotal)      elTotal.innerHTML      = `<strong>${total}</strong>Total de Atividades`;
        if (elConcluidas) elConcluidas.innerHTML = `<strong>${concluidas}</strong>Concluídas`;
        if (elAndamento)  elAndamento.innerHTML  = `<strong>${andamento}</strong>Em Andamento`;
        if (elPendentes)  elPendentes.innerHTML  = `<strong>${pendentes}</strong>Pendentes`;
    }
}

// Gráficos
let chartStatusMes, chartResponsavel, chartTema;

function renderGraficos(data) {
    const grafStatusMesCtx = document.getElementById('graficoStatusMes')?.getContext('2d');
    const grafResponsavelCtx = document.getElementById('graficoResponsavel')?.getContext('2d');
    const grafTemaCtx = document.getElementById('graficoTema')?.getContext('2d');

    // Renderiza Status por Mês se o canvas existir
    if (grafStatusMesCtx) {
        const ordemMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const meses = getUnique(data, 'mes').sort((a, b) => ordemMeses.indexOf(a) - ordemMeses.indexOf(b));
        const statusList = ["Realizado", "Em andamento", "A fazer"];
        const datasets = statusList.map(status => ({
            label: status,
            data: meses.map(mes => data.filter(a => a.mes === mes && a.status === status).length),
            backgroundColor: status === "Realizado" ? "#009933" : status === "Em andamento" ? "#0047BB" : "#FFCC00" // Usando cores da paleta
        }));

        if (chartStatusMes) chartStatusMes.destroy();
        chartStatusMes = new Chart(grafStatusMesCtx, {
            type: 'bar',
            data: { labels: meses, datasets: datasets },
            options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } }
        });
    }

    // Renderiza Atividades por Responsável se o canvas existir
    if (grafResponsavelCtx) {
        const responsaveis = getUnique(data, 'responsavel');
        const dataResp = responsaveis.map(r => data.filter(a => a.responsavel === r).length);
        const backgroundColorsResp = ['#4E79A7', '#A0CBE8', '#F28E2B', '#FFBE7D', '#59A14F', '#8CD17D', '#B6992D', '#F1CE63', '#499894', '#86BCB6']; // Cores padrão

        if (chartResponsavel) chartResponsavel.destroy();
        chartResponsavel = new Chart(grafResponsavelCtx, {
            type: 'doughnut',
            data: { labels: responsaveis, datasets: [{ data: dataResp, backgroundColor: backgroundColorsResp }] },
            options: { responsive: true, plugins: { legend: { position: 'right' } } }
        });
    }

    // Renderiza Atividades por Tema se o canvas existir
    if (grafTemaCtx) {
        const temas = getUnique(data, 'tema');
        const dataTema = temas.map(t => data.filter(a => a.tema === t).length);
        const backgroundColorsTema = [
            '#4E79A7', '#A0CBE8', '#F28E2B', '#FFBE7D', '#59A14F', '#8CD17D',
            '#B6992D', '#F1CE63', '#499894', '#86BCB6', '#E15759', '#FF9D9A',
            '#79706E', '#BAB0AC', '#D37295', '#FABFD2', '#B07AA1', '#D4A6C8',
            '#9D7660', '#D7B5A6'
        ]; // Cores padrão

        if (chartTema) chartTema.destroy();
        chartTema = new Chart(grafTemaCtx, {
            type: 'bar',
            data: { labels: temas, datasets: [{ label: "Quantidade", data: dataTema, backgroundColor: backgroundColorsTema }] },
            options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
    }
}

// ----------- CRONOGRAMA DETALHADO (cronograma.html) -----------
function preencherFiltrosDetalhado() {
    const mesDetalhado = document.getElementById('mes-detalhado');
    const responsavelDetalhado = document.getElementById('responsavel-detalhado');
    const temaDetalhado = document.getElementById('tema-detalhado');

    // Só preenche se os elementos existirem E houver atividades carregadas
    if ((mesDetalhado || responsavelDetalhado || temaDetalhado) && atividades.length > 0) {
        const meses = getUnique(atividades, 'mes');
        const responsaveis = getUnique(atividades, 'responsavel');
        const temas = getUnique(atividades, 'tema');

        if (mesDetalhado) mesDetalhado.innerHTML = '<option value="">Todos</option>' + meses.map(m => `<option value="${m}">${m}</option>`).join('');
        if (responsavelDetalhado) responsavelDetalhado.innerHTML = '<option value="">Todos</option>' + responsaveis.map(r => `<option value="${r}">${r}</option>`).join('');
        if (temaDetalhado) temaDetalhado.innerHTML = '<option value="">Todos</option>' + temas.map(t => `<option value="${t}">${t}</option>`).join('');
    }
}

function renderizarTabela(filtro = {}) {
    const tbody = document.querySelector('#cronograma tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let filtradas = atividades;

    if (filtro.mes) filtradas = filtradas.filter(a => a.mes === filtro.mes);
    if (filtro.responsavel) filtradas = filtradas.filter(a => a.responsavel === filtro.responsavel);
    if (filtro.tema) filtradas = filtradas.filter(a => a.tema === filtro.tema);

    const temas = getUnique(filtradas, 'tema');
    temas.forEach(tema => {
        const atividadesTema = filtradas.filter(a => a.tema === tema);
        const total = atividadesTema.length;
        const concluidas = atividadesTema.filter(a => a.status === "Realizado").length;
        const percentual = total === 0 ? 0 : Math.round((concluidas / total) * 100);

        const trResumo = document.createElement('tr');
        trResumo.className = 'theme-summary-row';
        trResumo.dataset.tema = tema; // Adiciona dataset para identificar o tema
        trResumo.innerHTML = `
            <td><span class="expander">${temasExpandidos.has(tema) ? '−' : '+'}</span></td>
            <td>${tema}</td>
            <td>
              <div class="theme-progress-bar-container">
                <div class="theme-progress-bar" style="width: ${percentual}%;"></div>
              </div>
              <span class="percent-label">${percentual}%</span>
            </td>
            <td>${total}</td>
            <td>${concluidas}</td>
            <td>${atividadesTema.filter(a => a.status === "Em andamento").length}</td>
            <td>${atividadesTema.filter(a => a.status === "A fazer").length}</td>
            <td></td> <!-- Coluna Observações vazia no resumo -->
        `;
        tbody.appendChild(trResumo);

        // Adiciona listener de clique na linha de resumo (delegação)
        trResumo.addEventListener('click', toggleTemaDetalhes);

        atividadesTema.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'task-detail-row' + (temasExpandidos.has(tema) ? ' visible' : '');
            tr.dataset.temaPai = tema; // Adiciona dataset para saber a qual tema pertence
            tr.innerHTML = `
                <td></td>
                <td></td>
                <td></td> <!-- Coluna Progresso vazia no detalhe -->
                <td>${item.data || ''}</td>
                <td>${item.atividade || ''}</td>
                <td>${item.responsavel || ''}</td>
                <td class="status-${(item.status || '').replace(/\s/g, '')}">${item.status || ''}</td>
                <td>${item.observacoes || ''}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// Função para expandir/recolher detalhes do tema
function toggleTemaDetalhes(event) {
    const summaryRow = event.currentTarget; // A linha de resumo que foi clicada
    const tema = summaryRow.dataset.tema;
    const expander = summaryRow.querySelector('.expander');
    const detailRows = document.querySelectorAll(`.task-detail-row[data-tema-pai="${tema}"]`);

    if (temasExpandidos.has(tema)) {
        temasExpandidos.delete(tema);
        expander.textContent = '+';
        detailRows.forEach(row => row.classList.remove('visible'));
    } else {
        temasExpandidos.add(tema);
        expander.textContent = '−';
        detailRows.forEach(row => row.classList.add('visible'));
    }
}

function filtrarDetalhado() {
    const mes = document.getElementById('mes-detalhado')?.value || '';
    const responsavel = document.getElementById('responsavel-detalhado')?.value || '';
    const tema = document.getElementById('tema-detalhado')?.value || '';
    renderizarTabela({ mes, responsavel, tema });
}

function resetarFiltrosDetalhado() {
    const mesDetalhado = document.getElementById('mes-detalhado');
    const responsavelDetalhado = document.getElementById('responsavel-detalhado');
    const temaDetalhado = document.getElementById('tema-detalhado');
    if(mesDetalhado) mesDetalhado.value = '';
    if(responsavelDetalhado) responsavelDetalhado.value = '';
    if(temaDetalhado) temaDetalhado.value = '';
    renderizarTabela();
}

// --- Inicialização e Menu Superior --- 
document.addEventListener('DOMContentLoaded', () => {
    carregarAtividades(() => {
        // Chama as funções de renderização e preenchimento após carregar os dados
        // Verifica a existência dos elementos antes de chamar as funções
        if (document.getElementById('kpis')) {
            renderKPIs(atividades);
        }
        if (document.getElementById('graficos')) {
            renderGraficos(atividades);
        }
        if (document.getElementById('filtros')) {
            preencherFiltrosSumario();
        }
        if (document.getElementById('filtros-detalhado')) {
            preencherFiltrosDetalhado();
        }
        if (document.querySelector('#cronograma tbody')) {
            renderizarTabela();
        }
    });

    // Lógica do Menu Superior
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // Fecha o menu mobile se clicar fora dele
    document.addEventListener('click', function(e) {
        if (navLinks && navLinks.classList.contains('open')) {
            const isClickInsideNav = navLinks.contains(e.target);
            const isClickOnToggle = mobileMenuToggle && mobileMenuToggle.contains(e.target);

            if (!isClickInsideNav && !isClickOnToggle) {
                navLinks.classList.remove('open');
            }
        }
    });

    // Fecha o menu mobile ao clicar em um link (opcional, mas bom para UX)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks && navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
            }
            // Lógica para destacar link ativo (se necessário, pode ser feito com CSS :active ou JS)
            // document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            // link.classList.add('active'); // A classe 'active' já está sendo setada no HTML
        });
    });
});

// Adiciona funções de filtro ao escopo global se os botões usam onclick=""
window.filtrarSumario = filtrarSumario;
window.resetarFiltrosSumario = resetarFiltrosSumario;
window.filtrarDetalhado = filtrarDetalhado;
window.resetarFiltrosDetalhado = resetarFiltrosDetalhado;

