"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/hooks/use-store";
import {
  infoStore,
  toggleInfo,
  closeInfo,
  openInfo,
  setInfoTab,
  type InfoTab,
  type PlayerInfo,
} from "@/lib/info-store";
import { getScript } from "@/lib/game-script";
import * as S from "./info-styles";

const ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEiElEQVR4nO2b2avVVRTHP47X1PLeJFIc8ppjoUKQ9zon1oOPpT2F9KKoOOHVKJUoQvwHEiPFWV+ukAN0c3owUSlMQXNAFBJ7Uqych1tXY8E6sNic3zm/8zt7n+Hn+cIP4bp+a6+9zt5r/kENNdQQGN2BScBnwCbgGHANuAk8AB4Ct4HLwM/AVmApMAWoo0rRB/gU+Al4BDxP+NwHflBePakCjNJf+XERm4567gDrgaFUIIYArUBHhPAXgC3AQmAGMBp4FWjQ5zXgLf2/JUp7JYJXO7ARGEiF3O9vIn7xM8ByVU5SDANWApey8L+ntqILZcJI3aQV6pne2ckB1psGHMmiiBPlOA0fqgW3gvyi1j40RBHnnbVvAR9QIix17voTYAXQuVQCAN2A1WoPrG2YE3rh1Y7mxZ+PoXyYAPzpXMHFoRZb4mz+lFrvcuN14KyjBO8n4SNlnFlEjNFLVFbgddy5Dt5swnANQuwv35vKwyuOV/oLeKNYpnWOxb0K1HsQVrzFQQ1172vIPNED337ADcdFFhUnfGmYSUw/zoOQHwP/ZvHn8rfZHvhPdLyDeK3ER/+xYbTIg3ANznVyn388nbA1huddYEASJq1OkOPDz8+JkfR84ilO+N3wlNyhIIw2wY5Y/3fwg1UxFCA0viJG6xUKyiK3m5f34w+lOgEZ2NxhQyE+9ZF5cbxHgfLZgL892YAMpjr1hF5xXprnpLS+MTvCC8gxnRVgvYtmDaks5cVRHy4kRgzfpjm9PD8CzYHWainkOvcwrk+MX3+qH0ONAh7kK7RON8RShUkLLpt9vZeL8IskVrMK8L3Zl9QuIrHNEM4nPVho9rUzF+EpQyjXIS2Y7ES1kbhuCIup5sb1BC1aOQ7lAbIZQtljJG4bwr6BhKnX9NeNA9o8B0EWPc064uUi8dQQSs0/BLJt3iohFGzJLBLthlAyqhDHPl8uEOo6ZPhLkheJO4ZQcgLfWBFDAWIXQl4BqUBF4oYhbAwgyNcxFCA0vjHY8P8jF+FJQyj5dFoUYN2guPpI7DaEc1OkgLmGv3SeI/G5IfwuRQrYEDcUft8QnkuRAmxpP2f5vbc2OzP+cmAKFDDIdLUexolvDhlhFqdAAbanKbMLebHAvPBbChRwptCCa73TEGmqYgU0OU2X2JNmO8yL+6pYAYcN328LefFtpzHSVIUKsB6tPUlk22oY/OqpNVYqBXRS+5XhuTkJk0bHFrRUUTK0zEl+EjVHBV8ZRk+0Z1gMmkuQDo936hoS3SZGN+C0YSYKqeSCSINmezbx6VqswCOUqczijS2WmbrZtgAlsTrH6ovbe5MKRrMWRH0URSW83Ws2/x8wkxcEL2cZoQ02K1hpGOlMgvgcsIjdf9+pgw/ie0uFTlrkuGc23qHur6S47lhcX6M0uTDWaeFnfL1Mn5UcBx1BnmkPPkRpe4yeto4sH2PIxxZlQS9gbcQHEz6P42ZnVPe5Tpmsq5QPqxqBXep+MgIe8MR7QBblHvAQlQbBcP1oqs3jGL0kYXs0o5N/3+UFRZdyC1BDDTWQOvwPevqe5yufCfIAAAAASUVORK5CYII=";

const TABS: { id: InfoTab; label: string }[] = [
  { id: "chunk", label: "Info" },
  { id: "players", label: "Players" },
  { id: "destinations", label: "Destinations" },
];

// Placeholder thumbnail until per-chunk image input lands.
const PLACEHOLDER_IMG = "https://img.icons8.com/pastel-glyph/64/image--v2.png";

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function releasePointer() {
  try {
    document.exitPointerLock();
  } catch {
    // ignore
  }
}

export function InfoCard() {
  const state = useStore(infoStore);

  // Toggle with the "I" key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyI") return;
      // Don't toggle while typing in a field (e.g. the destinations search).
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      toggleInfo();
      if (infoStore.state.isOpen) releasePointer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {state.isOpen && (
        <div style={S.Wrapper}>
          <div style={S.Container}>
            <div style={S.CloseButton} onClick={closeInfo}>
              ✕
            </div>

            <div style={S.TabBar}>
              {TABS.map((t) => (
                <div
                  key={t.id}
                  style={state.tab === t.id ? S.TabActive : S.Tab}
                  onClick={() => setInfoTab(t.id)}
                >
                  {t.label}
                </div>
              ))}
            </div>

            <div style={S.Divider} />

            {state.tab === "chunk" && <ChunkTab />}
            {state.tab === "players" && <PlayersTab />}
            {state.tab === "destinations" && <DestinationsTab />}
          </div>
        </div>
      )}

      {/* Persistent circular icon button (bottom-center) with live count. */}
      <InfoButton online={state.players.length} isOpen={state.isOpen} />
    </>
  );
}

