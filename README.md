# TKO and TNT State Finals: rings

Unofficial phone-friendly view of the [EventXpres ring list](https://www.eventxpres.com/RankView.html?EventId=3327&Mode=2), for personal use.

Page: https://altlimit-ai.github.io/tko-tnt-state-finals-rings/

EventXpres doesn't let other pages read its data, so a GitHub Action reads it about every 15 minutes and republishes the site. If a read fails, nothing is published and the last good copy stays up. The page warns when its data is over an hour old.

Run locally with `node build.mjs _site`, then serve `_site`.

To stop the refresh after the event: `gh workflow disable refresh.yml -R altlimit-ai/tko-tnt-state-finals-rings`.
