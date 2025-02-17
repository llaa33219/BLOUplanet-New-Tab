// newtab.js
// ------------------------------------
// 기능:
// 1) 구글 로고/검색창 (1.5배)
// 2) 우클릭 -> 삭제 / 변경
// 3) +아이콘 -> 바로가기 추가 (무한대)
// 4) 크롬 동기화
// 5) 드래그 앤 드롭 교체 방식
// 6) +아이콘 위치 고정
// 7) 배경 변경 (사용자 지정 색상, Preset 그라데이션, 이미지 업로드, 애니메이션 등)
// ------------------------------------

let selectedShortcutIndex = null;
let draggedItemIndex = null;
let dropTargetIndex = null;
let selectedBackgroundCSS = ""; // 배경 변경 시 선택된 CSS(혹은 식별자)

/**
 * 배경을 적용할 때,
 * - animatedXXX 형식인 경우 해당 CSS 클래스로 적용
 * - 그 외에는 document.body.style.background에 직접 적용
 */
function applyBackground(css) {
  // body에 적용된 모든 animated- 로 시작하는 클래스를 제거
  [...document.body.classList].forEach(cls => {
    if (cls.startsWith("animated-")) {
      document.body.classList.remove(cls);
    }
  });

  // animatedXXX (예: animatedGradient1, animatedRadial1 등) 패턴이면 해당 클래스를 추가
  if (/^animated[A-Za-z]+\d+$/.test(css)) {
    const match = css.match(/^animated([A-Za-z]+)(\d+)$/);
    if (match) {
      const type = match[1].toLowerCase(); // gradient, radial, conic, elliptical 등
      const num = match[2];
      const className = "animated-" + type + "-" + num;
      document.body.classList.add(className);
      // 인라인 배경 제거
      document.body.style.background = "";
    }
  } else {
    // 일반 배경
    document.body.style.background = css;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCustomShortcuts();

  // 바로가기 추가 모달 이벤트
  const shortcutModal = document.getElementById("shortcutModal");
  const modalClose = document.getElementById("modalClose");
  const modalAddBtn = document.getElementById("modalAddShortcutBtn");

  modalClose.addEventListener("click", () => shortcutModal.style.display = "none");
  window.addEventListener("click", e => {
    if (e.target === shortcutModal) {
      shortcutModal.style.display = "none";
    }
  });
  modalAddBtn.addEventListener("click", addNewShortcut);

  // 우클릭 컨텍스트 메뉴 이벤트
  const contextMenu = document.getElementById("contextMenu");
  document.addEventListener("click", () => contextMenu.style.display = "none");
  document.getElementById("cmDelete").addEventListener("click", handleDelete);
  document.getElementById("cmEdit").addEventListener("click", handleEdit);

  // 바로가기 변경 모달 이벤트
  const shortcutEditModal = document.getElementById("shortcutEditModal");
  document.getElementById("editModalClose").addEventListener("click", () => shortcutEditModal.style.display = "none");
  window.addEventListener("click", e => {
    if (e.target === shortcutEditModal) {
      shortcutEditModal.style.display = "none";
    }
  });
  document.getElementById("editShortcutSaveBtn").addEventListener("click", saveEditedShortcut);

  // -------------------------
  // 배경 설정 모달 이벤트 등록
  // -------------------------
  const backgroundModal = document.getElementById("backgroundModal");
  const backgroundModalClose = document.getElementById("backgroundModalClose");
  backgroundModalClose.addEventListener("click", () => backgroundModal.style.display = "none");
  document.getElementById("backgroundCancelBtn").addEventListener("click", () => backgroundModal.style.display = "none");
  document.getElementById("backgroundSaveBtn").addEventListener("click", saveBackgroundSetting);
  document.getElementById("backgroundChangeBtn").addEventListener("click", () => {
    backgroundModal.style.display = "block";
  });

  // Preset 옵션 클릭 이벤트
  document.querySelectorAll(".preset-option").forEach(option => {
    option.addEventListener("click", () => {
      // 모든 preset 옵션 초기화
      document.querySelectorAll(".preset-option").forEach(opt => opt.style.outline = "");
      option.style.outline = "3px solid #4285f4";
      selectedBackgroundCSS = option.getAttribute("data-value");

      // 사용자 지정 색상 및 이미지 초기화
      document.getElementById("customColorInput").value = "#ffffff";
      document.getElementById("customImageInput").value = "";
    });
  });

  // 사용자 지정 색상 입력 이벤트
  document.getElementById("customColorInput").addEventListener("input", (e) => {
    document.querySelectorAll(".preset-option").forEach(opt => opt.style.outline = "");
    selectedBackgroundCSS = e.target.value;
    // 파일 업로드 초기화
    document.getElementById("customImageInput").value = "";
  });

  // 사용자 지정 이미지 업로드 이벤트
  document.getElementById("customImageInput").addEventListener("change", (e) => {
    document.querySelectorAll(".preset-option").forEach(opt => opt.style.outline = "");
    document.getElementById("customColorInput").value = "#ffffff";
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        selectedBackgroundCSS = `url(${event.target.result}) no-repeat center center / cover`;
      };
      reader.readAsDataURL(file);
    }
  });

  // 저장된 배경 설정 로드
  loadBackgroundSetting();
});

