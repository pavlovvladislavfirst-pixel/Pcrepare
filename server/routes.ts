import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve the static landing page at root
  app.get("/", (req, res) => {
    const indexPath = path.resolve(import.meta.dirname, "..", "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Landing page not found");
    }
  });

  // Serve static assets for the landing page
  app.get("/styles.css", (req, res) => {
    const cssPath = path.resolve(import.meta.dirname, "..", "styles.css");
    if (fs.existsSync(cssPath)) {
      res.type("text/css").sendFile(cssPath);
    } else {
      res.status(404).send("CSS not found");
    }
  });

  app.get("/main.js", (req, res) => {
    const jsPath = path.resolve(import.meta.dirname, "..", "main.js");
    if (fs.existsSync(jsPath)) {
      res.type("application/javascript").sendFile(jsPath);
    } else {
      res.status(404).send("JS not found");
    }
  });

  // Serve translation files
  app.get("/i18n/:lang.json", (req, res) => {
    const langPath = path.resolve(import.meta.dirname, "..", "i18n", `${req.params.lang}.json`);
    if (fs.existsSync(langPath)) {
      res.type("application/json").sendFile(langPath);
    } else {
      res.status(404).send("Translation not found");
    }
  });

  // Serve assets directory
  app.get("/assets/:filename", (req, res) => {
    const assetPath = path.resolve(import.meta.dirname, "..", "assets", req.params.filename);
    if (fs.existsSync(assetPath)) {
      res.sendFile(assetPath);
    } else {
      res.status(404).send("Asset not found");
    }
  });

  // Serve addon files
  app.get("/addons/addons.css", (req, res) => {
    const addonCssPath = path.resolve(import.meta.dirname, "..", "addons", "addons.css");
    if (fs.existsSync(addonCssPath)) {
      res.type("text/css").sendFile(addonCssPath);
    } else {
      res.status(404).send("Addon CSS not found");
    }
  });

  app.get("/addons/addons.js", (req, res) => {
    const addonJsPath = path.resolve(import.meta.dirname, "..", "addons", "addons.js");
    if (fs.existsSync(addonJsPath)) {
      res.type("application/javascript").sendFile(addonJsPath);
    } else {
      res.status(404).send("Addon JS not found");
    }
  });

  // Serve logo file
  app.get("/logo_vector.svg", (req, res) => {
    const logoPath = path.resolve(import.meta.dirname, "..", "logo_vector.svg");
    if (fs.existsSync(logoPath)) {
      res.type("image/svg+xml").sendFile(logoPath);
    } else {
      res.status(404).send("Logo not found");
    }
  });

  app.get("/logo_neoconsult.svg", (req, res) => {
    const logoPath = path.resolve(import.meta.dirname, "..", "logo_neoconsult.svg");
    if (fs.existsSync(logoPath)) {
      res.type("image/svg+xml").sendFile(logoPath);
    } else {
      res.status(404).send("Logo not found");
    }
  });

  app.get("/favicon.ico", (req, res) => {
    const faviconPath = path.resolve(import.meta.dirname, "..", "favicon.ico");
    if (fs.existsSync(faviconPath)) {
      res.type("image/x-icon").sendFile(faviconPath);
    } else {
      res.status(404).send("Favicon not found");
    }
  });

  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
