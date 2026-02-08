const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const webpush = require("web-push");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

const firebaseAdmin = safeRequire("firebase-admin");
const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultUsers = [
  {
    id: "u1",
    name: "Sofia",
    age: 26,
    city: "Buenos Aires",
    bio: "Cafe, fotografia y escapadas cortas.",
    photoUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "u2",
    name: "Mateo",
    age: 29,
    city: "Cordoba",
    bio: "Runner de manana. Pizza de noche.",
    photoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "u3",
    name: "Valentina",
    age: 24,
    city: "Rosario",
    bio: "Diseno, sushi y playlists raras.",
    photoUrl:
      "https://images.unsplash.com/photo-1464863979621-258859e62245?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "u4",
    name: "Franco",
    age: 31,
    city: "Mendoza",
    bio: "Vino, montana y humor negro.",
    photoUrl:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "u5",
    name: "Camila",
    age: 27,
    city: "La Plata",
    bio: "Minimalismo, yoga y ramen.",
    photoUrl:
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "u6",
    name: "Nicolas",
    age: 28,
    city: "Mar del Plata",
    bio: "Surf, codigo y cafe fuerte.",
    photoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  },
];

const emptyDb = {
  users: defaultUsers,
  swipes: [],
  matches: [],
  pushSubscriptions: [],
  deviceTokens: [],
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2), "utf8");
}

let db = loadDb();
let firebaseMessaging = null;

const vapidKeys = loadVapidKeys();
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:matcha@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

initFirebase();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "matcha",
    now: new Date().toISOString(),
    users: db.users.length,
  });
});

app.post("/api/auth/guest", (req, res) => {
  const { name, age, city, bio, photoUrl } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, error: "name_required" });
  }

  const safeAge = Number(age) || 25;
  const user = {
    id: `u_${uuidv4()}`,
    name: String(name).trim().slice(0, 30),
    age: Math.max(18, Math.min(99, safeAge)),
    city: String(city || "Sin ciudad").slice(0, 40),
    bio: String(bio || "Nuevo en Matcha").slice(0, 180),
    photoUrl:
      String(photoUrl || "").trim() ||
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  saveDb();

  return res.json({
    ok: true,
    user,
    token: Buffer.from(user.id).toString("base64url"),
  });
});

app.get("/api/users/:userId", (req, res) => {
  const user = db.users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }
  return res.json({ ok: true, user });
});

app.get("/api/profiles/stack", (req, res) => {
  const userId = String(req.query.userId || "");
  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 8));
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId_required" });
  }
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  const swipedTargets = new Set(
    db.swipes.filter((s) => s.userId === userId).map((s) => s.targetId)
  );
  const candidates = db.users
    .filter((u) => u.id !== userId && !swipedTargets.has(u.id))
    .slice(0, limit);

  return res.json({ ok: true, profiles: candidates });
});

app.post("/api/swipes", async (req, res) => {
  try {
    const { userId, targetId, direction } = req.body || {};
    if (!userId || !targetId || !direction) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }
    if (!["like", "pass"].includes(direction)) {
      return res.status(400).json({ ok: false, error: "invalid_direction" });
    }

    const user = db.users.find((u) => u.id === userId);
    const target = db.users.find((u) => u.id === targetId);
    if (!user || !target) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }
    if (userId === targetId) {
      return res.status(400).json({ ok: false, error: "invalid_target" });
    }

    const existingSwipe = db.swipes.find(
      (s) => s.userId === userId && s.targetId === targetId
    );
    if (!existingSwipe) {
      db.swipes.push({
        id: `sw_${uuidv4()}`,
        userId,
        targetId,
        direction,
        createdAt: new Date().toISOString(),
      });
    } else {
      existingSwipe.direction = direction;
      existingSwipe.updatedAt = new Date().toISOString();
    }

    let match = null;
    if (direction === "like") {
      const reciprocalLike = db.swipes.find(
        (s) =>
          s.userId === targetId &&
          s.targetId === userId &&
          s.direction === "like"
      );
      if (reciprocalLike) {
        const alreadyMatched = db.matches.find(
          (m) => m.users.includes(userId) && m.users.includes(targetId)
        );
        if (!alreadyMatched) {
          match = {
            id: `m_${uuidv4()}`,
            users: [userId, targetId],
            createdAt: new Date().toISOString(),
          };
          db.matches.push(match);
          await notifyNewMatch(match);
        } else {
          match = alreadyMatched;
        }
      }
    }

    saveDb();
    return res.json({ ok: true, isMatch: Boolean(match), match });
  } catch (err) {
    console.error("swipe_error", err);
    return res.status(500).json({ ok: false, error: "swipe_failed" });
  }
});

app.get("/api/matches", (req, res) => {
  const userId = String(req.query.userId || "");
  if (!userId) {
    return res.status(400).json({ ok: false, error: "userId_required" });
  }
  const matches = db.matches
    .filter((m) => m.users.includes(userId))
    .map((match) => {
      const otherUserId = match.users.find((id) => id !== userId);
      const user = db.users.find((u) => u.id === otherUserId);
      return {
        id: match.id,
        createdAt: match.createdAt,
        user,
      };
    })
    .filter((m) => m.user);

  return res.json({ ok: true, matches });
});

