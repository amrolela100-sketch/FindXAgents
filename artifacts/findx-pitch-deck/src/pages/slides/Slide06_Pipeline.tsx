export default function Slide06_Pipeline() {
  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#0f1623", fontFamily: "'Space Grotesk', sans-serif", position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "8vh 8vw", boxSizing: "border-box", color: "#f1f5f9" }}>
      <div style={{ position: "absolute", bottom: "-10vh", right: "-8vw", width: "35vw", height: "35vw", backgroundColor: "#3b82f6", borderRadius: "50%", opacity: 0.06, zIndex: 0 }} />
      <div style={{ position: "absolute", top: "10vh", left: "-5vw", width: "15vw", height: "15vw", border: "1.2vw solid #3b82f6", borderRadius: "50%", opacity: 0.1, zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: "0.05em", color: "#60a5fa" }}>findx</div>
          <div style={{ padding: "0.8vh 1.5vw", backgroundColor: "#3b82f6", color: "#f1f5f9", borderRadius: "2vw", fontSize: "0.9vw", fontWeight: 600 }}>#Pipeline</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "3vh", flex: 1, justifyContent: "center" }}>
          <div>
            <div style={{ fontSize: "1.5vw", fontWeight: 700, color: "#60a5fa", marginBottom: "1.5vh", textTransform: "uppercase", letterSpacing: "0.1em" }}>Lead Management</div>
            <h2 style={{ fontSize: "4.5vw", fontWeight: 800, margin: 0, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#f1f5f9" }}>The Pipeline</h2>
          </div>

          <div style={{ display: "flex", gap: "1.2vw", alignItems: "stretch" }}>
            <div style={{ flex: 1, backgroundColor: "#1a2840", color: "#f1f5f9", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center", border: "1.5px solid rgba(59,130,246,0.3)" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3 }}>New Lead</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#60a5fa", fontSize: "1.5vw", fontWeight: 800 }}>&#8250;</div>
            <div style={{ flex: 1, backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center", boxShadow: "0.3vw 0.3vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3, color: "#f1f5f9" }}>Qualified</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#60a5fa", fontSize: "1.5vw", fontWeight: 800 }}>&#8250;</div>
            <div style={{ flex: 1, backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3 }}>Contacted</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#60a5fa", fontSize: "1.5vw", fontWeight: 800 }}>&#8250;</div>
            <div style={{ flex: 1, backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center", boxShadow: "0.3vw 0.3vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3, color: "#f1f5f9" }}>Meeting</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#60a5fa", fontSize: "1.5vw", fontWeight: 800 }}>&#8250;</div>
            <div style={{ flex: 1, backgroundColor: "#1a2840", color: "#f1f5f9", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center", border: "1.5px solid rgba(59,130,246,0.25)" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3 }}>Proposal</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#60a5fa", fontSize: "1.5vw", fontWeight: 800 }}>&#8250;</div>
            <div style={{ flex: 1, backgroundColor: "#162030", border: "1.5px solid rgba(59,130,246,0.3)", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center", boxShadow: "0.3vw 0.3vw 0px rgba(96,165,250,0.2)" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3, color: "#f1f5f9" }}>Negotiation</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#60a5fa", fontSize: "1.5vw", fontWeight: 800 }}>&#8250;</div>
            <div style={{ flex: 1, backgroundColor: "#3b82f6", color: "#f1f5f9", padding: "2.5vh 1.2vw", borderRadius: "1vw", textAlign: "center" }}>
              <div style={{ fontSize: "1.3vw", fontWeight: 700, lineHeight: 1.3 }}>Closed Won</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "4vw", marginTop: "1vh" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.5vw", fontWeight: 500, color: "rgba(241,245,249,0.75)" }}>8 configurable stages</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#60a5fa", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.5vw", fontWeight: 500, color: "rgba(241,245,249,0.75)" }}>Drag-and-drop Kanban board</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw" }}>
              <div style={{ width: "0.8vw", height: "0.8vw", backgroundColor: "#3b82f6", borderRadius: "50%" }} />
              <div style={{ fontSize: "1.5vw", fontWeight: 500, color: "rgba(241,245,249,0.75)" }}>Full activity log per lead</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: "1vw", fontWeight: 600, color: "rgba(241,245,249,0.45)", letterSpacing: "0.05em", textTransform: "uppercase" }}>findx.nl</div>
          <div style={{ fontSize: "1.2vw", fontWeight: 800, color: "#60a5fa" }}>06</div>
        </div>
      </div>
    </div>
  );
}
