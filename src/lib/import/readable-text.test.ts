import { describe, it, expect } from "vitest";
import { extractReadableText, extractOgImage } from "./readable-text";

describe("extractReadableText", () => {
  it("strips tags and boilerplate noise", () => {
    const html = `
      <html><head><style>.a{color:red}</style></head>
      <body>
        <nav>Home | About</nav>
        <script>trackStuff();</script>
        <header>Site Header</header>
        <main>
          <h1>Slow Cooker Apple Butter Meatballs</h1>
          <p>1 lb ground beef &amp; 1/2 cup breadcrumbs</p>
          <p>Cook on low for 6 hours.</p>
        </main>
        <footer>Copyright 2026</footer>
      </body></html>
    `;

    const text = extractReadableText(html);

    expect(text).toContain("Slow Cooker Apple Butter Meatballs");
    expect(text).toContain("1 lb ground beef & 1/2 cup breadcrumbs");
    expect(text).toContain("Cook on low for 6 hours.");
    expect(text).not.toContain("trackStuff");
    expect(text).not.toContain("Home | About");
    expect(text).not.toContain("Site Header");
    expect(text).not.toContain("Copyright 2026");
  });

  it("caps output length", () => {
    const html = `<p>${"x".repeat(20_000)}</p>`;
    expect(extractReadableText(html).length).toBeLessThanOrEqual(15_000);
  });

  it("decodes numeric and named entities", () => {
    const html = "<p>Cook &#39;til golden, &amp; add sugar &amp; salt</p>";
    const text = extractReadableText(html);
    expect(text).toContain("Cook 'til golden, & add sugar & salt");
  });
});

describe("extractOgImage", () => {
  it("finds an og:image meta tag", () => {
    const html = `<head><meta property="og:image" content="https://example.com/hero.jpg"></head>`;
    expect(extractOgImage(html)).toBe("https://example.com/hero.jpg");
  });

  it("returns null when absent", () => {
    expect(extractOgImage("<head></head>")).toBeNull();
  });
});
