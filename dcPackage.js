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
// Ersteller-Uploads: Consumer deklarieren direkte Deps (Spell-/Feat-Bibliothek).
// Transitive Kette: Feat-Bib → Spell-Bib; Class → Feat-Bib (Variante A).
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

/** Slug eines registrierten Custom-Hintergrunds (translationLabel oder slug). */
function getRegisteredCustomBackgroundSlug(bg) {
    if (!bg) return null;
    const slug = bg.slug || bg.translationLabel || null;
    return slug ? String(slug) : null;
}

/**
 * Kandidaten aus eingebetteter customBackgroundRuntime (Pending-Import-Basis / LS).
 * Level-Up / Charakterbogen: Snapshot-Hydrate zählt ohne erneuten Upload.
 */
function collectCustomBackgroundEmbeddedRuntimeCandidates(candidates) {
    const rawSources = [];
    const pendingBase = dcPendingPackageImport?.payload?.base;
    if (pendingBase?.customBackgroundRuntime) {
        rawSources.push(pendingBase.customBackgroundRuntime);
    }
    try {
        if (typeof localStorage !== "undefined") {
            const lsRaw = localStorage.getItem("customBackgroundRuntime");
            if (lsRaw) rawSources.push(lsRaw);
        }
    } catch (e) { /* ignore */ }

    rawSources.forEach(raw => {
        let parsed;
        try {
            parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch (e) {
            return;
        }
        if (typeof normalizeDcPackageInput !== "function") return;
        const norm = normalizeDcPackageInput(parsed);
        if (!norm.ok || !norm.payload) return;
        const slug = norm.payload.slug
            || norm.payload.compiledBackgroundListEntry?.translationLabel
            || null;
        const packageId = norm.envelope?.packageId || norm.payload.packageId || null;
        if (!slug && !packageId) return;
        candidates.push({
            packageId: packageId || null,
            slug: slug ? String(slug) : null
        });
    });
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

    if (opts && opts.requireFreshUpload) {
        return isDcPackageDependencySatisfiedViaFreshUpload(dep);
    }

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
            const regSlug = getRegisteredCustomBackgroundSlug(
                typeof registeredCustomBackground !== "undefined" ? registeredCustomBackground : null
            );
            if (regSlug) {
                candidates.push({
                    packageId: registeredCustomBackground.packageId || null,
                    slug: regSlug
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

        // Eingebettete Runtime im Bogen-Snapshot (Level-Up / Import ohne Neu-Upload)
        if (!forImport
            || dcPendingPackageImport?.detectedType === DC_PACKAGE_TYPE.CHARACTER_SHEET) {
            collectCustomBackgroundEmbeddedRuntimeCandidates(candidates);
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

    if (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
        const candidates = [];
        const pendingSp = getDcPendingImportCandidate(DC_PACKAGE_TYPE.CUSTOM_SPECIES);
        if (pendingSp) candidates.push(pendingSp);

        const allowSession = !forImport
            || wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_SPECIES);
        if (allowSession) {
            if (typeof registeredCustomSpecies !== "undefined"
                && registeredCustomSpecies?.translationLabel) {
                candidates.push({
                    packageId: registeredCustomSpecies.packageId || null,
                    slug: String(registeredCustomSpecies.translationLabel)
                });
            }
            if (typeof sheetCustomSpeciesRuntime !== "undefined"
                && sheetCustomSpeciesRuntime?.slug) {
                candidates.push({
                    packageId: sheetCustomSpeciesRuntime.packageId || null,
                    slug: String(sheetCustomSpeciesRuntime.slug)
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

/** Optionen für Dependency-Prüfung im ausstehenden Import-Modal. */
function getDcPendingImportDependencyCheckOpts() {
    const opts = { forImport: true };
    if (dcPendingPackageImport?.requireFreshUpload) {
        opts.requireFreshUpload = true;
    }
    return opts;
}

/**
 * Stufenaufstieg / erzwungener Neu-Upload: nur Dateien aus dem aktuellen Modal zählen
 * (kein Session-Mark, kein LS-Hydrate).
 */
function isDcPackageDependencySatisfiedViaFreshUpload(dep) {
    if (!dep || !dep.packageType) return true;
    if (dep.packageType === "phbClass" || dep.packageType === "phbSubclass") return true;

    const fulfilled = dcPendingPackageImport?.fulfilledUploads?.[dep.packageType];
    if (!fulfilled) return false;

    const wantId = dep.packageId ? String(dep.packageId) : null;
    if (wantId) {
        if (!fulfilled.packageId || String(fulfilled.packageId) !== wantId) return false;
    }

    if (dep.slug
        && (dep.packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
            || dep.packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME)) {
        if (!fulfilled.slug || String(fulfilled.slug) !== String(dep.slug)) return false;
    }

    return true;
}

/** Nach erfolgreichem Dependency-Upload im Fresh-Upload-Modus merken. */
function recordDcPackageFreshUploadFulfillment(packageType, envelope, payload) {
    if (!dcPendingPackageImport?.requireFreshUpload || !packageType) return;
    if (!dcPendingPackageImport.fulfilledUploads) {
        dcPendingPackageImport.fulfilledUploads = {};
    }
    let slug = null;
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME) {
        slug = payload?.coreTraits?.translationLabel
            || payload?.slug
            || null;
    }
    dcPendingPackageImport.fulfilledUploads[packageType] = {
        packageId: envelope?.packageId || payload?.packageId || null,
        slug: slug ? String(slug) : null
    };
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
    customSubclass: false,
    customSpecies: false
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
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
        dcSessionUserLoadedPackages.customSpecies = true;
    }
    // Hub-Grün erst nach Session-Mark (register* ruft oft vorher updateStep1CustomHub auf)
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
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
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
        return !!dcSessionUserLoadedPackages.customSpecies;
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
        "customSubclassRuntime",
        "customSpeciesRuntime"
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
    } else if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
        base = tDcPackage("dcPackageDepBtnCustomSpeciesLabel", "Custom-Volk");
    } else {
        return getDcPackageTypeLabel(packageType);
    }

    if (packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME
        || packageType === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND
        || packageType === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
        || packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
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
    return getUnsatisfiedDcPackageDependencies(
        required,
        getDcPendingImportDependencyCheckOpts()
    ).length === 0;
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
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
        const wrapped = wrapDcPackageForSheetStorage(payload, envelope);
        if (typeof registerCustomSpeciesInRuntime === "function") {
            registerCustomSpeciesInRuntime(wrapped);
            mergeLinkedPackageIntoPendingCharacterSheet("customSpeciesRuntime", wrapped);
            return true;
        }
        if (typeof hydrateCustomSpeciesRuntime === "function") {
            const ok = !!hydrateCustomSpeciesRuntime(wrapped);
            if (ok) {
                mergeLinkedPackageIntoPendingCharacterSheet("customSpeciesRuntime", wrapped);
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
            const satisfied = isDcPackageDependencySatisfied(
                dep,
                getDcPendingImportDependencyCheckOpts()
            );
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
    recordDcPackageFreshUploadFulfillment(packageType, result.envelope, result.payload);
    mergeNestedDepsIntoPendingImport(result.envelope, result.payload, packageType);
    if (event?.target) event.target.value = "";
    // Modal bleibt offen — Button wird grün, Bestätigen ggf. aktiv (Hub via markDcPackageUserLoaded)
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
    const requireFreshUpload = !!opts.requireFreshUpload;
    // optional: feste Pflichtliste (z. B. fehlende eingebettete Bogen-Deps)
    const seedDeps = Array.isArray(opts.requiredDeps)
        ? opts.requiredDeps
        : ((typeof collectEffectiveDcPackageDependencies === "function")
            ? collectEffectiveDcPackageDependencies(envelope, payload, detectedType)
            : (envelope?.dependencies || []));

    // Stufenaufstieg: immer Modal + Neu-Upload, auch wenn Paket schon in Session/LS liegt
    if (requireFreshUpload) {
        const required = (Array.isArray(seedDeps) ? seedDeps : [])
            .filter(d => d && d.required !== false && d.packageType
                && d.packageType !== "phbClass"
                && d.packageType !== "phbSubclass");
        if (!required.length) {
            opts.onApply(payload, envelope);
            return;
        }
        const byType = new Map();
        required.forEach(d => {
            if (!byType.has(d.packageType)) byType.set(d.packageType, d);
        });
        dcPendingPackageImport = {
            envelope,
            payload,
            detectedType,
            onApply: opts.onApply,
            onCancel: opts.onCancel || null,
            requiredDeps: Array.from(byType.values()),
            requireFreshUpload: true,
            fulfilledUploads: {}
        };
        refreshDcPackageLinkedFilesModal();
        return;
    }

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
 * @param {{ envelope?: object, payload?: object, packageType?: string }} [uploadMeta]
 * @returns {boolean} true = es gab einen Pending-Import
 */
function notifyDcPackageDependencyPossiblyResolved(uploadMeta) {
    if (!dcPendingPackageImport) return false;
    if (uploadMeta && uploadMeta.packageType) {
        mergeNestedDepsIntoPendingImport(
            uploadMeta.envelope || null,
            uploadMeta.payload || null,
            uploadMeta.packageType
        );
    }
    refreshDcPackageLinkedFilesModal();
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
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

//=======================================================================
// Custom-Referenzen scannen (Export + Import-Fallback)
//=======================================================================

function getDcCustomSpellIdMin() {
    return (typeof CUSTOM_SPELL_ID_MIN !== "undefined")
        ? CUSTOM_SPELL_ID_MIN
        : 1000;
}

function getDcCustomFeatIdMin() {
    return (typeof CUSTOM_FEAT_ID_MIN !== "undefined")
        ? CUSTOM_FEAT_ID_MIN
        : 1000;
}

function isDcCustomSpellId(id) {
    const n = Number(id);
    return Number.isFinite(n) && n >= getDcCustomSpellIdMin();
}

function isDcCustomFeatId(id) {
    const n = Number(id);
    return Number.isFinite(n) && n >= getDcCustomFeatIdMin();
}

function resolveDcSpellEntryByLabel(label) {
    if (!label) return null;
    const list = (typeof getEffectiveSpellList === "function")
        ? getEffectiveSpellList()
        : ((typeof spellList !== "undefined" && Array.isArray(spellList)) ? spellList : []);
    return list.find(s => s && s.translationLabel === label) || null;
}

function resolveDcFeatEntryByLabel(label) {
    if (!label) return null;
    const feats = (typeof getEffectiveFeatList === "function")
        ? getEffectiveFeatList()
        : ((typeof featList !== "undefined" && Array.isArray(featList)) ? featList : []);
    return feats.find(f => f && f.translationLabel === label) || null;
}

function isDcCustomSpellLabel(label) {
    const sp = resolveDcSpellEntryByLabel(label);
    if (!sp) return false;
    if (typeof isCustomContentSpell === "function") return isCustomContentSpell(sp);
    return !!sp.isCustom;
}

function isDcCustomFeatLabel(label) {
    const f = resolveDcFeatEntryByLabel(label);
    if (!f) return false;
    if (typeof isCustomContentFeat === "function") return isCustomContentFeat(f);
    return !!f.isCustom;
}

/** true = Talent-Label gehört zur PHB-featList. */
function isDcPhbFeatLabel(label) {
    if (!label) return false;
    const feats = (typeof featList !== "undefined" && Array.isArray(featList)) ? featList : [];
    return feats.some(f => f && f.translationLabel === label && !f.isCustom);
}

/** Talent-Referenz aus Payload (Export/Import). */
function isDcPayloadFeatReference(label) {
    if (!label) return false;
    if (typeof isDcCustomFeatLabel === "function" && isDcCustomFeatLabel(label)) return true;
    if (!isDcPhbFeatLabel(label)) return true;
    return false;
}

/** true = Zauber-Label gehört zur PHB-spellList (kein Bibliotheks-/Custom-Zauber). */
function isDcPhbSpellLabel(label) {
    if (!label) return false;
    const list = (typeof spellList !== "undefined" && Array.isArray(spellList)) ? spellList : [];
    return list.some(s => s && s.translationLabel === label && !s.isCustom);
}

/**
 * Keine echten Zauber-Labels — Sentinel/Platzhalter in magicSkills / Compile.
 * Dürfen keine Zauberbibliothek-Dependency auslösen.
 */
const DC_NON_SPELL_REFERENCE_LABELS = Object.freeze(new Set([
    "subclassSpellsList",
    "0",
    "null",
    "undefined"
]));

function isDcNonSpellReferenceLabel(label) {
    if (label == null) return true;
    const s = String(label).trim();
    if (!s) return true;
    return DC_NON_SPELL_REFERENCE_LABELS.has(s);
}

/** Zauber-Referenz aus Payload: Custom-Bib-Zauber oder unbekannter Spell-Label (nicht Sentinel). */
function isDcPayloadSpellReference(label) {
    if (!label || isDcNonSpellReferenceLabel(label)) return false;
    if (typeof isDcCustomSpellLabel === "function" && isDcCustomSpellLabel(label)) return true;
    if (!isDcPhbSpellLabel(label)) return true;
    return false;
}

/** Zauber-Labels aus LF optionsConfig (getCantrip / getPreparedSpell / …). */
function collectDcSpellLabelsFromLfOptionsConfig(cfg, category) {
    const out = [];
    if (!cfg || typeof cfg !== "object") return out;
    const cat = String(category || "");
    if (cat === "getCantrip" || cat === "chooseCantrip") {
        (cfg.selectedSpells || []).filter(Boolean).forEach(l => out.push(String(l)));
    }
    if (cat === "getPreparedSpell" || cat === "choosePreparedSpell" || cat === "subclassSpells") {
        (cfg.selectedSpells || []).filter(Boolean).forEach(l => out.push(String(l)));
        const byLevel = cfg.selectedByLevel || {};
        Object.keys(byLevel).forEach(lvl => {
            (byLevel[lvl] || []).filter(Boolean).forEach(l => out.push(String(l)));
        });
    }
    if (cfg.spellLabel) out.push(String(cfg.spellLabel));
    return out;
}

/**
 * LF-Slots (Class / UC / Species / Feat) nach Custom-Spell-/Feat-Referenzen durchsuchen.
 * @param {object} scanResult { spellIds, featIds, spellLabels, featLabels } mit Sets oder Arrays
 */
function walkDcLfSlotsForCustomRefs(slots, scanResult) {
    if (!Array.isArray(slots) || !scanResult) return;
    const spellIds = scanResult.spellIds instanceof Set ? scanResult.spellIds : null;
    const featIds = scanResult.featIds instanceof Set ? scanResult.featIds : null;
    const spellLabels = scanResult.spellLabels instanceof Set ? scanResult.spellLabels : null;
    const featLabels = scanResult.featLabels instanceof Set ? scanResult.featLabels : null;
    const pushSpellId = (id) => {
        if (!isDcCustomSpellId(id)) return;
        if (spellIds) spellIds.add(Number(id));
        else if (Array.isArray(scanResult.spellIds)) scanResult.spellIds.push(Number(id));
    };
    const pushFeatId = (id) => {
        if (!isDcCustomFeatId(id)) return;
        if (featIds) featIds.add(Number(id));
        else if (Array.isArray(scanResult.featIds)) scanResult.featIds.push(Number(id));
    };
    const pushSpellLabel = (lab) => {
        if (!lab) return;
        if (spellLabels) spellLabels.add(String(lab));
        else if (Array.isArray(scanResult.spellLabels)) scanResult.spellLabels.push(String(lab));
    };
    const pushFeatLabel = (lab) => {
        if (!lab) return;
        if (featLabels) featLabels.add(String(lab));
        else if (Array.isArray(scanResult.featLabels)) scanResult.featLabels.push(String(lab));
    };

    slots.forEach(slot => {
        const p = slot && slot.payload;
        if (!p) return;
        const cfg = p.optionsConfig || {};
        if (p.featureType === "spellcraft") {
            collectDcSpellLabelsFromLfOptionsConfig(cfg, p.category).forEach(pushSpellLabel);
        }
        if (p.featureType === "options" && p.category === "fightingStyle") {
            (cfg.selectedFeatLabels || []).filter(Boolean).forEach(pushFeatLabel);
        }
        if (p.featureType === "options" && p.category === "asiAndFeat") {
            (cfg.selectedFeatLabels || []).filter(Boolean).forEach(pushFeatLabel);
        }
        if (p.featureType === "simple" && p.category === "originFeats") {
            (cfg.selectedFeats || []).filter(Boolean).forEach(pushFeatLabel);
        }
        if (p.featureType === "options" && p.category === "originFeats") {
            (cfg.selectedFeats || []).filter(Boolean).forEach(pushFeatLabel);
        }
    });
}

/** Payload rekursiv scannen (Import-Fallback ohne Envelope-Deps). */
function scanDcPayloadCustomReferences(payload) {
    const spellIds = new Set();
    const featIds = new Set();
    const spellLabels = new Set();
    const featLabels = new Set();

    function visit(val, key) {
        if (val == null) return;
        const k = String(key || "").toLowerCase();

        if (typeof val === "number" || (typeof val === "string" && /^\d+$/.test(String(val).trim()))) {
            const n = Number(val);
            if (!Number.isFinite(n)) return;
            if (k === "selectedspellids" || k === "spellid" || k.endsWith("spellid")) {
                if (isDcCustomSpellId(n)) spellIds.add(n);
            } else if (k === "fightingstyleid" || k === "featsget") {
                if (isDcCustomFeatId(n)) featIds.add(n);
            } else if (k === "featlabel" && isDcCustomFeatId(n)) {
                featIds.add(n);
            }
            return;
        }

        if (typeof val === "string") {
            if (k === "bgfeat") featLabels.add(val);
            if (k === "spelllabel") spellLabels.add(val);
            return;
        }

        if (Array.isArray(val)) {
            if (k === "selectedspellids") {
                val.forEach(v => { if (isDcCustomSpellId(v)) spellIds.add(Number(v)); });
                return;
            }
            if (k === "fightingstyleid" || k === "featsget") {
                val.forEach(v => { if (isDcCustomFeatId(v)) featIds.add(Number(v)); });
                return;
            }
            if (k === "getspecificspell") {
                val.forEach(v => {
                    if (typeof v === "string") {
                        if (isDcNonSpellReferenceLabel(v)) return;
                        spellLabels.add(v);
                    } else if (isDcCustomSpellId(v)) {
                        spellIds.add(Number(v));
                    }
                });
                return;
            }
            if (k === "selectedspells" || k === "selectedfeatlabels" || k === "selectedfeats") {
                val.forEach(v => {
                    if (typeof v !== "string") return;
                    if (k === "selectedspells") spellLabels.add(v);
                    else featLabels.add(v);
                });
                return;
            }
            val.forEach(item => visit(item, key));
            return;
        }

        if (typeof val === "object") {
            Object.keys(val).forEach(subKey => visit(val[subKey], subKey));
        }
    }

    visit(payload, null);

    return {
        spellIds: Array.from(spellIds),
        featIds: Array.from(featIds),
        spellLabels: Array.from(spellLabels),
        featLabels: Array.from(featLabels)
    };
}

function resolveDcSessionSpellPackId() {
    if (typeof registeredCustomSpellPack !== "undefined" && registeredCustomSpellPack?.packageId) {
        return registeredCustomSpellPack.packageId;
    }
    if (typeof customSpellEditorState !== "undefined" && customSpellEditorState?.packageId) {
        return customSpellEditorState.packageId;
    }
    if (typeof sheetCustomSpellPackRuntime !== "undefined" && sheetCustomSpellPackRuntime?.packageId) {
        return sheetCustomSpellPackRuntime.packageId;
    }
    return null;
}

function resolveDcSessionFeatPackId() {
    if (typeof registeredCustomFeatPack !== "undefined" && registeredCustomFeatPack?.packageId) {
        return registeredCustomFeatPack.packageId;
    }
    if (typeof customFeatEditorState !== "undefined" && customFeatEditorState?.packageId) {
        return customFeatEditorState.packageId;
    }
    if (typeof sheetCustomFeatPackRuntime !== "undefined" && sheetCustomFeatPackRuntime?.packageId) {
        return sheetCustomFeatPackRuntime.packageId;
    }
    return null;
}

function mergeDcPackageDependencies(deps) {
    const byType = new Map();
    (Array.isArray(deps) ? deps : []).forEach(d => {
        if (!d || !d.packageType) return;
        if (d.packageType === "phbClass" || d.packageType === "phbFeat" || d.packageType === "phbSubclass") {
            return;
        }
        const existing = byType.get(d.packageType);
        if (!existing) {
            byType.set(d.packageType, Object.assign({}, d));
            return;
        }
        if (d.packageId && !existing.packageId) {
            byType.set(d.packageType, Object.assign({}, existing, {
                packageId: d.packageId,
                verificationCode: d.verificationCode || existing.verificationCode
            }));
        }
    });
    return Array.from(byType.values());
}

/**
 * Consumer → Zauberbibliothek bei referenzierten Custom-Spell-IDs.
 */
function buildConsumerSpellPackDependencies(opts) {
    const o = opts || {};
    const refs = Array.isArray(o.referencedSpellIds) ? o.referencedSpellIds : [];
    const labels = Array.isArray(o.referencedSpellLabels) ? o.referencedSpellLabels : [];
    if (!refs.length && !labels.length) return [];

    let packageId = o.packageId || null;
    if (!packageId) {
        packageId = resolveDcSessionSpellPackId();
    }

    return [{
        packageType: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
        packageId: packageId || null,
        required: true
    }];
}

/**
 * Consumer → Talentbibliothek bei referenzierten Custom-Feat-IDs/-Labels.
 */
function buildConsumerFeatPackDependencies(opts) {
    const o = opts || {};
    const ids = Array.isArray(o.referencedFeatIds) ? o.referencedFeatIds : [];
    const labels = Array.isArray(o.referencedFeatLabels) ? o.referencedFeatLabels : [];
    if (!ids.length && !labels.length) return [];

    let packageId = o.packageId || null;
    if (!packageId) {
        packageId = resolveDcSessionFeatPackId();
    }

    return [{
        packageType: DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK,
        packageId: packageId || null,
        required: true
    }];
}

/**
 * Scan-Ergebnis → Envelope-Dependencies (direkt, Variante A).
 */
function buildDcPackageDepsFromCustomRefs(scanResult, opts) {
    const o = opts || {};
    const scan = scanResult || {};
    const deps = [];
    const spellIds = Array.isArray(scan.spellIds) ? scan.spellIds.slice() : [];
    const featIds = Array.isArray(scan.featIds) ? scan.featIds.slice() : [];
    const spellLabels = Array.isArray(scan.spellLabels) ? scan.spellLabels : [];
    const featLabels = Array.isArray(scan.featLabels) ? scan.featLabels : [];
    const payloadSpellLabels = [];

    spellLabels.forEach(lab => {
        if (!isDcPayloadSpellReference(lab)) return;
        payloadSpellLabels.push(lab);
        const sp = resolveDcSpellEntryByLabel(lab);
        if (sp && sp.ID != null) spellIds.push(Number(sp.ID));
    });
    featLabels.forEach(lab => {
        if (!isDcPayloadFeatReference(lab)) return;
        const f = resolveDcFeatEntryByLabel(lab);
        if (f && f.ID != null) featIds.push(Number(f.ID));
    });

    const uniqSpellIds = [...new Set(spellIds.filter(id => isDcCustomSpellId(id)))];
    const uniqFeatIds = [...new Set(featIds.filter(id => isDcCustomFeatId(id)))];
    const uniqPayloadSpellLabels = [...new Set(payloadSpellLabels)];

    if (uniqSpellIds.length || uniqPayloadSpellLabels.length) {
        deps.push(...buildConsumerSpellPackDependencies({
            referencedSpellIds: uniqSpellIds,
            referencedSpellLabels: uniqPayloadSpellLabels,
            packageId: o.spellPackId || resolveDcSessionSpellPackId()
        }));
    }
    if (uniqFeatIds.length || featLabels.some(lab => isDcPayloadFeatReference(lab))) {
        deps.push(...buildConsumerFeatPackDependencies({
            referencedFeatIds: uniqFeatIds,
            referencedFeatLabels: featLabels.filter(lab => isDcPayloadFeatReference(lab)),
            packageId: o.featPackId || resolveDcSessionFeatPackId()
        }));
    }
    if (Array.isArray(o.extraDeps)) {
        deps.push(...o.extraDeps);
    }
    return mergeDcPackageDependencies(deps);
}

/**
 * Verschachtelte Deps aus hochgeladenem Paket (Import-Kette).
 * Feat-Bib → Zauber-Bib; Envelope hat Vorrang, Payload-Scan ergänzt.
 */
function collectNestedDcPackageDependencies(envelope, payload, uploadedType) {
    if (uploadedType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
        return [];
    }

    let deps = mergeDcPackageDependencies(Array.isArray(envelope?.dependencies)
        ? envelope.dependencies.slice()
        : []);

    const scanned = scanDcPayloadCustomReferences(payload);
    const scannedDeps = buildDcPackageDepsFromCustomRefs(scanned, { forImport: true });

    scannedDeps.forEach(d => {
        if (!d || !d.packageType) return;
        if (uploadedType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
            && d.packageType !== DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK) {
            return;
        }
        if (!deps.some(x => x && x.packageType === d.packageType)) {
            deps.push(d);
        }
    });

    if (uploadedType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        deps = deps.filter(d =>
            d && d.packageType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
        );
    }

    return mergeDcPackageDependencies(deps);
}

/**
 * Nach Dependency-Upload: verschachtelte Deps aus hochgeladenem Paket in Modal übernehmen.
 */
function mergeNestedDepsIntoPendingImport(envelope, payload, uploadedType) {
    if (!dcPendingPackageImport || !uploadedType) return;
    const nested = collectNestedDcPackageDependencies(envelope, payload, uploadedType);
    if (!nested.length) return;
    const byType = new Map();
    const current = getPendingDcPackageRequiredDependencies();
    current.forEach(d => {
        if (d && d.packageType) byType.set(d.packageType, d);
    });
    nested.forEach(d => {
        if (!d || !d.packageType || d.required === false) return;
        if (d.packageType === "phbClass" || d.packageType === "phbFeat" || d.packageType === "phbSubclass") {
            return;
        }
        if (!byType.has(d.packageType)) {
            byType.set(d.packageType, d);
        } else if (d.packageId && !byType.get(d.packageType).packageId) {
            byType.set(d.packageType, Object.assign({}, byType.get(d.packageType), {
                packageId: d.packageId,
                verificationCode: d.verificationCode
            }));
        }
    });
    dcPendingPackageImport.requiredDeps = Array.from(byType.values());
}

/**
 * Class → Bibliothek: Legacy-Alias (wird durch buildCustomClassPackageDependencies ersetzt).
 */
function buildCustomClassSpellPackDependencies(state) {
    if (typeof buildCustomClassPackageDependencies === "function") {
        return buildCustomClassPackageDependencies(state);
    }
    return [];
}

/**
 * Effektive Dependencies: Envelope + Payload-Scan-Fallback.
 * Bibliothek bleibt Blatt (keine Consumer-Deps nach oben).
 */
function collectEffectiveDcPackageDependencies(envelope, payload, detectedType) {
    let deps = mergeDcPackageDependencies(Array.isArray(envelope?.dependencies)
        ? envelope.dependencies.slice()
        : []);

    const scanned = scanDcPayloadCustomReferences(payload);
    const scannedDeps = buildDcPackageDepsFromCustomRefs(scanned, {});

    scannedDeps.forEach(d => {
        if (!d || !d.packageType) return;
        if (detectedType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
            || detectedType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
            return;
        }
        if (!deps.some(x => x && x.packageType === d.packageType)) {
            deps.push(d);
        }
    });

    if (detectedType === DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
        || detectedType === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK) {
        deps = deps.filter(d => {
            const pt = d && d.packageType;
            return !(pt === DC_PACKAGE_TYPE.CUSTOM_CLASS
                || pt === DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME
                || pt === DC_PACKAGE_TYPE.CUSTOM_SUBCLASS
                || pt === DC_PACKAGE_TYPE.CUSTOM_FEAT
                || pt === DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK
                || pt === DC_PACKAGE_TYPE.CUSTOM_SPECIES
                || pt === DC_PACKAGE_TYPE.CUSTOM_BACKGROUND);
        });
    }

    return mergeDcPackageDependencies(deps);
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
            return;
        }
        if (type === DC_PACKAGE_TYPE.CUSTOM_SPECIES && !base.customSpeciesRuntime) {
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
    if ((raw.type === "customSpecies" || raw.type === "customSpeciesRuntime")
        && raw.slug && raw.compiledSpeciesListEntry) {
        return DC_PACKAGE_TYPE.CUSTOM_SPECIES;
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
    if (packageType === DC_PACKAGE_TYPE.CUSTOM_SPECIES) {
        const okType = payload.type === "customSpecies" || payload.type === "customSpeciesRuntime";
        if (!okType || !payload.slug || !payload.compiledSpeciesListEntry) {
            return { ok: false, errorCode: "invalidCustomSpecies" };
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
        ],
        invalidCustomSpecies: [
            "dcPackageInvalidCustomSpeciesLabel",
            "Die Datei ist kein gültiges Custom-Volk."
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
            || norm.payload?.compiledSpeciesListEntry?.translationLabel
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

    // Custom Species Runtime → Abhängigkeit zum Species-Paket
    pushFromRuntime(
        baseStorage.customSpeciesRuntime,
        DC_PACKAGE_TYPE.CUSTOM_SPECIES,
        DC_PACKAGE_TYPE.CUSTOM_SPECIES
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
    const speciesRaw = baseStorage.feat_species;
    if (speciesRaw != null) {
        let speciesIds = [];
        try {
            speciesIds = typeof speciesRaw === "string" ? JSON.parse(speciesRaw) : speciesRaw;
        } catch (e) {
            speciesIds = speciesRaw;
        }
        if (Array.isArray(speciesIds)) {
            speciesIds.forEach(id => { if (id != null) ids.push(id); });
        } else if (speciesIds != null) {
            ids.push(speciesIds);
        }
    }
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

/** Merkmals-Label ist Zauberwirken / Paktmagie (String oder Array). */
function featureLabelIsSpellcastingOrPact(label) {
    if (!label) return false;
    const parts = Array.isArray(label) ? label : [label];
    return parts.some(l => l === "spellcastingLabel" || l === "pactMagicLabel");
}

/**
 * Klasse/UC hat bis zur Stufe ein spellcastingLabel oder pactMagicLabel
 * (Scope: Basismerkmale subclass 0 und/oder gewählte UC).
 * Kein SSpSL-Fallback — Fighter/Rogue denormalisieren EK-/AT-Slots auf Basiszeilen.
 */
function classDataHasSpellcastingOrPactMagic(classDataArray, characterLevel, subclassCategoryNumber) {
    if (!Array.isArray(classDataArray)) return false;
    const level = Number(characterLevel) || 0;
    const sc = subclassCategoryNumber != null ? parseInt(subclassCategoryNumber, 10) : 0;
    return classDataArray.some(r =>
        r
        && Number(r.level) <= level
        && (r.subclassCategoryNumber === 0 || r.subclassCategoryNumber === sc)
        && featureLabelIsSpellcastingOrPact(r.translationLabel)
    );
}

/**
 * Darf der Charakter Klassen-Zauberplätze anzeigen?
 * — coreTraits.spellcastingLabel (Full-Caster-Basisklasse)
 * — oder ClassData: spellcastingLabel / pactMagicLabel in Basis oder gewählter UC
 * (PHB + Custom Class/UC). Talente allein gewähren keine Slot-Progression.
 */
function characterHasSpellSlotProgression(className, subclassCategoryNumber, characterLevel) {
    if (!className) return false;
    const level = Number(characterLevel) || 1;
    const sc = subclassCategoryNumber != null ? parseInt(subclassCategoryNumber, 10) : 0;

    if (typeof classCoreTraitsList !== "undefined" && Array.isArray(classCoreTraitsList)) {
        const coreTrait = classCoreTraitsList.find(c =>
            c && String(c.translationLabel || "").toLowerCase() === String(className).toLowerCase()
        );
        if (coreTrait && coreTrait.spellcastingLabel === 1) return true;
    }

    const classDataArray = (typeof getClassDataArray === "function")
        ? getClassDataArray(className)
        : (typeof getClassData === "function" ? getClassData(String(className).toLowerCase()) : null);
    return classDataHasSpellcastingOrPactMagic(classDataArray, level, sc);
}

/**
 * Eine konsistente Slot-/Progressionszeile für Charakterstufe + gewählte UC.
 * UC-Caster zuerst; PHB-EK/AT fallen auf Basis zurück, wenn die UC auf 19/20 keine eigene Zeile hat.
 * Nicht-Zauberwirker-UCs (z. B. Kampfmeister) erben keine denormalisierten Basis-Slots.
 */
function resolveClassLevelSpellResourceRow(classDataArray, characterLevel, subclassCategoryNumber) {
    if (!Array.isArray(classDataArray)) return null;
    const level = Number(characterLevel) || 0;
    const sc = subclassCategoryNumber != null ? parseInt(subclassCategoryNumber, 10) : 0;
    const atLevel = (pred) => classDataArray.find(entry =>
        entry && Number(entry.level) === level && pred(entry)
    );

    const baseIsCaster = classDataHasSpellcastingOrPactMagic(classDataArray, level, 0);
    const ucIsCaster = sc > 0 && classDataArray.some(r =>
        r
        && Number(r.level) <= level
        && r.subclassCategoryNumber === sc
        && featureLabelIsSpellcastingOrPact(r.translationLabel)
    );
    const mayUseBaseSpellResources = baseIsCaster || ucIsCaster;

    if (sc > 0) {
        const scRow = atLevel(e =>
            e.subclassCategoryNumber === sc && classDataRowHasSpellResources(e)
        );
        if (scRow) return scRow;

        if (mayUseBaseSpellResources) {
            const baseRes = atLevel(e =>
                (e.subclassCategoryNumber === 0 || !e.subclassCategoryNumber)
                && classDataRowHasSpellResources(e)
            );
            if (baseRes) return baseRes;
        }

        const scAny = atLevel(e => e.subclassCategoryNumber === sc);
        if (scAny) return scAny;
        return atLevel(e => e.subclassCategoryNumber === 0 || !e.subclassCategoryNumber) || null;
    }

    let row = atLevel(e =>
        (e.subclassCategoryNumber === 0 || !e.subclassCategoryNumber)
        && classDataRowHasSpellResources(e)
    );
    if (row) return row;

    return atLevel(e =>
        e.subclassCategoryNumber === 0 || !e.subclassCategoryNumber
    ) || null;
}
