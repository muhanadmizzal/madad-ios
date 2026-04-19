import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { config } from "./config.js";
import { db, nowIso, parseJson } from "./database.js";

function getUserByEmail(email) {
  return db.prepare("SELECT * FROM local_users WHERE email = ?").get(email);
}

function getUserById(id) {
  return db.prepare("SELECT * FROM local_users WHERE id = ?").get(id);
}

export function createSession(userRow) {
  const stamp = nowIso();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const roles = parseJson(userRow.roles_json, []);
  const profile = parseJson(userRow.profile_json, {});
  const claims = {
    sub: userRow.id,
    email: userRow.email,
    tenant_id: userRow.tenant_id,
    roles,
    profile,
  };
  const accessToken = jwt.sign(claims, config.jwtSecret, { expiresIn: "7d" });
  const refreshToken = nanoid(32);

  db.prepare(
    `
      INSERT INTO local_sessions (id, user_id, access_token, refresh_token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(nanoid(), userRow.id, accessToken, refreshToken, expiresAt, stamp);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_at: Math.floor(new Date(expiresAt).getTime() / 1000),
    expires_in: 7 * 24 * 60 * 60,
    user: {
      id: userRow.id,
      email: userRow.email,
      user_metadata: {
        full_name: profile.full_name || userRow.full_name,
      },
      app_metadata: {
        provider: "local-runtime",
      },
    },
  };
}

export function signIn(email, password) {
  const user = getUserByEmail(email);
  if (!user || user.password_hash !== password) {
    return { error: { message: "Invalid email or password" } };
  }

  return {
    data: {
      session: createSession(user),
      user: {
        id: user.id,
        email: user.email,
      },
    },
    error: null,
  };
}

export function signUp({ email, password, metadata = {} }) {
  const existing = getUserByEmail(email);
  if (existing) {
    return { error: { message: "User already exists" } };
  }

  const id = nanoid();
  const stamp = nowIso();
  const fullName = metadata.full_name || email.split("@")[0];
  const tenantId = config.defaultTenantId;
  const profile = {
    user_id: id,
    full_name: fullName,
    company_id: tenantId,
    email,
  };

  db.prepare(
    `
      INSERT INTO local_users (
        id, tenant_id, email, password_hash, full_name, roles_json, profile_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    id,
    tenantId,
    email,
    password,
    fullName,
    JSON.stringify(["employee"]),
    JSON.stringify(profile),
    stamp,
    stamp,
  );

  return {
    data: {
      user: {
        id,
        email,
      },
      session: createSession(getUserById(id)),
    },
    error: null,
  };
}

export function signOut(accessToken) {
  db.prepare("DELETE FROM local_sessions WHERE access_token = ?").run(accessToken);
  return { error: null };
}

export function getSession(accessToken) {
  if (!accessToken) {
    return { data: { session: null }, error: null };
  }

  try {
    const decoded = jwt.verify(accessToken, config.jwtSecret);
    const user = getUserById(decoded.sub);
    if (!user) {
      return { data: { session: null }, error: null };
    }
    return {
      data: {
        session: {
          access_token: accessToken,
          refresh_token: "local-refresh",
          token_type: "bearer",
          user: {
            id: user.id,
            email: user.email,
          },
        },
      },
      error: null,
    };
  } catch {
    return { data: { session: null }, error: null };
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: { message: "Missing authorization token" } });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.auth = decoded;
    req.accessToken = token;
    next();
  } catch {
    res.status(401).json({ error: { message: "Invalid authorization token" } });
  }
}
