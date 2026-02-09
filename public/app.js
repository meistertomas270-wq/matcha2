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
  loading: {
    auth: false,
    stack: false,
    likes: false,
    chats: false,
  },
  onboardingPhotoUrls: [],
  lastFetchAt: {
    stack: 0,
    matches: 0,
    likes: 0,
    chats: 0,
  },
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
const profileBadgeEl = document.getElementById("profileBadge");
const profileCompletionEl = document.getElementById("profileCompletion");
const perkSuperlikesEl = document.getElementById("perkSuperlikes");
const perkBoostsEl = document.getElementById("perkBoosts");
const perkLikesEl = document.getElementById("perkLikes");
const statLikesEl = document.getElementById("statLikes");
const statMatchesEl = document.getElementById("statMatches");
const statChatsEl = document.getElementById("statChats");
const btnEditProfile = document.getElementById("btnEditProfile");
const btnPreviewProfile = document.getElementById("btnPreviewProfile");

const btnNotif = document.getElementById("btnNotif");
const btnReset = document.getElementById("btnReset");
const btnNotifProfile = document.getElementById("btnNotifProfile");
const btnResetProfile = document.getElementById("btnResetProfile");
const btnLogoutProfile = document.getElementById("btnLogoutProfile");

const authDialog = document.getElementById("authDialog");
const btnAuthLoginTab = document.getElementById("btnAuthLoginTab");
const btnAuthRegisterTab = document.getElementById("btnAuthRegisterTab");
const loginForm = document.getElementById("loginForm");
const loginSubmitBtn = loginForm?.querySelector('button[type="submit"]');
const authErrorEl = document.getElementById("authError");
const registerForm = document.getElementById("registerForm");
const registerSubmitBtn = registerForm?.querySelector('button[type="submit"]');
const registerPassword = document.getElementById("registerPassword");
const registerPasswordConfirm = document.getElementById("registerPasswordConfirm");

const onboardingDialog = document.getElementById("onboardingDialog");
const onboardingForm = document.getElementById("onboardingForm");
const onboardingSubmitBtn = onboardingForm?.querySelector('button[type="submit"]');
const dobInput = document.getElementById("dobInput");
const ageInput = document.getElementById("ageInput");
const zodiacInput = document.getElementById("zodiacInput");
const showZodiacInput = document.getElementById("showZodiacInput");
const zodiacHint = document.getElementById("zodiacHint");
const photoFilesInput = document.getElementById("photoFilesInput");
const photoUrlsInput = document.getElementById("photoUrlsInput");
const photoCountHint = document.getElementById("photoCountHint");
const photoPreview = document.getElementById("photoPreview");
const onboardingProgressBar = document.getElementById("onboardingProgressBar");
const onboardingProgressText = document.getElementById("onboardingProgressText");
const interestsPicker = document.getElementById("interestsPicker");
const interestsInput = document.getElementById("interestsInput");
const relationshipPicker = document.getElementById("relationshipPicker");
const relationshipGoalInput = document.getElementById("relationshipGoalInput");
const languagesPicker = document.getElementById("languagesPicker");
const languagesInput = document.getElementById("languagesInput");
const politicsInput = document.getElementById("politicsInput");
const pronounsWrap = document.getElementById("pronounsWrap");
const employedInput = document.getElementById("employedInput");
const workWrap = document.getElementById("workWrap");
const btnSearchOsm = document.getElementById("btnSearchOsm");
const osmQuery = document.getElementById("osmQuery");
const osmResults = document.getElementById("osmResults");
const livingInInput = document.getElementById("livingInInput");

const chatDialog = document.getElementById("chatDialog");
const chatDialogTitleEl = document.getElementById("chatDialogTitle");
const chatDialogMetaEl = document.getElementById("chatDialogMeta");
const chatMessagesEl = document.getElementById("chatMessages");
const btnCloseChat = document.getElementById("btnCloseChat");
const chatComposer = document.getElementById("chatComposer");
const chatInput = document.getElementById("chatInput");
const profilePreviewDialog = document.getElementById("profilePreviewDialog");
const profilePreviewCard = document.getElementById("profilePreviewCard");
const btnCloseProfilePreview = document.getElementById("btnCloseProfilePreview");
const swipeProfileDialog = document.getElementById("swipeProfileDialog");
const swipeProfileCard = document.getElementById("swipeProfileCard");
const btnCloseSwipeProfile = document.getElementById("btnCloseSwipeProfile");

const toastEl = document.getElementById("toast");

