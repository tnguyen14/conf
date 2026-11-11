// Client for the lists API (github.com/tnguyen14/lists), scoped to one list.
export const LISTS_API = "https://lists.cloud.tridnguyen.com";

export class ListsError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Items are stored whole: putItems() replaces each item with the given id,
 * creating it if needed.
 */
export function createListClient({ type, name, getToken }) {
  const base = `${LISTS_API}/${encodeURIComponent(type)}/${encodeURIComponent(name)}`;
  async function request(method, path, body) {
    const token = await getToken();
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new ListsError(`${method} ${path}: network error`, 0);
    }
    if (!res.ok) {
      throw new ListsError(`${method} ${path}: HTTP ${res.status}`, res.status);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }
  return {
    getItems: () => request("GET", "/items"),
    putItems: (items) => request("POST", "/items/bulk", items),
    deleteItem: (id) => request("DELETE", `/items/${encodeURIComponent(id)}`),
  };
}
