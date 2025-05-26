let isExpandedView = false;
let globalRawData = []; // Store fetched data globally

const ordemMeses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const abrevMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const coresTemas = {
  "Academia Comercial": "#121212",
  "Academia de IA": "#50e3c2",
  "Academia de Liderança": "#D9A066",
  "Academia de Operações": "#A45A52",
  "Analytics": "#3D1E6D",
  "Ciclo de Carreira e Sucessão": "#F4E3C1",
  "Cultura": "#1B263B",
  "Cursos livres": "#778DA9",
  "Desenvolvimento T&D": "#2E6049",
  "Gestão da Mudança": "#6B8F71",
  "Onboarding": "#F5F5F5",
  "Pesquisa de Clima": "#5E3C58",
  "PMO FCA": "#415A77",
  "Programa de Aprendizagem": "#A8C3BC",
  "Programa de Multiplicadores Internos": "#953D3D",
  "Programa Trainee": "#C1440E",
  "Programas de Aceleração de talentos": "#4A4A4A",
  "Templo": "#1B3B2F",
  "Treinamentos Obrigatórios Corporativos": "#5A2A27",
  "Trilha de Custificação": "#0D1B2A"
};

function corTema(nome) {
  return coresTemas[nome] || '#4a90e2'; // Retorna a cor do tema ou um azul padrão
}

// --- Elementos DOM --- 
const loadingEl = document.getElementById('loading');
const heatmapBody = document.getElementById("heatmap-body");
const toggleViewBtn = document.getElementById('toggle-view');
const modal = document.getElementById('cronograma-modal');
const modalTitulo = document.getElementById('cronograma-titulo');
const modalDetalhes = document.getElementById('cronograma-detalhes');
const fecharModalBtn = document.getElementById('fechar-cronograma');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const navLinks = document.querySelector('.nav-links');

