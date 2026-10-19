"use strict";

const QUICK_SCENES = [
  { id: "classroom", name: "教室", icon: "🏫", color: "#4e8298", soft: "#e1f0f5", hint: "上課常聽到的字", terms: [
    ["せんせい", "sensei", "老師"], ["がくせい", "gakusei", "學生"],
    ["きょうかしょ", "kyoukasho", "教科書"], ["ノート", "nooto", "筆記本"], ["しゅくだい", "shukudai", "作業"]
  ] },
  { id: "hospital", name: "醫院", icon: "🏥", color: "#538c79", soft: "#e3f1e9", hint: "看診時會用到的字", terms: [
    ["びょういん", "byouin", "醫院"], ["いしゃ", "isha", "醫生"],
    ["かんごし", "kangoshi", "護理師"], ["くすり", "kusuri", "藥"], ["ねつ", "netsu", "發燒、熱度"]
  ] },
  { id: "station", name: "車站", icon: "🚉", color: "#8568a5", soft: "#eee7f4", hint: "搭車時會看到的字", terms: [
    ["えき", "eki", "車站"], ["きっぷ", "kippu", "車票"],
    ["でんしゃ", "densha", "電車"], ["のりば", "noriba", "乘車處"], ["かいさつ", "kaisatsu", "驗票閘口"]
  ] },
  { id: "store", name: "超商", icon: "🏪", color: "#b47b44", soft: "#f8edda", hint: "買東西時會用到的字", terms: [
    ["コンビニ", "konbini", "便利商店"], ["おにぎり", "onigiri", "飯糰"],
    ["おべんとう", "obentou", "便當"], ["ふくろ", "fukuro", "袋子"], ["レジ", "reji", "收銀台"]
  ] }
];

const quick = {
  select: document.querySelector("#quick-view"), play: document.querySelector("#quick-play-view"),
  list: document.querySelector("#scene-list"), sceneName: document.querySelector("#quick-scene-name"),
  sceneLabel: document.querySelector("#quick-scene-label"), position: document.querySelector("#quick-position"),
  meaning: document.querySelector("#quick-meaning"), word: document.querySelector("#quick-word"),
  typeForm: document.querySelector("#quick-type-form"), answer: document.querySelector("#quick-answer"),
  feedback: document.querySelector("#quick-feedback"), writeStage: document.querySelector("#quick-write-stage"),
  reading: document.querySelector("#quick-reading"), canvas: document.querySelector("#quick-canvas"),
  clear: document.querySelector("#quick-clear"), next: document.querySelector("#quick-next"),
  stage: document.querySelector("#quick-stage"), finish: document.querySelector("#quick-finish"),
  result: document.querySelector("#quick-result")
};

let quickScene = QUICK_SCENES[0];
let quickIndex = 0;
let quickCorrect = 0;
let quickStrokes = [];
let activeQuickStroke = null;

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
    quick.result.textContent = `${quickScene.terms.length} 題都已寫完，羅馬拼音答對 ${quickCorrect} 題。`;
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const [word, , meaning] = quickScene.terms[quickIndex];
  quick.stage.hidden = false;
  quick.finish.hidden = true;
  quick.typeForm.hidden = false;
  quick.writeStage.hidden = true;
  quick.sceneName.textContent = quickScene.name;
  quick.sceneLabel.textContent = `${quickScene.name}常用語`;
  quick.position.textContent = `${quickIndex + 1} / ${quickScene.terms.length}`;
  quick.meaning.textContent = meaning;
  quick.word.textContent = word;
  quick.answer.value = "";
  quick.feedback.textContent = "看著日文，試著打出讀音。";
  quick.feedback.classList.remove("quick-feedback--wrong");
  quick.next.textContent = quickIndex === quickScene.terms.length - 1 ? "完成情境" : "寫好了，下一題";
  quickStrokes = [];
  quick.next.disabled = true;
}

function normalizeRomaji(value) {
  return value.trim().toLowerCase().replace(/[\s'-]/g, "");
}

function showQuickWriting() {
  quick.reading.textContent = quickScene.terms[quickIndex][1];
  quick.typeForm.hidden = true;
  quick.writeStage.hidden = false;
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
quick.typeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const expected = quickScene.terms[quickIndex][1];
  if (normalizeRomaji(quick.answer.value) === normalizeRomaji(expected)) {
    quickCorrect += 1;
    showQuickWriting();
  } else {
    quick.feedback.textContent = "還差一點，再試一次；或點下方看答案。";
    quick.feedback.classList.add("quick-feedback--wrong");
    quick.answer.select();
  }
});
document.querySelector("#quick-reveal").addEventListener("click", showQuickWriting);
quick.clear.addEventListener("click", () => { quickStrokes = []; quick.next.disabled = true; redrawQuickCanvas(); });
quick.next.addEventListener("click", () => { if (!quick.next.disabled) { quickIndex += 1; renderQuickQuestion(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
document.querySelector("#quick-restart").addEventListener("click", () => startQuickScene(quickScene));
document.querySelector("#quick-scenes").addEventListener("click", () => showQuickSelect());

window.__QUICK_ROUTE__ = () => {
  const scene = QUICK_SCENES.find((item) => location.hash === `#quick-${item.id}`);
  if (scene) startQuickScene(scene, { fromHistory: true });
  else showQuickSelect({ fromHistory: true });
};
if (location.hash === "#quick" || location.hash.startsWith("#quick-")) window.__QUICK_ROUTE__();
