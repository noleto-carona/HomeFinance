// Mock Data inicial
const INITIAL_DATA_RAW = [];

const DEFAULT_CATEGORIES = [
    "Moradia", "Cartão de Crédito", "Transporte", "Serviços", "Lazer", "Outros", "Alimentação", "Saúde"
];

const MONTHLY_GOAL = 6000.00;

// Estado
let expenses = [];
let categories = [];
let currentDate = new Date();
let dashboardScope = 'monthly'; // 'monthly' or 'annual'
let monthlySettings = {};
let accordionState = {};
let monthLocks = {};
let githubToken = '';
let githubRepo = '';

// Elementos DOM
const expenseListEl = document.getElementById('expense-list');
const currentBalanceEl = document.getElementById('current-balance');
const totalExpensesEl = document.getElementById('total-expenses');
const modal = document.getElementById('modal');
const form = document.getElementById('expense-form');
const addBtn = document.getElementById('add-btn');
const closeBtn = document.getElementById('close-modal');
const deleteBtn = document.getElementById('delete-btn');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthDisplay = document.getElementById('current-month-display');
const emptyStateEl = document.getElementById('empty-state');
const copyPrevMonthBtn = document.getElementById('copy-prev-month-btn');
const lockMonthBtn = document.getElementById('lock-month-btn');

// View Control
const navItems = document.querySelectorAll('.nav-item[data-tab]');
const views = document.querySelectorAll('.content');
const categoryChartEl = document.getElementById('category-chart');
const dashboardTitleEl = document.getElementById('dashboard-chart-title');
const dashboardTotalValueEl = document.getElementById('dashboard-total-value');
const dashboardDeficitValueEl = document.getElementById('dashboard-deficit-value');
const deficitTrendEl = document.getElementById('deficit-trend');
const scopeBtns = document.querySelectorAll('.scope-btn');

// Settings Elements
const settingsCategoryListEl = document.getElementById('settings-category-list');
const addCategoryBtn = document.getElementById('add-category-btn');
const resetBtn = document.getElementById('reset-data-btn');
const monthlyGoalInput = document.getElementById('monthly-goal-input');
const salaryInput = document.getElementById('salary-input');
const otherIncomeInput = document.getElementById('other-income-input');
const cardReimburseInput = document.getElementById('card-reimburse-input');
const loanReturnInput = document.getElementById('loan-return-input');
const saveMonthSettingsBtn = document.getElementById('save-month-settings-btn');
const cumulativeDeficitEl = document.getElementById('cumulative-deficit');

