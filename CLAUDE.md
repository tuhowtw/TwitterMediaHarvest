# CLAUDE.md — TwitterMediaHarvest (tuhowtw fork)

## Purpose

Personal fork of [EltonChou/TwitterMediaHarvest](https://github.com/EltonChou/TwitterMediaHarvest).
Downloads Twitter/X media and names files `{account}-{tweetId}-{serial}` for easy source tracing.

## Branch scheme

| Branch             | Purpose                                       | Target       |
| ------------------ | --------------------------------------------- | ------------ |
| `main`             | Feature 1: save animated GIF as real .gif     | Upstream PR  |
| `feat/dual-folder` | Feature 2: two folder buttons (personal only) | Build + sign |

## Build & sign (Firefox, personal)

Instructions: `C:\Users\drunk\howtu_program\Twitter-media-harvest\TwitterMediaHarvest-main\BUILD_AND_SIGN.md`

Short form:

```bash
yarn build:firefox:all                   # production only — dev JS too large for AMO
node -e "..."                            # replace manifest gecko.id → mediaharvest-personal@my.extensions
yarn sign:firefox                        # web-ext@latest, --channel=unlisted
```

Creds: `.env.signing.local` (git-ignored) — AMO JWT issuer + secret.
Install signed `.xpi` via Firefox `about:addons` → Install Add-on From File.
Version in `package.json` must be bumped each AMO upload.

## Key architectural facts

### GIF != Video internally, but same bytes

- Twitter stores animated GIFs as mp4 files (video.twimg.com/tweet_video/\*.mp4).
- The X API media.type field distinguishes: 'animated_gif' vs 'video'.
- Upstream collapses both to type:'video' in src/libs/XApi/parsers/tweetMedia.ts (isVideoMedia), and this fork does the same — no 'animated_gif' type in the domain model anymore.
- Instead, TweetMediaFile.isGif detects GIFs by source URL (source.includes('/tweet_video/')). No transcoding. GIFs download as .mp4 with a gif- filename prefix so they're identifiable in download lists.
- Filename example: gif-elonmusk-1234567890-01.mp4

### Single folder / button (upstream)

- One download button in post action bar (src/contentScript/core/Harvester.ts).
- Target folder from a single directory in FilenameSetting (sync storage).
- Feature 2 adds directory2, two distinct-icon buttons with data-folder a/b, threads folder through message -> download use case.

## Dev setup

```bash
yarn install
yarn build:dev
yarn test
```