// -------------------------
// 드래그 이벤트 핸들러 (교체 방식)
// -------------------------
function handleDragStart(e) {
  if (e.target.closest('.add-shortcut-item')) return;
  
  const container = e.target.closest('.shortcuts-container');
  draggedItemIndex = Array.from(container.children)
    .indexOf(e.target.closest('.shortcut-item'));
  
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData("text/plain", "");
  
  e.target.style.opacity = '0.5';
}

function handleDragOver(e) {
  e.preventDefault();
  const targetItem = e.target.closest('.shortcut-item:not(.add-shortcut-item)');
  if (!targetItem) return;
  
  const container = targetItem.parentElement;
  const children = Array.from(container.children);
  dropTargetIndex = children.indexOf(targetItem);

  document.querySelectorAll('.shortcut-item').forEach(item => 
    item.classList.remove('drag-over')
  );
  if (dropTargetIndex !== draggedItemIndex) {
    targetItem.classList.add('drag-over');
  }
}

function handleDragEnd(e) {
  document.querySelectorAll('.shortcut-item').forEach(item => {
    item.style.opacity = '1';
    item.classList.remove('drag-over');
  });

  if (validateSwap()) {
    swapShortcuts(draggedItemIndex, dropTargetIndex);
  }
  resetDragIndexes();
}

function validateSwap() {
  return draggedItemIndex !== null && 
         dropTargetIndex !== null && 
         draggedItemIndex !== dropTargetIndex &&
         dropTargetIndex < document.querySelectorAll('.shortcut-item:not(.add-shortcut-item)').length;
}

function resetDragIndexes() {
  draggedItemIndex = null;
  dropTargetIndex = null;
}

// 두 항목의 순서를 교체하고 저장소를 업데이트
function swapShortcuts(indexA, indexB) {
  chrome.storage.sync.get("customShortcuts", ({ customShortcuts = [] }) => {
    [customShortcuts[indexA], customShortcuts[indexB]] = [customShortcuts[indexB], customShortcuts[indexA]];
    chrome.storage.sync.set({ customShortcuts }, () => renderCustomShortcuts(customShortcuts));
  });
}

// -------------------------
// 렌더링 함수
// -------------------------
function renderCustomShortcuts(shortcuts) {
  // 유효하지 않은 항목(null 또는 url이 없는 항목)은 걸러냅니다.
  const validShortcuts = shortcuts.filter(s => s && s.url);
  // 만약 필터링 후 배열 길이가 달라졌다면 저장소를 업데이트합니다.
  if (validShortcuts.length !== shortcuts.length) {
    chrome.storage.sync.set({ customShortcuts: validShortcuts });
  }
  
  const container = document.getElementById("custom-shortcuts-container");
  container.innerHTML = "";

  validShortcuts.forEach((shortcut, index) => {
    const item = createShortcutItem(shortcut, index);
    container.appendChild(item);
  });

  addPlusButton(container);
}

function createShortcutItem(shortcut, index) {
  const item = document.createElement("div");
  item.className = "shortcut-item";
  item.draggable = true;

  // 드래그 이벤트 등록
  item.addEventListener('dragstart', handleDragStart);
  item.addEventListener('dragover', handleDragOver);
  item.addEventListener('dragend', handleDragEnd);

  // 파비콘 및 링크 (내부 <a>와 <img>에 draggable="false" 추가)
  const favicon = "https://www.google.com/s2/favicons?domain=" + shortcut.url + "&sz=64";
  item.innerHTML = `
    <a href="${shortcut.url}" draggable="false">
      <img src="${favicon}" alt="favicon" draggable="false" />
      <div class="shortcut-title">${shortcut.title}</div>
    </a>
  `;

  // 우클릭 컨텍스트 메뉴
  item.addEventListener("contextmenu", e => showContextMenu(e, index));
  return item;
}

function addPlusButton(container) {
  const plusItem = document.createElement("div");
  plusItem.className = "shortcut-item";
  plusItem.draggable = false;
  plusItem.innerHTML = `
    <div class="add-shortcut-item">+</div>
    <div class="add-shortcut-label">Add shortcut</div>
  `;
  plusItem.addEventListener("click", () => {
    document.getElementById("shortcutModal").style.display = "block";
  });
  container.appendChild(plusItem);
}

