import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalFetch = globalThis.fetch;
const tempDir = await mkdtemp(join(tmpdir(), "fresh-external-media-"));
async function loadRoute(path, filename) {
  const bundle = await build({ entryPoints: [path], bundle: true, platform: "node", format: "esm", write: false, packages: "bundle" });
  const modulePath = join(tempDir, filename);
  await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
  return import(pathToFileURL(modulePath).href);
}
try {
  const imagesRoute = await loadRoute("api/research/images.ts", "images.mjs");
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls++;
    const url = String(input);
    assert.match(url, /^https:\/\/commons\.wikimedia\.org\/w\/api\.php\?/);
    return new Response(JSON.stringify({ query: { pages: {
      "1": { title: "File:Mountain.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/thumb.jpg", url: "https://upload.wikimedia.org/original.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Mountain.jpg", extmetadata: { ImageDescription: { value: "A <b>mountain</b>" }, Artist: { value: "Example Artist" }, LicenseShortName: { value: "CC BY-SA 4.0" } } }] },
      "2": { title: "File:Unsafe.jpg", imageinfo: [{ thumburl: "https://example.test/unsafe.jpg", descriptionurl: "https://example.test/source" }] }
    } } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const badImages = await imagesRoute.POST(new Request("https://fresh.test/api/research/images", { method: "POST", body: JSON.stringify({ query: " " }) }));
  assert.equal(badImages.status, 400);
  assert.equal(calls, 0);
  const imageResponse = await imagesRoute.POST(new Request("https://fresh.test/api/research/images", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "mountain", limit: 3 }) }));
  assert.equal(imageResponse.status, 200);
  const imageBody = await imageResponse.json();
  assert.equal(imageBody.resultCount, 1, "unsafe non-provider image/source URLs must be filtered");
  assert.equal(imageBody.results[0].provider, "Wikimedia Commons");
  assert.equal(imageBody.results[0].author, "Example Artist");
  assert.equal(imageBody.results[0].license, "CC BY-SA 4.0");
  assert.equal(imageBody.results[0].sourceUrl, "https://commons.wikimedia.org/wiki/File:Mountain.jpg");
  assert.equal(imageBody.results[0].description, "A mountain");

  const videosRoute = await loadRoute("api/research/videos.ts", "videos.mjs");
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://archive.org/advancedsearch.php?")) {
      return new Response(JSON.stringify({ response: { docs: [{ identifier: "film-1", title: "Example film" }, { identifier: "film-2", title: "Not playable" }, { identifier: "../bad", title: "Invalid id" }] } }), { status: 200 });
    }
    if (url === "https://archive.org/metadata/film-1") {
      return new Response(JSON.stringify({ metadata: { title: "Example film", creator: "Example creator", date: "2020" }, files: [{ name: "sample.mp4", format: "MPEG4" }] }), { status: 200 });
    }
    if (url === "https://archive.org/metadata/film-2") {
      return new Response(JSON.stringify({ metadata: { title: "Not playable" }, files: [{ name: "poster.pdf", format: "PDF" }] }), { status: 200 });
    }
    throw new Error("Unexpected URL " + url);
  };
  const videoResponse = await videosRoute.POST(new Request("https://fresh.test/api/research/videos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "documentary", limit: 4 }) }));
  assert.equal(videoResponse.status, 200);
  const videoBody = await videoResponse.json();
  assert.equal(videoBody.resultCount, 1, "results without a playable video file must be excluded");
  assert.equal(videoBody.results[0].provider, "Internet Archive");
  assert.equal(videoBody.results[0].videoUrl, "https://archive.org/download/film-1/sample.mp4");
  assert.equal(videoBody.results[0].sourceUrl, "https://archive.org/details/film-1");

  globalThis.fetch = async () => new Response("provider unavailable", { status: 503 });
  const providerFailure = await imagesRoute.POST(new Request("https://fresh.test/api/research/images", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "mountain" }) }));
  assert.equal(providerFailure.status, 502, "provider failure must be explicit, not represented as empty success");
  console.log("Fresh external media search tests: PASS (input validation, attribution, URL filtering, playable video filtering, provider errors)");
} finally {
  globalThis.fetch = originalFetch;
  await rm(tempDir, { recursive: true, force: true });
}
