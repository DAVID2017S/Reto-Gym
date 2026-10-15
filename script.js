/* ==========================================
   RETO DAVID VS BRUNO
   JavaScript puro + localStorage
========================================== */

"use strict";

/* ==========================================
   CONFIGURACIÓN Y ESTADO INICIAL
========================================== */

const STORAGE_KEY = "retoDavidBrunoData";

const USERS = ["David", "Bruno"];

const initialState = {
  activeUser: null,
  challengeFinished: false,
  users: {
    David: {
      records: []
    },
    Bruno: {
      records: []
    }
  }
};

let state = loadState();
let previousPoints = 0;

/* ==========================================
   ELEMENTOS DEL DOM
========================================== */

const screens = {
  start: document.getElementById("startScreen"),
  dashboard: document.getElementById("dashboardScreen"),
  form: document.getElementById("formScreen"),
  history: document.getElementById("historyScreen"),
  finish: document.getElementById("finishScreen")
};

const activeUserName = document.getElementById("activeUserName");
const totalPointsElement = document.getElementById("totalPoints");
const currentWeightElement = document.getElementById("currentWeight");
const finishChallengeContainer = document.getElementById(
  "finishChallengeContainer"
);

const formTitle = document.getElementById("formTitle");
const exerciseForm = document.getElementById("exerciseForm");
const foodForm = document.getElementById("foodForm");
const weightForm = document.getElementById("weightForm");

const historyList = document.getElementById("historyList");
const historyTotalPoints = document.getElementById("historyTotalPoints");

const toastElement = document.getElementById("toast");

/* ==========================================
   INICIALIZACIÓN
========================================== */

document.addEventListener("DOMContentLoaded", () => {
  processAutomaticRules();
  attachEventListeners();

  if (state.challengeFinished) {
    showFinishScreen();
  } else if (state.activeUser) {
    showScreen("dashboard");
    renderDashboard();
  } else {
    showScreen("start");
  }
});

/* ==========================================
   LOCALSTORAGE
========================================== */

/**
 * Carga los datos guardados en el navegador.
 * Si no existen o están dañados, devuelve el estado inicial.
 */
function loadState() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return structuredClone(initialState);
    }

    const parsedData = JSON.parse(savedData);

    return normalizeState(parsedData);
  } catch (error) {
    console.error("No se pudieron cargar los datos:", error);
    return structuredClone(initialState);
  }
}

/**
 * Asegura que los datos importados o guardados
 * tengan la estructura necesaria.
 */
function normalizeState(data) {
  const normalized = structuredClone(initialState);

  if (data && typeof data === "object") {
    normalized.activeUser = USERS.includes(data.activeUser)
      ? data.activeUser
      : null;

    normalized.challengeFinished = Boolean(data.challengeFinished);

    USERS.forEach((user) => {
      if (
        data.users &&
        data.users[user] &&
        Array.isArray(data.users[user].records)
      ) {
        normalized.users[user].records = data.users[user].records;
      }
    });
  }

  return normalized;
}

/**
 * Guarda todo el estado actual en localStorage.
 */
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ==========================================
   NAVEGACIÓN ENTRE PANTALLAS
========================================== */

/**
 * Muestra una pantalla y oculta las demás.
 */
function showScreen(screenName) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active-screen");
  });

  screens[screenName].classList.add("active-screen");
}

/**
 * Muestra el formulario seleccionado.
 */
function showForm(formType) {
  exerciseForm.classList.add("hidden");
  foodForm.classList.add("hidden");
  weightForm.classList.add("hidden");

  if (formType === "exercise") {
    formTitle.textContent = "Registrar ejercicio";
    exerciseForm.classList.remove("hidden");
  }

  if (formType === "food") {
    formTitle.textContent = "Registrar comida";
    foodForm.classList.remove("hidden");
  }

  if (formType === "weight") {
    formTitle.textContent = "Registrar peso";
    weightForm.classList.remove("hidden");
  }

  showScreen("form");
}

/* ==========================================
   EVENTOS
========================================== */

