// Live account snapshot: initial fetch plus refresh on `account-updated`.

import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import {
	type AccountSnapshot,
	EMPTY_ACCOUNT,
	getSnapshot,
} from "@/lib/account";

export function useAccountSnapshot(): {
	snapshot: AccountSnapshot;
	error: string | null;
} {
	const [snapshot, setSnapshot] = useState<AccountSnapshot>(EMPTY_ACCOUNT);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(() => {
		getSnapshot()
			.then(setSnapshot)
			.catch((e) => setError(String(e)));
	}, []);

	useEffect(() => {
		refresh();
		const unlisten = listen("account-updated", () => refresh());
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [refresh]);

	return { snapshot, error };
}
