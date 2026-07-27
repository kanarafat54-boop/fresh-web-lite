/**
 * Fresh Web Lite
 * Share Sheet — device share, copy link, QR code
 * Note: links currently point to the app root (no per-item routing yet)
 */

import { useState } from "react";
import { LinkIcon, QrIcon, CheckIcon, CloseIcon, ShareIcon } from "../../../components/Icons";

interface ShareSheetProps {
  title: string;
  onClose: () => void;
}

export function ShareSheet({ title, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const shareUrl = window.location.origin + window.location.pathname;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — fall back silently, copied state stays false
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Fresh Web Lite", text: title, url: shareUrl });
      } catch {
        // user cancelled the share sheet — no action needed
      }
    }
  }

  return (
    <div className="comment-panel-backdrop" onClick={onClose}>
      <div className="comment-panel share-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="comment-panel-header">
          <h3>Share</h3>
          <button className="back-btn" onClick={onClose}><CloseIcon size={20} /></button>
        </div>

        {showQr ? (
          <div className="qr-wrap">
            <img src={qrImageUrl} alt="QR code" className="qr-image" />
            <p className="empty-state">Scan to open Fresh Web Lite</p>
            <button className="icon-btn-outline" onClick={() => setShowQr(false)}>Back</button>
          </div>
        ) : (
          <div className="share-options">
            {typeof navigator.share === "function" && (
              <button className="share-option-btn" onClick={nativeShare}>
                <ShareIcon size={20} />
                <span>Share via...</span>
              </button>
            )}
            <button className="share-option-btn" onClick={copyLink}>
              {copied ? <CheckIcon size={20} /> : <LinkIcon size={20} />}
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
            <button className="share-option-btn" onClick={() => setShowQr(true)}>
              <QrIcon size={20} />
              <span>QR code</span>
            </button>
          </div>
        )}

        <p className="empty-state" style={{ fontSize: "0.75rem" }}>
          Links currently open the app — per-post deep links are coming soon.
        </p>
      </div>
    </div>
  );
}
