# Aiku Player v5 — Local Playback Edition

Netflix-style browser video player for direct media URLs.

## Features
- MP4/WebM/native browser playback
- Local video file playback with device file picker (no upload)
- Local MKV/AVI/3GP/etc. conversion fallback through FFmpeg/WASM
- HLS `.m3u8` via hls.js with quality and alternate audio tracks
- Vercel streaming proxy fallback with Range requests
- Play/pause, seek, 10s skip, volume, speed, fullscreen, PiP
- Fit / Fill / 100–300% zoom, pinch zoom and pan
- Subtitle/caption menu: HLS subtitle tracks, remote subtitle URL, local `.vtt` / `.srt` files and basic `.ass` / `.ssa` conversion
- Audio/language selector for HLS alternate audio tracks and native browser-exposed audio tracks
- Chapters menu when a chapters text track is supplied
- Cinema mode, screen lock, resume position, keyboard shortcuts
- Mobile double-tap seeking and center fullscreen gesture

## Deploy
Deploy the `Aiku-Player` directory to Vercel as a static site. The `/api/proxy` function is used automatically when a direct media request fails.

## Subtitle URL
You can preload a WebVTT subtitle with:
`?url=VIDEO_URL&sub=SUBTITLE_VTT_URL&subLabel=English`

Remote subtitle files must allow browser access (CORS), or the browser will block them.

## Format compatibility notes

No browser player can guarantee every video container and codec. Playback depends on the browser/device decoder and the codecs inside each file. The local FFmpeg/WASM fallback can transcode many unsupported files to H.264/AAC MP4, but it requires network access to load FFmpeg, uses substantial memory, and may not work for every codec or very large file. Alternate audio tracks are selectable only when the stream or browser exposes them. ASS/SSA subtitle conversion preserves text and timing but not advanced styling, positioning, or effects. Remote subtitle URLs must permit browser CORS access.
