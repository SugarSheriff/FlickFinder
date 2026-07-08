# FlickFinder

A small decision-tree client that helps you pick something to watch — no scrolling, no infinite carousel. Answer four questions (medium, mood, era, time commitment) and it queries [TMDB](https://www.themoviedb.org/) live for a match.

## How it works

Each question is framed as a node in a routing console, with a trace line that lights up as you move through the flow. On resolution, it hits TMDB's `/discover` endpoint with the mapped filters (genre, release window, runtime or status) and returns a live result — reroll to cycle through other matches from the same query without re-fetching.

## Stack

Plain HTML / CSS / JS, no build step. Fonts: Space Grotesk (display), IBM Plex Mono (labels).

## Setup

This is a static site — open `index.html` directly or serve the folder. The TMDB API token lives in `script.js`. If you fork this, swap in your own token from [TMDB's API settings](https://www.themoviedb.org/settings/api) — note that since this is a client-side static site, the token is visible in the page source to anyone who visits (fine for TMDB's read-only, rate-limited keys; not a place to put anything sensitive).

---
Built by [Liam Hulsey](https://sugarsheriff.github.io/lookatme/)
