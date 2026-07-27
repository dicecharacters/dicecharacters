//=======================================================================
// DC Package – gemeinsame Envelope / Verifizierung für alle JSON-Pakete
// Phase A: Custom Class (+ Runtime)
// Phase B: Charakterbogen (Export/Import, Legacy ohne Envelope)
//=======================================================================

const DC_PACKAGE_APP = "DiceCharacters";
const DC_PACKAGE_FORMAT = "dc-package";
const DC_PACKAGE_SCHEMA_VERSION = 1;
const DC_PACKAGE_APP_MIN_VERSION = "1.4";

/** Bekannte Pakettypen (Upload-Kontext / Envelope) */
const DC_PACKAGE_TYPE = Object.freeze({
    CHARACTER_SHEET: "characterSheet",
    CUSTOM_CLASS: "customClass",
    CUSTOM_CLASS_RUNTIME: "customClassRuntime",
    CUSTOM_BACKGROUND: "customBackground",
    CUSTOM_SPECIES: "customSpecies",
    CUSTOM_SPELL: "customSpell",
    CUSTOM_SPELL_PACK: "customSpellPack",
    CUSTOM_FEAT: "customFeat",
    CUSTOM_SUBCLASS: "customSubclass"
});

/** Lesbares Prefix im verificationCode */
const DC_PACKAGE_CODE_PREFIX = Object.freeze({
    [DC_PACKAGE_TYPE.CHARACTER_SHEET]: "DC-CHAR",
    [DC_PACKAGE_TYPE.CUSTOM_CLASS]: "DC-CLASS",
    [DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME]: "DC-CRUN",
    [DC_PACKAGE_TYPE.CUSTOM_BACKGROUND]: "DC-BG",
    [DC_PACKAGE_TYPE.CUSTOM_SPECIES]: "DC-SPC",
    [DC_PACKAGE_TYPE.CUSTOM_SPELL]: "DC-SPL",
    [DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK]: "DC-SPK",
    [DC_PACKAGE_TYPE.CUSTOM_FEAT]: "DC-FEAT",
    [DC_PACKAGE_TYPE.CUSTOM_SUBCLASS]: "DC-SC"
});

/** Übersetzungs-Keys für Typnamen (Alerts) */
const DC_PACKAGE_TYPE_LABEL_KEY = Object.freeze({
    [DC_PACKAGE_TYPE.CHARACTER_SHEET]: "dcPackageTypeCharacterSheetLabel",
    [DC_PACKAGE_TYPE.CUSTOM_CLASS]: "dcPackageTypeCustomClassLabel",
    [DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME]: "dcPackageTypeCustomClassRuntimeLabel",
    [DC_PACKAGE_TYPE.CUSTOM_BACKGROUND]: "dcPackageTypeCustomBackgroundLabel",
    [DC_PACKAGE_TYPE.CUSTOM_SPECIES]: "dcPackageTypeCustomSpeciesLabel",
    [DC_PACKAGE_TYPE.CUSTOM_SPELL]: "dcPackageTypeCustomSpellLabel",
    [DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK]: "dcPackageTypeCustomSpellPackLabel",
    [DC_PACKAGE_TYPE.CUSTOM_FEAT]: "dcPackageTypeCustomFeatLabel",
    [DC_PACKAGE_TYPE.CUSTOM_SUBCLASS]: "dcPackageTypeCustomSubclassLabel"
});

function tDcPackage(key, fallback, vars) {
    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    let s = fallback || key;
    if (typeof translations !== "undefined" && translations[lang] && translations[lang][key] != null) {
        s = translations[lang][key];
    }
    if (vars && typeof vars === "object") {
        Object.keys(vars).forEach(k => {
            s = String(s).split(`{${k}}`).join(String(vars[k]));
        });
    }
    return s;
}

function getDcPackageTypeLabel(packageType) {
    if (!packageType) {
        return tDcPackage("dcPackageTypeUnknownLabel", "unbekannt");
    }
    const key = DC_PACKAGE_TYPE_LABEL_KEY[packageType];
    return key
        ? tDcPackage(key, packageType)
        : String(packageType);
}

