const state = {
  user: null,
  stack: [],
  swiping: false,
};

const deckEl = document.getElementById("deck");
const matchesListEl = document.getElementById("matchesList");
const statusTextEl = document.getElementById("statusText");
const toastEl = document.getElementById("toast");
const onboardingDialog = document.getElementById("onboardingDialog");
const onboardingForm = document.getElementById("onboardingForm");
const btnPass = document.getElementById("btnPass");
const btnLike = document.getElementById("btnLike");
const btnNotif = document.getElementById("btnNotif");
const btnReset = document.getElementById("btnReset");

bootstrap().catch((err) => {
  console.error(err);
  setStatus("Error inicializando Matcha.");
});

async function bootstrap() {
  bindEvents();
  await registerServiceWorker();

  const cachedUserId = localStorage.getItem("matcha_user_id");
  if (!cachedUserId) {
    openOnboarding();
    return;
  }

  const me = await getJson(`/api/users/${cachedUserId}`).catch(() => null);
  if (!me?.ok || !me.user) {
    localStorage.removeItem("matcha_user_id");
    openOnboarding();
    return;
  }

  await setCurrentUser(me.user);
}

function bindEvents() {
  onboardingForm.addEventListener("submit", onCreateProfile);
  btnPass.addEventListener("click", () => swipeTopCard("pass"));
  btnLike.addEventListener("click", () => swipeTopCard("like"));
  btnNotif.addEventListener("click", () => enableNotifications());
  btnReset.addEventListener("click", () => {
    localStorage.removeItem("matcha_user_id");
    window.location.reload();
  });
}

function openOnboarding() {
  if (typeof onboardingDialog.showModal === "function") {
    onboardingDialog.showModal();
  } else {
    onboardingDialog.setAttribute("open", "open");
  }
}

async function onCreateProfile(event) {
  event.preventDefault();
  const formData = new FormData(onboardingForm);
  const payload = {
    name: String(formData.get("name") || ""),
    age: Number(formData.get("age")) || 25,
    city: String(formData.get("city") || ""),
    bio: String(formData.get("bio") || ""),
    photoUrl: String(formData.get("photoUrl") || ""),
  };

  const created = await postJson("/api/auth/guest", payload).catch(() => null);
  if (!created?.ok || !created.user) {
    showToast("No se pudo crear tu perfil.");
    return;
  }

  onboardingDialog.close();
  await setCurrentUser(created.user);
}

async function setCurrentUser(user) {
  state.user = user;
  localStorage.setItem("matcha_user_id", user.id);
  setStatus(`Hola ${user.name}. Empeza a deslizar.`);
  notifyAndroidUser(user.id);
  await refreshStack();
  await refreshMatches();
}

async function refreshStack() {
  if (!state.user) {
    return;
  }
  const response = await getJson(
    `/api/profiles/stack?userId=${encodeURIComponent(state.user.id)}&limit=12`
  ).catch(() => null);

  state.stack = response?.ok ? response.profiles : [];
  renderDeck();
  if (!state.stack.length) {
    setStatus("No hay mas perfiles por ahora.");
  }
}

