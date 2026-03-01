  // ===== ФЕЙКОВЫЕ ДАННЫЕ ДЛЯ ГЕРОЕВ =====
  // В реальном приложении эти данные приходили бы с сервера

  const FAKE_HERO_STATS = [
    {
      name: "Layla",
      winRate: "55%",
      kda: "8 / 4 / 6",
      matches: 120
    },
    {
      name: "Gusion",
      winRate: "61%",
      kda: "9 / 3 / 7",
      matches: 210
    },
    {
      name: "Esmeralda",
      winRate: "52%",
      kda: "5 / 4 / 9",
      matches: 95
    },
    {
      name: "Tigreal",
      winRate: "58%",
      kda: "3 / 3 / 14",
      matches: 160
    },
    {
      name: "Hayabusa",
      winRate: "49%",
      kda: "7 / 5 / 5",
      matches: 143
    }
  ];

  // ===== КЛЮЧ ДЛЯ localStorage И МАКСИМАЛЬНАЯ ДЛИНА ИСТОРИИ =====

  const HISTORY_STORAGE_KEY = "mlbbTrackerHistory";
  const HISTORY_MAX_ITEMS = 10;

  // ===== ПОМОЩНИКИ РАБОТЫ С localStorage =====

  /**
   * Читает историю поисков из localStorage
   * @returns {Array<{playerId: string, server: string, timestamp: number}>}
   */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      // Безопасная проверка структуры
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.error("Ошибка чтения истории из localStorage:", e);
      return [];
    }
  }

  /**
   * Сохраняет историю поисков в localStorage
   * @param {Array} history
   */
  function saveHistory(history) {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Ошибка записи истории в localStorage:", e);
    }
  }

  /**
   * Добавляет новый поиск в историю и обрезает до HISTORY_MAX_ITEMS
   * @param {string} playerId
   * @param {string} server
   */
  function addToHistory(playerId, server) {
    const current = loadHistory();

    // Удаляем дубликаты по комбинации playerId + server
    const filtered = current.filter(
      (item) => !(item.playerId === playerId && item.server === server)
    );

    const newEntry = {
      playerId,
      server,
      timestamp: Date.now()
    };

    const updated = [newEntry, ...filtered].slice(0, HISTORY_MAX_ITEMS);
    saveHistory(updated);
    renderHistory();
  }

  /**
   * Очищает историю
   */
  function clearHistory() {
    saveHistory([]);
    renderHistory();
  }

  // ===== ОТОБРАЖЕНИЕ ИСТОРИИ НА СТРАНИЦЕ =====

  /**
   * Рендерит историю в правой колонке
   */
  function renderHistory() {
    const historyList = document.getElementById("history-list");
    const emptyLabel = document.getElementById("history-empty");

    const history = loadHistory();

    historyList.innerHTML = "";

    if (!history.length) {
      emptyLabel.classList.remove("hidden");
      return;
    }

    emptyLabel.classList.add("hidden");

    history.forEach((item) => {
      const entryEl = document.createElement("button");
      entryEl.type = "button";
      entryEl.className = "history-item";

      const main = document.createElement("div");
      main.className = "history-main";

      const idEl = document.createElement("div");
      idEl.className = "history-id";
      idEl.textContent = item.playerId;

      const metaEl = document.createElement("div");
      metaEl.className = "history-meta";

      // Короткая дата/время
      const date = new Date(item.timestamp);
      const dateString = date.toLocaleString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit"
      });

      metaEl.textContent = `Последний запрос: ${dateString}`;

      main.appendChild(idEl);
      main.appendChild(metaEl);

      const serverEl = document.createElement("div");
      serverEl.className = "history-server";
      serverEl.textContent = item.server;

      entryEl.appendChild(main);
      entryEl.appendChild(serverEl);

      // Клик по элементу истории — восстановить запрос
      entryEl.addEventListener("click", () => {
        const playerInput = document.getElementById("player-id");
        const serverSelect = document.getElementById("server");

        playerInput.value = item.playerId;
        serverSelect.value = item.server;

        // Имитируем нажатие кнопки "Проверить"
        runSearch(item.playerId, item.server, { addToHistory: false });
      });

      historyList.appendChild(entryEl);
    });
  }

  // ===== РАБОТА С РЕЗУЛЬТАТАМИ =====

  /**
   * Отрисовывает таблицу фейковой статистики
   * @param {string} playerId
   * @param {string} server
   */
  function renderStatsTable(playerId, server) {
    const resultsSection = document.getElementById("results");
    const statsBody = document.getElementById("stats-body");
    const playerLabel = document.getElementById("results-player-label");

    // Обновляем подпись игрока
    playerLabel.innerHTML = `Игрок <span>${playerId}</span> • Сервер <span>${server}</span>`;

    // Очищаем тело таблицы
    statsBody.innerHTML = "";

    // Вставляем строки с фейковыми данными
    FAKE_HERO_STATS.forEach((hero) => {
      const tr = document.createElement("tr");

      const tdHero = document.createElement("td");
      tdHero.className = "hero-name";
      tdHero.textContent = hero.name;

      const tdWr = document.createElement("td");
      tdWr.className = "stat-positive";
      tdWr.textContent = hero.winRate;

      const tdKda = document.createElement("td");
      tdKda.textContent = hero.kda;

      const tdMatches = document.createElement("td");
      tdMatches.textContent = hero.matches.toString();

      tr.appendChild(tdHero);
      tr.appendChild(tdWr);
      tr.appendChild(tdKda);
      tr.appendChild(tdMatches);

      statsBody.appendChild(tr);
    });

    resultsSection.classList.remove("hidden");
  }

  // ===== ЛОГИКА ПОИСКА =====

  /**
   * Запускает поиск: валидация, отображение статистики, обновление истории
   * @param {string} rawPlayerId
   * @param {string} server
   * @param {{ addToHistory?: boolean }} options
   */
  function runSearch(rawPlayerId, server, options = {}) {
    const { addToHistory: shouldAddToHistory = true } = options;
    const errorEl = document.getElementById("error-msg");

    // Сбрасываем сообщение об ошибке
    errorEl.textContent = "";
    errorEl.classList.add("hidden");

    const playerId = rawPlayerId.trim();

    if (!playerId) {
      errorEl.textContent = "Пожалуйста, введите корректный Player ID.";
      errorEl.classList.remove("hidden");
      return;
    }

    // В этой демо-версии никакого реального API нет —
    // мы просто показываем одну и ту же фейковую статистику
    renderStatsTable(playerId, server);

    // Сохраняем запрос в историю
    if (shouldAddToHistory) {
      addToHistory(playerId, server);
    }
  }

  // ===== ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ =====

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("search-form");
    const clearBtn = document.getElementById("clear-history");

    // Рендерим историю из localStorage
    renderHistory();

    // Обработчик формы "Проверить"
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const playerInput = document.getElementById("player-id");
      const serverSelect = document.getElementById("server");

      runSearch(playerInput.value, serverSelect.value, {
        addToHistory: true
      });
    });

    // Кнопка "Очистить историю"
    clearBtn.addEventListener("click", () => {
      if (confirm("Очистить историю поисков?")) {
        clearHistory();
      }
    });
  });
