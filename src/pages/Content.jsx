import React from "react";
import { FONTS, COLORS } from "../tokens";
import PlaceholderCard from "../components/PlaceholderCard";

const Content = () => (
  <div style={{ animation: "fadeUp 0.3s ease", maxWidth: 1200 }}>
    <h1
      style={{
        fontFamily: FONTS.display,
        fontSize: 26,
        fontWeight: 600,
        color: COLORS.black,
        marginBottom: 24,
      }}
    >
      Content
    </h1>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <PlaceholderCard
        icon="image"
        title="Media Vault"
        description="Premium photo gallery for planners and couples."
      />
      <PlaceholderCard
        icon="grid"
        title="Social Content Studio"
        description="AI powered content calendar with caption drafting."
      />
    </div>
  </div>
);

export default Content;
