import React, { useState } from "react";
import { FONTS, COLORS } from "../tokens";
import MediaVaultAdmin from "../components/MediaVaultAdmin";
import SocialContentStudio from "../components/SocialContentStudio";

const Content = ({
  galleries,
  createGallery,
  updateGallery,
  deleteGallery,
  fetchGalleryPhotos,
  uploadGalleryPhoto,
  updateGalleryPhoto,
  deleteGalleryPhoto,
  deleteGalleryPhotos,
  socialPosts,
  createSocialPost,
  updateSocialPost,
  deleteSocialPost,
}) => {
  const [activeTab, setActiveTab] = useState("social");

  return (
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

      {/* Page level tabs */}
      <div
        style={{
          display: "flex",
          gap: 24,
          borderBottom: `1px solid ${COLORS.borderLight}`,
          marginBottom: 24,
        }}
      >
        {[
          { id: "social", label: "Social Studio" },
          { id: "vault", label: "Media Vault" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 0 12px",
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === tab.id ? COLORS.black : COLORS.textMuted,
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id
                ? `2px solid ${COLORS.black}`
                : "2px solid transparent",
              cursor: "pointer",
              fontFamily: FONTS.body,
              transition: "color 0.15s",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "social" && (
        <SocialContentStudio
          socialPosts={socialPosts || []}
          createSocialPost={createSocialPost}
          updateSocialPost={updateSocialPost}
          deleteSocialPost={deleteSocialPost}
          galleries={galleries || []}
          fetchGalleryPhotos={fetchGalleryPhotos}
        />
      )}
      {activeTab === "vault" && (
        <MediaVaultAdmin
          galleries={galleries || []}
          createGallery={createGallery}
          updateGallery={updateGallery}
          deleteGallery={deleteGallery}
          fetchGalleryPhotos={fetchGalleryPhotos}
          uploadGalleryPhoto={uploadGalleryPhoto}
          updateGalleryPhoto={updateGalleryPhoto}
          deleteGalleryPhoto={deleteGalleryPhoto}
          deleteGalleryPhotos={deleteGalleryPhotos}
        />
      )}
    </div>
  );
};

export default Content;
