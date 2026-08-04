"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ClientGameService } from "../services/client-game-service";
import { useContentTab } from "../contexts/content-tab-context";
import { useCurrentGameData } from "../contexts/game-data-context";
import { ImageInput } from "./gui/controls/image-input";
import type { ChunkConfig, Role } from "../server/game-service";

type TabId = "chunk" | "roles";

const PERMISSIONS: { key: keyof Role["permissions"]; label: string; desc: string }[] = [
  { key: "administrator", label: "Administrator", desc: "Full access — implies all other permissions." },
  { key: "moderate", label: "Moderate Members", desc: "Kick or mute other members." },
  { key: "speak", label: "Speak", desc: "Use voice within chunks." },
  { key: "build", label: "Build", desc: "Edit the scene." },
];

const inputCls =
  "w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30";
const labelCls = "block text-xs uppercase tracking-wide text-white/40 mb-1";

export function WorldConfigPanel() {
  const [tab, setTab] = useState<TabId>("chunk");
  const { setActiveTab } = useContentTab();
  const { gameData } = useCurrentGameData();
  const initialChunk = (gameData as any)?._chunkKey ?? null;

  return (
    <div className="content-tab w-[60vw] max-w-[60vw] h-full flex flex-col rounded-[14px] bg-studio-black text-white border border-white/10 overflow-hidden pointer-events-auto">
      <div className="flex items-center justify-between px-6 h-14 border-b border-white/10 shrink-0">
        <span className="text-base font-semibold">Settings</span>
        <button
          onClick={() => setActiveTab(null)}
          className="h-7 w-7 rounded-full text-white/50 hover:text-white hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <nav className="w-48 shrink-0 border-r border-white/10 p-3 flex flex-col gap-1">
          <TabButton active={tab === "chunk"} onClick={() => setTab("chunk")}>
            Chunk
          </TabButton>
          <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>
            Roles
          </TabButton>
        </nav>

        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {tab === "chunk" ? (
            <ChunkConfigTab initialChunk={initialChunk} />
          ) : (
            <RolesTab />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg px-3 py-2 text-sm transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

// ── Chunk tab ──────────────────────────────────────────────────────────────

function ChunkConfigTab({ initialChunk }: { initialChunk?: string | null }) {
  const [chunks, setChunks] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [chunkKey, setChunkKey] = useState<string>("");
  const [config, setConfig] = useState<ChunkConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [list, r] = await Promise.all([
        ClientGameService.listChunks(),
        ClientGameService.getRoles(),
      ]);
      if (!alive) return;
      setChunks(list);
      setRoles(r);
      const first = initialChunk && list.includes(initialChunk) ? initialChunk : list[0];
      setChunkKey(first ?? "");
    })();
    return () => {
      alive = false;
    };
  }, [initialChunk]);

  useEffect(() => {
    if (!chunkKey) {
      setConfig(null);
      return;
    }
    let alive = true;
    ClientGameService.getChunkConfig(chunkKey).then((c) => {
      if (alive) setConfig(c);
    });
    return () => {
      alive = false;
    };
  }, [chunkKey]);

  const tagsText = useMemo(() => (config?.info.tags ?? []).join(", "), [config]);

  if (chunks.length === 0) {
    return <p className="text-sm text-white/40">No chunks yet. Add assets to the scene first.</p>;
  }

  const patchInfo = (patch: Partial<ChunkConfig["info"]>) =>
    setConfig((c) => (c ? { ...c, info: { ...c.info, ...patch } } : c));

  const toggleAuth = (roleId: string) =>
    setConfig((c) => {
      if (!c) return c;
      const has = c.auth.includes(roleId);
      return {
        ...c,
        auth: has ? c.auth.filter((id) => id !== roleId) : [...c.auth, roleId],
      };
    });

  const save = async () => {
    if (!config || !chunkKey) return;
    setSaving(true);
    setSaved(false);
    await ClientGameService.setChunkConfig(chunkKey, config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className={labelCls}>Chunk</label>
        <select
          className={inputCls}
          value={chunkKey}
          onChange={(e) => setChunkKey(e.target.value)}
        >
          {chunks.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {config && (
        <>
          <div>
            <label className={labelCls}>Title</label>
            <input
              className={inputCls}
              value={config.info.title ?? ""}
              onChange={(e) => patchInfo({ title: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Owner</label>
            <input
              className={inputCls}
              value={config.info.owner ?? ""}
              onChange={(e) => patchInfo({ owner: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Tags (comma separated)</label>
            <input
              className={inputCls}
              value={tagsText}
              onChange={(e) =>
                patchInfo({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div>
            <label className={labelCls}>Image</label>
            <ImageInput
              value={config.info.image ? { image: config.info.image } : null}
              accept="image/png, image/jpeg, image/jpg, image/webp"
              acceptLabel=".png .jpg .webp"
              onChange={(v: any) =>
                patchInfo({ image: v?.image ?? v?.path ?? "" })
              }
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} h-24 resize-none`}
              value={config.info.description ?? ""}
              onChange={(e) => patchInfo({ description: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Access (roles allowed to enter)</label>
            {roles.length === 0 ? (
              <p className="text-xs text-white/40">
                No roles defined. Empty access = public.
              </p>
            ) : (
              <div className="space-y-1.5">
                {roles.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.auth.includes(r.id)}
                      onChange={() => toggleAuth(r.id)}
                    />
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: r.color }}
                    />
                    {r.name}
                  </label>
                ))}
                <p className="text-xs text-white/30 pt-1">None checked = public.</p>
              </div>
            )}
          </div>

          <SaveBar saving={saving} saved={saved} onSave={save} />
        </>
      )}
    </div>
  );
}

// ── Roles tab (Discord-style) ───────────────────────────────────────────────

function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    ClientGameService.getRoles().then((r) => {
      if (!alive) return;
      setRoles(r);
      setSelectedId(r[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  const addRole = () => {
    const role: Role = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `role-${Date.now()}`,
      name: "new role",
      color: "#99aab5",
      permissions: {},
    };
    setRoles((rs) => [...rs, role]);
    setSelectedId(role.id);
  };

  const deleteRole = (id: string) => {
    setRoles((rs) => rs.filter((r) => r.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const patchSelected = (patch: Partial<Role>) =>
    setRoles((rs) => rs.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)));

  const togglePerm = (key: keyof Role["permissions"]) =>
    setRoles((rs) =>
      rs.map((r) =>
        r.id === selectedId
          ? { ...r, permissions: { ...r.permissions, [key]: !r.permissions[key] } }
          : r,
      ),
    );

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await ClientGameService.setRoles(roles);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-52 shrink-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className={labelCls + " mb-0"}>Roles</span>
            <button
              onClick={addRole}
              className="rounded-md bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20"
            >
              + Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                  r.id === selectedId ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: r.color }}
                />
                <span className="truncate">{r.name}</span>
              </button>
            ))}
            {roles.length === 0 && (
              <p className="text-xs text-white/40 px-2">No roles yet.</p>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 border-l border-white/10 pl-4">
          {!selected ? (
            <p className="text-sm text-white/40">Select or add a role.</p>
          ) : (
            <div className="space-y-4 max-w-md">
              <div>
                <label className={labelCls}>Role name</label>
                <input
                  className={inputCls}
                  value={selected.name}
                  onChange={(e) => patchSelected({ name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Color</label>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => patchSelected({ color: e.target.value })}
                  className="h-9 w-16 rounded bg-transparent cursor-pointer"
                />
              </div>

              <div>
                <label className={labelCls}>Permissions</label>
                <div className="space-y-2">
                  {PERMISSIONS.map((p) => (
                    <label
                      key={p.key}
                      className="flex items-start justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 cursor-pointer"
                    >
                      <span>
                        <span className="block text-sm">{p.label}</span>
                        <span className="block text-xs text-white/40">{p.desc}</span>
                      </span>
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!selected.permissions[p.key]}
                        onChange={() => togglePerm(p.key)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => deleteRole(selected.id)}
                className="text-xs text-red-400/80 hover:text-red-400"
              >
                Delete role
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4">
        <SaveBar saving={saving} saved={saved} onSave={save} />
      </div>
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && <span className="text-xs text-green-400">Saved</span>}
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
