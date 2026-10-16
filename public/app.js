const $ = (s) => document.querySelector(s);
const canvas = $("#office"),
  c = canvas.getContext("2d");
const colors = [
  "#bca2fa",
  "#7bc9e8",
  "#9ad7b0",
  "#edb482",
  "#ed9cbb",
  "#e0d58e",
  "#94b2f3",
  "#c5c9de",
];
const statusColors = {
  thinking: "#bca2fa",
  tool: "#7bc9e8",
  waiting: "#f2c775",
  done: "#9ad7b0",
  error: "#ee929d",
  blocked: "#ee929d",
  idle: "#91a0b7",
  paused: "#91a0b7",
};
const dictionary = {
  en: {
    eyebrow: "A LITTLE PLACE FOR BIG IDEAS",
    title: "Your agents. At work.",
    subtitle: "A living office, powered by what your agents actually do.",
    localtime: "LOCAL TIME",
    agents: "Coworkers",
    active: "On a task",
    waiting: "Need you",
    completed: "Turns finished",
    floor: "The studio",
    links: "Team links",
    focus: "Focus view",
    exitFocus: "Exit focus",
    thinking: "Thinking",
    tool: "Using tools",
    approval: "Approval",
    done: "Done",
    error: "Error / blocked",
    idle: "Idle",
    paused: "Paused",
    blocked: "Blocked",
    selectHint: "Click a coworker to say hello ↗",
    coworkers: "Coworkers",
    selected: "AT A GLANCE",
    activity: "Around the office",
    activityHint: "Real events. No guesswork.",
    footer: "Tiny coworkers. Real work.",
    privacy: "Local only · No prompts or tool results collected",
    capture: "Save scene ↗",
    theme: "Daylight",
    night: "Midnight",
    emptyTitle: "The studio is ready.",
    emptyBody: "Start a task in Harness. Your first coworker will arrive here.",
    demoNotice: "DEMO · Simulated events for preview",
    connected: "Office connected",
    offline: "Reconnecting · last known state",
    connecting: "Connecting…",
    noAgents: "Waiting for the first coworker",
    noSelection: "Select a coworker to see their latest activity.",
    steps: "Steps",
    calls: "Tool calls",
    tokens: "Tokens",
    approvalHint:
      "Approval is handled in Harness. Open the original session to respond.",
    child: "Subagent",
    session: "Main session",
    noEvents: "Events will appear when an agent starts working.",
    saved: "Scene saved",
    reconnecting: "Disconnected · Scene shows last known state",
    capacity: "coworkers tracked",
    zone1: "FOCUS DESKS",
    zone2: "TOOL LAB",
    zone3: "YOUR APPROVAL",
    zone4: "TAKE A BREATHER",
    unknownTokens: "—",
  },
  zh: {
    eyebrow: "小小办公室，大大创造力",
    title: "你的 Agent，正在工作。",
    subtitle: "每个小人的动作，都来自 Agent 的真实活动。",
    localtime: "当地时间",
    agents: "办公室成员",
    active: "正在执行",
    waiting: "需要你处理",
    completed: "已完成回合",
    floor: "创作工作室",
    links: "团队连线",
    focus: "专注视图",
    exitFocus: "退出专注",
    thinking: "思考中",
    tool: "调用工具",
    approval: "等待审批",
    done: "已完成",
    error: "错误 / 受阻",
    idle: "空闲",
    paused: "已暂停",
    blocked: "受阻",
    selectHint: "点击小人，查看工作状态 ↗",
    coworkers: "办公室成员",
    selected: "成员近况",
    activity: "办公室动态",
    activityHint: "真实事件，清楚可见。",
    footer: "小小同事，认真工作。",
    privacy: "仅本机 · 不收集提示词或工具结果",
    capture: "保存场景 ↗",
    theme: "日光模式",
    night: "午夜模式",
    emptyTitle: "工作室准备好了。",
    emptyBody: "在 Harness 中开始一个任务，第一位同事就会来到这里。",
    demoNotice: "演示模式 · 当前事件为模拟数据",
    connected: "办公室已连接",
    offline: "正在重连 · 显示最后状态",
    connecting: "连接中…",
    noAgents: "等待第一位同事入驻",
    noSelection: "选择一位成员，查看最近活动。",
    steps: "思考步数",
    calls: "工具调用",
    tokens: "Token",
    approvalHint: "请回到 Harness 的原会话处理审批。",
    child: "子 Agent",
    session: "主会话",
    noEvents: "Agent 开始工作后，活动将显示在这里。",
    saved: "场景已保存",
    reconnecting: "连接已断开 · 场景显示最后已知状态",
    capacity: "位成员已追踪",
    zone1: "专注工位",
    zone2: "工具实验台",
    zone3: "等待你的审批",
    zone4: "休息一下",
    unknownTokens: "—",
  },
};
let lang =
  localStorage.getItem("office-lang") ||
  (navigator.language.startsWith("zh") ? "zh" : "en");
