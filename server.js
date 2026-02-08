const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const webpush = require("web-push");
const { v4: uuidv4 } = require("uuid");
const { Pool } = require("pg");

dotenv.config();

const firebaseAdmin = safeRequire("firebase-admin");
const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.DATABASE_PUBLIC_URL ||
  process.env.POSTGRES_URL ||
  buildDatabaseUrlFromPgVars();

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Add Railway Postgres and set this variable.");
}

const useDbSsl =
  process.env.DATABASE_SSL === "true" ||
  DATABASE_URL.includes("railway.app") ||
  DATABASE_URL.includes("railway.internal");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useDbSsl ? { rejectUnauthorized: false } : false,
});

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

const vapidKeys = loadVapidKeys();
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:matcha@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

let firebaseMessaging = null;
initFirebase();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS users FROM users");
    return res.json({
      ok: true,
      service: "matcha",
      now: new Date().toISOString(),
      users: rows[0]?.users || 0,
    });
  } catch (err) {
    console.error("health_error", err);
    return res.status(500).json({ ok: false, error: "health_failed" });
  }
});

app.post("/api/auth/guest", async (req, res) => {
  try {
    const { name, age, city, bio, photoUrl } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: "name_required" });
    }

    const userId = `u_${uuidv4()}`;
    const safeAge = Number(age) || 25;
    const values = [
      userId,
      String(name).trim().slice(0, 30),
      Math.max(18, Math.min(99, safeAge)),
      String(city || "Sin ciudad").slice(0, 40),
      String(bio || "Nuevo en Matcha").slice(0, 180),
      String(photoUrl || "").trim() ||
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
    ];

    const { rows } = await pool.query(
      `
      INSERT INTO users (id, name, age, city, bio, photo_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, name, age, city, bio, photo_url AS "photoUrl", created_at AS "createdAt"
      `,
      values
    );

    return res.json({
      ok: true,
      user: rows[0],
      token: Buffer.from(userId).toString("base64url"),
    });
  } catch (err) {
    console.error("guest_auth_error", err);
    return res.status(500).json({ ok: false, error: "guest_auth_failed" });
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT id, name, age, city, bio, photo_url AS "photoUrl", created_at AS "createdAt"
      FROM users
      WHERE id = $1
      `,
      [req.params.userId]
    );
    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }
    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("get_user_error", err);
    return res.status(500).json({ ok: false, error: "get_user_failed" });
  }
});

app.get("/api/profiles/stack", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 8));
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId_required" });
    }

    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (!userExists.rowCount) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    const { rows } = await pool.query(
      `
      SELECT u.id, u.name, u.age, u.city, u.bio, u.photo_url AS "photoUrl", u.created_at AS "createdAt"
      FROM users u
      WHERE u.id <> $1
        AND NOT EXISTS (
          SELECT 1 FROM swipes s
          WHERE s.user_id = $1 AND s.target_id = u.id
        )
      ORDER BY u.created_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );

    return res.json({ ok: true, profiles: rows });
  } catch (err) {
    console.error("profiles_stack_error", err);
    return res.status(500).json({ ok: false, error: "profiles_stack_failed" });
  }
});

