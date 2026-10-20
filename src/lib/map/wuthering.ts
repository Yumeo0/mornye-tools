import { useCallback, useEffect, useState } from "react";
import type { MapReward } from "./types";

/**
 * wuthering.gg keys its comment threads by a "mark id" that is simply the sum
 * of a placement's raw Transform coordinates — the site computes
 * `location[0] + location[1]` from its marker tables, which store the same
 * unscaled coordinates our catalogue divides by 100. Verified against live
 * pins; see `wuthering.test.ts` for the confirmed chest 8:692750121 example.
 */
export function wutheringMarkId(reward: MapReward) {
	return Math.round(reward.x * 100) + Math.round(reward.y * 100);
}

export interface WutheringComment {
	id: number;
	username: string;
	content: string;
	votes: number;
	createdAt: number;
	image: string | null;
}

const API = "https://api.wuthering.gg";
const cache = new Map<number, WutheringComment[]>();

export function wutheringImageUrl(file: string) {
	return `${API}/uploads/${file}`;
}

interface ApiComment {
	id?: unknown;
	username?: unknown;
	content?: unknown;
	votes?: unknown;
	created_date?: unknown;
	related_image?: unknown;
}

function parseComment(raw: ApiComment): WutheringComment {
	return {
		id: typeof raw.id === "number" ? raw.id : 0,
		username: typeof raw.username === "string" ? raw.username : "Anonymous",
		content: typeof raw.content === "string" ? raw.content : "",
		votes: typeof raw.votes === "number" ? raw.votes : 0,
		createdAt: typeof raw.created_date === "number" ? raw.created_date : 0,
		image:
			typeof raw.related_image === "string" && raw.related_image
				? raw.related_image
				: null,
	};
}

export type WutheringComments =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; comments: WutheringComment[] };

/** Community notes for one placement, fetched lazily and cached per mark id. */
export function useWutheringComments(reward: MapReward | null) {
	const markId = reward ? wutheringMarkId(reward) : null;
	const [state, setState] = useState<WutheringComments>({ status: "idle" });
	const [attempt, setAttempt] = useState(0);
	useEffect(() => {
		if (markId === null) {
			setState({ status: "idle" });
			return;
		}
		const cached = cache.get(markId);
		if (cached) {
			setState({ status: "ready", comments: cached });
			return;
		}
		const abort = new AbortController();
		setState({ status: "loading" });
		fetch(`${API}/comments/${markId}`, {
			signal: abort.signal,
			cache: attempt > 0 ? "reload" : "default",
		})
			.then((response) => {
				if (!response.ok) throw new Error(String(response.status));
				return response.json() as Promise<ApiComment[]>;
			})
			.then((data) => {
				if (abort.signal.aborted) return;
				const comments = (Array.isArray(data) ? data : []).map(parseComment);
				cache.set(markId, comments);
				setState({ status: "ready", comments });
			})
			.catch(() => {
				if (!abort.signal.aborted) setState({ status: "error" });
			});
		return () => abort.abort();
	}, [markId, attempt]);
	const retry = useCallback(() => {
		if (markId === null) return;
		cache.delete(markId);
		setAttempt((value) => value + 1);
	}, [markId]);
	return { state, retry };
}