let theme = localStorage.getItem("office-theme") || "night";
let snapshot = { agents: [], events: [], totals: {}, mode: "live" };
let selected;
let connected = false;
let hasConnected = false;
let positions = new Map();
let toasts;
const t = (key) => dictionary[lang][key] || key;
const make = (tag, cls, text) => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
};
function color(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").style.opacity = 1;
  clearTimeout(toasts);
  toasts = setTimeout(() => ($("#toast").style.opacity = 0), 2600);
}
function translate() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.documentElement.dataset.theme = theme;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  $("#language").textContent = lang === "zh" ? "EN" : "中文";
  $("#theme").textContent = t(theme === "night" ? "theme" : "night");
  $("#focus").textContent = t(
    document.body.classList.contains("focus-mode") ? "exitFocus" : "focus",
  );
  render();
}
$("#language").onclick = () => {
  lang = lang === "zh" ? "en" : "zh";
  localStorage.setItem("office-lang", lang);
  translate();
};
$("#theme").onclick = () => {
  theme = theme === "night" ? "day" : "night";
  localStorage.setItem("office-theme", theme);
  translate();
};
$("#focus").onclick = () => {
  document.body.classList.toggle("focus-mode");
  $("#focus").textContent = t(
    document.body.classList.contains("focus-mode") ? "exitFocus" : "focus",
  );
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.body.classList.remove("focus-mode");
    $("#focus").textContent = t("focus");
  }
});
$("#capture").onclick = () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = make("a");
    a.href = url;
    a.download = `agent-office-${snapshot.mode}-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(t("saved"));
  });
};
function detail() {
  const node = $("#detail");
  node.replaceChildren();
  const a = snapshot.agents.find((a) => a.id === selected);
  if (!a) {
    node.append(make("p", "detail-copy", t("noSelection")));
    return;
  }
  node.append(
    make("h2", "detail-name", a.name),
    make(
      "p",
      "detail-copy",
      `${a.project} · ${t(a.role === "subagent" ? "child" : "session")}`,
    ),
  );
  const status = make("div", "detail-status");
  const dot = make("i", `status-dot ${a.status}`);
  dot.style.background = statusColors[a.status];
  status.append(dot, make("span", "", t(a.status)));
  node.append(status, make("p", "detail-copy", localizedDetail(a)));
  if (a.status === "waiting")
    node.append(make("p", "approval-hint", t("approvalHint")));
  const metrics = make("div", "detail-stats");
  for (const [key, value] of [
    ["steps", a.steps],
    ["calls", a.calls],
    [
      "tokens",
      a.tokens
        ? new Intl.NumberFormat(lang, { notation: "compact" }).format(a.tokens)
        : "—",
    ],
  ]) {
    const item = make("div");
    item.append(make("strong", "", value), make("small", "", t(key)));
    metrics.append(item);
  }
  node.append(metrics);
  const id = make("p", "detail-copy", `ID · ${a.id}`);
  id.title = a.id;
  node.append(id);
  if (a.parentId) {
    const parent = snapshot.agents.find((x) => x.id === a.parentId);
    node.append(
      make(
        "p",
        "detail-copy",
        `${lang === "zh" ? "来自" : "From"} · ${parent?.name || a.parentId}`,
      ),
    );
  }
}
function localizedDetail(a) {
  if (lang !== "zh") return a.detail;
  if (a.status === "tool") return a.detail;
  if (a.status === "waiting")
    return `等待审批 · ${a.detail.split("·").pop().trim()}`;
  return (
    {
      thinking: "正在推敲任务的下一步",
      done: "本回合已完成",
      idle: "准备接收下一个任务",
      paused: "会话已暂停或中断",
      blocked: "本回合受阻",
      error: "本回合发生错误",
    }[a.status] || a.detail
  );
}
function localizedEvent(e) {
  if (lang !== "zh") return e.text;
  const fixed = {
    "turn/start": "开始了一个新回合",
    "step/start": "正在思考下一步",
    "assistant/message": "已收到模型回复",
    "approval/asked": "正在 Harness 中等待你的审批",
  };
  if (fixed[e.type]) return fixed[e.type];
  return e.text
    .replace(/^Called /, "调用工具：")
    .replace(/ returned$/, " 已返回")
    .replace(/ failed$/, " 执行失败")
    .replace(/^Approval: /, "审批结果：")
    .replace("allowed-once", "本次允许")
    .replace("rejected", "已拒绝")
    .replace("cancelled", "已取消")
    .replace("unavailable", "无人处理")
    .replace("Turn complete", "本回合已完成")
    .replace("Turn ended: ", "回合结束：");
}
function render() {
  $("#connection").textContent = t(
    connected ? "connected" : hasConnected ? "offline" : "connecting",
  );
  $(".connection").classList.toggle("offline", !connected);
  $("#mode").textContent = snapshot.mode === "demo" ? "DEMO" : "LIVE";
  $("#demo-notice").hidden = snapshot.mode !== "demo";
  $("#empty").hidden = snapshot.agents.length > 0;
  for (const key of ["agents", "active", "waiting", "completed"])
    $(`#stat-${key}`).textContent = snapshot.totals[key] || 0;
  $("#roster-count").textContent = snapshot.agents.length;
  const roster = $("#roster");
  roster.replaceChildren();
  if (!snapshot.agents.length)
    roster.append(make("p", "detail-copy", t("noAgents")));
  for (const a of snapshot.agents) {
    const button = make("button", "coworker");
    button.setAttribute("aria-pressed", String(a.id === selected));
    button.onclick = () => {
      selected = a.id;
      render();
    };
    const avatar = make("span", "avatar", "▦");
    avatar.style.setProperty("--avatar", color(a.id));
    const info = make("span", "info");
    info.append(
      make("span", "name", a.name),
      make("small", "", `${t(a.status)} · ${a.project}`),
    );
    const dot = make("span", "status-dot");
    dot.style.background = statusColors[a.status];
    button.append(avatar, info, dot);
    roster.append(button);
  }
  detail();
  const feed = $("#feed");
  feed.replaceChildren();
  if (!snapshot.events.length)
    feed.append(make("p", "detail-copy", t("noEvents")));
  for (const e of snapshot.events.slice(0, 6)) {
    const item = make("div", "event");
    const dot = make("span", "status-dot");
    dot.style.background = color(e.agentId);
    dot.style.marginTop = "5px";
    const text = make("div");
    text.append(make("strong", "", e.name));
    const note = make("p", "", localizedEvent(e));
    note.title = note.textContent;
    text.append(note);
    const time = make(
      "time",
      "",
      new Date(e.time).toLocaleTimeString(lang, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
    item.append(dot, text, time);
    feed.append(item);
  }
}
const stream = new EventSource("/api/events");
stream.onopen = () => {
  connected = true;
  hasConnected = true;
  render();
};
stream.onerror = () => {
  connected = false;
  render();
};
stream.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (!Array.isArray(data.agents) || !Array.isArray(data.events)) return;
    snapshot = data;
    if (!snapshot.agents.some((a) => a.id === selected))
      selected = snapshot.agents[0]?.id;
    render();
  } catch {
    /* A malformed frame cannot break the renderer. */
  }
};
window.addEventListener("pagehide", () => stream.close());

