// The only artwork on the board, copied from the public web app (web/assets/) and shrunk: the first three portraits
// (cropped square) and four pictures the game shows before an accusation. esbuild inlines them as data: URIs.
import agnes from "./art/portrait-agnes.webp";
import bertram from "./art/portrait-bertram.webp";
import clement from "./art/portrait-clement.webp";
import breakRoom from "./art/scene-break-room.webp";
import powerCut from "./art/scene-power-cut.webp";
import breakRoomCamera from "./art/scene-break-room-camera.webp";
import flyer from "./art/flyer-kipsake.webp";

export const art = {
  portraits: { agnes, bertram, clement },
  scenes: { "break-room": breakRoom, "power-cut": powerCut, "break-room-camera": breakRoomCamera, flyer },
};
