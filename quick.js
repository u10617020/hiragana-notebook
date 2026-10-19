"use strict";

const QUICK_SCENES = [
  { id: "classroom", name: "教室", icon: "🏫", color: "#4e8298", soft: "#e1f0f5", hint: "上課常聽到的字", terms: [
    ["せんせい", "sensei", "老師"], ["がくせい", "gakusei", "學生"],
    ["きょうかしょ", "kyoukasho", "教科書"], ["ノート", "nooto", "筆記本"], ["しゅくだい", "shukudai", "作業"]
  ], sentences: [
    ["{}、おはようございます。", "老師，早安。"], ["わたしは {}です。", "我是學生。"],
    ["{}を ひらいてください。", "請打開教科書。"], ["{}に かいてください。", "請寫在筆記本上。"],
    ["{}を だしてください。", "請交作業。"]
  ] },
  { id: "hospital", name: "醫院", icon: "🏥", color: "#538c79", soft: "#e3f1e9", hint: "看診時會用到的字", terms: [
    ["びょういん", "byouin", "醫院"], ["いしゃ", "isha", "醫生"],
    ["かんごし", "kangoshi", "護理師"], ["くすり", "kusuri", "藥"], ["ねつ", "netsu", "發燒、熱度"]
  ], sentences: [
    ["ここは {}です。", "這裡是醫院。"], ["あのひとは {}です。", "那個人是醫生。"],
    ["こちらは {}です。", "這位是護理師。"], ["この {}を のんでください。", "請服用這個藥。"],
    ["きょうは {}が あります。", "今天有發燒。"]
  ] },
  { id: "station", name: "車站", icon: "🚉", color: "#8568a5", soft: "#eee7f4", hint: "搭車時會看到的字", terms: [
    ["えき", "eki", "車站"], ["きっぷ", "kippu", "車票"],
    ["でんしゃ", "densha", "電車"], ["のりば", "noriba", "乘車處"], ["かいさつ", "kaisatsu", "驗票閘口"]
  ], sentences: [
    ["{}は どこですか。", "車站在哪裡？"], ["この {}を ください。", "請給我這張車票。"],
    ["つぎの {}は なんじですか。", "下一班電車是幾點？"], ["{}は どこですか。", "乘車處在哪裡？"],
    ["{}を とおってください。", "請通過驗票閘口。"]
  ] },
  { id: "store", name: "超商", icon: "🏪", color: "#b47b44", soft: "#f8edda", hint: "買東西時會用到的字", terms: [
    ["コンビニ", "konbini", "便利商店"], ["おにぎり", "onigiri", "飯糰"],
    ["おべんとう", "obentou", "便當"], ["ふくろ", "fukuro", "袋子"], ["レジ", "reji", "收銀台"]
  ], sentences: [
    ["{}は どこですか。", "便利商店在哪裡？"], ["{}を ひとつ ください。", "請給我一個飯糰。"],
    ["{}を あたためてください。", "請幫我加熱便當。"], ["{}は いりません。", "我不需要袋子。"],
    ["{}は どこですか。", "收銀台在哪裡？"]
  ] }
];

const quick = {
  select: document.querySelector("#quick-view"), play: document.querySelector("#quick-play-view"),
  list: document.querySelector("#scene-list"), sceneName: document.querySelector("#quick-scene-name"),
  sceneLabel: document.querySelector("#quick-scene-label"), position: document.querySelector("#quick-position"),
  instruction: document.querySelector("#quick-instruction"), prompts: document.querySelector("#quick-prompts"),
  typeForm: document.querySelector("#quick-type-form"),
  feedback: document.querySelector("#quick-feedback"), writeStage: document.querySelector("#quick-write-stage"),
  fullSentence: document.querySelector("#quick-full-sentence"), reading: document.querySelector("#quick-reading"), canvas: document.querySelector("#quick-canvas"),
  clear: document.querySelector("#quick-clear"), next: document.querySelector("#quick-next"),
  stage: document.querySelector("#quick-stage"), finish: document.querySelector("#quick-finish"),
  result: document.querySelector("#quick-result")
};

let quickScene = QUICK_SCENES[0];
let quickMode = "sentence";
let quickIndex = 0;
let quickCorrect = 0;
let quickSolved = new Set();
let quickStrokes = [];
let activeQuickStroke = null;
let quickAudioContext = null;

QUICK_SCENES.forEach((scene) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "scene-card";
  card.style.setProperty("--scene-color", scene.color);
  card.style.setProperty("--scene-soft", scene.soft);
  card.innerHTML = '<span class="scene-card__icon" aria-hidden="true"></span><span><strong></strong><small></small></span><span aria-hidden="true">›</span>';
  card.querySelector(".scene-card__icon").textContent = scene.icon;
  card.querySelector("strong").textContent = scene.name;
  card.querySelector("small").textContent = `${scene.hint} · ${scene.terms.length} 題`;
  card.addEventListener("click", () => startQuickScene(scene));
  quick.list.append(card);
});

