//=======================================================================
// DC Package – gemeinsame Envelope / Verifizierung für alle JSON-Pakete
// Phase A: Custom Class (+ Runtime)
// Phase B: Charakterbogen (Export/Import, Legacy ohne Envelope)
// Abhängigkeiten: DC_PACKAGE_DEPENDENCY_EDGES (kanonisch für Ersteller + Bogen)
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
    CUSTOM_FEAT_PACK: "customFeatPack",
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
    [DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK]: "DC-FTP",
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
    [DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK]: "dcPackageTypeCustomFeatPackLabel",
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

//=======================================================================
// Paket-Abhängigkeiten (kanonisch – Ersteller + Charakterbogen)
//=======================================================================
// Richtung: from → to  bedeutet: Paket „from“ braucht bei Upload/Hydrate
// das Paket „to“ (Envelope.dependencies).
//
// status: "active" = zur Laufzeit genutzt; "prepared" = Schema für spätere Builder.
//
// Zauberbibliothek (techn. customSpellPack): Blatt, keine Deps nach oben.
// Class/UC/BG verknüpfen die Bib **nicht** — nur der Charakterbogen fordert sie,
// wenn Custom-Zauber gewählt wurden.
//=======================================================================

/**
 * Deklarative Abhängigkeitskanten zwischen DC_PACKAGE_TYPE-Werten.
 * Erweiterbar: neue Builder nur als Kante + status ergänzen.
 *
 * @typedef {{ from: string, to: string, status: "active"|"prepared", when: string }} DcPackageDependencyEdge
 */
const DC_PACKAGE_DEPENDENCY_EDGES = Object.freeze([
    // --- Obere Ebenen → Zauberbibliothek (Bibliothek ist Blatt; Class/UC nicht verknüpft) ---
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Obsolet: Bib ist listenunabhängig; nur Charakterbogen fordert Bib bei gewählten Custom-Zaubern."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Obsolet: Class-Runtime deklariert keine Bib-Deps mehr."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Standalone-UC referenziert Bibliotheks-Zauber (später)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_FEAT,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Custom-Talent referenziert Bibliotheks-Zauber (später)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_SPECIES,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Custom-Volk referenziert Bibliotheks-Zauber (später)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_BACKGROUND,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Custom-Hintergrund / Talent-Kette referenziert Bibliotheks-Zauber (später)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "active",
        when: "Charakter nutzt Custom-Zauber-IDs / eingebettete Bibliotheks-Runtime."
    }),

    // --- Custom Class ↔ andere (vorbereitet / bestehend) ---
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
        to: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        status: "active",
        when: "Standalone-UC hängt an Elternklasse (PHB oder Custom Class)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME,
        to: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        status: "active",
        when: "Runtime-Envelope hängt am Class-Paket (packageId)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_BACKGROUND,
        to: DC_PACKAGE_TYPE.CUSTOM_FEAT,
        status: "prepared",
        when: "Hintergrund referenziert Custom-Talent (später voll)."
    }),

    // --- Charakterbogen aggregiert ---
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        status: "active",
        when: "Charakter nutzt Custom Class."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME,
        status: "active",
        when: "Bogen hydratisiert Class-Runtime aus LocalStorage / Import."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
        status: "active",
        when: "Charakter nutzt Standalone-Custom-UC."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_BACKGROUND,
        status: "active",
        when: "Charakter nutzt Custom Background."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_FEAT,
        status: "prepared",
        when: "Einzelnes Custom-Talent (ungenutzt; Bibliothek über CUSTOM_FEAT_PACK)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
        status: "active",
        when: "Charakter nutzt Custom-Talente aus der Talentbibliothek."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CHARACTER_SHEET,
        to: DC_PACKAGE_TYPE.CUSTOM_SPECIES,
        status: "prepared",
        when: "Charakter nutzt Custom-Volk (später)."
    }),

    // --- Einzelzauber-Paket (falls später separat exportiert) ---
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_SPELL,
        to: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        status: "prepared",
        when: "Einzelzauber-Export hängt an der Bibliothek (falls jemals genutzt)."
    }),
    Object.freeze({
        from: DC_PACKAGE_TYPE.CUSTOM_SPELL,
        to: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        status: "prepared",
        when: "Einzelzauber referenziert Custom Class (später)."
    })
]);

/**
 * Alle Ziel-Typen, die „packageType“ typischerweise braucht.
 * @param {string} packageType DC_PACKAGE_TYPE.*
 * @param {{ status?: "active"|"prepared"|"any" }} [opts]
 * @returns {string[]}
 */
function getDcPackageDependencyTargets(packageType, opts) {
    const status = opts?.status || "any";
    return DC_PACKAGE_DEPENDENCY_EDGES
        .filter(e => e.from === packageType && (status === "any" || e.status === status))
        .map(e => e.to);
}

/**
 * Alle Pakettypen, die typischerweise von „packageType“ abhängen (Gegenrichtung).
 * @param {string} packageType
 * @param {{ status?: "active"|"prepared"|"any" }} [opts]
 * @returns {string[]}
 */
function getDcPackageDependents(packageType, opts) {
    const status = opts?.status || "any";
    return DC_PACKAGE_DEPENDENCY_EDGES
        .filter(e => e.to === packageType && (status === "any" || e.status === status))
        .map(e => e.from);
}

/**
 * Kanten für einen Pakettyp (from === packageType).
 * @param {string} packageType
 * @param {{ status?: "active"|"prepared"|"any" }} [opts]
 * @returns {ReadonlyArray<DcPackageDependencyEdge>}
 */
function getDcPackageDependencyEdgesFrom(packageType, opts) {
    const status = opts?.status || "any";
    return DC_PACKAGE_DEPENDENCY_EDGES.filter(e =>
        e.from === packageType && (status === "any" || e.status === status)
    );
}

/**
 * Prüft, ob eine Envelope-Dependency in der aktuellen Session erfüllt ist
 * (Ersteller-Runtime / offener Editor / Bogen-Runtime).
 * @param {object} dep
 * @param {{ forImport?: boolean }} [opts] forImport=true: nur explizit hochgeladene/gespeicherte
 *   Pakete zählen (kein stilles LocalStorage-Hydrate) – für Upload-Ketten.
 */
