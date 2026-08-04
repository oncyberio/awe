import { DefaultComponentFactory } from "../../abstract/default-component-factory";
import { PortalComponent } from "./portal-component";

/** @internal */
export class PortalComponentFactory extends DefaultComponentFactory<PortalComponent> {

	Type = PortalComponent;

	static info = {
		type: "portal",
		title: "Portal",
		image: "https://raw.githubusercontent.com/Gh0sTtD3v/cdn/refs/heads/main/oncyber/icon/portal.png",
		description: "A spawnpoint that opens the destination directory on enter",
		draggable: true,
		transform: true,
		studioTab: "worldSettings",
	};

	static {
		const defaultData = {
			kit: "cyber",
			name: "",
			type: "portal",
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 },
			p_name: "",
			image: "",
			slug: "",
			cooldown: 1500,
			radius: 1,
			color: "#00ffff",
			opacity: 0.8,
			display: true,
			collider: {
				enabled: true,
				rigidbodyType: "fixed",
				colliderType: "cylinder",
				isSensor: true,
			},
		};

		this.setDataConfig({
			defaultData,
		});
	}

	static getTitle(data: any) {
		return data.name || "Portal";
	}
}
