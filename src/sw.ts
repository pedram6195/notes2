/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { NetworkOnly } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

const API_BASE_URL = "https://notes-api-r040.onrender.com";

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST);

// clean old assets
cleanupOutdatedCaches();

let allowlist: RegExp[] | undefined;
// in dev mode, we disable precaching to avoid caching issues
if (import.meta.env.DEV) allowlist = [/^\/$/];

// to allow work offline
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), { allowlist })
);

self.skipWaiting();
clientsClaim();

// Create a Background Sync Plugin for the notes API
const bgSyncPlugin = new BackgroundSyncPlugin("notesQueue", {
  maxRetentionTime: 24 * 60,
  onSync: async ({ queue }) => {
    console.log("Sync event triggered");
    let entry;
    while ((entry = await queue.shiftRequest())) {
      console.log("Replaying request:", entry.request);
      try {
        await fetch(entry.request);
      } catch (error) {
        console.error("Replay failed", error);
        await queue.unshiftRequest(entry);
        break;
      }
    }
  },
});

// Register routes for POST, PUT, DELETE requests
registerRoute(
  ({ url }) => {
    return url.origin === API_BASE_URL && url.pathname.startsWith("/notes");
  },
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  "POST"
);

registerRoute(
  ({ url }) => {
    return url.origin === API_BASE_URL && url.pathname.startsWith("/notes");
  },
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  "PUT"
);

registerRoute(
  ({ url }) => {
    return url.origin === API_BASE_URL && url.pathname.startsWith("/notes");
  },
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  "DELETE"
);
