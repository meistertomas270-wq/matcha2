const state = {
  user: null,
  tab: "swipe",
  stack: [],
  matches: [],
  likesSummary: {
    likesReceived: 0,
    likesPreview: [],
    topPicks: [],
    matchesCount: 0,
  },
  likesMode: "likes",
  chats: [],
  chatSearch: "",
  activeChatId: null,
  activeChatMessages: [],
  swiping: false,
};

const screenTitleEl = document.getElementById("screenTitle");
const screenSubtitleEl = document.getElementById("screenSubtitle");
const navButtons = Array.from(document.querySelectorAll("[data-tab-btn]"));
const tabViews = Array.from(document.querySelectorAll("[data-tab-view]"));

const deckEl = document.getElementById("deck");
const swipeStatusEl = document.getElementById("swipeStatus");
const btnRewind = document.getElementById("btnRewind");
const btnPass = document.getElementById("btnPass");
const btnSuperLike = document.getElementById("btnSuperLike");
const btnLike = document.getElementById("btnLike");
const btnBoost = document.getElementById("btnBoost");

const exploreGridEl = document.getElementById("exploreGrid");

const btnLikesMode = document.getElementById("btnLikesMode");
const btnTopMode = document.getElementById("btnTopMode");
const likesHintEl = document.getElementById("likesHint");
const likesGridEl = document.getElementById("likesGrid");
const btnDiscoverLikes = document.getElementById("btnDiscoverLikes");

const chatSearchEl = document.getElementById("chatSearch");
const newMatchesRailEl = document.getElementById("newMatchesRail");
const chatListEl = document.getElementById("chatList");

const profileAvatarEl = document.getElementById("profileAvatar");
const profileNameEl = document.getElementById("profileName");
const profileBioEl = document.getElementById("profileBio");
const profileExtraEl = document.getElementById("profileExtra");
const statLikesEl = document.getElementById("statLikes");
const statMatchesEl = document.getElementById("statMatches");
const statChatsEl = document.getElementById("statChats");
const btnEditProfile = document.getElementById("btnEditProfile");

const btnNotif = document.getElementById("btnNotif");
const btnReset = document.getElementById("btnReset");
const btnNotifProfile = document.getElementById("btnNotifProfile");
const btnResetProfile = document.getElementById("btnResetProfile");

const onboardingDialog = document.getElementById("onboardingDialog");
const onboardingForm = document.getElementById("onboardingForm");

const chatDialog = document.getElementById("chatDialog");
const chatDialogTitleEl = document.getElementById("chatDialogTitle");
const chatDialogMetaEl = document.getElementById("chatDialogMeta");
const chatMessagesEl = document.getElementById("chatMessages");
const btnCloseChat = document.getElementById("btnCloseChat");
const chatComposer = document.getElementById("chatComposer");
const chatInput = document.getElementById("chatInput");

const toastEl = document.getElementById("toast");

const TAB_META = {
  swipe: {
    title: "Para ti",
    subtitle: () => `${state.stack.length || 0} perfiles listos para deslizar`,
  },
  explore: {
    title: "Explorar",
    subtitle: () => "Nuevas vibes, planes y objetivos en una sola vista.",
  },
  likes: {
    title: "Likes",
    subtitle: () => `${state.likesSummary.likesReceived || 0} personas te dieron like`,
  },
  chat: {
    title: "Chat",
    subtitle: () => `${state.chats.length || 0} conversaciones activas`,
  },
  profile: {
    title: "Perfil",
    subtitle: () => (state.user ? `${state.user.city || "Sin ciudad"} - Matcha` : "Tu cuenta"),
  },
};

const EXPLORE_ITEMS = [
  {
    title: "Relacion seria",
    subtitle: "Personas que quieren estabilidad real.",
    image:
      "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Estoy libre hoy",
    subtitle: "Planes espontaneos para hoy.",
    image:
      "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Food dates",
    subtitle: "Citas por cafe, ramen y brunch.",
    image:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Aire libre",
    subtitle: "Senderismo, bici y escapadas cortas.",
    image:
      "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80",
  },
];

const INTEREST_POOL = [
  "Naturaleza",
  "Musica",
  "Coffee",
  "Viajes",
  "Gym",
  "Cine",
  "Arte",
  "Series",
  "Pizza",
  "Gaming",
  "Yoga",
  "Fotografia",
];

