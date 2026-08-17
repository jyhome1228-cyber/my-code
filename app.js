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
const qualityRange = document.querySelector("#qualityRange");
const qualityValue = document.querySelector("#qualityValue");
const formatSelect = document.querySelector("#formatSelect");
const maxWidthSelect = document.querySelector("#maxWidthSelect");
const resultGrid = document.querySelector("#resultGrid");
const emptyState = document.querySelector("#emptyState");
const fileCount = document.querySelector("#fileCount");
const clearButton = document.querySelector("#clearButton");
const firebaseStatus = document.querySelector("#firebaseStatus");
const firebaseStatusDot = document.querySelector("#firebaseStatusDot");

const items = new Map();
let storage = null;

const firebaseReady = Object.values(firebaseConfig).every(
  (value) => value && !String(value).includes("YOUR_")
);

if (firebaseReady) {
  try {
    const app = initializeApp(firebaseConfig);
    // 버킷을 명시적으로 지정해 GitHub Pages 환경에서도 기본 버킷 오인식을 방지합니다.
    storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
    firebaseStatus.textContent = "Firebase 설정됨";
    firebaseStatusDot.classList.add("ready");
  } catch (error) {
    console.error("Firebase 초기화 오류:", error);
    firebaseStatus.textContent = `Firebase 연결 오류${error?.code ? ` · ${error.code}` : ""}`;
  }
} else {
  firebaseStatus.textContent = "Firebase 설정 필요";
}

qualityRange.addEventListener("input", () => {
  qualityValue.textContent = qualityRange.value;
});

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
    try {
      await convertAndAdd(file);
    } catch (error) {
      console.error("이미지 변환 실패:", error);
      alert(`${file.name} 변환 중 오류가 발생했습니다.`);
    }
  }

  fileInput.value = "";
}

async function convertAndAdd(file) {
  const id = crypto.randomUUID();
  const outputType = formatSelect.value;
  const quality = Number(qualityRange.value) / 100;
  const maxWidth = Number(maxWidthSelect.value);
  const image = await loadImage(file);

  const ratio = maxWidth > 0 && image.naturalWidth > maxWidth
    ? maxWidth / image.naturalWidth
    : 1;

  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: true });

  if (outputType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, outputType, quality);
  const extension = extensionFromMime(outputType);
  const baseName = sanitizeBaseName(file.name.replace(/\.[^/.]+$/, ""));
  const outputName = `${baseName}.${extension}`;
  const previewUrl = URL.createObjectURL(blob);

  const item = {
    id,
    originalFile: file,
    blob,
    previewUrl,
    outputName,
    width,
    height,
    outputType,
    downloadUrl: ""
  };

  items.set(id, item);
  renderCard(item);
  updateCount();
}

