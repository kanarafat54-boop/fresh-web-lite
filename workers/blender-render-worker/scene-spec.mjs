const TYPES = new Set(["cube", "sphere", "cone", "torus", "plane"]);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function validateSceneSpec(value) {
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, errors: ["scene must be an object"] };
  const title = typeof value.title === "string" ? value.title.trim().slice(0, 80) : "Fresh 3D scene";
  const objects = value.objects;
  if (!Array.isArray(objects) || objects.length < 1 || objects.length > 16) errors.push("scene must contain between 1 and 16 objects");
  const normalized = [];
  for (const [index, object] of (Array.isArray(objects) ? objects : []).entries()) {
    if (!object || typeof object !== "object" || !TYPES.has(object.type)) {
      errors.push(`object ${index + 1} has an unsupported type`);
      continue;
    }
    const position = object.position ?? {};
    const scale = object.scale ?? {};
    const color = typeof object.color === "string" && /^#[0-9a-f]{6}$/i.test(object.color) ? object.color : "#8b83ff";
    const coords = ["x", "y", "z"].map((key) => position[key] ?? 0);
    const sizes = ["x", "y", "z"].map((key) => scale[key] ?? 1);
    const rotation = object.rotation ?? {};
    const angles = ["x", "y", "z"].map((key) => rotation[key] ?? 0);
    if (!coords.every((n) => finite(n) && Math.abs(n) <= 20)) errors.push(`object ${index + 1} position is outside the supported range`);
    if (!sizes.every((n) => finite(n) && n >= 0.1 && n <= 8)) errors.push(`object ${index + 1} scale is outside the supported range`);
    if (!angles.every((n) => finite(n) && Math.abs(n) <= 6.2832)) errors.push(`object ${index + 1} rotation is outside the supported range`);
    normalized.push({
      name: typeof object.name === "string" ? object.name.trim().slice(0, 40) : `Object ${index + 1}`,
      type: object.type,
      position: { x: clamp(coords[0] || 0, -20, 20), y: clamp(coords[1] || 0, -20, 20), z: clamp(coords[2] || 0, -20, 20) },
      scale: { x: clamp(sizes[0] || 1, 0.1, 8), y: clamp(sizes[1] || 1, 0.1, 8), z: clamp(sizes[2] || 1, 0.1, 8) },
      rotation: { x: clamp(angles[0] || 0, -6.2832, 6.2832), y: clamp(angles[1] || 0, -6.2832, 6.2832), z: clamp(angles[2] || 0, -6.2832, 6.2832) },
      color,
    });
  }
  const width = finite(value.width) ? Math.round(clamp(value.width, 320, 1280)) : 960;
  const height = finite(value.height) ? Math.round(clamp(value.height, 240, 720)) : 540;
  if (errors.length) return { ok: false, errors };
  return { ok: true, scene: { title, objects: normalized, width, height } };
}
