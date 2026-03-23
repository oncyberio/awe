import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { getMaxFileSizeBytes } from "../utils/file-size";
import { OptimizerServices } from "../utils/uploader/optimizer";
import { ClientAvatarService } from "../services/client-avatar-service";
import { uploadFile } from "../utils/uploader";
import { DEFAULT_AVATAR_IMAGE } from "../utils/constants";

type Avatar = {
  id: string;
  type: string;
  name: string;
  glb: string;
  chain?: string;
  session?: boolean;
  glbCompressed?: string;
  image: string;
  pos: number;
  fileHash?: string;
  createdAt?: number;
  startColor?: string;
  endColor?: string;
  colors?: {
    floor: string;
    horizon: string;
    wall: string;
    top: string;
  };
};

export interface AvatarContextState {
  ownedAvatars: Avatar[];
  uploadedAvatars: Avatar[];
  //
  setUploadedAvatars: React.Dispatch<React.SetStateAction<Avatar[]>>;
  uploadAvatar: (args: { file: File; name: string }) => Promise<void>;
  updateUploadedAvatar: (id: string, payload: Partial<Avatar>) => void;
}

export const AvatarContext = React.createContext<AvatarContextState>(null);

export function AvatarProvider({ children }) {
  //
  const [ownedAssetsVrms, setOwnedAssetsVrms] = useState([]);

  const [uploadedAvatars, setUploadedAvatars] = useState<Avatar[]>([]);

  const triggerFetch = useRef({
    cryptoAvatar: false,
    ownedAssets: false,
  });

  /**
   * Fetches uploaded avatars from the server and updates the state.
   * Maps server Avatar format to context Avatar format.
   */
  useEffect(() => {
    async function fetchAvatars() {
      try {
        //
        const avatars = await ClientAvatarService.getAvatars();
        
        const mappedAvatars: Avatar[] = avatars.map((avatar, index) => ({
          id: avatar.id,
          type: "uploaded",
          name: avatar.name,
          glb: avatar.url,
          glbCompressed: avatar.urlCompressed || undefined,
          image: avatar.image || DEFAULT_AVATAR_IMAGE,
          pos: index,
          fileHash: avatar.fileHash,
          createdAt: avatar.createdAt,
        }));

        setUploadedAvatars(mappedAvatars);
      } catch (error) {
        console.error("Failed to fetch avatars:", error);
      }
    }

    fetchAvatars();
  }, []);

  const ownedAvatars = useMemo(() => {
    //
    const dictionary = new Map();

    ownedAssetsVrms.forEach((item, pos) => {
      const id = item?.id;

      if (id && !dictionary.has(id)) {
        dictionary.set(id, {
          ...item,
          pos,
        });
      }
    });

    return Array.from(dictionary.values());
  }, [ownedAssetsVrms.length]);

  function updateUploadedAvatar(id: string, payload: Partial<Avatar>) {
    //
    const updatedAvatar = uploadedAvatars.map((item) => {
      if (item.id === id) {
        return { ...item, ...payload };
      }
      return item;
    });

    setUploadedAvatars(updatedAvatar);
  }

  async function uploadAvatar({ file, name }) {
    //
    const MAX_FILE_SIZE = getMaxFileSizeBytes();

    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = Math.floor(MAX_FILE_SIZE / (1024 * 1024));
      throw new Error(`Avatar file must be less than ${maxSizeMB}MB in size`);
    }

    if (name.length >= 25) {
      name = name.slice(0, 25);
    }

    const blob = new Blob([file], { type: file.type });

    const buffer = await blob.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const isNewAvatar = await ClientAvatarService.verifyAvatarHash(fileHash);

    if (!isNewAvatar) {
      throw new Error("Avatar already exists");
    }

    const response = await ClientAvatarService.getAvatarByHash(fileHash);

    const id = nanoid();

    let url, urlCompressed;

    let image = DEFAULT_AVATAR_IMAGE;

    if (!response) {
      //
      const result = await uploadFile({
        file,
        mimeType: "model/vrml",
        id: "vrm-" + id,
      });

      url = result?.url;

      if (!url) {
        throw new Error(
          "Oops! Something went wrong with the Avatar upload. Please refresh the page and try again."
        );
      }
    } else {
      url = response?.url;
      image = response?.image;
      urlCompressed = response?.urlCompressed;
    }

    if (!urlCompressed) {
      urlCompressed = await OptimizerServices.optimizeAvatar({
        url,
        id: "compressed-" + id,
      });
      console.log("urlCompressed", urlCompressed);
    }

    const persist = await ClientAvatarService.setAvatarData({
      fileHash,
      url,
      name,
      urlCompressed,
    });

    setUploadedAvatars((prev) => [
      ...prev,
      {
        id: persist.id,
        name,
        image,
        type: "uploaded",
        pos: prev.length + 1,
        fileHash,
        glb: url,
        glbCompressed: urlCompressed,
        createdAt: Date.now(),
      },
    ]);

    return;
  }

  const state = {
    ownedAvatars,
    uploadedAvatars,
    //
    uploadAvatar,
    setUploadedAvatars,
    updateUploadedAvatar,
  };

  return (
    <AvatarContext.Provider value={state}>{children}</AvatarContext.Provider>
  );
}

export const useAvatar = () => {
  const context = useContext(AvatarContext);

  if (!context) {
    throw Error("useAvatar needs to be called within AvatarContext.");
  }

  return context;
};