bootstrap().catch((err) => {
  console.error("bootstrap_error", err);
  showToast("Error inicializando Matcha");
});

async function bootstrap() {
  bindEvents();
  renderExploreCatalog();
  renderScreenMeta();
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

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tabBtn;
      setTab(tab);
    });
  });

  btnRewind.addEventListener("click", () =>
    showToast("Rewind disponible en Matcha Plus")
  );
  btnPass.addEventListener("click", () => swipeTopCard("pass"));
  btnSuperLike.addEventListener("click", () => swipeTopCard("superlike"));
  btnLike.addEventListener("click", () => swipeTopCard("like"));
  btnBoost.addEventListener("click", () =>
    showToast("Boost disponible en Matcha Plus")
  );

  btnLikesMode.addEventListener("click", () => {
    state.likesMode = "likes";
    renderLikes();
  });
  btnTopMode.addEventListener("click", () => {
    state.likesMode = "top";
    renderLikes();
  });
  btnDiscoverLikes.addEventListener("click", () =>
    showToast("Proximamente: desbloqueo premium")
  );

  chatSearchEl.addEventListener("input", () => {
    state.chatSearch = chatSearchEl.value.trim().toLowerCase();
    renderChats();
  });

  btnEditProfile.addEventListener("click", () =>
    showToast("Usa 'Cambiar perfil' para recrear tu cuenta")
  );

  btnNotif.addEventListener("click", enableNotifications);
  btnNotifProfile.addEventListener("click", enableNotifications);

  btnReset.addEventListener("click", hardResetProfile);
  btnResetProfile.addEventListener("click", hardResetProfile);

  btnCloseChat.addEventListener("click", closeChatDialog);
  chatComposer.addEventListener("submit", onSendChatMessage);
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
    interests: parseCsvField(formData.get("interests")),
    relationshipGoal: String(formData.get("relationshipGoal") || ""),
    gender: String(formData.get("gender") || ""),
    sexualOrientation: String(formData.get("sexualOrientation") || ""),
    pronouns: String(formData.get("pronouns") || ""),
    heightCm: Number(formData.get("heightCm")) || null,
    languages: parseCsvField(formData.get("languages")),
    zodiacSign: String(formData.get("zodiacSign") || ""),
    education: String(formData.get("education") || ""),
    familyPlans: String(formData.get("familyPlans") || ""),
    loveStyle: String(formData.get("loveStyle") || ""),
    pets: String(formData.get("pets") || ""),
    drinking: String(formData.get("drinking") || ""),
    smoking: String(formData.get("smoking") || ""),
    workout: String(formData.get("workout") || ""),
    socialMedia: String(formData.get("socialMedia") || ""),
    aboutPromptQuestion: String(formData.get("aboutPromptQuestion") || ""),
    aboutPromptAnswer: String(formData.get("aboutPromptAnswer") || ""),
    askMe1: String(formData.get("askMe1") || ""),
    askMe2: String(formData.get("askMe2") || ""),
    askMe3: String(formData.get("askMe3") || ""),
    jobTitle: String(formData.get("jobTitle") || ""),
    company: String(formData.get("company") || ""),
    school: String(formData.get("school") || ""),
    livingIn: String(formData.get("livingIn") || ""),
    anthem: String(formData.get("anthem") || ""),
    spotifyArtists: parseCsvField(formData.get("spotifyArtists")),
    smartPhotosEnabled: isChecked("smartPhotosEnabled"),
    showAge: isChecked("showAge"),
    showDistance: isChecked("showDistance"),
  };

  const created = await postJson("/api/auth/guest", payload).catch(() => null);
  if (!created?.ok || !created.user) {
    showToast("No se pudo crear el perfil");
    return;
  }

  closeDialog(onboardingDialog);
  await setCurrentUser(created.user);
}

async function setCurrentUser(user) {
  state.user = user;
  localStorage.setItem("matcha_user_id", user.id);
  notifyAndroidUser(user.id);

  await refreshAllData();
  setTab("swipe");
  renderProfile();
  showToast(`Bienvenido ${user.name}`);
}

async function refreshAllData() {
  await Promise.all([
    refreshStack(),
    refreshMatches(),
    refreshLikesSummary(),
    refreshChats(),
  ]);
}

