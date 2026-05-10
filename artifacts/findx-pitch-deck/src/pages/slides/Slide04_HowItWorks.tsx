export default function Slide04_HowItWorks() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "50%", right: "-8vw", width: "28vw", height: "28vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.08, zIndex: 0, transform: "translateY(-50%)" }} />
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", width: "8vw", height: "8vw", border: "1vw solid #60a5fa", borderRadius: "2vw", transform: "rotate(25deg)", opacity: 0.3, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", backgroundColor: "#3b82f6", color: "#f1f5f9", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#HowItWorks</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3vh", flex: 1, justifyContent: "center" }}>
          <div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>The Process</div>
            <h2 style={{ fontSize: "4.5vw", fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>Three Steps</h2>
          </div>
          <div style={{ display: "flex", gap: "2.5vw" }}>
            <div style={{ flex: 1, backgroundColor: "#1a2840", color: "#f1f5f9", padding: "4vh 2.5vw", borderRadius: "1.2vw", border: "1.5px solid rgba(59,130,246,0.25)" }}>
              <div style={{ fontSize: "3vw", fontWeight: 800, color: "#60a5fa", marginBottom: "1.5vh", lineHeight: 1 }}>01</div>
              <div style={{ fontSize: "2vw", fontWeight: 700, marginBottom: "1.5vh", color: "#f1f5f9" }}>Discover</div>
              <div style={{ fontSize: "1.5vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.75)" }}>
                Source companies from KvK, LinkedIn, and web signals. Filter by sector, size, and location.
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "4vh 2.5vw", borderRadius: "1.2vw", boxShadow: "0.5vw 0.5vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "3vw", fontWeight: 800, color: "#60a5fa", marginBottom: "1.5vh", lineHeight: 1 }}>02</div>
              <div style={{ fontSize: "2vw", fontWeight: 700, marginBottom: "1.5vh", color: "#f1f5f9" }}>Enrich</div>
              <div style={{ fontSize: "1.5vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.75)" }}>
                AI agents research each company and score leads by fit, intent, and engagement signals.
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "4vh 2.5vw", borderRadius: "1.2vw" }}>
              <div style={{ fontSize: "3vw", fontWeight: 800, marginBottom: "1.5vh", lineHeight: 1, opacity: 0.65 }}>03</div>
              <div style={{ fontSize: "2vw", fontWeight: 700, marginBottom: "1.5vh" }}>Reach Out</div>
              <div style={{ fontSize: "1.5vw", fontWeight: 400, lineHeight: 1.5, opacity: 0.9 }}>
                Automated personalized email and Telegram sequences fire at the right moment.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>04</div>
        </div>
      </div>
    </div>
  );
}