const TAB_META = {
  swipe: {
    title: "Para ti",
    subtitle: () => `${state.stack.length || 0} perfiles listos para descubrir`,
  },
  explore: {
    title: "Explorar",
    subtitle: () => "Planes, vibes y personas nuevas en una vista.",
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
  enhanceNavLabels();
  bindEvents();
  renderExploreCatalog();
  renderScreenMeta();
  registerServiceWorker().catch((err) => {
    console.warn("sw_register_failed", err);
  });

  const cachedUserId = localStorage.getItem("matcha_user_id");
  if (!cachedUserId) {
    openAuth();
    return;
  }

  const warmUser = readWarmUserCache(cachedUserId);
  if (warmUser) {
    await setCurrentUser(warmUser, { silent: true, refresh: false, persistWarmCache: false });
  }

  const me = await getJson(`/api/users/${cachedUserId}`).catch(() => null);
  if (!me?.ok || !me.user) {
    if (!warmUser) {
      localStorage.removeItem("matcha_user_id");
      localStorage.removeItem("matcha_user_warm");
      openAuth();
    }
    return;
  }

  await setCurrentUser(me.user, { silent: true });
  if (!isProfileComplete(me.user)) {
    openOnboarding();
  }
}

function bindEvents() {
  loginForm?.addEventListener("submit", onLoginSubmit);
  registerForm?.addEventListener("submit", onRegisterSubmit);
  btnAuthLoginTab?.addEventListener("click", () => setAuthTab("login"));
  btnAuthRegisterTab?.addEventListener("click", () => setAuthTab("register"));
  onboardingForm.addEventListener("submit", onCreateProfile);
  onboardingForm.addEventListener("input", updateOnboardingProgress);
  onboardingForm.addEventListener("change", updateOnboardingProgress);
  bindChipPicker(interestsPicker, interestsInput, Number(interestsPicker?.dataset.max || 6));
  bindChipPicker(languagesPicker, languagesInput, Number(languagesPicker?.dataset.max || 4));
  bindChipPicker(relationshipPicker, relationshipGoalInput, 1);
  bindFoldSelects();

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

  btnEditProfile.addEventListener("click", openOnboarding);
  btnPreviewProfile?.addEventListener("click", openProfilePreview);

  btnNotif.addEventListener("click", enableNotifications);
  btnNotifProfile.addEventListener("click", enableNotifications);

  btnReset.addEventListener("click", hardResetProfile);
  btnResetProfile.addEventListener("click", hardResetProfile);
  btnLogoutProfile?.addEventListener("click", hardResetProfile);

  btnCloseChat.addEventListener("click", closeChatDialog);
  btnCloseProfilePreview?.addEventListener("click", closeProfilePreview);
  btnCloseSwipeProfile?.addEventListener("click", closeSwipeProfile);
  chatComposer.addEventListener("submit", onSendChatMessage);

  dobInput?.addEventListener("change", syncBirthData);
  photoFilesInput?.addEventListener("change", onPhotosChanged);
  politicsInput?.addEventListener("change", syncPoliticsPronouns);
  employedInput?.addEventListener("change", syncWorkFields);
  btnSearchOsm?.addEventListener("click", searchOsmLocation);
  showZodiacInput?.addEventListener("change", syncBirthData);

  syncPoliticsPronouns();
  syncWorkFields();
  updateOnboardingProgress();
}

async function onCreateProfile(event) {
  event.preventDefault();
  setOnboardingSubmitting(true);
  syncBirthData();
  const selectedInterests = parseCsvField(interestsInput?.value || "");
  const selectedGoal = String(relationshipGoalInput?.value || "").trim();
  if (!selectedInterests.length) {
    showToast("Selecciona al menos 1 interes");
    setOnboardingSubmitting(false);
    return;
  }
  if (!selectedGoal) {
    showToast("Selecciona que tipo de relacion buscas");
    setOnboardingSubmitting(false);
    return;
  }
  const selectedLiving = String(livingInInput?.value || onboardingForm.elements.namedItem("livingIn")?.value || "").trim();
  if (!selectedLiving) {
    showToast("Selecciona donde vives");
    setOnboardingSubmitting(false);
    return;
  }
  let photoUrls = Array.isArray(state.onboardingPhotoUrls) ? state.onboardingPhotoUrls.slice(0, 5) : [];
  if (!photoUrls.length && photoFilesInput?.files?.length) {
    photoUrls = await readPhotoFiles(photoFilesInput?.files);
    state.onboardingPhotoUrls = photoUrls.slice(0, 5);
  }
  if (!photoUrls.length && Array.isArray(state.user?.photoUrls) && state.user.photoUrls.length) {
    photoUrls = state.user.photoUrls.slice(0, 5);
  }
  if (!photoUrls.length) {
    showToast("Sube al menos 1 foto");
    setOnboardingSubmitting(false);
    return;
  }
  if (photoUrls.length > 5) {
    showToast("Maximo 5 fotos");
    setOnboardingSubmitting(false);
    return;
  }
  photoUrlsInput.value = `${photoUrls.length} fotos`;

  const formData = new FormData(onboardingForm);
  const payload = {
    name: String(formData.get("name") || ""),
    age: Number(formData.get("age")) || 25,
    dob: String(formData.get("dob") || ""),
    city: selectedLiving,
    bio: String(formData.get("bio") || ""),
    photoUrls,
    photoUrl: String(photoUrls[0] || ""),
    interests: selectedInterests,
    relationshipGoal: selectedGoal,
    politics: String(formData.get("politics") || "derecha"),
    gender: String(formData.get("gender") || ""),
    sexualOrientation: String(formData.get("sexualOrientation") || ""),
    pronouns: String(formData.get("pronouns") || ""),
    heightCm: Number(formData.get("heightCm")) || null,
    languages: parseCsvField(formData.get("languages")),
    zodiacSign: String(formData.get("zodiacSign") || ""),
    showZodiac: isChecked("showZodiac"),
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
    company: isChecked("employed") ? String(formData.get("company") || "") : "",
    school: String(formData.get("school") || ""),
    livingIn: selectedLiving,
    spotifyArtists: parseCsvField(formData.get("spotifyArtists")),
    smartPhotosEnabled: isChecked("smartPhotosEnabled"),
    showAge: isChecked("showAge"),
    showDistance: isChecked("showDistance"),
  };
  if (payload.politics !== "izquierda") {
    payload.pronouns = "";
  }

  const endpoint = state.user?.id
    ? `/api/users/${encodeURIComponent(state.user.id)}/profile`
    : "/api/auth/guest";
  const created = await postJson(endpoint, payload).catch((err) => ({ ok: false, error: err?.message || "" }));
  if (!created?.ok || !created.user) {
    showToast(created?.error || "No se pudo guardar el perfil");
    setOnboardingSubmitting(false);
    return;
  }

  closeDialog(onboardingDialog);
  state.onboardingPhotoUrls = [];
  setOnboardingSubmitting(false);
  updateOnboardingProgress();
  await setCurrentUser(created.user);
}

async function setCurrentUser(user, options = {}) {
  const { silent = false, refresh = true, persistWarmCache = true } = options;
  state.user = user;
  localStorage.setItem("matcha_user_id", user.id);
  if (persistWarmCache) {
    localStorage.setItem("matcha_user_warm", JSON.stringify(buildWarmUser(user)));
  }
  notifyAndroidUser(user.id);
  setTab("swipe");
  renderProfile();
  if (refresh) {
    refreshAllData(true);
  }
  if (!silent) {
    showToast(`Bienvenido ${user.name}`);
  }
}

async function refreshAllData(force = false) {
  await Promise.all([
    refreshStack(force),
    refreshMatches(force),
    refreshLikesSummary(force),
    refreshChats(force),
  ]);
}

async function refreshStack(force = false) {
  if (!state.user) return;
  if (!force && !isFetchStale("stack", 8000) && state.stack.length) return;
  if (state.loading.stack && !force) return;
  state.loading.stack = true;
  renderSwipeDeck();
  const response = await getJson(
    `/api/profiles/stack?userId=${encodeURIComponent(state.user.id)}&limit=18`
  ).catch(() => null);
  state.stack = response?.ok && Array.isArray(response.profiles) ? response.profiles : [];
  state.loading.stack = false;
  touchFetch("stack");
  renderSwipeDeck();
}

async function refreshMatches(force = false) {
  if (!state.user) return;
  if (!force && !isFetchStale("matches", 8000) && state.matches.length) return;
  const response = await getJson(
    `/api/matches?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);
  state.matches = response?.ok && Array.isArray(response.matches) ? response.matches : [];
  touchFetch("matches");
  renderChats();
  renderProfile();
  renderScreenMeta();
}

async function refreshLikesSummary(force = false) {
  if (!state.user) return;
  if (!force && !isFetchStale("likes", 10000) && state.likesSummary.likesReceived >= 0) return;
  if (state.loading.likes && !force) return;
  state.loading.likes = true;
  renderLikes();
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

  state.loading.likes = false;
  touchFetch("likes");
  renderLikes();
  renderProfile();
  renderScreenMeta();
}

async function refreshChats(force = false) {
  if (!state.user) return;
  if (!force && !isFetchStale("chats", 7000) && state.chats.length) return;
  if (state.loading.chats && !force) return;
  state.loading.chats = true;
  renderChats();
  const response = await getJson(
    `/api/chats?userId=${encodeURIComponent(state.user.id)}`
  ).catch(() => null);
  state.chats = response?.ok && Array.isArray(response.chats) ? response.chats : [];
  state.loading.chats = false;
  touchFetch("chats");
  renderChats();
  renderProfile();
  renderScreenMeta();
}

function setTab(tab) {
  if (!TAB_META[tab]) return;
  state.tab = tab;

  navButtons.forEach((button) => {
    const isActive = button.dataset.tabBtn === tab;
    button.classList.toggle("active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  tabViews.forEach((view) => {
    view.classList.toggle("active", view.dataset.tabView === tab);
  });
  renderScreenMeta();

  if (tab === "likes") {
    refreshLikesSummary(false);
  }
  if (tab === "chat") {
    refreshChats(false);
  }
  if (tab === "swipe" && state.stack.length < 3) {
    refreshStack(false);
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
  if (state.loading.stack) {
    deckEl.innerHTML = `
      <div class="skeleton card-skeleton"></div>
      <div class="skeleton card-skeleton secondary"></div>
    `;
    swipeStatusEl.textContent = "Cargando perfiles...";
    return;
  }

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
  const photos = getSwipePhotos(profile);
  card._profile = profile;
  card._photos = photos;
  card._photoIndex = 0;
  card.style.backgroundImage = `url("${escapeHtml(photos[0] || getPrimaryPhoto(profile))}")`;
  card.style.transform = `scale(${1 - index * 0.035}) translateY(${index * 8}px)`;
  card.style.zIndex = String(20 - index);

  const tags =
    Array.isArray(profile.interests) && profile.interests.length
      ? profile.interests.slice(0, 2)
      : buildInterests(profile.id);
  const relationship = String(profile.relationshipGoal || "").trim();
  const subtitleParts = [profile.city || "Sin ciudad"];
  if (relationship) subtitleParts.push(relationship);
  const photoSteps = photos
    .map((_, photoIndex) => `<span class="photo-step ${photoIndex === 0 ? "active" : ""}"></span>`)
    .join("");
  card.innerHTML = `
    <div class="card-photo-steps">${photoSteps}</div>
    <div class="swipe-tint pass"></div>
    <div class="swipe-tint like"></div>
    <div class="stamp pass">✕</div>
    <div class="stamp like">❤</div>
    <div class="card-meta">
      <h3 class="card-title">${escapeHtml(profile.name)}, ${Number(profile.age) || 0}</h3>
      <p class="card-subtitle">${escapeHtml(subtitleParts.join(" · "))}</p>
      <div class="card-tags">
        ${tags.map((tag) => `<span class="card-tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <button class="card-expand" type="button" aria-label="Ver perfil completo">⌄</button>
    </div>
  `;

  const expandBtn = card.querySelector(".card-expand");
  expandBtn?.addEventListener("pointerdown", (event) => event.stopPropagation());
  expandBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openSwipeProfile(profile);
  });

  if (isTop) {
    attachDrag(card);
  }
  return card;
}

function attachDrag(card) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let vibratedDirection = "";

  card.addEventListener("pointerdown", (event) => {
    if (state.swiping) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (!dragging || state.swiping) return;
    deltaX = event.clientX - startX;
    deltaY = event.clientY - startY;
    const rotate = deltaX * 0.05;
    card.style.transition = "none";
    card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
    paintStamps(card, deltaX);
    const direction = deltaX > 110 ? "like" : deltaX < -110 ? "pass" : "";
    if (direction && direction !== vibratedDirection && navigator.vibrate) {
      navigator.vibrate(8);
      vibratedDirection = direction;
    }
    if (!direction) {
      vibratedDirection = "";
    }
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
    const wasTap = Math.abs(deltaX) < 14 && Math.abs(deltaY) < 14;
    if (wasTap) {
      cycleCardPhoto(card, startX);
    }
    card.style.transition = "transform 0.2s ease";
    card.style.transform = "";
    paintStamps(card, 0);
    deltaX = 0;
    deltaY = 0;
  };

  card.addEventListener("pointerup", release);
  card.addEventListener("pointercancel", release);
}

function paintStamps(card, dx) {
  const likeStamp = card.querySelector(".stamp.like");
  const passStamp = card.querySelector(".stamp.pass");
  const likeTint = card.querySelector(".swipe-tint.like");
  const passTint = card.querySelector(".swipe-tint.pass");
  const likeProgress = Math.max(0, Math.min(1, dx / 140));
  const passProgress = Math.max(0, Math.min(1, -dx / 140));

  likeStamp.style.opacity = String(likeProgress);
  passStamp.style.opacity = String(passProgress);
  likeStamp.style.transform = `rotate(9deg) scale(${0.92 + likeProgress * 0.16})`;
  passStamp.style.transform = `rotate(-9deg) scale(${0.92 + passProgress * 0.16})`;
  if (likeTint) likeTint.style.opacity = String(likeProgress * 0.5);
  if (passTint) passTint.style.opacity = String(passProgress * 0.5);
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
    await Promise.all([refreshMatches(true), refreshChats(true), refreshLikesSummary(true)]);
  } else if (state.stack.length < 3) {
    await refreshStack(true);
  }

  state.swiping = false;
}

function renderLikes() {
  if (state.loading.likes) {
    likesGridEl.innerHTML = `<div class="skeleton tile-skeleton"></div><div class="skeleton tile-skeleton"></div>`;
    likesHintEl.textContent = "Cargando likes...";
    return;
  }
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
      <img src="${escapeHtml(getPrimaryPhoto(profile))}" alt="${escapeHtml(profile.name || "")}" loading="lazy" />
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
  if (state.loading.chats) {
    newMatchesRailEl.innerHTML =
      '<div class="skeleton mini-avatar-skeleton"></div><div class="skeleton mini-avatar-skeleton"></div><div class="skeleton mini-avatar-skeleton"></div>';
    return;
  }
  if (!state.matches.length) {
    newMatchesRailEl.innerHTML = `<div class="empty-state">Todavia no hay matches</div>`;
    return;
  }

  state.matches.slice(0, 12).forEach((match) => {
    const chip = document.createElement("button");
    chip.className = "match-chip";
    chip.type = "button";
    chip.innerHTML = `
      <img src="${escapeHtml(getPrimaryPhoto(match.user))}" alt="${escapeHtml(match.user.name || "")}" />
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
  if (state.loading.chats) {
    chatListEl.innerHTML =
      '<div class="skeleton line-skeleton"></div><div class="skeleton line-skeleton"></div><div class="skeleton line-skeleton"></div>';
    return;
  }
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
      <img src="${escapeHtml(getPrimaryPhoto(chat.user))}" alt="${escapeHtml(chat.user.name || "")}" />
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

function openProfilePreview() {
  if (!state.user || !profilePreviewCard) return;
  profilePreviewCard.innerHTML = buildPublicProfilePreview(state.user);
  openDialog(profilePreviewDialog);
}

function closeProfilePreview() {
  closeDialog(profilePreviewDialog);
}

async function openSwipeProfile(profile) {
  if (!profile || !swipeProfileCard) return;
  swipeProfileCard.innerHTML = `<div class="empty-state">Cargando perfil...</div>`;
  openDialog(swipeProfileDialog);
  const full = await getJson(`/api/users/${encodeURIComponent(profile.id)}`)
    .then((res) => (res?.ok ? res.user : null))
    .catch(() => null);
  swipeProfileCard.innerHTML = buildPublicProfilePreview(full || profile);
}

function closeSwipeProfile() {
  closeDialog(swipeProfileDialog);
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
  refreshChats(true);
}

function markChatAsRead(chatId) {
  state.chats = state.chats.map((chat) =>
    chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat
  );
  renderChatList();
}

function renderProfile() {
  if (!state.user) return;
  profileAvatarEl.src = getPrimaryPhoto(state.user);
  const safeAge = Number(state.user.age) || 0;
  profileNameEl.textContent = state.user.showAge ? `${state.user.name}, ${safeAge}` : state.user.name;
  profileBioEl.textContent = state.user.city || "Sin ciudad";
  profileExtraEl.innerHTML = buildProfileFacts(state.user);
  const completion = getProfileCompletionPercent(state.user);
  if (profileBadgeEl) profileBadgeEl.textContent = `${completion}%`;
  if (profileCompletionEl) profileCompletionEl.textContent = `${completion}%`;

  statLikesEl.textContent = String(state.likesSummary.likesReceived || 0);
  statMatchesEl.textContent = String(state.likesSummary.matchesCount || state.matches.length || 0);
  statChatsEl.textContent = String(state.chats.length || 0);
  if (perkLikesEl) {
    perkLikesEl.textContent = String(state.likesSummary.likesReceived || 0);
  }
  if (perkSuperlikesEl) {
    const remaining = Math.max(0, 5 - ((state.matches.length || 0) % 5));
    perkSuperlikesEl.textContent = String(remaining);
  }
  if (perkBoostsEl) {
    const boost = Math.max(0, 2 - ((state.likesSummary.likesReceived || 0) % 2));
    perkBoostsEl.textContent = String(boost);
  }
}

function hardResetProfile() {
  localStorage.removeItem("matcha_user_id");
  localStorage.removeItem("matcha_user_warm");
  window.location.reload();
}

async function onLoginSubmit(event) {
  event.preventDefault();
  if (state.loading.auth) return;
  state.loading.auth = true;
  setAuthSubmitting(true);
  setAuthError("");
  const formData = new FormData(loginForm);
  const payload = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  };

  try {
    const response = await postJson("/api/auth/login", payload).catch((err) => ({
      ok: false,
      error: err?.message || "",
    }));
    if (!response?.ok || !response.user) {
      const message = mapAuthError(response?.error);
      setAuthError(message);
      showToast(message);
      return;
    }

    closeDialog(authDialog);
    await setCurrentUser(response.user);
    if (!response.profileComplete || !isProfileComplete(response.user)) {
      openOnboarding();
    }
  } finally {
    state.loading.auth = false;
    setAuthSubmitting(false);
  }
}

async function onRegisterSubmit(event) {
  event.preventDefault();
  if (state.loading.auth) return;
  state.loading.auth = true;
  setAuthSubmitting(true);
  setAuthError("");
  if (!registerPassword || !registerPasswordConfirm) {
    state.loading.auth = false;
    setAuthSubmitting(false);
    return;
  }
  if (registerPassword.value !== registerPasswordConfirm.value) {
    setAuthError("Las contrasenas no coinciden");
    showToast("Las contrasenas no coinciden");
    state.loading.auth = false;
    setAuthSubmitting(false);
    return;
  }

  const formData = new FormData(registerForm);
  const payload = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  };
  const response = await postJson("/api/auth/register", payload).catch((err) => ({ ok: false, error: err?.message || "" }));
  if (!response?.ok || !response.user) {
    const message = response?.error || "No se pudo registrar";
    setAuthError(message);
    showToast(message);
    state.loading.auth = false;
    setAuthSubmitting(false);
    return;
  }

  closeDialog(authDialog);
  await setCurrentUser(response.user);
  openOnboarding();
  state.loading.auth = false;
  setAuthSubmitting(false);
}

function setAuthTab(mode) {
  const isLogin = mode === "login";
  btnAuthLoginTab?.classList.toggle("active", isLogin);
  btnAuthRegisterTab?.classList.toggle("active", !isLogin);
  loginForm?.classList.toggle("hidden", !isLogin);
  registerForm?.classList.toggle("hidden", isLogin);
  setAuthError("");
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
  closeDialog(authDialog);
  if (state.user) {
    hydrateOnboardingFromUser(state.user);
  } else {
    renderPhotoPreview([]);
    photoCountHint.textContent = "0/5 seleccionadas";
    state.onboardingPhotoUrls = [];
  }
  setOnboardingSubmitting(false);
  if (dobInput && !dobInput.value) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    dobInput.value = d.toISOString().slice(0, 10);
    syncBirthData();
  }
  updateOnboardingProgress();
  openDialog(onboardingDialog);
}

function openAuth() {
  closeDialog(onboardingDialog);
  loginForm?.reset();
  registerForm?.reset();
  setAuthTab("login");
  setAuthError("");
  openDialog(authDialog);
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
  pushProfileFact(items, "Politica", user.politics);
  pushProfileFact(items, "Sexo", user.gender);
  pushProfileFact(items, "Orientacion", user.sexualOrientation);
  pushProfileFact(items, "Pronombres", user.pronouns);
  pushProfileFact(items, "Altura", user.heightCm ? `${user.heightCm} cm` : "");
  pushProfileFact(items, "Idiomas", Array.isArray(user.languages) ? user.languages.join(", ") : "");
  if (user.showZodiac) {
    pushProfileFact(items, "Signo", user.zodiacSign);
  }
  pushProfileFact(items, "Educacion", user.education);
  pushProfileFact(items, "Familia", user.familyPlans);
  pushProfileFact(items, "Amor", user.loveStyle);
  pushProfileFact(items, "Mascotas", user.pets);
  pushProfileFact(items, "Beber", user.drinking);
  pushProfileFact(items, "Fumar", user.smoking);
  pushProfileFact(items, "Ejercicio", user.workout);
  pushProfileFact(items, "Redes", user.socialMedia);
  pushProfileFact(items, "Prompt", user.aboutPromptQuestion && user.aboutPromptAnswer ? `${user.aboutPromptQuestion} ${user.aboutPromptAnswer}` : "");
  pushProfileFact(items, "Preguntame", [user.askMe1, user.askMe2, user.askMe3].filter(Boolean).join(", "));
  pushProfileFact(items, "Puesto", user.jobTitle);
  pushProfileFact(items, "Compania", user.company);
  pushProfileFact(items, "Estudios", user.school);
  pushProfileFact(items, "Vive en", user.livingIn);
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

function buildPublicProfilePreview(user) {
  const ageText = user.showAge === false ? "" : `, ${Number(user.age) || 0}`;
  const mainLine = `${user.name || "Perfil"}${ageText}`;
  const subLine = user.city || user.livingIn || "Sin ciudad";
  const bio = String(user.bio || "").trim() || "Sin bio";
  const interests = Array.isArray(user.interests) ? user.interests.slice(0, 6) : [];
  return `
    <div class="preview-hero" style="background-image:url('${escapeHtml(getPrimaryPhoto(user))}')">
      <div class="preview-overlay">
        <h3>${escapeHtml(mainLine)}</h3>
        <p>${escapeHtml(subLine)}</p>
      </div>
    </div>
    <div class="preview-body">
      <p class="preview-bio">${escapeHtml(bio)}</p>
      <div class="preview-chips">
        ${interests.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="preview-facts">${buildProfileFacts(user)}</div>
    </div>
  `;
}

function getProfileCompletionPercent(user) {
  const checks = [
    String(user?.name || "").trim().length >= 2,
    String(user?.bio || "").trim().length >= 10,
    String(user?.city || user?.livingIn || "").trim().length > 0,
    String(user?.relationshipGoal || "").trim().length > 0,
    Array.isArray(user?.interests) && user.interests.length > 0,
    String(user?.gender || "").trim().length > 0,
    (Array.isArray(user?.photoUrls) && user.photoUrls.length > 0) || String(user?.photoUrl || "").trim().length > 0,
    Array.isArray(user?.languages) && user.languages.length > 0,
    String(user?.education || "").trim().length > 0,
    String(user?.workout || "").trim().length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
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

function hydrateOnboardingFromUser(user) {
  if (!user || !onboardingForm) return;
  setFormValue("name", user.name || "");
  setFormValue("bio", user.bio || "");
  setFormValue("dob", user.dob || "");
  setFormValue("gender", user.gender || "");
  setFormValue("sexualOrientation", user.sexualOrientation || "");
  setFormValue("pronouns", user.pronouns || "");
  setFormValue("heightCm", user.heightCm || "");
  setFormValue("education", user.education || "");
  setFormValue("familyPlans", user.familyPlans || "");
  setFormValue("loveStyle", user.loveStyle || "");
  setFormValue("pets", user.pets || "");
  setFormValue("drinking", user.drinking || "");
  setFormValue("smoking", user.smoking || "");
  setFormValue("workout", user.workout || "");
  setFormValue("socialMedia", user.socialMedia || "");
  setFormValue("aboutPromptQuestion", user.aboutPromptQuestion || "");
  setFormValue("aboutPromptAnswer", user.aboutPromptAnswer || "");
  setFormValue("askMe1", user.askMe1 || "");
  setFormValue("askMe2", user.askMe2 || "");
  setFormValue("askMe3", user.askMe3 || "");
  setFormValue("jobTitle", user.jobTitle || "");
  setFormValue("company", user.company || "");
  setFormValue("school", user.school || "");
  setFormValue("livingIn", user.livingIn || user.city || "");
  setFormValue(
    "spotifyArtists",
    Array.isArray(user.spotifyArtists) ? user.spotifyArtists.join(", ") : ""
  );

  politicsInput.value = user.politics || "derecha";
  showZodiacInput.checked = user.showZodiac !== false;
  syncPoliticsPronouns();
  syncWorkFields();
  setChipValues(interestsPicker, interestsInput, user.interests || []);
  setChipValues(languagesPicker, languagesInput, user.languages || []);
  setChipValues(
    relationshipPicker,
    relationshipGoalInput,
    user.relationshipGoal ? [user.relationshipGoal] : []
  );
  renderPhotoPreview(Array.isArray(user.photoUrls) ? user.photoUrls.slice(0, 5) : []);
  photoCountHint.textContent = Array.isArray(user.photoUrls)
    ? `${Math.min(user.photoUrls.length, 5)}/5 actuales`
    : "0/5 seleccionadas";
  syncBirthData();
  updateOnboardingProgress();
}

function setFormValue(name, value) {
  const field = onboardingForm.elements.namedItem(name);
  if (field) {
    field.value = String(value ?? "");
  }
}

function bindChipPicker(container, hiddenInput, maxSelection) {
  if (!container || !hiddenInput) return;
  container.addEventListener("click", (event) => {
    const button = event.target.closest(".chip-btn");
    if (!button) return;
    const isSingle = maxSelection === 1 || container.classList.contains("single");
    if (isSingle) {
      container.querySelectorAll(".chip-btn.active").forEach((el) => el.classList.remove("active"));
      button.classList.add("active");
    } else {
      const already = button.classList.contains("active");
      if (!already) {
        const selected = container.querySelectorAll(".chip-btn.active").length;
        if (selected >= maxSelection) {
          showToast(`Maximo ${maxSelection} seleccionados`);
          return;
        }
      }
      button.classList.toggle("active");
    }
    const values = Array.from(container.querySelectorAll(".chip-btn.active")).map((el) =>
      String(el.dataset.value || "").trim()
    );
    hiddenInput.value = values.join(",");
    updateOnboardingProgress();
  });
}

function setChipValues(container, hiddenInput, values) {
  if (!container || !hiddenInput) return;
  const set = new Set((Array.isArray(values) ? values : []).map((v) => String(v).trim()));
  container.querySelectorAll(".chip-btn").forEach((button) => {
    const value = String(button.dataset.value || "").trim();
    button.classList.toggle("active", set.has(value));
  });
  hiddenInput.value = Array.from(set).join(",");
  updateOnboardingProgress();
}

function bindFoldSelects() {
  document.querySelectorAll(".fold-select select").forEach((select) => {
    select.addEventListener("change", () => {
      const details = select.closest("details");
      if (details) details.open = false;
    });
  });
}

async function onPhotosChanged() {
  const files = photoFilesInput?.files;
  const count = files?.length || 0;
  photoCountHint.textContent = `${Math.min(count, 5)}/5 seleccionadas`;
  if (count > 5) {
    showToast("Maximo 5 fotos");
  }
  const previewUrls = await readPhotoFiles(files);
  state.onboardingPhotoUrls = previewUrls.slice(0, 5);
  renderPhotoPreview(previewUrls);
  updateOnboardingProgress();
}

function renderPhotoPreview(urls) {
  if (!photoPreview) return;
  const list = Array.isArray(urls) ? urls.slice(0, 5) : [];
  if (!list.length) {
    photoPreview.innerHTML = "";
    return;
  }
  photoPreview.innerHTML = list
    .map(
      (url, idx) =>
        `<img class="photo-preview-item" src="${escapeHtml(url)}" alt="Foto ${idx + 1}" loading="lazy" />`
    )
    .join("");
}

function syncPoliticsPronouns() {
  const isLeft = politicsInput?.value === "izquierda";
  pronounsWrap.hidden = !isLeft;
  if (!isLeft) {
    const field = onboardingForm.elements.namedItem("pronouns");
    if (field) field.value = "";
  }
}

function syncWorkFields() {
  workWrap.hidden = !employedInput?.checked;
  if (!employedInput?.checked) {
    const job = onboardingForm.elements.namedItem("jobTitle");
    const company = onboardingForm.elements.namedItem("company");
    if (job) job.value = "";
    if (company) company.value = "";
  }
}

function syncBirthData() {
  const dob = String(dobInput?.value || "");
  const info = calculateAgeAndZodiac(dob);
  ageInput.value = info.age ? String(info.age) : "";
  zodiacInput.value = info.zodiacSign;
  zodiacHint.textContent = `Signo calculado: ${info.zodiacSign || "-"}`;
}

function calculateAgeAndZodiac(dobIso) {
  if (!dobIso) return { age: null, zodiacSign: "" };
  const dob = new Date(`${dobIso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return { age: null, zodiacSign: "" };
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  const month = dob.getMonth() + 1;
  const day = dob.getDate();
  return { age: Math.max(18, age), zodiacSign: zodiacFromDate(day, month) };
}

function zodiacFromDate(day, month) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Tauro";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Geminis";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Escorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagitario";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricornio";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Acuario";
  return "Piscis";
}

async function readPhotoFiles(fileList) {
  const files = Array.from(fileList || []).slice(0, 5);
  const urls = [];
  for (const file of files) {
    if ((file.size || 0) > 3 * 1024 * 1024) {
      showToast(`Foto ${file.name} supera 3MB`);
      continue;
    }
    const data = await fileToDataUrl(file);
    if (data) urls.push(data);
  }
  return urls;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        const maxSize = 1280;
        const ratio = Math.min(1, maxSize / image.width, maxSize / image.height);
        const w = Math.max(1, Math.round(image.width * ratio));
        const h = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(image, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = () => resolve(src);
      image.src = src;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function searchOsmLocation() {
  const q = String(osmQuery?.value || "").trim();
  if (!q) return;
  osmResults.innerHTML = "Buscando...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
      q
    )}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
    const list = await response.json();
    renderOsmResults(Array.isArray(list) ? list : []);
  } catch {
    osmResults.innerHTML = "No se pudo buscar ubicacion";
  }
}

function renderOsmResults(results) {
  if (!results.length) {
    osmResults.innerHTML = "Sin resultados";
    return;
  }
  osmResults.innerHTML = "";
  results.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "osm-item";
    button.textContent = item.display_name || "Ubicacion";
    button.addEventListener("click", () => {
      livingInInput.value = String(item.display_name || "");
      osmQuery.value = String(item.display_name || "");
      osmResults.innerHTML = "Ubicacion seleccionada";
      const details = osmResults.closest("details");
      if (details) details.open = false;
    });
    osmResults.appendChild(button);
  });
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

function getPrimaryPhoto(profile) {
  if (Array.isArray(profile?.photoUrls) && profile.photoUrls.length) {
    return profile.photoUrls[0];
  }
  return profile?.photoUrl || buildFallbackPhoto(profile?.id || "fallback");
}

function getSwipePhotos(profile) {
  if (Array.isArray(profile?.photoThumbUrls) && profile.photoThumbUrls.length) {
    return profile.photoThumbUrls.slice(0, 6);
  }
  if (Array.isArray(profile?.photoUrls) && profile.photoUrls.length) {
    return profile.photoUrls.slice(0, 6);
  }
  return [getPrimaryPhoto(profile)];
}

function cycleCardPhoto(card, pointerX) {
  const photos = Array.isArray(card?._photos) ? card._photos : [];
  if (!photos.length) return;
  const rect = card.getBoundingClientRect();
  const goPrevious = pointerX < rect.left + rect.width * 0.42;
  if (goPrevious) {
    card._photoIndex = (card._photoIndex - 1 + photos.length) % photos.length;
  } else {
    card._photoIndex = (card._photoIndex + 1) % photos.length;
  }
  const nextPhoto = photos[card._photoIndex] || photos[0];
  card.style.backgroundImage = `url("${escapeHtml(nextPhoto)}")`;
  card.querySelectorAll(".photo-step").forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === card._photoIndex);
  });
}