async function refreshStack() {
  if (!state.user) return;
  const response = await getJson(
    `/api/profiles/stack?userId=${encodeURIComponent(state.user.id)}&limit=18`
  ).catch(() => null);
  state.stack = response?.ok && Array.isArray(response.profiles) ? response.profiles : [];
  renderSwipeDeck();
}

async function refreshMatches() {
  if (!state.user) return;
  const response = await getJson(
    `/api/matches?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);
  state.matches = response?.ok && Array.isArray(response.matches) ? response.matches : [];
  renderChats();
  renderProfile();
  renderScreenMeta();
}

async function refreshLikesSummary() {
  if (!state.user) return;
  const response = await getJson(
    `/api/likes/summary?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);

  if (response?.ok) {
    state.likesSummary = {
      likesReceived: Number(response.likesReceived || 0),
      likesPreview: Array.isArray(response.likesPreview) ? response.likesPreview : [],
      topPicks: Array.isArray(response.topPicks) ? response.topPicks : [],
      matchesCount: Number(response.matchesCount || 0),
    };
  } else {
    state.likesSummary = {
      likesReceived: 0,
      likesPreview: [],
      topPicks: [],
      matchesCount: state.matches.length,
    };
  }

  renderLikes();
  renderProfile();
  renderScreenMeta();
}

async function refreshChats() {
  if (!state.user) return;
  const response = await getJson(
    `/api/chats?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);
  state.chats = response?.ok && Array.isArray(response.chats) ? response.chats : [];
  renderChats();
  renderProfile();
  renderScreenMeta();
}

function setTab(tab) {
  if (!TAB_META[tab]) return;
  state.tab = tab;

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabBtn === tab);
  });
  tabViews.forEach((view) => {
    view.classList.toggle("active", view.dataset.tabView === tab);
  });
  renderScreenMeta();

  if (tab === "likes") {
    refreshLikesSummary();
  }
  if (tab === "chat") {
    refreshChats();
  }
  if (tab === "swipe" && state.stack.length < 3) {
    refreshStack();
  }
}

function renderScreenMeta() {
  const current = TAB_META[state.tab];
  screenTitleEl.textContent = current.title;
  screenSubtitleEl.textContent = current.subtitle();
}

function renderExploreCatalog() {
  exploreGridEl.innerHTML = "";
  EXPLORE_ITEMS.forEach((item) => {
    const card = document.createElement("article");
    card.className = "explore-card";
    card.innerHTML = `
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />
      <div class="explore-info">
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.subtitle)}</p>
      </div>
    `;
    exploreGridEl.appendChild(card);
  });
}

function renderSwipeDeck() {
  deckEl.innerHTML = "";

  if (!state.stack.length) {
    deckEl.innerHTML = `<div class="empty-state">No hay mas perfiles por ahora</div>`;
    swipeStatusEl.textContent = "Sin perfiles. Prueba mas tarde.";
    renderScreenMeta();
    return;
  }

  const visibleCards = state.stack.slice(0, 3);
  for (let i = visibleCards.length - 1; i >= 0; i -= 1) {
    const profile = visibleCards[i];
    const card = createSwipeCard(profile, i === 0, i);
    deckEl.appendChild(card);
  }

  swipeStatusEl.textContent = `${state.stack.length} perfiles en cola`;
  renderScreenMeta();
}

function createSwipeCard(profile, isTop, index) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.userId = profile.id;
  card.style.backgroundImage = `url("${escapeHtml(profile.photoUrl)}")`;
  card.style.transform = `scale(${1 - index * 0.035}) translateY(${index * 8}px)`;
  card.style.zIndex = String(20 - index);

  const tags =
    Array.isArray(profile.interests) && profile.interests.length
      ? profile.interests.slice(0, 3)
      : buildInterests(profile.id);
  card.innerHTML = `
    <div class="stamp pass">NOPE</div>
    <div class="stamp like">LIKE</div>
    <div class="card-meta">
      <h3 class="card-title">${escapeHtml(profile.name)}, ${Number(profile.age) || 0}</h3>
      <p class="card-subtitle">${escapeHtml(profile.city || "Sin ciudad")} - ${escapeHtml(
    profile.bio || ""
  )}</p>
      <div class="card-tags">
        ${tags.map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
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
  let deltaX = 0;

  card.addEventListener("pointerdown", (event) => {
    if (state.swiping) return;
    dragging = true;
    startX = event.clientX;
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragging || state.swiping) return;
    deltaX = event.clientX - startX;
    const rotate = deltaX * 0.05;
    card.style.transition = "none";
    card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
    paintStamps(card, deltaX);
  });

  const release = async () => {
    if (!dragging || state.swiping) return;
    dragging = false;
    const threshold = 95;
    if (deltaX > threshold) {
      await swipeTopCard("like");
      return;
    }
    if (deltaX < -threshold) {
      await swipeTopCard("pass");
      return;
    }
    card.style.transition = "transform 0.2s ease";
    card.style.transform = "";
    paintStamps(card, 0);
    deltaX = 0;
  };

  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);
}