function isDcPackageDependencySatisfied(dep, opts) {
    if (!dep || !dep.packageType) return true;
    // PHB-Referenzen gelten immer als erfüllt
    if (dep.packageType === "phbClass" || dep.packageType === "phbSubclass") return true;

    const forImport = !!(opts && opts.forImport);
    const wantId = dep.packageId ? String(dep.packageId) : null;
    const wantSlug = dep.slug ? String(dep.slug) : null;

    const matchCandidate = (candidate) => {
        if (!candidate) return false;
        // Ohne konkrete Id/Slug: Typ-Vorhandensein reicht (Kandidat-Liste nicht leer)
        if (!wantId && !wantSlug) return true;
        if (wantId && candidate.packageId && String(candidate.packageId) === wantId) return true;
        if (wantSlug && candidate.slug && String(candidate.slug) === wantSlug) return true;
        return false;
    };

    if (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || dep.packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        const candidates = [];
        // Pending Haupt-Import zählt immer (bidirektionale Kette)
        const pendingClass = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_CLASS);
        if (pendingClass) candidates.push(pendingClass);
        const pendingRuntime = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME);
        if (pendingRuntime) candidates.push(pendingRuntime);

        const allowSession = !forImport || wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_CLASS);
        if (allowSession) {
            if (typeof registeredCustomClass !== "undefined" && registeredCustomClass?.translationLabel) {
                candidates.push({
                    packageId: registeredCustomClass.packageId || null,
                    slug: String(registeredCustomClass.translationLabel)
                });
            }
            if (typeof customClassEditorState !== "undefined" && customClassEditorState) {
                const slug = (typeof getCustomSpellListCheckboxLabel === "function")
                    ? getCustomSpellListCheckboxLabel(customClassEditorState)
                    : (customClassEditorState.slug || null);
                if (slug || customClassEditorState.packageId) {
                    candidates.push({
                        packageId: customClassEditorState.packageId || null,
                        slug: slug ? String(slug) : null
                    });
                }
            }
            if (typeof sheetCustomClassRuntime !== "undefined" && sheetCustomClassRuntime?.slug) {
                candidates.push({
                    packageId: sheetCustomClassRuntime.sourceClassPackageId
                        || sheetCustomClassRuntime.packageId
                        || null,
                    slug: String(sheetCustomClassRuntime.slug)
                });
            }
        }
        if (!candidates.length) return false;
        return candidates.some(matchCandidate);
    }

    if (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        const candidates = [];
        const pendingPack = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK);
        if (pendingPack) candidates.push(pendingPack);

        const allowSession = !forImport || wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK);
        if (allowSession) {
            if (typeof registeredCustomSpellPack !== "undefined"
                && (registeredCustomSpellPack?.packageId
                    || (Array.isArray(registeredCustomSpellPack?.spells)
                        && registeredCustomSpellPack.spells.length))) {
                candidates.push({
                    packageId: registeredCustomSpellPack.packageId || null,
                    slug: null
                });
            }
            if (typeof customSpellEditorState !== "undefined"
                && customSpellEditorState
                && (customSpellEditorState.packageId
                    || (Array.isArray(customSpellEditorState.spells)
                        && customSpellEditorState.spells.length))) {
                candidates.push({
                    packageId: customSpellEditorState.packageId || null,
                    slug: null
                });
            }
            // Auch bei forImport, sobald Nutzer die Datei in dieser Session geladen hat
            if (typeof sheetCustomSpellPackRuntime !== "undefined"
                && (sheetCustomSpellPackRuntime?.packageId
                    || (Array.isArray(sheetCustomSpellPackRuntime?.spells)
                        && sheetCustomSpellPackRuntime.spells.length))) {
                candidates.push({
                    packageId: sheetCustomSpellPackRuntime.packageId || null,
                    slug: null
                });
            }
        }
        if (!candidates.length) return false;
        if (!wantId) return true;
        return candidates.some(c => c.packageId && String(c.packageId) === wantId);
    }

    if (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        const candidates = [];
        const pendingPack = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK);
        if (pendingPack) candidates.push(pendingPack);

        const allowSession = !forImport || wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK);
        if (allowSession) {
            if (typeof registeredCustomFeatPack !== "undefined"
                && (registeredCustomFeatPack?.packageId
                    || (Array.isArray(registeredCustomFeatPack?.feats)
                        && registeredCustomFeatPack.feats.length))) {
                candidates.push({
                    packageId: registeredCustomFeatPack.packageId || null,
                    slug: null
                });
            }
            if (typeof customFeatEditorState !== "undefined"
                && customFeatEditorState
                && (customFeatEditorState.packageId
                    || (Array.isArray(customFeatEditorState.feats)
                        && customFeatEditorState.feats.length))) {
                candidates.push({
                    packageId: customFeatEditorState.packageId || null,
                    slug: null
                });
            }
            if (typeof sheetCustomFeatPackRuntime !== "undefined"
                && (sheetCustomFeatPackRuntime?.packageId
                    || (Array.isArray(sheetCustomFeatPackRuntime?.feats)
                        && sheetCustomFeatPackRuntime.feats.length))) {
                candidates.push({
                    packageId: sheetCustomFeatPackRuntime.packageId || null,
                    slug: null
                });
            }
        }
        if (!candidates.length) return false;
        if (!wantId) return true;
        return candidates.some(c => c.packageId && String(c.packageId) === wantId);
    }

    if (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
        const candidates = [];
        const pendingBg = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_BACKGROUND);
        if (pendingBg) candidates.push(pendingBg);

        const allowSession = !forImport
            || wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_BACKGROUND);
        if (allowSession) {
            if (typeof registeredCustomBackground !== "undefined"
                && registeredCustomBackground?.slug) {
                candidates.push({
                    packageId: registeredCustomBackground.packageId || null,
                    slug: String(registeredCustomBackground.slug)
                });
            }
            if (typeof sheetCustomBackgroundRuntime !== "undefined"
                && sheetCustomBackgroundRuntime?.slug) {
                candidates.push({
                    packageId: sheetCustomBackgroundRuntime.packageId || null,
                    slug: String(sheetCustomBackgroundRuntime.slug)
                });
            }
        }
        if (!candidates.length) return false;
        return candidates.some(matchCandidate);
    }

    if (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        const candidates = [];
        const pendingSc = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_SUBCLASS);
        if (pendingSc) candidates.push(pendingSc);

        const allowSession = !forImport
            || wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_SUBCLASS);
        if (allowSession) {
            if (typeof registeredCustomSubclass !== "undefined"
                && (registeredCustomSubclass?.slug || registeredCustomSubclass?.packageId)) {
                candidates.push({
                    packageId: registeredCustomSubclass.packageId || null,
                    slug: registeredCustomSubclass.slug
                        ? String(registeredCustomSubclass.slug)
                        : null
                });
            }
            if (typeof sheetCustomSubclassRuntime !== "undefined"
                && (sheetCustomSubclassRuntime?.slug || sheetCustomSubclassRuntime?.packageId)) {
                candidates.push({
                    packageId: sheetCustomSubclassRuntime.packageId || null,
                    slug: sheetCustomSubclassRuntime.slug
                        ? String(sheetCustomSubclassRuntime.slug)
                        : null
                });
            }
        }
        if (!candidates.length) return false;
        return candidates.some(matchCandidate);
    }

    // Noch nicht aktiv geprüfte Typen (prepared): nicht blockieren
    return true;
}

/** Pflicht-Dependencies, die fehlen (opts.forImport → Upload-Kette) */
function getUnsatisfiedDcPackageDependencies(dependencies, opts) {
    return (Array.isArray(dependencies) ? dependencies : []).filter(d =>
        d && d.required !== false && !isDcPackageDependencySatisfied(d, opts)
    );
}

