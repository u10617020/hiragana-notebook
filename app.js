"use strict";

const KANA_ROWS = [
  { id: "a", label: "あ行", kana: [["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"]] },
  { id: "ka", label: "か行", kana: [["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"]] },
  { id: "sa", label: "さ行", kana: [["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"]] },
  { id: "ta", label: "た行", kana: [["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"]] },
  { id: "na", label: "な行", kana: [["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"]] },
  { id: "ha", label: "は行", kana: [["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"]] },
  { id: "ma", label: "ま行", kana: [["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"]] },
  { id: "ya", label: "や行", kana: [["や", "ya"], ["ゆ", "yu"], ["よ", "yo"]] },
  { id: "ra", label: "ら行", kana: [["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"]] },
  { id: "wa", label: "わ行", kana: [["わ", "wa"], ["を", "wo"], ["ん", "n"]] }
];

const ALL_KANA = KANA_ROWS.flatMap((row) => row.kana.map(([character, romaji]) => ({
  character,
  romaji,
  rowId: row.id,
  rowLabel: row.label
})));

const KATAKANA_ROWS = KANA_ROWS.map((row, rowIndex) => {
  const characters = [
    "アイウエオ", "カキクケコ", "サシスセソ", "タチツテト", "ナニヌネノ",
    "ハヒフヘホ", "マミムメモ", "ヤユヨ", "ラリルレロ", "ワヲン"
  ][rowIndex];
  return {
    id: row.id,
    label: `${characters[0]}行`,
    kana: row.kana.map(([, romaji], index) => [characters[index], romaji])
  };
});

const WORD_GROUPS = [
  { id: "food", label: "食物", icon: "🍙", words: [
    ["ごはん", "gohan", "飯"], ["パン", "pan", "麵包"], ["りんご", "ringo", "蘋果"],
    ["たまご", "tamago", "雞蛋"], ["すし", "sushi", "壽司"], ["おちゃ", "ocha", "茶"],
    ["ミルク", "miruku", "牛奶"], ["ケーキ", "kēki", "蛋糕"], ["みず", "mizu", "水"],
    ["さかな", "sakana", "魚"]
  ] },
  { id: "animals", label: "動物", icon: "🐈", words: [
    ["ねこ", "neko", "貓"], ["いぬ", "inu", "狗"], ["とり", "tori", "鳥"],
    ["うさぎ", "usagi", "兔子"], ["くま", "kuma", "熊"], ["さる", "saru", "猴子"],
    ["うま", "uma", "馬"], ["ぞう", "zō", "大象"], ["きつね", "kitsune", "狐狸"],
    ["かめ", "kame", "烏龜"]
  ] },
  { id: "daily", label: "日常", icon: "🏠", words: [
    ["おはよう", "ohayō", "早安"], ["こんにちは", "konnichiwa", "你好"],
    ["ありがとう", "arigatō", "謝謝"], ["さようなら", "sayōnara", "再見"],
    ["いえ", "ie", "家"], ["がっこう", "gakkō", "學校"],
    ["ともだち", "tomodachi", "朋友"], ["ほん", "hon", "書"],
    ["でんしゃ", "densha", "電車"], ["くるま", "kuruma", "汽車"]
  ] }
];

const ALL_WORDS = WORD_GROUPS.flatMap((group) => group.words.map(([character, romaji, meaning], index) => ({
  character, romaji, meaning, groupId: group.id, groupLabel: group.label,
  audioPath: `audio/words/${group.id}-${String(index + 1).padStart(2, "0")}.mp3`
})));
const ALL_KATAKANA = KATAKANA_ROWS.flatMap((row) => row.kana.map(([character, romaji]) => ({
  character, romaji, rowId: row.id, rowLabel: row.label
})));

const STORAGE_KEY = "kana-notebook:v2";
const LEGACY_STORAGE_KEY = "hiragana-copybook:v1";
const STORAGE_VERSION = 2;
const TRACE_CELLS = 3;
const TOTAL_CELLS = 8;
const WORD_TRACE_CELLS = 2;
const WORD_TOTAL_CELLS = 5;

