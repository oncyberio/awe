import { useRef } from "react";
import dynamic from "next/dynamic";
import RightPanels from "./right-panels";
import CenterPanel from "./center-panel";
import { classes } from "../utils/classes";
import { updateObjProperty } from "../utils/js";
import type { GameData } from "../types/game-data";

import { ContentBar } from "./content-bar";
import { ContentTab } from "./content-tab";

import { useUserUploads } from "../hooks/use-user-uploads";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { useWorldSelection } from "../hooks/use-world-selection";
import { useCurrentGameData } from "../contexts/game-data-context";

import { useContentTab } from "../contexts/content-tab-context";
import { useEditorService } from "../contexts/editor-service-context";
import { WorldSettingsToolbar } from "./world-settings/toolbar";
import { WorldConfigPanel } from "./world-config-panel";
import { useCoordsChangeHandler } from "../hooks/use-coords-change-handler";
import { useWorldUpdateHandler } from "../hooks/use-world-update-handler";

const styles = {
  studioEditor: "studioEditor",
  tabs: "tabs",
  widthGetter: "widthGetter",
};

const TAB_WIDTHS = {
  addAssetsV1: "addAssetsV1",
  gallery: "fullwidth",
  games: "fullwidth",
  custom: "fullwidth",
  hangout: "fullwidth",
  script: "script",
};

const AddAssets = dynamic(() => import("./content-tab/add-assets"), {
  ssr: false,
});

const ContentMap = {
  addAssetsV1: {
    title: "Add assets V1",
    content: () => <AddAssets />,
  },
  settings: {
    title: "Settings",
    content: () => <WorldConfigPanel />,
  },
  script: {
    title: "Script",
    content: () => <></>,
  },
};

interface EditWorldProps {
  onSettings: () => void;
  countByType: Record<string, number>;
  isEditorReady: boolean;
  showWorldItems: boolean;
  setShowWorldItems: (show: boolean) => void;
}

export function EditWorld({
  onSettings,
  countByType,
  isEditorReady,
  showWorldItems,
  setShowWorldItems,
}: EditWorldProps) {
  //
  useUserUploads();

  // useDeleteHandler();
  useWorldUpdateHandler();
  useCoordsChangeHandler();

  const widthGetter = useRef(null);

  const { tabWidth, activeTab, rightBarWidth, activeTabCollapsed } =
    useContentTab();

  const selection = useWorldSelection();

  const { editor } = useEditorService();

  const { gameData } = useCurrentGameData();

  const { clickRef } = useOnClickOutside({
    handler: () => {},
  });

  const option = ContentMap[activeTab];

  const setGameData = async (data: Partial<GameData>) => {
    return editor.updateGameData((state) => {
      Object.entries(data).forEach(([key, value]) => {
        updateObjProperty(state, key, value);
      });
    });
  };

  return (
    <div
      className={styles.studioEditor}
      style={{
        // @ts-ignore
        "--tabWidth": `${tabWidth}px`,
        "--rightPanelWidth": `${rightBarWidth}px`,
      }}
    >
      <div
        className={classes(
          styles.tabs,
          activeTab && TAB_WIDTHS[activeTab] && styles[TAB_WIDTHS[activeTab]]
        )}
        ref={clickRef}
      >
        {(activeTab === "addAssetsV1" || activeTab === "settings") && (
          <ContentBar />
        )}

        {activeTab && (
          <>
            <ContentTab
              collapsed={activeTabCollapsed}
              display={TAB_WIDTHS[activeTab]}
              widthGetter={widthGetter.current}
            >
              <option.content />
            </ContentTab>

            <div ref={widthGetter} className={styles.widthGetter}></div>
          </>
        )}
      </div>

      {selection.allSelected.length > 0 && <WorldSettingsToolbar />}

      {isEditorReady && activeTab !== "script" && (
        <CenterPanel showWorldItems={showWorldItems} />
      )}

      {isEditorReady && (
        <RightPanels
          countByType={countByType}
          showWorldItems={showWorldItems}
          setShowWorldItems={setShowWorldItems}
        />
      )}
    </div>
  );
}