function InfoButton({ online, isOpen }: { online: number; isOpen: boolean }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={S.InfoButton}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        if (infoStore.state.isOpen) {
          closeInfo();
        } else {
          openInfo();
          releasePointer();
        }
      }}
    >
      <span style={S.InfoIcon}>
        <img src={ICON} alt="Info" width={64} height={64} draggable={false} />
      </span>
      {online > 0 && <div style={S.OnlineCount}>{online}</div>}
      {hover && !isOpen && <div style={S.Balloon}>Press i</div>}
    </div>
  );
}

function TeleportButton({ onClick }: { onClick: () => void }) {
  return (
    <button style={{ ...S.Button, ...S.Teleport }} onClick={onClick}>
      Teleport
    </button>
  );
}

function ChunkTab() {
  const { chunkInfo } = useStore(infoStore);
  const image = chunkInfo?.image || PLACEHOLDER_IMG;
  const title = chunkInfo?.title || "Untitled";
  const owner = chunkInfo?.owner || "—";
  const tags = chunkInfo?.tags ?? [];

  return (
    <div style={S.Section}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          padding: "0.5em 1.5em",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "12px",
            objectFit: "cover",
            background: "rgba(169,169,169,0.12)",
          }}
        />
        <div style={{ fontSize: "16pt", textAlign: "center" }}>{title}</div>
      </div>

      <div style={S.Row}>
        <span>Owner</span>
        <span style={{ color: "#dddddd" }}>{owner}</span>
      </div>

      <div style={{ ...S.Row, alignItems: "flex-start" }}>
        <span>Tags</span>
        <span
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            justifyContent: "flex-end",
          }}
        >
          {tags.length > 0 ? (
            tags.map((t) => (
              <span
                key={t}
                style={{
                  background: "rgba(169,169,169,0.16)",
                  borderRadius: "4px",
                  padding: "0.15em 0.5em",
                  fontSize: "9.5pt",
                }}
              >
                {t}
              </span>
            ))
          ) : (
            <span style={{ color: "#dddddd80" }}>—</span>
          )}
        </span>
      </div>

      <div
        style={{
          ...S.Row,
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "4px",
        }}
      >
        <span>Description</span>
        <span
          style={{
            textAlign: "justify",
            color: chunkInfo?.description ? "#dddddd" : "#dddddd80",
          }}
        >
          {chunkInfo?.description || "—"}
        </span>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: PlayerInfo }) {
  return (
    <div style={S.Row}>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        {shortId(player.sessionId)}
        {player.isLocal && (
          <span style={{ color: "rgba(169,169,169,0.9)" }}> (you)</span>
        )}
      </span>
      {!player.isLocal && (
        <TeleportButton
          onClick={() => getScript()?.teleportToPlayer(player.sessionId)}
        />
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        transition: "transform 0.2s ease",
        transform: open ? "rotate(0deg)" : "rotate(-90deg)",
        opacity: 0.7,
      }}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayerGroup({
  label,
  members,
  defaultOpen,
}: {
  label: string;
  members: PlayerInfo[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div style={S.GroupHeader} onClick={() => setOpen((o) => !o)}>
        <span>
          {label}
          <span style={S.GroupCount}>{members.length}</span>
        </span>
        <Chevron open={open} />
      </div>
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? `${members.length * 60 + 8}px` : "0px",
          opacity: open ? 1 : 0,
          transition: "max-height 0.25s ease, opacity 0.2s ease",
        }}
      >
        {members.map((p) => (
          <PlayerRow key={p.sessionId} player={p} />
        ))}
      </div>
    </div>
  );
}

function PlayersTab() {
  const { players } = useStore(infoStore);

  // Roles aren't tracked yet — everyone lands in Guest for now.
  const groups: { label: string; members: PlayerInfo[] }[] = [
    { label: "Owner / Mod", members: [] },
    { label: "Speaker", members: [] },
    { label: "Guest", members: players },
  ];

  return (
    <div style={S.Section}>
      {groups.map((g, i) => (
        <div key={g.label}>
          {i > 0 && <div style={S.Divider} />}
          <PlayerGroup
            label={g.label}
            members={g.members}
            defaultOpen={g.members.length > 0}
          />
        </div>
      ))}
    </div>
  );
}

function DestinationsTab() {
  const { portals } = useStore(infoStore);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? portals.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q),
      )
    : portals;

  return (
    <>
      <input
        style={S.SearchInput}
        placeholder="Search destinations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={S.Section}>
        {portals.length === 0 ? (
          <div style={{ ...S.Row, color: "#dddddd80" }}>
            No destinations available.
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S.Row, color: "#dddddd80" }}>No matches.</div>
        ) : (
          filtered.map((p) => (
          <div style={S.Row} key={p.id}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: 0,
              }}
            >
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.name} style={S.Thumb} />
              ) : (
                <span style={S.ThumbPlaceholder} />
              )}
              <span style={{ minWidth: 0, overflow: "hidden" }}>
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </span>
                {p.slug && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "10pt",
                      color: "#dddddd80",
                    }}
                  >
                    {p.slug}
                  </span>
                )}
              </span>
            </span>
            <TeleportButton
              onClick={async () => {
                await getScript()?.travelTo(p.position);
                closeInfo();
              }}
            />
          </div>
          ))
        )}
      </div>
    </>
  );
}