// -------------------------
// 바로가기 추가 및 관련 함수들
// -------------------------
function addNewShortcut() {
  const titleInput = document.getElementById("modalShortcutTitle");
  const urlInput = document.getElementById("modalShortcutUrl");
  const title = titleInput.value.trim();
  const url = urlInput.value.trim();

  if (!title || !url) {
    alert("Please enter both the site name and URL.");
    return;
  }
  
  let correctedUrl = url;
  if (!/^https?:\/\//i.test(correctedUrl)) {
    correctedUrl = "http://" + correctedUrl;
  }

  addShortcut(title, correctedUrl);
  titleInput.value = "";
  urlInput.value = "";
  document.getElementById("shortcutModal").style.display = "none";
}

function handleDelete() {
  if (selectedShortcutIndex !== null) {
    removeShortcut(selectedShortcutIndex);
    selectedShortcutIndex = null;
  }
  document.getElementById("contextMenu").style.display = "none";
}

function handleEdit() {
  if (selectedShortcutIndex !== null) {
    showEditModal(selectedShortcutIndex);
  }
  document.getElementById("contextMenu").style.display = "none";
}

function saveEditedShortcut() {
  const editTitleInput = document.getElementById("editShortcutTitle");
  const editUrlInput = document.getElementById("editShortcutUrl");
  const newTitle = editTitleInput.value.trim();
  const newUrl = editUrlInput.value.trim();

  if (!newTitle || !newUrl) {
    alert("Please enter both the site name and URL.");
    return;
  }
  
  let correctedUrl = newUrl;
  if (!/^https?:\/\//i.test(correctedUrl)) {
    correctedUrl = "http://" + correctedUrl;
  }
  
  if (selectedShortcutIndex !== null) {
    editShortcut(selectedShortcutIndex, newTitle, correctedUrl);
  }
  document.getElementById("shortcutEditModal").style.display = "none";
}

function showContextMenu(e, index) {
  e.preventDefault();
  selectedShortcutIndex = index;
  const contextMenu = document.getElementById("contextMenu");
  contextMenu.style.display = "block";
  contextMenu.style.left = e.pageX + "px";
  contextMenu.style.top = e.pageY + "px";
}

// -------------------------
// 크롬 동기화 관련 함수들 (기존 구현 유지)
// -------------------------
function loadCustomShortcuts() {
  chrome.storage.sync.get("customShortcuts", (data) => {
    const shortcuts = data.customShortcuts || [];
    renderCustomShortcuts(shortcuts);
  });
}

function addShortcut(title, url) {
  chrome.storage.sync.get("customShortcuts", (data) => {
    const shortcuts = data.customShortcuts || [];
    shortcuts.push({ title, url });
    chrome.storage.sync.set({ customShortcuts: shortcuts }, () => {
      renderCustomShortcuts(shortcuts);
    });
  });
}

function removeShortcut(index) {
  chrome.storage.sync.get("customShortcuts", (data) => {
    let shortcuts = data.customShortcuts || [];
    if (index >= 0 && index < shortcuts.length) {
      shortcuts.splice(index, 1);
      chrome.storage.sync.set({ customShortcuts: shortcuts }, () => {
        renderCustomShortcuts(shortcuts);
      });
    }
  });
}

function editShortcut(index, newTitle, newUrl) {
  chrome.storage.sync.get("customShortcuts", (data) => {
    let shortcuts = data.customShortcuts || [];
    if (index >= 0 && index < shortcuts.length) {
      shortcuts[index].title = newTitle;
      shortcuts[index].url = newUrl;
      chrome.storage.sync.set({ customShortcuts: shortcuts }, () => {
        renderCustomShortcuts(shortcuts);
      });
    }
  });
}

function showEditModal(index) {
  chrome.storage.sync.get("customShortcuts", (data) => {
    const shortcuts = data.customShortcuts || [];
    if (index >= 0 && index < shortcuts.length) {
      const shortcut = shortcuts[index];
      document.getElementById("editShortcutTitle").value = shortcut.title;
      document.getElementById("editShortcutUrl").value = shortcut.url;
      document.getElementById("shortcutEditModal").style.display = "block";
    }
  });
}

// -------------------------
// 배경 설정 관련 함수들
// -------------------------
function loadBackgroundSetting() {
  chrome.storage.sync.get("backgroundSettings", (data) => {
    const bg = data.backgroundSettings;
    if (bg && bg.css) {
      applyBackground(bg.css);
      selectedBackgroundCSS = bg.css;
    }
  });
}

function saveBackgroundSetting() {
  if (!selectedBackgroundCSS) {
    alert("Choose a background.");
    return;
  }
  // 스토리지에 저장
  chrome.storage.sync.set({ backgroundSettings: { css: selectedBackgroundCSS } }, () => {
    applyBackground(selectedBackgroundCSS);
    document.getElementById("backgroundModal").style.display = "none";
  });
}
