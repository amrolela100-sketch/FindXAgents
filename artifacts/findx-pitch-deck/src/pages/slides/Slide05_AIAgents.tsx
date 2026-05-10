export default function Slide05_AIAgents() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "35vh", right: "-8vw", width: "32vw", height: "32vw", backgroundColor: "#1e3a5f", borderRadius: "50%", opacity: 0.5, zIndex: 0 }} />
      <div style={{ position: "absolute", top: "-8vh", left: "40vw", width: "22vw", height: "22vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.07, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#AIAgents</div>
        </div>

        <div style={{ display: "flex", gap: "5vw", alignItems: "center", flex: 1, marginTop: "2vh" }}>
          <div style={{ flex: "0 0 35vw" }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "2vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Intelligent Automation</div>
            <h2 style={{ fontSize: "5vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>Three Agents</h2>
            <p style={{ fontSize: "1.6vw", fontWeight: 500, lineHeight: 1.6, margin: 0, color: "rgba(241,245,249,0.75)" }}>
              Specialized agents work 24/7 on your pipeline so your team focuses only on conversations that matter.
            </p>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
            <div style={{ backgroundColor: "#1a2840", color: "#f1f5f9", padding: "3vh 2.5vw", borderRadius: "1vw", display: "flex", alignItems: "flex-start", gap: "2vw", border: "1.5px solid rgba(59,130,246,0.25)" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#60a5fa", minWidth: "3vw", marginTop: "0.2vh" }}>01</div>
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 700, marginBottom: "0.8vh", color: "#f1f5f9" }}>Research Agent</div>
                <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.7)" }}>Finds and qualifies new companies matching your ideal customer profile</div>
              </div>
            </div>
            <div style={{ backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "3vh 2.5vw", borderRadius: "1vw", boxShadow: "0.4vw 0.4vw 0px rgba(96,165,250,0.2)", display: "flex", alignItems: "flex-start", gap: "2vw" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#60a5fa", minWidth: "3vw", marginTop: "0.2vh" }}>02</div>
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 700, marginBottom: "0.8vh", color: "#f1f5f9" }}>Outreach Agent</div>
                <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, color: "rgba(241,245,249,0.7)" }}>Writes and sends personalized messages based on company research</div>
              </div>
            </div>
            <div style={{ backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "3vh 2.5vw", borderRadius: "1vw", display: "flex", alignItems: "flex-start", gap: "2vw" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, minWidth: "3vw", marginTop: "0.2vh", opacity: 0.65 }}>03</div>
              <div>
                <div style={{ fontSize: "1.8vw", fontWeight: 700, marginBottom: "0.8vh" }}>Analysis Agent</div>
                <div style={{ fontSize: "1.4vw", fontWeight: 400, lineHeight: 1.5, opacity: 0.9 }}>Scores leads and surfaces the highest-value opportunities</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>05</div>
        </div>
      </div>
    </div>
  );
}