// Formatação
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Data Helpers
const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;
const getMonthName = (date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

function computeIncomeForMonthKey(key) {
    const s = monthlySettings[key] || {};
    return (s.salary || 0) + (s.otherIncome || 0) + (s.cardReimburse || 0) + (s.loanReturn || 0);
}

function computeMonthlyExpensesTotal(key) {
    return expenses.filter(e => e.monthKey === key).reduce((acc, curr) => acc + curr.amount, 0);
}

function computeCumulativeDeficit() {
    const keys = new Set([...Object.keys(monthlySettings), ...expenses.map(e => e.monthKey)]);
    let sum = 0;
    keys.forEach(key => {
        const diff = computeMonthlyExpensesTotal(key) - computeIncomeForMonthKey(key);
        if (diff > 0) sum += diff;
    });
    return sum;
}

function computeYearlyDeficit(year) {
    let sum = 0;
    for (let m = 0; m < 12; m++) {
        const key = `${year}-${m}`;
        const diff = computeMonthlyExpensesTotal(key) - computeIncomeForMonthKey(key);
        if (diff > 0) sum += diff;
    }
    return sum;
}

function renderDeficitTrend(year) {
    if (!deficitTrendEl) return;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const values = [];
    for (let m = 0; m < 12; m++) {
        const key = `${year}-${m}`;
        const diff = computeMonthlyExpensesTotal(key) - computeIncomeForMonthKey(key);
        values.push(diff > 0 ? diff : 0);
    }
    const max = Math.max(...values, 0.01);
    deficitTrendEl.innerHTML = '';
    values.forEach((v, i) => {
        const item = document.createElement('div');
        item.className = 'trend-item';
        const percent = document.createElement('span');
        percent.className = `trend-percent ${v > 0 ? 'negative' : 'positive'}`;
        percent.textContent = `${((v / max) * 100).toFixed(1).replace('.', ',')}%`;
        const bar = document.createElement('div');
        bar.className = 'trend-bar';
        const fill = document.createElement('div');
        fill.className = `trend-bar-fill ${v > 0 ? 'negative' : 'positive'}`;
        fill.style.height = `${Math.round((v / max) * 100)}%`;
        fill.title = v > 0 ? `${formatCurrency(-v)}` : 'Sem déficit';
        bar.appendChild(fill);
        item.appendChild(percent);
        const label = document.createElement('span');
        label.className = 'trend-label';
        label.textContent = months[i];
        item.appendChild(bar);
        item.appendChild(label);
        deficitTrendEl.appendChild(item);
    });
}

// Inicialização
function init() {
    loadData();
    updateMonthDisplay();
    render();
    setupEventListeners();
}

// Migração e Carregamento
function loadData() {
    const savedExpenses = localStorage.getItem('expenses');
    const savedCategories = localStorage.getItem('categories');
    const savedSettings = localStorage.getItem('monthlySettings');
    const savedAccordion = localStorage.getItem('accordionState');
    const savedLocks = localStorage.getItem('monthLocks');

    // Carregar Categorias
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
    } else {
        categories = [...DEFAULT_CATEGORIES];
        saveCategories();
    }

    if (savedSettings) {
        monthlySettings = JSON.parse(savedSettings);
    } else {
        monthlySettings = {};
        saveMonthlySettings();
    }

    if (savedAccordion) {
        try {
            accordionState = JSON.parse(savedAccordion) || {};
        } catch {
            accordionState = {};
        }
    } else {
        accordionState = {};
        localStorage.setItem('accordionState', JSON.stringify(accordionState));
    }

    if (savedLocks) {
        try {
            monthLocks = JSON.parse(savedLocks) || {};
        } catch {
            monthLocks = {};
        }
    } else {
        monthLocks = {};
        localStorage.setItem('monthLocks', JSON.stringify(monthLocks));
    }

    // Carregar Config GitHub
    githubToken = localStorage.getItem('githubToken') || '';
    githubRepo = localStorage.getItem('githubRepo') || '';

    // Tentar carregar do .env se não estiver no localStorage
    if (!githubToken || !githubRepo) {
        fetch('.env')
            .then(response => {
                if (response.ok) return response.text();
                return null;
            })
            .then(text => {
                if (text) {
                    const lines = text.split('\n');
                    lines.forEach(line => {
                        const [key, value] = line.split('=');
                        if (key && value) {
                            const cleanValue = value.trim();
                            if (key.trim() === 'GITHUB_TOKEN' && !githubToken) {
                                githubToken = cleanValue;
                                // Salvar no localStorage para persistência futura
                                localStorage.setItem('githubToken', cleanValue);
                            }
                            if (key.trim() === 'GITHUB_REPO' && !githubRepo) {
                                githubRepo = cleanValue;
                                localStorage.setItem('githubRepo', cleanValue);
                            }
                        }
                    });
                    // Atualizar UI se carregar
                    if (document.getElementById('github-token')) document.getElementById('github-token').value = githubToken;
                    if (document.getElementById('github-repo')) document.getElementById('github-repo').value = githubRepo;
                }
            })
            .catch(console.error);
    }

    if (document.getElementById('github-token')) document.getElementById('github-token').value = githubToken;
    if (document.getElementById('github-repo')) document.getElementById('github-repo').value = githubRepo;

    // Carregar Despesas
    if (savedExpenses) {
        let rawData = JSON.parse(savedExpenses);

        // Migração simples
        if (rawData.length > 0 && !rawData[0].monthKey) {
            expenses = rawData.map(e => ({
                ...e,
                monthKey: '2026-0',
                category: e.category || 'Outros'
            }));
            saveData();
        } else {
            expenses = rawData;
        }
    } else {
        // Dados iniciais para Jan 2026
        expenses = INITIAL_DATA_RAW.map(e => ({
            ...e,
            monthKey: '2026-0'
        }));
        saveData();
    }
}

function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    render();
}

function saveCategories() {
    localStorage.setItem('categories', JSON.stringify(categories));
    renderSettings(); // Atualizar lista nas configs
}

