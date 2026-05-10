export default function Slide07_Outreach() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "-8vh", right: "5vw", width: "28vw", height: "28vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.07, zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "5vh", left: "-8vw", width: "24vw", height: "24vw", backgroundColor: "#1e3a5f", borderRadius: "50%", opacity: 0.45, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#Outreach</div>
        </div>

        <div style={{ display: "flex", gap: "5vw", alignItems: "center", flex: 1, marginTop: "2vh" }}>
          <div style={{ flex: "0 0 38vw" }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "2vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Email Outreach</div>
            <h2 style={{ fontSize: "5vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>Personal at Scale</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
                <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3b82f6", borderRadius: "50%", marginTop: "0.6vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.6vw", fontWeight: 500, lineHeight: 1.5, color: "rgba(241,245,249,0.8)" }}>AI drafts custom messages using live company research</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
                <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3b82f6", borderRadius: "50%", marginTop: "0.6vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.6vw", fontWeight: 500, lineHeight: 1.5, color: "rgba(241,245,249,0.8)" }}>Multi-step sequences with smart follow-up timing</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
                <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3b82f6", borderRadius: "50%", marginTop: "0.6vh", flexShrink: 0 }} />
                <div style={{ fontSize: "1.6vw", fontWeight: 500, lineHeight: 1.5, color: "rgba(241,245,249,0.8)" }}>Full tracking: opens, clicks, and replies in one dashboard</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ backgroundColor: "#0a1118", border: "1.5px solid rgba(59,130,246,0.35)", borderRadius: "1.2vw", boxShadow: "0.6vw 0.6vw 0px rgba(96,165,250,0.2)", overflow: "hidden" }}>
              <div style={{ backgroundColor: "#1a2840", padding: "1.5vh 2vw", display: "flex", alignItems: "center", gap: "1vw", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
                <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                <div style={{ fontSize: "1.2vw", fontWeight: 600, color: "#f1f5f9" }}>AI-Generated Draft</div>
              </div>
              <div style={{ padding: "2.5vh 2vw", display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
                  <div style={{ fontSize: "1.2vw", fontWeight: 600, color: "rgba(241,245,249,0.5)", minWidth: "5vw" }}>To:</div>
                  <div style={{ fontSize: "1.3vw", fontWeight: 500, color: "#f1f5f9" }}>jan.de.vries@techbv.nl</div>
                </div>
                <div style={{ height: "1px", backgroundColor: "rgba(59,130,246,0.2)" }} />
                <div style={{ display: "flex", gap: "1.5vw", alignItems: "center" }}>
                  <div style={{ fontSize: "1.2vw", fontWeight: 600, color: "rgba(241,245,249,0.5)", minWidth: "5vw" }}>Subject:</div>
                  <div style={{ fontSize: "1.3vw", fontWeight: 600, color: "#60a5fa" }}>Sneller leads vinden voor TechBV</div>
                </div>
                <div style={{ height: "1px", backgroundColor: "rgba(59,130,246,0.2)" }} />
                <div style={{ fontSize: "1.35vw", fontWeight: 400, lineHeight: 1.6, color: "rgba(241,245,249,0.75)", paddingTop: "0.5vh" }}>
                  Goedemiddag Jan, ik zag dat TechBV recent is gegroeid — gefeliciteerd. Wij helpen soortgelijke bedrijven hun pipeline 3x sneller te vullen...
                </div>
                <div style={{ marginTop: "1vh", display: "flex", gap: "1vw" }}>
                  <div style={{ padding: "1vh 1.5vw", backgroundColor: "#3b82f6", color: "#f1f5f9", borderRadius: "0.5vw", fontSize: "1.2vw", fontWeight: 600 }}>Send</div>
                  <div style={{ padding: "1vh 1.5vw", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: "0.5vw", fontSize: "1.2vw", fontWeight: 600 }}>Edit</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>07</div>
        </div>
      </div>
    </div>
  );
}
