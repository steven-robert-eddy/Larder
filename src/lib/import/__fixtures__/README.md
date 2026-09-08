# Parser fixtures

Design doc section 12: *"Test the parsers with fixtures. Save real HTML
from a dozen recipe sites... into a fixtures directory. These are the
regression suite. Parsers are where this app will actually break."*

**These specific files are not scraped from real sites.** The sandbox
this was built in has no general internet access, so these are
hand-written to accurately match the real JSON-LD shapes different
recipe plugins/sites actually produce (WordPress Recipe Maker-style
flat strings, `HowToStep` objects, `HowToSection`-grouped steps inside
a Yoast-style `@graph` wrapper, sparse/minimal markup, and a page with
no structured data at all). They exercise the same shape variance real
fixtures would, but they're not a substitute for the real thing.

**To strengthen this suite:** grab real HTML from actual recipe sites
you use — `curl -A "Mozilla/5.0..." <url> > some-site.html`, or "View
Page Source" and save — drop the file here, and add a case in
`json-ld.test.ts` pointing at it. A dozen real sites, per the design
doc, is the actual target.
