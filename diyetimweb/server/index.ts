import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import { connectDB } from "./db";
import { MongoStorage } from "./storage";
import cors from "cors";
import mongoose from "mongoose";
import { MONGODB_URI } from "./config";

// .env dosyasını yükle
dotenv.config();

// MongoDB'ye bağlan
connectDB().catch(err => {
  console.error("MongoDB bağlantı hatası:", err);
  process.exit(1);
});

// Storage instance'ı oluştur
export const storage = new MongoStorage();

// Örnek blog yazılarını ve aktiviteleri ekle - sadece başlangıçta
setTimeout(async () => {
  try {
    // Artık örnek aktiviteler eklemiyoruz
    // await storage.addSampleActivities();
    console.log("Uygulama başlatıldı.");
  } catch (error) {
    console.error("Başlatılırken hata:", error);
  }
}, 2000);

const app = express();

// CORS için gerekli middleware
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
