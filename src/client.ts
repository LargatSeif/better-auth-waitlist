import type { BetterAuthClientPlugin } from "better-auth";
import type { FieldAttribute } from "better-auth/db";

import type { waitlist } from "./index";

interface WaitlistClientOptions {
	additionalFields?: {
		[key: string]: FieldAttribute;
	};
}
// eslint-disable-next-line antfu/top-level-function, ts/explicit-function-return-type
export const waitlistClient = <CO extends WaitlistClientOptions>(
	options?: CO,
) => {
	console.warn(options);
	return {
		id: "waitlist",
		$InferServerPlugin: {} as ReturnType<
			typeof waitlist<{
				additionalFields: CO["additionalFields"] | undefined;
			}>
		>,
	} satisfies BetterAuthClientPlugin;
};
