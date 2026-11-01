import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { validateSceneSpec } from "./scene-spec.mjs";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8081);
const ROOT = "/tmp/fresh-blender-worker";
const BLENDER_BIN = process.env.BLENDER_BIN || "blender";
const MAX_ACTIVE_JOBS = 1;
const MAX_RETAINED_JOBS = 60;
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const jobs = new Map();
await mkdir(ROOT, { recursive: true });
let blenderVersion = null;
try {
  const version = await execFileAsync(BLENDER_BIN, ["--version"], { timeout: 10000, maxBuffer: 64 * 1024 });
  blenderVersion = String(version.stdout).split("\\n")[0] || "Blender available";
} catch {
  console.error("Blender executable is unavailable; render jobs will fail until it is installed.");
}

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}
function authorized(req) {
  const expected = process.env.FRESH_BLENDER_WORKER_API_TOKEN;
  if (!expected) return "unconfigured";
  const value = req.headers.authorization || "";
  const supplied = Buffer.from(value.startsWith("Bearer ") ? value.slice(7) : "");
  const secret = Buffer.from(expected);
  return supplied.length === secret.length && timingSafeEqual(supplied, secret) ? "ok" : "denied";
}
async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32 * 1024) throw new Error("Scene request exceeds 32 KB.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
async function run(job) {
  const specPath = join(ROOT, job.id + ".json");
  const scriptPath = join(ROOT, job.id + ".py");
  const outputPath = join(ROOT, job.id + ".png");
  jobs.set(job.id, { ...job, status: "running", startedAt: new Date().toISOString() });
  try {
    await writeFile(specPath, JSON.stringify(job.scene), { flag: "wx" });
    await writeFile(scriptPath, "import bpy\nimport json\nimport math\nimport sys\nfrom mathutils import Vector\n\nspec_path = sys.argv[sys.argv.index(\"--\") + 1]\noutput_path = sys.argv[sys.argv.index(\"--\") + 2]\nwith open(spec_path, \"r\", encoding=\"utf-8\") as source:\n    spec = json.load(source)\n\nbpy.ops.object.select_all(action=\"SELECT\")\nbpy.ops.object.delete(use_global=False)\nscene = bpy.context.scene\nscene.render.engine = \"BLENDER_EEVEE\"\nscene.eevee.taa_render_samples = 32\nscene.render.resolution_x = int(spec[\"width\"])\nscene.render.resolution_y = int(spec[\"height\"])\nscene.render.resolution_percentage = 100\nscene.render.image_settings.file_format = \"PNG\"\nscene.render.film_transparent = False\nscene.render.filepath = output_path\nscene.render.threads_mode = \"FIXED\"\nscene.render.threads = 2\nscene.world.color = (0.025, 0.025, 0.04)\n\nfor item in spec[\"objects\"]:\n    kind = item[\"type\"]\n    loc = item[\"position\"]\n    if kind == \"cube\":\n        bpy.ops.mesh.primitive_cube_add(size=2, location=(loc[\"x\"], loc[\"y\"], loc[\"z\"]))\n    elif kind == \"sphere\":\n        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(loc[\"x\"], loc[\"y\"], loc[\"z\"]))\n    elif kind == \"cone\":\n        bpy.ops.mesh.primitive_cone_add(vertices=32, location=(loc[\"x\"], loc[\"y\"], loc[\"z\"]))\n    elif kind == \"torus\":\n        bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=12, location=(loc[\"x\"], loc[\"y\"], loc[\"z\"]))\n    else:\n        bpy.ops.mesh.primitive_plane_add(size=2, location=(loc[\"x\"], loc[\"y\"], loc[\"z\"]))\n    obj = bpy.context.object\n    obj.name = item[\"name\"]\n    obj.scale = (item[\"scale\"][\"x\"], item[\"scale\"][\"y\"], item[\"scale\"][\"z\"])\n    color = item[\"color\"].lstrip(\"#\")\n    rgb = tuple(int(color[i:i+2], 16) / 255.0 for i in (0, 2, 4))\n    material = bpy.data.materials.new(name=obj.name + \" Material\")\n    material.diffuse_color = (*rgb, 1.0)\n    material.use_nodes = True\n    bsdf = material.node_tree.nodes.get(\"Principled BSDF\")\n    if bsdf:\n        bsdf.inputs[\"Base Color\"].default_value = (*rgb, 1.0)\n        bsdf.inputs[\"Roughness\"].default_value = 0.48\n    obj.data.materials.append(material)\n\nbpy.ops.object.camera_add(location=(8, -12, 8))\ncamera = bpy.context.object\ndirection = Vector((0, 0, 0)) - camera.location\ncamera.rotation_euler = direction.to_track_quat(\"-Z\", \"Y\").to_euler()\ncamera.data.lens = 48\nscene.camera = camera\n\nbpy.ops.object.light_add(type=\"AREA\", location=(4, -5, 8))\nkey = bpy.context.object\nkey.data.energy = 1800\nkey.data.shape = \"DISK\"\nkey.data.size = 7\nbpy.ops.object.light_add(type=\"AREA\", location=(-6, 3, 4))\nfill = bpy.context.object\nfill.data.energy = 900\nfill.data.size = 6\n\nscene.view_settings.view_transform = \"Standard\"\nscene.view_settings.look = \"Medium High Contrast\"\nbpy.ops.render.render(write_still=True)\n", { flag: "wx" });
    await execFileAsync(BLENDER_BIN, ["--background", "--python", scriptPath, "--", specPath, outputPath], {
      timeout: 150000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, OMP_NUM_THREADS: "2" },
    });
    const info = await stat(outputPath);
    if (!info.size || info.size > MAX_OUTPUT_BYTES) throw new Error("Rendered image is empty or exceeds the 20 MB output limit.");
    const data = await readFile(outputPath);
    if (data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Renderer output failed PNG validation.");
    jobs.set(job.id, { ...job, status: "succeeded", startedAt: jobs.get(job.id).startedAt, completedAt: new Date().toISOString(), outputBytes: data.byteLength, outputPath });
  } catch (error) {
    await rm(outputPath, { force: true }).catch(() => {});
    jobs.set(job.id, { ...job, status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : String(error), completedAt: new Date().toISOString() });
  } finally {
    await Promise.all([specPath, scriptPath].map((path) => rm(path, { force: true }).catch(() => {})));
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") return json(res, blenderVersion ? 200 : 503, { ok: Boolean(blenderVersion), service: "fresh-blender-render-worker", blender: blenderVersion || "unavailable" });
    const auth = authorized(req);
    if (auth === "unconfigured") return json(res, 503, { error: "Blender worker authentication is not configured." });
    if (auth !== "ok") return json(res, 401, { error: "Authentication required." });
    if (req.method === "POST" && url.pathname === "/jobs") {
      const body = await readBody(req);
      const checked = validateSceneSpec(body.scene);
      if (!checked.ok) return json(res, 400, { error: checked.errors.join("; ") });
      if ([...jobs.values()].some((job) => job.status === "queued" || job.status === "running")) return json(res, 429, { error: "Blender worker is busy. Try again shortly." });
      if (jobs.size >= MAX_RETAINED_JOBS) {
        const finished = [...jobs.values()].filter((job) => ["succeeded", "failed"].includes(job.status));
        for (const old of finished.slice(0, Math.max(1, jobs.size - MAX_RETAINED_JOBS + 1))) {
          if (old.outputPath) await rm(old.outputPath, { force: true }).catch(() => {});
          jobs.delete(old.id);
        }
      }
      const ownerId = String(req.headers["x-fresh-user-id"] || "");
      if (!ownerId) return json(res, 401, { error: "Authenticated owner context is required." });
      const job = { id: randomUUID(), ownerId, status: "queued", scene: checked.scene, createdAt: new Date().toISOString() };
      jobs.set(job.id, job);
      void run(job);
      return json(res, 202, { jobId: job.id, status: "queued", statusUrl: "/jobs/" + job.id });
    }
    const match = url.pathname.match(/^\/jobs\/([0-9a-f-]{36})$/i);
    if (req.method === "GET" && match) {
      const job = jobs.get(match[1]);
      if (!job) return json(res, 404, { error: "Job not found." });
      if (job.ownerId !== String(req.headers["x-fresh-user-id"] || "")) return json(res, 404, { error: "Job not found." });
      const { scene, outputPath, ownerId, id, ...safe } = job;
      return json(res, 200, { ...safe, jobId: id, outputUrl: job.status === "succeeded" ? "/jobs/" + id + "/output" : null });
    }
    const output = url.pathname.match(/^\/jobs\/([0-9a-f-]{36})\/output$/i);
    if (req.method === "GET" && output) {
      const job = jobs.get(output[1]);
      if (!job || job.ownerId !== String(req.headers["x-fresh-user-id"] || "") || job.status !== "succeeded" || !job.outputPath) return json(res, 404, { error: "Render output is not available." });
      const data = await readFile(job.outputPath);
      res.writeHead(200, { "content-type": "image/png", "content-length": data.byteLength, "cache-control": "no-store", "x-content-type-options": "nosniff" });
      return res.end(data);
    }
    return json(res, 404, { error: "Not found." });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Invalid request." });
  }
});
server.listen(PORT, "0.0.0.0", () => console.log("Fresh Blender render worker listening on " + PORT));