function paintStamps(card, dx) {
  const likeStamp = card.querySelector(".stamp.like");
  const passStamp = card.querySelector(".stamp.pass");
  likeStamp.style.opacity = String(Math.max(0, Math.min(1, dx / 120)));
  passStamp.style.opacity = String(Math.max(0, Math.min(1, -dx / 120)));
}

async function swipeTopCard(direction) {
  if (!state.user || !state.stack.length || state.swiping) return;

  const apiDirection = direction === "superlike" ? "like" : direction;
  if (!["like", "pass"].includes(apiDirection)) return;

  state.swiping = true;
  const target = state.stack[0];
  const topCard = deckEl.querySelector(".card:last-child");

  if (topCard) {
    const toX = apiDirection === "like" ? window.innerWidth * 1.08 : -window.innerWidth * 1.08;
    const rot = apiDirection === "like" ? 16 : -16;
    topCard.style.transition = "transform 0.25s ease";
    topCard.style.transform = `translateX(${toX}px) rotate(${rot}deg)`;
  }

  await sleep(220);

  const response = await postJson("/api/swipes", {
    userId: state.user.id,
    targetId: target.id,
    direction: apiDirection,
  }).catch(() => null);

  state.stack.shift();
  renderSwipeDeck();
  swipeStatusEl.textContent =
    apiDirection === "like" ? "Te gusta este perfil" : "Perfil descartado";

  if (response?.ok && response.isMatch) {
    const title = `Match con ${target.name}`;
    showToast(title);
    maybeBrowserNotify(title, "Abre Chat para hablar");
    notifyAndroidLocal(title, "Hay match en Matcha");
    await Promise.all([refreshMatches(), refreshChats(), refreshLikesSummary()]);
  } else if (state.stack.length < 3) {
    await refreshStack();
  }

  state.swiping = false;
}

function renderLikes() {
  const isLikesMode = state.likesMode === "likes";
  btnLikesMode.classList.toggle("active", isLikesMode);
  btnTopMode.classList.toggle("active", !isLikesMode);
  btnLikesMode.textContent = `${state.likesSummary.likesReceived} Likes`;

  const list = isLikesMode ? state.likesSummary.likesPreview : state.likesSummary.topPicks;
  likesGridEl.innerHTML = "";

  if (!list.length) {
    likesGridEl.innerHTML = `<div class="empty-state">No hay perfiles para mostrar</div>`;
    likesHintEl.textContent = isLikesMode
      ? "Todavia no hay likes pendientes en tu area."
      : "Todavia no hay top picks disponibles.";
    return;
  }

  likesHintEl.textContent = isLikesMode
    ? "Asciende a Gold y descubre quien ya te dio like."
    : "Top picks elegidos para tu perfil.";

  list.forEach((profile) => {
    const card = document.createElement("article");
    card.className = `like-card ${isLikesMode ? "blur" : ""}`;
    card.innerHTML = `
      <img src="${escapeHtml(profile.photoUrl || "")}" alt="${escapeHtml(profile.name || "")}" loading="lazy" />
      <div class="like-meta">
        <h5>${escapeHtml(profile.name || "Perfil")}, ${Number(profile.age) || 0}</h5>
        <p>${escapeHtml(profile.city || "Sin ciudad")}</p>
      </div>
    `;
    likesGridEl.appendChild(card);
  });
}

function renderChats() {
  renderNewMatchesRail();
  renderChatList();
}

