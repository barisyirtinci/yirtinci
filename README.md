# yirtinci.com

The studio site and Zone's product page. Static HTML, no build step, no dependencies —
GitHub Pages serves this folder exactly as it stands.

```
/                     studio homepage
/zone/                Zone product page  ← also Apple's required Support URL
/zone/privacy.html    privacy policy     ← linked from inside the app
/zone/terms.html      terms of use       ← linked from inside the app
/assets/base.css      shared foundation, palette lifted from the app
/assets/forecast.js   the two-process model, running client-side
/assets/zone-mark.svg the mark
CNAME                 yirtinci.com
.nojekyll             serve the files as-is, no Jekyll processing
```

## The two URLs that are not negotiable

`zone/src/content/legal.ts` in the app points at:

- `https://yirtinci.com/zone/privacy.html`
- `https://yirtinci.com/zone/terms.html`

and Apple requires a Support URL, which is `https://yirtinci.com/zone/`. All three must
resolve **without a login** before either store will approve a submission. Moving a page means
changing `SITE` in that file too.

Note: a local `npx serve` redirects `/zone/privacy.html` to `/zone/privacy`. That is `serve`'s
clean-URL default and **not** what GitHub Pages does — Pages serves the `.html` path directly.
The links in the app are correct as written.

## The curve is real

`assets/forecast.js` is the app's model, not a decorative SVG: Borbély's two processes plus the
Åkerstedt/Folkard inertia term, evaluated in the visitor's browser against their own clock. Load
the page at 3pm and at 3am and the hero reads differently, because the underlying quantity is
different.

The three harmonics in the circadian term are load-bearing. One gives a smooth arc with no
mid-afternoon dip; two produce the dip but flatten the morning peak into the evening one; three
separate them, which is what a day actually does. The coefficients were fitted against published
subjective-alertness curves for a 07:00 riser and sit within 1.6 points RMS of them.

## Publishing

1. **Create the repo.** Public, named anything — `yirtinci-site` is fine. Push the *contents* of
   this folder to the root of the default branch, not the folder itself:

   ```bash
   cd yirtinci.com
   git init && git add -A && git commit -m "Site"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. **Turn Pages on.** Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.

3. **Point the domain.** At Cloudflare (or wherever the DNS lives), add:

   | Type | Name | Value |
   |------|------|-------|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | `<you>.github.io` |

4. **Leave Cloudflare's proxy OFF — grey cloud, not orange.** GitHub issues the certificate itself
   through Let's Encrypt, and a proxied record intercepts the validation request, so provisioning
   never completes and *Enforce HTTPS* stays permanently greyed out. This is the single most common
   way this setup fails. You can turn the proxy on later, once the certificate exists.

5. **Wait for the certificate,** then tick **Enforce HTTPS** in Settings → Pages. Both stores
   require the policy URLs to be `https://`.

6. **Check the three URLs** in a private window before submitting anything:
   `/zone/`, `/zone/privacy.html`, `/zone/terms.html`.

## Editing

Open the files. There is no toolchain. `npx serve .` if you want it on localhost.

Colours, spacing and radii all come from `assets/base.css`, whose values are the app's own —
changing one there changes it everywhere on the site, and keeping it in step with
`zone/src/ui/theme.ts` is what makes the site and the product look like the same object.
