export interface CachedAsset {
  index: number
  name: string
  unitName: string
  decimals: number
  peraVerified: boolean
}

const DB_NAME = 'walletUiAssets'
const ASSETS_STORE = 'assets'
const META_STORE = 'meta'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        db.createObjectStore(ASSETS_STORE, { keyPath: 'index' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

// Debounced batch insert
let pendingAssets: CachedAsset[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushResolvers: Array<{ resolve: () => void; reject: (err: unknown) => void }> = []

function flush(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (pendingAssets.length === 0) {
      resolve()
      return
    }

    const batch = pendingAssets.slice()
    const resolvers = flushResolvers.slice()
    pendingAssets = []
    flushResolvers = []

    open()
      .then((db) => {
        const tx = db.transaction(ASSETS_STORE, 'readwrite')
        const store = tx.objectStore(ASSETS_STORE)

        for (const asset of batch) {
          store.put(asset)
        }

        tx.oncomplete = () => {
          for (const r of resolvers) r.resolve()
          resolve()
        }
        tx.onerror = () => {
          const err = tx.error
          for (const r of resolvers) r.reject(err)
          reject(err)
        }
      })
      .catch((err) => {
        for (const r of resolvers) r.reject(err)
        reject(err)
      })
  })
}

function insertMany(assets: CachedAsset[]): Promise<void> {
  return new Promise((resolve, reject) => {
    pendingAssets.push(...assets)
    flushResolvers.push({ resolve, reject })

    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => {
      flushTimer = null
      flush()
    }, 500)
  })
}

function searchByName(query: string, limit = 20): Promise<CachedAsset[]> {
  const q = query.toLowerCase()
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(ASSETS_STORE, 'readonly')
        const store = tx.objectStore(ASSETS_STORE)
        const request = store.openCursor()
        const results: CachedAsset[] = []

        request.onsuccess = () => {
          const cursor = request.result
          if (!cursor || results.length >= limit) {
            resolve(results)
            return
          }
          const asset = cursor.value as CachedAsset
          if ((asset.name ?? '').toLowerCase().includes(q) || (asset.unitName ?? '').toLowerCase().includes(q)) {
            results.push(asset)
          }
          cursor.continue()
        }

        request.onerror = () => reject(request.error)
      }),
  )
}

function getLastUpdated(): Promise<number | null> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readonly')
        const request = tx.objectStore(META_STORE).get('lastUpdated')
        request.onsuccess = () => resolve((request.result as number) ?? null)
        request.onerror = () => reject(request.error)
      }),
  )
}

function setLastUpdated(timestamp: number): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite')
        tx.objectStore(META_STORE).put(timestamp, 'lastUpdated')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function clear(): Promise<void> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction([ASSETS_STORE, META_STORE], 'readwrite')
        tx.objectStore(ASSETS_STORE).clear()
        tx.objectStore(META_STORE).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function getById(id: number): Promise<CachedAsset | null> {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(ASSETS_STORE, 'readonly')
        const request = tx.objectStore(ASSETS_STORE).get(id)
        request.onsuccess = () => resolve((request.result as CachedAsset) ?? null)
        request.onerror = () => reject(request.error)
      }),
  )
}

export const AssetCache = {
  open,
  insertMany,
  searchByName,
  getById,
  getLastUpdated,
  setLastUpdated,
  clear,
}
