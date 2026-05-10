export default function Slide01_Title() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "-10vh", right: "-5vw", width: "40vw", height: "40vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.1, zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "-15vh", left: "-10vw", width: "50vw", height: "50vw", backgroundColor: "#1e3a5f", borderRadius: "50%", opacity: 0.4, zIndex: 0 }} />
      <div style={{ position: "absolute", top: "22vh", right: "18vw", width: "10vw", height: "10vw", border: "1vw solid #60a5fa", borderRadius: "2vw", transform: "rotate(15deg)", opacity: 0.5, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ display: "flex", gap: "1vw" }}>
            <div style={{ padding: "0.8vh 1.5vw", backgroundColor: "#3b82f6", color: "#f1f5f9", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#Prospecting</div>
            <div style={{ padding: "0.8vh 1.5vw", border: "1.5px solid rgba(96,165,250,0.4)", color: "#60a5fa", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>2026</div>
          </div>
        </div>

        <div style={{ maxWidth: "65vw" }}>
          <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "2vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Netherlands B2B</div>
          <h1 style={{ fontSize: "7.5vw", fontWeight: 800, margin: "0 0 2.5vh 0", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>FindX</h1>
          <p style={{ fontSize: "1.8vw", fontWeight: 500, lineHeight: 1.5, margin: 0, maxWidth: "45vw", color: "rgba(241,245,249,0.75)" }}>
            AI-powered lead discovery and outreach for the Dutch market.
          </p>
          <div style={{ marginTop: "4vh", display: "inline-flex", alignItems: "center", gap: "1.5vw", backgroundColor: "#162030", padding: "1.5vh 2.5vw", borderRadius: "1vw", boxShadow: "0.5vw 0.5vw 0px rgba(96,165,250,0.3)", border: "1.5px solid rgba(59,130,246,0.4)" }}>
            <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
            <div style={{ fontSize: "1.2vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#f1f5f9" }}>Target:</div>
            <div style={{ fontSize: "2.5vw", fontWeight: 800, color: "#60a5fa" }}>3x Higher Reply Rates</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ display: "flex", gap: "2vw", alignItems: "center" }}>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "#1a2840", border: "1.5px solid rgba(59,130,246,0.4)", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "1.5vw", height: "1.5vw", border: "0.3vw solid #60a5fa", borderRadius: "50%" }} />
            </div>
            <div style={{ width: "4vw", height: "4vw", backgroundColor: "#3b82f6", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "0", height: "0", borderTop: "0.8vw solid transparent", borderBottom: "0.8vw solid transparent", borderLeft: "1.2vw solid #f1f5f9", marginLeft: "0.3vw" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