const elements = {
  homeView: document.querySelector("#home-view"),
  catalogView: document.querySelector("#catalog-view"),
  practiceView: document.querySelector("#practice-view"),
  courseList: document.querySelector("#course-list"),
  rowList: document.querySelector("#row-list"),
  totalWritten: document.querySelector("#total-written"),
  dailyCount: document.querySelector("#daily-count"),
  streakNote: document.querySelector("#streak-note"),
  catalogBack: document.querySelector("#catalog-back"),
  catalogTitle: document.querySelector("#catalog-title"),
  catalogNavTitle: document.querySelector("#catalog-nav-title"),
  catalogEyebrow: document.querySelector("#catalog-eyebrow"),
  catalogDescription: document.querySelector("#catalog-description"),
  catalogProgressText: document.querySelector("#catalog-progress-text"),
  catalogWrittenText: document.querySelector("#catalog-written-text"),
  catalogProgressFill: document.querySelector("#catalog-progress-fill"),
  catalogSectionTitle: document.querySelector("#catalog-section-title"),
  randomPractice: document.querySelector("#random-practice"),
  backButton: document.querySelector("#back-button"),
  resetPageTop: document.querySelector("#reset-page-top"),
  modeLabel: document.querySelector("#mode-label"),
  positionLabel: document.querySelector("#position-label"),
  practiceKana: document.querySelector("#practice-kana"),
  practiceRomaji: document.querySelector("#practice-romaji"),
  practiceMeaning: document.querySelector("#practice-meaning"),
  focusEyebrow: document.querySelector("#focus-eyebrow"),
  practiceCount: document.querySelector("#practice-count"),
  speakButton: document.querySelector("#speak-button"),
  statusTitle: document.querySelector("#status-title"),
  markReview: document.querySelector("#mark-review"),
  markMastered: document.querySelector("#mark-mastered"),
  practiceGrid: document.querySelector("#practice-grid"),
  filledCount: document.querySelector("#filled-count"),
  completionPanel: document.querySelector("#completion-panel"),
  completionTitle: document.querySelector("#completion-title"),
  completionCopy: document.querySelector("#completion-copy"),
  previousCell: document.querySelector("#previous-cell"),
  completeButton: document.querySelector("#complete-button"),
  nextActions: document.querySelector("#next-actions"),
  repeatButton: document.querySelector("#repeat-button"),
  nextButton: document.querySelector("#next-button"),
  helpButton: document.querySelector("#help-button"),
  helpDialog: document.querySelector("#help-dialog"),
  installButton: document.querySelector("#install-button"),
  toast: document.querySelector("#toast")
};

let progress = loadProgress();
let course = "hiragana";
let currentItem = ALL_KANA[0];
let practiceMode = { type: "row", rowId: "a", index: 0 };
let pads = [];
let activeCellIndex = 0;
let sessionCompleted = false;
let deferredInstallPrompt = null;
let toastTimer = 0;
let activeAudio = null;

function defaultProgress() {
  return { version: STORAGE_VERSION, hiragana: {}, katakana: {}, words: {}, activity: {} };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    if (!saved || typeof saved !== "object") return defaultProgress();

    const migrated = defaultProgress();
    ["hiragana", "katakana", "words"].forEach((kind) => {
      const sourceItems = kind === "hiragana" && saved.kana ? saved.kana : saved[kind];
      if (!sourceItems || typeof sourceItems !== "object") return;
      getItems(kind).forEach(({ character }) => {
        const source = sourceItems[character];
        if (!source || typeof source !== "object") return;
        const entry = {
          count: validCount(source.count),
          written: Number.isFinite(source.written) ? validCount(source.written) : validCount(source.count) * (kind === "words" ? WORD_TOTAL_CELLS : TOTAL_CELLS)
        };
        if (source.status === "mastered" || source.status === "review") entry.status = source.status;
        if (typeof source.lastPracticed === "string") entry.lastPracticed = source.lastPracticed;
        migrated[kind][character] = entry;
      });
    });
    if (saved.activity && typeof saved.activity === "object") {
      Object.entries(saved.activity).forEach(([date, count]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) migrated.activity[date] = validCount(count);
      });
    }
    return migrated;
  } catch {
    return defaultProgress();
  }
}