// Original procedural pixel art. Logical canvas is fixed; the browser scales the
// whole scene consistently, including hit targets, on narrow screens.
function rect(x, y, w, h, fill) {
  c.fillStyle = fill;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function text(value, x, y, size = 12, fill = "#a5b3ce", align = "left") {
  c.fillStyle = fill;
  c.font = `${size}px "Segoe UI",sans-serif`;
  c.textAlign = align;
  c.fillText(value, x, y);
}
function line(x1, y1, x2, y2, stroke, width = 1) {
  c.strokeStyle = stroke;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}
function plant(x, y) {
  rect(x - 10, y + 9, 24, 17, "#916c6c");
  rect(x - 7, y + 9, 18, 4, "#bc8a7c");
  rect(x - 2, y - 20, 7, 31, "#51715f");
  rect(x - 20, y - 16, 20, 11, "#71a997");
  rect(x + 4, y - 28, 15, 14, "#8cbaa0");
  rect(x - 11, y - 32, 14, 16, "#66967d");
  rect(x + 5, y - 5, 19, 10, "#679883");
}
function desk(x, y, tint, lab = false) {
  rect(x + 7, y + 51, 146, 12, "#11192b66");
  rect(x + 7, y + 32, 7, 26, "#45415a");
  rect(x + 131, y + 32, 7, 26, "#45415a");
  rect(x, y, 145, 42, lab ? "#546d80" : "#927e87");
  rect(x, y, 145, 7, lab ? "#829dad" : "#b1a0a8");
  rect(x + 3, y + 37, 139, 7, lab ? "#354d65" : "#6b5c70");
  rect(x + 41, y - 29, 61, 37, "#1d293f");
  rect(x + 45, y - 25, 53, 29, "#36506b");
  rect(x + 50, y - 20, 28, 3, tint);
  rect(x + 50, y - 13, 41, 2, "#66849b");
  rect(x + 50, y - 7, 22, 2, "#66849b");
  rect(x + 65, y + 8, 12, 6, "#303b51");
  rect(x + 52, y + 13, 38, 4, "#303b51");
  rect(x + 39, y + 23, 60, 11, "#c4b4bc");
  rect(x + 43, y + 26, 50, 2, "#8f8299");
  rect(x + 113, y + 13, 12, 14, "#d1baa4");
  rect(x + 125, y + 16, 4, 7, "#a88a80");
}
function chair(x, y) {
  rect(x - 17, y - 7, 34, 21, "#515773");
  rect(x - 20, y - 11, 40, 12, "#747b9a");
  rect(x - 13, y + 13, 26, 8, "#3d445e");
  rect(x - 3, y + 21, 6, 13, "#414b64");
  rect(x - 18, y + 33, 36, 4, "#414b64");
}
function sofa(x, y) {
  rect(x, y + 14, 170, 53, "#54716e");
  rect(x + 7, y, 156, 42, "#73958c");
  rect(x + 10, y + 40, 73, 21, "#85a69b");
  rect(x + 88, y + 40, 73, 21, "#85a69b");
  rect(x - 5, y + 20, 16, 47, "#92ada1");
  rect(x + 160, y + 20, 16, 47, "#92ada1");
  rect(x + 10, y + 67, 7, 9, "#394b54");
  rect(x + 150, y + 67, 7, 9, "#394b54");
  rect(x + 118, y + 12, 28, 28, "#c9b69d");
}
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
function sprite(x, y, tint, status, now, walking) {
  const bob = reduced.matches
    ? 0
    : walking
      ? Math.sin(now / 90) * 2
      : ["thinking", "tool"].includes(status)
        ? Math.sin(now / 500)
        : 0;
  y += bob;
  c.fillStyle = "#0a102a55";
  c.beginPath();
  c.ellipse(x, y + 26, 20, 7, 0, 0, Math.PI * 2);
  c.fill();
  const stride = walking && !reduced.matches ? Math.sin(now / 90) * 4 : 0;
  rect(x - 12, y + 10 + stride, 10, 14, "#313752");
  rect(x + 3, y + 10 - stride, 10, 14, "#313752");
  rect(x - 15, y + 21 + stride, 14, 5, "#b7bbcd");
  rect(x + 3, y + 21 - stride, 14, 5, "#b7bbcd");
  rect(x - 17, y - 11, 34, 26, tint);
  rect(x - 23, y - 7, 7, 19, tint);
  rect(x + 17, y - 7, 7, 19, tint);
  rect(x - 22, y + 9, 6, 6, "#e3b7a0");
  rect(x + 17, y + 9, 6, 6, "#e3b7a0");
  rect(x - 3, y - 10, 6, 23, "#ffffff25");
  rect(x - 15, y - 35, 30, 25, "#e9c6b0");
  rect(x - 18, y - 39, 36, 10, "#48465e");
  rect(x - 18, y - 32, 6, 12, "#48465e");
  rect(x + 12, y - 32, 6, 8, "#48465e");
  rect(x - 8, y - 24, 4, 4, "#333149");
  rect(x + 6, y - 24, 4, 4, "#333149");
  rect(x - 2, y - 16, 7, 2, "#bd8f88");
  if (status === "tool") {
    rect(x + 17, y + 2, 18, 14, "#374c69");
    rect(x + 20, y + 5, 12, 6, "#9acfe1");
  }
  const symbol =
    {
      thinking: "···",
      tool: "⌘",
      waiting: "!",
      done: "✓",
      error: "×",
      blocked: "!",
      paused: "Ⅱ",
      idle: "z",
    }[status] || "·";
  rect(x - 16, y - 66, 32, 21, "#172238");
  rect(x - 13, y - 45, 7, 5, "#172238");
  text(symbol, x, y - 51, 16, statusColors[status], "center");
}
function floor(now) {
  const day = theme === "day";
  rect(0, 0, 1200, 760, day ? "#cbd6df" : "#111a2a");
  rect(48, 55, 1104, 638, day ? "#76869c" : "#233047");
  rect(48, 55, 1104, 20, day ? "#a9b8c9" : "#43536a");
  rect(48, 75, 1104, 96, day ? "#9eafbf" : "#35445d");
  rect(65, 171, 1070, 500, day ? "#bfbdba" : "#566078");
  c.save();
  c.beginPath();
  c.rect(65, 171, 1070, 500);
  c.clip();
  for (let y = 171; y < 680; y += 44) {
    line(65, y, 1135, y, day ? "#a6a7ad" : "#48546c");
    for (let x = 65 + (Math.floor(y / 44) % 2) * 56; x < 1140; x += 112)
      line(x, y, x, y + 44, day ? "#a6a7ad" : "#48546c");
  }
  c.restore();
  rect(65, 171, 1070, 13, "#18223844");
  rect(48, 170, 17, 523, day ? "#75879b" : "#34425c");
  rect(1135, 170, 17, 523, day ? "#75879b" : "#34425c");
  rect(48, 677, 1104, 16, day ? "#8190a2" : "#3b4960");
  // Windows, a notice board, and a clock on the back wall.
  for (const x of [132, 312]) {
    rect(x, 85, 140, 70, "#1d293e");
    rect(x + 5, 90, 130, 60, day ? "#bad9e5" : "#57788f");
    rect(x + 10, 95, 120, 40, day ? "#d5eaf0" : "#688da0");
    rect(x + 68, 90, 4, 60, "#263b54");
    rect(x + 5, 119, 130, 4, "#263b54");
    rect(x - 4, 152, 148, 9, "#ac9da7");
  }
  rect(522, 88, 150, 65, "#83727f");
  rect(528, 94, 138, 53, "#c5b79e");
  for (let i = 0; i < 4; i++)
    rect(
      540 + i * 29,
      104 + (i % 2) * 8,
      21,
      26,
      ["#b8a3ed", "#b3d1bb", "#dcae9b", "#9dbed8"][i],
    );
  rect(719, 91, 46, 46, "#a9a9b9");
  rect(724, 96, 36, 36, "#e2ded5");
  line(742, 113, 742, 101, "#414d62", 3);
  line(742, 113, 753, 119, "#414d62", 3);
  rect(827, 85, 224, 67, "#1d2a42");
  text("MAKE SOMETHING", 939, 113, 17, "#d7c8fa", "center");
  text("WONDERFUL.", 939, 136, 17, "#9fc9d7", "center");
  // Rooms are divided by rugs and furniture, without inventing agent conversations.
  rect(100, 207, 530, 235, day ? "#a6a4b7" : "#66677f");
  rect(107, 214, 516, 221, day ? "#b6afc3" : "#76738c");
  rect(680, 207, 410, 235, day ? "#9eaeb8" : "#516b7c");
  rect(687, 214, 396, 221, day ? "#aabcc4" : "#5c7b88");
  text(t("zone1"), 116, 197, 11, day ? "#3f4962" : "#b9bfd4");
  text(t("zone2"), 695, 197, 11, day ? "#3f4962" : "#adc9d4");
  for (const [x, y] of [
    [137, 264],
    [391, 264],
    [137, 380],
    [391, 380],
  ]) {
    desk(x, y, "#b8a3ed");
    chair(x + 72, y + 67);
  }
  desk(712, 270, "#9cd9bc", true);
  desk(912, 270, "#99cde4", true);
  chair(784, 343);
  chair(984, 343);
  rect(918, 370, 151, 43, "#344a63");
  rect(924, 375, 139, 31, "#22354f");
  for (let i = 0; i < 8; i++)
    rect(931 + i * 16, 385, 7, 12, i % 3 === 0 ? "#a2dbbc" : "#6993a1");
  rect(102, 492, 370, 156, day ? "#b6a59c" : "#776a70");
  rect(110, 500, 354, 140, day ? "#d1b9a5" : "#948072");
  text(t("zone3"), 120, 520, 11, "#f7dec1");
  rect(126, 550, 120, 47, "#57556c");
  rect(133, 542, 106, 17, "#9b909b");
  rect(151, 531, 48, 13, "#c9b6a8");
  rect(141, 598, 10, 20, "#44445d");
  rect(222, 598, 10, 20, "#44445d");
  rect(542, 483, 546, 164, day ? "#9ea8b2" : "#59647a");
  rect(550, 491, 530, 148, day ? "#b0bdc0" : "#64748a");
  text(t("zone4"), 568, 516, 11, "#d4dce7");
  sofa(589, 538);
  sofa(876, 538);
  rect(790, 562, 56, 43, "#a7948d");
  rect(785, 555, 66, 15, "#c6b5a7");
  rect(807, 540, 16, 15, "#ddcbb2");
  plant(92, 211);
  plant(1104, 210);
  plant(520, 610);
  plant(1105, 620);
  text("AGENT OFFICE", 65, 731, 12, day ? "#455674" : "#8190ac");
  text(
    snapshot.mode === "demo"
      ? "DEMO / SIMULATED EVENTS"
      : "LIVE / SESSION EVENTS",
    1135,
    731,
    11,
    day ? "#455674" : "#8190ac",
    "right",
  );
  if (!connected && hasConnected)
    text(t("reconnecting"), 600, 32, 12, "#edc47d", "center");
}
function onFloor() {
  const list = snapshot.agents.slice(0, 12);
  const choice = snapshot.agents.find((a) => a.id === selected);
  if (choice && !list.some((a) => a.id === selected))
    list[list.length - 1] = choice;
  return list;
}
function target(a, index) {
  const zone = (s) =>
    ["thinking", "idle"].includes(s)
      ? "desk"
      : ["waiting", "blocked", "error"].includes(s)
        ? "approval"
        : s === "tool"
          ? "tool"
          : "rest";
  const group = onFloor().filter((x) => zone(x.status) === zone(a.status));
  const i = Math.max(
    0,
    group.findIndex((x) => x.id === a.id),
  );
  if (a.status === "thinking" || a.status === "idle") {
    return { x: 172 + (i % 4) * 124, y: 300 + Math.floor(i / 4) * 70 };
  }
  if (a.status === "tool") {
    return { x: 718 + (i % 6) * 62, y: 340 + Math.floor(i / 6) * 70 };
  }
  if (
    a.status === "waiting" ||
    a.status === "blocked" ||
    a.status === "error"
  ) {
    return { x: 280 + (i % 4) * 47, y: 577 + Math.floor(i / 4) * 42 };
  }
  return { x: 598 + (i % 6) * 76, y: 565 + Math.floor(i / 6) * 65 };
}
let last = 0;
function draw(now) {
  const dt = Math.min(now - last || 16, 80);
  last = now;
  floor(now);
  const visible = onFloor();
  const ids = new Set(visible.map((a) => a.id));
  for (const key of positions.keys()) if (!ids.has(key)) positions.delete(key);
  for (const [i, a] of visible.entries()) {
    const dest = target(a, i);
    let p = positions.get(a.id);
    if (!p) {
      p = { x: dest.x, y: dest.y };
      positions.set(a.id, p);
    }
    const distance = Math.hypot(dest.x - p.x, dest.y - p.y);
    const speed = reduced.matches ? 1 : 1 - Math.exp(-dt / 320);
    p.x += (dest.x - p.x) * speed;
    p.y += (dest.y - p.y) * speed;
    p.walking = distance > 3;
  }
  if ($("#links").checked) {
    c.save();
    c.setLineDash([4, 8]);
    for (const a of visible) {
      if (!a.parentId) continue;
      const p = positions.get(a.id),
        parent = positions.get(a.parentId);
      if (parent) line(p.x, p.y, parent.x, parent.y, "#bba5f84d", 2);
    }
    c.restore();
  }
  for (const a of visible.sort(
    (a, b) => positions.get(a.id).y - positions.get(b.id).y,
  )) {
    const p = positions.get(a.id);
    if (a.id === selected) {
      c.strokeStyle = "#d6c6ff";
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(p.x, p.y + 25, 27, 10, 0, 0, Math.PI * 2);
      c.stroke();
    }
    const crowded = visible.filter((x) => x.status === a.status).length > 4;
    const scale = crowded ? 0.62 : 1;
    c.save();
    c.translate(p.x, p.y);
    c.scale(scale, scale);
    sprite(0, 0, color(a.id), a.status, now, p.walking);
    c.restore();
    const label = a.name.length > 17 ? a.name.slice(0, 16) + "…" : a.name;
    c.font = '11px "Segoe UI",sans-serif';
    const w = c.measureText(label).width + 14;
    rect(
      p.x - w / 2,
      p.y + 35 * scale,
      w,
      19,
      a.id === selected ? "#43365d" : "#172238e8",
    );
    text(label, p.x, p.y + 35 * scale + 13, 11, "#e3e3f0", "center");
  }
  if (snapshot.agents.length > 12)
    text(
      `12 / ${snapshot.agents.length} · ${t("capacity")}`,
      1100,
      32,
      12,
      "#bdabef",
      "right",
    );
  requestAnimationFrame(draw);
}
canvas.addEventListener("click", (event) => {
  const r = canvas.getBoundingClientRect();
  const x = ((event.clientX - r.left) * 1200) / r.width,
    y = ((event.clientY - r.top) * 760) / r.height;
  const hit = [...positions.entries()]
    .map(([id, p]) => ({ id, d: Math.hypot(p.x - x, p.y - 10 - y) }))
    .filter((p) => p.d < 45)
    .sort((a, b) => a.d - b.d)[0];
  if (hit) {
    selected = hit.id;
    render();
  }
});
function updateClock() {
  $("#clock").textContent = new Date().toLocaleTimeString(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
updateClock();
setInterval(updateClock, 1000);
translate();
requestAnimationFrame(draw);
