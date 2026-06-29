import { useState, useEffect } from "react";

export default function AppDownloadBanner() {
  const [show, setShow] = useState(false);

  const APK_URL = "https://github.com/Izazkhan8293-dev/NewRoyalApp/releases/download/v1.0.0/New.Royal.apk";

  useEffect(() => {
    const isAndroid = /android/i.test(navigator.userAgent);
    const dismissed = localStorage.getItem("appBannerDismissed");
    if (isAndroid && !dismissed) setShow(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("appBannerDismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#1a1a1a",
      color: "#fff",
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 9999,
      borderTop: "2px solid #f5a623",
      boxShadow: "0 -4px 16px rgba(0,0,0,0.5)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src="/assets/icon.png"
          width={44}
          height={44}
          style={{ borderRadius: 10 }}
          alt="App icon"
        />
        <div>
          <div style={{ fontWeight: "bold", fontSize: 14 }}>
            New Royal Electricals
          </div>
          <div style={{ fontSize: 12, color: "#aaa" }}>
            Download our app for better experience
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        
          href={APK_URL}
          download="New.Royal.apk"
          style={{
            backgroundColor: "#f5a623",
            color: "#000",
            padding: "8px 16px",
            borderRadius: 6,
            fontWeight: "bold",
            fontSize: 13,
            textDecoration: "none",
            whiteSpace: "nowrap"
          }}
        >
          ⬇ Download App
        </a>
        <button
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "1px solid #555",
            color: "#aaa",
            padding: "8px 10px",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer"
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