function validCount(value) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function getItems(kind = course) {
  return kind === "katakana" ? ALL_KATAKANA : kind === "words" ? ALL_WORDS : ALL_KANA;
}

function getRows() {
  return course === "katakana" ? KATAKANA_ROWS : KANA_ROWS;
}

function getTotalCells() {
  return course === "words" ? WORD_TOTAL_CELLS : TOTAL_CELLS;
}

function getTraceCells() {
  return course === "words" ? WORD_TRACE_CELLS : TRACE_CELLS;
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    showToast("無法儲存進度，請確認瀏覽器沒有封鎖本機儲存。");
  }
}

function getItemProgress(character, kind = course) {
  if (!progress[kind][character]) progress[kind][character] = { count: 0, written: 0 };
  return progress[kind][character];
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentStreak() {
  const date = new Date();
  if (!progress.activity[localDateKey(date)]) date.setDate(date.getDate() - 1);
  let days = 0;
  while (progress.activity[localDateKey(date)] > 0) {
    days += 1;
    date.setDate(date.getDate() - 1);
  }
  return days;
}

function renderHome() {
  const courses = [
    { id: "hiragana", icon: "あ", title: "平假名", subtitle: "基礎 46 音 · 從這裡開始", total: 46 },
    { id: "katakana", icon: "ア", title: "片假名", subtitle: "基礎 46 音 · 認識外來語", total: 46 },
    { id: "words", icon: "語", title: "單詞練習", subtitle: "食物、動物、日常 · 30 個單詞", total: ALL_WORDS.length }
  ];
  elements.courseList.replaceChildren();
  courses.forEach((item) => {
    const mastered = getItems(item.id).filter(({ character }) => progress[item.id][character]?.status === "mastered").length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "course-card";
    button.innerHTML = `<span class="course-card__icon"></span><span class="course-card__copy"><strong></strong><small></small><span class="course-card__progress"></span></span><span class="course-card__arrow" aria-hidden="true">›</span>`;
    button.querySelector(".course-card__icon").textContent = item.icon;
    button.querySelector("strong").textContent = item.title;
    button.querySelector("small").textContent = item.subtitle;
    button.querySelector(".course-card__progress").textContent = `${mastered} / ${item.total} 個已會`;
    button.addEventListener("click", () => openCatalog(item.id));
    elements.courseList.append(button);
  });
  elements.totalWritten.textContent = ["hiragana", "katakana", "words"].reduce((total, kind) =>
    total + Object.values(progress[kind]).reduce((sum, entry) => sum + validCount(entry.written), 0), 0).toLocaleString();
  const today = validCount(progress.activity[localDateKey()]);
  const streak = currentStreak();
  elements.dailyCount.textContent = `${Math.min(today, 5)} / 5`;
  elements.streakNote.textContent = streak > 0
    ? `連續練習 ${streak} 天${today >= 5 ? " · 今天的 5 頁目標完成！" : " · 今天再完成幾頁吧！"}`
    : "完成一頁，開始今天的練習紀錄。";
}

function renderCatalog() {
  elements.rowList.replaceChildren();
  const isWords = course === "words";
  const title = course === "hiragana" ? "平假名" : course === "katakana" ? "片假名" : "單詞練習";
  elements.catalogTitle.textContent = title;
  elements.catalogNavTitle.textContent = title;
  elements.catalogEyebrow.textContent = isWords ? "3 個生活主題" : "基本 46 音";
  elements.catalogDescription.textContent = isWords ? "先看意思與讀音，再動手寫完整單詞。" : "選一個字開始描寫與默寫。";
  elements.catalogSectionTitle.textContent = isWords ? "選一個主題與單詞" : "選一行開始練習";
  const items = getItems();
  const mastered = items.filter(({ character }) => progress[course][character]?.status === "mastered").length;
  const written = items.reduce((sum, { character }) => sum + validCount(progress[course][character]?.written), 0);
  elements.catalogProgressText.textContent = `${mastered} / ${items.length} 個已會`;
  elements.catalogWrittenText.textContent = `已寫 ${written.toLocaleString()} 次`;
  elements.catalogProgressFill.style.width = `${(mastered / items.length) * 100}%`;

  if (isWords) {
    elements.rowList.classList.add("row-list--words");
    WORD_GROUPS.forEach((group) => {
      const section = document.createElement("section");
      section.className = "word-group";
      const heading = document.createElement("h3");
      heading.textContent = `${group.icon} ${group.label}`;
      const list = document.createElement("div");
      list.className = "word-list";
      group.words.forEach(([character, romaji, meaning], index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "word-button";
        button.innerHTML = `<span class="word-button__main"></span><span class="word-button__meaning"></span><span class="word-button__count"></span>`;
        button.querySelector(".word-button__main").textContent = character;
        button.querySelector(".word-button__meaning").textContent = `${meaning} · ${romaji}`;
        button.querySelector(".word-button__count").textContent = `${validCount(progress.words[character]?.written)} 次`;
        const status = progress.words[character]?.status;
        if (status) button.dataset.status = status;
        button.addEventListener("click", () => startWordPractice(group.id, index));
        list.append(button);
      });
      section.append(heading, list);
      elements.rowList.append(section);
    });
    return;
  }

  elements.rowList.classList.remove("row-list--words");
  getRows().forEach((row) => {
    const article = document.createElement("article");
    article.className = `kana-row${row.kana.length < 5 ? " kana-row--short" : ""}`;

    const title = document.createElement("div");
    title.className = "kana-row__title";
    title.innerHTML = `<strong>${row.kana[0][0]}</strong>${row.label}`;

    const characters = document.createElement("div");
    characters.className = "kana-row__characters";
    characters.setAttribute("aria-label", row.label);

    row.kana.forEach(([character], index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kana-button";
      button.textContent = character;
      button.setAttribute("aria-label", `練習 ${character}`);
      const status = progress[course][character]?.status;
      if (status) button.dataset.status = status;
      button.title = `已寫 ${validCount(progress[course][character]?.written)} 次`;
      button.addEventListener("click", () => startRowPractice(row.id, index));
      characters.append(button);
    });

    article.append(title, characters);
    elements.rowList.append(article);
  });

}

function openCatalog(kind, { fromHistory = false } = {}) {
  course = kind;
  renderCatalog();
  elements.homeView.hidden = true;
  elements.practiceView.hidden = true;
  elements.catalogView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!fromHistory) history.pushState({ view: "catalog", course }, "", `#${course}`);
}

