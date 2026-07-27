/**
 * Fresh Web Lite
 * Profile View — shown as a full overlay over the current tab
 */

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { BackIcon } from "../../../components/Icons";

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

interface ShortSummary {
  id: string;
  videoUrl: string;
  likeCount: number;
}

export function ProfileView({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { user } = useFreshId();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [shorts, setShorts] = useState<ShortSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    setError(null);

    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, username, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profileData) {
      setError("Couldn't load this profile.");
      setLoading(false);
      return;
    }

    setProfile({
      id: profileData.id,
      fullName: profileData.full_name,
      username: profileData.username,
      role: profileData.role,
    });

    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followed_id", userId);
    setFollowerCount(followers ?? 0);

    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);
    setFollowingCount(following ?? 0);

    if (user && user.id !== userId) {
      const { data: followRow } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followed_id", userId)
        .maybeSingle();
      setIsFollowing(!!followRow);
    }

    const { data: shortsData } = await supabase
      .from("shorts")
      .select("id, video_url, like_count")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    setShorts(
      (shortsData ?? []).map((s: any) => ({ id: s.id, videoUrl: s.video_url, likeCount: s.like_count }))
    );

    setLoading(false);
  }

  async function toggleFollow() {
    if (!user || user.id === userId) return;

    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", userId);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: userId });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
  }

  return (
    <div className="profile-view">
      <div className="profile-header-bar">
        <button className="back-btn" onClick={onClose}><BackIcon size={20} /></button>
        <h3>Profile</h3>
      </div>

      {loading && <p className="empty-state">Loading profile...</p>}
      {error && <p className="auth-error">{error}</p>}

      {!loading && profile && (
        <>
          <div className="profile-info-block">
            <div className="avatar-circle profile-avatar-large">
              {profile.fullName[0]?.toUpperCase()}
            </div>
            <h2>{profile.fullName}</h2>
            <p className="post-username">@{profile.username}</p>
            {profile.role === "admin" && <span className="fresh-id-tier">admin</span>}

            <div className="profile-stats-row">
              <div><strong>{followerCount}</strong><span>Followers</span></div>
              <div><strong>{followingCount}</strong><span>Following</span></div>
              <div><strong>{shorts.length}</strong><span>Shorts</span></div>
            </div>

            {user && user.id !== userId && (
              <button
                className={isFollowing ? "follow-chip following profile-follow-btn" : "follow-chip profile-follow-btn"}
                onClick={toggleFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <div className="profile-shorts-grid">
            {shorts.length === 0 && <p className="empty-state">No shorts posted yet.</p>}
            {shorts.map((s) => (
              <video key={s.id} src={s.videoUrl} className="profile-grid-video" muted />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