/** UUID v4 (crypto wenn verfügbar) */
function createDcPackageId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // Fallback ohne crypto.randomUUID
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function normalizeDcPackageId(packageId) {
    const s = String(packageId || "").trim();
    return s || null;
}

/** verificationCode: DC-CLASS-550E8400 (Prefix + erste UUID-Gruppe, upper) */
function buildDcVerificationCode(packageType, packageId) {
    const prefix = DC_PACKAGE_CODE_PREFIX[packageType] || "DC-PKG";
    const id = normalizeDcPackageId(packageId) || "00000000";
    const head = id.replace(/-/g, "").slice(0, 8).toUpperCase() || "00000000";
    return `${prefix}-${head}`;
}

function isDcJsonFilename(fileName) {
    return /\.json$/i.test(String(fileName || ""));
}

/**
 * Baut den dc-Envelope-Block (ohne payload).
 * @param {object} opts
 */
function buildDcEnvelope(opts) {
    const packageType = opts.packageType;
    const packageId = normalizeDcPackageId(opts.packageId) || createDcPackageId();
    const now = opts.updatedAt || new Date().toISOString();
    return {
        app: DC_PACKAGE_APP,
        format: DC_PACKAGE_FORMAT,
        schemaVersion: opts.schemaVersion != null ? opts.schemaVersion : DC_PACKAGE_SCHEMA_VERSION,
        packageType,
        packageId,
        verificationCode: opts.verificationCode || buildDcVerificationCode(packageType, packageId),
        createdAt: opts.createdAt || now,
        updatedAt: now,
        appMinVersion: opts.appMinVersion || DC_PACKAGE_APP_MIN_VERSION,
        provides: Array.isArray(opts.provides) ? opts.provides : [],
        dependencies: Array.isArray(opts.dependencies) ? opts.dependencies : []
    };
}

/**
 * Vollständiges DC-Paket: { dc, payload }
 */
function wrapDcPackage(opts) {
    const envelope = buildDcEnvelope(opts);
    return {
        dc: envelope,
        payload: opts.payload != null ? opts.payload : {}
    };
}

/**
 * Legacy-Typ aus Rohdaten erkennen (ohne Envelope).
 * @returns {string|null} packageType
 */
function detectLegacyDcPackageType(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (raw.meta && raw.meta.app === DC_PACKAGE_APP) {
        return DC_PACKAGE_TYPE.CHARACTER_SHEET;
    }
    if (raw.type === "customClass" && raw.coreTraits) {
        return DC_PACKAGE_TYPE.CUSTOM_CLASS;
    }
    if (raw.type === "customClassRuntime" && raw.slug) {
        return DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME;
    }
    if (typeof raw.type === "string" && Object.values(DC_PACKAGE_TYPE).includes(raw.type)) {
        return raw.type;
    }
    return null;
}

/**
 * Roh-JSON → Envelope + Payload normalisieren (neu oder Legacy).
 * @returns {{ ok: boolean, errorCode?: string, envelope?: object|null, payload?: object, detectedType?: string|null, legacy?: boolean }}
 */
function normalizeDcPackageInput(raw) {
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
        return { ok: false, errorCode: "notObject" };
    }

    // Neu: { dc, payload }
    if (raw.dc && raw.dc.format === DC_PACKAGE_FORMAT && raw.payload && typeof raw.payload === "object") {
        const packageType = raw.dc.packageType || detectLegacyDcPackageType(raw.payload);
        return {
            ok: true,
            envelope: raw.dc,
            payload: raw.payload,
            detectedType: packageType || null,
            legacy: false
        };
    }

    // Neu flach: dc + Fachfelder oben (Fallback)
    if (raw.dc && raw.dc.format === DC_PACKAGE_FORMAT && (raw.coreTraits || raw.type || raw.meta)) {
        const { dc, ...rest } = raw;
        const packageType = dc.packageType || detectLegacyDcPackageType(rest);
        return {
            ok: true,
            envelope: dc,
            payload: rest,
            detectedType: packageType || null,
            legacy: false
        };
    }

    const legacyType = detectLegacyDcPackageType(raw);
    if (legacyType) {
        return {
            ok: true,
            envelope: null,
            payload: raw,
            detectedType: legacyType,
            legacy: true
        };
    }

    return { ok: false, errorCode: "unknownFormat" };
}

