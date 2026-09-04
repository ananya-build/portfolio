# Hosting

## Where it lives now

**GitHub Pages**, served straight off the `main` branch of
`ananya-build/portfolio`. Live at:

> https://ananya-build.github.io/portfolio/

Cost: nothing. No domain, no account to connect, no build step — Pages just
serves the files in the repo. A `.nojekyll` file at the root tells Pages not to
run its Jekyll pass over them.

## Deploying a change

```bash
git add -A
git commit -m "..."
git push
```

Pages rebuilds on push. It usually goes live in under a minute; occasionally it
takes two or three. If a change doesn't appear, it's almost always the browser
cache — hard-reload with ⌘⇧R.

To check the deploy status:

```bash
gh api repos/ananya-build/portfolio/pages/builds/latest --jq '.status, .error.message'
```

## If you want a custom domain later

Nothing about the site has to change — it's the same static files, so this is
purely a DNS-and-settings job. Roughly ten minutes plus DNS propagation.

1. **Buy the domain.** Cloudflare Registrar sells at cost (about $10–12/yr for a
   `.com`, no upsells); Namecheap is fine too. Something like `ananyapradhan.com`.

2. **Point DNS at GitHub.** In the registrar's DNS panel:

   | Type | Name | Value |
   | --- | --- | --- |
   | `A` | `@` | `185.199.108.153` |
   | `A` | `@` | `185.199.109.153` |
   | `A` | `@` | `185.199.110.153` |
   | `A` | `@` | `185.199.111.153` |
   | `CNAME` | `www` | `ananya-build.github.io` |

   (Those four A records are GitHub's published Pages addresses. If you use
   Cloudflare, set the records to **DNS only**, not proxied — the orange cloud
   breaks GitHub's certificate issuance.)

3. **Tell the repo.** Settings → Pages → Custom domain → enter the domain →
   Save. That writes a `CNAME` file into the repo. Wait for the check to go
   green, then tick **Enforce HTTPS**.

Everything keeps working at the old `github.io` URL too — GitHub redirects it.

## The alternative, if this ever stops being a static page

If the site grows something that needs a server — a contact form that actually
sends, a CMS, anything server-rendered — move it to **Vercel**: connect the
GitHub repo, and it deploys on every push with a preview URL per branch. Also
free at this size. There's no reason to do it now; Pages is strictly simpler
for a page that is only files.
