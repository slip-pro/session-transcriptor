# Public pages meant to be found

Use for a public site whose pages should appear in search and link previews. The agreed minimum needs
no extra approval round; exposing private data is a different matter.

Use the site's page list as the source of routes, indexing intent, titles, descriptions, canonical
URLs, social images and expected content. Keep private routes explicitly excluded. Check:

- every public route returns success with JavaScript disabled, and its main text and links are present,
  not just an app shell;
- one title and description per page, titles unique, one correct absolute canonical, and Open Graph
  title, description and image matching the page;
- robots meta and `X-Robots-Tag`, including bot-specific rules: an unintended noindex is a failure.
  Private routes stay out of the sitemap; noindex is not access control. Never sign in for this check;
- the sitemap parses as XML and matches the page list; robots.txt names the sitemap and doesn't block
  public content; a made-up route returns a real 404;
- structured data matches visible facts. Report mismatches; never add irrelevant schema to silence
  a warning.

A wrapper's existence doesn't prove coverage: seed a missing canonical, a noindex and a private route,
and check they are caught. Local success says nothing about live bot blocking or actual indexing.
Never promise rankings or accept a score, llms.txt, FAQ markup or mass pages as evidence. Check
current provider guidance with dates for bot-specific policy.