function attachEventListeners() {
  // Selección de jugador en la pantalla inicial
  document.querySelectorAll("[data-user]").forEach((button) => {
    button.addEventListener("click", () => {
      selectUser(button.dataset.user);
    });
  });

  // Botones del dashboard
  document
    .getElementById("changeUserButton")
    .addEventListener("click", changeUser);

  document
    .getElementById("exerciseButton")
    .addEventListener("click", () => showForm("exercise"));

  document
    .getElementById("foodButton")
    .addEventListener("click", () => showForm("food"));

  document
    .getElementById("weightButton")
    .addEventListener("click", () => showForm("weight"));

  document
    .getElementById("historyButton")
    .addEventListener("click", () => {
      renderHistory();
      showScreen("history");
    });

  document
    .getElementById("finishChallengeButton")
    .addEventListener("click", finishChallenge);

  // Botones para volver
  document
    .getElementById("backFromFormButton")
    .addEventListener("click", () => {
      renderDashboard();
      showScreen("dashboard");
    });

  document
    .getElementById("backFromHistoryButton")
    .addEventListener("click", () => {
      renderDashboard();
      showScreen("dashboard");
    });

  // Formularios
  exerciseForm.addEventListener("submit", handleExerciseSubmit);
  foodForm.addEventListener("submit", handleFoodSubmit);
  weightForm.addEventListener("submit", handleWeightSubmit);

  // Importar y exportar
  document
    .getElementById("exportButton")
    .addEventListener("click", exportData);

  document
    .getElementById("importButton")
    .addEventListener("click", () => {
      document.getElementById("importFile").click();
    });

  document
    .getElementById("importFile")
    .addEventListener("change", importData);

  // Volver al inicio después de finalizar
  document
    .getElementById("backToStartAfterFinishButton")
    .addEventListener("click", () => {
      state.activeUser = null;
      saveState();
      showScreen("start");
    });
}

/* ==========================================
   USUARIOS
========================================== */

/**
 * Define el usuario activo y muestra el dashboard.
 */
function selectUser(user) {
  if (!USERS.includes(user)) return;

  state.activeUser = user;
  saveState();

  previousPoints = getTotalPoints(user);

  renderDashboard();
  showScreen("dashboard");
  showToast(`Has entrado como ${user}`);
}

/**
 * Regresa a la pantalla de selección de usuario.
 */
function changeUser() {
  state.activeUser = null;
  saveState();
  showScreen("start");
}

/* ==========================================
   FUNCIONES DE FECHA
========================================== */

/**
 * Devuelve una fecha local con formato YYYY-MM-DD.
 * Es preferible a toISOString porque evita problemas
 * de zona horaria cerca de la medianoche.
 */
function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Convierte una fecha YYYY-MM-DD en un objeto Date local.
 */
function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

/**
 * Devuelve la fecha y hora en formato legible.
 */
function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/**
 * Devuelve solo una fecha legible.
 */
function formatDate(dateKey) {
  return dateFromKey(dateKey).toLocaleDateString("es-ES", {
    dateStyle: "medium"
  });
}

/* ==========================================
   PUNTOS Y REGISTROS
========================================== */

/**
 * Obtiene los datos del usuario actual.
 */
function getCurrentUserData() {
  if (!state.activeUser) return null;

  return state.users[state.activeUser];
}

/**
 * Calcula los puntos totales.
 *
 * Los registros de peso aparecen en el historial con +1,
 * pero llevan excludedFromTotal: true porque el peso no debe
 * afectar los puntos totales según las reglas del reto.
 */
function getTotalPoints(user) {
  const userData = state.users[user];

  if (!userData) return 0;

  return userData.records.reduce((total, record) => {
    if (record.excludedFromTotal) {
      return total;
    }

    return total + Number(record.points || 0);
  }, 0);
}

/**
 * Busca el último peso registrado.
 */
function getCurrentWeight(user) {
  const userData = state.users[user];

  if (!userData) return null;

  const weightRecords = userData.records
    .filter((record) => record.type === "peso")
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return weightRecords.length > 0 ? weightRecords[0].weight : null;
}

/**
 * Agrega un registro al usuario actual.
 */
function addRecord(record) {
  const userData = getCurrentUserData();

  if (!userData) return;

  userData.records.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    dateKey: getDateKey(),
    ...record
  });

  saveState();
}

/* ==========================================
   RENDERIZADO DEL DASHBOARD
========================================== */

