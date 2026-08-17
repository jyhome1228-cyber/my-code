const WORKER_API = "https://cool-bar-7c8d.planus253.workers.dev";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const resultGrid = document.querySelector("#resultGrid");
const emptyState = document.querySelector("#emptyState");
const fileCount = document.querySelector("#fileCount");
const clearButton = document.querySelector("#clearButton");
const serviceStatus = document.querySelector("#serviceStatus");
const serviceStatusDot = document.querySelector("#serviceStatusDot");

const items = new Map();

checkWorker();

async function checkWorker() {
  try {
    const response = await fetch(WORKER_API, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    serviceStatus.textContent = "R2 연결됨";
    serviceStatusDot.classList.remove("error");
    serviceStatusDot.classList.add("ready");
  } catch (error) {
    console.error("Worker 연결 확인 실패:", error);
    serviceStatus.textContent = "R2 연결 확인 필요";
    serviceStatusDot.classList.remove("ready");
    serviceStatusDot.classList.add("error");
  }
}

dropzone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => handleFiles(event.target.files));

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  });
});

dropzone.addEventListener("drop", (event) => {
  handleFiles(event.dataTransfer.files);
});

clearButton.addEventListener("click", () => {
  for (const item of items.values()) URL.revokeObjectURL(item.previewUrl);
  items.clear();
  resultGrid.innerHTML = "";
  updateCount();
});

async function handleFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;

  for (const file of files) {
    const item = createItem(file);
    items.set(item.id, item);
    const card = renderCard(item);
    updateCount();

    if (file.size > MAX_FILE_SIZE) {
      card.dataset.state = "error";
      card.querySelector(".card-status").textContent = "파일은 최대 10MB까지 업로드할 수 있습니다.";
      continue;
    }

    uploadItem(item, card);
  }

  fileInput.value = "";
}

function createItem(file) {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    downloadUrl: ""
  };
}

function renderCard(item) {
  emptyState.hidden = true;

  const card = document.createElement("article");
  card.className = "result-card";
  card.dataset.id = item.id;
  card.dataset.state = "uploading";

  card.innerHTML = `
    <div class="preview-wrap">
      <img src="${item.previewUrl}" alt="${escapeHtml(item.file.name)} 미리보기" />
    </div>
    <div class="card-body">
      <div class="card-top">
        <div>
          <h3 class="card-title">${escapeHtml(item.file.name)}</h3>
          <div class="card-meta">${formatBytes(item.file.size)} · ${escapeHtml(item.file.type || "image")}</div>
        </div>
        <button class="remove-button" type="button">목록 삭제</button>
      </div>

      <div class="progress"><i></i></div>
      <div class="card-status">R2 업로드 준비 중...</div>

      <div class="code-grid" hidden>
        <div class="code-row">
          <span class="code-label">IMAGE URL</span>
          <input class="code-input url-input" type="text" readonly />
          <button class="copy-button copy-url" type="button">복사</button>
        </div>
        <div class="code-row">
          <span class="code-label">HTML</span>
          <input class="code-input html-input" type="text" readonly />
          <button class="copy-button copy-html" type="button">복사</button>
        </div>
        <div class="code-row">
          <span class="code-label">CSS BG</span>
          <input class="code-input css-input" type="text" readonly />
          <button class="copy-button copy-css" type="button">복사</button>
        </div>
      </div>
    </div>
  `;

  card.querySelector(".remove-button").addEventListener("click", () => removeItem(item, card));
  resultGrid.prepend(card);
  return card;
}

async function uploadItem(item, card) {
  const progressBar = card.querySelector(".progress > i");
  const status = card.querySelector(".card-status");
  const codeGrid = card.querySelector(".code-grid");

  try {
    card.dataset.state = "uploading";
    progressBar.style.width = "35%";
    status.textContent = "Cloudflare R2에 업로드 중...";

    const response = await fetch(`${WORKER_API}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": item.file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(item.file.name)
      },
      body: item.file
    });

    let payload = {};
    try { payload = await response.json(); } catch (_) {}

    if (!response.ok || !payload.url) {
      throw new Error(payload.error || `업로드 실패 (HTTP ${response.status})`);
    }

    item.downloadUrl = payload.url;
    progressBar.style.width = "100%";
    card.dataset.state = "done";
    status.textContent = "완료 · 아래 코드를 바로 사용할 수 있습니다.";

    const htmlCode = `<img src="${item.downloadUrl}" alt="">`;
    const cssCode = `background-image: url("${item.downloadUrl}");`;

    card.querySelector(".url-input").value = item.downloadUrl;
    card.querySelector(".html-input").value = htmlCode;
    card.querySelector(".css-input").value = cssCode;
    codeGrid.hidden = false;

    bindCopy(card.querySelector(".copy-url"), item.downloadUrl);
    bindCopy(card.querySelector(".copy-html"), htmlCode);
    bindCopy(card.querySelector(".copy-css"), cssCode);
  } catch (error) {
    console.error("Cloudflare R2 업로드 오류:", error);
    progressBar.style.width = "0%";
    card.dataset.state = "error";
    status.textContent = `업로드 실패 · ${error.message || "Worker/R2 설정을 확인해주세요."}`;
  }
}

function bindCopy(button, value) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = "완료";
    setTimeout(() => { button.textContent = original; }, 900);
  });
}

function removeItem(item, card) {
  URL.revokeObjectURL(item.previewUrl);
  items.delete(item.id);
  card.remove();
  updateCount();
}

function updateCount() {
  const count = items.size;
  fileCount.textContent = `${count}개`;
  emptyState.hidden = count > 0;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
