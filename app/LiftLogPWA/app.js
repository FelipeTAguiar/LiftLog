const STORAGE_KEY = "liftlog-pwa:v1";
const USERS_KEY = "liftlog-pwa:users";
const SESSION_KEY = "liftlog-pwa:session";
const DATA_KEY_PREFIX = "liftlog-pwa:data:";
const INSTALL_DISMISSED_KEY = "liftlog-pwa:install-dismissed";

const palette = {
  green: "#26D07C",
  greenDark: "#0D7C4A",
  orange: "#FF9F43",
  blue: "#3B82F6",
  violet: "#7C3AED",
  red: "#EF5A5A",
};

const sampleTrainerStudents = [
  { id: "student-marina", name: "Marina Souza", email: "marina@email.com", goal: "Treino B sem atraso", assignedPlan: "B", adherence: 68, status: "Atrasado", note: "Revisar carga de inferiores", lastReview: "Hoje", color: palette.red },
  { id: "student-felipe", name: "Felipe Aguiar", email: "felipe@email.com", goal: "Chegar em 100kg no agachamento", assignedPlan: "A", adherence: 84, status: "Em dia", note: "Boa evolucao de carga", lastReview: "Ontem", color: palette.green },
  { id: "student-rafael", name: "Rafael Lima", email: "rafael@email.com", goal: "Reduzir IMC e manter frequencia", assignedPlan: "C", adherence: 76, status: "Revisar", note: "Atualizar cardio semanal", lastReview: "2 dias", color: palette.blue },
];

const defaultState = {
  profile: "Aluno",
  profilePhoto: "",
  activePlan: "A",
  workoutPlans: {
    A: { name: "Treino A", days: ["Seg", "Qui"] },
    B: { name: "Treino B", days: ["Ter", "Sex"] },
    C: { name: "Treino C", days: ["Sab"] },
  },
  completedDays: [2, 3, 5, 8, 10, 12, 15, 16, 18, 22],
  points: 2480,
  body: { weight: "82", height: "1.84", target: "78" },
  nutrition: { calories: 2300, carbs: 210, protein: 142, fat: 58 },
  exercises: [
    { id: "squat", plan: "A", name: "Agachamento livre", group: "Pernas", sets: "4x8", rest: "90s", weight: 80, goal: 100, color: palette.green },
    { id: "legpress", plan: "A", name: "Leg press 45", group: "Pernas", sets: "4x10", rest: "75s", weight: 140, goal: 180, color: palette.orange },
    { id: "extensora", plan: "A", name: "Cadeira extensora", group: "Quadriceps", sets: "3x12", rest: "60s", weight: 45, goal: 60, color: palette.blue },
    { id: "stiff", plan: "A", name: "Stiff", group: "Posterior", sets: "4x8", rest: "90s", weight: 60, goal: 80, color: palette.violet },
  ],
  meals: [
    { id: "breakfast", name: "Cafe da manha", detail: "Aveia, banana e ovos", kcal: 520, color: palette.orange },
    { id: "lunch", name: "Almoco", detail: "Arroz, frango e salada", kcal: 710, color: palette.green },
    { id: "pre", name: "Pre-treino", detail: "Batata doce e iogurte", kcal: 340, color: palette.blue },
  ],
  trainerStudents: sampleTrainerStudents,
};

function createEmptyState(role = "Aluno") {
  return {
    profile: role,
    profilePhoto: "",
    activePlan: "A",
    workoutPlans: {
      A: { name: "Treino A", days: [] },
      B: { name: "Treino B", days: [] },
      C: { name: "Treino C", days: [] },
    },
    completedDays: [],
    workoutHistory: [],
    points: 0,
    body: { weight: "", height: "", target: "" },
    nutrition: { calories: 2300, carbs: 0, protein: 0, fat: 0 },
    exercises: [],
    meals: [],
    goals: [],
    trainerStudents: [],
  };
}

const tabs = [
  { key: "home", label: "Home" },
  { key: "profile", label: "Perfil" },
  { key: "workout", label: "Treino" },
  { key: "calendar", label: "Agenda" },
  { key: "body", label: "IMC" },
  { key: "food", label: "Comida" },
  { key: "goals", label: "Metas" },
  { key: "rewards", label: "Premios" },
  { key: "trainer", label: "Personal" },
];

let activeTab = "home";
let workoutView = "today";
let deferredInstallPrompt = null;
let authMode = "login";
let currentUser = loadSession();
let state = currentUser ? loadState(currentUser.id) : structuredClone(defaultState);

const screen = document.querySelector("#screen");
const tabsEl = document.querySelector("#tabs");
const profileLabel = document.querySelector("#profile-label");
const profileToggle = document.querySelector("#profile-toggle");
const installBanner = document.querySelector("#install-banner");
const installButton = document.querySelector("#install-button");
const installClose = document.querySelector("#install-close");

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!session?.userId) return null;
    return loadUsers().find((user) => user.id === session.userId) || null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
}

function dataKeyFor(userId) {
  return `${DATA_KEY_PREFIX}${userId}`;
}

function loadState(userId) {
  try {
    const userData = localStorage.getItem(dataKeyFor(userId));
    if (userData) return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(userData) });

    const legacyData = localStorage.getItem(STORAGE_KEY);
    if (legacyData) return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(legacyData) });

    return normalizeState({
      ...structuredClone(defaultState),
      profile: currentUser?.role || defaultState.profile,
    });
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