/**
 * Payload-Mindestprüfung je Typ (Custom Class / Runtime / Charakterbogen).
 */
function validateDcPackagePayload(packageType, payload) {
    if (!payload || typeof payload !== "object") {
        return { ok: false, errorCode: "invalidPayload" };
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS) {
        if (!payload.coreTraits || typeof payload.coreTraits !== "object") {
            return { ok: false, errorCode: "invalidCustomClass" };
        }
        return { ok: true };
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        if (!payload.slug || !payload.coreTraits) {
            return { ok: false, errorCode: "invalidCustomClassRuntime" };
        }
        return { ok: true };
    }
    if (packageType === DC_PACKAGE_TYPE.CHARACTER_SHEET) {
        // Legacy + neu: meta.app + base-Objekt (overrides optional)
        if (!payload.meta || payload.meta.app !== DC_PACKAGE_APP) {
            return { ok: false, errorCode: "invalidCharacterSheet" };
        }
        if (!payload.base || typeof payload.base !== "object") {
            return { ok: false, errorCode: "invalidCharacterSheet" };
        }
        return { ok: true };
    }
    // Weitere Typen: vorerst nur „bekannt“
    return { ok: true };
}

/**
 * Zentrale Validierung für Upload-Kontexte.
 * @param {*} raw – geparstes JSON
 * @param {{ expectedType?: string|string[] }} options
 * @returns {{ ok: boolean, errorCode?: string, message?: string, envelope?: object|null, payload?: object, detectedType?: string|null, legacy?: boolean }}
 */
function validateDcPackage(raw, options) {
    const opts = options || {};
    const normalized = normalizeDcPackageInput(raw);
    if (!normalized.ok) {
        const message = alertMessageForDcPackageError(normalized.errorCode);
        return { ok: false, errorCode: normalized.errorCode, message };
    }

    const detectedType = normalized.detectedType;
    const expected = opts.expectedType;
    if (expected) {
        const allowed = Array.isArray(expected) ? expected : [expected];
        if (!detectedType || !allowed.includes(detectedType)) {
            const message = alertMessageForDcPackageError("wrongType", {
                expected: allowed.map(getDcPackageTypeLabel).join(" / "),
                found: getDcPackageTypeLabel(detectedType)
            });
            return {
                ok: false,
                errorCode: "wrongType",
                message,
                envelope: normalized.envelope,
                payload: normalized.payload,
                detectedType,
                legacy: normalized.legacy
            };
        }
    }

    if (normalized.envelope && Number(normalized.envelope.schemaVersion) > DC_PACKAGE_SCHEMA_VERSION) {
        const message = alertMessageForDcPackageError("schemaTooNew");
        return {
            ok: false,
            errorCode: "schemaTooNew",
            message,
            envelope: normalized.envelope,
            payload: normalized.payload,
            detectedType,
            legacy: normalized.legacy
        };
    }

    // verificationCode bei neuer Envelope nur soft prüfen (korrigierbar)
    if (normalized.envelope && detectedType && normalized.envelope.packageId) {
        const expectedCode = buildDcVerificationCode(detectedType, normalized.envelope.packageId);
        if (normalized.envelope.verificationCode
            && String(normalized.envelope.verificationCode).toUpperCase() !== expectedCode) {
            // Nicht abbrechen – Code beim nächsten Speichern neu setzen
            console.warn("dcPackage: verificationCode weicht ab, erwartet", expectedCode);
        }
    }

    const payloadCheck = validateDcPackagePayload(detectedType, normalized.payload);
    if (!payloadCheck.ok) {
        const message = alertMessageForDcPackageError(payloadCheck.errorCode);
        return {
            ok: false,
            errorCode: payloadCheck.errorCode,
            message,
            envelope: normalized.envelope,
            payload: normalized.payload,
            detectedType,
            legacy: normalized.legacy
        };
    }

    return {
        ok: true,
        envelope: normalized.envelope,
        payload: normalized.payload,
        detectedType,
        legacy: !!normalized.legacy
    };
}

