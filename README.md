# Aiku Player — Test Build 6

A mobile-friendly browser player for direct HTTP(S) media URLs and local files.

## Included
- Direct browser playback for supported MP4/WebM/MOV and other browser-supported codecs.
- HLS `.m3u8` playback through hls.js, including HLS alternate audio and subtitle tracks when the playlist exposes them.
- Local file picker, including MKV, AVI, 3GP, TS, FLAC, MP3 and other common media extensions.
- Optional FFmpeg/WASM conversion fallback for some unsupported local or remote formats.
- External VTT/SRT/ASS/SSA subtitle loading, subtitle URL query parameters, chapters where exposed, fit/fill/zoom, pinch zoom, speed, seeking, PiP, fullscreen, resume position and mobile gestures.
- Vercel `/api/proxy` fallback with byte-range forwarding, CORS, HLS playlist URI resolution, redirect checks and basic private-host blocking.

## Deploy to Vercel
1. Import this folder/repository into Vercel.
2. Keep `index.html`, `app.js`, `api/proxy.js`, `vercel.json`, and `manifest.webmanifest` at the project root structure shown here.
3. Deploy with no build command required for the static frontend and Edge Function.

## Test a media URL
Open the deployed site, paste a direct media URL, then use the Audio/Subtitles menus if tracks are exposed. You can also load an external subtitle with:

`?url=VIDEO_URL&sub=SUBTITLE_VTT_URL&subLabel=English`

The video and subtitle host must allow access or be reachable through the proxy. Signed URLs may expire; protected streams requiring cookies, login, DRM, or special request headers may not work.

## Important compatibility limits
A browser player cannot promise to play every format. HTML video does not reliably expose embedded audio/subtitle tracks inside arbitrary MKV/MP4/AVI files. HLS alternate tracks are supported when declared by the playlist. For embedded tracks in arbitrary containers, a server-side FFmpeg/FFprobe media service is required to inspect and remux/transcode the source; this static Vercel build does not include that service.

FFmpeg/WASM runs in the browser, downloads the media into memory, and can be slow or fail on large files and unsupported codecs. For large files, use a server-side media worker. This project does not support native RTSP/RTMP playback and does not bypass DRM, authentication, expired tokens, or provider restrictions.

## Proxy safety note
The proxy accepts public HTTP(S) URLs and checks redirect targets to reduce private-network access risks. For a production public service, further restrict allowed upstream hosts or add rate limiting/authentication to prevent abuse.