function normalizeState(rawState) {
  const plans = rawState.workoutPlans || structuredClone(defaultState.workoutPlans);
  return {
    ...rawState,
    activePlan: rawState.activePlan || "A",
    workoutPlans: {
      A: { ...defaultState.workoutPlans.A, ...(plans.A || {}) },
      B: { ...defaultState.workoutPlans.B, ...(plans.B || {}) },
      C: { ...defaultState.workoutPlans.C, ...(plans.C || {}) },
    },
    workoutHistory: rawState.workoutHistory || [],
    goals: rawState.goals || [],
    trainerStudents: rawState.trainerStudents || [],
    profilePhoto: rawState.profilePhoto || "",
    nutrition: {
      ...defaultState.nutrition,
      ...(rawState.nutrition || {}),
    },
    exercises: (rawState.exercises || []).map((item) => ({
      ...item,
      plan: item.plan || "A",
    })),
  };
}

function saveState() {
  if (!currentUser) return;
  localStorage.setItem(dataKeyFor(currentUser.id), JSON.stringify(state));
}

function setState(updater) {
  state = typeof updater === "function" ? updater(state) : updater;
  saveState();
  render();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const name = String(form.elements.name?.value || "").trim();
  const email = normalizeEmail(form.elements.email.value);
  const password = String(form.elements.password.value || "");
  const role = form.elements.role?.value || "Aluno";
  const users = loadUsers();

  if (!email || !password) {
    alert("Preencha email e senha.");
    return;
  }

  if (authMode === "signup") {
    if (!name) {
      alert("Preencha seu nome.");
      return;
    }
    if (users.some((user) => user.email === email)) {
      alert("Esse email ja tem cadastro. Tente entrar.");
      authMode = "login";
      render();
      return;
    }

    const user = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      email,
      password,
      role,
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, user]);
    currentUser = user;
    saveSession(user);
    state = createEmptyState(role);
    saveState();
    activeTab = role === "Personal" ? "trainer" : "home";
    render();
    return;
  }

  const user = users.find((item) => item.email === email && item.password === password);
  if (!user) {
    alert("Email ou senha invalidos. Se ainda nao tiver conta, toque em Criar conta.");
    return;
  }

  currentUser = user;
  saveSession(user);
  state = loadState(user.id);
  activeTab = state.profile === "Personal" ? "trainer" : "home";
  render();
}

