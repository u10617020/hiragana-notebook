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

const STORAGE_KEY = "hiragana-copybook:v1";
const STORAGE_VERSION = 1;
const TRACE_CELLS = 3;
const TOTAL_CELLS = 8;

const elements = {
  homeView: document.querySelector("#home-view"),
  practiceView: document.querySelector("#practice-view"),
  rowList: document.querySelector("#row-list"),
  masteredCount: document.querySelector("#mastered-count"),
  progressPercent: document.querySelector("#progress-percent"),
  progressRing: document.querySelector("#progress-ring"),
  randomPractice: document.querySelector("#random-practice"),
  backButton: document.querySelector("#back-button"),
  resetPageTop: document.querySelector("#reset-page-top"),
  modeLabel: document.querySelector("#mode-label"),
  positionLabel: document.querySelector("#position-label"),
  practiceKana: document.querySelector("#practice-kana"),
  practiceRomaji: document.querySelector("#practice-romaji"),
  practiceCount: document.querySelector("#practice-count"),
  speakButton: document.querySelector("#speak-button"),
  markReview: document.querySelector("#mark-review"),
  markMastered: document.querySelector("#mark-mastered"),
  practiceGrid: document.querySelector("#practice-grid"),
  filledCount: document.querySelector("#filled-count"),
  completionPanel: document.querySelector("#completion-panel"),
  completionTitle: document.querySelector("#completion-title"),
  completionCopy: document.querySelector("#completion-copy"),
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
let currentKana = ALL_KANA[0];
let practiceMode = { type: "row", rowId: "a", index: 0 };
let pads = [];
let sessionCompleted = false;
let deferredInstallPrompt = null;
let toastTimer = 0;

function defaultProgress() {
  return { version: STORAGE_VERSION, kana: {} };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return defaultProgress();

    const migrated = defaultProgress();
    const sourceKana = saved.kana && typeof saved.kana === "object" ? saved.kana : {};
    ALL_KANA.forEach(({ character }) => {
      const source = sourceKana[character];
      if (!source || typeof source !== "object") return;
      const entry = {};
      if (source.status === "mastered" || source.status === "review") entry.status = source.status;
      entry.count = Number.isFinite(source.count) && source.count > 0 ? Math.floor(source.count) : 0;
      if (typeof source.lastPracticed === "string") entry.lastPracticed = source.lastPracticed;
      migrated.kana[character] = entry;
    });
    return migrated;
  } catch {
    return defaultProgress();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    showToast("無法儲存進度，請確認瀏覽器沒有封鎖本機儲存。");
  }
}

function getKanaProgress(character) {
  if (!progress.kana[character]) progress.kana[character] = { count: 0 };
  return progress.kana[character];
}

function renderHome() {
  elements.rowList.replaceChildren();

  KANA_ROWS.forEach((row) => {
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
      const status = progress.kana[character]?.status;
      if (status) button.dataset.status = status;
      button.addEventListener("click", () => startRowPractice(row.id, index));
      characters.append(button);
    });

    article.append(title, characters);
    elements.rowList.append(article);
  });

  const mastered = ALL_KANA.filter(({ character }) => progress.kana[character]?.status === "mastered").length;
  const percent = Math.round((mastered / ALL_KANA.length) * 100);
  elements.masteredCount.textContent = mastered;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressRing.style.setProperty("--progress", `${percent * 3.6}deg`);
}

function startRowPractice(rowId, index = 0) {
  const row = KANA_ROWS.find((item) => item.id === rowId) || KANA_ROWS[0];
  const safeIndex = Math.max(0, Math.min(index, row.kana.length - 1));
  practiceMode = { type: "row", rowId: row.id, index: safeIndex };
  setCurrentKana(row.kana[safeIndex][0]);
  showPractice();
}

function startRandomPractice() {
  practiceMode = { type: "random" };
  currentKana = chooseRandomKana(null);
  buildPracticePage();
  showPractice();
}

