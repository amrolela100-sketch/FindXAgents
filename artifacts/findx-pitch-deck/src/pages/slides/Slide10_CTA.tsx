export default function Slide10_CTA() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0a1118", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "65vw", height: "65vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.08, zIndex: 0 }} />
      <div style={{ position: "absolute", top: "-5vh", right: "-5vw", width: "25vw", height: "25vw", border: "2vw solid rgba(96,165,250,0.15)", borderRadius: "50%", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "10vh", left: "5vw", width: "8vw", height: "8vw", border: "1vw solid #3b82f6", borderRadius: "2vw", transform: "rotate(20deg)", opacity: 0.3, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
        </div>

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "3.5vh" }}>
          <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.1em" }}>Get in Touch</div>
          <h2 style={{ fontSize: "6.5vw", fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>Put Your Pipeline on Autopilot</h2>
          <p style={{ fontSize: "1.8vw", fontWeight: 500, lineHeight: 1.5, margin: 0, maxWidth: "45vw", color: "rgba(241,245,249,0.75)" }}>
            Ready to replace manual prospecting with AI-driven outreach? Let's talk.
          </p>
          <div style={{ display: "flex", gap: "2vw", marginTop: "1vh" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "1vw", backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "2vh 3.5vw", borderRadius: "3vw", boxShadow: "0.5vw 0.5vw 0px rgba(96,165,250,0.3)", border: "1.5px solid rgba(96,165,250,0.5)", fontSize: "1.5vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              hello@findx.nl
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "1vw", backgroundColor: "transparent", color: "#60a5fa", padding: "2vh 3.5vw", borderRadius: "3vw", border: "1.5px solid rgba(96,165,250,0.4)", fontSize: "1.5vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              findx.nl
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.35)", letterSpacing: "0.05em", textTransform: "uppercase" }}>2026 — FindX B.V.</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>10</div>
        </div>
      </div>
    </div>
  );
}
