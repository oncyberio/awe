import { Component3DEditor } from "../../component-editor/ui-editor";
import { PortalComponent } from "@oncyberio/engine/space/components/portal/portal-component";
import { getTransformUI } from "../../component-editor/ui/transform-ui";
import type { GuiGroupDescriptor } from "@oncyberio/engine/space/gui-types";

/** @internal */
export class PortalComponentEditor extends Component3DEditor<PortalComponent> {

	getGUI(): GuiGroupDescriptor {
		return {
			type: "group",
			children: {
				transform: getTransformUI(this),
				portal: {
					type: "folder",
					label: "Portal",
					children: {
						image: {
							type: "image",
							label: "Image",
							action: "upload",
							value: [this.data, "image"],
							accept: "image/png, image/jpeg, image/jpg, image/webp",
							acceptLabel: ".png .jpg .webp",
						},
						p_name: {
							type: "text",
							label: "Name",
							value: [this.data, "p_name"],
						},
						slug: {
							type: "text",
							label: "Slug",
							value: [this.data, "slug"],
						},
						cooldown: {
							type: "number",
							label: "Cooldown (ms)",
							value: [this.data, "cooldown"],
							min: 0,
							max: 60000,
							step: 100,
						},
						display: {
							type: "checkbox",
							label: "Display in Live Mode",
							value: [this.data, "display"],
						},
					},
				},
				geometry: {
					type: "folder",
					label: "Geometry",
					children: {
						radius: {
							type: "number",
							label: "Radius",
							value: [this.data, "radius"],
							min: 0.1,
							max: 50,
							step: 0.1,
						},
					},
				},
				material: {
					type: "folder",
					label: "Material",
					children: {
						color: {
							type: "color",
							label: "Color",
							value: [this.data, "color"],
						},
						opacity: {
							type: "number",
							label: "Opacity",
							value: [this.data, "opacity"],
							min: 0,
							max: 1,
							step: 0.01,
						},
					},
				},
			},
		};
	}
}
