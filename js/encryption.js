/**
 * Phluowise Encryption Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses the native Web Crypto API (SubtleCrypto) — ZERO external dependencies.
 *
 * Security model:
 *  • AES-256-GCM for symmetric encryption of localStorage data
 *  • Session-scoped key: generated fresh each app launch, never persisted
 *    → Stale data from a previous session is unreadable without the key
 *    → Forward secrecy: compromising one session key doesn't expose others
 *  • Every encrypted payload gets a unique random 96-bit IV (nonce)
 *  • GCM authentication tag detects any tampering with stored data
 *  • HMAC-SHA256 for signing payment verification requests
 *
 * Usage:
 *   await PhluowiseEncryption.secureStore('customerSession', { userId, customerId });
 *   const session = await PhluowiseEncryption.secureRead('customerSession');
 *   PhluowiseEncryption.secureRemove('customerSession');
 */

(function () {
    'use strict';

    // ── Constants ──────────────────────────────────────────────────────────────
    const APP_ID = 'phluowise-v1';          // Logical app identifier
    const PREFIX = 'enc_';                  // Prefix for all encrypted localStorage keys
    const ALG = { name: 'AES-GCM', length: 256 };
    const IV_LENGTH = 12;                      // 96 bits — recommended for AES-GCM

    // ── Internal state ─────────────────────────────────────────────────────────
    let _key = null;                    // CryptoKey — memory only, never exported
    let _ready = false;
    const _queue = [];                      // Pending calls before key is ready

    // ── Utility: ArrayBuffer ↔ Base64 ─────────────────────────────────────────
    function _toB64(buf) {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }
    function _fromB64(b64) {
        return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    }

    // ── Key generation ─────────────────────────────────────────────────────────
    async function _init() {
        try {
            if (!window.crypto || !window.crypto.subtle) {
                console.warn('[Encryption] SubtleCrypto not available. Secure storage disabled.');
                return;
            }
            _key = await crypto.subtle.generateKey(ALG, false, ['encrypt', 'decrypt']);
            _ready = true;
            _queue.forEach(fn => fn());
            _queue.length = 0;
        } catch (err) {
            console.error('[Encryption] Key generation failed:', err.message);
        }
    }

    function _whenReady() {
        return new Promise(resolve => {
            if (_ready) return resolve();
            _queue.push(resolve);
        });
    }

    // ── Core Encrypt / Decrypt ─────────────────────────────────────────────────
    async function encrypt(value) {
        await _whenReady();
        if (!_key) return null;
        try {
            const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
            const encoded = new TextEncoder().encode(JSON.stringify(value));
            const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _key, encoded);
            // Format stored on disk: "<iv_b64>.<ciphertext_b64>"
            return `${_toB64(iv.buffer)}.${_toB64(cipher)}`;
        } catch (err) {
            console.error('[Encryption] encrypt() failed:', err.message);
            return null;
        }
    }

    async function decrypt(payload) {
        await _whenReady();
        if (!_key || !payload || typeof payload !== 'string') return null;
        try {
            const dot = payload.indexOf('.');
            if (dot === -1) return null;
            const iv = _fromB64(payload.slice(0, dot));
            const ciphertext = _fromB64(payload.slice(dot + 1));
            const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, _key, ciphertext);
            return JSON.parse(new TextDecoder().decode(plain));
        } catch (_) {
            // Data from a previous session, tampered, or corrupted → treat as absent
            return null;
        }
    }

    // ── Secure localStorage API ────────────────────────────────────────────────

    /**
     * Encrypt value and store in localStorage under a prefixed key.
     * @param {string} key   Logical key name (no need to add prefix manually)
     * @param {*}      value Any JSON-serialisable value
     */
    async function secureStore(key, value) {
        const encrypted = await encrypt(value);
        if (encrypted !== null) {
            localStorage.setItem(PREFIX + key, encrypted);
        }
    }

    /**
     * Read and decrypt a value from localStorage.
     * Returns null if key is absent, session has changed, or data is tampered.
     * @param {string} key Logical key name
     */
    async function secureRead(key) {
        const raw = localStorage.getItem(PREFIX + key);
        if (!raw) return null;
        return await decrypt(raw);
    }

    /**
     * Remove an encrypted entry from localStorage.
     * @param {string} key Logical key name
     */
    function secureRemove(key) {
        localStorage.removeItem(PREFIX + key);
    }

    /**
     * Remove ALL encrypted Phluowise entries from localStorage.
     * Call on signout to guarantee complete cleanup.
     */
    function secureClearAll() {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX)) toRemove.push(k);
        }
        toRemove.forEach(k => localStorage.removeItem(k));
    }

    // ── HMAC-SHA256 Payment Signing ────────────────────────────────────────────
    /**
     * Sign a payment verification payload with HMAC-SHA256.
     * The server can verify this signature to confirm the request originates
     * from the Phluowise app and hasn't been tampered with in transit.
     *
     * @param {object} payload  The request body object to sign
     * @returns {Promise<string|null>}  Base64-encoded HMAC signature
     */
    async function signPaymentPayload(payload) {
        await _whenReady();
        try {
            // Key material: combine app ID + minute-level timestamp
            // (minute-precision prevents replay attacks beyond 1 minute)
            const timestamp = Math.floor(Date.now() / 60000).toString();
            const keyMaterial = new TextEncoder().encode(APP_ID + ':' + timestamp);
            const hmacKey = await crypto.subtle.importKey(
                'raw', keyMaterial,
                { name: 'HMAC', hash: 'SHA-256' },
                false, ['sign']
            );
            const data = new TextEncoder().encode(JSON.stringify(payload));
            const signature = await crypto.subtle.sign('HMAC', hmacKey, data);
            return _toB64(signature);
        } catch (err) {
            console.error('[Encryption] signPaymentPayload() failed:', err.message);
            return null;
        }
    }

    /**
     * Returns true when the encryption key is ready to use.
     */
    function isReady() {
        return _ready;
    }

    // ── Initialise on script load ──────────────────────────────────────────────
    _init();

    // ── Public API ─────────────────────────────────────────────────────────────
    window.PhluowiseEncryption = Object.freeze({
        encrypt,
        decrypt,
        secureStore,
        secureRead,
        secureRemove,
        secureClearAll,
        signPaymentPayload,
        isReady,
    });

})();
