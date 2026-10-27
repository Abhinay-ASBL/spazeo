/**
 * Persistent browser deviceId (UUID v4).
 * Triple-write: cookie `spz_did`, localStorage `spz_did`, IndexedDB `spazeo`/`deviceId`.
 * Call ONLY after analytics consent — never before.
 */

const COOKIE_KEY = 'spz_did'
const LS_KEY = 'spz_did'
const IDB_NAME = 'spazeo'
const IDB_STORE = 'kv'
const IDB_KEY = 'deviceId'
const MAX_AGE_DAYS = 400
const MAX_AGE_SEC = MAX_AGE_DAYS * 24 * 60 * 60

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(name: string, value: string): void {
  if (!isBrowser()) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE_SEC}; Path=/; SameSite=Lax${secure}`
}

function readLocalStorage(): string | null {
  if (!isBrowser()) return null
  try {
    return localStorage.getItem(LS_KEY)
  } catch {
    return null
  }
}

function writeLocalStorage(id: string): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(LS_KEY, id)
  } catch {
    /* private mode / quota */
  }
}

function openIdb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE)
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

async function readIdb(): Promise<string | null> {
  const db = await openIdb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const store = tx.objectStore(IDB_STORE)
      const req = store.get(IDB_KEY)
      req.onsuccess = () => {
        const v = req.result
        resolve(typeof v === 'string' ? v : null)
        db.close()
      }
      req.onerror = () => {
        resolve(null)
        db.close()
      }
    } catch {
      resolve(null)
      try {
        db.close()
      } catch {
        /* ignore */
      }
    }
  })
}

async function writeIdb(id: string): Promise<void> {
  const db = await openIdb()
  if (!db) return
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(id, IDB_KEY)
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => {
        db.close()
        resolve()
      }
    } catch {
      try {
        db.close()
      } catch {
        /* ignore */
      }
      resolve()
    }
  })
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

/** Read from whichever store survives; create + triple-write if missing. */
export async function getOrCreateDeviceId(): Promise<string> {
  const fromCookie = readCookie(COOKIE_KEY)
  const fromLs = readLocalStorage()
  const fromIdb = await readIdb()

  const existing = [fromCookie, fromLs, fromIdb].find((v) => v && isUuid(v))
  const id = existing ?? crypto.randomUUID()

  // Heal any missing stores so all three stay in sync
  writeCookie(COOKIE_KEY, id)
  writeLocalStorage(id)
  await writeIdb(id)

  return id
}