/**
 * Nutzer-Hinweis bei fehlenden Abhängigkeiten (z. B. Charakterbogen).
 * @returns {boolean} true = fortfahren
 */
function confirmContinueDespiteMissingDcDependencies(dependencies) {
    const missing = getUnsatisfiedDcPackageDependencies(dependencies);
    if (!missing.length) return true;
    const list = formatDcPackageDependencyList(missing);
    const msg = tDcPackage(
        "dcPackageMissingDependenciesConfirmLabel",
        "Es fehlen abhängige Pakete: {list}. Bitte diese zuerst hochladen. Trotzdem fortfahren?",
        { list }
    );
    return confirm(msg);
}

/**
 * Ausstehender Haupt-Import, der auf Dependency-Uploads wartet.
 * @type {{
 *   envelope: object|null,
 *   payload: object,
 *   detectedType: string,
 *   onApply: function,
 *   onCancel?: function
 * }|null}
 */
let dcPendingPackageImport = null;

/**
 * Pakete, die der Nutzer in dieser Seiten-Session explizit geladen/gespeichert hat.
 * LocalStorage-Hydrate zählt nicht – Import-Ketten verlangen Datei-Upload.
 */
const dcSessionUserLoadedPackages = {
    customClass: false,
    customSpellPack: false,
    customFeatPack: false,
    customBackground: false,
    customSubclass: false
};

function markDcPackageUserLoaded(packageType) {
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        dcSessionUserLoadedPackages.customClass = true;
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        dcSessionUserLoadedPackages.customSpellPack = true;
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        dcSessionUserLoadedPackages.customFeatPack = true;
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
        dcSessionUserLoadedPackages.customBackground = true;
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        dcSessionUserLoadedPackages.customSubclass = true;
    }
}

function wasDcPackageUserLoadedThisSession(packageType) {
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        return !!dcSessionUserLoadedPackages.customClass;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        return !!dcSessionUserLoadedPackages.customSpellPack;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        return !!dcSessionUserLoadedPackages.customFeatPack;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
        return !!dcSessionUserLoadedPackages.customBackground;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        return !!dcSessionUserLoadedPackages.customSubclass;
    }
    return false;
}

/** Pending-Import zählt als verfügbares Paket (bidirektionale Deps Class↔Spell). */
function getDcPendingImportCandidate(packageType) {
    if (!dcPendingPackageImport || dcPendingPackageImport.detectedType !== packageType) {
        return null;
    }
    const payload = dcPendingPackageImport.payload || {};
    const envelope = dcPendingPackageImport.envelope || {};
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        return {
            packageId: envelope.packageId || payload.packageId || null,
            slug: payload.coreTraits?.translationLabel
                || payload.slug
                || null
        };
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
        || packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        return {
            packageId: envelope.packageId || payload.packageId || null,
            slug: null
        };
    }
    return {
        packageId: envelope.packageId || payload.packageId || null,
        slug: payload.slug || null
    };
}

/**
 * Nutzerlesbare Dependency-Liste — keine UUIDs/packageIds.
 * Nur Typ-Label; bei Klassen ggf. lesbarer Slug.
 */
function formatDcPackageDependencyList(deps) {
    return (deps || []).map(d => {
        const typeLabel = getDcPackageTypeLabel(d.packageType);
        const slug = d.slug ? String(d.slug).trim() : "";
        // packageId bewusst auslassen — Nutzer kennt UUIDs nicht
        return slug ? `${typeLabel} (${slug})` : typeLabel;
    }).join(", ");
}

/**
 * Lesbarer Anzeigename für eine Dependency (z. B. Klassen-/UC-/Hintergrundname).
 * Keine UUIDs — Translation, Pending-Runtime oder bereinigter Slug.
 */
function resolveDcPackageDependencyDisplayName(dep) {
    if (!dep) return "";
    const slug = dep.slug ? String(dep.slug).trim() : "";
    if (!slug) return "";

    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    const keys = [`${slug}Label`, slug];

    const lookupInMap = (map) => {
        if (!map || typeof map !== "object") return "";
        for (let i = 0; i < keys.length; i++) {
            const v = map[keys[i]];
            if (v != null && String(v).trim()) return String(v).trim();
        }
        return "";
    };

    if (typeof translations !== "undefined") {
        const fromGlobal = lookupInMap(translations[lang]);
        if (fromGlobal) return fromGlobal;
    }

    // Pending Charakterbogen: Namen aus eingebetteten Runtimes
    const pendingBase = dcPendingPackageImport?.payload?.base;
    const runtimeFields = [
        "customClassRuntime",
        "customBackgroundRuntime",
        "customSubclassRuntime"
    ];
    if (pendingBase) {
        for (let i = 0; i < runtimeFields.length; i++) {
            const runtimeRaw = pendingBase[runtimeFields[i]];
            if (!runtimeRaw) continue;
            try {
                const parsed = typeof runtimeRaw === "string" ? JSON.parse(runtimeRaw) : runtimeRaw;
                const payload = (parsed && parsed.payload) ? parsed.payload : parsed;
                const fromRuntime = lookupInMap(payload?.translations?.[lang])
                    || lookupInMap(payload?.translations?.de)
                    || lookupInMap(payload?.translations?.en);
                if (fromRuntime) return fromRuntime;
                // Hintergrund: Name oft unter payload.names / editorState.names
                const names = payload?.names || payload?.editorState?.names;
                if (names && (names[lang] || names.de || names.en)) {
                    const n = String(names[lang] || names.de || names.en).trim();
                    if (n) return n;
                }
                // Unterklasse: translationLabel der kompilierten Liste
                const scLabel = payload?.compiledSubclassListEntry?.translationLabel;
                if (scLabel) {
                    const fromSc = lookupInMap(payload?.translations?.[lang])
                        || lookupInMap(payload?.translations?.de)
                        || lookupInMap(payload?.translations?.en);
                    // lookupInMap nutzt keys aus dep.slug – zusätzlich direkten Key prüfen
                    const tMap = payload?.translations?.[lang]
                        || payload?.translations?.de
                        || payload?.translations?.en
                        || {};
                    if (tMap[scLabel] != null && String(tMap[scLabel]).trim()) {
                        return String(tMap[scLabel]).trim();
                    }
                    if (fromSc) return fromSc;
                }
            } catch (e) {
                // Runtime-JSON optional
            }
        }
    }

    // Fallback: custom_bg_testhintergrund → testhintergrund
    let name = slug;
    if (name.toLowerCase().startsWith("custom_bg_")) name = name.slice(10);
    else if (name.toLowerCase().startsWith("custom_")) name = name.slice(7);
    if (name.endsWith("Label")) name = name.slice(0, -5);
    return name;
}