function startRowPractice(rowId, index = 0) {
  const row = getRows().find((item) => item.id === rowId) || getRows()[0];
  const safeIndex = Math.max(0, Math.min(index, row.kana.length - 1));
  practiceMode = { type: "row", rowId: row.id, index: safeIndex };
  setCurrentItem(row.kana[safeIndex][0]);
  showPractice();
}

function startWordPractice(groupId, index = 0) {
  const group = WORD_GROUPS.find((item) => item.id === groupId) || WORD_GROUPS[0];
  practiceMode = { type: "word-group", groupId: group.id, index };
  setCurrentItem(group.words[index][0]);
  showPractice();
}

function startRandomPractice() {
  practiceMode = { type: "random" };
  currentItem = chooseRandomItem(null);
  buildPracticePage();
  showPractice();
}

function chooseRandomItem(previousCharacter) {
  const items = getItems();
  const candidates = items.filter(({ character }) => character !== previousCharacter || items.length === 1);
  const weighted = candidates.map((item) => {
    const status = progress[course][item.character]?.status;
    return { item, weight: status === "review" ? 5 : status === "mastered" ? 1 : 3 };
  });
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let pick = Math.random() * total;
  for (const entry of weighted) {
    pick -= entry.weight;
    if (pick < 0) return entry.item;
  }
  return weighted[weighted.length - 1].item;
}

