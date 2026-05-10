export default function Slide03_Solution() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "-5vh", left: "25vw", width: "40vw", height: "40vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.06, zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "8vh", right: "8vw", width: "14vw", height: "14vw", border: "1vw solid #3b82f6", transform: "rotate(45deg)", opacity: 0.12, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#TheSolution</div>
        </div>

        <div style={{ display: "flex", gap: "5vw", alignItems: "center", flex: 1, marginTop: "2vh" }}>
          <div style={{ flex: "0 0 38vw" }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "2vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Our Solution</div>
            <h2 style={{ fontSize: "5.5vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>One Platform. Total Control.</h2>
            <p style={{ fontSize: "1.6vw", fontWeight: 500, lineHeight: 1.6, margin: 0, color: "rgba(241,245,249,0.75)" }}>
              FindX automates lead discovery, enrichment, pipeline management, and personalized outreach — all from one place.
            </p>
          </div>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5vh 2vw" }}>
            <div style={{ backgroundColor: "#1a2840", color: "#f1f5f9", padding: "3vh 2vw", borderRadius: "1vw", border: "1.5px solid rgba(59,130,246,0.2)" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 800, marginBottom: "1vh", color: "#60a5fa" }}>Discover</div>
              <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.8)" }}>Source companies from KvK, LinkedIn, and web signals</div>
            </div>
            <div style={{ backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "3vh 2vw", borderRadius: "1vw", boxShadow: "0.4vw 0.4vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 800, marginBottom: "1vh", color: "#f1f5f9" }}>Enrich</div>
              <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.75)" }}>AI agents research and score each lead by fit</div>
            </div>
            <div style={{ backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "3vh 2vw", borderRadius: "1vw", boxShadow: "0.4vw 0.4vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 800, marginBottom: "1vh", color: "#f1f5f9" }}>Pipeline</div>
              <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.75)" }}>Kanban board tracks every lead from prospect to close</div>
            </div>
            <div style={{ backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "3vh 2vw", borderRadius: "1vw" }}>
              <div style={{ fontSize: "1.8vw", fontWeight: 800, marginBottom: "1vh" }}>Outreach</div>
              <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, opacity: 0.9 }}>Personalized email and Telegram sequences at scale</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>03</div>
        </div>
      </div>
    </div>
  );
}