function alertMessageForDcPackageError(errorCode, vars) {
    const map = {
        notJsonFile: ["dcPackageNotJsonFileLabel", "Bitte eine .json-Datei wählen."],
        parseError: ["dcPackageParseErrorLabel", "Die Datei ist kein gültiges JSON."],
        notObject: ["dcPackageNotObjectLabel", "Die JSON-Datei hat ein ungültiges Format."],
        unknownFormat: ["dcPackageUnknownFormatLabel", "Unbekanntes DiceCharacters-Dateiformat."],
        wrongType: [
            "dcPackageWrongTypeLabel",
            "Falscher Dateityp. Erwartet: {expected}. Gefunden: {found}."
        ],
        schemaTooNew: [
            "dcPackageSchemaTooNewLabel",
            "Diese Datei wurde mit einer neueren App-Version gespeichert und kann hier nicht geladen werden."
        ],
        invalidPayload: ["dcPackageInvalidPayloadLabel", "Der Dateiinhalt ist unvollständig oder ungültig."],
        invalidCustomClass: [
            "dcPackageInvalidCustomClassLabel",
            "Die Datei ist keine gültige Custom-Klasse (Kernmerkmale fehlen)."
        ],
        invalidCustomClassRuntime: [
            "dcPackageInvalidCustomClassRuntimeLabel",
            "Die Custom-Klassen-Runtime-Daten sind ungültig."
        ],
        invalidCharacterSheet: [
            "dcPackageInvalidCharacterSheetLabel",
            "Die Datei ist kein gültiger Charakterbogen."
        ]
    };
    const entry = map[errorCode] || ["customClassImportErrorLabel", "Die Datei konnte nicht gelesen werden oder ist ungültig."];
    return tDcPackage(entry[0], entry[1], vars);
}

/**
 * Datei-Vorprüfung (Name) + Parse + validateDcPackage.
 * @returns {Promise<object>} validateDcPackage-Ergebnis (+ parse errors)
 */
function readAndValidateDcPackageFile(file, options) {
    return new Promise(resolve => {
        if (!file) {
            resolve({
                ok: false,
                errorCode: "notJsonFile",
                message: alertMessageForDcPackageError("notJsonFile")
            });
            return;
        }
        if (!isDcJsonFilename(file.name)) {
            resolve({
                ok: false,
                errorCode: "notJsonFile",
                message: alertMessageForDcPackageError("notJsonFile")
            });
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            let raw;
            try {
                raw = JSON.parse(e.target.result);
            } catch (err) {
                resolve({
                    ok: false,
                    errorCode: "parseError",
                    message: alertMessageForDcPackageError("parseError")
                });
                return;
            }
            resolve(validateDcPackage(raw, options));
        };
        reader.onerror = function () {
            resolve({
                ok: false,
                errorCode: "parseError",
                message: alertMessageForDcPackageError("parseError")
            });
        };
        reader.readAsText(file);
    });
}

/** provides[] für Custom-Klasse aus Editor-State / Payload */
function buildCustomClassProvides(state, slug) {
    const provides = [];
    if (slug) {
        provides.push({
            kind: "class",
            slug: String(slug),
            labelKey: `${slug}Label`
        });
    }
    (state?.subclasses || []).forEach((sc, idx) => {
        const scSlug = sc?.slug || sc?.id || `subclass_${idx + 1}`;
        provides.push({
            kind: "subclass",
            slug: String(scSlug),
            parentSlug: slug ? String(slug) : undefined,
            index: idx + 1
        });
    });
    return provides;
}

