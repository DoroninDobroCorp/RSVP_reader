# Website deployment on serverforvovka

The active release is served through /srv/hummingread/current. The app retains its original origin, https://145.239.82.124.sslip.io/rsvp/, to preserve browser-local libraries. Marketing uses https://hummingread.145.239.82.124.sslip.io/ with EN/RU/ES pages, its own robots/sitemap and no service worker.

## Prepare and activate

1. Finish source, commit and push only the existing mission/android-r5-recovery-20260814 review branch.
2. Clone that exact remotely verified SHA to a fresh server-side directory; run npm ci and npm run ios:release-check there. Exit 2 means all source/web checks passed but native release gates remain BLOCKED; inspect artifacts/ios-candidate/summary.json. Exit 1 is a failed source/web gate and must not be deployed.
3. Confirm a clean source worktree and matching sourceSha/webChecksPassed in that summary.
4. Run bash deploy/publish-verified-site.sh ABSOLUTE_VALIDATED_CHECKOUT. It stages an immutable root-owned runtime, preserves prior configuration and mutable-runtime fallback when necessary, validates nginx, switches the symlink, restarts the stateless article service, reloads nginx and checks public pages/private-path rejection. It rolls back its changed configuration/target if activation or probes fail.
5. Save the printed SHA, release and backup paths. Independently inspect the live website in a browser, language links and demo; inspect the app and support page too.

The publisher requires the actual current nginx snippet /etc/nginx/snippets/hummingread-rsvp.conf and rsvp-reader.service topology. Do not run the older August activation script against unrelated current nginx configuration.

## Rollback

Use only the exact saved backup. Its current-target.txt preserves the original symlink; rollback-target.txt points to a frozen runtime if the original symlink targeted the mutable checkout.

Read rollback-target.txt as root, create a temporary symlink under /srv/hummingread pointing to that target, atomically rename it over current, restore marketing.conf to /etc/nginx/sites-available/hummingread-marketing and rsvp.conf to /etc/nginx/snippets/hummingread-rsvp.conf, run nginx -t, restart rsvp-reader.service and reload nginx. Check public app, support and native-blocked status again. Keep failed release files for diagnosis. Do not reset Git or remove user/client data.

## Operations

TLS is issued through the existing Certbot account with webroot /var/www/hummingread-acme. Preserve the HTTP challenge location and existing certificate renewal. The free hostname is temporary infrastructure, not a purchased brand domain. To change it, update website.baseUrl and the two marketing nginx templates, obtain matching TLS and redirect the old site.

website.donationUrl is null until the owner has a real provider account. Adding an HTTPS URL enables the website-only voluntary support link after rebuild. It does not add a native iOS payment path or claim App Store approval.
