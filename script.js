// Mock Data inicial
const INITIAL_DATA_RAW = [
    { id: 1, description: "Aluguel", day: 10, amount: 1100.00, paid: true, category: "Moradia" },
    { id: 2, description: "CARTÃO CREDI FATO", day: 10, amount: 1489.04, paid: true, category: "Cartão de Crédito" },
    { id: 3, description: "CARTÃO NU BANCK", day: 7, amount: 2827.32, paid: true, category: "Cartão de Crédito" },
    { id: 4, description: "CARTÃO CAIXA", day: 11, amount: 2159.24, paid: true, category: "Cartão de Crédito" },
    { id: 5, description: "BOLETO ITAÚ", day: 15, amount: 554.00, paid: false, category: "Serviços" },
    { id: 6, description: "Claro / AUT", day: 12, amount: 134.16, paid: false, category: "Serviços" },
    { id: 7, description: "Seguro / DEB.AUTO", day: 13, amount: 47.00, paid: false, category: "Transporte" },
    { id: 8, description: "CARTÃO CAIXA", day: 10, amount: 56.83, paid: false, category: "Cartão de Crédito" },
    { id: 9, description: "CARTÃO CS BANK", day: 10, amount: 35.00, paid: false, category: "Cartão de Crédito" },
    { id: 10, description: "Pontos ÁTOMOS", day: 25, amount: 12.00, paid: false, category: "Outros" },
    { id: 11, description: "Água / DEB.AUTO", day: 7, amount: 126.96, paid: false, category: "Moradia" },
    { id: 12, description: "Energia / DEB.AUTO", day: 10, amount: 204.28, paid: false, category: "Moradia" },
    { id: 13, description: "Manu.Caixa", day: 12, amount: 16.00, paid: false, category: "Serviços" },
    { id: 14, description: "IPVA 1/5", day: 8, amount: 106.10, paid: false, category: "Transporte" },
    { id: 15, description: "IR DE RENDA", day: 12, amount: 368.12, paid: true, category: "Serviços" },
    { id: 16, description: "Cartório piso", day: 30, amount: 365.00, paid: true, category: "Outros" },
    { id: 17, description: "Internet", day: 16, amount: 100.00, paid: true, category: "Moradia" }
];

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
    if (monthlyGoalInput) monthlyGoalInput.value = Number(s.goal || 0).toFixed(2);
    if (salaryInput) salaryInput.value = Number(s.salary || 0).toFixed(2);
    if (otherIncomeInput) otherIncomeInput.value = Number(s.otherIncome || 0).toFixed(2);
    if (cardReimburseInput) cardReimburseInput.value = Number(s.cardReimburse || 0).toFixed(2);
    if (loanReturnInput) loanReturnInput.value = Number(s.loanReturn || 0).toFixed(2);
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
        if (confirm('ATENÇÃO: Isso apagará TODOS os seus dados e voltará para o estado inicial. Continuar?')) {
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
        });
    }

    [monthlyGoalInput, salaryInput, otherIncomeInput, cardReimburseInput, loanReturnInput].forEach(el => {
        if (!el) return;
        el.addEventListener('blur', () => {
            const v = String(el.value || '0').replace(',', '.');
            const num = parseFloat(v);
            el.value = isNaN(num) ? '0.00' : num.toFixed(2);
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
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const content = document.getElementById(targetId);
            if (!content) return;
            const nowHidden = content.classList.toggle('hidden');
            const icon = btn.querySelector('i');
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isCurrentMonthLocked()) return;

        const id = document.getElementById('expense-id').value;
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
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

    deleteBtn.addEventListener('click', () => {
        if (isCurrentMonthLocked()) return;
        const id = document.getElementById('expense-id').value;
        if (confirm('Tem certeza que deseja excluir?')) {
            expenses = expenses.filter(e => e.id != id);
            saveData();
            closeModal();
        }
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

// Start
init();
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js');
    });
}
