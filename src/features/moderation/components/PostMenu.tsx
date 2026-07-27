/**
 * Fresh Web Lite
 * Post/Short options menu — Not Interested, Report
 */

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { MoreIcon, FlagIcon, EyeOffIcon, CloseIcon } from "../../../components/Icons";

interface PostMenuProps {
  targetType: "post" | "short";
  targetId: string;
  onHide: () => void;
}

export function PostMenu({ targetType, targetId, onHide }: PostMenuProps) {
  const { user } = useFreshId();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);

  async function submitReport() {
    if (!user) return;
    await supabase.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reporter_id: user.id,
      reason: "user_reported",
    });
    setReported(true);
    setTimeout(() => setOpen(false), 1200);
  }

  return (
    <div className="post-menu-wrap">
      <button className="icon-only-btn" onClick={() => setOpen(true)}>
        <MoreIcon size={18} />
      </button>

      {open && (
        <div className="comment-panel-backdrop" onClick={() => setOpen(false)}>
          <div className="comment-panel post-menu-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="comment-panel-header">
              <h3>Options</h3>
              <button className="back-btn" onClick={() => setOpen(false)}><CloseIcon size={20} /></button>
            </div>

            {reported ? (
              <p className="empty-state">Thanks — we've received your report.</p>
            ) : (
              <div className="share-options">
                <button className="share-option-btn" onClick={() => { onHide(); setOpen(false); }}>
                  <EyeOffIcon size={20} />
                  <span>Not interested</span>
                </button>
                <button className="share-option-btn report-option" onClick={submitReport}>
                  <FlagIcon size={20} />
                  <span>Report</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