function setCurrentItem(character) {
  currentItem = getItems().find((item) => item.character === character) || getItems()[0];
  buildPracticePage();
}

function showPractice() {
  elements.homeView.hidden = true;
  elements.catalogView.hidden = true;
  elements.practiceView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
  history.pushState({ view: "practice", course }, "", `#practice-${course}`);
}

function showHome({ fromHistory = false } = {}) {
  stopPronunciation();
  pads.forEach((pad) => pad.destroy());
  pads = [];
  renderHome();
  elements.practiceView.hidden = true;
  elements.catalogView.hidden = true;
  elements.homeView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!fromHistory) history.pushState({ view: "home" }, "", location.pathname);
}

function showCatalog({ fromHistory = false } = {}) {
  stopPronunciation();
  pads.forEach((pad) => pad.destroy());
  pads = [];
  openCatalog(course, { fromHistory });
}

function buildPracticePage() {
  stopPronunciation();
  pads.forEach((pad) => pad.destroy());
  pads = [];
  activeCellIndex = 0;
  sessionCompleted = false;

  const isWord = course === "words";
  elements.practiceView.classList.toggle("practice-view--word", isWord);
  elements.focusEyebrow.textContent = isWord ? "今天練這個單詞" : "今天練這個字";
  elements.statusTitle.textContent = isWord ? "這個單詞目前：" : "這個字目前：";
  elements.practiceKana.textContent = currentItem.character;
  elements.practiceRomaji.textContent = currentItem.romaji;
  elements.practiceMeaning.hidden = !isWord;
  elements.practiceMeaning.textContent = currentItem.meaning || "";
  const entry = getItemProgress(currentItem.character);
  elements.practiceCount.textContent = `已寫 ${entry.written || 0} 次`;
  elements.nextButton.firstChild.textContent = isWord ? "下一個單詞 " : "下一個字 ";
  document.querySelector("#worksheet-title").textContent = isWord ? "描寫 2 次，再默寫 3 次" : "先描 3 次，再自己寫 5 次";

  if (practiceMode.type === "random") {
    elements.modeLabel.textContent = "隨機複習";
    elements.positionLabel.textContent = `混合 ${getItems().length} 個${isWord ? "單詞" : "字"}`;
  } else if (practiceMode.type === "word-group") {
    const group = WORD_GROUPS.find((item) => item.id === practiceMode.groupId);
    elements.modeLabel.textContent = `${group.label}單詞`;
    elements.positionLabel.textContent = `${practiceMode.index + 1} / ${group.words.length}`;
  } else {
    const row = getRows().find((item) => item.id === practiceMode.rowId) || getRows()[0];
    elements.modeLabel.textContent = `${row.label}練習`;
    elements.positionLabel.textContent = `${practiceMode.index + 1} / ${row.kana.length}`;
  }

  elements.practiceGrid.replaceChildren();
  elements.practiceGrid.classList.toggle("practice-grid--words", isWord);
  for (let index = 0; index < getTotalCells(); index += 1) {
    const cell = createPracticeCell(index, index < getTraceCells());
    elements.practiceGrid.append(cell.root);
    pads.push(cell.pad);
  }

  updateStatusButtons();
  resetCompletionUI();
  requestAnimationFrame(() => pads.forEach((pad) => pad.resize()));
}

