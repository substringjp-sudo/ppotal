/**
 * Relevance ordering for station and line name search.
 *
 * Plain substring matching returns whatever the underlying object happened to
 * iterate first, so searching "Tokyo" led with "Tokyo International Cruise
 * Terminal" rather than 東京.
 */

export interface NamedRecord {
    name: string;
    name_en?: string;
    name_kr?: string;
}

/** Lower is better: an exact hit beats a prefix, which beats a substring. */
export function nameMatchRank(item: NamedRecord, query: string): number {
    const names = [item.name, item.name_en, item.name_kr]
        .filter((value): value is string => Boolean(value))
        .map(value => value.toLowerCase());

    let best = Infinity;
    for (const name of names) {
        if (name === query) return 0;
        if (name.startsWith(query)) best = Math.min(best, 1);
        else if (name.includes(query)) best = Math.min(best, 2);
    }
    return best;
}

/**
 * Matching records, best first. Ties break on the shorter name, which keeps the
 * plain station ahead of every compound that contains it.
 */
export function rankByRelevance<T extends NamedRecord>(
    items: Iterable<T>,
    query: string,
    limit?: number
): T[] {
    const normalised = query.toLowerCase().trim();
    if (!normalised) return [];

    const scored: { item: T; rank: number }[] = [];
    for (const item of items) {
        const rank = nameMatchRank(item, normalised);
        if (rank !== Infinity) scored.push({ item, rank });
    }

    scored.sort((a, b) => a.rank - b.rank || a.item.name.length - b.item.name.length);
    const ordered = scored.map(entry => entry.item);
    return limit === undefined ? ordered : ordered.slice(0, limit);
}
