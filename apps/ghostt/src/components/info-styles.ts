import { CSSProperties } from "react";

// Centered bottom card — mirrors the gallery Info.module.css.
export const Wrapper: CSSProperties = {
  position: "fixed",
  bottom: "96px",
  left: "50%",
  transform: "translate(-50%, 0px)",
  width: "420px",
  maxWidth: "calc(100vw - 24px)",
  display: "flex",
  flexDirection: "column",
  background:
    "linear-gradient(19deg, rgba(0, 0, 0, 0.94), rgba(28, 28, 28, 0.85), rgba(53, 53, 53, 0.8), rgba(0, 0, 0, 0.95))",
  color: "#dddddd",
  margin: "12px 0",
  borderRadius: "0.75em",
  zIndex: 50,
  pointerEvents: "auto",
};

export const Container: CSSProperties = {
  position: "relative",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 0 0.75em",
};

export const CloseButton: CSSProperties = {
  position: "absolute",
  top: "12px",
  right: "16px",
  padding: "0.25em 0.5em",
  color: "#dddddd96",
  fontWeight: 1000,
  cursor: "pointer",
  zIndex: 99990,
  background: "transparent",
};

export const Title: CSSProperties = {
  fontSize: "18pt",
  padding: "0.6em 8px 0.2em",
};

export const TabBar: CSSProperties = {
  display: "flex",
  gap: "6px",
  width: "calc(100% - 3em)",
  padding: "0.25em 0",
};

export const Tab: CSSProperties = {
  flex: 1,
  textAlign: "center",
  cursor: "pointer",
  fontSize: "10.5pt",
  padding: "0.4em 0.5em",
  borderRadius: "6px",
  color: "#dddddd80",
  background: "transparent",
  whiteSpace: "nowrap",
};

export const TabActive: CSSProperties = {
  ...Tab,
  color: "#dddddd",
  background: "rgba(169, 169, 169, 0.14)",
};

// Collapsible group header — padding aligned with Row so labels line up.
export const GroupHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: "0.5em 1.5em",
  minHeight: "40px",
  cursor: "pointer",
  userSelect: "none",
  color: "rgba(169, 169, 169, 0.9)",
  fontSize: "11pt",
};

export const GroupCount: CSSProperties = {
  opacity: 0.5,
  marginLeft: "6px",
};

export const Divider: CSSProperties = {
  position: "relative",
  margin: "8px 0 0",
  width: "calc(100% - 3em)",
  height: "1px",
  background: "#dddddd40",
};

export const SectionTitle: CSSProperties = {
  padding: "0.75em 8px 0.25em",
  fontSize: "12pt",
  width: "calc(100% - 20px)",
  color: "rgba(169, 169, 169, 0.9)",
};

export const Section: CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  width: "100%",
  overflowX: "hidden",
  overflowY: "auto",
  scrollbarWidth: "none",
  maxHeight: "180px",
};

export const Row: CSSProperties = {
  display: "flex",
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0.5em 1.5em",
  minHeight: "45px",
  gap: "10px",
};

export const Button: CSSProperties = {
  color: "#ddddddcc",
  outline: "none",
  cursor: "pointer",
  background: "rgba(16,23,22,0.3)",
  padding: "0.375em 0.75em",
  borderRadius: "4px",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export const Teleport: CSSProperties = {
  background:
    "linear-gradient(25deg, rgb(0 0 0 / 92%), rgb(45 45 45 / 75%), rgb(89 89 89 / 95%), rgb(28 28 28))",
  border: "1px solid rgba(169, 169, 169, 0.3)",
};

export const InfoButton: CSSProperties = {
  position: "fixed",
  left: "50%",
  bottom: "12px",
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background:
    "linear-gradient(25deg, rgb(0 0 0 / 92%), rgb(45 45 45 / 75%), rgb(89 89 89 / 95%), rgb(28 28 28))",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  transform: "translateX(-50%)",
  boxShadow:
    "0px 1px 1px rgba(0,0,0,0.09), 1px 2px 2px rgba(0,0,0,0.09), 2px 4px 4px rgba(0,0,0,0.09), 4px 8px 8px rgba(0,0,0,0.09)",
  color: "#dddddd96",
  cursor: "pointer",
  zIndex: 50,
  pointerEvents: "auto",
};

export const InfoIcon: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

// Anchored to the button corner (absolute within InfoButton).
export const OnlineCount: CSSProperties = {
  display: "flex",
  background: "#877f7f",
  width: "20px",
  height: "20px",
  position: "absolute",
  bottom: "0",
  right: "0",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "50%",
  color: "#080808",
  fontSize: "10pt",
  fontWeight: 700,
};

export const Balloon: CSSProperties = {
  position: "absolute",
  top: "-25%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  whiteSpace: "nowrap",
  background: "rgb(24 24 24 / 90%)",
  padding: "0.375em",
  borderRadius: "4px",
  fontSize: "10pt",
  color: "#dddddd",
};

export const SearchInput: CSSProperties = {
  width: "calc(100% - 3em)",
  margin: "8px auto 6px",
  padding: "0.45em 0.75em",
  borderRadius: "6px",
  background: "rgba(169,169,169,0.10)",
  border: "1px solid rgba(169,169,169,0.18)",
  color: "#dddddd",
  fontSize: "10.5pt",
  outline: "none",
};

export const Thumb: CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  objectFit: "cover",
  flexShrink: 0,
};

export const ThumbPlaceholder: CSSProperties = {
  ...Thumb,
  background: "rgba(169,169,169,0.18)",
};
