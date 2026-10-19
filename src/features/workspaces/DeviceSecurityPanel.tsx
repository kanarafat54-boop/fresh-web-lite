import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported" | "not-requested";
type DeviceRow = {
  id: string;
  device_key: string;
  device_name: string;
  platform: string;
  user_agent: string;
  permission_states: Record<string, PermissionState>;
  first_seen_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

const permissionNames = ["camera", "microphone", "location", "notifications"] as const;
type PermissionName = typeof permissionNames[number];
type Props = { userId: string; onSignOut: () => Promise<void> };

function getDeviceKey() {
  const storageKey = "fresh-id-device-key-v1";
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.length >= 16) return existing;
    const created = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `fwl-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `temporary-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Android phone or tablet" : "Android device";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Windows/i.test(ua)) return "Windows computer";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac computer";
  if (/Linux/i.test(ua)) return "Linux computer";
  return "Web browser device";
}

function readPermissionSnapshot(): Record<string, PermissionState> {
  let saved: Record<string, PermissionState> = {};
  try { saved = JSON.parse(window.localStorage.getItem("fresh-id-permission-state-v1") || "{}"); } catch { /* ignore invalid local state */ }
  if ("Notification" in window) saved.notifications = Notification.permission as PermissionState;
  else saved.notifications = "unsupported";
  for (const name of ["camera", "microphone", "location"]) {
    if (!saved[name]) saved[name] = "not-requested";
  }
  return saved;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export default function DeviceSecurityPanel({ userId, onSignOut }: Props) {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [permissionStates, setPermissionStates] = useState<Record<string, PermissionState>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [deviceKey] = useState(() => typeof window === "undefined" ? "server-render" : getDeviceKey());

  const syncPermissionState = useCallback(async (next: Record<string, PermissionState>) => {
    setPermissionStates(next);
    try { window.localStorage.setItem("fresh-id-permission-state-v1", JSON.stringify(next)); } catch { /* device storage may be disabled */ }
    const { error } = await supabase.from("fresh_id_devices").update({
      permission_states: next,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    }).eq("user_id", userId).eq("device_key", deviceKey);
    if (error) setStatus("Permission state changed on this device, but could not sync to Fresh ID. Apply the device registry migration and retry.");
  }, [deviceKey, userId]);

  const refreshDevices = useCallback(async () => {
    const { data, error } = await supabase.from("fresh_id_devices")
      .select("id,device_key,device_name,platform,user_agent,permission_states,first_seen_at,last_seen_at,revoked_at")
      .eq("user_id", userId).order("last_seen_at", { ascending: false });
    if (error) {
      setStatus(error.code === "42P01" || error.code === "PGRST205"
        ? "Device management needs the Fresh ID device registry migration before it can sync."
        : "Fresh ID could not load your device list. Check your connection and account access.");
      return;
    }
    setDevices((data ?? []) as DeviceRow[]);
  }, [userId]);

  const registerCurrentDevice = useCallback(async () => {
    const snapshot = readPermissionSnapshot();
    setPermissionStates(snapshot);
    const { error } = await supabase.from("fresh_id_devices").upsert({
      user_id: userId,
      device_key: deviceKey,
      device_name: getDeviceName(),
      platform: navigator.platform || "Unknown platform",
      user_agent: navigator.userAgent.slice(0, 1000),
      permission_states: snapshot,
      last_seen_at: new Date().toISOString(),
      revoked_at: null,
    }, { onConflict: "user_id,device_key" });
    if (error) {
      setStatus(error.code === "42P01" || error.code === "PGRST205"
        ? "Device management is ready in the interface but needs the Fresh ID device registry migration applied."
        : "This device could not be registered. Check the connection and database permissions.");
      return;
    }
    await refreshDevices();
  }, [deviceKey, refreshDevices, userId]);

  useEffect(() => {
    void registerCurrentDevice();
    const heartbeat = window.setInterval(() => {
      void supabase.from("fresh_id_devices").update({
        last_seen_at: new Date().toISOString(),
        permission_states: readPermissionSnapshot(),
        revoked_at: null,
      }).eq("user_id", userId).eq("device_key", deviceKey);
    }, 60000);
    const refresh = window.setInterval(() => void refreshDevices(), 30000);
    return () => { window.clearInterval(heartbeat); window.clearInterval(refresh); };
  }, [deviceKey, refreshDevices, registerCurrentDevice, userId]);

  async function requestPermission(name: PermissionName) {
    setBusy(true);
    setStatus("");
    try {
      let state: PermissionState = "unsupported";
      if (name === "notifications") {
        if ("Notification" in window) state = await Notification.requestPermission() as PermissionState;
      } else if (name === "location") {
        if ("geolocation" in navigator) {
          state = await new Promise<PermissionState>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve("granted"),
              (error) => resolve(error.code === error.PERMISSION_DENIED ? "denied" : "prompt"),
              { maximumAge: 0, timeout: 12000 },
            );
          });
        }
      } else if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia(name === "camera" ? { video: true } : { audio: true });
        stream.getTracks().forEach((track) => track.stop());
        state = "granted";
      }
      const next = { ...permissionStates, [name]: state };
      await syncPermissionState(next);
      setStatus(state === "granted"
        ? `${name[0].toUpperCase() + name.slice(1)} permission is allowed by your browser.`
        : state === "denied"
          ? `${name[0].toUpperCase() + name.slice(1)} permission was denied. Change it in your browser or device settings if you want to allow it.`
          : `${name[0].toUpperCase() + name.slice(1)} permission is ${state}. Fresh does not bypass browser or operating-system controls.`);
    } catch (error) {
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      const next = { ...permissionStates, [name]: denied ? "denied" as const : "prompt" as const };
      await syncPermissionState(next);
      setStatus(denied ? "Permission was denied. You can change it in browser or device settings." : "This device could not grant that permission. Check the browser's secure-context and device settings.");
    } finally {
      setBusy(false);
    }
  }

  async function signOutOtherDevices() {
    setBusy(true);
    setStatus("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) { setStatus("Fresh ID could not sign out the other sessions. Try again."); return; }
      const { error: updateError } = await supabase.from("fresh_id_devices").update({ revoked_at: new Date().toISOString() })
        .eq("user_id", userId).neq("device_key", deviceKey);
      await refreshDevices();
      setStatus(updateError
        ? "Other authentication sessions were signed out. The device inventory could not be fully refreshed."
        : "Other Fresh ID sessions have been signed out. This device stays signed in.");
    } catch {
      setStatus("Fresh ID could not reach the session service. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  async function signOutEverywhere() {
    if (!window.confirm("Sign out Fresh ID on every device, including this one? You will need to sign in again.")) return;
    setBusy(true);
    setStatus("");
    await supabase.from("fresh_id_devices").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setBusy(false);
      setStatus("Fresh ID could not sign out every session. Try again.");
      return;
    }
    await onSignOut();
  }

  return <section className="fresh-settings-card fresh-device-security">
    <div><h2>Devices and device permissions</h2><p>See browsers that have used your Fresh ID and request access only when you choose. Browser and operating-system permission prompts remain in control; Fresh cannot silently enable camera, microphone, location, or notifications.</p></div>
    <div className="fresh-device-permissions">
      {permissionNames.map((name) => <div className="fresh-device-permission" key={name}>
        <div><strong>{name[0].toUpperCase() + name.slice(1)}</strong><small>Current device: {permissionStates[name] || "not-requested"}</small></div>
        <button type="button" onClick={() => void requestPermission(name)} disabled={busy}>{name === "notifications" ? "Allow notifications" : name === "location" ? "Allow location" : `Allow ${name}`}</button>
      </div>)}
    </div>
    <div className="fresh-device-actions"><button type="button" onClick={() => void refreshDevices()} disabled={busy}>Refresh device list</button><button type="button" onClick={() => void signOutOtherDevices()} disabled={busy}>Sign out other devices</button><button type="button" className="fresh-settings-danger" onClick={() => void signOutEverywhere()} disabled={busy}>Sign out everywhere</button></div>
    <div className="fresh-device-list"><h3>Devices using this Fresh ID</h3>{devices.length === 0 ? <p>No device records are available yet.</p> : devices.map((device) => <article className="fresh-device-row" key={device.id}>
      <div><strong>{device.device_name}{device.device_key === deviceKey ? " · This device" : ""}</strong><small>{device.platform} · Last active {formatDate(device.last_seen_at)}</small><small>{device.revoked_at ? `Session marked signed out ${formatDate(device.revoked_at)}` : "Session status not independently confirmed"}</small></div>
      <span className={device.device_key === deviceKey ? "fresh-settings-status good" : "fresh-settings-status"}>{device.device_key === deviceKey ? "Current" : device.revoked_at ? "Signed out" : "Registered"}</span>
    </article>)}</div>
    <p className="fresh-settings-help">Device inventory is based on this browser's local device identifier and recent check-ins, not a hardware fingerprint. “Sign out other devices” revokes other Supabase Auth sessions. A device that is offline may show stale activity until it reconnects. Permission choices apply to this browser/device, not to every device on your account.</p>
    {status && <p className="fresh-settings-feedback" role="status">{status}</p>}
  </section>;
}
