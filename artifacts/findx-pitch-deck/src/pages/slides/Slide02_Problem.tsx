export default function Slide02_Problem() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", top: "40vh", right: "-10vw", width: "30vw", height: "30vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.07, zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "5vh", left: "-5vw", width: "20vw", height: "20vw", border: "1vw solid #3b82f6", borderRadius: "50%", opacity: 0.1, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", backgroundColor: "#3b82f6", color: "#f1f5f9", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#TheChallenge</div>
        </div>

        <div style={{ display: "flex", gap: "5vw", alignItems: "center", flex: 1, marginTop: "3vh" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "2vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>The Challenge</div>
            <h2 style={{ fontSize: "5vw", fontWeight: 800, margin: "0 0 3vh 0", lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>B2B Prospecting is Broken</h2>
            <p style={{ fontSize: "1.6vw", fontWeight: 500, lineHeight: 1.6, margin: 0, color: "rgba(241,245,249,0.75)" }}>
              Sales teams waste 40% of their time sourcing leads manually — with little to show for it.
            </p>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2.5vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", backgroundColor: "#162030", padding: "2.5vh 2vw", borderRadius: "1vw", boxShadow: "0.4vw 0.4vw 0px rgba(96,165,250,0.25)", border: "1.5px solid rgba(59,130,246,0.3)" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#60a5fa", minWidth: "3vw" }}>01</div>
              <div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700, marginBottom: "0.5vh", color: "#f1f5f9" }}>Fragmented Data</div>
                <div style={{ fontSize: "1.3vw", fontWeight: 400, color: "rgba(241,245,249,0.65)", lineHeight: 1.4 }}>KvK, LinkedIn, and trade directories don't connect</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", backgroundColor: "#162030", padding: "2.5vh 2vw", borderRadius: "1vw", boxShadow: "0.4vw 0.4vw 0px rgba(96,165,250,0.25)", border: "1.5px solid rgba(59,130,246,0.3)" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#60a5fa", minWidth: "3vw" }}>02</div>
              <div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700, marginBottom: "0.5vh", color: "#f1f5f9" }}>Generic Outreach</div>
                <div style={{ fontSize: "1.3vw", fontWeight: 400, color: "rgba(241,245,249,0.65)", lineHeight: 1.4 }}>Mass emails get ignored — response rates under 2%</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2vw", backgroundColor: "#162030", padding: "2.5vh 2vw", borderRadius: "1vw", boxShadow: "0.4vw 0.4vw 0px rgba(96,165,250,0.25)", border: "1.5px solid rgba(59,130,246,0.3)" }}>
              <div style={{ fontSize: "2vw", fontWeight: 800, color: "#60a5fa", minWidth: "3vw" }}>03</div>
              <div>
                <div style={{ fontSize: "1.5vw", fontWeight: 700, marginBottom: "0.5vh", color: "#f1f5f9" }}>No Pipeline Clarity</div>
                <div style={{ fontSize: "1.3vw", fontWeight: 400, color: "rgba(241,245,249,0.65)", lineHeight: 1.4 }}>No single view of where deals stand</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>02</div>
        </div>
      </div>
    </div>
  );
}
