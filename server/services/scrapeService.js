import fetch from "node-fetch";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-core";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MIN_CONTENT_CHARS = Number(process.env.SCRAPE_MIN_CONTENT_CHARS) || 200;
const STATIC_TIMEOUT_MS = Number(process.env.SCRAPE_STATIC_TIMEOUT_MS) || 15000;
const PUPPETEER_TIMEOUT_MS =
  Number(process.env.SCRAPE_PUPPETEER_TIMEOUT_MS) || 30000;
const MAX_CONTENT_CHARS = 12000;
const HEADLESS = process.env.PUPPETEER_HEADLESS !== "false";

const isCloudRuntime = () =>
  Boolean(process.env.RENDER || process.env.AWS_EXECUTION_ENV);

const launchBrowser = async () => {
  if (isCloudRuntime()) {
    const chromium = (await import("@sparticuz/chromium")).default;

    return puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const puppeteerFull = await import("puppeteer");
  return puppeteerFull.default.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

const CONTENT_SELECTORS = [
  "article",
  "main",
  '[role="main"]',
  "#content",
  ".post-content",
  ".entry-content",
  "body",
];

const NOISE_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "noscript",
  "iframe",
  '[aria-hidden="true"]',
  ".cookie-banner",
  "#onetrust-banner-sdk",
  ".ad",
  ".ads",
  ".advertisement",
];

let browserInstance = null;
let browserLaunchPromise = null;

const collapseWhitespace = (text) =>
  String(text || "")
    .replace(/\s+/g, " ")
    .trim();

const capContent = (text) => collapseWhitespace(text).slice(0, MAX_CONTENT_CHARS);

const metaContent = ($, selectors) => {
  for (const selector of selectors) {
    const value = collapseWhitespace($(selector).first().attr("content"));
    if (value) return value;
  }
  return "";
};

const extractJsonLd = ($) => {
  const result = { title: "", description: "", body: "" };

  $('script[type="application/ld+json"]').each((_, element) => {
    if (result.title && result.description && result.body) return;

    const raw = $(element).html();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];

      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;

        const type = String(node["@type"] || "").toLowerCase();
        const isRelevant =
          type.includes("article") ||
          type.includes("webpage") ||
          type.includes("blogposting") ||
          type.includes("newsarticle");

        if (!isRelevant && nodes.length > 1) continue;

        result.title =
          result.title ||
          collapseWhitespace(node.headline || node.name || node.title);
        result.description =
          result.description || collapseWhitespace(node.description);
        result.body =
          result.body ||
          collapseWhitespace(node.articleBody || node.text || "");
      }
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return result;
};

const extractMetadata = ($) => {
  const jsonLd = extractJsonLd($);

  const title =
    metaContent($, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    collapseWhitespace($("title").first().text()) ||
    collapseWhitespace($("h1").first().text()) ||
    jsonLd.title;

  const excerpt =
    metaContent($, [
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ]) ||
    jsonLd.description ||
    "";

  return { title, excerpt, jsonLdBody: jsonLd.body };
};

const extractMainContent = ($) => {
  const working = cheerio.load($.html());

  working(NOISE_SELECTORS.join(", ")).remove();

  for (const selector of CONTENT_SELECTORS) {
    const text = capContent(working(selector).first().text());
    if (text.length >= MIN_CONTENT_CHARS) {
      return text;
    }
  }

  return capContent(working("body").text());
};

export const parseHtml = (html) => {
  const $ = cheerio.load(html);
  const { title, excerpt, jsonLdBody } = extractMetadata($);
  let content = extractMainContent($);

  if (content.length < MIN_CONTENT_CHARS && jsonLdBody.length >= MIN_CONTENT_CHARS) {
    content = capContent(jsonLdBody);
  }

  return {
    title,
    excerpt: capContent(excerpt),
    content,
  };
};

const fetchStaticHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(STATIC_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  return response.text();
};

const getBrowser = async () => {
  if (browserInstance?.connected) {
    return browserInstance;
  }

  if (!browserLaunchPromise) {
    browserLaunchPromise = launchBrowser();
  }

  browserInstance = await browserLaunchPromise;
  browserLaunchPromise = null;
  return browserInstance;
};

const fetchWithPuppeteer = async (url) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1280, height: 800 });

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const type = request.resourceType();
      if (["image", "font", "media"].includes(type)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: PUPPETEER_TIMEOUT_MS,
    });

    return page.content();
  } finally {
    await page.close();
  }
};

const mergeScrapeResults = (primary, fallback = {}) => ({
  title: primary.title || fallback.title || "",
  excerpt: primary.excerpt || fallback.excerpt || "",
  content: primary.content || fallback.content || "",
});

const isScrapeSufficient = ({ content, excerpt }) =>
  content.length >= MIN_CONTENT_CHARS || excerpt.length > 0;

export const scrapeUrl = async (url) => {
  let staticResult = { title: "", excerpt: "", content: "" };

  try {
    const html = await fetchStaticHtml(url);
    staticResult = parseHtml(html);

    if (isScrapeSufficient(staticResult)) {
      return {
        ...staticResult,
        method: "static",
      };
    }
  } catch (error) {
    console.warn("Static scrape failed:", error.message || error);
  }

  try {
    const html = await fetchWithPuppeteer(url);
    const puppeteerResult = mergeScrapeResults(parseHtml(html), staticResult);

    if (isScrapeSufficient(puppeteerResult)) {
      return {
        ...puppeteerResult,
        method: "puppeteer",
      };
    }

    if (puppeteerResult.title || puppeteerResult.excerpt) {
      return {
        ...puppeteerResult,
        method: "puppeteer",
      };
    }
  } catch (error) {
    console.warn("Puppeteer scrape failed:", error.message || error);

    if (isScrapeSufficient(staticResult)) {
      return {
        ...staticResult,
        method: "static",
      };
    }
  }

  if (staticResult.title || staticResult.excerpt || staticResult.content) {
    return {
      ...staticResult,
      method: staticResult.content ? "static" : "puppeteer",
    };
  }

  throw new Error("Could not extract content from the URL.");
};

export const closeBrowser = async () => {
  if (!browserInstance) return;

  try {
    await browserInstance.close();
  } catch (error) {
    console.warn("Failed to close Puppeteer browser:", error.message || error);
  } finally {
    browserInstance = null;
    browserLaunchPromise = null;
  }
};