function renderCard(item) {
  emptyState.hidden = true;

  const card = document.createElement("article");
  card.className = "result-card";
  card.dataset.id = item.id;

  card.innerHTML = `
    <div class="preview-wrap">
      <img src="${item.previewUrl}" alt="${escapeHtml(item.outputName)} 미리보기" />
    </div>
    <div class="card-body">
      <h3 class="card-title" title="${escapeHtml(item.outputName)}">${escapeHtml(item.outputName)}</h3>
      <div class="card-meta">
        <span>${item.width} × ${item.height}px</span>
        <span>${formatBytes(item.originalFile.size)} → ${formatBytes(item.blob.size)}</span>
        <span>${savingRate(item.originalFile.size, item.blob.size)}</span>
      </div>
      <div class="progress"><i></i></div>
      <div class="card-status">${storage ? "Firebase 업로드 준비됨" : "Firebase 연결을 확인하세요"}</div>
      <div class="card-actions">
        <button class="card-button download-button" type="button">파일 저장</button>
        <button class="card-button primary upload-button" type="button" ${storage ? "" : "disabled"}>CDN 업로드</button>
        <button class="card-button copy-button" type="button" disabled>URL 복사</button>
        <button class="card-button remove-button" type="button">목록에서 삭제</button>
      </div>
    </div>
  `;

  const downloadButton = card.querySelector(".download-button");
  const uploadButton = card.querySelector(".upload-button");
  const copyButton = card.querySelector(".copy-button");
  const removeButton = card.querySelector(".remove-button");
  const progressBar = card.querySelector(".progress > i");
  const status = card.querySelector(".card-status");

  downloadButton.addEventListener("click", () => downloadBlob(item));

  uploadButton.addEventListener("click", async () => {
    if (!storage || item.downloadUrl) return;
    uploadButton.disabled = true;
    status.textContent = "Firebase Storage에 업로드 중…";

    try {
      item.downloadUrl = await uploadToFirebase(item, (percent) => {
        progressBar.style.width = `${percent}%`;
        status.textContent = `업로드 중 ${Math.round(percent)}%`;
      });

      progressBar.style.width = "100%";
      status.textContent = "CDN URL 생성 완료";
      uploadButton.textContent = "업로드 완료";
      copyButton.disabled = false;
    } catch (error) {
      console.error("Firebase Storage 업로드 오류:", error);
      const message = readableStorageError(error);
      status.textContent = message;
      uploadButton.disabled = false;
      alert(message);
    }
  });

  copyButton.addEventListener("click", async () => {
    if (!item.downloadUrl) return;
    await navigator.clipboard.writeText(item.downloadUrl);
    const originalText = copyButton.textContent;
    copyButton.textContent = "복사 완료";
    setTimeout(() => (copyButton.textContent = originalText), 1200);
  });

  removeButton.addEventListener("click", () => {
    URL.revokeObjectURL(item.previewUrl);
    items.delete(item.id);
    card.remove();
    updateCount();
  });

  resultGrid.prepend(card);
}

function uploadToFirebase(item, onProgress) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const uniqueName = `${Date.now()}-${item.outputName}`;
    const storageRef = ref(storage, `images/${year}/${month}/${uniqueName}`);

    const uploadTask = uploadBytesResumable(storageRef, item.blob, {
      contentType: item.outputType,
      cacheControl: "public,max-age=31536000"
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(percent);
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

function readableStorageError(error) {
  const code = error?.code || "unknown";

  if (code === "storage/unauthorized") {
    return "업로드 권한이 거부됐습니다. Firebase Storage > 규칙에서 변경사항을 '게시'했는지 확인해주세요. (storage/unauthorized)";
  }
  if (code === "storage/bucket-not-found") {
    return "Firebase Storage 버킷을 찾지 못했습니다. 버킷 생성/설정을 확인해주세요. (storage/bucket-not-found)";
  }
  if (code === "storage/quota-exceeded") {
    return "Firebase Storage 사용량 한도를 초과했습니다. (storage/quota-exceeded)";
  }
  if (code === "storage/retry-limit-exceeded") {
    return "업로드 연결 시간이 초과됐습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요. (storage/retry-limit-exceeded)";
  }
  if (code === "storage/unauthenticated") {
    return "Firebase 인증이 필요한 상태입니다. (storage/unauthenticated)";
  }

  return `업로드 실패 · ${code}${error?.message ? ` · ${error.message}` : ""}`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 Blob 생성 실패"))),
      type,
      quality
    );
  });
}

function downloadBlob(item) {
  const anchor = document.createElement("a");
  anchor.href = item.previewUrl;
  anchor.download = item.outputName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function extensionFromMime(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

function sanitizeBaseName(name) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "")
    .replace(/-+/g, "-") || "image";
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function savingRate(before, after) {
  if (!before) return "";
  const rate = Math.round((1 - after / before) * 100);
  return rate > 0 ? `${rate}% 절감` : rate === 0 ? "용량 동일" : `${Math.abs(rate)}% 증가`;
}

function updateCount() {
  const count = items.size;
  fileCount.textContent = `${count}개 파일`;
  emptyState.hidden = count > 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
