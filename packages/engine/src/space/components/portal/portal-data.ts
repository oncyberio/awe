import { Component3DData } from "../../abstract/component-3d-data";
import { XYZ } from "../types";

/**
 * @public
 *
 * Configuration data for {@link PortalComponent}.
 *
 * See {@link ComponentManager.create} on how to create a component.
 */
export interface PortalComponentData extends Component3DData {

	type: "portal";

	id?: string;

	name?: string;

	position?: XYZ;

	rotation?: XYZ;

	scale?: XYZ;

	/**
	 * Display name for the spawnpoint, surfaced in the destination directory
	 * listing ("yellowpages"). Stored separately from the component's reserved
	 * `name` field. Provided to the generated portal index.
	 */
	p_name?: string;

	/**
	 * Thumbnail surfaced in the destination directory listing ("yellowpages").
	 * The studio image-upload control stores an upload descriptor object; the
	 * generated portal index resolves it down to a plain URL string.
	 */
	image?: string | { path?: string; image?: string; name?: string };

	/**
	 * URL-friendly identifier for the spawnpoint, surfaced in the directory
	 * listing alongside the name. Provided to the generated portal index.
	 */
	slug?: string;

	/**
	 * Cooldown in milliseconds between directory opens, preventing the portal
	 * from re-firing while the avatar lingers on the disc. Defaults to `1500`.
	 */
	cooldown?: number;

	/** Portal disc radius. Defaults to `1`. */
	radius?: number;

	/** Portal disc color. Defaults to `"#00ffff"`. */
	color?: string;

	/** Portal opacity. Defaults to `0.8`. */
	opacity?: number;

	/** Whether the portal is visible during play. Defaults to `true`. */
	display?: boolean;
}