function saveMonthlySettings() {
    localStorage.setItem('monthlySettings', JSON.stringify(monthlySettings));
}

function getSettingsForCurrentMonth() {
    const key = getMonthKey(currentDate);
    const defaults = { goal: MONTHLY_GOAL, salary: 0, otherIncome: 0, cardReimburse: 0, loanReturn: 0 };
    return monthlySettings[key] ? { ...defaults, ...monthlySettings[key] } : defaults;
}

// Renderização Principal
function render() {
    const currentKey = getMonthKey(currentDate);
    const currentExpenses = expenses.filter(e => e.monthKey === currentKey);

    renderExpenses(currentExpenses);
    renderSummary(currentExpenses);
    renderDashboard(currentExpenses);
    renderSettings();
    applyAccordionState();

    // Botão copiar mês anterior
    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevKey = getMonthKey(prevDate);
    const hasPrevData = expenses.some(e => e.monthKey === prevKey);

    if (currentExpenses.length === 0 && hasPrevData) {
        copyPrevMonthBtn.classList.remove('hidden');
        emptyStateEl.classList.add('hidden');
    } else {
        copyPrevMonthBtn.classList.add('hidden');
        if (currentExpenses.length === 0) emptyStateEl.classList.remove('hidden');
    }
}

function applyAccordionState() {
    const contents = document.querySelectorAll('.accordion-content');
    contents.forEach(content => {
        const id = content.id || '';
        const saved = typeof accordionState[id] === 'boolean' ? accordionState[id] : !content.classList.contains('collapsed');
        content.classList.toggle('hidden', !saved);
        const header = document.querySelector(`.accordion-toggle[data-target="${id}"]`);
        if (header) {
            const icon = header.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-chevron-down', !saved);
                icon.classList.toggle('fa-chevron-up', saved);
            }
        }
    });
}

function renderExpenses(list) {
    expenseListEl.innerHTML = '';

    if (list.length === 0) return;

    emptyStateEl.classList.add('hidden');
    list.sort((a, b) => a.day - b.day);

    list.forEach(expense => {
        const li = document.createElement('li');
        li.className = `expense-item ${expense.paid ? 'paid' : 'unpaid'}`;
        li.onclick = () => openModal(expense);

        li.innerHTML = `
            <div class="item-left">
                <span class="item-desc">${expense.description}</span>
                <div class="item-meta">
                    <span class="item-category">${expense.category || 'Outros'}</span>
                    <span>Dia ${expense.day}</span>
                </div>
            </div>
            <div class="item-right">
                <div class="item-amount">${formatCurrency(expense.amount)}</div>
                <div class="item-status ${expense.paid ? 'status-paid' : 'status-pending'}">
                    ${expense.paid ? 'Pago' : 'Pendente'}
                </div>
            </div>
        `;
        expenseListEl.appendChild(li);
    });
}

function renderSummary(list) {
    const total = list.reduce((acc, curr) => acc + curr.amount, 0);
    const pendingTotal = list.filter(e => !e.paid).reduce((acc, curr) => acc + curr.amount, 0);
    const s = getSettingsForCurrentMonth();
    const incomeTotal = (s.salary || 0) + (s.otherIncome || 0) + (s.cardReimburse || 0) + (s.loanReturn || 0);
    const balance = incomeTotal - total;

    totalExpensesEl.textContent = formatCurrency(total);
    totalExpensesEl.className = `card-value ${total > (s.goal || 0) ? 'value-negative' : 'value-positive'}`;
    const totalPendingEl = document.getElementById('total-pending');
    if (totalPendingEl) {
        totalPendingEl.textContent = formatCurrency(pendingTotal);
        totalPendingEl.className = `card-value ${pendingTotal > 0 ? 'value-negative' : 'value-positive'}`;
    }
    currentBalanceEl.textContent = formatCurrency(balance);
    const monthlyGoalEl = document.getElementById('monthly-goal');
    if (monthlyGoalEl) monthlyGoalEl.textContent = formatCurrency(s.goal);

    if (balance >= 0) {
        currentBalanceEl.className = 'card-value value-positive';
    } else {
        currentBalanceEl.className = 'card-value value-negative';
    }
    if (cumulativeDeficitEl) {
        const cumulative = computeCumulativeDeficit();
        cumulativeDeficitEl.textContent = cumulative > 0 ? formatCurrency(-cumulative) : formatCurrency(0);
        cumulativeDeficitEl.className = `card-value ${cumulative > 0 ? 'value-negative' : 'value-positive'}`;
    }
}

