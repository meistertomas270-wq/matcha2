const path = require("path");
const crypto = require("crypto");
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
app.use(express.json({ limit: "20mb" }));
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "7d",
    etag: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      }
    },
  })
);

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

app.post("/api/auth/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email) {
      return res.status(400).json({ ok: false, error: "email_required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: "password_min_8" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    if (existing.rowCount) {
      return res.status(409).json({ ok: false, error: "email_already_used" });
    }

    const { salt, hash } = hashPassword(password);
    const userId = `u_${uuidv4()}`;
    const defaultName = email.split("@")[0].slice(0, 30) || "Usuario";
    const defaultPhoto =
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80";

    const { rows } = await pool.query(
      `
      INSERT INTO users (
        id, name, age, city, bio, photo_url, photo_urls, email, password_salt, password_hash, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10, NOW())
      RETURNING ${buildUserSelect("")}
      `,
      [userId, defaultName, 25, "Sin ciudad", "", defaultPhoto, [defaultPhoto], email, salt, hash]
    );

    return res.json({
      ok: true,
      user: rows[0],
      profileComplete: isProfileComplete(rows[0]),
      token: Buffer.from(userId).toString("base64url"),
    });
  } catch (err) {
    console.error("register_error", err);
    return res.status(500).json({ ok: false, error: "register_failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "credentials_required" });
    }

    const { rows } = await pool.query(
      `
      SELECT ${buildUserSelect("")}, password_salt AS "passwordSalt", password_hash AS "passwordHash"
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );
    const user = rows[0];
    if (!user?.passwordSalt || !user?.passwordHash) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    const valid = verifyPassword(password, user.passwordSalt, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: "invalid_credentials" });
    }

    delete user.passwordSalt;
    delete user.passwordHash;

    return res.json({
      ok: true,
      user,
      profileComplete: isProfileComplete(user),
      token: Buffer.from(user.id).toString("base64url"),
    });
  } catch (err) {
    console.error("login_error", err);
    return res.status(500).json({ ok: false, error: "login_failed" });
  }
});

app.post("/api/auth/guest", async (req, res) => {
  try {
    const payload = req.body || {};
    const { name } = payload;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: "name_required" });
    }

    const profile = normalizeExtendedProfile(payload);
    const validationError = validateRequiredProfile(profile);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    const userId = `u_${uuidv4()}`;
    const resolvedAge = resolveAge(payload.age, profile.dob);
    const values = [
      userId,
      String(name).trim().slice(0, 30),
      resolvedAge,
      profile.city,
      profile.bio,
      profile.photoUrls[0] ||
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
      profile.photoUrls,
      profile.smartPhotosEnabled,
      profile.aboutPromptQuestion,
      profile.aboutPromptAnswer,
      profile.interests,
      profile.relationshipGoal,
      profile.politics,
      profile.pronouns,
      profile.heightCm,
      profile.languages,
      profile.zodiacSign,
      profile.showZodiac,
      profile.dob,
      profile.education,
      profile.familyPlans,
      profile.loveStyle,
      profile.pets,
      profile.drinking,
      profile.smoking,
      profile.workout,
      profile.socialMedia,
      profile.askMe1,
      profile.askMe2,
      profile.askMe3,
      profile.jobTitle,
      profile.company,
      profile.school,
      profile.livingIn,
      profile.anthem,
      profile.spotifyArtists,
      profile.gender,
      profile.sexualOrientation,
      profile.showAge,
      profile.showDistance,
    ];

    const { rows } = await pool.query(
      `
      INSERT INTO users (
        id, name, age, city, bio, photo_url, photo_urls, smart_photos_enabled, about_prompt_question,
        about_prompt_answer, interests, relationship_goal, politics, pronouns, height_cm, languages,
        zodiac_sign, show_zodiac, dob, education, family_plans, love_style, pets, drinking, smoking, workout,
        social_media, ask_me_1, ask_me_2, ask_me_3, job_title, company, school, living_in,
        anthem, spotify_artists, gender, sexual_orientation, show_age, show_distance, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34,
        $35, $36, $37, $38, $39, $40, NOW()
      )
      RETURNING ${buildUserSelect("")}
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

app.post("/api/users/:userId/profile", async (req, res) => {
  try {
    const userId = String(req.params.userId || "");
    if (!userId) {
      return res.status(400).json({ ok: false, error: "user_id_required" });
    }

    const current = await pool.query(
      `SELECT ${buildUserSelect("")} FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    if (!current.rowCount) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }
    const previous = current.rows[0];

    const payload = req.body || {};
    const profile = normalizeExtendedProfile(payload);
    const validationError = validateRequiredProfile(profile);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    const resolvedAge = resolveAge(payload.age || previous.age, profile.dob || previous.dob);
    const name = normalizeText(payload.name, 30) || previous.name;

    const { rows } = await pool.query(
      `
      UPDATE users
      SET
        name = $2,
        age = $3,
        city = $4,
        bio = $5,
        photo_url = $6,
        photo_urls = $7,
        smart_photos_enabled = $8,
        about_prompt_question = $9,
        about_prompt_answer = $10,
        interests = $11,
        relationship_goal = $12,
        politics = $13,
        pronouns = $14,
        height_cm = $15,
        languages = $16,
        zodiac_sign = $17,
        show_zodiac = $18,
        dob = $19,
        education = $20,
        family_plans = $21,
        love_style = $22,
        pets = $23,
        drinking = $24,
        smoking = $25,
        workout = $26,
        social_media = $27,
        ask_me_1 = $28,
        ask_me_2 = $29,
        ask_me_3 = $30,
        job_title = $31,
        company = $32,
        school = $33,
        living_in = $34,
        anthem = $35,
        spotify_artists = $36,
        gender = $37,
        sexual_orientation = $38,
        show_age = $39,
        show_distance = $40
      WHERE id = $1
      RETURNING ${buildUserSelect("")}
      `,
      [
        userId,
        name,
        resolvedAge,
        profile.city,
        profile.bio,
        profile.photoUrls[0] || previous.photoUrl,
        profile.photoUrls,
        profile.smartPhotosEnabled,
        profile.aboutPromptQuestion,
        profile.aboutPromptAnswer,
        profile.interests,
        profile.relationshipGoal,
        profile.politics,
        profile.pronouns,
        profile.heightCm,
        profile.languages,
        profile.zodiacSign,
        profile.showZodiac,
        profile.dob || null,
        profile.education,
        profile.familyPlans,
        profile.loveStyle,
        profile.pets,
        profile.drinking,
        profile.smoking,
        profile.workout,
        profile.socialMedia,
        profile.askMe1,
        profile.askMe2,
        profile.askMe3,
        profile.jobTitle,
        profile.company,
        profile.school,
        profile.livingIn,
        profile.anthem,
        profile.spotifyArtists,
        profile.gender,
        profile.sexualOrientation,
        profile.showAge,
        profile.showDistance,
      ]
    );

    return res.json({ ok: true, user: rows[0], profileComplete: isProfileComplete(rows[0]) });
  } catch (err) {
    console.error("update_profile_error", err);
    return res.status(500).json({ ok: false, error: "update_profile_failed" });
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT ${buildUserSelect("")}
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
      SELECT ${buildSwipeCardSelect("u")}
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
          await seedChatOnNewMatch(client, matchRow.id, userId, targetId);
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

app.get("/api/likes/summary", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId_required" });
    }

    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (!userExists.rowCount) {
      return res.status(404).json({ ok: false, error: "user_not_found" });
    }

    const likesReceivedRes = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM swipes
      WHERE target_id = $1 AND direction = 'like'
      `,
      [userId]
    );

    const previewProfilesRes = await pool.query(
      `
      SELECT u.id, u.name, u.age, u.city, u.photo_url AS "photoUrl"
      FROM swipes s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN matches m
        ON m.pair_key = CASE
          WHEN s.user_id < s.target_id THEN s.user_id || '::' || s.target_id
          ELSE s.target_id || '::' || s.user_id
        END
      WHERE s.target_id = $1
        AND s.direction = 'like'
        AND m.id IS NULL
      ORDER BY s.created_at DESC
      LIMIT 24
      `,
      [userId]
    );

    const topPicksRes = await pool.query(
      `
      SELECT id, name, age, city, photo_url AS "photoUrl"
      FROM users
      WHERE id <> $1
      ORDER BY created_at DESC
      LIMIT 8
      `,
      [userId]
    );

    const matchesCountRes = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM matches
      WHERE user_a = $1 OR user_b = $1
      `,
      [userId]
    );

    return res.json({
      ok: true,
      likesReceived: likesReceivedRes.rows[0]?.count || 0,
      likesPreview: previewProfilesRes.rows,
      topPicks: topPicksRes.rows,
      matchesCount: matchesCountRes.rows[0]?.count || 0,
    });
  } catch (err) {
    console.error("likes_summary_error", err);
    return res.status(500).json({ ok: false, error: "likes_summary_failed" });
  }
});

app.get("/api/chats", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    if (!userId) {
      return res.status(400).json({ ok: false, error: "userId_required" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        m.id AS chat_id,
        m.created_at AS match_created_at,
        u.id AS user_id,
        u.name,
        u.age,
        u.city,
        u.photo_url AS photo_url,
        lm.body AS last_message,
        lm.sender_id AS last_sender_id,
        lm.created_at AS last_message_at
      FROM matches m
      JOIN users u
        ON u.id = CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END
      LEFT JOIN LATERAL (
        SELECT body, sender_id, created_at
        FROM chat_messages cm
        WHERE cm.match_id = m.id
        ORDER BY cm.created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE m.user_a = $1 OR m.user_b = $1
      ORDER BY COALESCE(lm.created_at, m.created_at) DESC
      `,
      [userId]
    );

    const chats = rows.map((row) => {
      const hasUnread = row.last_sender_id && row.last_sender_id !== userId;
      return {
        chatId: row.chat_id,
        createdAt: row.match_created_at,
        user: {
          id: row.user_id,
          name: row.name,
          age: row.age,
          city: row.city,
          photoUrl: row.photo_url,
          isOnline: hashString(row.user_id) % 3 !== 0,
        },
        lastMessage: row.last_message || "Hicieron match. Rompe el hielo.",
        lastMessageAt: row.last_message_at || row.match_created_at,
        unreadCount: hasUnread ? 1 : 0,
      };
    });

    return res.json({ ok: true, chats });
  } catch (err) {
    console.error("chats_error", err);
    return res.status(500).json({ ok: false, error: "chats_failed" });
  }
});

app.get("/api/chats/:chatId/messages", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");
    const chatId = String(req.params.chatId || "");
    if (!userId || !chatId) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }

    const membership = await pool.query(
      `
      SELECT id
      FROM matches
      WHERE id = $1 AND (user_a = $2 OR user_b = $2)
      LIMIT 1
      `,
      [chatId, userId]
    );
    if (!membership.rowCount) {
      return res.status(404).json({ ok: false, error: "chat_not_found" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        cm.id,
        cm.sender_id AS "senderId",
        cm.body,
        cm.created_at AS "createdAt",
        u.name AS "senderName"
      FROM chat_messages cm
      LEFT JOIN users u ON u.id = cm.sender_id
      WHERE cm.match_id = $1
      ORDER BY cm.created_at ASC
      LIMIT 200
      `,
      [chatId]
    );

    return res.json({ ok: true, messages: rows });
  } catch (err) {
    console.error("chat_messages_error", err);
    return res.status(500).json({ ok: false, error: "chat_messages_failed" });
  }
});

app.post("/api/chats/:chatId/messages", async (req, res) => {
  try {
    const chatId = String(req.params.chatId || "");
    const userId = String(req.body?.userId || "");
    const body = String(req.body?.body || "").trim();
    if (!chatId || !userId || !body) {
      return res.status(400).json({ ok: false, error: "missing_fields" });
    }
    if (body.length > 600) {
      return res.status(400).json({ ok: false, error: "message_too_long" });
    }

    const membership = await pool.query(
      `
      SELECT id
      FROM matches
      WHERE id = $1 AND (user_a = $2 OR user_b = $2)
      LIMIT 1
      `,
      [chatId, userId]
    );
    if (!membership.rowCount) {
      return res.status(404).json({ ok: false, error: "chat_not_found" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO chat_messages (id, match_id, sender_id, body, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, sender_id AS "senderId", body, created_at AS "createdAt"
      `,
      [`cm_${uuidv4()}`, chatId, userId, body]
    );

    return res.json({ ok: true, message: rows[0] });
  } catch (err) {
    console.error("chat_send_error", err);
    return res.status(500).json({ ok: false, error: "chat_send_failed" });
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
        email TEXT,
        password_salt TEXT,
        password_hash TEXT,
        name TEXT NOT NULL,
        age INT NOT NULL,
        city TEXT NOT NULL,
        bio TEXT NOT NULL,
        photo_url TEXT NOT NULL,
        photo_urls TEXT[] NOT NULL DEFAULT '{}',
        smart_photos_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        about_prompt_question TEXT,
        about_prompt_answer TEXT,
        interests TEXT[] NOT NULL DEFAULT '{}',
        relationship_goal TEXT,
        politics TEXT,
        pronouns TEXT,
        height_cm INT,
        languages TEXT[] NOT NULL DEFAULT '{}',
        zodiac_sign TEXT,
        show_zodiac BOOLEAN NOT NULL DEFAULT TRUE,
        dob DATE,
        education TEXT,
        family_plans TEXT,
        love_style TEXT,
        pets TEXT,
        drinking TEXT,
        smoking TEXT,
        workout TEXT,
        social_media TEXT,
        ask_me_1 TEXT,
        ask_me_2 TEXT,
        ask_me_3 TEXT,
        job_title TEXT,
        company TEXT,
        school TEXT,
        living_in TEXT,
        anthem TEXT,
        spotify_artists TEXT[] NOT NULL DEFAULT '{}',
        gender TEXT,
        sexual_orientation TEXT,
        show_age BOOLEAN NOT NULL DEFAULT TRUE,
        show_distance BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS password_salt TEXT,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS smart_photos_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS about_prompt_question TEXT,
      ADD COLUMN IF NOT EXISTS about_prompt_answer TEXT,
      ADD COLUMN IF NOT EXISTS interests TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS relationship_goal TEXT,
      ADD COLUMN IF NOT EXISTS politics TEXT,
      ADD COLUMN IF NOT EXISTS pronouns TEXT,
      ADD COLUMN IF NOT EXISTS height_cm INT,
      ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS zodiac_sign TEXT,
      ADD COLUMN IF NOT EXISTS show_zodiac BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS dob DATE,
      ADD COLUMN IF NOT EXISTS education TEXT,
      ADD COLUMN IF NOT EXISTS family_plans TEXT,
      ADD COLUMN IF NOT EXISTS love_style TEXT,
      ADD COLUMN IF NOT EXISTS pets TEXT,
      ADD COLUMN IF NOT EXISTS drinking TEXT,
      ADD COLUMN IF NOT EXISTS smoking TEXT,
      ADD COLUMN IF NOT EXISTS workout TEXT,
      ADD COLUMN IF NOT EXISTS social_media TEXT,
      ADD COLUMN IF NOT EXISTS ask_me_1 TEXT,
      ADD COLUMN IF NOT EXISTS ask_me_2 TEXT,
      ADD COLUMN IF NOT EXISTS ask_me_3 TEXT,
      ADD COLUMN IF NOT EXISTS job_title TEXT,
      ADD COLUMN IF NOT EXISTS company TEXT,
      ADD COLUMN IF NOT EXISTS school TEXT,
      ADD COLUMN IF NOT EXISTS living_in TEXT,
      ADD COLUMN IF NOT EXISTS anthem TEXT,
      ADD COLUMN IF NOT EXISTS spotify_artists TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS gender TEXT,
      ADD COLUMN IF NOT EXISTS sexual_orientation TEXT,
      ADD COLUMN IF NOT EXISTS show_age BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS show_distance BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
      ON users (LOWER(email))
      WHERE email IS NOT NULL
    `);

    await client.query(`
      UPDATE users
      SET photo_urls = ARRAY[photo_url]
      WHERE (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL)
        AND photo_url IS NOT NULL
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
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_match_created_at
      ON chat_messages (match_id, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_swipes_target_direction_created_at
      ON swipes (target_id, direction, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_user_a_created_at
      ON matches (user_a, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_matches_user_b_created_at
      ON matches (user_b, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_created_at
      ON users (created_at DESC);
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
          INSERT INTO users (id, name, age, city, bio, photo_url, photo_urls, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `,
          [u.id, u.name, u.age, u.city, u.bio, u.photoUrl, [u.photoUrl]]
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

async function seedChatOnNewMatch(client, matchId, userAId, userBId) {
  const firstMessages = [
    "Hola! Que tal tu dia?",
    "Me gusto tu perfil. Te copa hablar un rato?",
  ];
  await client.query(
    `
    INSERT INTO chat_messages (id, match_id, sender_id, body, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    `,
    [`cm_${uuidv4()}`, matchId, userAId, firstMessages[0]]
  );
  await client.query(
    `
    INSERT INTO chat_messages (id, match_id, sender_id, body, created_at)
    VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 second')
    `,
    [`cm_${uuidv4()}`, matchId, userBId, firstMessages[1]]
  );
}

function buildUserSelect(alias = "") {
  const p = alias ? `${alias}.` : "";
  return `
    ${p}id,
    ${p}email,
    ${p}name,
    ${p}age,
    ${p}city,
    ${p}bio,
    ${p}photo_url AS "photoUrl",
    ${p}photo_urls AS "photoUrls",
    ${p}smart_photos_enabled AS "smartPhotosEnabled",
    ${p}about_prompt_question AS "aboutPromptQuestion",
    ${p}about_prompt_answer AS "aboutPromptAnswer",
    ${p}interests,
    ${p}relationship_goal AS "relationshipGoal",
    ${p}politics,
    ${p}pronouns,
    ${p}height_cm AS "heightCm",
    ${p}languages,
    ${p}zodiac_sign AS "zodiacSign",
    ${p}show_zodiac AS "showZodiac",
    ${p}dob,
    ${p}education,
    ${p}family_plans AS "familyPlans",
    ${p}love_style AS "loveStyle",
    ${p}pets,
    ${p}drinking,
    ${p}smoking,
    ${p}workout,
    ${p}social_media AS "socialMedia",
    ${p}ask_me_1 AS "askMe1",
    ${p}ask_me_2 AS "askMe2",
    ${p}ask_me_3 AS "askMe3",
    ${p}job_title AS "jobTitle",
    ${p}company,
    ${p}school,
    ${p}living_in AS "livingIn",
    ${p}anthem,
    ${p}spotify_artists AS "spotifyArtists",
    ${p}gender,
    ${p}sexual_orientation AS "sexualOrientation",
    ${p}show_age AS "showAge",
    ${p}show_distance AS "showDistance",
    ${p}created_at AS "createdAt"
  `;
}

function buildSwipeCardSelect(alias = "") {
  const p = alias ? `${alias}.` : "";
  return `
    ${p}id,
    ${p}name,
    ${p}age,
    ${p}city,
    ${p}bio,
    ${p}photo_url AS "photoUrl",
    ${p}interests,
    ${p}relationship_goal AS "relationshipGoal"
  `;
}

function normalizeExtendedProfile(raw) {
  const city = normalizeText(raw.city || raw.livingIn, 80) || "Sin ciudad";
  const photoUrls = normalizePhotoList(raw.photoUrls, 5);
  const dob = normalizeDateOnly(raw.dob);
  const politics = normalizeEnum(raw.politics, ["derecha", "izquierda"], "derecha");
  const zodiacFromDob = dob ? zodiacSignFromDate(dob) : "";
  const zodiacSign = zodiacFromDob || normalizeText(raw.zodiacSign, 20);
  return {
    city,
    bio: normalizeText(raw.bio, 180),
    photoUrls,
    smartPhotosEnabled: normalizeBoolean(raw.smartPhotosEnabled, true),
    aboutPromptQuestion: normalizeText(raw.aboutPromptQuestion, 80),
    aboutPromptAnswer: normalizeText(raw.aboutPromptAnswer, 140),
    interests: normalizeList(raw.interests, 6, 24),
    relationshipGoal: normalizeText(raw.relationshipGoal, 40),
    politics,
    pronouns: politics === "izquierda" ? normalizeText(raw.pronouns, 30) : "",
    heightCm: normalizeInt(raw.heightCm, 120, 230),
    languages: normalizeList(raw.languages, 8, 24),
    zodiacSign,
    showZodiac: normalizeBoolean(raw.showZodiac, true),
    dob,
    education: normalizeText(raw.education, 50),
    familyPlans: normalizeText(raw.familyPlans, 60),
    loveStyle: normalizeText(raw.loveStyle, 40),
    pets: normalizeText(raw.pets, 40),
    drinking: normalizeText(raw.drinking, 30),
    smoking: normalizeText(raw.smoking, 30),
    workout: normalizeText(raw.workout, 30),
    socialMedia: normalizeText(raw.socialMedia, 30),
    askMe1: normalizeText(raw.askMe1, 80),
    askMe2: normalizeText(raw.askMe2, 80),
    askMe3: normalizeText(raw.askMe3, 80),
    jobTitle: normalizeText(raw.jobTitle, 60),
    company: normalizeText(raw.company, 60),
    school: normalizeText(raw.school, 80),
    livingIn: normalizeText(raw.livingIn, 40) || city,
    anthem: "",
    spotifyArtists: normalizeList(raw.spotifyArtists, 10, 40),
    gender: normalizeText(raw.gender, 30),
    sexualOrientation: normalizeText(raw.sexualOrientation, 40),
    showAge: normalizeBoolean(raw.showAge, true),
    showDistance: normalizeBoolean(raw.showDistance, true),
  };
}

function validateRequiredProfile(profile) {
  if (!profile.bio) return "bio_required";
  if (!profile.photoUrls.length) return "photo_required";
  if (profile.interests.length < 1) return "interests_min_1";
  if (!profile.relationshipGoal) return "relationship_goal_required";
  if (!profile.gender) return "gender_required";
  if (!profile.livingIn) return "living_in_required";
  return "";
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

function normalizeText(value, maxLen) {
  return String(value || "").trim().slice(0, maxLen);
}

function normalizeList(value, maxItems, maxItemLen) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return source
    .map((item) => normalizeText(item, maxItemLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizePhotoList(value, maxItems) {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => String(item || "").trim())
    .filter((item) => item.startsWith("data:image/"))
    .slice(0, maxItems);
}

function normalizeDateOnly(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeInt(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true", "1", "on", "yes", "si"].includes(s)) return true;
    if (["false", "0", "off", "no"].includes(s)) return false;
  }
  return fallback;
}

function normalizeEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase();
  if (!email) return "";
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return ok ? email.slice(0, 120) : "";
}

function hashPassword(password, saltHex) {
  const salt = saltHex || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(String(expectedHash || ""), "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function resolveAge(ageInput, dob) {
  if (dob) {
    const birth = new Date(`${dob}T00:00:00Z`);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let age = now.getUTCFullYear() - birth.getUTCFullYear();
      const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
        age -= 1;
      }
      return Math.max(18, Math.min(99, age));
    }
  }
  const safeAge = Number(ageInput) || 25;
  return Math.max(18, Math.min(99, safeAge));
}

function zodiacSignFromDate(dob) {
  const [year, month, day] = dob.split("-").map((v) => Number(v));
  if (!year || !month || !day) return "";
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

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