function setOnboardingSubmitting(isSubmitting) {
  if (!onboardingSubmitBtn) return;
  onboardingSubmitBtn.disabled = isSubmitting;
  onboardingSubmitBtn.textContent = isSubmitting ? "Guardando..." : "Entrar";
}

function isProfileComplete(user) {
  return Boolean(
    user &&
      String(user.bio || "").trim() &&
      Array.isArray(user.interests) &&
      user.interests.length > 0 &&
      String(user.relationshipGoal || "").trim() &&
      String(user.gender || "").trim() &&
      String(user.livingIn || user.city || "").trim() &&
      ((Array.isArray(user.photoUrls) && user.photoUrls.length > 0) || String(user.photoUrl || "").trim())
  );
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
  const response = await fetchWithTimeout(url, undefined, 12000);
  if (!response.ok) {
    throw new Error(`GET ${url} failed ${response.status}`);
  }
  return response.json();
}

async function postJson(url, data) {
  const response = await fetchWithTimeout(
    url,
    {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    },
    12000
  );
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(body?.error || `POST ${url} failed ${response.status}`);
  }
  return body || { ok: true };
}

function fetchWithTimeout(url, options, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...(options || {}), signal: controller.signal })
    .catch((err) => {
      if (err?.name === "AbortError") {
        throw new Error("Tiempo de espera agotado. Revisa tu conexion.");
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

function setAuthSubmitting(isSubmitting) {
  if (loginSubmitBtn) {
    loginSubmitBtn.disabled = isSubmitting;
    loginSubmitBtn.textContent = isSubmitting ? "Entrando..." : "Entrar";
  }
  if (registerSubmitBtn) {
    registerSubmitBtn.disabled = isSubmitting;
    registerSubmitBtn.textContent = isSubmitting ? "Creando..." : "Crear cuenta";
  }
}

function mapAuthError(error) {
  const code = String(error || "").trim().toLowerCase();
  if (!code) return "No se pudo iniciar sesion";
  if (code.includes("invalid_credentials")) return "Email o contrasena incorrectos";
  if (code.includes("credentials_required")) return "Completa email y contrasena";
  if (code.includes("tiempo de espera")) return "Sin respuesta del servidor. Intenta de nuevo";
  return error;
}

function setAuthError(message) {
  if (!authErrorEl) return;
  const text = String(message || "").trim();
  authErrorEl.textContent = text;
  authErrorEl.classList.toggle("hidden", !text);
}

function enhanceNavLabels() {
  const labels = {
    swipe: "Para ti",
    explore: "Explorar",
    likes: "Likes",
    chat: "Chat",
    profile: "Perfil",
  };
  navButtons.forEach((button) => {
    if (button.querySelector(".nav-label")) return;
    const tab = String(button.dataset.tabBtn || "");
    const label = document.createElement("span");
    label.className = "nav-label";
    label.textContent = labels[tab] || "Tab";
    button.appendChild(label);
  });
}

function updateOnboardingProgress() {
  if (!onboardingForm || !onboardingProgressBar || !onboardingProgressText) return;
  const formData = new FormData(onboardingForm);
  const checks = [
    String(formData.get("name") || "").trim().length >= 2,
    String(formData.get("dob") || "").trim().length === 10,
    String(formData.get("bio") || "").trim().length >= 10,
    Array.isArray(state.onboardingPhotoUrls) && state.onboardingPhotoUrls.length > 0,
    parseCsvField(interestsInput?.value || "").length > 0,
    String(relationshipGoalInput?.value || "").trim().length > 0,
    String(formData.get("gender") || "").trim().length > 0,
    String(livingInInput?.value || formData.get("livingIn") || "").trim().length > 0,
  ];
  const completed = checks.filter(Boolean).length;
  const pct = Math.round((completed / checks.length) * 100);
  onboardingProgressBar.style.width = `${pct}%`;
  onboardingProgressText.textContent = `${pct}% completo`;
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

function isFetchStale(key, ttlMs) {
  const last = Number(state.lastFetchAt?.[key] || 0);
  return Date.now() - last > ttlMs;
}

function touchFetch(key) {
  state.lastFetchAt[key] = Date.now();
}

function buildWarmUser(user) {
  const firstPhoto =
    String(user?.photoUrl || "").trim() ||
    (Array.isArray(user?.photoUrls) && user.photoUrls.length ? String(user.photoUrls[0] || "").trim() : "");
  return {
    id: String(user?.id || ""),
    name: String(user?.name || ""),
    age: Number(user?.age) || 0,
    city: String(user?.city || ""),
    bio: String(user?.bio || ""),
    photoUrl: firstPhoto,
    photoUrls: firstPhoto ? [firstPhoto] : [],
    showAge: user?.showAge !== false,
  };
}

function readWarmUserCache(expectedUserId) {
  try {
    const raw = localStorage.getItem("matcha_user_warm");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.id !== expectedUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