function createPracticeCell(index, isTrace) {
  const root = document.createElement("article");
  root.className = "practice-cell";

  const label = document.createElement("div");
  label.className = "practice-cell__label";
  label.innerHTML = `<span>第 ${index + 1} 格</span><span>${isTrace ? "描字" : "默寫"}</span>`;

  const square = document.createElement("div");
  square.className = "writing-square";
  if (course === "words") square.classList.add("writing-square--word");
  if (isTrace) {
    const guide = document.createElement("span");
    guide.className = "trace-character";
    guide.textContent = currentItem.character;
    guide.setAttribute("aria-hidden", "true");
    square.append(guide);
  }

  const canvas = document.createElement("canvas");
  canvas.className = "writing-canvas";
  canvas.setAttribute("aria-label", `第 ${index + 1} 格，${isTrace ? "描字" : "默寫"}`);
  square.append(canvas);

  const tools = document.createElement("div");
  tools.className = "cell-tools";
  const undo = document.createElement("button");
  undo.type = "button";
  undo.textContent = "復原一筆";
  undo.disabled = true;
  const clear = document.createElement("button");
  clear.type = "button";
  clear.textContent = "清除";
  clear.disabled = true;
  tools.append(undo, clear);
  root.append(label, square, tools);

  const pad = makeDrawingPad(canvas, () => {
    undo.disabled = pad.strokes.length === 0;
    clear.disabled = pad.strokes.length === 0;
    updateFilledCount();
  });
  undo.addEventListener("click", () => pad.undo());
  clear.addEventListener("click", () => pad.clear());

  return { root, pad };
}

function makeDrawingPad(canvas, onChange) {
  const context = canvas.getContext("2d", { alpha: true });
  const pad = {
    canvas,
    context,
    strokes: [],
    activeStroke: null,
    resizeObserver: null,
    usesWindowResize: false,
    resize,
    redraw,
    undo,
    clear,
    destroy
  };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    redraw();
  }

  function setStyle() {
    const size = canvas.getBoundingClientRect().width;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#263a36";
    context.lineWidth = Math.max(2.5, size * (course === "words" ? 0.01 : 0.017)) * (canvas.width / size);
  }

  function drawStroke(stroke) {
    if (!stroke.length) return;
    const width = canvas.width;
    const height = canvas.height;
    context.beginPath();
    context.moveTo(stroke[0].x * width, stroke[0].y * height);
    if (stroke.length === 1) {
      context.lineTo(stroke[0].x * width + 0.01, stroke[0].y * height + 0.01);
    } else {
      for (let index = 1; index < stroke.length - 1; index += 1) {
        const point = stroke[index];
        const next = stroke[index + 1];
        context.quadraticCurveTo(
          point.x * width,
          point.y * height,
          ((point.x + next.x) / 2) * width,
          ((point.y + next.y) / 2) * height
        );
      }
      const last = stroke[stroke.length - 1];
      context.lineTo(last.x * width, last.y * height);
    }
    context.stroke();
  }

  function redraw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    setStyle();
    pad.strokes.forEach(drawStroke);
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }

  function pointerDown(event) {
    if (sessionCompleted || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    pad.activeStroke = [pointFromEvent(event)];
    pad.strokes.push(pad.activeStroke);
    redraw();
  }

  function pointerMove(event) {
    if (!pad.activeStroke || !canvas.hasPointerCapture(event.pointerId)) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    const previous = pad.activeStroke[pad.activeStroke.length - 1];
    if (Math.hypot(point.x - previous.x, point.y - previous.y) < 0.003) return;
    pad.activeStroke.push(point);
    redraw();
  }

  function pointerEnd(event) {
    if (!pad.activeStroke) return;
    event.preventDefault();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pad.activeStroke = null;
    onChange();
  }

  function undo() {
    if (sessionCompleted || !pad.strokes.length) return;
    pad.strokes.pop();
    redraw();
    onChange();
  }

  function clear() {
    if (sessionCompleted || !pad.strokes.length) return;
    pad.strokes = [];
    redraw();
    onChange();
  }

  function destroy() {
    pad.resizeObserver?.disconnect();
    if (pad.usesWindowResize) window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerEnd);
    canvas.removeEventListener("pointercancel", pointerEnd);
  }

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);
  if ("ResizeObserver" in window) {
    pad.resizeObserver = new ResizeObserver(resize);
    pad.resizeObserver.observe(canvas);
  } else {
    pad.usesWindowResize = true;
    window.addEventListener("resize", resize, { passive: true });
  }
  return pad;
}