function renderDashboard() {
  if (!state.activeUser) return;

  const currentPoints = getTotalPoints(state.activeUser);
  const currentWeight = getCurrentWeight(state.activeUser);

  activeUserName.textContent = state.activeUser;
  totalPointsElement.textContent = currentPoints;
  currentWeightElement.textContent =
    currentWeight !== null ? `${currentWeight} kg` : "-- kg";

  // Solo David puede finalizar el reto
  if (state.activeUser === "David" && !state.challengeFinished) {
    finishChallengeContainer.classList.remove("hidden");
  } else {
    finishChallengeContainer.classList.add("hidden");
  }

  // Animación sencilla cuando cambian los puntos
  if (previousPoints !== currentPoints) {
    totalPointsElement.classList.remove("number-up", "number-down");

    if (currentPoints > previousPoints) {
      totalPointsElement.classList.add("number-up");
    } else {
      totalPointsElement.classList.add("number-down");
    }

    setTimeout(() => {
      totalPointsElement.classList.remove("number-up", "number-down");
    }, 700);
  }

  previousPoints = currentPoints;
}

/* ==========================================
   REGISTRO DE EJERCICIO
========================================== */

function handleExerciseSubmit(event) {
  event.preventDefault();

  const type = document.getElementById("exerciseType").value;
  const intensity = document.getElementById("exerciseIntensity").value;

  if (!type || !intensity) {
    showToast("Completa todos los campos.");
    return;
  }

  const points = intensity === "Pesado" ? 2 : 1;

  addRecord({
    type: "ejercicio",
    title: `${type} - intensidad ${intensity}`,
    description: `Ejercicio de tipo ${type}. Intensidad: ${intensity}.`,
    points,
    excludedFromTotal: false
  });

  exerciseForm.reset();
  renderDashboard();
  showScreen("dashboard");
  showToast(`Ejercicio guardado: +${points} punto(s)`);
}

/* ==========================================
   REGISTRO DE COMIDA
========================================== */

function handleFoodSubmit(event) {
  event.preventDefault();

  const description = document
    .getElementById("foodDescription")
    .value.trim();

  const category = document.getElementById("foodCategory").value;

  if (!description || !category) {
    showToast("Completa todos los campos.");
    return;
  }

  const pointsByCategory = {
    Dieta: 2,
    Decente: 1,
    Chatarra: -2
  };

  const points = pointsByCategory[category];

  addRecord({
    type: "comida",
    title: `${category}: ${description}`,
    description,
    category,
    points,
    excludedFromTotal: false
  });

  foodForm.reset();
  renderDashboard();
  showScreen("dashboard");

  const sign = points >= 0 ? "+" : "";
  showToast(`Comida guardada: ${sign}${points} puntos`);
}

/* ==========================================
   REGISTRO DE PESO
========================================== */

function handleWeightSubmit(event) {
  event.preventDefault();

  const weight = Number(document.getElementById("weightValue").value);

  if (!weight || weight <= 0) {
    showToast("Introduce un peso válido.");
    return;
  }

  addRecord({
    type: "peso",
    title: `Peso registrado: ${weight} kg`,
    description: `Peso corporal: ${weight} kg.`,
    weight,
    points: 1,
    /*
      El registro muestra +1 en el historial, pero no suma
      al total porque el peso es solo una estadística.
    */
    excludedFromTotal: true
  });

  weightForm.reset();
  renderDashboard();
  showScreen("dashboard");
  showToast("Peso guardado correctamente.");
}

/* ==========================================
   REGLAS AUTOMÁTICAS
========================================== */

/**
 * Aplica las reglas automáticas a días anteriores.
 *
 * Reglas:
 * - Día sin ningún registro: -2 puntos.
 * - Día sin ejercicio: -2 puntos.
 * - Cada 7 días consecutivos con alguna actividad: +5 puntos.
 *
 * El día actual no se penaliza hasta que termine.
 */
function processAutomaticRules() {
  USERS.forEach((user) => {
    processAutomaticRulesForUser(user);
  });

  saveState();
}

/**
 * Procesa las reglas de un usuario específico.
 */
