/*
 * Store an item within the portal object.
 */
export function cacheItem(description) {
    this.items.push({
        id: description.id,
        description: description
    });
}
