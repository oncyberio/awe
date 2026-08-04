import Tip from "../../ui/tip";
import { useEffect, useState } from "react";
import { StudioButton } from "../studio-button";
import { useContentTab } from "../../contexts/content-tab-context";

function ContentBarButton({ tipLabel, children }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {isHovered && tipLabel && (
        <Tip position="right" visible={isHovered}>
          {tipLabel}
        </Tip>
      )}
      {children}
    </div>
  );
}

export function ContentBar() {
  //
  const {
    activeTab,
    setActiveTab,
    activeCategory,
    activeEnvironment,
    setActiveCategory,
    setActiveEnvironment,
  } = useContentTab();

  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (highlight) {
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [highlight]);

  return (
    <div className="w-[71px] max-h-full bg-studio-black border border-[#121212] shadow-[0px_-4px_12px_0px_rgba(32,32,32,0.4)_inset] pointer-events-auto p-2 flex flex-col gap-2 rounded-[14px] mr-1">
      <ContentBarButton tipLabel="Settings">
        <StudioButton
          size="l"
          title="Settings"
          onClick={() => setActiveTab(activeTab === "settings" ? null : "settings")}
          className={activeTab === "settings" ? "content-bar-active" : ""}
        >
          <img
            src="https://img.icons8.com/windows/32/settings--v1.png"
            width={24}
            height={24}
            alt="Settings"
            style={{ filter: "invert(1)" }}
          />
        </StudioButton>
      </ContentBarButton>
      <ContentBarButton tipLabel="World settings">
        <StudioButton
          gradientStart="#62CE20"
          gradientStop="#37A950"
          size="l"
          onClick={() => {
            if (
              activeTab === "addAssetsV1" &&
              activeEnvironment === "marketplace" &&
              activeCategory === "official"
            ) {
              setActiveEnvironment(null);
              setActiveCategory(null);
            } else {
              setActiveTab("addAssetsV1");
              setActiveEnvironment("marketplace");
              setActiveCategory("official");
            }
          }}
          className={
            activeTab === "addAssetsV1" &&
            activeEnvironment === "marketplace" &&
            activeCategory === "official"
              ? "content-bar-active"
              : ""
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="20"
            viewBox="0 0 22 20"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.45486 0C5.19789 0 3.36826 1.8435 3.36826 4.11757C3.36826 6.39165 5.19789 8.23515 7.45486 8.23515C9.71183 8.23515 11.5415 6.39165 11.5415 4.11757C11.5415 1.8435 9.71183 0 7.45486 0Z"
              fill="white"
            />
            <path
              d="M12.7286 7.67788C13.5794 6.48731 15.3578 6.5498 16.1242 7.79718L21.6908 16.8576C22.5335 18.2291 21.5544 20 19.9535 20H2.04674C0.414762 20 -0.55865 18.1674 0.346608 16.7992L3.72173 11.6981C4.36203 10.7304 5.67022 10.4888 6.60951 11.1648L8.76832 12.7185C8.89915 12.8127 9.08092 12.7825 9.17487 12.6511L12.7286 7.67788Z"
              fill="white"
            />
          </svg>
        </StudioButton>
      </ContentBarButton>
      <ContentBarButton tipLabel="3D">
        <StudioButton
          gradientStart="#674FFF"
          gradientStop="#4F3BCD"
          size="l"
          onClick={() => {
            if (
              activeTab === "addAssetsV1" &&
              activeEnvironment === "marketplace" &&
              activeCategory === "3d"
            ) {
              setActiveEnvironment(null);
              setActiveCategory(null);
            } else {
              setActiveTab("addAssetsV1");
              setActiveEnvironment("marketplace");
              setActiveCategory("3d");
            }
          }}
          className={
            activeTab === "addAssetsV1" &&
            activeEnvironment === "marketplace" &&
            activeCategory === "3d"
              ? "content-bar-active"
              : ""
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="20"
            viewBox="0 0 22 20"
            fill="none"
          >
            <path
              d="M11.8552 0.203118C11.3163 -0.0677068 10.6837 -0.0677053 10.1448 0.203119L1.07075 4.76384C-0.35692 5.4814 -0.356914 7.54668 1.07075 8.26424L10.1448 12.825C10.6837 13.0958 11.3163 13.0958 11.8552 12.825L20.9292 8.26424C22.3569 7.54669 22.3569 5.4814 20.9293 4.76384L11.8552 0.203118Z"
              fill="white"
            />
            <path
              d="M2.86623 10.8333L1.07075 11.7358C-0.356912 12.4533 -0.356919 14.5186 1.07075 15.2362L10.1448 19.7969C10.6837 20.0677 11.3163 20.0677 11.8552 19.7969L20.9293 15.2362C22.3569 14.5186 22.3569 12.4533 20.9292 11.7358L19.1338 10.8333L11.8552 14.4916C11.3163 14.7625 10.6837 14.7625 10.1448 14.4916L2.86623 10.8333Z"
              fill="white"
            />
          </svg>
        </StudioButton>
      </ContentBarButton>
      <ContentBarButton tipLabel="Avatars">
        <StudioButton
          image="https://cyber.mypinata.cloud/ipfs/QmckGHe9wkas8fid4weNqL8kpSviW3Q8emeQtwJoVbWFzj?filename=avatar-icon.png"
          size="l"
          onClick={() => {
            if (
              activeTab === "addAssetsV1" &&
              activeEnvironment === "marketplace" &&
              activeCategory === "avatars"
            ) {
              setActiveEnvironment(null);
              setActiveCategory(null);
            } else {
              setActiveTab("addAssetsV1");
              setActiveEnvironment("marketplace");
              setActiveCategory("avatars");
            }
          }}
          className={
            activeTab === "addAssetsV1" &&
            activeEnvironment === "marketplace" &&
            activeCategory === "avatars"
              ? "content-bar-active"
              : ""
          }
        />
      </ContentBarButton>

      <ContentBarButton tipLabel="NFTs">
        <StudioButton
          size="l"
          onClick={() => {
            if (
              activeTab === "addAssetsV1" &&
              activeEnvironment === "owned" &&
              activeCategory === null
            ) {
              setActiveEnvironment(null);
              setActiveCategory(null);
            } else {
              setActiveTab("addAssetsV1");
              setActiveEnvironment("owned");
              setActiveCategory(null);
            }
          }}
          className={
            activeTab === "addAssetsV1" &&
            activeEnvironment === "owned" &&
            activeCategory === null
              ? "content-bar-active"
              : ""
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="25"
            viewBox="0 0 24 25"
            fill="none"
          >
            <path
              d="M4.10221 1.08782C4.07646 0.947816 3.9583 0.846526 3.82071 0.846526C3.68313 0.846526 3.56496 0.947816 3.53922 1.08782C3.35627 2.08275 2.99532 2.84012 2.45994 3.39471C1.92455 3.94931 1.19341 4.32321 0.232936 4.51272C0.0977821 4.53939 0 4.66179 0 4.80431C0 4.94683 0.0977821 5.06923 0.232936 5.0959C1.19341 5.28541 1.92455 5.65931 2.45994 6.21391C2.99532 6.7685 3.35627 7.52587 3.53922 8.5208C3.56496 8.6608 3.68313 8.76209 3.82071 8.76209C3.9583 8.76209 4.07646 8.6608 4.10221 8.5208C4.28515 7.52587 4.6461 6.7685 5.18149 6.21391C5.71688 5.65931 6.44801 5.28541 7.40849 5.0959C7.54364 5.06923 7.64143 4.94683 7.64143 4.80431C7.64143 4.66179 7.54364 4.53939 7.40849 4.51272C6.44801 4.32321 5.71688 3.94931 5.18149 3.39471C4.6461 2.84012 4.28515 2.08275 4.10221 1.08782Z"
              fill="white"
            />
            <path
              d="M17.8741 11.6442V10.1693H24V11.6442H21.7594V18.1728H20.1037V11.6442H17.8741Z"
              fill="white"
            />
            <path
              d="M11.784 18.1728V10.1693H16.8834V11.6442H13.4397V13.5193H16.2653V14.9257H13.4397V18.1728H11.784Z"
              fill="white"
            />
            <path
              d="M5.23657 18.1728H3.61404V10.1693H5.11516L8.39333 15.2115V10.1693H10.0269V18.1728H8.51474L5.23657 13.1306V18.1728Z"
              fill="white"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6.39969 1.28628C6.39969 0.575887 6.95564 0 7.64143 0H17.83C20.157 0 22.0434 1.95408 22.0434 4.36456V6.56539C22.0434 7.27578 21.4874 7.85167 20.8017 7.85167C20.1159 7.85167 19.5599 7.27578 19.5599 6.56539V4.36456C19.5599 3.37486 18.7854 2.57256 17.83 2.57256H7.64143C6.95564 2.57256 6.39969 1.99667 6.39969 1.28628Z"
              fill="white"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M2.57898 23.7137C2.57898 24.4241 3.13492 25 3.82071 25H18.2545C20.3471 25 22.0434 23.2428 22.0434 21.0752C22.0434 20.3648 21.4874 19.7889 20.8017 19.7889C20.1159 19.7889 19.5599 20.3648 19.5599 21.0752C19.5599 21.822 18.9755 22.4274 18.2545 22.4274H3.82071C3.13492 22.4274 2.57898 23.0033 2.57898 23.7137Z"
              fill="white"
            />
          </svg>
        </StudioButton>
      </ContentBarButton>

      <ContentBarButton tipLabel="Uploads">
        <StudioButton
          size="l"
          onClick={() => {
            setActiveTab("addAssetsV1");
            setActiveEnvironment("uploads");
            setActiveCategory(null);
          }}
          className={
            activeTab === "addAssetsV1" &&
            activeEnvironment === "uploads" &&
            activeCategory === null
              ? "content-bar-active"
              : ""
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M1.22222 10.6944C1.89724 10.6944 2.44444 11.2417 2.44444 11.9167V17.1111C2.44444 18.4611 3.53886 19.5556 4.88889 19.5556H17.1111C18.4611 19.5556 19.5556 18.4611 19.5556 17.1111V11.9167C19.5556 11.2417 20.1028 10.6944 20.7778 10.6944C21.4528 10.6944 22 11.2417 22 11.9167V17.1111C22 19.8112 19.8112 22 17.1111 22H4.88889C2.18883 22 0 19.8112 0 17.1111V11.9167C0 11.2417 0.547207 10.6944 1.22222 10.6944Z"
              fill="white"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11 0C11.3241 -4.37098e-07 11.635 0.128769 11.8642 0.35798L17.3642 5.85798C17.8415 6.33529 17.8415 7.10915 17.3642 7.58646C16.8869 8.06377 16.1131 8.06377 15.6358 7.58646L12.2222 4.17292V14.9722C12.2222 15.6472 11.675 16.1944 11 16.1944C10.325 16.1944 9.77776 15.6472 9.77776 14.9722V4.17293L6.36424 7.58646C5.88694 8.06377 5.11307 8.06377 4.63576 7.58646C4.15845 7.10916 4.15845 6.33529 4.63576 5.85798L10.1357 0.357982C10.365 0.12877 10.6758 4.37103e-07 11 0Z"
              fill="white"
            />
          </svg>
        </StudioButton>
      </ContentBarButton>
    </div>
  );
}