function renderDashboard(monthlyList) {
    let listToRender = monthlyList;

    if (dashboardScope === 'annual') {
        const year = currentDate.getFullYear();
        listToRender = expenses.filter(e => {
            const [eYear] = e.monthKey.split('-');
            return parseInt(eYear) === year;
        });
        dashboardTitleEl.textContent = `Gastos em ${year} (Total)`;
    } else {
        const monthName = getMonthName(currentDate);
        const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        dashboardTitleEl.textContent = `Gastos de ${formattedMonthName}`;
    }

    const categoriesSum = {};
    let total = 0;

    listToRender.forEach(e => {
        const cat = e.category || 'Outros';
        categoriesSum[cat] = (categoriesSum[cat] || 0) + e.amount;
        total += e.amount;
    });

    dashboardTotalValueEl.textContent = formatCurrency(total);

    if (dashboardDeficitValueEl) {
        let deficit = 0;
        if (dashboardScope === 'annual') {
            const year = currentDate.getFullYear();
            deficit = computeYearlyDeficit(year);
        } else {
            const s = getSettingsForCurrentMonth();
            const incomeTotal = (s.salary || 0) + (s.otherIncome || 0) + (s.cardReimburse || 0) + (s.loanReturn || 0);
            deficit = Math.max(0, total - incomeTotal);
        }
        dashboardDeficitValueEl.textContent = deficit > 0 ? formatCurrency(-deficit) : formatCurrency(0);
        dashboardDeficitValueEl.className = `card-value ${deficit > 0 ? 'value-negative' : 'value-positive'}`;
    }

    renderDeficitTrend(currentDate.getFullYear());

    const sortedCats = Object.entries(categoriesSum)
        .sort(([, a], [, b]) => b - a);

    categoryChartEl.innerHTML = '';

    if (sortedCats.length === 0) {
        categoryChartEl.innerHTML = '<p class="empty-state">Sem dados para exibir.</p>';
        return;
    }

    sortedCats.forEach(([name, value], idx) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        const gradClass = (idx % 3 === 1) ? 'secondary' : (idx % 3 === 2) ? 'tertiary' : 'primary';

        const div = document.createElement('div');
        div.className = 'category-row';
        div.innerHTML = `
            <div class="cat-header">
                <span class="cat-name">${name}</span>
                <span class="cat-value">${formatCurrency(value)}</span>
            </div>
            <div class="cat-bar-row">
                <div class="cat-bar-bg">
                    <div class="cat-bar-fill ${gradClass}" style="width: ${percentage}%"></div>
                </div>
                <span class="cat-bar-percent">${String(percentage.toFixed(1)).replace('.', ',')}%</span>
            </div>
        `;
        categoryChartEl.appendChild(div);
    });
}

