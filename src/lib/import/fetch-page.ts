const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const MAX_HTML_BYTES = 5_000_000;
const FETCH_TIMEOUT_MS = 15_000;

export class PageFetchError extends Error {}

/** Fetches a page server-side with a normal browser user-agent (design doc section 5.1). */
export async function fetchPageHtml(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PageFetchError("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new PageFetchError("Only http(s) URLs are supported.");
  }

  let response: Response;
  try {
    response = await fetch(parsed, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new PageFetchError(err instanceof Error && err.name === "TimeoutError" ? "The page took too long to load." : "Could not reach that URL.");
  }

  if (!response.ok) {
    throw new PageFetchError(`The page returned an error (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("xml")) {
    throw new PageFetchError("That URL doesn't look like a web page.");
  }

  const html = await response.text();
  if (html.length > MAX_HTML_BYTES) {
    throw new PageFetchError("That page is too large to import.");
  }

  return html;
}

/** Best-effort site name for `source_name` — og:site_name, falling back to the hostname. */
export function extractSiteName(html: string, url: string): string {
  const match = /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (match) return match[1].trim();

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