app.get("/api/push/public-key", (_req, res) => {
  return res.json({ ok: true, publicKey: vapidKeys.publicKey });
});

app.post("/api/push/subscribe", (req, res) => {
  const { userId, subscription } = req.body || {};
  if (!userId || !subscription || !subscription.endpoint) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  const existing = db.pushSubscriptions.find(
    (s) => s.userId === userId && s.endpoint === subscription.endpoint
  );
  if (!existing) {
    db.pushSubscriptions.push({
      id: `ps_${uuidv4()}`,
      userId,
      endpoint: subscription.endpoint,
      subscription,
      createdAt: new Date().toISOString(),
    });
  } else {
    existing.subscription = subscription;
    existing.updatedAt = new Date().toISOString();
  }
  saveDb();

  return res.json({ ok: true });
});

app.post("/api/device/register", async (req, res) => {
  const { userId, token, platform } = req.body || {};
  if (!userId || !token) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ ok: false, error: "user_not_found" });
  }

  const existing = db.deviceTokens.find((d) => d.token === token);
  if (!existing) {
    db.deviceTokens.push({
      id: `dt_${uuidv4()}`,
      userId,
      token,
      platform: platform || "android",
      createdAt: new Date().toISOString(),
    });
  } else {
    existing.userId = userId;
    existing.platform = platform || existing.platform;
    existing.updatedAt = new Date().toISOString();
  }
  saveDb();

  return res.json({ ok: true });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`matcha server ready on http://localhost:${PORT}`);
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log(
      "warning: using generated VAPID keys for this run. Configure env vars for stable push subscriptions."
    );
  }
  if (!firebaseMessaging) {
    console.log(
      "warning: firebase not configured. Android FCM push is disabled."
    );
  }
});

function loadDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      swipes: Array.isArray(parsed.swipes) ? parsed.swipes : [],
      matches: Array.isArray(parsed.matches) ? parsed.matches : [],
      pushSubscriptions: Array.isArray(parsed.pushSubscriptions)
        ? parsed.pushSubscriptions
        : [],
      deviceTokens: Array.isArray(parsed.deviceTokens) ? parsed.deviceTokens : [],
    };
  } catch (err) {
    console.error("db_load_error", err);
    return JSON.parse(JSON.stringify(emptyDb));
  }
}

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function loadVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }
  return webpush.generateVAPIDKeys();
}

function initFirebase() {
  if (!firebaseAdmin) {
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    return;
  }

  try {
    let accountJson;
    if (raw.trim().startsWith("{")) {
      accountJson = JSON.parse(raw);
    } else {
      const decoded = Buffer.from(raw, "base64").toString("utf8");
      accountJson = JSON.parse(decoded);
    }
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(accountJson),
    });
    firebaseMessaging = firebaseAdmin.messaging();
    console.log("firebase initialized");
  } catch (err) {
    console.error("firebase_init_error", err);
  }
}

async function notifyNewMatch(match) {
  const [userAId, userBId] = match.users;
  const userA = db.users.find((u) => u.id === userAId);
  const userB = db.users.find((u) => u.id === userBId);
  if (!userA || !userB) {
    return;
  }

  await Promise.all([
    sendWebPushToUser(
      userAId,
      `Nuevo match con ${userB.name}`,
      "Hay match en Matcha. Abri la app para verlo."
    ),
    sendWebPushToUser(
      userBId,
      `Nuevo match con ${userA.name}`,
      "Hay match en Matcha. Abri la app para verlo."
    ),
    sendFcmToUser(
      userAId,
      `Nuevo match con ${userB.name}`,
      "Deslizaste bien. Abri Matcha ahora."
    ),
    sendFcmToUser(
      userBId,
      `Nuevo match con ${userA.name}`,
      "Deslizaste bien. Abri Matcha ahora."
    ),
  ]);
}

async function sendWebPushToUser(userId, title, body) {
  const subscriptions = db.pushSubscriptions.filter((s) => s.userId === userId);
  if (!subscriptions.length) {
    return;
  }
  const payload = JSON.stringify({
    title,
    body,
    url: "/",
  });

  const failed = [];
  await Promise.all(
    subscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload);
      } catch (err) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          failed.push(item.endpoint);
        }
      }
    })
  );

  if (failed.length) {
    db.pushSubscriptions = db.pushSubscriptions.filter(
      (s) => !failed.includes(s.endpoint)
    );
    saveDb();
  }
}

async function sendFcmToUser(userId, title, body) {
  if (!firebaseMessaging) {
    return;
  }
  const tokens = db.deviceTokens
    .filter((d) => d.userId === userId)
    .map((d) => d.token);

  if (!tokens.length) {
    return;
  }

  try {
    const result = await firebaseMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        type: "match",
        click_action: "OPEN_MATCHA",
      },
      android: {
        priority: "high",
      },
    });

    const invalid = [];
    result.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code.includes("invalid-registration-token") ||
          code.includes("registration-token-not-registered")
        ) {
          invalid.push(tokens[idx]);
        }
      }
    });

    if (invalid.length) {
      db.deviceTokens = db.deviceTokens.filter((d) => !invalid.includes(d.token));
      saveDb();
    }
  } catch (err) {
    console.error("fcm_send_error", err);
  }
}

function safeRequire(moduleName) {
  try {
    return require(moduleName);
  } catch {
    return null;
  }
}