function processAutomaticRulesForUser(user) {
  const userData = state.users[user];

  if (!userData || userData.records.length === 0) {
    return;
  }

  const activityRecords = userData.records.filter(
    (record) => record.type !== "ajuste"
  );

  if (activityRecords.length === 0) {
    return;
  }

  const dates = activityRecords.map((record) =>
    dateFromKey(record.dateKey)
  );

  const firstDate = new Date(
    Math.min(...dates.map((date) => date.getTime()))
  );

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const currentDate = new Date(firstDate);
  const activeDays = new Set();

  while (currentDate <= yesterday) {
    const dateKey = getDateKey(currentDate);

    const recordsForDay = activityRecords.filter(
      (record) => record.dateKey === dateKey
    );

    const hasSomething = recordsForDay.length > 0;
    const hasExercise = recordsForDay.some(
      (record) => record.type === "ejercicio"
    );

    if (hasSomething) {
      activeDays.add(dateKey);
    }

    // Si el día no tuvo ningún registro, se restan -2.
    if (
      !hasSomething &&
      !hasAutomaticAdjustment(userData, "empty-day", dateKey)
    ) {
      userData.records.push(createAutomaticRecord(
        "Día sin registros",
        "No se registró ejercicio, comida ni peso.",
        -2,
        "empty-day",
        dateKey
      ));
    }

    // Si no hubo ejercicio, se restan -2.
    if (
      !hasExercise &&
      !hasAutomaticAdjustment(userData, "no-exercise", dateKey)
    ) {
      userData.records.push(createAutomaticRecord(
        "Día sin ejercicio",
        "No se registró ninguna actividad de ejercicio.",
        -2,
        "no-exercise",
        dateKey
      ));
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Bonus por cada séptimo día consecutivo activo.
  processStreakBonuses(userData, firstDate, yesterday, activeDays);
}

/**
 * Crea un registro automático.
 */
function createAutomaticRecord(title, description, points, rule, dateKey) {
  const timestampDate = dateFromKey(dateKey);
  timestampDate.setHours(23, 59, 0, 0);

  return {
    id: `automatic-${rule}-${dateKey}`,
    timestamp: timestampDate.toISOString(),
    dateKey,
    type: "ajuste",
    title,
    description,
    points,
    rule,
    excludedFromTotal: false
  };
}

/**
 * Comprueba si ya se aplicó una penalización o bonus.
 */
function hasAutomaticAdjustment(userData, rule, dateKey) {
  return userData.records.some(
    (record) => record.type === "ajuste" &&
      record.rule === rule &&
      record.dateKey === dateKey
  );
}

/**
 * Aplica un bonus al completar cada bloque de 7 días seguidos.
 */
function processStreakBonuses(userData, firstDate, yesterday, activeDays) {
  const currentDate = new Date(firstDate);
  let consecutiveDays = 0;

  while (currentDate <= yesterday) {
    const dateKey = getDateKey(currentDate);

    if (activeDays.has(dateKey)) {
      consecutiveDays++;

      if (
        consecutiveDays % 7 === 0 &&
        !hasAutomaticAdjustment(userData, "streak-bonus", dateKey)
      ) {
        userData.records.push(createAutomaticRecord(
          "Bonus de constancia",
          "Se completaron 7 días seguidos registrando alguna actividad.",
          5,
          "streak-bonus",
          dateKey
        ));
      }
    } else {
      consecutiveDays = 0;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
}

/* ==========================================
   HISTORIAL
========================================== */

function renderHistory() {
  if (!state.activeUser) return;

  const records = [...state.users[state.activeUser].records].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  historyTotalPoints.textContent = getTotalPoints(state.activeUser);

  if (records.length === 0) {
    historyList.innerHTML = `
      <div class="empty-history">
        Todavía no hay registros para ${state.activeUser}.
      </div>
    `;
    return;
  }

  historyList.innerHTML = records
    .map((record) => {
      const icon = getRecordIcon(record.type);
      const points = Number(record.points || 0);

      let pointsClass = "zero-points";
      if (points > 0) pointsClass = "positive-points";
      if (points < 0) pointsClass = "negative-points";

      const pointsText = points > 0 ? `+${points}` : points;

      return `
        <article class="history-item">
          <div class="history-icon">${icon}</div>

          <div class="history-content">
            <strong>${escapeHtml(record.title)}</strong>
            <p>${escapeHtml(record.description || "")}</p>
            <div class="history-date">
              ${formatDateTime(record.timestamp)}
            </div>
          </div>

          <div class="history-points ${pointsClass}">
            ${pointsText}
          </div>
        </article>
      `;
    })
    .join("");
}

function getRecordIcon(type) {
  const icons = {
    ejercicio: "🏃",
    comida: "🍎",
    peso: "⚖️",
    ajuste: "⚙️"
  };

  return icons[type] || "📝";
}

/**
 * Evita que texto introducido por el usuario
 * se interprete como HTML.
 */
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ==========================================
   FINALIZAR RETO
========================================== */

function finishChallenge() {
  if (state.activeUser !== "David") {
    showToast("Solo David puede finalizar el reto.");
    return;
  }

  const confirmed = confirm(
    "¿Seguro que quieres finalizar el reto? Esta acción calcula el ganador."
  );

  if (!confirmed) return;

  processAutomaticRules();

  state.challengeFinished = true;
  saveState();

  showFinishScreen();
}

function showFinishScreen() {
  const davidPoints = getTotalPoints("David");
  const brunoPoints = getTotalPoints("Bruno");

  document.getElementById(
    "davidFinalPoints"
  ).textContent = `${davidPoints} puntos`;

  document.getElementById(
    "brunoFinalPoints"
  ).textContent = `${brunoPoints} puntos`;

  const winnerTitle = document.getElementById("winnerTitle");
  const loserMessage = document.getElementById("loserMessage");

  if (davidPoints > brunoPoints) {
    winnerTitle.textContent = "¡David gana!";
    loserMessage.textContent = "Eres la perrita de David";
  } else if (brunoPoints > davidPoints) {
    winnerTitle.textContent = "¡Bruno gana!";
    loserMessage.textContent = "Eres la perrita de Bruno";
  } else {
    winnerTitle.textContent = "¡Empate!";
    loserMessage.textContent = "No hay perdedor: toca desempate";
  }

  createConfetti();
  showScreen("finish");
}

/**
 * Genera confeti usando únicamente elementos HTML y CSS.
 */
function createConfetti() {
  const container = document.getElementById("confettiContainer");
  container.innerHTML = "";

  const colors = [
    "#1e90ff",
    "#ff3b30",
    "#ffd700",
    "#24d17e",
    "#a970ff",
    "#ff9f43",
    "#ffffff"
  ];

  for (let i = 0; i < 90; i++) {
    const piece = document.createElement("span");

    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDuration = `${2 + Math.random() * 4}s`;
    piece.style.animationDelay = `${Math.random() * 2}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;

    container.appendChild(piece);
  }
}

/* ==========================================
   EXPORTAR DATOS
========================================== */

function exportData() {
  const dataToExport = {
    ...state,
    exportedAt: new Date().toISOString(),
    application: "Reto David vs Bruno"
  };

  const json = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([json], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `reto-david-bruno-${getDateKey()}.json`;
  link.click();

  URL.revokeObjectURL(url);
  showToast("Datos exportados correctamente.");
}

/* ==========================================
   IMPORTAR DATOS
========================================== */

function importData(event) {
  const file = event.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const importedData = JSON.parse(reader.result);

      if (
        !importedData ||
        !importedData.users ||
        !importedData.users.David ||
        !importedData.users.Bruno
      ) {
        throw new Error("Formato inválido");
      }

      const confirmed = confirm(
        "Importar datos reemplazará los datos actuales de este navegador. ¿Continuar?"
      );

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      state = normalizeState(importedData);
      saveState();

      if (state.challengeFinished) {
        showFinishScreen();
      } else if (state.activeUser) {
        renderDashboard();
        showScreen("dashboard");
      } else {
        showScreen("start");
      }

      showToast("Datos importados correctamente.");
    } catch (error) {
      console.error(error);
      showToast("El archivo JSON no es válido.");
    }

    event.target.value = "";
  };

  reader.readAsText(file);
}

/* ==========================================
   MENSAJES TEMPORALES
========================================== */

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("show");

  clearTimeout(showToast.timeout);

  showToast.timeout = setTimeout(() => {
    toastElement.classList.remove("show");
  }, 3000);
}