// --- Fetch e Renderização do Heatmap --- 
function renderHeatmap(data) {
  if (!heatmapBody) return; // Exit if table body not found
  loadingEl.style.display = 'none';

  const temasPermitidos = [
    "Academia Comercial", "Academia de IA", "Academia de Liderança", "Academia de Operações",
    "Ciclo de Carreira e Sucessão", "Onboarding", "Pesquisa de Clima", "Programa de Aprendizagem",
    "Programa Trainee", "Programas de Aceleração de talentos"
  ];

  const filteredData = data.filter(item => temasPermitidos.includes(item["Tema"]));
  const temas = temasPermitidos.filter(tema => filteredData.some(item => item["Tema"] === tema));

  const temasPorMes = {};
  temas.forEach(tema => {
    temasPorMes[tema] = {};
    ordemMeses.forEach(m => temasPorMes[tema][m] = []);
  });

  filteredData.forEach(row => {
    if (row["Tema"] && row["Mês"] && ordemMeses.includes(row["Mês"])) {
      temasPorMes[row["Tema"]][row["Mês"]].push(row);
    }
  });

  const fragment = document.createDocumentFragment();
  temas.forEach(tema => {
    const tr = document.createElement('tr');
    const tdTema = document.createElement('td');
    tdTema.className = 'tema-label';
    tdTema.textContent = tema;
    // Event listener moved to heatmapBody (delegation)
    tr.appendChild(tdTema);

    ordemMeses.forEach(mes => {
      const atividadesMes = temasPorMes[tema][mes];
      const hasActivity = atividadesMes.length > 0;
      const td = document.createElement('td');
      td.className = hasActivity ? 'heatmap-cell heatmap-cell-active' : 'heatmap-cell heatmap-cell-empty';
      td.setAttribute('role', 'cell');

      if (hasActivity) {
        const temaCor = corTema(tema);
        td.style.setProperty('--theme-color', temaCor);
        const indicator = document.createElement('div');
        indicator.className = 'cell-indicator';
        td.appendChild(indicator);
        td.dataset.theme = tema;
        td.dataset.month = mes;
        // Event listener moved to heatmapBody (delegation)
      } else {
        td.setAttribute('aria-label', `Sem atividade em ${mes}`);
      }
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  heatmapBody.innerHTML = '';
  heatmapBody.appendChild(fragment);

  const ths = document.querySelectorAll('.tema-heatmap-table th');
  for (let i = 1; i <= 12; i++) {
    if (ths[i]) ths[i].innerText = abrevMeses[i - 1];
  }
}

// --- Toggle Visão Expandida/Compacta --- 
function toggleExpandedView(data) {
  isExpandedView = !isExpandedView;
  if (toggleViewBtn) {
      toggleViewBtn.innerHTML = isExpandedView ?
        '<i class="fas fa-compress-alt"></i><span>Visualização Compacta</span>' :
        '<i class="fas fa-expand-alt"></i><span>Visualização Expandida</span>';
  }

  const cells = document.querySelectorAll('.heatmap-cell');
  cells.forEach(cell => {
    cell.classList.toggle('expanded', isExpandedView);

    // Remove existing activity list if present
    const existingActivityList = cell.querySelector('.activity-list');
    if (existingActivityList) {
        existingActivityList.remove();
    }

    if (isExpandedView && cell.classList.contains('heatmap-cell-active')) {
      const cellTheme = cell.dataset.theme;
      const cellMonth = cell.dataset.month;

      const monthActivities = data.filter(item =>
        item.Tema === cellTheme &&
        item.Mês === cellMonth
      );

      if (monthActivities.length > 0) {
        const activityList = document.createElement('ul');
        activityList.className = 'activity-list';

        monthActivities.forEach(activity => {
          const li = document.createElement('li');
          const statusClass = (activity.Status || '').toLowerCase().replace(/\s+/g, '');
          li.className = `activity-item ${statusClass}`;
          li.style.setProperty('--theme-color', corTema(cellTheme));
          li.innerHTML = `<span class="activity-name">${activity.Atividade || 'Atividade sem nome'}</span>`;
          activityList.appendChild(li);
        });
        cell.appendChild(activityList); // Append the new list
      }
    }
    // No need to re-attach listeners due to delegation
  });
}

// --- Modal Cronograma --- 
function abrirCronograma(tema, atividades) {
  if (!modal || !modalTitulo || !modalDetalhes) return; // Exit if modal elements not found

  modalTitulo.textContent = tema;
  modalDetalhes.innerHTML = '';

  const parseDate = d => {
      if (!d) return new Date(0);
      if (d.includes('/')) {
          const parts = d.split('/');
          // Ensure correct parsing for dd/mm/yyyy
          if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      // Try parsing directly (handles yyyy-mm-dd and other standard formats)
      const date = new Date(d);
      return isNaN(date) ? new Date(0) : date; // Return epoch if invalid
  };

  const acoesOrdenadas = atividades.sort((a, b) => parseDate(a.Data) - parseDate(b.Data));

  if (acoesOrdenadas.length === 0) {
    modalDetalhes.innerHTML = "<p>Nenhuma ação encontrada para este filtro.</p>";
  } else {
    acoesOrdenadas.forEach(acao => {
      const div = document.createElement('div');
      const status = (acao.Status || '').toLowerCase();
      let statusClass = 'afazer';
      if (status.includes('andamento')) statusClass = 'emandamento';
      else if (status.includes('realizado') || status.includes('feito') || status.includes('concluído')) statusClass = 'realizado';

      div.className = `cronograma-acao ${statusClass}`;
      div.style.setProperty('--tema-cor', corTema(tema));
      div.innerHTML = `
        <strong>${acao.Atividade || 'Atividade não especificada'}</strong>
        <span><b>Data:</b> ${acao.Data || 'N/D'}</span>
        <span><b>Responsável:</b> ${acao.Responsável || 'N/D'}</span>
        <span><b>Status:</b> ${acao.Status || 'N/D'}</span>
        <span><b>Impacto:</b> ${acao.Impacto || 'N/D'}</span>
      `;
      modalDetalhes.appendChild(div);
    });
  }
  modal.classList.add('show');
}

function fecharCronograma() {
  if (modal) modal.classList.remove('show');
}

// --- Event Listeners --- 

document.addEventListener('DOMContentLoaded', () => {
    // Fetch inicial
    fetch('atividades.json')
      .then(response => {
        if (!response.ok) throw new Error(`Erro de rede: ${response.statusText}`);
        return response.json();
      })
      .then(rawData => {
        globalRawData = rawData; // Store data
        renderHeatmap(globalRawData); // Initial render

        // Add listener for toggle view *after* initial render
        if (toggleViewBtn) {
            toggleViewBtn.addEventListener('click', () => toggleExpandedView(globalRawData));
        }

        // Add delegated listener for modal opening *after* initial render
        if (heatmapBody) {
            heatmapBody.addEventListener('click', (event) => {
                const target = event.target;
                const themeLabel = target.closest('.tema-label');
                const activeCell = target.closest('.heatmap-cell-active');

                if (themeLabel) {
                    const theme = themeLabel.textContent;
                    const themeActivities = globalRawData.filter(item => item.Tema === theme);
                    abrirCronograma(theme, themeActivities);
                } else if (activeCell && !isExpandedView) {
                    const theme = activeCell.dataset.theme;
                    const month = activeCell.dataset.month;
                    const cellActivities = globalRawData.filter(item => item.Tema === theme && item.Mês === month);
                    abrirCronograma(theme, cellActivities);
                }
            });
        }
      })
      .catch(error => {
        if (loadingEl) loadingEl.textContent = 'Erro ao carregar os dados. Tente novamente mais tarde.';
        console.error('Houve um problema com a operação de fetch:', error);
      });

    // Modal Listeners
    if (fecharModalBtn) fecharModalBtn.addEventListener('click', fecharCronograma);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) fecharCronograma();
        });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === "Escape" && modal && modal.classList.contains('show')) {
        fecharCronograma();
      }
    });

    // Menu Mobile Toggle Listener
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // Navegação Link Listener (simple redirect)
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href !== "#") {
          // Allow default navigation
        } else {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            if (navLinks && navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
            }
        }
      });
    });

    // Close mobile menu on outside click
    document.addEventListener('click', function(e) {
        if (navLinks && navLinks.classList.contains('open')) {
            const isClickInsideNav = navLinks.contains(e.target);
            const isClickOnToggle = mobileMenuToggle && mobileMenuToggle.contains(e.target);
            if (!isClickInsideNav && !isClickOnToggle) {
                navLinks.classList.remove('open');
            }
        }
    });
});