function showQuickSelect({ fromHistory = false } = {}) {
  stopPronunciation();
  pads.forEach((pad) => pad.destroy());
  pads = [];
  elements.homeView.hidden = true;
  elements.catalogView.hidden = true;
  elements.practiceView.hidden = true;
  quick.play.hidden = true;
  quick.select.hidden = false;
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!fromHistory) history.pushState({ view: "quick" }, "", "#quick");
}

function startQuickScene(scene, { fromHistory = false } = {}) {
  quickScene = scene;
  quickIndex = 0;
  quickCorrect = 0;
  quickSolved = new Set();
  quick.play.style.setProperty("--scene-color", scene.color);
  quick.play.style.setProperty("--scene-soft", scene.soft);
  elements.homeView.hidden = true;
  elements.catalogView.hidden = true;
  elements.practiceView.hidden = true;
  quick.select.hidden = true;
  quick.play.hidden = false;
  renderQuickQuestion();
  window.scrollTo({ top: 0, behavior: "auto" });
  if (!fromHistory) history.pushState({ view: "quick-play", scene: scene.id }, "", `#quick-${scene.id}`);
}

function renderQuickQuestion() {
  if (quickIndex === quickScene.terms.length) {
    quick.stage.hidden = true;
    quick.finish.hidden = false;
    quick.result.textContent = `${quickScene.terms.length} 個空格都已練習並手寫，答對 ${quickCorrect} 個。`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  quick.stage.hidden = false;
  quick.finish.hidden = true;
  quick.typeForm.hidden = false;
  quick.writeStage.hidden = true;
  quick.sceneName.textContent = quickScene.name;
  quick.sceneLabel.textContent = `${quickScene.name}填空`;
  quick.position.textContent = quickMode === "passage" ? `整段 · ${quickScene.terms.length} 格` : `${quickIndex + 1} / ${quickScene.terms.length}`;
  quick.instruction.textContent = quickMode === "passage" ? "讀完整段情境，用羅馬拼音填入每個空格。" : "依照中文提示，用羅馬拼音填入空格。";
  renderQuickPrompts();
  quick.feedback.textContent = "填入空格後按「檢查答案」。";
  quick.feedback.classList.remove("quick-feedback--wrong");
  quick.next.textContent = quickIndex === quickScene.terms.length - 1 ? "完成情境" : "寫好了，下一題";
  quickStrokes = [];
  quick.next.disabled = true;
}

function renderQuickPrompts() {
  quick.prompts.replaceChildren();
  quick.prompts.classList.toggle("quick-prompts--passage", quickMode === "passage");
  const indexes = quickMode === "passage" ? quickScene.terms.map((_, index) => index) : [quickIndex];
  indexes.forEach((index) => {
    const [before, after] = quickScene.sentences[index][0].split("{}");
    const line = document.createElement("div");
    line.className = "quick-prompt";
    const sentence = document.createElement("p");
    sentence.className = "quick-prompt__japanese";
    sentence.append(document.createTextNode(before));
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "latin";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.placeholder = "拼音";
    input.dataset.index = index;
    input.setAttribute("aria-label", `${quickScene.name}第 ${index + 1} 格：${quickScene.sentences[index][1]}`);
    input.disabled = quickSolved.has(index);
    if (input.disabled) input.value = quickScene.terms[index][1];
    sentence.append(input, document.createTextNode(after));
    const translation = document.createElement("p");
    translation.className = "quick-prompt__translation";
    translation.textContent = quickScene.sentences[index][1];
    line.append(sentence);
    if (quickMode === "sentence") line.append(translation);
    quick.prompts.append(line);
  });
  if (quickMode === "passage") {
    const translation = document.createElement("p");
    translation.className = "quick-passage__translation";
    translation.textContent = quickScene.sentences.map((sentence) => sentence[1]).join(" ");
    quick.prompts.append(translation);
  }
}

function normalizeRomaji(value) {
  return value.trim().toLowerCase().replace(/[\s'-]/g, "");
}

function playCorrectSound() {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;
  try {
    quickAudioContext ||= new AudioContextType();
    if (quickAudioContext.state === "suspended") quickAudioContext.resume().catch(() => {});
    const start = quickAudioContext.currentTime;
    [[659.25, 0], [880, 0.11]].forEach(([frequency, delay]) => {
      const oscillator = quickAudioContext.createOscillator();
      const volume = quickAudioContext.createGain();
      const time = start + delay;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(0.0001, time);
      volume.gain.exponentialRampToValueAtTime(0.08, time + 0.015);
      volume.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
      oscillator.connect(volume).connect(quickAudioContext.destination);
      oscillator.start(time);
      oscillator.stop(time + 0.21);
    });
  } catch {
    // Audio is optional; answering and writing still work if the device blocks sound.
  }
}

function showQuickWriting() {
  const [before, after] = quickScene.sentences[quickIndex][0].split("{}");
  quick.fullSentence.textContent = before + quickScene.terms[quickIndex][0] + after;
  quick.reading.textContent = quickScene.terms[quickIndex][1];
  quick.instruction.textContent = "答案已揭曉，現在動手寫。";
  quick.position.textContent = `手寫 ${quickIndex + 1} / ${quickScene.terms.length}`;
  quick.typeForm.hidden = true;
  quick.writeStage.hidden = false;
  quickStrokes = [];
  quick.next.disabled = true;
  quick.next.textContent = quickIndex === quickScene.terms.length - 1 ? "完成情境" : "寫好了，下一題";
  resizeQuickCanvas();
  quick.writeStage.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function resizeQuickCanvas() {
  const rect = quick.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  quick.canvas.width = Math.round(rect.width * ratio);
  quick.canvas.height = Math.round(rect.height * ratio);
  redrawQuickCanvas();
}

function redrawQuickCanvas() {
  const rect = quick.canvas.getBoundingClientRect();
  const context = quick.canvas.getContext("2d");
  context.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.strokeStyle = "#263a36";
  context.lineWidth = 2.8;
  context.lineCap = "round";
  context.lineJoin = "round";
  quickStrokes.forEach((stroke) => {
    if (stroke.length < 2) return;
    context.beginPath();
    stroke.forEach((point, index) => index ? context.lineTo(point.x * rect.width, point.y * rect.height) : context.moveTo(point.x * rect.width, point.y * rect.height));
    context.stroke();
  });
}

function quickPoint(event) {
  const rect = quick.canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
}

quick.canvas.addEventListener("pointerdown", (event) => {
  if (quick.writeStage.hidden) return;
  event.preventDefault();
  quick.canvas.setPointerCapture(event.pointerId);
  activeQuickStroke = [quickPoint(event)];
  quickStrokes.push(activeQuickStroke);
});
quick.canvas.addEventListener("pointermove", (event) => {
  if (!activeQuickStroke) return;
  event.preventDefault();
  activeQuickStroke.push(quickPoint(event));
  redrawQuickCanvas();
});
for (const type of ["pointerup", "pointercancel"]) {
  quick.canvas.addEventListener(type, (event) => {
    if (!activeQuickStroke) return;
    event.preventDefault();
    if (quick.canvas.hasPointerCapture(event.pointerId)) quick.canvas.releasePointerCapture(event.pointerId);
    if (activeQuickStroke.length < 2) quickStrokes.pop();
    activeQuickStroke = null;
    quick.next.disabled = !quickStrokes.length;
  });
}
window.addEventListener("resize", resizeQuickCanvas);

document.querySelector("#quick-open").addEventListener("click", () => showQuickSelect());
document.querySelector("#quick-back").addEventListener("click", () => showHome());
document.querySelector("#quick-play-back").addEventListener("click", () => showQuickSelect());
for (const mode of ["sentence", "passage"]) {
  document.querySelector(`#quick-mode-${mode}`).addEventListener("click", () => {
    quickMode = mode;
    for (const option of ["sentence", "passage"]) {
      const button = document.querySelector(`#quick-mode-${option}`);
      button.classList.toggle("is-active", option === mode);
      button.setAttribute("aria-pressed", String(option === mode));
    }
  });
}
quick.typeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  let newlyCorrect = 0;
  let firstWrong = null;
  quick.prompts.querySelectorAll("input").forEach((input) => {
    const index = Number(input.dataset.index);
    if (quickSolved.has(index)) return;
    const correct = normalizeRomaji(input.value) === normalizeRomaji(quickScene.terms[index][1]);
    input.classList.toggle("is-wrong", !correct);
    if (correct) {
      quickSolved.add(index);
      quickCorrect += 1;
      newlyCorrect += 1;
      input.disabled = true;
    } else if (!firstWrong) {
      firstWrong = input;
    }
  });
  if (newlyCorrect) playCorrectSound();
  const remaining = [...quick.prompts.querySelectorAll("input")].filter((input) => !quickSolved.has(Number(input.dataset.index))).length;
  if (remaining === 0) {
    if (quickMode === "passage") quickIndex = 0;
    showQuickWriting();
  } else {
    quick.feedback.textContent = `還有 ${remaining} 格，再試一次；也可以看答案。`;
    quick.feedback.classList.add("quick-feedback--wrong");
    if (firstWrong) firstWrong.focus();
  }
});
document.querySelector("#quick-reveal").addEventListener("click", showQuickWriting);
quick.clear.addEventListener("click", () => { quickStrokes = []; quick.next.disabled = true; redrawQuickCanvas(); });
quick.next.addEventListener("click", () => {
  if (quick.next.disabled) return;
  quickIndex += 1;
  if (quickMode === "passage" && quickIndex < quickScene.terms.length) showQuickWriting();
  else renderQuickQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
document.querySelector("#quick-restart").addEventListener("click", () => startQuickScene(quickScene));
document.querySelector("#quick-scenes").addEventListener("click", () => showQuickSelect());

window.__QUICK_ROUTE__ = () => {
  const scene = QUICK_SCENES.find((item) => location.hash === `#quick-${item.id}`);
  if (scene) startQuickScene(scene, { fromHistory: true });
  else showQuickSelect({ fromHistory: true });
};
if (location.hash === "#quick" || location.hash.startsWith("#quick-")) window.__QUICK_ROUTE__();