/** Button-Text im Dependency-Modal (ohne technische IDs). */
function getDcPackageDependencyButtonLabel(packageType, dep) {
    let base = "";
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        base = tDcPackage("dcPackageDepBtnOwnSpellsLabel", "Zauberbibliothek");
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        base = tDcPackage("dcPackageDepBtnCustomFeatPackLabel", "Talentbibliothek");
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        base = tDcPackage("dcPackageDepBtnCustomClassLabel", "Custom-Klasse");
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
        base = tDcPackage("dcPackageDepBtnCustomBackgroundLabel", "Custom-Hintergrund");
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        base = tDcPackage("dcPackageDepBtnCustomSubclassLabel", "Custom-Unterklasse");
    } else {
        return getDcPackageTypeLabel(packageType);
    }

    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME
        || packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND
        || packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        const displayName = resolveDcPackageDependencyDisplayName(dep);
        if (displayName) return `${base} (${displayName})`;
    }
    return base;
}

/**
 * Ausstehende Pflicht-Dependency eines Typs (aus requiredDeps des Pending-Imports).
 * @returns {object|null}
 */
function getPendingDcPackageDependencyForType(packageType) {
    if (!dcPendingPackageImport || !packageType) return null;
    const list = Array.isArray(dcPendingPackageImport.requiredDeps)
        ? dcPendingPackageImport.requiredDeps
        : [];
    return list.find(d => d && d.packageType === packageType) || null;
}

/**
 * Prüft, ob die hochgeladene Datei zur ausstehenden Dependency passt.
 * @returns {{ ok: boolean, message?: string }}
 */
function validateUploadedDcPackageAgainstPendingDependency(packageType, envelope, payload) {
    const dep = getPendingDcPackageDependencyForType(packageType);
    if (!dep) return { ok: true };

    const uploadedId = envelope?.packageId || payload?.packageId || null;
    if (dep.packageId) {
        if (!uploadedId || String(uploadedId) !== String(dep.packageId)) {
            const typeLabel = getDcPackageDependencyButtonLabel(packageType, dep);
            return {
                ok: false,
                message: tDcPackage(
                    "dcPackageDependencyMismatchLabel",
                    "Diese Datei enthält nicht die notwendigen selbsterstellten (custom) Inhalte. Bitte die passende {type} hochladen.",
                    { type: typeLabel }
                )
            };
        }
    }

    if (dep.slug
        && (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
            || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME)) {
        const uploadedSlug = payload?.coreTraits?.translationLabel
            || payload?.slug
            || null;
        if (!uploadedSlug || String(uploadedSlug) !== String(dep.slug)) {
            const typeLabel = getDcPackageDependencyButtonLabel(packageType, dep);
            return {
                ok: false,
                message: tDcPackage(
                    "dcPackageDependencyMismatchLabel",
                    "Diese Datei enthält nicht die notwendigen selbsterstellten (custom) Inhalte. Bitte die passende {type} hochladen.",
                    { type: typeLabel }
                )
            };
        }
    }

    return { ok: true };
}

function cancelPendingDcPackageImport() {
    const pending = dcPendingPackageImport;
    hideDcPackageLinkedFilesModal();
    if (!pending) return;
    const cancel = pending.onCancel;
    dcPendingPackageImport = null;
    if (typeof cancel === "function") cancel();
}

/** Pflicht-Deps des aktuellen Pending-Imports. */
function getPendingDcPackageRequiredDependencies() {
    if (!dcPendingPackageImport) return [];
    if (Array.isArray(dcPendingPackageImport.requiredDeps)) {
        return dcPendingPackageImport.requiredDeps;
    }
    return [];
}

/** true = alle requiredDeps für Import-Kette erfüllt. */
function arePendingDcPackageDependenciesFulfilled() {
    const required = getPendingDcPackageRequiredDependencies();
    if (!required.length) return true;
    return getUnsatisfiedDcPackageDependencies(required, { forImport: true }).length === 0;
}

/**
 * Verknüpfte Datei in ausstehendes Charakterbogen-Payload.base schreiben
 * (sonst geht die Hydrierung beim localStorage.clear + Reload verloren).
 */
function mergeLinkedPackageIntoPendingCharacterSheet(lsKey, value) {
    if (!dcPendingPackageImport
        || dcPendingPackageImport.detectedType !== DC_PACKAGE_TYPE.CHARACTER_SHEET) {
        return;
    }
    if (!dcPendingPackageImport.payload
        || typeof dcPendingPackageImport.payload !== "object") {
        return;
    }
    if (!dcPendingPackageImport.payload.base
        || typeof dcPendingPackageImport.payload.base !== "object") {
        dcPendingPackageImport.payload.base = {};
    }
    const str = typeof value === "string" ? value : JSON.stringify(value);
    dcPendingPackageImport.payload.base[lsKey] = str;
}

/** Envelope+Payload für Bogen-LS / Hydrate */
function wrapDcPackageForSheetStorage(payload, envelope) {
    if (envelope && payload) return { dc: envelope, payload };
    return payload;
}

/**
 * Dependency nur registrieren (kein Builder öffnen).
 * Ersteller: register*-Funktionen; Bogen: hydrate* + Merge in Pending-Sheet-Base.
 * @returns {boolean}
 */
function registerDcPackageDependencyPayload(packageType, payload, envelope) {
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        if (typeof registerCustomSpellPackFromPayload === "function") {
            const ok = !!registerCustomSpellPackFromPayload(payload, envelope);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet(
                    "customSpellPackRuntime",
                    wrapDcPackageForSheetStorage(payload, envelope)
                );
            }
            return ok;
        }
        if (typeof hydrateCustomSpellPackRuntime === "function") {
            const wrapped = wrapDcPackageForSheetStorage(payload, envelope);
            const ok = !!hydrateCustomSpellPackRuntime(wrapped);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet("customSpellPackRuntime", wrapped);
            }
            return ok;
        }
        return false;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        if (typeof registerCustomFeatPackFromPayload === "function") {
            const ok = !!registerCustomFeatPackFromPayload(payload, envelope);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet(
                    "customFeatPackRuntime",
                    wrapDcPackageForSheetStorage(payload, envelope)
                );
            }
            return ok;
        }
        if (typeof hydrateCustomFeatPackRuntime === "function") {
            const wrapped = wrapDcPackageForSheetStorage(payload, envelope);
            const ok = !!hydrateCustomFeatPackRuntime(wrapped);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet("customFeatPackRuntime", wrapped);
            }
            return ok;
        }
        return false;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        const wrapped = wrapDcPackageForSheetStorage(payload, envelope);
        if (typeof registerCustomClassInRuntime === "function") {
            registerCustomClassInRuntime(wrapped);
            mergeLinkedPackageIntoPendingCharacterSheet("customClassRuntime", wrapped);
            return true;
        }
        if (typeof hydrateCustomClassRuntime === "function") {
            const ok = !!hydrateCustomClassRuntime(wrapped);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet("customClassRuntime", wrapped);
            }
            return ok;
        }
        return false;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
        const wrapped = wrapDcPackageForSheetStorage(payload, envelope);
        if (typeof registerCustomBackgroundInRuntime === "function") {
            registerCustomBackgroundInRuntime(wrapped);
            mergeLinkedPackageIntoPendingCharacterSheet("customBackgroundRuntime", wrapped);
            return true;
        }
        if (typeof hydrateCustomBackgroundRuntime === "function") {
            const ok = !!hydrateCustomBackgroundRuntime(wrapped);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet("customBackgroundRuntime", wrapped);
            }
            return ok;
        }
        return false;
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        const wrapped = wrapDcPackageForSheetStorage(payload, envelope);
        if (typeof registerCustomSubclassInRuntime === "function") {
            registerCustomSubclassInRuntime(wrapped);
            mergeLinkedPackageIntoPendingCharacterSheet("customSubclassRuntime", wrapped);
            return true;
        }
        if (typeof hydrateCustomSubclassRuntime === "function") {
            const ok = !!hydrateCustomSubclassRuntime(wrapped);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet("customSubclassRuntime", wrapped);
            }
            return ok;
        }
        return false;
    }
    return false;
}