app.post("/api/swipes", async (req, res) => {
  const client = await pool.connect();
  try {
    const { userId, targetId, direction } = req.body || {};
    if (!userId || !targetId || !direction) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }
    if (!["like", "pass"].includes(direction)) {
      return res.status(400).json({ ok: false, error: "invalid_direction" });
    }
    if (userId === targetId) {
      return res.status(400).json({ ok: false, error: "invalid_target" });
    }

    await client.query("BEGIN");
    const usersCheck = await client.query(
      "SELECT id FROM users WHERE id = ANY($1::text[])",
      [[userId, targetId]]
    );
    if (usersCheck.rowCount < 2) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    await client.query(
      `
      INSERT INTO swipes (id, user_id, target_id, direction, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, target_id)
      DO UPDATE SET direction = EXCLUDED.direction, updated_at = NOW()
      `,
      [`sw_${uuidv4()}`, userId, targetId, direction]
    );

    let matchRow = null;
    let isNewMatch = false;

    if (direction === "like") {
      const reciprocal = await client.query(
        `
        SELECT id
        FROM swipes
        WHERE user_id = $1 AND target_id = $2 AND direction = 'like'
        LIMIT 1
        `,
        [targetId, userId]
      );

      if (reciprocal.rowCount) {
        const [userA, userB] = sortPair(userId, targetId);
        const pairKey = `${userA}::${userB}`;

        const inserted = await client.query(
          `
          INSERT INTO matches (id, user_a, user_b, pair_key, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (pair_key) DO NOTHING
          RETURNING id, user_a, user_b, created_at
          `,
          [`m_${uuidv4()}`, userA, userB, pairKey]
        );

        if (inserted.rowCount) {
          matchRow = inserted.rows[0];
          isNewMatch = true;
        } else {
          const existing = await client.query(
            `
            SELECT id, user_a, user_b, created_at
            FROM matches
            WHERE pair_key = $1
            LIMIT 1
            `,
            [pairKey]
          );
          if (existing.rowCount) {
            matchRow = existing.rows[0];
          }
        }
      }
    }

    await client.query("COMMIT");

    if (isNewMatch && matchRow) {
      await notifyNewMatch(matchRow);
    }

    return res.json({
      ok: true,
      isMatch: Boolean(matchRow),
      match: matchRow ? formatMatch(matchRow) : null,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("swipe_error", err);
    return res.status(500).json({ ok: false, error: "swipe_failed" });
  } finally {
    client.release();
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId_required" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        m.id AS match_id,
        m.created_at,
        u.id AS user_id,
        u.name,
        u.age,
        u.city,
        u.bio,
        u.photo_url
      FROM matches m
      JOIN users u
        ON u.id = CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END
      WHERE m.user_a = $1 OR m.user_b = $1
      ORDER BY m.created_at DESC
      `,
      [userId]
    );

    const matches = rows.map((r) => ({
      id: r.match_id,
      createdAt: r.created_at,
      user: {
        id: r.user_id,
        name: r.name,
        age: r.age,
        city: r.city,
        bio: r.bio,
        photoUrl: r.photo_url,
      },
    }));

    return res.json({ ok: true, matches });
  } catch (err) {
    console.error("matches_error", err);
    return res.status(500).json({ ok: false, error: "matches_failed" });
  }
});

app.get("/api/push/public-key", (_req, res) => {
  return res.json({ ok: true, publicKey: vapidKeys.publicKey });
});

app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { userId, subscription } = req.body || {};
    if (!userId || !subscription || !subscription.endpoint) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }
    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (!userExists.rowCount) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    await pool.query(
      `
      INSERT INTO push_subscriptions (id, user_id, endpoint, subscription, created_at)
      VALUES ($1, $2, $3, $4::jsonb, NOW())
      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        subscription = EXCLUDED.subscription,
        updated_at = NOW()
      `,
      [`ps_${uuidv4()}`, userId, subscription.endpoint, JSON.stringify(subscription)]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("push_subscribe_error", err);
    return res.status(500).json({ ok: false, error: "push_subscribe_failed" });
  }
});

app.post("/api/device/register", async (req, res) => {
  try {
    const { userId, token, platform } = req.body || {};
    if (!userId || !token) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }
    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (!userExists.rowCount) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    await pool.query(
      `
      INSERT INTO device_tokens (id, user_id, token, platform, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (token)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        platform = EXCLUDED.platform,
        updated_at = NOW()
      `,
      [`dt_${uuidv4()}`, userId, token, platform || "android"]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("device_register_error", err);
    return res.status(500).json({ ok: false, error: "device_register_failed" });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

startServer().catch((err) => {
  console.error("startup_error", err);
  process.exit(1);
});

async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`matcha server ready on http://localhost:${PORT}`);
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.log(
        "warning: using generated VAPID keys for this run. Configure env vars for stable push subscriptions."
      );
    }
    if (!firebaseMessaging) {
      console.log(
        "warning: firebase not configured. Android remote push is disabled, web push still works."
      );
    }
  });
}

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INT NOT NULL,
        city TEXT NOT NULL,
        bio TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS swipes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ,
        UNIQUE (user_id, target_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pair_key TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        subscription JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL DEFAULT 'android',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
    `);

    const existing = await client.query("SELECT COUNT(*)::int AS count FROM users");
    if ((existing.rows[0]?.count || 0) === 0) {
      for (const u of defaultUsers) {
        await client.query(
          `
          INSERT INTO users (id, name, age, city, bio, photo_url, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          `,
          [u.id, u.name, u.age, u.city, u.bio, u.photoUrl]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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

async function notifyNewMatch(matchRow) {
  const userAId = matchRow.user_a;
  const userBId = matchRow.user_b;
  const { rows } = await pool.query(
    "SELECT id, name FROM users WHERE id = ANY($1::text[])",
    [[userAId, userBId]]
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  const userA = byId.get(userAId);
  const userB = byId.get(userBId);
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
  const { rows } = await pool.query(
    "SELECT endpoint, subscription FROM push_subscriptions WHERE user_id = $1",
    [userId]
  );
  if (!rows.length) {
    return;
  }
  const payload = JSON.stringify({
    title,
    body,
    url: "/",
  });

  const failed = [];
  await Promise.all(
    rows.map(async (item) => {
      try {
        await webpush.sendNotification(item.subscription, payload);
      } catch (err) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          failed.push(item.endpoint);
        }
      }
    })
  );

  if (failed.length) {
    await pool.query(
      "DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])",
      [failed]
    );
  }
}

async function sendFcmToUser(userId, title, body) {
  if (!firebaseMessaging) {
    return;
  }

  const { rows } = await pool.query(
    "SELECT token FROM device_tokens WHERE user_id = $1",
    [userId]
  );
  const tokens = rows.map((r) => r.token);
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
      await pool.query("DELETE FROM device_tokens WHERE token = ANY($1::text[])", [invalid]);
    }
  } catch (err) {
    console.error("fcm_send_error", err);
  }
}

function formatMatch(row) {
  return {
    id: row.id,
    users: [row.user_a, row.user_b],
    createdAt: row.created_at,
  };
}

function sortPair(a, b) {
  return [a, b].sort((x, y) => x.localeCompare(y));
}

function buildDatabaseUrlFromPgVars() {
  const host = process.env.PGHOST;
  const port = process.env.PGPORT || "5432";
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;

  if (!host || !user || !password || !database) {
    return "";
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(
    password
  )}@${host}:${port}/${database}`;
}

function safeRequire(moduleName) {
  try {
    return require(moduleName);
  } catch {
    return null;
  }
}
