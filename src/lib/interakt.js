/**
 * Thin client for Interakt's public APIs.
 *
 * We use two endpoints:
 *   - Track User: registers/updates the phone as a contact. Interakt
 *     requires the number to be a contact before we can template it.
 *   - Send Template Message: fires the approved OTP template.
 *
 * All calls need the API key in the Authorization header. Never call these
 * from client components — the key must not reach the browser.
 */

const BASE_URL = "https://api.interakt.ai/v1/public";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * India only for now.
 *
 * Splits "+919999999999" into { countryCode: "+91", phoneNumber: "9999999999" }
 * for Interakt's payload shape.
 *
 * Numbers reach here already normalized and validated by isValidPhone, so a
 * mismatch means a bug rather than bad user input — hence the throw. It also
 * guards the failure that made OTP never work: an earlier width-based guess
 * split "+919999900009" into country code "+9199", which Interakt rejects
 * with "Country code is invalid".
 */
function splitPhone(fullPhone) {
  const trimmed = String(fullPhone ?? "").trim();
  const withPlus = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;

  const cc = process.env.OTP_PHONE_DEFAULT_CC || "+91";
  const rest = withPlus.startsWith(cc) ? withPlus.slice(cc.length) : "";

  if (!/^\d{10}$/.test(rest)) {
    throw new Error(`Unsupported phone number for ${cc}: ${withPlus}`);
  }

  return { countryCode: cc, phoneNumber: rest };
}

async function post(path, payload) {
  const apiKey = requireEnv("INTERAKT_API_KEY");

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify(payload),
    // Never cache POSTs.
    cache: "no-store",
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(`Interakt ${path} failed: ${message}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

/**
 * Upserts a contact in Interakt so we can template them.
 * Called before every send — Interakt de-dupes by phone, so it's safe to
 * call repeatedly.
 */
export async function trackUser(fullPhone) {
  const { countryCode, phoneNumber } = splitPhone(fullPhone);

  return post("/track/users/", {
    countryCode,
    phoneNumber,
    traits: {},
    tags: ["checkout-otp"],
  });
}

/**
 * Sends an approved WhatsApp template with a single body variable.
 * For our OTP template, that variable is the 6-digit code.
 */
export async function sendTemplateMessage(fullPhone, bodyValue) {
  const { countryCode, phoneNumber } = splitPhone(fullPhone);
  const templateName = requireEnv("INTERAKT_TEMPLATE_NAME");
  const languageCode = process.env.INTERAKT_TEMPLATE_LANG || "en";

  return post("/message/", {
    countryCode,
    phoneNumber,
    type: "Template",
    template: {
      name: templateName,
      languageCode,
      bodyValues: [String(bodyValue)],
      // WhatsApp OTP templates require the code to be echoed as the button
      // sub-parameter too, so the "Copy code" button carries the same value.
      buttonValues: {
        "0": [String(bodyValue)],
      },
    },
  });
}
