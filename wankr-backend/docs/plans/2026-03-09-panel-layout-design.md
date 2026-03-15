# Panel Layout Redesign — SUS Probe + Launch Feed

**Date:** 2026-03-09
**Status:** Approved

## Layout Change

Current desktop grid: `420px 1fr 380px` (Sidebar | Chat | Right Panel)
New desktop grid: `420px 1fr 1fr` (Sidebar | Chat | SUS Probe top + Launch Feed bottom)

Chat shrinks to ~50% of remaining space. Right column expands and splits vertically into two panels.

## New Components

### SUSProbePanel (top half of right column)
- Input field: handle text input + "SUS" button
- Calls `POST /api/sus` with handle
- Shows: classification badge, voice state, report text
- Shows: KOL data, social profile, follower analysis when available
- Loading spinner during API call
- Scrollable report area

### LaunchFeedPanel (bottom half of right column)
- Polls `GET /api/pipeline/launch-feed` every 30s (new endpoint, reads from storage/pipeline/launch_reports/)
- Each entry: contract address, timestamp, flags (color-coded), token name/symbol
- Click to expand: full GoPlus/DexScreener/Basescan details
- Scrollable list, newest first
- Red glow on FLAGGED entries, green on clean

## CSS Changes

- `.dashboard-body` grid: `420px 1fr 1fr` on desktop
- Right column: flex column, gap 12px, two panels each `flex: 1`
- Tablet: right column becomes overlay drawer (existing pattern), panels stack vertically inside
- Mobile: same drawer behavior

## Backend Addition

- `GET /api/pipeline/launch-feed` — reads last 20 files from `storage/pipeline/launch_reports/`, returns sorted array
