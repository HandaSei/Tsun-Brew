import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "../shared/schema.js";
import { pool } from "./db";
import connectPgSimple from "connect-pg-simple";

// Email stubs - email sending disabled until RESEND_API_KEY is configured
async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  console.log(`[Email Disabled] Verification code for ${to}: ${code}`);
  return true;
}

async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  console.log(`[Email Disabled] Password reset link for ${to}: ${resetLink}`);
  return true;
}

const PgStore = connectPgSimple(session);

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r3pl1t_s3cr3t_t3a_app",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool: pool as any,
      createTableIfMissing: false,
      tableName: "user_sessions",
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: app.get("env") === "production",
      sameSite: "lax",
    },
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id as number);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/register/send-code", async (req, res) => {
    try {
      const { email, username } = req.body;

      if (!email || !username) {
        return res.status(400).json({ message: "Email and username are required" });
      }

      if (!rateLimit(`send-code:${email}`, 3, 60 * 1000)) {
        return res.status(429).json({ message: "Too many requests. Please wait a minute before trying again." });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      await storage.deleteVerificationCodesForEmail(email, "registration");

      const code = generateOTP();
      await storage.createVerificationCode({
        email,
        code,
        type: "registration",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const sent = await sendVerificationEmail(email, code);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }

      res.json({ message: "Verification code sent to your email" });
    } catch (err) {
      console.error("Error in send-code:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/register/verify", async (req, res, next) => {
    try {
      const { email, username, password, code } = req.body;

      if (!email || !username || !password || !code) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!rateLimit(`verify:${email}`, 5, 60 * 1000)) {
        return res.status(429).json({ message: "Too many attempts. Please wait a minute." });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const validCode = await storage.getValidVerificationCode(email, code, "registration");
      if (!validCode) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      await storage.markVerificationCodeUsed(validCode.id);

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: "user",
      });

      await storage.setEmailVerified(user.id);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      console.error("Error in verify:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      if (!rateLimit(`forgot:${email}`, 2, 5 * 60 * 1000)) {
        return res.status(429).json({ message: "Too many requests. Please wait a few minutes before trying again." });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, we've sent a reset link." });
      }

      await storage.deleteVerificationCodesForEmail(email, "password_reset");

      const token = randomBytes(32).toString("hex");
      await storage.createVerificationCode({
        email,
        code: token,
        type: "password_reset",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const resetLink = `${protocol}://${host}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      const sent = await sendPasswordResetEmail(email, resetLink);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send reset email. Please try again." });
      }

      res.json({ message: "If an account with that email exists, we've sent a reset link." });
    } catch (err) {
      console.error("Error in forgot-password:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { email, token, password } = req.body;

      if (!email || !token || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      if (!rateLimit(`reset:${email}`, 5, 60 * 1000)) {
        return res.status(429).json({ message: "Too many attempts. Please wait a minute." });
      }

      const validCode = await storage.getValidVerificationCode(email, token, "password_reset");
      if (!validCode) {
        return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link." });
      }

      await storage.markVerificationCodeUsed(validCode.id);
      await storage.deleteVerificationCodesForEmail(email, "password_reset");

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashedPassword, false);

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (err) {
      console.error("Error in reset-password:", err);
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  app.post("/api/user/update-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const hashedPassword = await hashPassword(password);
    await storage.updateUserPassword((req.user as User).id, hashedPassword, false);
    res.json({ message: "Password updated successfully" });
  });

  app.post("/api/user/update-email/send-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { email } = req.body;
      const user = req.user as User;

      if (!email) return res.status(400).json({ message: "Email is required" });
      if (email === user.email) return res.status(400).json({ message: "New email must be different from current email" });

      if (!rateLimit(`update-email:${user.id}`, 3, 60 * 1000)) {
        return res.status(429).json({ message: "Too many requests. Please wait a minute." });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already in use" });

      await storage.deleteVerificationCodesForEmail(email, "email_change");
      const code = generateOTP();
      await storage.createVerificationCode({
        email,
        code,
        type: "email_change",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const sent = await sendVerificationEmail(email, code);
      if (!sent) return res.status(500).json({ message: "Failed to send verification email" });

      res.json({ message: "Verification code sent to your new email" });
    } catch (err) {
      console.error("Error in update-email/send-code:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user/update-email/verify", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { email, code } = req.body;
      const user = req.user as User;

      if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

      const validCode = await storage.getValidVerificationCode(email, code, "email_change");
      if (!validCode) return res.status(400).json({ message: "Invalid or expired code" });

      await storage.markVerificationCodeUsed(validCode.id);
      await storage.updateUserEmail(user.id, email);

      res.json({ message: "Email updated successfully" });
    } catch (err) {
      console.error("Error in update-email/verify:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.json(null);
    res.json(req.user);
  });
}

export async function seedAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tsunbrew.local";

  if (!adminUsername || !adminPassword) {
    console.log("Skipping admin seed: ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.");
    return;
  }

  const existing = await storage.getUserByUsername(adminUsername);
  if (!existing) {
    console.log("Seeding admin account...");
    const hashedPassword = await hashPassword(adminPassword);
    await storage.createUser({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
    console.log("Admin account created.");
  }
}
