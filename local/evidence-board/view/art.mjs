// The only artwork on the board, copied from the public web app (web/assets/) and shrunk: the first three portraits
// (cropped square) and the Break Room scene. esbuild inlines them as data: URIs.
import agnes from "./art/portrait-agnes.webp";
import bertram from "./art/portrait-bertram.webp";
import clement from "./art/portrait-clement.webp";
import breakRoom from "./art/scene-break-room.webp";

export const art = { portraits: { agnes, bertram, clement }, scenes: { "break-room": breakRoom } };
