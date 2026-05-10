export default function Slide09_Pricing() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "50%", left: "-8vw", width: "30vw", height: "30vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.07, zIndex: 0, transform: "translateY(-50%)" }} />
      <div style={{ position: "absolute", top: "-6vh", right: "12vw", width: "10vw", height: "10vw", border: "1vw solid #60a5fa", borderRadius: "2vw", transform: "rotate(20deg)", opacity: 0.3, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#Pricing</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3.5vh", flex: 1, justifyContent: "center" }}>
          <div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Transparent Pricing</div>
            <h2 style={{ fontSize: "4.5vw", fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>Plans</h2>
          </div>

          <div style={{ display: "flex", gap: "2.5vw" }}>
            <div style={{ flex: 1, backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.25)", padding: "4vh 2.5vw", borderRadius: "1.2vw", display: "flex", flexDirection: "column", gap: "1.8vh" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "rgba(241,245,249,0.65)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Starter</div>
              <div style={{ fontSize: "4vw", fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>€149<span style={{ fontSize: "1.5vw", fontWeight: 500, color: "rgba(241,245,249,0.55)" }}>/mo</span></div>
              <div style={{ height: "1px", backgroundColor: "rgba(59,130,246,0.2)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.75)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                  50 qualified leads/month
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.75)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                  1 AI agent
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.75)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                  Email outreach
                </div>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: "#1e3a5f", border: "2px solid #3b82f6", padding: "4vh 2.5vw", borderRadius: "1.2vw", display: "flex", flexDirection: "column", gap: "1.8vh", boxShadow: "0.5vw 0.5vw 0px rgba(96,165,250,0.25)", position: "relative" }}>
              <div style={{ position: "absolute", top: "-1.5vh", right: "2vw", backgroundColor: "#3b82f6", color: "#f1f5f9", fontSize: "1.1vw", fontWeight: 700, padding: "0.5vh 1.2vw", borderRadius: "1vw", textTransform: "uppercase", letterSpacing: "0.05em" }}>Most Popular</div>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em" }}>Growth</div>
              <div style={{ fontSize: "4vw", fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>€349<span style={{ fontSize: "1.5vw", fontWeight: 500, color: "rgba(241,245,249,0.65)" }}>/mo</span></div>
              <div style={{ height: "1px", backgroundColor: "rgba(96,165,250,0.3)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.85)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#60a5fa", borderRadius: "50%" }} />
                  250 qualified leads/month
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.85)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#60a5fa", borderRadius: "50%" }} />
                  3 AI agents
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.85)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#60a5fa", borderRadius: "50%" }} />
                  Email + Telegram
                </div>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.25)", padding: "4vh 2.5vw", borderRadius: "1.2vw", display: "flex", flexDirection: "column", gap: "1.8vh" }}>
              <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "rgba(241,245,249,0.65)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Scale</div>
              <div style={{ fontSize: "4vw", fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>€749<span style={{ fontSize: "1.5vw", fontWeight: 500, color: "rgba(241,245,249,0.55)" }}>/mo</span></div>
              <div style={{ height: "1px", backgroundColor: "rgba(59,130,246,0.2)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "1.2vh" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.75)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                  Unlimited leads
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.75)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                  3 agents + custom
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1vw", fontSize: "1.4vw", color: "rgba(241,245,249,0.75)" }}>
                  <div style={{ width: "0.7vw", height: "0.7vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
                  Priority support
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "1.5vw", backgroundColor: "#162030", padding: "1.5vh 2.5vw", borderRadius: "1vw", border: "1.5px solid rgba(59,130,246,0.3)", alignSelf: "flex-start" }}>
            <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.5vw", fontWeight: 600, color: "rgba(241,245,249,0.8)" }}>Average customer sees ROI within 30 days</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>09</div>
        </div>
      </div>
    </div>
  );
}