function updateFilledCount() {
  const filled = pads.filter((pad) => pad.strokes.length > 0).length;
  const total = getTotalCells();
  elements.filledCount.textContent = `第 ${activeCellIndex + 1} / ${total} 格`;
  if (sessionCompleted) return;
  const isLast = activeCellIndex === total - 1;
  elements.completeButton.textContent = isLast ? "完成練習" : "下一格";
  elements.completeButton.disabled = isLast ? filled !== total : pads[activeCellIndex].strokes.length === 0;
  elements.previousCell.disabled = activeCellIndex === 0;
  elements.completionTitle.textContent = isLast ? "最後一格，寫完就完成" : "寫完這一格，再換下一格";
  elements.completionCopy.textContent = isLast
    ? `已寫 ${filled} / ${total} 格。若有空格，請返回補寫。`
    : "寫好後可以先復原或清除，再按下一格。";
}

function showActiveCell() {
  [...elements.practiceGrid.children].forEach((cell, index) => { cell.hidden = index !== activeCellIndex; });
  pads[activeCellIndex].resize();
  updateFilledCount();
}

function advanceCell() {
  if (sessionCompleted || elements.completeButton.disabled) return;
  if (activeCellIndex === pads.length - 1) {
    completePractice();
  } else {
    activeCellIndex += 1;
    showActiveCell();
    elements.practiceGrid.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function previousCell() {
  if (activeCellIndex === 0 || sessionCompleted) return;
  activeCellIndex -= 1;
  showActiveCell();
}

function resetCompletionUI() {
  const total = getTotalCells();
  elements.completionPanel.classList.remove("completion-panel--done");
  elements.nextActions.hidden = true;
  activeCellIndex = 0;
  showActiveCell();
}

function resetAllPads({ confirmFirst = false } = {}) {
  const hasInk = pads.some((pad) => pad.strokes.length > 0);
  if (confirmFirst && hasInk && !window.confirm("要清除這一頁的全部筆跡嗎？")) return;
  pads.forEach((pad) => {
    pad.strokes = [];
    pad.redraw();
  });
  sessionCompleted = false;
  resetCompletionUI();
  elements.practiceGrid.querySelectorAll(".cell-tools button").forEach((button) => { button.disabled = true; });
}

function completePractice() {
  if (sessionCompleted || pads.some((pad) => pad.strokes.length === 0)) return;
  sessionCompleted = true;
  const entry = getItemProgress(currentItem.character);
  entry.count = (entry.count || 0) + 1;
  entry.written = (entry.written || 0) + pads.length;
  entry.lastPracticed = new Date().toISOString();
  const today = localDateKey();
  progress.activity[today] = validCount(progress.activity[today]) + 1;
  saveProgress();

  elements.practiceCount.textContent = `已寫 ${entry.written} 次`;
  elements.completeButton.disabled = true;
  elements.completeButton.textContent = "已完成";
  elements.previousCell.disabled = true;
  elements.completionPanel.classList.add("completion-panel--done");
  elements.completionTitle.textContent = "完成一次練習！";
  elements.completionCopy.textContent = `筆跡不會上傳或保存；你可以再寫一遍，或繼續下一個${course === "words" ? "單詞" : "字"}。`;
  elements.nextActions.hidden = false;
  showToast("已記錄這次練習");
  elements.nextActions.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function goToNextItem() {
  const previous = currentItem.character;
  if (practiceMode.type === "random") {
    currentItem = chooseRandomItem(previous);
  } else if (practiceMode.type === "word-group") {
    const group = WORD_GROUPS.find((item) => item.id === practiceMode.groupId);
    practiceMode.index = (practiceMode.index + 1) % group.words.length;
    currentItem = getItems().find((item) => item.character === group.words[practiceMode.index][0]);
  } else {
    const row = getRows().find((item) => item.id === practiceMode.rowId) || getRows()[0];
    practiceMode.index = (practiceMode.index + 1) % row.kana.length;
    currentItem = getItems().find((item) => item.character === row.kana[practiceMode.index][0]);
  }
  buildPracticePage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStatus(status) {
  const entry = getItemProgress(currentItem.character);
  entry.status = status;
  saveProgress();
  updateStatusButtons();
  showToast(status === "mastered" ? "已標記為「我會了」" : "已加入「再練」");
}

function updateStatusButtons() {
  const status = progress[course][currentItem.character]?.status;
  elements.markReview.setAttribute("aria-pressed", String(status === "review"));
  elements.markMastered.setAttribute("aria-pressed", String(status === "mastered"));
}

function stopPronunciation() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  elements.speakButton.querySelector("small").textContent = "聽讀音";
}

function speakWithDeviceVoice() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    showToast("讀音無法播放，請重新整理後再試。");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentItem.character);
  utterance.lang = "ja-JP";
  utterance.rate = 0.72;
  const japaneseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ja"));
  if (japaneseVoice) utterance.voice = japaneseVoice;
  utterance.onerror = () => showToast("目前無法播放日文讀音，請檢查手機的語音設定。");
  window.speechSynthesis.speak(utterance);
}

function speakCurrentItem() {
  stopPronunciation();
  const path = course === "words" ? currentItem.audioPath : `audio/kana/${currentItem.romaji}.mp3`;
  const audio = new Audio(path);
  activeAudio = audio;
  audio.preload = "auto";
  let fellBack = false;
  const fallback = () => {
    if (fellBack || activeAudio !== audio) return;
    fellBack = true;
    stopPronunciation();
    showToast("讀音檔暫時無法播放，改用裝置語音。");
    speakWithDeviceVoice();
  };
  audio.addEventListener("playing", () => {
    if (activeAudio === audio) elements.speakButton.querySelector("small").textContent = "播放中";
  });
  audio.addEventListener("ended", () => {
    if (activeAudio === audio) stopPronunciation();
  });
  audio.addEventListener("error", fallback);
  audio.play().catch(fallback);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("toast--show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("toast--show"), 2600);
}

function openHelp() {
  if (typeof elements.helpDialog.showModal === "function") {
    elements.helpDialog.showModal();
  } else {
    window.alert("iPhone：在 Safari 點分享，再選加入主畫面。\nAndroid：在 Chrome 選單點安裝應用程式或加到主畫面。");
  }
}

elements.randomPractice.addEventListener("click", startRandomPractice);
elements.backButton.addEventListener("click", () => history.back());
elements.catalogBack.addEventListener("click", () => history.back());
elements.resetPageTop.addEventListener("click", () => resetAllPads({ confirmFirst: true }));
elements.markReview.addEventListener("click", () => setStatus("review"));
elements.markMastered.addEventListener("click", () => setStatus("mastered"));
elements.speakButton.addEventListener("click", speakCurrentItem);
elements.completeButton.addEventListener("click", advanceCell);
elements.previousCell.addEventListener("click", previousCell);
elements.repeatButton.addEventListener("click", () => {
  resetAllPads();
  elements.practiceGrid.scrollIntoView({ behavior: "smooth", block: "start" });
});
elements.nextButton.addEventListener("click", goToNextItem);
elements.helpButton.addEventListener("click", openHelp);

window.addEventListener("popstate", () => {
  if (["#hiragana", "#katakana", "#words"].includes(location.hash)) {
    course = location.hash.slice(1);
    showCatalog({ fromHistory: true });
  } else {
    showHome({ fromHistory: true });
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.hidden = false;
});

elements.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  elements.installButton.hidden = true;
  elements.helpDialog.close();
});

window.addEventListener("appinstalled", () => showToast("假名手帖已安裝完成"));

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      showToast("離線功能暫時無法啟用，但仍可在線上使用。");
    });
  });
}

renderHome();
if (["#hiragana", "#katakana", "#words"].includes(location.hash)) {
  openCatalog(location.hash.slice(1), { fromHistory: true });
} else if (location.hash.startsWith("#practice-")) {
  history.replaceState({ view: "home" }, "", location.pathname);
}

window.__KANA_NOTEBOOK__ = Object.freeze({
  rows: KANA_ROWS,
  allKana: ALL_KANA,
  katakana: ALL_KATAKANA,
  words: ALL_WORDS,
  storageKey: STORAGE_KEY
});