/** Modal-DOM einmalig anlegen (Creator + Bogen). */
function ensureDcPackageLinkedFilesModal() {
    let overlay = document.getElementById("dcPackageLinkedFilesOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "dcPackageLinkedFilesOverlay";
    overlay.className = "modal-overlay dc-linked-files-overlay";
    overlay.style.display = "none";
    overlay.innerHTML = `
        <div class="custom-class-modal custom-class-modal--chooser dc-linked-files-modal" onclick="event.stopPropagation()">
            <span class="close-icon" onclick="requestCloseDcPackageLinkedFilesModal()" aria-label="×">&times;</span>
            <h3 id="dcPackageLinkedFilesTitleLabel" class="custom-class-title"></h3>
            <p id="dcPackageLinkedFilesHintLabel" class="dc-linked-files-hint"></p>
            <div id="dcPackageLinkedFilesButtons" class="custom-class-chooser-actions dc-linked-files-buttons"></div>
            <div class="custom-class-footer dc-linked-files-footer">
                <button type="button" id="dcPackageLinkedFilesConfirmBtn"
                    class="custom-class-action-btn"
                    onclick="confirmDcPackageLinkedFilesUploads()"></button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function hideDcPackageLinkedFilesModal() {
    const overlay = document.getElementById("dcPackageLinkedFilesOverlay");
    if (overlay) overlay.style.display = "none";
}

function requestCloseDcPackageLinkedFilesModal() {
    cancelPendingDcPackageImport();
}

/**
 * Modal neu zeichnen: graue/grüne Buttons, Bestätigen aktiv wenn alles erfüllt.
 */
function refreshDcPackageLinkedFilesModal() {
    if (!dcPendingPackageImport) {
        hideDcPackageLinkedFilesModal();
        return;
    }

    const overlay = ensureDcPackageLinkedFilesModal();
    const titleEl = document.getElementById("dcPackageLinkedFilesTitleLabel");
    const hintEl = document.getElementById("dcPackageLinkedFilesHintLabel");
    const listEl = document.getElementById("dcPackageLinkedFilesButtons");
    const confirmBtn = document.getElementById("dcPackageLinkedFilesConfirmBtn");

    if (titleEl) {
        titleEl.textContent = tDcPackage(
            "dcPackageLinkedFilesTitleLabel",
            "Verknüpfte Dateien hochladen"
        );
    }
    if (hintEl) {
        hintEl.textContent = tDcPackage(
            "dcPackageLinkedFilesHintLabel",
            "Lade die verknüpften Dateien hoch. Grüne Buttons sind erfolgreich geladen."
        );
    }
    if (confirmBtn) {
        confirmBtn.textContent = tDcPackage(
            "dcPackageLinkedFilesConfirmLabel",
            "Bestätigen"
        );
    }

    const required = getPendingDcPackageRequiredDependencies();
    if (listEl) {
        listEl.innerHTML = "";
        required.forEach((dep, index) => {
            const packageType = dep.packageType;
            const satisfied = isDcPackageDependencySatisfied(dep, { forImport: true });
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "custom-class-action-btn dc-dep-file-btn"
                + (satisfied ? " is-fulfilled" : "");
            btn.textContent = getDcPackageDependencyButtonLabel(packageType, dep);
            btn.setAttribute("data-package-type", packageType);
            btn.onclick = () => triggerDcPackageLinkedFilePicker(packageType);

            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";
            input.style.display = "none";
            input.id = `dcDepFileInput_${index}_${packageType}`;
            input.setAttribute("data-package-type", packageType);
            input.onchange = (event) => {
                handleDcPackageLinkedFileSelected(packageType, event);
            };

            listEl.appendChild(btn);
            listEl.appendChild(input);
        });
    }

    const allOk = arePendingDcPackageDependenciesFulfilled();
    if (confirmBtn) {
        confirmBtn.disabled = !allOk;
        confirmBtn.classList.toggle("dc-linked-files-confirm--ready", allOk);
        confirmBtn.classList.toggle("dc-linked-files-confirm--disabled", !allOk);
    }

    overlay.style.display = "flex";
}

function triggerDcPackageLinkedFilePicker(packageType) {
    const listEl = document.getElementById("dcPackageLinkedFilesButtons");
    if (!listEl) return false;
    const input = listEl.querySelector(
        `input[type="file"][data-package-type="${packageType}"]`
    );
    if (!input) return false;
    input.value = "";
    input.click();
    return true;
}

/**
 * Datei aus dem Dependency-Modal: nur registrieren, Modal bleibt offen.
 */
async function handleDcPackageLinkedFileSelected(packageType, event) {
    const file = event?.target?.files?.[0];
    if (!file || !dcPendingPackageImport) return;

    if (typeof readAndValidateDcPackageFile !== "function") {
        alert(tDcPackage("dcPackageUnknownFormatLabel", "Unbekanntes DiceCharacters-Dateiformat."));
        if (event?.target) event.target.value = "";
        return;
    }

    const result = await readAndValidateDcPackageFile(file, {
        expectedType: (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
            || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME)
            ? [DC_PACKAGE_TYPE.CUSTOM_CLASS, DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME]
            : packageType
    });

    if (!result?.ok) {
        alert(result?.message
            || tDcPackage("dcPackageUnknownFormatLabel", "Unbekanntes DiceCharacters-Dateiformat."));
        if (event?.target) event.target.value = "";
        return;
    }

    const match = validateUploadedDcPackageAgainstPendingDependency(
        packageType,
        result.envelope,
        result.payload
    );
    if (!match.ok) {
        alert(match.message
            || tDcPackage(
                "dcPackageDependencyMismatchLabel",
                "Diese Datei enthält nicht die notwendigen selbsterstellten (custom) Inhalte. Bitte die passende {type} hochladen.",
                { type: getDcPackageDependencyButtonLabel(packageType) }
            ));
        if (event?.target) event.target.value = "";
        refreshDcPackageLinkedFilesModal();
        return;
    }

    const registered = registerDcPackageDependencyPayload(
        packageType,
        result.payload,
        result.envelope
    );
    if (!registered) {
        alert(tDcPackage("dcPackageInvalidPayloadLabel", "Der Dateiinhalt ist unvollständig oder ungültig."));
        if (event?.target) event.target.value = "";
        return;
    }

    markDcPackageUserLoaded(packageType);
    if (event?.target) event.target.value = "";
    // Modal bleibt offen — Button wird grün, Bestätigen ggf. aktiv
    refreshDcPackageLinkedFilesModal();
}

/**
 * Bestätigen: nur wenn alle Deps grün → Haupt-Import anwenden.
 */
function confirmDcPackageLinkedFilesUploads() {
    const pending = dcPendingPackageImport;
    if (!pending) {
        hideDcPackageLinkedFilesModal();
        return;
    }
    if (!arePendingDcPackageDependenciesFulfilled()) {
        alert(tDcPackage(
            "dcPackageLinkedFilesIncompleteLabel",
            "Bitte zuerst alle verknüpften Dateien hochladen."
        ));
        refreshDcPackageLinkedFilesModal();
        return;
    }
    const { onApply, payload, envelope } = pending;
    dcPendingPackageImport = null;
    hideDcPackageLinkedFilesModal();
    onApply(payload, envelope);
}

/**
 * Dependency-Modal zeigen (kein auto-Apply, kein alert/confirm-Picker).
 * Alias bleibt für bestehende Aufrufe.
 */
function promptNextDcPackageDependencyUpload() {
    if (!dcPendingPackageImport) return;
    if (arePendingDcPackageDependenciesFulfilled()) {
        // Nicht auto-schließen: Nutzer bestätigt explizit, außer nichts war required
        const required = getPendingDcPackageRequiredDependencies();
        if (!required.length) {
            const { onApply, payload, envelope } = dcPendingPackageImport;
            dcPendingPackageImport = null;
            hideDcPackageLinkedFilesModal();
            onApply(payload, envelope);
            return;
        }
    }
    refreshDcPackageLinkedFilesModal();
}

/**
 * Import mit Dependency-Kette: fehlende Pakete per Modal nachfordern.
 * @param {{
 *   envelope: object|null,
 *   payload: object,
 *   detectedType: string,
 *   onApply: function(payload, envelope),
 *   onCancel?: function
 * }} opts
 */
function beginDcPackageImportWithDependencies(opts) {
    if (!opts || typeof opts.onApply !== "function") return;
    const envelope = opts.envelope || null;
    const payload = opts.payload;
    const detectedType = opts.detectedType;
    // optional: feste Pflichtliste (z. B. fehlende eingebettete Bogen-Deps)
    const seedDeps = Array.isArray(opts.requiredDeps)
        ? opts.requiredDeps
        : ((typeof collectEffectiveDcPackageDependencies === "function")
            ? collectEffectiveDcPackageDependencies(envelope, payload, detectedType)
            : (envelope?.dependencies || []));
    const missing = getUnsatisfiedDcPackageDependencies(seedDeps, { forImport: true });
    if (!missing.length) {
        opts.onApply(payload, envelope);
        return;
    }
    // Deduplizieren nach packageType (ein Button pro Typ)
    const byType = new Map();
    missing.forEach(d => {
        if (!d || !d.packageType) return;
        if (!byType.has(d.packageType)) byType.set(d.packageType, d);
    });
    dcPendingPackageImport = {
        envelope,
        payload,
        detectedType,
        onApply: opts.onApply,
        onCancel: opts.onCancel || null,
        requiredDeps: Array.from(byType.values())
    };
    refreshDcPackageLinkedFilesModal();
}

/**
 * Nach Dependency-Upload (Legacy-Pfad Builder-Inputs): Modal aktualisieren, nicht auto-Apply.
 * @returns {boolean} true = es gab einen Pending-Import
 */
function notifyDcPackageDependencyPossiblyResolved() {
    if (!dcPendingPackageImport) return false;
    refreshDcPackageLinkedFilesModal();
    return true;
}

/**
 * true = dieser Upload erfüllt eine required Dependency des Pending-Imports.
 */
function isDcPackageDependencyResolutionUpload(expectedType) {
    if (!dcPendingPackageImport || !expectedType) return false;
    return getPendingDcPackageRequiredDependencies()
        .some(d => d && d.packageType === expectedType);
}

/** Legacy-Alias: Picker im Modal. */
function triggerDcPackageDependencyFilePicker(packageType) {
    return triggerDcPackageLinkedFilePicker(packageType);
}

/**
 * Consumer → Zauberbibliothek (nur künftige Feat/Species o. Ä. mit expliziten Spell-IDs).
 * Class/UC/BG deklarieren keine Bib-Deps — Verknüpfung läuft über den Charakterbogen.
 */
function buildConsumerSpellPackDependencies(opts) {
    const o = opts || {};
    const refs = Array.isArray(o.referencedSpellIds) ? o.referencedSpellIds : [];
    if (!refs.length) return [];

    let packageId = o.packageId || null;
    if (!packageId) {
        if (typeof registeredCustomSpellPack !== "undefined" && registeredCustomSpellPack?.packageId) {
            packageId = registeredCustomSpellPack.packageId;
        } else if (typeof customSpellEditorState !== "undefined" && customSpellEditorState?.packageId) {
            packageId = customSpellEditorState.packageId;
        } else if (typeof sheetCustomSpellPackRuntime !== "undefined" && sheetCustomSpellPackRuntime?.packageId) {
            packageId = sheetCustomSpellPackRuntime.packageId;
        }
    }

    return [{
        packageType: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        packageId: packageId || null,
        required: true
    }];
}

/**
 * Class → Bibliothek: keine Deps (Bib ist listenunabhängig).
 */
function buildCustomClassSpellPackDependencies(state) {
    return [];
}

/**
 * Effektive Dependencies: Envelope + Fallback.
 * Class/UC/BG/Feat/Species → Bibliothek wird gestrippt (nur Sheet fordert Bib).
 * Bibliothek bleibt Blatt.
 */
function collectEffectiveDcPackageDependencies(envelope, payload, detectedType) {
    const deps = Array.isArray(envelope?.dependencies) ? envelope.dependencies.slice() : [];

    const noSpellLibraryConsumers = [
        DC_PACKAGE_TYPE.CUSTOM_CLASS,
        DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
        DC_PACKAGE_TYPE.CUSTOM_FEAT,
        DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
        DC_PACKAGE_TYPE.CUSTOM_SPECIES,
        DC_PACKAGE_TYPE.CUSTOM_BACKGROUND
    ];
    if (noSpellLibraryConsumers.includes(detectedType)) {
        for (let i = deps.length - 1; i >= 0; i--) {
            if (deps[i] && deps[i].packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
                deps.splice(i, 1);
            }
        }
    }

    if (detectedType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
        || detectedType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        // Bibliothek ist Blatt: keine Class-/UC-Deps nach oben (Legacy-Envelope strippen)
        for (let i = deps.length - 1; i >= 0; i--) {
            const pt = deps[i] && deps[i].packageType;
            if (pt === DC_PACKAGE_TYPE.CUSTOM_CLASS
                || pt === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME
                || pt === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
                || pt === DC_PACKAGE_TYPE.CUSTOM_FEAT
                || pt === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
                || pt === DC_PACKAGE_TYPE.CUSTOM_SPECIES
                || pt === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
                deps.splice(i, 1);
            }
        }
    }

    return deps;
}

/**
 * Charakterbogen-Import: deklarierte Dependencies müssen im base-Storage eingebettet sein.
 * (Session-Runtime ist hier irrelevant – LS wird ohnehin ersetzt.)
 */
function getMissingEmbeddedCharacterSheetDependencies(envelope, sheetPayload) {
    const deps = Array.isArray(envelope?.dependencies) ? envelope.dependencies : [];
    const base = sheetPayload?.base || {};
    const missing = [];

    deps.forEach(d => {
        if (!d || d.required === false) return;
        const type = d.packageType;
        if (type === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK && !base.customSpellPackRuntime) {
            missing.push(d);
            return;
        }
        if (type === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK && !base.customFeatPackRuntime) {
            missing.push(d);
            return;
        }
        if ((type === DC_PACKAGE_TYPE.CUSTOM_CLASS
            || type === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME)
            && !base.customClassRuntime) {
            missing.push(d);
            return;
        }
        if (type === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND && !base.customBackgroundRuntime) {
            missing.push(d);
            return;
        }
        if (type === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS && !base.customSubclassRuntime) {
            missing.push(d);
        }
    });
    return missing;
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
    if ((raw.type === "customSubclass" || raw.type === "customSubclassRuntime")
        && raw.targetClassSlug) {
        return DC_PACKAGE_TYPE.CUSTOM_SUBCLASS;
    }
    if ((raw.type === "customBackground" || raw.type === "customBackgroundRuntime")
        && raw.slug && raw.compiledBackgroundListEntry) {
        return DC_PACKAGE_TYPE.CUSTOM_BACKGROUND;
    }
    if ((raw.type === "customSpellPack" || raw.type === "customSpellPackRuntime")
        && Array.isArray(raw.spells)) {
        return DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK;
    }
    if ((raw.type === "customFeatPack" || raw.type === "customFeatPackRuntime")
        && Array.isArray(raw.feats)) {
        return DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK;
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
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS) {
        const okType = payload.type === "customSubclass" || payload.type === "customSubclassRuntime";
        if (!okType || !payload.targetClassSlug || !payload.compiledSubclassListEntry) {
            return { ok: false, errorCode: "invalidCustomSubclass" };
        }
        return { ok: true };
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND) {
        const okType = payload.type === "customBackground" || payload.type === "customBackgroundRuntime";
        if (!okType || !payload.slug || !payload.compiledBackgroundListEntry) {
            return { ok: false, errorCode: "invalidCustomBackground" };
        }
        return { ok: true };
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        const okType = payload.type === "customSpellPack" || payload.type === "customSpellPackRuntime";
        if (!okType || !Array.isArray(payload.spells)) {
            return { ok: false, errorCode: "invalidCustomSpellPack" };
        }
        return { ok: true };
    }
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        const okType = payload.type === "customFeatPack" || payload.type === "customFeatPackRuntime";
        if (!okType || !Array.isArray(payload.feats)) {
            return { ok: false, errorCode: "invalidCustomFeatPack" };
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
        ],
        invalidCustomSubclass: [
            "dcPackageInvalidCustomSubclassLabel",
            "Die Datei ist keine gültige Custom-Unterklasse."
        ],
        invalidCustomBackground: [
            "dcPackageInvalidCustomBackgroundLabel",
            "Die Datei ist kein gültiger Custom-Hintergrund."
        ],
        invalidCustomSpellPack: [
            "dcPackageInvalidCustomSpellPackLabel",
            "Die Datei ist keine gültige Zauberbibliothek."
        ],
        invalidCustomFeatPack: [
            "dcPackageInvalidCustomFeatPackLabel",
            "Die Datei ist keine gültige Talentbibliothek."
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
    const dependencies = (typeof buildCustomClassSpellPackDependencies === "function")
        ? buildCustomClassSpellPackDependencies(state)
        : [];
    return wrapDcPackage({
        packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
        packageId,
        createdAt: state.packageCreatedAt || undefined,
        provides: buildCustomClassProvides(state, slug),
        dependencies,
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
 * Dependencies aus eingebetteter Custom-Class- / Custom-Background-Runtime.
 */
function buildCharacterSheetDependencies(baseStorage) {
    const deps = [];
    if (!baseStorage) return deps;

    const pushFromRuntime = (raw, expectedType, depPackageType) => {
        if (!raw) return;
        let parsed;
        try {
            parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (e) {
            return;
        }
        if (typeof normalizeDcPackageInput !== "function") return;
        const norm = normalizeDcPackageInput(parsed);
        if (!norm.ok || norm.detectedType !== expectedType) return;

        const packageId = norm.envelope?.packageId || norm.payload?.packageId || null;
        const slug = norm.payload?.slug
            || norm.payload?.compiledBackgroundListEntry?.translationLabel
            || null;
        if (packageId || slug) {
            deps.push({
                packageType: depPackageType,
                packageId: packageId || null,
                slug: slug ? String(slug) : undefined,
                verificationCode: packageId
                    ? buildDcVerificationCode(depPackageType, packageId)
                    : undefined,
                required: true
            });
        }
    };

    // Custom Class Runtime → Abhängigkeit zur Custom Class
    const classRaw = baseStorage.customClassRuntime;
    if (classRaw) {
        let parsed;
        try {
            parsed = typeof classRaw === "string" ? JSON.parse(classRaw) : classRaw;
        } catch (e) {
            parsed = null;
        }
        if (parsed && typeof normalizeDcPackageInput === "function") {
            const norm = normalizeDcPackageInput(parsed);
            if (norm.ok && norm.detectedType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
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
                    deps.push({
                        packageType: DC_PACKAGE_TYPE.CUSTOM_CLASS,
                        packageId: null,
                        slug: String(norm.payload.slug),
                        required: true
                    });
                }
            }
        }
    }

    // Custom Subclass Runtime → Abhängigkeit zum UC-Paket
    pushFromRuntime(
        baseStorage.customSubclassRuntime,
        DC_PACKAGE_TYPE.CUSTOM_SUBCLASS,
        DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
    );

    // Custom Background Runtime → Abhängigkeit zum Background-Paket
    pushFromRuntime(
        baseStorage.customBackgroundRuntime,
        DC_PACKAGE_TYPE.CUSTOM_BACKGROUND,
        DC_PACKAGE_TYPE.CUSTOM_BACKGROUND
    );

    // Zauberbibliothek-Runtime → Abhängigkeit zur Bibliothek
    pushFromRuntime(
        baseStorage.customSpellPackRuntime,
        DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
    );

    // Talentbibliothek-Runtime → Abhängigkeit zur Bibliothek
    pushFromRuntime(
        baseStorage.customFeatPackRuntime,
        DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
        DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
    );

    // Fallback: Custom-Zauber-IDs gewählt, aber Runtime fehlt im Export
    // → trotzdem Bibliothek nachfordern (Import-Modal)
    const hasSpellPackDep = deps.some(d =>
        d && d.packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
    );
    if (!hasSpellPackDep && baseStorageHasCustomSpellIds(baseStorage)) {
        deps.push({
            packageType: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
            packageId: null,
            required: true
        });
    }

    const hasFeatPackDep = deps.some(d =>
        d && d.packageType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
    );
    if (!hasFeatPackDep && baseStorageHasCustomFeatIds(baseStorage)) {
        deps.push({
            packageType: DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
            packageId: null,
            required: true
        });
    }

    return deps;
}

/**
 * true = cantrips/prepared/… enthalten Custom-Spell-IDs (>= CUSTOM_SPELL_ID_MIN).
 */
function baseStorageHasCustomSpellIds(baseStorage) {
    if (!baseStorage) return false;
    const minId = (typeof CUSTOM_SPELL_ID_MIN !== "undefined")
        ? CUSTOM_SPELL_ID_MIN
        : 1000;
    const keys = ["cantrips", "preparedSpells", "favoredSpells", "spellbookSpells"];
    for (let k = 0; k < keys.length; k++) {
        const raw = baseStorage[keys[k]];
        if (!raw) continue;
        let arr;
        try {
            arr = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (e) {
            continue;
        }
        if (!Array.isArray(arr)) continue;
        for (let i = 0; i < arr.length; i++) {
            const entry = arr[i];
            const id = (entry && typeof entry === "object") ? entry.spellId : entry;
            const n = Number(id);
            if (Number.isFinite(n) && n >= minId) return true;
        }
    }
    return false;
}

/**
 * true = classForm.feats / feat_background / feat_species enthalten Custom-Feat-IDs (>= 1000).
 */
function baseStorageHasCustomFeatIds(baseStorage) {
    if (!baseStorage) return false;
    const minId = (typeof CUSTOM_FEAT_ID_MIN !== "undefined")
        ? CUSTOM_FEAT_ID_MIN
        : 1000;
    const ids = [];
    if (baseStorage.feat_background != null) ids.push(baseStorage.feat_background);
    if (baseStorage.feat_species != null) ids.push(baseStorage.feat_species);
    const rawForm = baseStorage.classForm;
    if (rawForm) {
        let form;
        try {
            form = typeof rawForm === "string" ? JSON.parse(rawForm) : rawForm;
        } catch (e) {
            form = null;
        }
        if (form && Array.isArray(form.feats)) {
            form.feats.forEach(entry => {
                const id = (entry && typeof entry === "object") ? entry.feat : entry;
                if (id != null) ids.push(id);
            });
        }
    }
    return ids.some(id => {
        const n = Number(id);
        return Number.isFinite(n) && n >= minId;
    });
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
 * Flaches Custom-Zauberbibliothek-Payload + Envelope → wrapDcPackage.
 * Behält packageId/createdAt aus state bzw. vorheriger Envelope.
 */
function wrapCustomSpellPackExport(state, flatPayload) {
    const packageId = normalizeDcPackageId(state?.packageId) || createDcPackageId();
    const provides = (typeof buildCustomSpellPackProvides === "function")
        ? buildCustomSpellPackProvides(state || { spells: flatPayload?.spells })
        : (Array.isArray(flatPayload?.spells)
            ? flatPayload.spells.map(s => ({
                kind: "spell",
                id: s.ID,
                slug: s.translationLabel || undefined
            }))
            : []);
    const dependencies = (typeof buildCustomSpellPackDependencies === "function")
        ? buildCustomSpellPackDependencies(state || { spells: flatPayload?.spells })
        : [];
    return wrapDcPackage({
        packageType: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        packageId,
        createdAt: state?.packageCreatedAt || undefined,
        provides,
        dependencies,
        payload: flatPayload
    });
}

/**
 * Flaches Custom-Talentbibliothek-Payload + Envelope → wrapDcPackage.
 */
function wrapCustomFeatPackExport(state, flatPayload) {
    const packageId = normalizeDcPackageId(state?.packageId) || createDcPackageId();
    const provides = (typeof buildCustomFeatPackProvides === "function")
        ? buildCustomFeatPackProvides(state || { feats: flatPayload?.feats })
        : (Array.isArray(flatPayload?.feats)
            ? flatPayload.feats.map(f => ({
                kind: "feat",
                id: f.ID,
                slug: f.translationLabel || undefined
            }))
            : []);
    const dependencies = (typeof buildCustomFeatPackDependencies === "function")
        ? buildCustomFeatPackDependencies(state || { feats: flatPayload?.feats })
        : [];
    return wrapDcPackage({
        packageType: DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
        packageId,
        createdAt: state?.packageCreatedAt || undefined,
        provides,
        dependencies,
        payload: flatPayload
    });
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

//=======================================================================
// ClassData: Zauber-Ressourcenzeile (Basis vs. Unterklasse)
//=======================================================================

/** Zeile hat Tricks, vorbereitete Zauber oder mindestens einen Slot */
function classDataRowHasSpellResources(entry) {
    if (!entry) return false;
    if ((parseInt(entry.cantripsAmount, 10) || 0) > 0) return true;
    if ((parseInt(entry.preparedSpellsAmount, 10) || 0) > 0) return true;
    for (let i = 1; i <= 9; i++) {
        if ((parseInt(entry[`SSpSL${i}`], 10) || 0) > 0) return true;
    }
    return false;
}

/**
 * Eine konsistente Slot-/Progressionszeile für Charakterstufe + gewählte UC.
 * UC-Caster zuerst (Custom-UC darf nicht Fighter-/Rogue-Basis-Slots erben);
 * PHB-EK/AT fallen auf Basis zurück, wenn die UC auf 19/20 keine eigene Zeile hat.
 */
function resolveClassLevelSpellResourceRow(classDataArray, characterLevel, subclassCategoryNumber) {
    if (!Array.isArray(classDataArray)) return null;
    const level = Number(characterLevel) || 0;
    const sc = subclassCategoryNumber != null ? parseInt(subclassCategoryNumber, 10) : 0;
    const atLevel = (pred) => classDataArray.find(entry =>
        entry && Number(entry.level) === level && pred(entry)
    );

    if (sc > 0) {
        const scRow = atLevel(e =>
            e.subclassCategoryNumber === sc && classDataRowHasSpellResources(e)
        );
        if (scRow) return scRow;
    }

    let row = atLevel(e =>
        (e.subclassCategoryNumber === 0 || e.subclassCategoryNumber === sc)
        && classDataRowHasSpellResources(e)
    );
    if (row) return row;

    row = atLevel(e =>
        (e.subclassCategoryNumber === 0 || !e.subclassCategoryNumber)
        && classDataRowHasSpellResources(e)
    );
    if (row) return row;

    row = atLevel(e =>
        e.subclassCategoryNumber === 0 || e.subclassCategoryNumber === sc
    );
    if (row) return row;

    return atLevel(e =>
        e.subclassCategoryNumber === 0 || !e.subclassCategoryNumber
    ) || null;
}