async function refreshMatches() {
  if (!state.user) {
    return;
  }
  const response = await getJson(
    `/api/matches?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);
  const matches = response?.ok ? response.matches : [];
  renderMatches(matches);
}

function renderDeck() {
  deckEl.innerHTML = "";

  if (!state.stack.length) {
    const empty = document.createElement("div");
    empty.className = "status";
    empty.textContent = "Sin perfiles por mostrar.";
    deckEl.appendChild(empty);
    return;
  }

  const visibleCards = state.stack.slice(0, 3);
  for (let i = visibleCards.length - 1; i >= 0; i -= 1) {
    const profile = visibleCards[i];
    const isTop = i === 0;
    const card = createCard(profile, isTop, i);
    deckEl.appendChild(card);
  }
}

function createCard(profile, isTop, index) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.userId = profile.id;
  card.style.backgroundImage = `url("${profile.photoUrl}")`;
  card.style.transform = `scale(${1 - index * 0.04}) translateY(${index * 7}px)`;
  card.style.zIndex = String(20 - index);

  card.innerHTML = `
    <div class="stamp pass">NOPE</div>
    <div class="stamp like">LIKE</div>
    <div class="card-meta">
      <h3 class="card-name">${escapeHtml(profile.name)}, ${profile.age}</h3>
      <p class="card-city">${escapeHtml(profile.city || "Sin ciudad")}</p>
      <p class="card-bio">${escapeHtml(profile.bio || "Sin bio")}</p>
    </div>
  `;

  if (isTop) {
    attachDrag(card);
  }
  return card;
}

function attachDrag(card) {
  let dragging = false;
  let startX = 0;
  let currentX = 0;

  card.addEventListener("pointerdown", (event) => {
    if (state.swiping) return;
    dragging = true;
    startX = event.clientX;
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragging || state.swiping) return;
    currentX = event.clientX - startX;
    const rotate = currentX * 0.05;
    card.style.transition = "none";
    card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
    paintStamps(card, currentX);
  });

  const release = async () => {
    if (!dragging || state.swiping) return;
    dragging = false;
    const threshold = 95;
    if (currentX > threshold) {
      await swipeTopCard("like");
      return;
    }
    if (currentX < -threshold) {
      await swipeTopCard("pass");
      return;
    }
    card.style.transition = "transform 0.22s ease";
    card.style.transform = "";
    paintStamps(card, 0);
    currentX = 0;
  };

  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);
}

function paintStamps(card, dx) {
  const likeStamp = card.querySelector(".stamp.like");
  const passStamp = card.querySelector(".stamp.pass");
  const likeAlpha = Math.max(0, Math.min(1, dx / 120));
  const passAlpha = Math.max(0, Math.min(1, -dx / 120));
  likeStamp.style.opacity = String(likeAlpha);
  passStamp.style.opacity = String(passAlpha);
}

async function swipeTopCard(direction) {
  if (state.swiping || !state.user || !state.stack.length) {
    return;
  }
  state.swiping = true;
  const topCard = deckEl.querySelector(".card:last-child");
  const target = state.stack[0];

  if (topCard) {
    const x = direction === "like" ? window.innerWidth * 1.1 : -window.innerWidth * 1.1;
    topCard.style.transition = "transform 0.28s ease";
    topCard.style.transform = `translateX(${x}px) rotate(${direction === "like" ? 18 : -18}deg)`;
  }

  await sleep(240);

  const response = await postJson("/api/swipes", {
    userId: state.user.id,
    targetId: target.id,
    direction,
  }).catch(() => null);

  state.stack.shift();
  renderDeck();
  setStatus(direction === "like" ? "Te gusta este perfil." : "Perfil descartado.");

  if (response?.ok && response.isMatch) {
    const title = `Match con ${target.name}`;
    showToast(title);
    notifyAndroidLocal(title, "Tienen match en Matcha.");
    maybeBrowserNotify(title, "Abrir Matcha para ver el match.");
    await refreshMatches();
  }

  if (state.stack.length < 3) {
    await refreshStack();
  }

  state.swiping = false;
}

function renderMatches(matches) {
  matchesListEl.innerHTML = "";
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = "Todavia no hay matches.";
    matchesListEl.appendChild(empty);
    return;
  }

  for (const item of matches) {
    const wrap = document.createElement("article");
    wrap.className = "match-item";
    wrap.innerHTML = `
      <img src="${item.user.photoUrl}" alt="${escapeHtml(item.user.name)}" loading="lazy" />
      <div>
        <p class="match-name">${escapeHtml(item.user.name)}, ${item.user.age}</p>
        <p class="match-city">${escapeHtml(item.user.city || "Sin ciudad")}</p>
      </div>
    `;
    matchesListEl.appendChild(wrap);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("sw_register_failed", err);
  }
}

async function enableNotifications() {
  if (!state.user) {
    showToast("Primero crea tu perfil.");
    return;
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    showToast("Este navegador no soporta notificaciones push.");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    showToast("Permiso de notificaciones denegado.");
    return;
  }

  try {
    const keyResp = await getJson("/api/push/public-key");
    if (!keyResp?.ok || !keyResp.publicKey) {
      throw new Error("missing_public_key");
    }
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyResp.publicKey),
      });
    }

    await postJson("/api/push/subscribe", {
      userId: state.user.id,
      subscription,
    });
    showToast("Notificaciones activadas.");
  } catch (err) {
    console.error(err);
    showToast("No se pudo activar notificaciones.");
  }
}

function setStatus(text) {
  statusTextEl.textContent = text;
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function notifyAndroidUser(userId) {
  if (window.AndroidBridge && typeof window.AndroidBridge.setUserId === "function") {
    window.AndroidBridge.setUserId(userId);
  }
}

function notifyAndroidLocal(title, body) {
  if (window.AndroidBridge && typeof window.AndroidBridge.notifyLocal === "function") {
    window.AndroidBridge.notifyLocal(title, body);
  }
}

function maybeBrowserNotify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch {
      // ignore
    }
  }
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status}`);
  }
  return res.json();
}

async function postJson(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`POST ${url} failed: ${res.status}`);
  }
  return res.json();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