function renderSettings() {
    settingsCategoryListEl.innerHTML = '';

    categories.forEach((cat, index) => {
        const li = document.createElement('li');
        li.className = 'settings-item';
        li.innerHTML = `
            <span>${cat}</span>
            <div class="settings-actions">
                <button class="icon-btn edit-cat-btn" data-index="${index}"><i class="fas fa-edit"></i></button>
                <button class="icon-btn del-cat-btn" data-index="${index}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        settingsCategoryListEl.appendChild(li);
    });

    // Attach events dynamically
    document.querySelectorAll('.edit-cat-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            editCategory(btn.dataset.index);
        };
    });
    document.querySelectorAll('.del-cat-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteCategory(btn.dataset.index);
        };
    });

    const s = getSettingsForCurrentMonth();
    if (monthlyGoalInput) monthlyGoalInput.value = Number(s.goal || 0).toFixed(2).replace('.', ',');
    if (salaryInput) salaryInput.value = Number(s.salary || 0).toFixed(2).replace('.', ',');
    if (otherIncomeInput) otherIncomeInput.value = Number(s.otherIncome || 0).toFixed(2).replace('.', ',');
    if (cardReimburseInput) cardReimburseInput.value = Number(s.cardReimburse || 0).toFixed(2).replace('.', ',');
    if (loanReturnInput) loanReturnInput.value = Number(s.loanReturn || 0).toFixed(2).replace('.', ',');
}

// Category Management
function addCategory() {
    const name = prompt("Nome da nova categoria:");
    if (name && name.trim()) {
        if (categories.includes(name.trim())) {
            alert("Categoria já existe!");
            return;
        }
        categories.push(name.trim());
        saveCategories();
    }
}

function editCategory(index) {
    const oldName = categories[index];
    const newName = prompt("Editar nome da categoria:", oldName);

    if (newName && newName.trim() && newName !== oldName) {
        if (categories.includes(newName.trim())) {
            alert("Categoria já existe!");
            return;
        }
        categories[index] = newName.trim();

        // Atualizar despesas que usavam o nome antigo
        // Opcional: Perguntar se quer atualizar. Aqui faremos automático.
        expenses = expenses.map(e => {
            if (e.category === oldName) {
                return { ...e, category: newName.trim() };
            }
            return e;
        });

        saveCategories(); // Salva categorias e renderiza lista
        saveData(); // Salva despesas atualizadas
    }
}

function deleteCategory(index) {
    const catName = categories[index];
    if (confirm(`Excluir a categoria "${catName}"?`)) {
        categories.splice(index, 1);
        saveCategories();
    }
}

// Navegação de Meses
function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    updateMonthDisplay();
    render();
    refreshLockUI();
}

function updateMonthDisplay() {
    const name = getMonthName(currentDate);
    currentMonthDisplay.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    const today = new Date();
    const isCurrent = currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() === today.getMonth();
    currentMonthDisplay.classList.toggle('current-month', isCurrent);
    refreshLockUI();
}

// Copiar Mês Anterior
function copyPreviousMonth() {
    if (isCurrentMonthLocked()) return;
    if (!confirm('Deseja copiar todas as despesas do mês anterior?')) return;

    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevKey = getMonthKey(prevDate);
    const currentKey = getMonthKey(currentDate);

    const prevExpenses = expenses.filter(e => e.monthKey === prevKey);

    const newExpenses = prevExpenses.map(e => ({
        ...e,
        id: Date.now() + Math.random(),
        monthKey: currentKey,
        paid: false
    }));

    expenses = [...expenses, ...newExpenses];
    saveData();
}

// Modal e Form
function updateCategorySelect(selectedCategory = null) {
    const select = document.getElementById('category');
    select.innerHTML = '';

    // Se a categoria da despesa não estiver na lista (foi excluída?), adiciona temporariamente
    let listToRender = [...categories];
    if (selectedCategory && !listToRender.includes(selectedCategory)) {
        listToRender.push(selectedCategory);
    }

    listToRender.sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === selectedCategory) option.selected = true;
        select.appendChild(option);
    });
}

function openModal(expense = null) {
    if (isCurrentMonthLocked()) return;
    modal.classList.remove('hidden');

    if (expense) {
        document.getElementById('modal-title').textContent = 'Editar Despesa';
        document.getElementById('expense-id').value = expense.id;
        document.getElementById('description').value = expense.description;
        document.getElementById('amount').value = expense.amount.toFixed(2).replace('.', ',');
        document.getElementById('due-day').value = expense.day;
        document.getElementById('is-paid').checked = expense.paid;

        updateCategorySelect(expense.category);

        deleteBtn.classList.remove('hidden');
    } else {
        document.getElementById('modal-title').textContent = 'Nova Despesa';
        form.reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('amount').value = '';

        updateCategorySelect(categories[0] || 'Outros');

        deleteBtn.classList.add('hidden');
    }
}

function closeModal() {
    modal.classList.add('hidden');
    render();
}

// Event Listeners
function setupEventListeners() {
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    copyPrevMonthBtn.addEventListener('click', copyPreviousMonth);

    addBtn.addEventListener('click', () => {
        if (isCurrentMonthLocked()) return;
        openModal();
    });
    closeBtn.addEventListener('click', closeModal);

    // Listener do Botão Excluir (Simplificado e Robusto)
    deleteBtn.onclick = () => { // Sem necessidade de 'e'
        // (preventDefault removido pois type="button" fora do form já é seguro)

        if (isCurrentMonthLocked()) return;

        const id = document.getElementById('expense-id').value;
        if (!id) return;

        if (confirm('Tem certeza que deseja excluir esta despesa?')) {
            const index = expenses.findIndex(e => e.id == id);
            if (index !== -1) {
                expenses.splice(index, 1);
                saveData();
                render();
                closeModal();
            }
        }
    };

    currentMonthDisplay.setAttribute('title', 'Voltar para o mês atual');
    currentMonthDisplay.setAttribute('tabindex', '0');
    currentMonthDisplay.addEventListener('click', () => {
        currentDate = new Date();
        updateMonthDisplay();
        render();
    });
    currentMonthDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            currentDate = new Date();
            updateMonthDisplay();
            render();
        }
    });

    if (lockMonthBtn) {
        lockMonthBtn.addEventListener('click', () => {
            const key = getMonthKey(currentDate);
            const nowLocked = !isCurrentMonthLocked();
            monthLocks[key] = nowLocked;
            localStorage.setItem('monthLocks', JSON.stringify(monthLocks));
            refreshLockUI();
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Settings
    addCategoryBtn.addEventListener('click', addCategory);
    resetBtn.addEventListener('click', () => {
        if (confirm('ATENÇÃO: Isso apagará TODOS os seus dados locais. Continuar?')) {
            localStorage.clear();
            location.reload();
        }
    });

    if (saveMonthSettingsBtn) {
        saveMonthSettingsBtn.addEventListener('click', () => {
            const key = getMonthKey(currentDate);
            monthlySettings[key] = {
                goal: parseFloat(String(monthlyGoalInput.value || '0').replace(',', '.')),
                salary: parseFloat(String(salaryInput.value || '0').replace(',', '.')),
                otherIncome: parseFloat(String(otherIncomeInput.value || '0').replace(',', '.')),
                cardReimburse: parseFloat(String(cardReimburseInput.value || '0').replace(',', '.')),
                loanReturn: parseFloat(String(loanReturnInput.value || '0').replace(',', '.')),
            };
            saveMonthlySettings();
            render();
            alert('Configurações do mês salvas!');
        });
    }

    [monthlyGoalInput, salaryInput, otherIncomeInput, cardReimburseInput, loanReturnInput].forEach(el => {
        if (!el) return;
        el.addEventListener('blur', () => {
            const v = String(el.value || '0').replace(',', '.');
            const num = parseFloat(v);
            el.value = isNaN(num) ? '0.00' : num.toFixed(2).replace('.', ',');
        });
    });

    // Dashboard Scope
    scopeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scopeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dashboardScope = btn.dataset.scope;
            render();
        });
    });

    const accordionToggles = document.querySelectorAll('.accordion-toggle');
    accordionToggles.forEach(btn => {
        // Remover listeners antigos para evitar duplicação em caso de re-init (raro, mas seguro)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', () => {
            const targetId = newBtn.dataset.target;
            const content = document.getElementById(targetId);
            if (!content) return;
            const nowHidden = content.classList.toggle('hidden');
            const icon = newBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-chevron-down', nowHidden);
                icon.classList.toggle('fa-chevron-up', !nowHidden);
            }
            accordionState[targetId] = !nowHidden;
            localStorage.setItem('accordionState', JSON.stringify(accordionState));
        });
    });

    // Abas de Navegação
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const tabId = item.getAttribute('data-tab');
            views.forEach(v => v.classList.remove('active-view'));
            const view = document.getElementById(`view-${tabId}`);
            if (view) view.classList.add('active-view');

            // Botão Adicionar permanece visível em todas as abas
            addBtn.style.display = 'flex';
        });
    });

    // GitHub Sync Listeners
    const btnSaveGithubConfig = document.getElementById('github-save-config-btn');
    const btnUploadGithub = document.getElementById('github-sync-upload-btn');
    const btnDownloadGithub = document.getElementById('github-sync-download-btn');

    if (btnSaveGithubConfig) btnSaveGithubConfig.onclick = saveGithubConfig; // Usar onclick para limpar anteriores

    if (btnUploadGithub) {
        btnUploadGithub.onclick = () => {
            // Atualizar globais antes de chamar a função
            const t = document.getElementById('github-token').value.trim();
            const r = document.getElementById('github-repo').value.trim();
            if (t) githubToken = t;
            if (r) githubRepo = r;
            uploadToGithub();
        };
    }

    if (btnDownloadGithub) {
        btnDownloadGithub.onclick = () => {
            // Atualizar globais antes de chamar a função
            const t = document.getElementById('github-token').value.trim();
            const r = document.getElementById('github-repo').value.trim();
            if (t) githubToken = t;
            if (r) githubRepo = r;
            downloadFromGithub();
        };
    }

    // ENV Import/Export Listeners
    const btnExportEnv = document.getElementById('export-env-btn');
    const btnImportEnvTrigger = document.getElementById('import-env-btn-trigger');
    const fileInputEnv = document.getElementById('import-env-file');

    if (btnExportEnv) {
        btnExportEnv.onclick = exportEnvConfig;
    }

    if (btnImportEnvTrigger && fileInputEnv) {
        btnImportEnvTrigger.onclick = () => fileInputEnv.click();
        fileInputEnv.onchange = (e) => {
            if (e.target.files.length > 0) {
                importEnvConfig(e.target.files[0]);
                // Limpar input para permitir re-importar mesmo arquivo se necessário
                e.target.value = '';
            }
        };
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isCurrentMonthLocked()) return;

        const id = document.getElementById('expense-id').value;
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value.replace(',', '.'));
        const day = parseInt(document.getElementById('due-day').value);
        const category = document.getElementById('category').value;
        const paid = document.getElementById('is-paid').checked;
        const currentKey = getMonthKey(currentDate);

        if (id) {
            const index = expenses.findIndex(e => e.id == id);
            if (index !== -1) {
                expenses[index] = { ...expenses[index], description, amount, day, category, paid };
            }
        } else {
            const newExpense = {
                id: Date.now(),
                monthKey: currentKey,
                description,
                amount,
                day,
                category,
                paid
            };
            expenses.push(newExpense);
        }

        saveData();
        closeModal();
    });
}

function isCurrentMonthLocked() {
    const key = getMonthKey(currentDate);
    return !!monthLocks[key];
}

function refreshLockUI() {
    const locked = isCurrentMonthLocked();
    if (lockMonthBtn) {
        lockMonthBtn.classList.toggle('locked', locked);
        const icon = lockMonthBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-lock-open', !locked);
            icon.classList.toggle('fa-lock', locked);
        }
        lockMonthBtn.setAttribute('title', locked ? 'Desbloquear edição deste mês' : 'Bloquear edição deste mês');
    }
    if (addBtn) addBtn.classList.toggle('disabled', locked);
    if (saveMonthSettingsBtn) saveMonthSettingsBtn.disabled = locked;
    if (copyPrevMonthBtn) {
        if (locked) copyPrevMonthBtn.classList.add('hidden');
    }
}

// --- GitHub Integration ---
function saveGithubConfig() {
    const token = document.getElementById('github-token').value.trim();
    const repo = document.getElementById('github-repo').value.trim();

    if (!token || !repo) {
        showGithubStatus('Preencha Token e Repositório!', 'error');
        return;
    }

    githubToken = token;
    githubRepo = repo;
    localStorage.setItem('githubToken', token);
    localStorage.setItem('githubRepo', repo);
    showGithubStatus('Configuração salva com sucesso!', 'success');
}

async function uploadToGithub() {
    if (!githubToken || !githubRepo) {
        showGithubStatus('Configure o Token e Repositório primeiro.', 'error');
        return;
    }

    const btn = document.getElementById('github-sync-upload-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const data = {
            expenses,
            categories,
            monthlySettings,
            monthLocks,
            backupDate: new Date().toISOString()
        };

        // Convert to Base64 (handling UTF-8)
        const jsonContent = JSON.stringify(data, null, 2);
        const encoder = new TextEncoder();
        const dataArray = encoder.encode(jsonContent);
        let base64Content = '';
        const len = dataArray.byteLength;
        for (let i = 0; i < len; i++) {
            base64Content += String.fromCharCode(dataArray[i]);
        }
        base64Content = btoa(base64Content);

        // 1. Get current SHA if file exists
        const path = `https://api.github.com/repos/${githubRepo}/contents/dados_financeiros.json`;
        let sha = null;

        try {
            const checkResponse = await fetch(path, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                sha = checkData.sha;
            }
        } catch (e) {
            console.log('Arquivo ainda não existe ou erro de rede', e);
        }

        // 2. Upload/Update
        const body = {
            message: `Backup HomeFinance: ${new Date().toLocaleString()}`,
            content: base64Content
        };
        if (sha) body.sha = sha;

        const response = await fetch(path, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            showGithubStatus('Backup enviado com sucesso! ✅', 'success');
        } else {
            const err = await response.json();
            throw new Error(err.message || 'Erro no upload');
        }

    } catch (error) {
        showGithubStatus(`Erro: ${error.message}`, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function downloadFromGithub() {
    if (!githubToken || !githubRepo) {
        showGithubStatus('Configure o Token e Repositório primeiro.', 'error');
        return;
    }

    if (!confirm('ATENÇÃO: Isso substituirá seus dados locais pelos do GitHub. Continuar?')) return;

    const btn = document.getElementById('github-sync-download-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...';
    btn.disabled = true;

    try {
        const path = `https://api.github.com/repos/${githubRepo}/contents/dados_financeiros.json`;
        const response = await fetch(path, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error('Arquivo não encontrado ou erro de acesso.');

        const data = await response.json();

        // Decode Base64
        const binaryString = atob(data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        const jsonContent = decoder.decode(bytes);

        const parsed = JSON.parse(jsonContent);

        // Validate basic structure
        if (!parsed.expenses || !parsed.categories) {
            throw new Error('Formato de arquivo inválido.');
        }

        // Update Local Storage
        localStorage.setItem('expenses', JSON.stringify(parsed.expenses));
        localStorage.setItem('categories', JSON.stringify(parsed.categories));
        if (parsed.monthlySettings) localStorage.setItem('monthlySettings', JSON.stringify(parsed.monthlySettings));
        if (parsed.monthLocks) localStorage.setItem('monthLocks', JSON.stringify(parsed.monthLocks));

        showGithubStatus('Dados restaurados! Recarregando...', 'success');
        setTimeout(() => location.reload(), 1500);

    } catch (error) {
        showGithubStatus(`Erro: ${error.message}`, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showGithubStatus(msg, type) {
    const el = document.getElementById('github-status');
    if (el) {
        el.textContent = msg;
        el.style.color = type === 'error' ? '#ef4444' : '#10b981';
        // Clear after 5 seconds
        if (type !== 'error') {
            setTimeout(() => el.textContent = '', 5000);
        }
    }
}

// --- Import/Export ENV ---

function exportEnvConfig() {
    if (!githubToken && !githubRepo) {
        showGithubStatus('Nada para exportar (Token/Repo vazios).', 'error');
        return;
    }

    const content = `GITHUB_TOKEN=${githubToken}\nGITHUB_REPO=${githubRepo}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finance-config.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showGithubStatus('Arquivo .env gerado!', 'success');
}

function importEnvConfig(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n');
        let foundToken = '';
        let foundRepo = '';

        lines.forEach(line => {
            const part = line.trim();
            if (part.startsWith('GITHUB_TOKEN=')) {
                foundToken = part.split('=')[1].trim();
            } else if (part.startsWith('GITHUB_REPO=')) {
                foundRepo = part.split('=')[1].trim();
            }
        });

        if (foundToken || foundRepo) {
            if (foundToken) {
                githubToken = foundToken;
                localStorage.setItem('githubToken', foundToken);
                document.getElementById('github-token').value = foundToken;
            }
            if (foundRepo) {
                githubRepo = foundRepo;
                localStorage.setItem('githubRepo', foundRepo);
                document.getElementById('github-repo').value = foundRepo;
            }
            showGithubStatus('Configuração importada com sucesso!', 'success');
        } else {
            showGithubStatus('Nenhuma chave válida encontrada no arquivo.', 'error');
        }
    };
    reader.readAsText(file);
}

// Start
init();
if ('serviceWorker' in navigator) {
    // REMOVENDO Service Workers antigos para garantir atualização do cache
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister().then(() => {
                console.log('Service Worker desregistrado para limpar cache.');
            });
        }
    });
}
