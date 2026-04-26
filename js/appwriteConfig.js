// Appwrite Configuration
// NOTE: Project & Database IDs are required in the client SDK for WebView/PWA apps.
// Security is enforced via Appwrite Collection-Level Permissions (not by hiding these IDs).
// Ensure every collection uses role-based permissions: user:<id> — never "any" for writes.

if (typeof Appwrite === "undefined") {
  console.error("Appwrite SDK not loaded!");
} else {
  const { ID, Query, Client } = Appwrite;

  const client = new Client()
    .setEndpoint("https://nyc.cloud.appwrite.io/v1")
    .setProject("695f826500067c381616");

  const account = new Appwrite.Account(client);
  const databases = new Appwrite.Databases(client);
  const storage = new Appwrite.Storage(client);
  const functions = new Appwrite.Functions(client);

  const appwriteConfig = {
    DATABASE_ID: "68b1b7590035346a3be9",
    CUSTOMER_TABLE: "customer_tb",
    COMPANY_TABLE: "company_tb",
    BRANCHES_TABLE: "branches",
    WORKING_DAYS_TABLE: "working_days",
    PRODUCTS_TABLE: "product",
    SOCIAL_MEDIA_TABLE: "social_media",
    RATINGS_TABLE: "ratings",
    ORDERS_TABLE: "orders",
    ORDER_ITEMS_TABLE: "order_items",
    PURCHASE_RECIPIENT_TABLE: "purchase_recipient_info",
    COMPANY_VERIFICATION_TABLE: "company_verification",
    RETURN_PICKUPS_TABLE: "return_pickups",
    // Community Collections
    COMMUNITY_REQUESTS_TABLE: "community_requests",
    COMMUNITY_VOTES_TABLE: "community_votes",
    COMMUNITY_COMMENTS_TABLE: "community_comments",
    COMMUNITY_COMMENT_VOTES_TABLE: "community_comment_votes",
    STORAGE_BUCKET_ID: "695fec72003b8ba4fb22",
    PROJECT_ID: "695f826500067c381616",
    BUCKETS: {
      PRODUCTS: "695fec72003b8ba4fb22",
      RECEIPTS: "695fec72003b8ba4fb22",
    },
    FUNCTIONS: {
      SEND_RECEIPT_EMAIL: "69d9b1f200018684524b",
    },
    // PAYSTACK: public key centralised here. Rotate in ONE place only.
    // The secret key (sk_live_...) must NEVER appear in client code — use an Appwrite Function.
    PAYSTACK_PUBLIC_KEY: "pk_live_00d41944ffac0707f49b240150e55474e2a5c06e",
    client,
    account,
    databases,
    storage,
    functions,
    ID,
    Query,
  };

  // Make variables globally accessible
  window.appwriteConfig = appwriteConfig;
  window.account = account;
  window.databases = databases;
  window.storage = storage;
  window.functions = functions;
  window.ID = ID;
  window.Query = Query;
  window.client = client;
}

// ─── SECURITY: XSS Prevention ────────────────────────────────────────────────
// Always use sanitize() when inserting any external data into innerHTML.
window.sanitize = function (str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ─── SECURITY: Production Log Guard ──────────────────────────────────────────
// Sensitive data must never appear in production console output.
// Add ?debug=1 to the URL to re-enable logs during local testing only.
(function () {
  const _isDev = window.location.search.includes('debug=1');
  window.devLog = function (...args) { if (_isDev) console.log(...args); };
  window.devWarn = function (...args) { if (_isDev) console.warn(...args); };
  window.devErr = function (...args) { if (_isDev) console.error(...args); };
})();