/**
 * Flaches Custom-Class-Payload + Envelope → wrapDcPackage.
 * Behält packageId/createdAt aus state bzw. vorheriger Envelope.
 */
function wrapCustomClassExport(state, flatPayload) {
    const packageId = normalizeDcPackageId(state.packageId) || createDcPackageId();
    const slug = flatPayload?.coreTraits?.translationLabel || state.slug || null;
    return wrapDcPackage({
        packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        packageId,
        createdAt: state.packageCreatedAt || undefined,
        provides: buildCustomClassProvides(state, slug),
        dependencies: [],
        payload: flatPayload
    });
}

/**
 * Runtime-Persistenz mit Envelope; hängt an Klassen-packageId.
 */
function wrapCustomClassRuntimeExport(flatRuntime, classMeta) {
    const classPackageId = normalizeDcPackageId(classMeta?.packageId);
    const packageId = normalizeDcPackageId(classMeta?.runtimePackageId) || createDcPackageId();
    const dependencies = classPackageId
        ? [{
            packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
            packageId: classPackageId,
            slug: flatRuntime?.slug || classMeta?.slug || undefined,
            required: true
        }]
        : [];
    const provides = flatRuntime?.slug
        ? [{ kind: "classRuntime", slug: String(flatRuntime.slug) }]
        : [];
    return wrapDcPackage({
        packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME,
        packageId,
        createdAt: classMeta?.runtimeCreatedAt || undefined,
        provides,
        dependencies,
        payload: flatRuntime
    });
}

/** LocalStorage-Keys für stabile Charakterbogen-packageId */
const DC_CHARACTER_PACKAGE_ID_KEY = "dcCharacterPackageId";
const DC_CHARACTER_PACKAGE_CREATED_KEY = "dcCharacterPackageCreatedAt";

/**
 * Dependencies aus eingebetteter customClassRuntime (Envelope oder Legacy).
 */
function buildCharacterSheetDependencies(baseStorage) {
    const deps = [];
    const raw = baseStorage && baseStorage.customClassRuntime;
    if (!raw) return deps;
    let parsed;
    try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
        return deps;
    }
    if (typeof normalizeDcPackageInput !== "function") return deps;
    const norm = normalizeDcPackageInput(parsed);
    if (!norm.ok || norm.detectedType !== DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        return deps;
    }
    const classDep = (norm.envelope?.dependencies || []).find(d =>
        d && d.packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
    );
    if (classDep && classDep.packageId) {
        deps.push({
            packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
            packageId: classDep.packageId,
            slug: classDep.slug || norm.payload?.slug || undefined,
            verificationCode: classDep.verificationCode
                || (classDep.packageId
                    ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_CLASS, classDep.packageId)
                    : undefined),
            required: true
        });
    } else if (norm.payload?.slug) {
        // Legacy-Runtime ohne Klassen-packageId
        deps.push({
            packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
            packageId: null,
            slug: String(norm.payload.slug),
            required: true
        });
    }
    return deps;
}

function buildCharacterSheetProvides(baseStorage, characterName) {
    return [{
        kind: "characterSheet",
        name: characterName || "Unnamed",
        class: baseStorage?.class || null,
        level: baseStorage?.level != null ? String(baseStorage.level) : null
    }];
}

/**
 * Flaches Charakterbogen-Payload ({ meta, base, overrides }) → DC-Paket.
 */
function wrapCharacterSheetExport(flatPayload, meta) {
    const packageId = normalizeDcPackageId(meta?.packageId) || createDcPackageId();
    const name = meta?.characterName
        || flatPayload?.base?.characterName
        || "Unnamed";
    return wrapDcPackage({
        packageType: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        packageId,
        createdAt: meta?.packageCreatedAt || undefined,
        provides: buildCharacterSheetProvides(flatPayload?.base || {}, name),
        dependencies: buildCharacterSheetDependencies(flatPayload?.base || {}),
        payload: flatPayload
    });
}