function renderNewMatchesRail() {
  newMatchesRailEl.innerHTML = "";
  if (!state.matches.length) {
    newMatchesRailEl.innerHTML = `<div class="empty-state">Todavia no hay matches</div>`;
    return;
  }

  state.matches.slice(0, 12).forEach((match) => {
    const chip = document.createElement("button");
    chip.className = "match-chip";
    chip.type = "button";
    chip.innerHTML = `
      <img src="${escapeHtml(match.user.photoUrl || "")}" alt="${escapeHtml(match.user.name || "")}" />
      <span>${escapeHtml(match.user.name || "")}</span>
    `;
    chip.addEventListener("click", () => {
      const chat = state.chats.find((c) => c.user.id === match.user.id);
      if (chat) {
        openChatDialog(chat.chatId);
      } else {
        showToast("Este match aun no tiene chat activo");
      }
    });
    newMatchesRailEl.appendChild(chip);
  });
}

function renderChatList() {
  const needle = state.chatSearch;
  const chats = state.chats.filter((chat) => {
    if (!needle) return true;
    const n = String(chat.user.name || "").toLowerCase();
    const b = String(chat.lastMessage || "").toLowerCase();
    return n.includes(needle) || b.includes(needle);
  });

  chatListEl.innerHTML = "";
  if (!chats.length) {
    chatListEl.innerHTML = `<div class="empty-state">Sin conversaciones por ahora</div>`;
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement("article");
    item.className = "chat-item";
    item.innerHTML = `
      <img src="${escapeHtml(chat.user.photoUrl || "")}" alt="${escapeHtml(chat.user.name || "")}" />
      <div class="chat-main">
        <h4>${escapeHtml(chat.user.name || "Chat")}${chat.user.isOnline ? "  - activo" : ""}</h4>
        <p>${escapeHtml(chat.lastMessage || "")}</p>
      </div>
      <div class="chat-meta">
        <span class="chat-time">${formatTimeAgo(chat.lastMessageAt)}</span>
        <span class="chat-badge ${chat.unreadCount ? "" : "hidden"}">${chat.unreadCount || ""}</span>
      </div>
    `;
    item.addEventListener("click", () => openChatDialog(chat.chatId));
    chatListEl.appendChild(item);
  });
}

