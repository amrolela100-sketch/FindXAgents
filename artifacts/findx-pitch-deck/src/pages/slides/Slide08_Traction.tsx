export default function Slide08_Traction() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "-5vh", left: "25vw", width: "45vw", height: "45vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.05, zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "8vh", right: "10vw", width: "12vw", height: "12vw", border: "1vw solid #3b82f6", transform: "rotate(45deg)", opacity: 0.1, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", backgroundColor: "#3b82f6", color: "#f1f5f9", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#EarlyResults</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4vh", flex: 1, justifyContent: "center" }}>
          <div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pilot Results</div>
            <h2 style={{ fontSize: "4.5vw", fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>The Numbers</h2>
          </div>
          <div style={{ display: "flex", gap: "3vw" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#1a2840", color: "#f1f5f9", padding: "4vh 2vw", borderRadius: "1.2vw", border: "1.5px solid rgba(59,130,246,0.25)" }}>
              <div style={{ fontSize: "9vw", fontWeight: 800, lineHeight: 1, color: "#60a5fa" }}>3x</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600, marginTop: "1.5vh", textAlign: "center", color: "#f1f5f9" }}>Higher Reply Rates</div>
              <div style={{ fontSize: "1.3vw", fontWeight: 400, marginTop: "1vh", color: "rgba(241,245,249,0.6)", textAlign: "center" }}>vs. manual outreach</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "4vh 2vw", borderRadius: "1.2vw", boxShadow: "0.5vw 0.5vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "9vw", fontWeight: 800, lineHeight: 1, color: "#f1f5f9" }}>60%</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600, marginTop: "1.5vh", textAlign: "center", color: "#f1f5f9" }}>Faster Time to Meeting</div>
              <div style={{ fontSize: "1.3vw", fontWeight: 400, marginTop: "1vh", color: "rgba(241,245,249,0.6)", textAlign: "center" }}>from first contact</div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "4vh 2vw", borderRadius: "1.2vw" }}>
              <div style={{ fontSize: "9vw", fontWeight: 800, lineHeight: 1 }}>200+</div>
              <div style={{ fontSize: "1.6vw", fontWeight: 600, marginTop: "1.5vh", textAlign: "center" }}>Dutch SMBs Prospected</div>
              <div style={{ fontSize: "1.3vw", fontWeight: 400, marginTop: "1vh", opacity: 0.8, textAlign: "center" }}>in first 90 days</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>08</div>
        </div>
      </div>
    </div>
  );
}
