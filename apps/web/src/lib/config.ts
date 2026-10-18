// Deployment constants shared by server and browser code.
export const BLACKOUT_ADDRESS = "0x06366C26dD74463B343170ABA47f0dc27c223a6A";
export const CONTRACT = (process.env.NEXT_PUBLIC_BLACKOUT_ADDRESS || BLACKOUT_ADDRESS) as `0x${string}`;
export const STUDIO_RPC = "https://studio-dev.genlayer.com/api";
export const STUDIO_CHAIN_ID = 61997;
export const EXPLORER = "https://explorer-studio-dev.genlayer.com";
export const REPO = "https://github.com/0xdopewilly/blackout";
export const SITE = process.env.NEXT_PUBLIC_SITE || "https://blackout-cover.vercel.app";