async function openChatDialog(chatId) {
  if (!state.user) return;
  const chat = state.chats.find((c) => c.chatId === chatId);
  if (!chat) return;

  state.activeChatId = chatId;
  chatDialogTitleEl.textContent = chat.user.name || "Chat";
  chatDialogMetaEl.textContent = `${chat.user.age || ""} ${chat.user.city || ""}`.trim();
  chatMessagesEl.innerHTML = `<div class="empty-state">Cargando mensajes...</div>`;
  openDialog(chatDialog);

  const response = await getJson(
    `/api/chats/${encodeURIComponent(chatId)}/messages?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);

  state.activeChatMessages =
    response?.ok && Array.isArray(response.messages) ? response.messages : [];
  markChatAsRead(chatId);
  renderChatMessages();
}

function closeChatDialog() {
  closeDialog(chatDialog);
  state.activeChatId = null;
  state.activeChatMessages = [];
}

function renderChatMessages() {
  if (!state.activeChatMessages.length) {
    chatMessagesEl.innerHTML = `<div class="empty-state">Sin mensajes todavia</div>`;
    return;
  }

  chatMessagesEl.innerHTML = "";
  state.activeChatMessages.forEach((message) => {
    const bubble = document.createElement("article");
    const mine = message.senderId === state.user?.id;
    bubble.className = `bubble ${mine ? "me" : "them"}`;
    bubble.innerHTML = `
      <div>${escapeHtml(message.body || "")}</div>
      <div class="bubble-time">${formatTimeAgo(message.createdAt)}</div>
    `;
    chatMessagesEl.appendChild(bubble);
  });
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

async function onSendChatMessage(event) {
  event.preventDefault();
  if (!state.user || !state.activeChatId) return;

  const body = String(chatInput.value || "").trim();
  if (!body) return;

  chatInput.value = "";
  const payload = {
    userId: state.user.id,
    body,
  };

  const response = await postJson(
    `/api/chats/${encodeURIComponent(state.activeChatId)}/messages`,
    payload
  ).catch(() => null);

  if (!response?.ok || !response.message) {
    showToast("No se pudo enviar");
    return;
  }

  state.activeChatMessages.push(response.message);
  renderChatMessages();
  refreshChats();
}

function markChatAsRead(chatId) {
  state.chats = state.chats.map((chat) =>
    chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat
  );
  renderChatList();
}

function renderProfile() {
  if (!state.user) return;
  profileAvatarEl.src = state.user.photoUrl || buildFallbackPhoto(state.user.id);
  profileNameEl.textContent = `${state.user.name}, ${Number(state.user.age) || 0}`;
  profileBioEl.textContent = `${state.user.bio || "Sin bio"} - ${state.user.city || "Sin ciudad"}`;
  profileExtraEl.innerHTML = buildProfileFacts(state.user);

  statLikesEl.textContent = String(state.likesSummary.likesReceived || 0);
  statMatchesEl.textContent = String(state.likesSummary.matchesCount || state.matches.length || 0);
  statChatsEl.textContent = String(state.chats.length || 0);
}

function hardResetProfile() {
  localStorage.removeItem("matcha_user_id");
  window.location.reload();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.warn("sw_register_failed", err);
  }
}

async function enableNotifications() {
  if (!state.user) {
    showToast("Primero crea tu perfil");
    return;
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    showToast("Push no soportado en este navegador");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    showToast("Permiso de notificaciones denegado");
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
    showToast("Notificaciones activadas");
  } catch (err) {
    console.error("enable_notifications_error", err);
    showToast("No se pudo activar push");
  }
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
      // eslint-disable-next-line no-new
      new Notification(title, { body });
    } catch {
      // ignore
    }
  }
}

function openOnboarding() {
  openDialog(onboardingDialog);
}

function openDialog(dialog) {
  if (!dialog) return;
  if (dialog.hasAttribute("open")) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "open");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function buildProfileFacts(user) {
  const items = [];
  pushProfileFact(items, "Meta", user.relationshipGoal);
  pushProfileFact(items, "Intereses", Array.isArray(user.interests) ? user.interests.join(", ") : "");
  pushProfileFact(items, "Sexo", user.gender);
  pushProfileFact(items, "Orientacion", user.sexualOrientation);
  pushProfileFact(items, "Pronombres", user.pronouns);
  pushProfileFact(items, "Altura", user.heightCm ? `${user.heightCm} cm` : "");
  pushProfileFact(items, "Idiomas", Array.isArray(user.languages) ? user.languages.join(", ") : "");
  pushProfileFact(items, "Educacion", user.education);
  pushProfileFact(items, "Familia", user.familyPlans);
  pushProfileFact(items, "Mascotas", user.pets);
  pushProfileFact(items, "Beber", user.drinking);
  pushProfileFact(items, "Fumar", user.smoking);
  pushProfileFact(items, "Ejercicio", user.workout);
  pushProfileFact(items, "Puesto", user.jobTitle);
  pushProfileFact(items, "Compania", user.company);
  pushProfileFact(items, "Estudios", user.school);
  pushProfileFact(items, "Vive en", user.livingIn);
  pushProfileFact(items, "Cancion", user.anthem);
  pushProfileFact(
    items,
    "Spotify",
    Array.isArray(user.spotifyArtists) ? user.spotifyArtists.join(", ") : ""
  );
  if (!items.length) {
    return '<div class="profile-fact">Completa tu perfil para mejorar tus matches</div>';
  }
  return items.join("");
}

function pushProfileFact(items, label, value) {
  if (!value) return;
  items.push(`<div class="profile-fact"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>`);
}

function buildInterests(seed) {
  const hash = hashString(seed || "");
  const first = INTEREST_POOL[hash % INTEREST_POOL.length];
  const second = INTEREST_POOL[(hash + 3) % INTEREST_POOL.length];
  const third = INTEREST_POOL[(hash + 7) % INTEREST_POOL.length];
  return [first, second, third];
}

function parseCsvField(raw) {
  return String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isChecked(name) {
  const field = onboardingForm.elements.namedItem(name);
  return Boolean(field && field.checked);
}

function buildFallbackPhoto(seed) {
  return `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80&seed=${encodeURIComponent(
    seed
  )}`;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function formatTimeAgo(isoDate) {
  if (!isoDate) return "";
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  if (Number.isNaN(date)) return "";
  const diffMs = Math.max(0, now - date);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed ${response.status}`);
  }
  return response.json();
}

async function postJson(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`POST ${url} failed ${response.status}`);
  }
  return response.json();
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
