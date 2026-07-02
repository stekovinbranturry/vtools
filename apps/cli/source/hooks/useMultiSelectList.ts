import {useEffect, useState, type Dispatch, type SetStateAction} from 'react';
import {useInput} from 'ink';

type Options<T, K extends string> = {
	/** Items to choose from (only the selectable ones). */
	items: T[];
	/** Stable key for an item; also used as the selected-set member. */
	getKey: (item: T) => K;
	/** Selection state owned by the parent (often seeded after async load). */
	setSelected: Dispatch<SetStateAction<Set<K>>>;
	/** Enter pressed (parent decides next step / submit). */
	onSubmit: () => void;
	/** Esc pressed (parent decides back / skip). */
	onCancel: () => void;
	/** Capture keyboard input only while true. */
	isActive?: boolean;
	/** Max rows to render at once; omit to render all items (no windowing). */
	visibleCount?: number;
};

export type MultiSelectListState<T> = {
	cursorIndex: number;
	scrollOffset: number;
	/** The currently visible slice of items (respects windowing). */
	windowed: T[];
	hasMoreAbove: boolean;
	hasMoreBelow: boolean;
	isCursor: (index: number) => boolean;
};

/**
 * Shared keyboard interaction for a windowed checkbox list:
 * ↑↓ move · space toggle · a toggle-all · ↵ submit · Esc cancel.
 *
 * Selection state stays in the parent so it can be seeded from async data;
 * the hook owns only the cursor/scroll position and the key bindings.
 */
export function useMultiSelectList<T, K extends string = string>({
	items,
	getKey,
	setSelected,
	onSubmit,
	onCancel,
	isActive = true,
	visibleCount,
}: Options<T, K>): MultiSelectListState<T> {
	const [cursorIndex, setCursorIndex] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);

	const total = items.length;
	const windowSize = visibleCount ?? total;

	useEffect(() => {
		setCursorIndex(previous =>
			total === 0 ? 0 : Math.min(previous, total - 1),
		);
		setScrollOffset(previous =>
			Math.min(previous, Math.max(0, total - windowSize)),
		);
	}, [total, windowSize]);

	function moveCursor(delta: number) {
		if (total === 0) {
			return;
		}

		setCursorIndex(prev => {
			const next = (prev + delta + total) % total;

			setScrollOffset(offset => {
				if (next < offset) {
					return next;
				}

				if (next >= offset + windowSize) {
					return next - windowSize + 1;
				}

				return offset;
			});

			return next;
		});
	}

	useInput(
		(input, key) => {
			if (key.upArrow) {
				moveCursor(-1);
				return;
			}

			if (key.downArrow) {
				moveCursor(1);
				return;
			}

			if (input === ' ') {
				const item = items[cursorIndex];
				if (!item) {
					return;
				}

				const itemKey = getKey(item);
				setSelected(current => {
					const next = new Set(current);
					if (next.has(itemKey)) {
						next.delete(itemKey);
					} else {
						next.add(itemKey);
					}

					return next;
				});
				return;
			}

			if (input === 'a') {
				setSelected(current =>
					current.size === total ? new Set() : new Set(items.map(getKey)),
				);
				return;
			}

			if (key.escape) {
				onCancel();
				return;
			}

			if (key.return) {
				onSubmit();
			}
		},
		{isActive},
	);

	const windowed = items.slice(scrollOffset, scrollOffset + windowSize);

	return {
		cursorIndex,
		scrollOffset,
		windowed,
		hasMoreAbove: scrollOffset > 0,
		hasMoreBelow: scrollOffset + windowSize < total,
		isCursor: (index: number) => index === cursorIndex,
	};
}