function numberFromInput(value, fallback = 0) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function handleDataFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const type = form.dataset.form;
  const data = new FormData(form);

  if (type === "exercise") {
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const index = exercisesForPlan().length;
    const weight = numberFromInput(data.get("weight"), 0);
    const goal = numberFromInput(data.get("goal"), Math.max(weight, 1));
    setState((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `exercise-${Date.now()}`,
          plan: activePlanKey(),
          name,
          group: String(data.get("group") || "Geral").trim() || "Geral",
          sets: String(data.get("sets") || "3x10").trim() || "3x10",
          rest: "60s",
          weight,
          goal: Math.max(goal, 1),
          color: nextColor(index),
        },
      ],
    }));
  }

  if (type === "plan") {
    const key = activePlanKey();
    const fallbackName = `Treino ${key}`;
    const name = String(data.get("name") || fallbackName).trim() || fallbackName;
    const days = String(data.get("days") || "")
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
    setState((current) => ({
      ...current,
      workoutPlans: {
        ...current.workoutPlans,
        [key]: {
          ...(current.workoutPlans?.[key] || {}),
          name,
          days,
        },
      },
    }));
  }

  if (type === "meal") {
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const index = state.meals.length;
    setState((current) => ({
      ...current,
      meals: [
        ...current.meals,
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `meal-${Date.now()}`,
          name,
          detail: String(data.get("detail") || "Sem detalhes").trim() || "Sem detalhes",
          kcal: Math.max(0, Math.round(numberFromInput(data.get("kcal"), 0))),
          color: nextColor(index + 1),
        },
      ],
    }));
  }

  if (type === "nutrition") {
    setState((current) => ({
      ...current,
      nutrition: {
        calories: Math.max(1, Math.round(numberFromInput(data.get("calories"), current.nutrition?.calories || 2300))),
        carbs: Math.max(0, Math.round(numberFromInput(data.get("carbs"), current.nutrition?.carbs || 0))),
        protein: Math.max(0, Math.round(numberFromInput(data.get("protein"), current.nutrition?.protein || 0))),
        fat: Math.max(0, Math.round(numberFromInput(data.get("fat"), current.nutrition?.fat || 0))),
      },
    }));
  }

  if (type === "trainer-student") {
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const index = (state.trainerStudents || []).length;
    setState((current) => ({
      ...current,
      trainerStudents: [
        ...(current.trainerStudents || []),
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `student-${Date.now()}`,
          name,
          email: normalizeEmail(data.get("email")),
          goal: String(data.get("goal") || "Meta a definir").trim() || "Meta a definir",
          assignedPlan: String(data.get("plan") || "A"),
          adherence: clamp(numberFromInput(data.get("adherence"), 0) / 100) * 100,
          status: "Em dia",
          note: "Aluno cadastrado agora",
          lastReview: new Date().toLocaleDateString("pt-BR"),
          color: nextColor(index),
        },
      ],
    }));
  }

  if (type === "trainer-assignment") {
    const studentId = String(data.get("studentId") || "");
    const assignedPlan = String(data.get("plan") || "A");
    const note = String(data.get("note") || "Ficha atualizada").trim() || "Ficha atualizada";
    if (!studentId) return;
    setState((current) => ({
      ...current,
      trainerStudents: (current.trainerStudents || []).map((student) => (
        student.id === studentId
          ? {
            ...student,
            assignedPlan,
            note,
            status: "Revisar",
            lastReview: new Date().toLocaleDateString("pt-BR"),
          }
          : student
      )),
    }));
  }

  if (type === "goal") {
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    const index = (state.goals || []).length;
    setState((current) => ({
      ...current,
      goals: [
        ...(current.goals || []),
        {
          id: crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`,
          title,
          detail: String(data.get("detail") || "Meta personalizada").trim() || "Meta personalizada",
          date: String(data.get("date") || "Livre").trim() || "Livre",
          progress: clamp(numberFromInput(data.get("progress"), 0) / 100),
          color: nextColor(index + 2),
        },
      ],
    }));
  }
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  currentUser = null;
  state = structuredClone(defaultState);
  activeTab = "home";
  authMode = "login";
  render();
}

function renderAuth() {
  const isSignup = authMode === "signup";
  screen.innerHTML = `
    <section class="auth-screen">
      <div class="auth-hero">
        <span class="auth-logo">L</span>
        <p class="eyebrow">LiftLog MVP</p>
        <h1>${isSignup ? "Criar sua conta" : "Entrar no LiftLog"}</h1>
        <p>Salve treinos, cargas, calendario, IMC e metas em um perfil separado neste aparelho.</p>
      </div>

      <div class="auth-switch" role="tablist" aria-label="Escolha entrar ou criar conta">
        <button type="button" class="${!isSignup ? "active" : ""}" data-auth-mode="login">Entrar</button>
        <button type="button" class="${isSignup ? "active" : ""}" data-auth-mode="signup">Criar conta</button>
      </div>

      <form class="auth-form" id="auth-form">
        ${isSignup ? `
          <label>
            Nome
            <input name="name" autocomplete="name" placeholder="Felipe Aguiar" />
          </label>
        ` : ""}
        <label>
          Email
          <input name="email" type="email" autocomplete="email" placeholder="voce@email.com" />
        </label>
        <label>
          Senha
          <input name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" placeholder="******" />
        </label>
        ${isSignup ? `
          <label>
            Perfil
            <select name="role">
              <option>Aluno</option>
              <option>Personal</option>
            </select>
          </label>
        ` : ""}
        <button class="primary" type="submit">${isSignup ? "Criar conta" : "Entrar"}</button>
      </form>

      <div class="auth-note">
        Este login ainda e local no navegador. Na proxima fase ele pode ser ligado a Supabase, Firebase ou outro banco online.
      </div>
    </section>
  `;
  tabsEl.innerHTML = "";
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nextColor(index) {
  return [palette.green, palette.orange, palette.blue, palette.violet, palette.red][index % 5];
}

function activePlanKey() {
  return ["A", "B", "C"].includes(state.activePlan) ? state.activePlan : "A";
}

function activePlan() {
  return state.workoutPlans?.[activePlanKey()] || defaultState.workoutPlans.A;
}

function exercisesForPlan(planKey = activePlanKey()) {
  return (state.exercises || []).filter((item) => (item.plan || "A") === planKey);
}

function planTabs() {
  return `
    <div class="plan-tabs" aria-label="Selecionar ficha">
      ${["A", "B", "C"].map((key) => `
        <button type="button" class="${activePlanKey() === key ? "active" : ""}" data-action="set-plan" data-plan="${key}">
          <strong>${key}</strong>
          <span>${escapeHtml(state.workoutPlans?.[key]?.name || `Treino ${key}`)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function planDaysText(plan = activePlan()) {
  return plan.days?.length ? plan.days.join(", ") : "Sem dias definidos";
}

function userDisplayName() {
  return currentUser?.name || "Usuario LiftLog";
}

function userInitials() {
  return userDisplayName()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "L";
}

function userLevel() {
  return Math.max(1, Math.floor((state.points || 0) / 1000) + 1);
}

function profileAvatar(className = "avatar") {
  if (state.profilePhoto) {
    return `<span class="${className} has-photo"><img src="${state.profilePhoto}" alt="Foto de ${escapeHtml(userDisplayName())}" /></span>`;
  }
  return `<span class="${className}">${escapeHtml(userInitials())}</span>`;
}

function moneylessBmi() {
  const weight = Number(String(state.body.weight).replace(",", "."));
  const height = Number(String(state.body.height).replace(",", "."));
  if (!weight || !height) return "--";
  return (weight / (height * height)).toFixed(1);
}

function pageHead(title, subtitle) {
  return `
    <div class="page-head">
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      ${profileAvatar()}
    </div>
  `;
}

function progress(value, color = palette.green, attrs = "") {
  return `<div ${attrs} class="progress" style="--progress:${clamp(value)};--progress-color:${color}"><i></i></div>`;
}

function metric(value, label, color) {
  return `<div class="metric" style="--metric-color:${color}"><strong>${value}</strong>${label}</div>`;
}

function emptyState(title, text) {
  return `
    <div class="empty-state">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(text)}</span>
    </div>
  `;
}

function row(item, extra = "") {
  return `
    <div class="row">
      <span class="dot" style="--dot-color:${item.color}"></span>
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.detail || `${item.sets} | ${item.rest} | ${item.group}`)}</small>
        ${item.goal ? progress(item.weight / item.goal, item.color) : ""}
      </div>
      <div>
        <span class="row-value" style="--row-color:${item.color}">${item.kcal !== undefined ? `${item.kcal}` : `${item.weight}kg`}</span>
        ${extra}
      </div>
    </div>
  `;
}

function mealRow(meal) {
  return `
    <div class="row">
      <span class="dot" style="--dot-color:${meal.color}"></span>
      <div>
        <strong>${escapeHtml(meal.name)}</strong>
        <small>${escapeHtml(meal.detail)}</small>
      </div>
      <label class="row-input">
        <input value="${escapeHtml(meal.kcal)}" inputmode="numeric" data-action="meal-kcal" data-id="${meal.id}" />
        <span>kcal</span>
      </label>
    </div>
  `;
}

function renderHome() {
  const plan = activePlan();
  const todayExercises = exercisesForPlan();
  const totalWeight = todayExercises.reduce((sum, item) => sum + item.weight, 0);
  const hasExercises = todayExercises.length > 0;
  return `
    ${pageHead("Oi, Felipe", `${plan.name} pronto para hoje`)}
    <section class="card dark-card hero-card">
      <div class="ring">${state.completedDays.length}</div>
      <div>
        <h2>Dias marcados</h2>
        <p>Complete ${plan.name.toLowerCase()} para ganhar +120 pontos e manter sua sequencia.</p>
      </div>
    </section>
    <button class="primary" data-action="mark-today">Marcar treino de hoje</button>
    <div class="metrics">
      ${metric(state.body.weight ? `${state.body.weight}kg` : "--", "Peso", palette.greenDark)}
      ${metric(moneylessBmi(), "IMC", palette.blue)}
      ${metric(`${totalWeight}kg`, "Carga", palette.orange)}
    </div>
    <section class="card">
      <h2>Lista do dia</h2>
      ${hasExercises ? `
        <div class="list">
          ${todayExercises.slice(0, 3).map((item) => row(item)).join("")}
        </div>
      ` : emptyState("Nenhum exercicio cadastrado", "Va em Treino e cadastre o primeiro exercicio da sua ficha.")}
    </section>
  `;
}

function renderProfile() {
  const totalWorkouts = (state.workoutHistory || []).length;
  const points = state.points || 0;
  const nextLevelProgress = (points % 1000) / 1000;
  return `
    ${pageHead("Perfil", "Sua conta e evolucao")}
    <section class="card profile-card">
      ${profileAvatar("profile-photo")}
      <div>
        <h2>${escapeHtml(userDisplayName())}</h2>
        <p>${escapeHtml(currentUser?.email || "Email nao informado")}</p>
        <span>${escapeHtml(state.profile || currentUser?.role || "Aluno")}</span>
      </div>
    </section>
    <div class="profile-actions">
      <label class="secondary file-button">
        Trocar foto
        <input type="file" accept="image/*" data-action="profile-photo" />
      </label>
      <button class="secondary" type="button" data-action="remove-photo">Remover foto</button>
    </div>
    <section class="card dark-card">
      <h2 style="font-size:30px">Nivel ${userLevel()}</h2>
      <p>${points} pontos acumulados</p>
      ${progress(nextLevelProgress, "#c7f95b")}
    </section>
    <div class="metrics">
      ${metric(String(state.completedDays.length), "Dias", palette.greenDark)}
      ${metric(String(totalWorkouts), "Treinos", palette.orange)}
      ${metric(`${exercisesForPlan().length}`, "Ficha", palette.blue)}
    </div>
    <button class="dark-button" type="button" data-action="logout">Sair da conta</button>
  `;
}

function renderWorkout() {
  const plan = activePlan();
  return `
    ${pageHead(plan.name, planDaysText(plan))}
    ${planTabs()}
    <div class="chip-row">
      <button class="chip ${workoutView === "today" ? "active" : ""}" data-action="workout-view" data-view="today">Hoje</button>
      <button class="chip ${workoutView === "history" ? "active" : ""}" data-action="workout-view" data-view="history">Historico</button>
      <button class="chip ${workoutView === "plan" ? "active" : ""}" data-action="workout-view" data-view="plan">Ficha</button>
    </div>
    ${workoutView === "today" ? renderWorkoutToday() : ""}
    ${workoutView === "history" ? renderWorkoutHistory() : ""}
    ${workoutView === "plan" ? renderWorkoutPlan() : ""}
  `;
}

function renderWorkoutToday() {
  const planExercises = exercisesForPlan();
  return `
    <section class="card">
      <h2>Exercicios</h2>
      ${planExercises.length ? `
        <div class="list">
          ${planExercises.map((item) => row(item, `
            <div class="stepper">
              <button data-action="weight" data-id="${item.id}" data-delta="-2.5">-</button>
              <button data-action="weight" data-id="${item.id}" data-delta="2.5">+</button>
            </div>
          `)).join("")}
        </div>
      ` : emptyState("Sua ficha esta vazia", "Cadastre o primeiro exercicio abaixo para montar seu treino do zero.")}
    </section>
    <section class="card">
      <h2>Novo exercicio</h2>
      <form class="stack-form" data-form="exercise">
        <input name="name" placeholder="Nome do exercicio" required />
        <div class="form-grid">
          <input name="group" placeholder="Musculo" />
          <input name="sets" placeholder="Series, ex: 4x8" />
        </div>
        <div class="form-grid">
          <input name="weight" inputmode="decimal" placeholder="Carga atual kg" />
          <input name="goal" inputmode="decimal" placeholder="Meta kg" />
        </div>
        <button class="secondary" type="submit">Adicionar exercicio</button>
      </form>
    </section>
    <button class="primary" data-action="finish-workout">Finalizar treino</button>
  `;
}

function renderWorkoutHistory() {
  const history = (state.workoutHistory || []).filter((item) => (item.plan || "A") === activePlanKey());
  return `
    <section class="card">
      <h2>Historico de treinos</h2>
      ${history.length ? `
        <div class="list">
          ${history.map((item) => `
            <div class="row">
              <span class="dot" style="--dot-color:${palette.green}"></span>
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.date)} | ${item.exerciseCount} exercicios | ${item.totalWeight}kg totais</small>
              </div>
              <span class="row-value" style="--row-color:${palette.green}">+120</span>
            </div>
          `).join("")}
        </div>
      ` : emptyState("Nenhum treino finalizado", "Quando voce tocar em Finalizar treino, ele aparece aqui com data e resumo.")}
    </section>
  `;
}

function renderWorkoutPlan() {
  const plan = activePlan();
  const planExercises = exercisesForPlan();
  return `
    <section class="card">
      <h2>Ficha atual</h2>
      ${planExercises.length ? `
        <div class="list">
          ${planExercises.map((item, index) => `
            <div class="row">
              <span class="dot" style="--dot-color:${item.color}"></span>
              <div>
                <strong>${index + 1}. ${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(item.group)} | ${escapeHtml(item.sets)} | meta ${item.goal}kg</small>
                ${progress(item.weight / item.goal, item.color)}
              </div>
              <span class="row-value" style="--row-color:${item.color}">${item.weight}kg</span>
            </div>
          `).join("")}
        </div>
      ` : emptyState("Ficha vazia", "Adicione exercicios na aba Hoje para montar sua ficha.")}
    </section>
    <section class="card">
      <h2>Editar ficha</h2>
      <form class="stack-form" data-form="plan">
        <input name="name" value="${escapeHtml(plan.name)}" placeholder="Nome da ficha" required />
        <input name="days" value="${escapeHtml(plan.days?.join(", ") || "")}" placeholder="Dias da semana: Seg, Qua, Sex" />
        <button class="secondary" type="submit">Salvar ficha</button>
      </form>
    </section>
  `;
}

function renderCalendar() {
  const weekdays = ["S", "T", "Q", "Q", "S", "S", "D"];
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  return `
    ${pageHead("Junho 2026", "Dias marcados na academia")}
    <section class="card">
      <div class="calendar">
        ${weekdays.map((day) => `<span class="weekday">${day}</span>`).join("")}
        ${days.map((day) => `<button class="day ${state.completedDays.includes(day) ? "done" : ""}" data-action="toggle-day" data-day="${day}">${day}</button>`).join("")}
      </div>
    </section>
    <section class="card" style="background:#fff8e9;border-color:#ffe1aa">
      <h2>Sequencia ativa</h2>
      <p>${state.completedDays.length} presencas neste mes. Mais 2 treinos desbloqueiam o selo Disciplina.</p>
      ${progress(state.completedDays.length / 12, palette.orange)}
    </section>
  `;
}

function renderBody() {
  const value = bodyGoalProgress();
  return `
    ${pageHead("IMC e meta", "Acompanhe peso ideal")}
    <section class="card hero-card">
      <div id="bmi-value" class="ring" style="color:var(--blue);border-color:var(--blue)">${moneylessBmi()}</div>
      <div>
        <h2>Faixa saudavel</h2>
        <p id="body-target-copy">Meta: ${state.body.target}kg ate 15/11/2026.</p>
      </div>
    </section>
    <section class="card">
      ${field("Peso atual", "weight", "kg")}
      ${field("Altura", "height", "m")}
      ${field("Peso desejado", "target", "kg")}
    </section>
    <section class="card">
      <h2>Caminho ate a meta</h2>
      ${progress(value, palette.blue, 'id="body-progress"')}
    </section>
  `;
}

function bodyGoalProgress() {
  const start = 88;
  const current = Number(String(state.body.weight).replace(",", ".")) || 0;
  const target = Number(String(state.body.target).replace(",", ".")) || current;
  return start === target ? 1 : (start - current) / (start - target);
}

function refreshBodySummary() {
  const bmiValue = document.querySelector("#bmi-value");
  const targetCopy = document.querySelector("#body-target-copy");
  const bodyProgress = document.querySelector("#body-progress");

  if (bmiValue) bmiValue.textContent = moneylessBmi();
  if (targetCopy) targetCopy.textContent = `Meta: ${state.body.target}kg ate 15/11/2026.`;
  if (bodyProgress) bodyProgress.style.setProperty("--progress", clamp(bodyGoalProgress()));
}

function refreshFoodSummary() {
  const calories = state.meals.reduce((sum, meal) => sum + meal.kcal, 0);
  const nutrition = state.nutrition || defaultState.nutrition;
  const title = document.querySelector("#food-calories-title");
  const target = document.querySelector("#food-calories-target");
  const foodProgress = document.querySelector("#food-progress");

  if (title) title.textContent = `${calories} kcal registradas`;
  if (target) target.textContent = `Meta diaria: ${nutrition.calories} kcal`;
  if (foodProgress) foodProgress.style.setProperty("--progress", clamp(calories / nutrition.calories));
}

function field(label, key, suffix) {
  return `
    <div class="field">
      <label for="${key}">${label}</label>
      <div class="input-wrap">
        <input id="${key}" inputmode="decimal" value="${escapeHtml(state.body[key])}" data-action="body" data-field="${key}" />
        <span>${suffix}</span>
      </div>
    </div>
  `;
}

function renderFood() {
  const calories = state.meals.reduce((sum, meal) => sum + meal.kcal, 0);
  const nutrition = state.nutrition || defaultState.nutrition;
  return `
    ${pageHead("Alimentacao", "Macros e refeicoes do dia")}
    <div class="metrics">
      ${metric(`${nutrition.carbs}g`, "Carbo", palette.orange)}
      ${metric(`${nutrition.protein}g`, "Proteina", palette.greenDark)}
      ${metric(`${nutrition.fat}g`, "Gordura", palette.violet)}
    </div>
    <section class="card">
      <h2 id="food-calories-title">${calories} kcal registradas</h2>
      ${progress(calories / nutrition.calories, palette.orange, 'id="food-progress"')}
      <p id="food-calories-target">Meta diaria: ${nutrition.calories} kcal</p>
    </section>
    <section class="card">
      <h2>Meta alimentar</h2>
      <form class="stack-form" data-form="nutrition">
        <input name="calories" value="${escapeHtml(nutrition.calories)}" inputmode="numeric" placeholder="Calorias do dia" />
        <div class="form-grid">
          <input name="carbs" value="${escapeHtml(nutrition.carbs)}" inputmode="numeric" placeholder="Carbo g" />
          <input name="protein" value="${escapeHtml(nutrition.protein)}" inputmode="numeric" placeholder="Proteina g" />
        </div>
        <input name="fat" value="${escapeHtml(nutrition.fat)}" inputmode="numeric" placeholder="Gordura g" />
        <button class="secondary" type="submit">Salvar meta</button>
      </form>
    </section>
    <section class="card">
      <h2>Lista do dia</h2>
      ${state.meals.length ? `<div class="list">${state.meals.map((meal) => mealRow(meal)).join("")}</div>` : emptyState("Nenhuma refeicao cadastrada", "Adicione sua primeira refeicao para montar o plano do dia.")}
    </section>
    <section class="card">
      <h2>Nova refeicao</h2>
      <form class="stack-form" data-form="meal">
        <input name="name" placeholder="Nome da refeicao" required />
        <input name="detail" placeholder="Alimentos" />
        <input name="kcal" inputmode="numeric" placeholder="Calorias" />
        <button class="secondary" type="submit">Adicionar refeicao</button>
      </form>
    </section>
  `;
}

function renderGoals() {
  const savedGoals = state.goals || [];
  return `
    ${pageHead("Minhas metas", "Peso corporal e exercicios")}
    ${savedGoals.length ? savedGoals.map((item) => goal(item.title, item.detail, item.progress, item.color, item.date)).join("") : emptyState("Nenhuma meta cadastrada", "Crie metas de peso, carga ou frequencia com data alvo.")}
    <section class="card">
      <h2>Nova meta</h2>
      <form class="stack-form" data-form="goal">
        <input name="title" placeholder="Titulo da meta" required />
        <input name="detail" placeholder="Descricao" />
        <div class="form-grid">
          <input name="date" placeholder="Data alvo" />
          <input name="progress" inputmode="numeric" placeholder="Progresso %" />
        </div>
        <button class="secondary" type="submit">Adicionar meta</button>
      </form>
    </section>
  `;
}

function goal(title, text, value, color, date) {
  return `
    <section class="card">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
        <h2>${escapeHtml(title)}</h2>
        <span class="chip">${escapeHtml(date || "Livre")}</span>
      </div>
      <p>${escapeHtml(text)}</p>
      ${progress(value, color)}
    </section>
  `;
}

function renderRewards() {
  return `
    ${pageHead("Recompensas", "Ganhe pontos por consistencia")}
    <section class="card dark-card">
      <h2 style="font-size:30px">Nivel ${userLevel()}</h2>
      <p>${state.points} pontos acumulados</p>
      ${progress((state.points % 1000) / 1000, "#c7f95b")}
    </section>
    <div class="metrics">
      ${metric("OK", "Disciplina", palette.orange)}
      ${metric("OK", "Forca", palette.greenDark)}
      ${metric("80%", "Cardio", palette.blue)}
    </div>
    <section class="card" style="background:#f2ffe5;border-color:#d5f6a2">
      <h2>Proxima recompensa</h2>
      <p>Complete 2 treinos nesta semana para desbloquear um cupom parceiro da academia.</p>
    </section>
  `;
}

function trainerStatusColor(status) {
  if (status === "Atrasado") return palette.red;
  if (status === "Revisar") return palette.orange;
  return palette.green;
}

function studentCard(student) {
  const plan = state.workoutPlans?.[student.assignedPlan] || { name: `Treino ${student.assignedPlan}` };
  const statusColor = trainerStatusColor(student.status);
  return `
    <article class="student-card">
      <div class="student-card-head">
        <span class="dot" style="--dot-color:${student.color || statusColor}"></span>
        <div>
          <strong>${escapeHtml(student.name)}</strong>
          <small>${escapeHtml(student.email || "Sem email")}</small>
        </div>
        <span class="status-pill" style="--status-color:${statusColor}">${escapeHtml(student.status)}</span>
      </div>
      <p>${escapeHtml(student.goal)}</p>
      <div class="student-meta">
        <span>${escapeHtml(plan.name)}</span>
        <span>${Math.round(student.adherence || 0)}% adesao</span>
        <span>${escapeHtml(student.lastReview || "Sem revisao")}</span>
      </div>
      ${progress((student.adherence || 0) / 100, statusColor)}
      <small>${escapeHtml(student.note || "Sem observacoes")}</small>
      <div class="student-actions">
        <button type="button" class="secondary" data-action="review-student" data-id="${student.id}">Revisado</button>
        <button type="button" class="secondary danger" data-action="remove-student" data-id="${student.id}">Remover</button>
      </div>
    </article>
  `;
}

function renderTrainerAssignmentForm(students) {
  if (!students.length) {
    return emptyState("Nenhum aluno para receber ficha", "Cadastre um aluno antes de atribuir Treino A, B ou C.");
  }
  return `
    <form class="stack-form" data-form="trainer-assignment">
      <select name="studentId">
        ${students.map((student) => `<option value="${student.id}">${escapeHtml(student.name)}</option>`).join("")}
      </select>
      <select name="plan">
        ${["A", "B", "C"].map((key) => `<option value="${key}">${escapeHtml(state.workoutPlans?.[key]?.name || `Treino ${key}`)}</option>`).join("")}
      </select>
      <textarea name="note" placeholder="Observacao para essa ficha"></textarea>
      <button class="secondary" type="submit">Atribuir ficha</button>
    </form>
  `;
}

function renderTrainer() {
  const students = state.trainerStudents || [];
  const activeStudents = students.length;
  const averageAdherence = students.length
    ? Math.round(students.reduce((sum, student) => sum + (student.adherence || 0), 0) / students.length)
    : 0;
  const alerts = students.filter((student) => student.status !== "Em dia" || (student.adherence || 0) < 70).length;
  return `
    ${pageHead("Personal", `${activeStudents} alunos acompanhados`)}
    <div class="metrics">
      ${metric(`${averageAdherence}%`, "Adesao", palette.greenDark)}
      ${metric(String(alerts), "Alertas", palette.red)}
      ${metric(String(students.filter((student) => student.status === "Revisar").length), "Revisoes", palette.blue)}
    </div>
    <section class="card">
      <h2>Alunos em foco</h2>
      ${students.length ? `<div class="student-list">${students.map((student) => studentCard(student)).join("")}</div>` : emptyState("Nenhum aluno cadastrado", "Adicione o primeiro aluno para acompanhar adesao, objetivo e ficha.")}
    </section>
    <section class="card">
      <h2>Novo aluno</h2>
      <form class="stack-form" data-form="trainer-student">
        <input name="name" placeholder="Nome do aluno" required />
        <input name="email" type="email" placeholder="Email do aluno" />
        <input name="goal" placeholder="Objetivo principal" />
        <div class="form-grid">
          <select name="plan">
            <option value="A">Treino A</option>
            <option value="B">Treino B</option>
            <option value="C">Treino C</option>
          </select>
          <input name="adherence" inputmode="numeric" placeholder="Adesao %" />
        </div>
        <button class="secondary" type="submit">Cadastrar aluno</button>
      </form>
    </section>
    <section class="card">
      <h2>Montar ficha</h2>
      ${renderTrainerAssignmentForm(students)}
    </section>
  `;
}

const renderers = {
  home: renderHome,
  profile: renderProfile,
  workout: renderWorkout,
  calendar: renderCalendar,
  body: renderBody,
  food: renderFood,
  goals: renderGoals,
  rewards: renderRewards,
  trainer: renderTrainer,
};

function renderTabs() {
  tabsEl.innerHTML = tabs.map((tab) => `
    <button type="button" class="${tab.key === activeTab ? "active" : ""}" data-tab="${tab.key}">${tab.label}</button>
  `).join("");
}

function render() {
  if (!currentUser) {
    profileLabel.textContent = "Entrar";
    profileToggle.textContent = "Entrar";
    profileToggle.hidden = true;
    renderAuth();
    return;
  }

  profileLabel.textContent = state.profile;
  profileToggle.hidden = false;
  profileToggle.textContent = "Sair";
  renderTabs();
  screen.innerHTML = renderers[activeTab]();
  if (isIos() && !isStandalone()) {
    screen.insertAdjacentHTML("beforeend", `
      <div class="ios-help">
        No iPhone: toque em Compartilhar e depois em Adicionar a Tela de Inicio para instalar.
      </div>
    `);
  }
}

function markToday() {
  const today = new Date().getDate();
  setState((current) => {
    if (current.completedDays.includes(today)) return current;
    return {
      ...current,
      points: current.points + 120,
      completedDays: [...current.completedDays, today].sort((a, b) => a - b),
    };
  });
}

function finishWorkout() {
  const today = new Date();
  const plan = activePlan();
  const planExercises = exercisesForPlan();
  const totalWeight = planExercises.reduce((sum, item) => sum + item.weight, 0);
  const historyItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : `history-${Date.now()}`,
    plan: activePlanKey(),
    title: `${plan.name} finalizado`,
    date: today.toLocaleDateString("pt-BR"),
    exerciseCount: planExercises.length,
    totalWeight,
    createdAt: today.toISOString(),
  };

  setState((current) => {
    const day = today.getDate();
    const alreadyMarked = current.completedDays.includes(day);
    return {
      ...current,
      points: current.points + 120,
      completedDays: alreadyMarked
        ? current.completedDays
        : [...current.completedDays, day].sort((a, b) => a - b),
      workoutHistory: [historyItem, ...(current.workoutHistory || [])],
    };
  });
  workoutView = "history";
  alert("Treino finalizado. Boa! Ele entrou no historico e somou +120 pontos.");
}

function handleProfilePhotoChange(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Escolha uma imagem para usar como foto.");
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    alert("Escolha uma imagem menor que 2MB por enquanto.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    setState((current) => ({
      ...current,
      profilePhoto: String(reader.result || ""),
    }));
  });
  reader.readAsDataURL(file);
}

screen.addEventListener("submit", (event) => {
  if (event.target.matches("#auth-form")) handleAuthSubmit(event);
  if (event.target.matches("[data-form]")) handleDataFormSubmit(event);
});

screen.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-auth-mode]");
  if (!modeButton) return;
  authMode = modeButton.dataset.authMode;
  render();
});

tabsEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  activeTab = button.dataset.tab;
  render();
});

screen.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "workout-view") {
    workoutView = target.dataset.view || "today";
    render();
  }
  if (action === "set-plan") {
    setState((current) => ({ ...current, activePlan: target.dataset.plan || "A" }));
  }
  if (action === "mark-today") markToday();
  if (action === "finish-workout") {
    finishWorkout();
  }
  if (action === "toggle-day") {
    const day = Number(target.dataset.day);
    setState((current) => ({
      ...current,
      completedDays: current.completedDays.includes(day)
        ? current.completedDays.filter((item) => item !== day)
        : [...current.completedDays, day].sort((a, b) => a - b),
    }));
  }
  if (action === "weight") {
    const id = target.dataset.id;
    const delta = Number(target.dataset.delta);
    setState((current) => ({
      ...current,
      exercises: current.exercises.map((item) => (
        item.id === id ? { ...item, weight: Math.max(0, item.weight + delta) } : item
      )),
    }));
  }
  if (action === "remove-photo") {
    setState((current) => ({ ...current, profilePhoto: "" }));
  }
  if (action === "logout") logout();
  if (action === "review-student") {
    const id = target.dataset.id;
    setState((current) => ({
      ...current,
      trainerStudents: (current.trainerStudents || []).map((student) => (
        student.id === id
          ? {
            ...student,
            status: "Em dia",
            adherence: Math.max(student.adherence || 0, 80),
            lastReview: new Date().toLocaleDateString("pt-BR"),
            note: "Aluno revisado pelo personal",
          }
          : student
      )),
    }));
  }
  if (action === "remove-student") {
    const id = target.dataset.id;
    setState((current) => ({
      ...current,
      trainerStudents: (current.trainerStudents || []).filter((student) => student.id !== id),
    }));
  }
  if (action === "new-goal") alert("Formulario de nova meta entra na proxima versao.");
});

screen.addEventListener("change", (event) => {
  const input = event.target.closest("[data-action='profile-photo']");
  if (!input) return;
  handleProfilePhotoChange(input);
});

screen.addEventListener("input", (event) => {
  const bodyInput = event.target.closest("[data-action='body']");
  if (bodyInput) {
    const field = bodyInput.dataset.field;
    state = {
      ...state,
      body: { ...state.body, [field]: bodyInput.value },
    };
    saveState();
    refreshBodySummary();
    return;
  }

  const mealInput = event.target.closest("[data-action='meal-kcal']");
  if (mealInput) {
    const id = mealInput.dataset.id;
    const kcal = Math.max(0, Math.round(numberFromInput(mealInput.value, 0)));
    state = {
      ...state,
      meals: state.meals.map((meal) => (
        meal.id === id ? { ...meal, kcal } : meal
      )),
    };
    saveState();
    refreshFoodSummary();
  }
});

profileToggle.addEventListener("click", () => {
  logout();
});

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (localStorage.getItem(INSTALL_DISMISSED_KEY) !== "true") {
    installBanner.hidden = false;
  }
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  installBanner.hidden = true;
});

installClose.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
  installBanner.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
