import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const resultGrid = document.querySelector("#resultGrid");
const emptyState = document.querySelector("#emptyState");
const fileCount = document.querySelector("#fileCount");
const clearButton = document.querySelector("#clearButton");
const firebaseStatus = document.querySelector("#firebaseStatus");
const firebaseStatusDot = document.querySelector("#firebaseStatusDot");

const items = new Map();
let storage = null;

try {
  const app = initializeApp(firebaseConfig);
  storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
  firebaseStatus.textContent = "Firebase 연결됨";
  firebaseStatusDot.classList.add("ready");
} catch (error) {
  console.error("Firebase 초기화 오류:", error);
  firebaseStatus.textContent = "Firebase 연결 오류";
  firebaseStatusDot.classList.add("error");
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
  for (const item of items.values()) {
    URL.revokeObjectURL(item.previewUrl);
  }
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
      <div class="card-status">업로드 준비 중...</div>

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

  const removeButton = card.querySelector(".remove-button");
  removeButton.addEventListener("click", () => removeItem(item, card));

  resultGrid.prepend(card);
  return card;
}

async function uploadItem(item, card) {
  const progressBar = card.querySelector(".progress > i");
  const status = card.querySelector(".card-status");
  const codeGrid = card.querySelector(".code-grid");

  if (!storage) {
    status.textContent = "Firebase 연결을 확인해주세요.";
    return;
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const safeName = sanitizeFileName(item.file.name);
    const storageRef = ref(storage, `images/${year}/${month}/${Date.now()}-${safeName}`);

    const task = uploadBytesResumable(storageRef, item.file, {
      contentType: item.file.type || "application/octet-stream",
      cacheControl: "public,max-age=31536000"
    });

    item.downloadUrl = await new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snapshot) => {
          const percent = snapshot.totalBytes
            ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            : 0;
          progressBar.style.width = `${percent}%`;
          status.textContent = `업로드 중 ${Math.round(percent)}%`;
        },
        reject,
        async () => {
          try {
            resolve(await getDownloadURL(task.snapshot.ref));
          } catch (error) {
            reject(error);
          }
        }
      );
    });

    progressBar.style.width = "100%";
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
    console.error("Firebase Storage 업로드 오류:", error);
    status.textContent = readableStorageError(error);
  }
}

function bindCopy(button, value) {
  button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = "완료";
    setTimeout(() => {
      button.textContent = original;
    }, 900);
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

function sanitizeFileName(name) {
  const lastDot = name.lastIndexOf(".");
  const rawBase = lastDot > -1 ? name.slice(0, lastDot) : name;
  const ext = lastDot > -1 ? name.slice(lastDot).toLowerCase() : "";
  const base = rawBase
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "")
    .replace(/-+/g, "-") || "image";

  return `${base}${ext}`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function readableStorageError(error) {
  const code = error?.code || "unknown";

  if (code === "storage/unauthorized") {
    return "업로드 권한이 거부됐습니다. Firebase Storage 규칙 게시 상태를 확인해주세요.";
  }
  if (code === "storage/bucket-not-found") {
    return "Storage 버킷을 찾지 못했습니다.";
  }
  if (code === "storage/quota-exceeded") {
    return "Storage 사용량 한도를 초과했습니다.";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "업로드 시간이 초과됐습니다. 다시 시도해주세요.";
  }

  return `업로드 실패 · ${code}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