function chooseRandomKana(previousCharacter) {
  const candidates = ALL_KANA.filter(({ character }) => character !== previousCharacter || ALL_KANA.length === 1);
  const weighted = candidates.map((item) => {
    const status = progress.kana[item.character]?.status;
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

function setCurrentKana(character) {
  currentKana = ALL_KANA.find((item) => item.character === character) || ALL_KANA[0];
  buildPracticePage();
}

function showPractice() {
  elements.homeView.hidden = true;
  elements.practiceView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!history.state?.practice) history.pushState({ practice: true }, "", "#practice");
}

function showHome({ fromHistory = false } = {}) {
  pads.forEach((pad) => pad.destroy());
  pads = [];
  renderHome();
  elements.practiceView.hidden = true;
  elements.homeView.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!fromHistory && history.state?.practice) history.back();
}

function buildPracticePage() {
  pads.forEach((pad) => pad.destroy());
  pads = [];
  sessionCompleted = false;

  elements.practiceKana.textContent = currentKana.character;
  elements.practiceRomaji.textContent = currentKana.romaji;
  const entry = getKanaProgress(currentKana.character);
  elements.practiceCount.textContent = `練習 ${entry.count || 0} 次`;

  if (practiceMode.type === "random") {
    elements.modeLabel.textContent = "隨機複習";
    elements.positionLabel.textContent = "混合 46 音";
  } else {
    const row = KANA_ROWS.find((item) => item.id === practiceMode.rowId) || KANA_ROWS[0];
    elements.modeLabel.textContent = `${row.label}練習`;
    elements.positionLabel.textContent = `${practiceMode.index + 1} / ${row.kana.length}`;
  }

  elements.practiceGrid.replaceChildren();
  for (let index = 0; index < TOTAL_CELLS; index += 1) {
    const cell = createPracticeCell(index, index < TRACE_CELLS);
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
  if (isTrace) {
    const guide = document.createElement("span");
    guide.className = "trace-character";
    guide.textContent = currentKana.character;
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
    context.lineWidth = Math.max(5, size * 0.045) * (canvas.width / size);
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
  elements.filledCount.textContent = `${filled} / ${TOTAL_CELLS} 格`;
  elements.completeButton.disabled = filled !== TOTAL_CELLS || sessionCompleted;
}

function resetCompletionUI() {
  elements.filledCount.textContent = `0 / ${TOTAL_CELLS} 格`;
  elements.completeButton.disabled = true;
  elements.completeButton.textContent = "完成練習";
  elements.completionPanel.classList.remove("completion-panel--done");
  elements.completionTitle.textContent = "寫滿 8 格就完成這次練習";
  elements.completionCopy.textContent = "每一格至少寫一筆，完成按鈕就會亮起。";
  elements.nextActions.hidden = true;
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
  updateFilledCount();
  elements.practiceGrid.querySelectorAll(".cell-tools button").forEach((button) => { button.disabled = true; });
}

function completePractice() {
  if (sessionCompleted || pads.some((pad) => pad.strokes.length === 0)) return;
  sessionCompleted = true;
  const entry = getKanaProgress(currentKana.character);
  entry.count = (entry.count || 0) + 1;
  entry.lastPracticed = new Date().toISOString();
  saveProgress();

  elements.practiceCount.textContent = `練習 ${entry.count} 次`;
  elements.completeButton.disabled = true;
  elements.completeButton.textContent = "已完成";
  elements.completionPanel.classList.add("completion-panel--done");
  elements.completionTitle.textContent = "完成一次練習！";
  elements.completionCopy.textContent = "筆跡不會上傳或保存；你可以再寫一遍，或繼續下一個字。";
  elements.nextActions.hidden = false;
  showToast("已記錄這次練習");
  elements.nextActions.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function goToNextKana() {
  const previous = currentKana.character;
  if (practiceMode.type === "random") {
    currentKana = chooseRandomKana(previous);
  } else {
    const row = KANA_ROWS.find((item) => item.id === practiceMode.rowId) || KANA_ROWS[0];
    practiceMode.index = (practiceMode.index + 1) % row.kana.length;
    currentKana = ALL_KANA.find((item) => item.character === row.kana[practiceMode.index][0]);
  }
  buildPracticePage();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setStatus(status) {
  const entry = getKanaProgress(currentKana.character);
  entry.status = status;
  saveProgress();
  updateStatusButtons();
  showToast(status === "mastered" ? "已標記為「我會了」" : "已加入「再練」");
}

function updateStatusButtons() {
  const status = progress.kana[currentKana.character]?.status;
  elements.markReview.setAttribute("aria-pressed", String(status === "review"));
  elements.markMastered.setAttribute("aria-pressed", String(status === "mastered"));
}

function speakCurrentKana() {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    showToast("這個瀏覽器沒有提供語音朗讀功能。");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentKana.character);
  utterance.lang = "ja-JP";
  utterance.rate = 0.72;
  const japaneseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ja"));
  if (japaneseVoice) utterance.voice = japaneseVoice;
  utterance.onerror = () => showToast("目前無法播放日文讀音，請檢查手機的語音設定。");
  window.speechSynthesis.speak(utterance);
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
elements.backButton.addEventListener("click", () => showHome());
elements.resetPageTop.addEventListener("click", () => resetAllPads({ confirmFirst: true }));
elements.markReview.addEventListener("click", () => setStatus("review"));
elements.markMastered.addEventListener("click", () => setStatus("mastered"));
elements.speakButton.addEventListener("click", speakCurrentKana);
elements.completeButton.addEventListener("click", completePractice);
elements.repeatButton.addEventListener("click", () => {
  resetAllPads();
  elements.practiceGrid.scrollIntoView({ behavior: "smooth", block: "start" });
});
elements.nextButton.addEventListener("click", goToNextKana);
elements.helpButton.addEventListener("click", openHelp);

window.addEventListener("popstate", () => {
  if (location.hash === "#practice") return;
  showHome({ fromHistory: true });
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

window.__KANA_NOTEBOOK__ = Object.freeze({
  rows: KANA_ROWS,
  allKana: ALL_KANA,
  storageKey: STORAGE_KEY
});
