//=======================================================================
// Custom Spell Builder (customFeatures/spellBuilder.js)
//=======================================================================
// Eigenständige Zauberbibliothek (Schritt 7+): Chooser, Editor
// (Tab 1 Übersicht / Tab 2 Details), Compile/Export, Runtime-Registrierung.
// Bibliothek = Blatt in der Hierarchie (keine Consumer-Rückverweise).
//
// Flags / Visibility: customFeatures/shared.js (zuerst laden).
// Shared Utilities:   tCC, renderLangAvailabilityRowHtml (classBuilder.js)
// Bogen-Runtime:      customFeatures/customFeaturesSheet.js
// Pakete / Graph:     dcPackage.js (Projektroot)
//=======================================================================

//=======================================================================
// CUSTOM_SPELL_CONFIG – zentrale Schnell-Einstellungen
//=======================================================================
const CUSTOM_SPELL_CONFIG = Object.freeze({
    /** Erste freie Custom-Spell-ID (PHB liegt darunter) */
    idMin: 1000,
    /** Max. Zauber pro Bibliothek / Session */
    maxSpellsPerPack: 100,
    /** Max. Zeichen Name (pro Sprache) */
    nameMax: 30,
    /** Max. Zeichen Beschreibung (pro Sprache) */
    descMax: 2000,
    /** Max. Zeichen Materialkomponente */
    materialMax: 50,
    /** Max. Zahlwert Reichweite (UI; intern Feet) */
    rangeValueMax: 999,
    /** Max. Flächenwert (UI; intern immer Feet) */
    areaMax: 999,
    /**
     * DE-Anzeige: Feet → Meter (PHB-DE-Faktor, z. B. 60 ft → 18 m).
     * Intern speichern wir immer Feet (außer self/touch/mile).
     */
    feetToMetersFactor: 0.3,
    /** LocalStorage-Schlüssel Runtime (Ersteller → Bogen) */
    lsKey: "customSpellPackRuntime",
    /** Dateiname-Präfix beim Export: custom_spells_<Datum> */
    filenamePrefix: "custom_spells"
});

const CSP_CONFIG = CUSTOM_SPELL_CONFIG;
const CUSTOM_SPELL_ID_MIN = CUSTOM_SPELL_CONFIG.idMin;
const CUSTOM_SPELL_PACK_LS_KEY = CUSTOM_SPELL_CONFIG.lsKey;

//=======================================================================
// State / Session
//=======================================================================

/** Editor offen (Chooser vs. Editor) */
let customSpellEditorOpen = false;
/** Aktiver Editor-Tab (1 = Übersicht, 2 = Details) */
let customSpellActiveTab = 1;
/** Editor-State (null = kein aktiver Editor) */
let customSpellEditorState = null;
/** Snapshot nach Import/Save – kein Re-Download ohne Änderung */
let customSpellImportSnapshot = null;
/** ID des aktuell in Tab 2 bearbeiteten Zaubers (null = neu) */
let customSpellEditingId = null;
/** Entwurfs-State für Tab-2-Maske (null = keine Detailbearbeitung) */
let customSpellDraft = null;
/** Nur UI: Filter der Übersichtstabelle (kein Einfluss auf Speichern/Export) */
let cspOverviewFilters = { level: "", school: "", search: "" };

/**
 * Ein aktives Spell-Pack pro Session (Runtime).
 * @type {{
 *   packageId: string|null,
 *   verificationCode: string|null,
 *   spells: object[],
 *   translations: { de: object, en: object },
 *   availableLanguages: string[],
 *   nextId: number,
 *   rawPayload: object|null,
 *   envelope: object|null
 * }}
 */
let registeredCustomSpellPack = {
    packageId: null,
    verificationCode: null,
    spells: [],
    translations: { de: {}, en: {} },
    availableLanguages: [],
    nextId: CUSTOM_SPELL_ID_MIN,
    rawPayload: null,
    envelope: null
};

/** Leerer Bibliotheks-Editor-State (keine Klassenbindung). */
function createEmptyCustomSpellPackState(_ignored) {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    return {
        packageId: null,
        packageCreatedAt: null,
        // Legacy-Felder — werden nicht mehr gesetzt
        linkedClassSlug: null,
        linkedSubclassSlug: null,
        linkedSubclassCategoryNumber: null,
        spellListLabels: [],
        availableLanguages: [active],
        spells: [],
        nextId: CUSTOM_SPELL_ID_MIN,
        translations: { de: {}, en: {} }
    };
}

function cloneCustomSpellPackState(src) {
    if (!src) return createEmptyCustomSpellPackState();
    return {
        packageId: src.packageId || null,
        packageCreatedAt: src.packageCreatedAt || null,
        // Bibliothek: keine Pack-Bindungsfelder (Legacy am Spell.classLabel bleibt)
        linkedClassSlug: null,
        linkedSubclassSlug: null,
        linkedSubclassCategoryNumber: null,
        spellListLabels: [],
        availableLanguages: Array.isArray(src.availableLanguages)
            ? src.availableLanguages.slice()
            : [(typeof currentLang !== "undefined" ? currentLang : "de")],
        spells: Array.isArray(src.spells)
            ? src.spells.map(s => (s && typeof s === "object" ? Object.assign({}, s, {
                components: Array.isArray(s.components) ? s.components.slice() : s.components,
                classLabel: Array.isArray(s.classLabel) ? s.classLabel.slice() : s.classLabel,
                spellFocus: Array.isArray(s.spellFocus) ? s.spellFocus.slice() : s.spellFocus,
                source: Array.isArray(s.source) ? s.source.slice() : s.source
            }) : s))
            : [],
        nextId: Number.isFinite(Number(src.nextId))
            ? Math.max(CUSTOM_SPELL_ID_MIN, parseInt(src.nextId, 10))
            : CUSTOM_SPELL_ID_MIN,
        translations: {
            de: Object.assign({}, src.translations?.de || {}),
            en: Object.assign({}, src.translations?.en || {})
        }
    };
}

/** Nächste freie Spell-ID im Pack (nach max vorhandener ID) */
function peekNextCustomSpellId(state) {
    const base = Math.max(CUSTOM_SPELL_ID_MIN, parseInt(state?.nextId, 10) || CUSTOM_SPELL_ID_MIN);
    let maxId = base - 1;
    (state?.spells || []).forEach(s => {
        const id = parseInt(s?.ID, 10);
        if (Number.isFinite(id) && id > maxId) maxId = id;
    });
    return Math.max(CUSTOM_SPELL_ID_MIN, maxId + 1);
}

//=======================================================================
// Reichweite: Feet intern ↔ Meter (DE-UI)
//=======================================================================

function cspFeetToDisplayMeters(feet) {
    const n = Number(feet);
    if (!Number.isFinite(n)) return 0;
    const factor = CSP_CONFIG.feetToMetersFactor || 0.3;
    return Math.round(n * factor * 10) / 10;
}

function cspDisplayMetersToFeet(meters) {
    const n = Number(meters);
    if (!Number.isFinite(n)) return 0;
    const factor = CSP_CONFIG.feetToMetersFactor || 0.3;
    if (!factor) return 0;
    return Math.round(n / factor);
}

function cspIsSpecialSpellRange(range) {
    return range === "selfLabel" || range === "touchLabel" || range === "mileLabel";
}

//=======================================================================
// Modal / Chooser
//=======================================================================

/**
 * „+“ in Schritt 7: Bibliotheks-Einstieg (vor der Masterliste).
 * Kein Caster-Gate — Auswahl in Schritt 7 bleibt über Listen/Features gefiltert.
 */
function insertCustomSpellStep7Button(parent) {
    if (!parent) return;
    if (typeof isCustomFeatureEnabled === "function"
        && !isCustomFeatureEnabled("customSpellBuilder")) {
        return;
    }

    const existing = document.getElementById("addCustomSpellWrap");
    if (existing) existing.remove();

    const wrap = document.createElement("div");
    wrap.id = "addCustomSpellWrap";
    wrap.className = "add-custom-spell-wrap cc-feature-enabled";
    wrap.setAttribute("aria-hidden", "false");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "addCustomSpellBtn";
    btn.className = "add-custom-spell-btn";
    btn.setAttribute("aria-label", "+");
    btn.textContent = "+";
    btn.onclick = function () {
        if (typeof openCustomSpellChooser === "function") openCustomSpellChooser();
    };
    wrap.appendChild(btn);
    parent.appendChild(wrap);

    if (typeof applyCspTranslations === "function") applyCspTranslations();
    else if (typeof applyCustomFeatureVisibility === "function") applyCustomFeatureVisibility();
}

function openCustomSpellChooser() {
    if (typeof isCustomFeatureEnabled === "function"
        && !isCustomFeatureEnabled("customSpellBuilder")) {
        return;
    }
    const overlay = document.getElementById("customSpellOverlay");
    if (!overlay) return;
    const chooser = document.getElementById("customSpellChooserView");
    const editor = document.getElementById("customSpellEditorView");
    if (chooser) chooser.style.display = "";
    if (editor) editor.style.display = "none";
    customSpellEditorOpen = false;
    customSpellEditingId = null;
    if (typeof setCustomFeatureModalChooserMode === "function") {
        setCustomFeatureModalChooserMode(overlay, true);
    }
    overlay.style.setProperty("display", "flex", "important");
    if (typeof applyLevelUpCustomBibRestrictions === "function") {
        applyLevelUpCustomBibRestrictions();
    }
    applyCspTranslations();
}

/**
 * true = Nutzer hat in dieser Seiten-Session ein Spell-Pack explizit
 * hochgeladen/gespeichert (nicht nur LocalStorage-Hydrate).
 */
function cspHasUserLoadedSpellPackThisSession() {
    if (typeof wasDcPackageUserLoadedThisSession === "function"
        && typeof DC_PACKAGE_TYPE !== "undefined") {
        return wasDcPackageUserLoadedThisSession(DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK);
    }
    return false;
}

function closeCustomSpellModal() {
    const overlay = document.getElementById("customSpellOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    customSpellEditorOpen = false;
}

function discardCustomSpellEditor() {
    customSpellEditorState = null;
    customSpellImportSnapshot = null;
    customSpellEditorOpen = false;
    customSpellEditingId = null;
    customSpellDraft = null;
    customSpellActiveTab = 1;
    const t1 = document.getElementById("customSpellTab1Content");
    const t2 = document.getElementById("customSpellTab2Content");
    if (t1) t1.innerHTML = "";
    if (t2) t2.innerHTML = "";
    closeCustomSpellModal();
}

function requestCloseCustomSpellModal() {
    if (customSpellEditorOpen && customSpellEditorState) {
        if (cspEditorHasUnsavedChanges()) {
            const msg = (typeof tCC === "function" && tCC("cspCloseConfirmLabel"))
                || "Ungespeicherte Änderungen an der Zauberbibliothek verwerfen?";
            if (!confirm(msg)) return;
        }
        discardCustomSpellEditor();
        return;
    }
    closeCustomSpellModal();
}

function cspEditorHasUnsavedChanges() {
    if (!customSpellEditorState) return false;
    const payload = buildCustomSpellPackExportPayload(customSpellEditorState);
    const snap = getCustomSpellPackExportSnapshotString(payload);
    if (customSpellImportSnapshot == null) {
        return (customSpellEditorState.spells || []).length > 0;
    }
    return snap !== customSpellImportSnapshot;
}

function showCustomSpellEditorView() {
    const overlay = document.getElementById("customSpellOverlay");
    const chooser = document.getElementById("customSpellChooserView");
    const editor = document.getElementById("customSpellEditorView");
    if (chooser) chooser.style.display = "none";
    if (editor) editor.style.display = "";
    customSpellEditorOpen = true;
    if (typeof setCustomFeatureModalChooserMode === "function" && overlay) {
        setCustomFeatureModalChooserMode(overlay, false);
    }
    resetCspOverviewFilters();
    applyCspTranslations();
    switchCustomSpellTab(1);
}

function startCustomSpellCreate() {
    // Bibliothek: leerer State ohne Klassenbindung (Option A)
    customSpellEditorState = createEmptyCustomSpellPackState(null);
    customSpellImportSnapshot = null;
    customSpellEditingId = null;
    customSpellDraft = null;
    showCustomSpellEditorView();
}

function triggerCustomSpellUpload() {
    const input = document.getElementById("customSpellFileInput");
    if (input) {
        input.value = "";
        input.click();
    }
}

async function handleCustomSpellFile(event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    let result;
    if (typeof readAndValidateDcPackageFile === "function") {
        result = await readAndValidateDcPackageFile(file, {
            expectedType: (typeof DC_PACKAGE_TYPE !== "undefined")
                ? DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
                : "customSpellPack"
        });
    } else {
        result = { ok: false, errorCode: "unknownFormat" };
    }

    if (!result?.ok) {
        alert(result?.message
            || (typeof tCC === "function" && tCC("cspImportInvalidAlertLabel"))
            || "Ungültige Zauberbibliothek-Datei.");
        if (event?.target) event.target.value = "";
        return;
    }

    const applySpellPackImport = (payload, envelope) => {
        const loaded = loadCustomSpellPackPayloadIntoEditor(payload, envelope);
        if (!loaded) {
            alert((typeof tCC === "function" && tCC("cspImportInvalidAlertLabel"))
                || "Ungültige Zauberbibliothek-Datei.");
            if (event?.target) event.target.value = "";
            return;
        }
        // Runtime sofort anpassen
        registerCustomSpellPackFromPayload(payload, envelope);
        if (typeof markDcPackageUserLoaded === "function") {
            markDcPackageUserLoaded(
                (typeof DC_PACKAGE_TYPE !== "undefined")
                    ? DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
                    : "customSpellPack"
            );
        }
        const exportPayload = buildCustomSpellPackExportPayload(customSpellEditorState);
        customSpellImportSnapshot = getCustomSpellPackExportSnapshotString(exportPayload);
        showCustomSpellEditorView();
        if (event?.target) event.target.value = "";
        if (typeof notifyDcPackageDependencyPossiblyResolved === "function") {
            notifyDcPackageDependencyPossiblyResolved();
        }
    };

    // Dependency-Kette: nur registrieren, Spell-Builder nicht öffnen
    if (typeof isDcPackageDependencyResolutionUpload === "function"
        && isDcPackageDependencyResolutionUpload(result.detectedType)) {
        const match = (typeof validateUploadedDcPackageAgainstPendingDependency === "function")
            ? validateUploadedDcPackageAgainstPendingDependency(
                result.detectedType,
                result.envelope,
                result.payload
            )
            : { ok: true };
        if (!match.ok) {
            alert(match.message
                || (typeof tCC === "function" && tCC("cspImportInvalidAlertLabel"))
                || "Ungültige Zauberbibliothek-Datei.");
            if (event?.target) event.target.value = "";
            if (typeof promptNextDcPackageDependencyUpload === "function") {
                promptNextDcPackageDependencyUpload();
            }
            return;
        }
        const registered = registerCustomSpellPackFromPayload(
            result.payload,
            result.envelope
        );
        if (!registered) {
            alert((typeof tCC === "function" && tCC("cspImportInvalidAlertLabel"))
                || "Ungültige Zauberbibliothek-Datei.");
            if (event?.target) event.target.value = "";
            if (typeof promptNextDcPackageDependencyUpload === "function") {
                promptNextDcPackageDependencyUpload();
            }
            return;
        }
        if (typeof markDcPackageUserLoaded === "function") {
            markDcPackageUserLoaded(
                (typeof DC_PACKAGE_TYPE !== "undefined")
                    ? DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
                    : "customSpellPack"
            );
        }
        if (event?.target) event.target.value = "";
        if (typeof notifyDcPackageDependencyPossiblyResolved === "function") {
            notifyDcPackageDependencyPossiblyResolved({
                envelope: result.envelope,
                payload: result.payload,
                packageType: result.detectedType
            });
        }
        return;
    }

    if (typeof beginDcPackageImportWithDependencies === "function") {
        beginDcPackageImportWithDependencies({
            envelope: result.envelope,
            payload: result.payload,
            detectedType: result.detectedType,
            onApply: applySpellPackImport,
            onCancel: () => {
                if (event?.target) event.target.value = "";
            }
        });
        return;
    }

    applySpellPackImport(result.payload, result.envelope);
}

function loadCustomSpellPackPayloadIntoEditor(payload, envelope) {
    if (!payload || typeof payload !== "object") return false;
    if (payload.type !== "customSpellPack" && payload.type !== "customSpellPackRuntime") {
        return false;
    }
    if (!Array.isArray(payload.spells)) return false;

    // Bibliothek: State ohne Bindung; Spell-classLabel aus Datei unverändert übernehmen (Legacy ok)
    const state = createEmptyCustomSpellPackState();
    state.packageId = envelope?.packageId || payload.packageId || null;
    state.packageCreatedAt = envelope?.createdAt || null;
    state.availableLanguages = Array.isArray(payload.availableLanguages)
        ? payload.availableLanguages.slice()
        : state.availableLanguages;
    state.spells = payload.spells.map(s => Object.assign({}, s));
    state.nextId = Number.isFinite(Number(payload.nextId))
        ? Math.max(CUSTOM_SPELL_ID_MIN, parseInt(payload.nextId, 10))
        : peekNextCustomSpellId(state);
    state.translations = {
        de: Object.assign({}, payload.translations?.de || {}),
        en: Object.assign({}, payload.translations?.en || {})
    };
    customSpellEditorState = state;
    customSpellEditingId = null;
    return true;
}

function switchCustomSpellTab(tabNum) {
    const n = parseInt(tabNum, 10) || 1;
    customSpellActiveTab = n;
    document.querySelectorAll("#customSpellEditorView .custom-class-tab").forEach(btn => {
        const t = parseInt(btn.getAttribute("data-tab"), 10);
        btn.classList.toggle("active", t === n);
    });
    document.querySelectorAll("#customSpellEditorView .custom-class-tab-panel").forEach(panel => {
        const id = panel.id || "";
        const match = id.match(/customSpellTab(\d+)/);
        const t = match ? parseInt(match[1], 10) : 0;
        panel.classList.toggle("active", t === n);
    });
    // Bibliotheks-Speichern nur auf Reiter 1; Reiter 2 hat „Bestätigen“ im Tab-Inhalt
    const editorView = document.getElementById("customSpellEditorView");
    if (editorView) editorView.classList.toggle("csp-tab2-active", n === 2);
    const finishBtn = document.getElementById("customSpellFinishBtn");
    if (finishBtn) finishBtn.style.display = n === 1 ? "" : "none";
    if (n === 1) renderCustomSpellTab1();
    else if (n === 2) renderCustomSpellTab2();
}

//=======================================================================
// Option-Listen / Anzeige-Helper
//=======================================================================

const CSP_SPELL_LEVEL_LABELS = Object.freeze([
    "cantripLabel", "1stLevelLabel", "2ndLevelLabel", "3rdLevelLabel", "4thLevelLabel",
    "5thLevelLabel", "6thLevelLabel", "7thLevelLabel", "8thLevelLabel", "9thLevelLabel"
]);

const CSP_CASTING_TIME_LABELS = Object.freeze([
    "actionLabel", "bonusActionLabel", "reactionLabel", "minuteLabel", "hourLabel"
]);

const CSP_DURATION_LABELS = Object.freeze([
    "instantaneousLabel", "roundLabel", "minuteLabel", "hourLabel", "dayLabel", "untilDispelledLabel"
]);

const CSP_AREA_TYPE_LABELS = Object.freeze([
    "sphereLabel", "coneLabel", "cubeLabel", "lineLabel", "cylinderLabel", "squareLabel"
]);

const CSP_COMPONENT_LABELS = Object.freeze(["compVLabel", "compSLabel", "compMLabel"]);

function cspT(key, fallback) {
    if (typeof tCC === "function") {
        const v = tCC(key);
        if (v && v !== key) return v;
    }
    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    if (typeof translations !== "undefined" && translations[lang] && translations[lang][key] != null) {
        return translations[lang][key];
    }
    return fallback != null ? fallback : key;
}

function cspComponentLabel(key) {
    if (key === "compVLabel") return cspT("cspCompVerbalLabel", "Verbal");
    if (key === "compSLabel") return cspT("cspCompSomaticLabel", "Gestik");
    if (key === "compMLabel") return cspT("cspCompMaterialFullLabel", "Material");
    return cspT(key, key);
}

/** Kurzform Komponenten für Übersicht: DE V/G/M, EN V/S/M */
function cspFormatComponentsDisplay(components) {
    const comps = Array.isArray(components) ? components : [];
    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    const parts = [];
    if (comps.includes("compVLabel")) parts.push("V");
    if (comps.includes("compSLabel")) parts.push(lang === "en" ? "S" : "G");
    if (comps.includes("compMLabel")) parts.push("M");
    return parts.join(",");
}

function cspSpellLevelRank(levelLabel) {
    if (typeof getLfSpellGradeRank === "function") return getLfSpellGradeRank(levelLabel);
    const idx = CSP_SPELL_LEVEL_LABELS.indexOf(levelLabel);
    return idx >= 0 ? idx : 99;
}

/** Kurzform Zaubergrad nur für Übersichtstabelle */
function cspFormatOverviewLevelDisplay(levelLabel) {
    if (levelLabel === "cantripLabel") {
        const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
        return cspT("cspOverviewLevelCantripLabel", lang === "en" ? "Can." : "Trick");
    }
    const map = {
        "1stLevelLabel": ["cspOverviewLevel1Label", "1"],
        "2ndLevelLabel": ["cspOverviewLevel2Label", "2"],
        "3rdLevelLabel": ["cspOverviewLevel3Label", "3"],
        "4thLevelLabel": ["cspOverviewLevel4Label", "4"],
        "5thLevelLabel": ["cspOverviewLevel5Label", "5"],
        "6thLevelLabel": ["cspOverviewLevel6Label", "6"],
        "7thLevelLabel": ["cspOverviewLevel7Label", "7"],
        "8thLevelLabel": ["cspOverviewLevel8Label", "8"],
        "9thLevelLabel": ["cspOverviewLevel9Label", "9"]
    };
    const entry = map[levelLabel];
    if (!entry) return cspT(levelLabel, levelLabel);
    return cspT(entry[0], entry[1]);
}

function cspFormatTimePair(value, unitLabel) {
    const v = Number(value) || 0;
    const unit = cspT(unitLabel, unitLabel);
    if (!unitLabel || unitLabel === "instantaneousLabel" || unitLabel === "untilDispelledLabel") {
        return unit;
    }
    if (v <= 0) return unit;
    return `${v} ${unit}`;
}

function cspFormatRangeDisplay(spellRange) {
    if (cspIsSpecialSpellRange(spellRange)) return cspT(spellRange, spellRange);
    const feet = Number(spellRange) || 0;
    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    if (lang === "de") {
        const m = cspFeetToDisplayMeters(feet);
        return `${m} ${cspT("cspRangeUnitLabel", "Meter")}`;
    }
    return `${feet} ${cspT("cspRangeUnitLabel", "Feet")}`;
}

function cspSpellFocusHas(spellFocus, label) {
    if (!spellFocus || spellFocus === 0) return false;
    if (Array.isArray(spellFocus)) return spellFocus.includes(label);
    return spellFocus === label;
}

function cspGetSpellDisplayName(spell, packState) {
    if (!spell) return "";
    const key = spell.translationLabel;
    const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
    const fromPack = packState?.translations?.[lang]?.[key]
        || packState?.translations?.de?.[key]
        || packState?.translations?.en?.[key];
    if (fromPack) return fromPack;
    return cspT(key, key);
}

//=======================================================================
// Draft (Tab 2)
//=======================================================================

/** Material-Suffix wie in PHB-Zauberbeschreibungen (translationsSpellDesciptions). */
const CSP_MATERIAL_SUFFIX_RE = /(?:<br\s*\/?>\s*)*<b>Material:<\/b>\s*([\s\S]*?)\s*$/i;

/** Material-Block aus Beschreibung entfernen und Text zurückgeben. */
function cspStripMaterialFromDescription(html) {
    const s = String(html || "");
    const m = s.match(CSP_MATERIAL_SUFFIX_RE);
    if (!m) return { text: s, material: "" };
    return {
        text: s.replace(CSP_MATERIAL_SUFFIX_RE, "").replace(/(?:<br\s*\/?>\s*)+$/i, "").trim(),
        material: String(m[1] || "").trim()
    };
}

/** Material-Block an Beschreibung anhängen (wie PHB: <br><br><b>Material:</b> …). */
function cspAppendMaterialToDescription(html, material) {
    const base = cspStripMaterialFromDescription(html).text;
    const mat = String(material || "").trim();
    if (!mat) return base;
    return `${base}<br><br><b>Material:</b> ${mat}`;
}

function createEmptyCustomSpellDraft() {
    const active = typeof getActiveUiLang === "function"
        ? getActiveUiLang()
        : (typeof currentLang !== "undefined" ? currentLang : "de");
    return {
        ID: null,
        availableLanguages: [active],
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        spellLevel: "cantripLabel",
        spellSchool: "evocationLabel",
        components: ["compVLabel", "compSLabel"],
        spellMaterial: "",
        castingTimeValue: 1,
        castingTime: "actionLabel",
        durationTimeValue: 0,
        duration: "instantaneousLabel",
        concentration: false,
        ritual: false,
        rangeMode: "unit",
        rangeValueUi: 30,
        spellAreaType: 0,
        spellAreaUi: 0,
        classListMode: "manual",
        // Option A: Listenmitgliedschaft gehört den Consumern, nicht der Bibliothek
        classLabel: []
    };
}

function draftFromSpell(spell, packState) {
    const draft = createEmptyCustomSpellDraft();
    if (!spell) return draft;
    draft.ID = spell.ID;
    const key = spell.translationLabel;
    const dKey = spell.spellDLabel;
    let extractedMaterial = "";
    ["de", "en"].forEach(lang => {
        draft.names[lang] = packState?.translations?.[lang]?.[key]
            || (lang === (typeof currentLang !== "undefined" ? currentLang : "de")
                ? cspT(key, "")
                : "")
            || "";
        const rawDesc = packState?.translations?.[lang]?.[dKey]
            || (lang === (typeof currentLang !== "undefined" ? currentLang : "de")
                ? cspT(dKey, "")
                : "")
            || "";
        // Material liegt in der Beschreibung (nicht in spellMaterial); fürs Formular extrahieren
        const stripped = cspStripMaterialFromDescription(rawDesc);
        draft.descriptions[lang] = stripped.text;
        if (stripped.material && !extractedMaterial) extractedMaterial = stripped.material;
    });
    const langs = [];
    if (draft.names.de || draft.descriptions.de) langs.push("de");
    if (draft.names.en || draft.descriptions.en) langs.push("en");
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    if (!langs.includes(active)) langs.unshift(active);
    draft.availableLanguages = langs.length ? langs : [active];

    draft.spellLevel = spell.spellLevel || "cantripLabel";
    draft.spellSchool = spell.spellSchool || "evocationLabel";
    draft.components = Array.isArray(spell.components) ? spell.components.slice() : ["compVLabel"];
    // Legacy: früher lag Material in spellMaterial — Fallback beim Laden
    draft.spellMaterial = extractedMaterial
        || ((spell.spellMaterial && spell.spellMaterial !== 0)
            ? String(spell.spellMaterial)
            : "");
    draft.castingTimeValue = Number(spell.castingTimeValue) || 1;
    draft.castingTime = spell.castingTime || "actionLabel";
    draft.duration = spell.duration || "instantaneousLabel";
    draft.durationTimeValue = (draft.duration === "instantaneousLabel"
        || draft.duration === "untilDispelledLabel")
        ? 0
        : (Number(spell.durationTimeValue) || 1);
    draft.concentration = cspSpellFocusHas(spell.spellFocus, "concentrationLabel");
    draft.ritual = cspSpellFocusHas(spell.spellFocus, "ritualLabel");

    if (spell.spellRange === "selfLabel" || spell.spellRange === "touchLabel"
        || spell.spellRange === "mileLabel") {
        draft.rangeMode = spell.spellRange;
        draft.rangeValueUi = spell.spellRange === "mileLabel"
            ? ((typeof currentLang !== "undefined" && currentLang === "en") ? 1 : 1.5)
            : 0;
    } else {
        draft.rangeMode = "unit";
        const feet = Number(spell.spellRange) || 0;
        const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
        draft.rangeValueUi = lang === "de" ? cspFeetToDisplayMeters(feet) : feet;
    }

    draft.spellAreaType = spell.spellAreaType || 0;
    {
        const feet = Number(spell.spellArea) || 0;
        const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
        draft.spellAreaUi = lang === "de" ? cspFeetToDisplayMeters(feet) : feet;
    }

    const labels = Array.isArray(spell.classLabel)
        ? spell.classLabel.slice()
        : (spell.classLabel ? [spell.classLabel] : []);
    draft.classListMode = "manual";
    // Legacy-classLabel behalten; neue Bibliotheks-Zauber bleiben []
    draft.classLabel = labels;
    return draft;
}

function startCustomSpellCreateNew() {
    if (!customSpellEditorState) return;
    if ((customSpellEditorState.spells || []).length >= CSP_CONFIG.maxSpellsPerPack) {
        alert(cspT("cspMaxSpellsAlertLabel", "Maximal 100 Zauber pro Bibliothek."));
        return;
    }
    customSpellEditingId = null;
    customSpellDraft = createEmptyCustomSpellDraft();
    switchCustomSpellTab(2);
}

function startCustomSpellEdit(spellId) {
    if (typeof isLevelUpLockedSpell === "function" && isLevelUpLockedSpell(spellId)) return;
    if (!customSpellEditorState) return;
    const id = parseInt(spellId, 10);
    const spell = (customSpellEditorState.spells || []).find(s => s.ID === id);
    if (!spell) return;
    customSpellEditingId = id;
    customSpellDraft = draftFromSpell(spell, customSpellEditorState);
    switchCustomSpellTab(2);
}

/** Zauber aus Pack entfernen (Übersicht); mit Bestätigung. */
function removeCustomSpellFromPack(spellId) {
    if (typeof isLevelUpLockedSpell === "function" && isLevelUpLockedSpell(spellId)) return;
    if (!customSpellEditorState) return;
    const id = parseInt(spellId, 10);
    const spell = (customSpellEditorState.spells || []).find(s => s.ID === id);
    if (!spell) return;

    const name = cspGetSpellDisplayName(spell, customSpellEditorState) || "—";
    const msg = cspT(
        "cspDeleteSpellConfirmLabel",
        "Soll der Eintrag von \"{name}\" wirklich gelöscht werden? Die Daten können nicht wiederhergestellt werden. Trotzdem fortfahren?"
    ).replace(/\{name\}/g, name);
    if (!confirm(msg)) return;

    // Tab-4-Locks der offenen Custom-Klasse lösen (explizit, nicht via leerem classLabel)
    if (typeof syncCustomSpellsIntoClassSpellList === "function") {
        try {
            syncCustomSpellsIntoClassSpellList(spell, { forceUnlink: true });
        } catch (e) { /* optional */ }
    }

    const nameKey = spell.translationLabel;
    const descKey = spell.spellDLabel;
    ["de", "en"].forEach(lang => {
        if (customSpellEditorState.translations?.[lang]) {
            if (nameKey) delete customSpellEditorState.translations[lang][nameKey];
            if (descKey) delete customSpellEditorState.translations[lang][descKey];
        }
        if (typeof translations !== "undefined" && translations[lang]) {
            if (nameKey) delete translations[lang][nameKey];
            if (descKey) delete translations[lang][descKey];
        }
    });

    customSpellEditorState.spells = (customSpellEditorState.spells || []).filter(s => s.ID !== id);
    if (customSpellEditingId === id) {
        customSpellEditingId = null;
        customSpellDraft = null;
    }
    renderCustomSpellTab1();
}

//=======================================================================
// Tab-Rendering
//=======================================================================

function resetCspOverviewFilters() {
    cspOverviewFilters = { level: "", school: "", search: "" };
}

function cspReadOverviewFiltersFromDom() {
    const levelEl = document.getElementById("cspOverviewFilterLevel");
    const schoolEl = document.getElementById("cspOverviewFilterSchool");
    const searchEl = document.getElementById("cspOverviewFilterSearch");
    cspOverviewFilters = {
        level: levelEl ? String(levelEl.value || "") : (cspOverviewFilters.level || ""),
        school: schoolEl ? String(schoolEl.value || "") : (cspOverviewFilters.school || ""),
        search: searchEl ? String(searchEl.value || "") : (cspOverviewFilters.search || "")
    };
}

function onCspOverviewFilterChange() {
    cspReadOverviewFiltersFromDom();
    renderCustomSpellTab1TableBody();
}

function cspGetSpellSearchNames(spell) {
    const names = [];
    const display = cspGetSpellDisplayName(spell, customSpellEditorState);
    if (display) names.push(String(display));
    const key = spell?.translationLabel;
    if (key && customSpellEditorState?.translations) {
        ["de", "en"].forEach(lang => {
            const n = customSpellEditorState.translations[lang]?.[key];
            if (n) names.push(String(n));
        });
    }
    return names;
}

function cspSpellPassesOverviewFilters(spell) {
    const f = cspOverviewFilters || {};
    if (f.level && spell.spellLevel !== f.level) return false;
    if (f.school && spell.spellSchool !== f.school) return false;
    const q = String(f.search || "").trim().toLowerCase();
    if (q) {
        const hit = cspGetSpellSearchNames(spell).some(n => n.toLowerCase().includes(q));
        if (!hit) return false;
    }
    return true;
}

function getCspOverviewFilteredSpells() {
    const all = (customSpellEditorState?.spells || []).slice();
    all.sort((a, b) => {
        const ra = cspSpellLevelRank(a.spellLevel);
        const rb = cspSpellLevelRank(b.spellLevel);
        if (ra !== rb) return ra - rb;
        const na = cspGetSpellDisplayName(a, customSpellEditorState);
        const nb = cspGetSpellDisplayName(b, customSpellEditorState);
        return String(na).localeCompare(String(nb), undefined, { sensitivity: "base" });
    });
    return all.filter(cspSpellPassesOverviewFilters);
}

function cspOverviewFilterIconHtml() {
    if (typeof getLfFilterIconHtml === "function") return getLfFilterIconHtml();
    return `<span class="cc-lf-filter-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/></svg></span>`;
}

function buildCspOverviewFilterHtml() {
    const f = cspOverviewFilters || {};
    const count = (customSpellEditorState?.spells || []).length;
    const max = CSP_CONFIG.maxSpellsPerPack;
    const atMax = count >= max;
    const addTitle = cspT("cspAddSpellTitleLabel", "Zauber/Zaubertrick hinzufügen");
    const allOpt = `<option value="">${escapeCspHtml(cspT("allLabel", "Alle"))}</option>`;
    const levelOpts = CSP_SPELL_LEVEL_LABELS.map(l =>
        `<option value="${l}" ${f.level === l ? "selected" : ""}>${escapeCspHtml(cspT(l, l))}</option>`
    ).join("");
    const schools = (typeof getLfSpellSchoolLabels === "function")
        ? getLfSpellSchoolLabels()
        : ["abjurationLabel", "conjurationLabel", "divinationLabel", "enchantmentLabel",
            "evocationLabel", "illusionLabel", "necromancyLabel", "transmutationLabel"];
    const schoolOpts = schools.map(s =>
        `<option value="${s}" ${f.school === s ? "selected" : ""}>${escapeCspHtml(cspT(s, s))}</option>`
    ).join("");
    const searchPh = cspT("cfNamePlaceholderLabel", "Bezeichnung…");
    const searchAria = cspT("cspOverviewSearchAriaLabel", "Zauberbezeichnung suchen");
    const searchLabel = cspT("cspOverviewSearchLabel", "Suchen");
    return `
        <div class="csp-overview-filters">
            <div class="csp-overview-counter">
                <span class="csp-pack-counter">${escapeCspHtml(String(count))} / ${escapeCspHtml(String(max))}</span>
            </div>
            <label class="csp-overview-filter">
                <span class="csp-overview-filter-label">${escapeCspHtml(cspT("spellLevelLabel", "Zaubergrad"))}${cspOverviewFilterIconHtml()}</span>
                <select id="cspOverviewFilterLevel" class="dropdown" onchange="onCspOverviewFilterChange()">
                    ${allOpt}${levelOpts}
                </select>
            </label>
            <label class="csp-overview-filter">
                <span class="csp-overview-filter-label">${escapeCspHtml(cspT("cspSpellSchoolFieldLabel", "Zauberschule"))}${cspOverviewFilterIconHtml()}</span>
                <select id="cspOverviewFilterSchool" class="dropdown" onchange="onCspOverviewFilterChange()">
                    ${allOpt}${schoolOpts}
                </select>
            </label>
            <label class="csp-overview-filter csp-overview-filter--search">
                <span class="csp-overview-filter-label">${escapeCspHtml(searchLabel)}</span>
                <span class="csp-overview-search-wrap">
                    <span class="csp-overview-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <circle cx="10.5" cy="10.5" r="6.25" fill="none" stroke="currentColor" stroke-width="2"/>
                            <path d="M15.2 15.2 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </span>
                    <input type="text" id="cspOverviewFilterSearch" class="csp-overview-search-input"
                        value="${escapeCspHtml(f.search || "")}"
                        placeholder="${escapeCspHtml(searchPh)}"
                        aria-label="${escapeCspHtml(searchAria)}"
                        autocomplete="off"
                        oninput="onCspOverviewFilterChange()">
                </span>
            </label>
            <div class="csp-overview-add">
                <button type="button" class="add-custom-spell-btn csp-add-spell-btn" title="${escapeCspHtml(addTitle)}"
                    aria-label="${escapeCspHtml(addTitle)}" ${atMax ? "disabled" : ""}
                    onclick="startCustomSpellCreateNew()">+</button>
            </div>
        </div>
    `;
}

function buildCspOverviewTableRowsHtml() {
    const total = (customSpellEditorState?.spells || []).length;
    const filtered = getCspOverviewFilteredSpells();
    if (!total) {
        return `<tr><td colspan="11" class="csp-overview-empty">${escapeCspHtml(cspT("cspOverviewEmptyLabel", "Keine Zauber gelistet"))}</td></tr>`;
    }
    if (!filtered.length) {
        return `<tr><td colspan="11" class="csp-overview-empty">${escapeCspHtml(cspT("cspOverviewNoMatchesLabel", "Keine Treffer"))}</td></tr>`;
    }
    return filtered.map((spell, index) => {
        const name = cspGetSpellDisplayName(spell, customSpellEditorState);
        const level = cspFormatOverviewLevelDisplay(spell.spellLevel);
        const school = cspT(spell.spellSchool, spell.spellSchool);
        const components = cspFormatComponentsDisplay(spell.components);
        const cast = cspFormatTimePair(spell.castingTimeValue, spell.castingTime);
        const dur = cspFormatTimePair(spell.durationTimeValue, spell.duration);
        const range = cspFormatRangeDisplay(spell.spellRange);
        const conc = cspSpellFocusHas(spell.spellFocus, "concentrationLabel") ? "✔" : "✘";
        const ritual = cspSpellFocusHas(spell.spellFocus, "ritualLabel") ? "✔" : "✘";
        const locked = (typeof isLevelUpLockedSpell === "function" && isLevelUpLockedSpell(spell.ID));
        const lockClass = locked ? " csp-action-btn--locked" : "";
        const lockDisabled = locked ? " disabled" : "";

        return `<tr>
            <td class="csp-col-actions">
                <div class="csp-action-btns">
                    <button type="button" class="csp-edit-btn${lockClass}" title="${escapeCspHtml(cspT("cspEditSpellTitleLabel", "Bearbeiten"))}"
                        aria-label="${escapeCspHtml(cspT("cspEditSpellTitleLabel", "Bearbeiten"))}"
                        onclick="startCustomSpellEdit(${spell.ID})"${lockDisabled}>✎</button>
                    <button type="button" class="csp-delete-btn${lockClass}" title="${escapeCspHtml(cspT("cspDeleteSpellTitleLabel", "Entfernen"))}"
                        aria-label="${escapeCspHtml(cspT("cspDeleteSpellTitleLabel", "Entfernen"))}"
                        onclick="removeCustomSpellFromPack(${spell.ID})"${lockDisabled}>X</button>
                </div>
            </td>
            <td class="csp-col-num">${index + 1}</td>
            <td>${escapeCspHtml(name)}</td>
            <td class="csp-col-level">${escapeCspHtml(level)}</td>
            <td>${escapeCspHtml(school)}</td>
            <td class="csp-col-components">${escapeCspHtml(components)}</td>
            <td>${escapeCspHtml(cast)}</td>
            <td>${escapeCspHtml(dur)}</td>
            <td>${escapeCspHtml(range)}</td>
            <td class="csp-col-flag">${conc}</td>
            <td class="csp-col-flag">${ritual}</td>
        </tr>`;
    }).join("");
}

function renderCustomSpellTab1TableBody() {
    const tbody = document.querySelector("#customSpellTab1Content .csp-overview-table tbody");
    if (!tbody) return;
    tbody.innerHTML = buildCspOverviewTableRowsHtml();
}

function renderCustomSpellTab1() {
    const host = document.getElementById("customSpellTab1Content");
    if (!host || !customSpellEditorState) return;
    host.innerHTML = `
        ${buildCspOverviewFilterHtml()}
        <div class="csp-overview-scroll">
            <table class="csp-overview-table">
                <thead>
                    <tr>
                        <th></th>
                        <th class="csp-col-num">${escapeCspHtml(cspT("cspOverviewNumLabel", "#"))}</th>
                        <th>${escapeCspHtml(cspT("cfNameLabel", "Name"))}</th>
                        <th class="csp-col-level">${escapeCspHtml(cspT("cspOverviewLevelColLabel", "Grad"))}</th>
                        <th>${escapeCspHtml(cspT("cspSpellSchoolFieldLabel", "Schule"))}</th>
                        <th>${escapeCspHtml(cspT("cspOverviewComponentsColLabel", "Komp."))}</th>
                        <th>${escapeCspHtml(cspT("castingTimeLabel", "Zauberzeit"))}</th>
                        <th>${escapeCspHtml(cspT("durationLabel", "Dauer"))}</th>
                        <th>${escapeCspHtml(cspT("rangeLabel", "Reichweite"))}</th>
                        <th class="csp-col-flag">${escapeCspHtml(cspT("cspOverviewConcColLabel", "Konz."))}</th>
                        <th class="csp-col-flag">${escapeCspHtml(cspT("ritualLabel", "Ritual"))}</th>
                    </tr>
                </thead>
                <tbody>
                    ${buildCspOverviewTableRowsHtml()}
                </tbody>
            </table>
        </div>
    `;
}

function cspRenderLangAvailabilityRow() {
    if (!customSpellDraft) return "";
    if (typeof renderLangAvailabilityRowHtml === "function") {
        return renderLangAvailabilityRowHtml(customSpellDraft, {
            inputName: "cspLangAvail",
            onChange: "onCspLangAvailabilityChange()"
        });
    }
    return "";
}

function cspRenderLangBlocks() {
    if (!customSpellDraft) return "";
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const available = Array.isArray(customSpellDraft.availableLanguages)
        ? customSpellDraft.availableLanguages.slice()
        : [active];
    if (!available.includes(active)) available.unshift(active);
    const nameMax = CSP_CONFIG.nameMax;
    const descMax = CSP_CONFIG.descMax;
    return available.map(lang => {
        const title = (typeof getCustomClassLangTitle === "function")
            ? getCustomClassLangTitle(lang)
            : lang.toUpperCase();
        const collapsed = lang !== active ? "collapsed" : "";
        const arrowCollapsed = lang !== active ? " is-collapsed" : "";
        const req = lang === active ? '<span class="custom-class-required">*</span>' : "";
        const nameVal = escapeCspHtml(customSpellDraft.names[lang] || "");
        const descVal = escapeCspHtml(customSpellDraft.descriptions[lang] || "");
        return `
        <div class="custom-class-lang-block" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="cspToggleLangBlock('${lang}')">
                <span>${title}</span>
                <span id="cspLangToggle_${lang}" class="cc-collapse-arrow${arrowCollapsed}" aria-hidden="true">&#x25BC;</span>
            </div>
            <div id="cspLangBody_${lang}" class="custom-class-lang-body ${collapsed}">
                <label for="cspName_${lang}">${escapeCspHtml(cspT("cfNameLabel", "Name"))} ${req}</label>
                <input type="text" id="cspName_${lang}" class="custom-class-name-input app-small-input"
                    maxlength="${nameMax}" value="${nameVal}"
                    oninput="updateCustomClassCharCounter('cspName_${lang}', 'cspNameCount_${lang}', ${nameMax})">
                <div class="char-counter"><span id="cspNameCount_${lang}">0</span> / ${nameMax}</div>
                <label for="cspDesc_${lang}" style="margin-top:8px;display:block;">${escapeCspHtml(cspT("cfDescLabel", "Beschreibung"))} ${req}</label>
                <textarea id="cspDesc_${lang}" maxlength="${descMax}"
                    oninput="updateCustomClassCharCounter('cspDesc_${lang}', 'cspDescCount_${lang}', ${descMax})">${descVal}</textarea>
                <div class="char-counter"><span id="cspDescCount_${lang}">0</span> / ${descMax}</div>
            </div>
        </div>`;
    }).join("");
}

function cspToggleLangBlock(lang) {
    const body = document.getElementById(`cspLangBody_${lang}`);
    const indicator = document.getElementById(`cspLangToggle_${lang}`);
    if (!body) return;
    body.classList.toggle("collapsed");
    const collapsed = body.classList.contains("collapsed");
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
}

function onCspLangAvailabilityChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const selected = Array.from(document.querySelectorAll('input[name="cspLangAvail"]:checked'))
        .map(el => el.value);
    if (!selected.includes(active)) selected.unshift(active);
    customSpellDraft.availableLanguages = selected;
    renderCustomSpellTab2();
}

function renderCustomSpellTab2() {
    const host = document.getElementById("customSpellTab2Content");
    if (!host || !customSpellEditorState) return;
    if (!customSpellDraft) customSpellDraft = createEmptyCustomSpellDraft();

    const req = `<span class="custom-class-required">*</span>`;
    const schools = (typeof getLfSpellSchoolLabels === "function")
        ? getLfSpellSchoolLabels()
        : ["evocationLabel"];
    const durationLocked = customSpellDraft.duration === "instantaneousLabel"
        || customSpellDraft.duration === "untilDispelledLabel";
    const castingLocked = customSpellDraft.castingTime === "reactionLabel";
    const rangeLocked = customSpellDraft.rangeMode !== "unit";
    const mileMode = customSpellDraft.rangeMode === "mileLabel";
    const materialOn = (customSpellDraft.components || []).includes("compMLabel");
    const areaOn = customSpellDraft.spellAreaType && customSpellDraft.spellAreaType !== 0;

    const levelOpts = CSP_SPELL_LEVEL_LABELS.map(l =>
        `<option value="${l}" ${customSpellDraft.spellLevel === l ? "selected" : ""}>${escapeCspHtml(cspT(l, l))}</option>`
    ).join("");
    const schoolOpts = schools.map(l =>
        `<option value="${l}" ${customSpellDraft.spellSchool === l ? "selected" : ""}>${escapeCspHtml(cspT(l, l))}</option>`
    ).join("");
    const castOpts = CSP_CASTING_TIME_LABELS.map(l =>
        `<option value="${l}" ${customSpellDraft.castingTime === l ? "selected" : ""}>${escapeCspHtml(cspT(l, l))}</option>`
    ).join("");
    const durOpts = CSP_DURATION_LABELS.map(l =>
        `<option value="${l}" ${customSpellDraft.duration === l ? "selected" : ""}>${escapeCspHtml(cspT(l, l))}</option>`
    ).join("");
    const areaOpts = [`<option value="0" ${!customSpellDraft.spellAreaType || customSpellDraft.spellAreaType === 0 ? "selected" : ""}>${escapeCspHtml(cspT("cspAreaNoneLabel", "Keine"))}</option>`]
        .concat(CSP_AREA_TYPE_LABELS.map(l =>
            `<option value="${l}" ${customSpellDraft.spellAreaType === l ? "selected" : ""}>${escapeCspHtml(cspT(l, l))}</option>`
        )).join("");

    const rangeMode = customSpellDraft.rangeMode;
    const rangeUnitLabel = cspT("cspRangeUnitLabel", "Meter");
    const rangeOpts = [
        ["unit", rangeUnitLabel],
        ["selfLabel", cspT("selfLabel", "Selbst")],
        ["touchLabel", cspT("touchLabel", "Berührung")],
        ["mileLabel", cspT("mileLabel", "1.5 km")]
    ].map(([v, lab]) =>
        `<option value="${v}" ${rangeMode === v ? "selected" : ""}>${escapeCspHtml(lab)}</option>`
    ).join("");

    let rangeValue = customSpellDraft.rangeValueUi;
    if (mileMode) {
        rangeValue = (typeof currentLang !== "undefined" && currentLang === "en") ? 1 : 1.5;
    }

    const compBoxes = CSP_COMPONENT_LABELS.map(key => {
        const checked = (customSpellDraft.components || []).includes(key) ? "checked" : "";
        return `<label class="csp-check-item"><input type="checkbox" name="cspComp" value="${key}" ${checked}
            onchange="onCspComponentChange()"> ${escapeCspHtml(cspComponentLabel(key))}</label>`;
    }).join("");

    host.innerHTML = `
        ${cspRenderLangAvailabilityRow()}
        <div class="custom-class-field">
            <div class="custom-class-section-title">${escapeCspHtml(cspT("cfNameLabel", "Name"))} / ${escapeCspHtml(cspT("cfDescLabel", "Beschreibung"))} ${req}</div>
            ${cspRenderLangBlocks()}
        </div>

        <div class="custom-class-field">
            <label for="cspSpellLevel">${escapeCspHtml(cspT("spellLevelLabel", "Zaubergrad"))} ${req}</label>
            <select id="cspSpellLevel" class="dropdown csp-field-select">${levelOpts}</select>
        </div>

        <div class="custom-class-field">
            <label for="cspSpellSchool">${escapeCspHtml(cspT("cspSpellSchoolFieldLabel", "Zauberschule"))} ${req}</label>
            <select id="cspSpellSchool" class="dropdown csp-field-select">${schoolOpts}</select>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${escapeCspHtml(cspT("cspComponentsFieldLabel", "Komponenten"))} ${req}</div>
            <div class="custom-class-check-grid csp-comp-grid">${compBoxes}</div>
            <div id="cspMaterialWrap" class="csp-material-wrap${materialOn ? " is-visible" : ""}">
                <label for="cspSpellMaterial">${escapeCspHtml(cspT("cspMaterialsNeededLabel", "Benötigte Materialien"))}</label>
                <input type="text" id="cspSpellMaterial" class="app-small-input csp-material-input" maxlength="${CSP_CONFIG.materialMax}"
                    value="${escapeCspHtml(customSpellDraft.spellMaterial || "")}">
            </div>
        </div>

        <div class="custom-class-field">
            <label for="cspCastingTime">${escapeCspHtml(cspT("castingTimeLabel", "Zauberzeit"))} ${req}</label>
            <div class="csp-field-row">
                <select id="cspCastingTime" class="dropdown csp-field-select" onchange="onCspCastingTimeChange()">${castOpts}</select>
                <input type="number" id="cspCastingTimeValue" class="app-small-input csp-num-input" min="0" max="999"
                    value="${castingLocked ? 0 : (Number(customSpellDraft.castingTimeValue) || 1)}"
                    ${castingLocked ? "disabled" : ""}>
            </div>
        </div>

        <div class="custom-class-field">
            <label for="cspDuration">${escapeCspHtml(cspT("durationLabel", "Dauer"))} ${req}</label>
            <div class="csp-field-row">
                <select id="cspDuration" class="dropdown csp-field-select" onchange="onCspDurationChange()">${durOpts}</select>
                <input type="number" id="cspDurationValue" class="app-small-input csp-num-input" min="0" max="999"
                    value="${durationLocked ? 0 : (Number(customSpellDraft.durationTimeValue) || 1)}"
                    ${durationLocked ? "disabled" : ""}>
            </div>
        </div>

        <div class="custom-class-field">
            <label for="cspRangeMode">${escapeCspHtml(cspT("rangeLabel", "Reichweite"))} ${req}</label>
            <div class="csp-field-row">
                <select id="cspRangeMode" class="dropdown csp-field-select" onchange="onCspRangeModeChange()">${rangeOpts}</select>
                <input type="number" id="cspRangeValue" class="app-small-input csp-num-input" min="0" max="${CSP_CONFIG.rangeValueMax}"
                    step="${mileMode ? "0.1" : "1"}"
                    value="${rangeValue}"
                    ${rangeLocked ? "disabled" : ""}>
            </div>
        </div>

        <div class="custom-class-field">
            <label for="cspAreaType">${escapeCspHtml(cspT("cspAreaTypeLabel", "Zauberbereich (in Meter)"))}</label>
            <div class="csp-field-row">
                <select id="cspAreaType" class="dropdown csp-field-select" onchange="onCspAreaTypeChange()">${areaOpts}</select>
                <input type="number" id="cspAreaValue" class="app-small-input csp-num-input" min="0" max="${CSP_CONFIG.areaMax}"
                    step="${(typeof currentLang !== "undefined" && currentLang === "de") ? "0.1" : "1"}"
                    value="${Number(customSpellDraft.spellAreaUi) || 0}"
                    ${areaOn ? "" : "disabled"}>
            </div>
        </div>

        <div class="custom-class-field csp-focus-field">
            <div class="custom-class-check-grid csp-focus-grid">
                <label class="csp-check-item"><input type="checkbox" id="cspConcentration" ${customSpellDraft.concentration ? "checked" : ""}>
                    ${escapeCspHtml(cspT("concentrationLabel", "Konzentration"))}</label>
                <label class="csp-check-item"><input type="checkbox" id="cspRitual" ${customSpellDraft.ritual ? "checked" : ""}>
                    ${escapeCspHtml(cspT("ritualLabel", "Ritual"))}</label>
            </div>
        </div>

        <div class="csp-tab2-footer">
            <button type="button" class="custom-class-action-btn" onclick="clearCustomSpellDraft()">${escapeCspHtml(cspT("clearBtnLabel", "Leeren"))}</button>
            <button type="button" class="custom-class-action-btn" onclick="saveCustomSpellDraft()">${escapeCspHtml(cspT("cspAddSpellBtnLabel", "Bestätigen"))}</button>
        </div>
    `;

    ["de", "en"].forEach(lang => {
        if (typeof updateCustomClassCharCounter === "function") {
            updateCustomClassCharCounter(`cspName_${lang}`, `cspNameCount_${lang}`, CSP_CONFIG.nameMax);
            updateCustomClassCharCounter(`cspDesc_${lang}`, `cspDescCount_${lang}`, CSP_CONFIG.descMax);
        }
    });
}

function onCspComponentChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const wrap = document.getElementById("cspMaterialWrap");
    if (wrap) {
        wrap.classList.toggle("is-visible", (customSpellDraft.components || []).includes("compMLabel"));
    }
}

function onCspCastingTimeChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const locked = customSpellDraft.castingTime === "reactionLabel";
    const el = document.getElementById("cspCastingTimeValue");
    if (el) {
        el.disabled = locked;
        if (locked) {
            el.value = "0";
            customSpellDraft.castingTimeValue = 0;
        } else if (!(Number(el.value) > 0)) {
            el.value = "1";
            customSpellDraft.castingTimeValue = 1;
        }
    }
}

function onCspDurationChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const locked = customSpellDraft.duration === "instantaneousLabel"
        || customSpellDraft.duration === "untilDispelledLabel";
    const el = document.getElementById("cspDurationValue");
    if (el) {
        el.disabled = locked;
        if (locked) {
            el.value = "0";
            customSpellDraft.durationTimeValue = 0;
        } else if (!(Number(el.value) > 0)) {
            el.value = "1";
            customSpellDraft.durationTimeValue = 1;
        }
    }
}

function onCspRangeModeChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const el = document.getElementById("cspRangeValue");
    if (!el) return;
    const locked = customSpellDraft.rangeMode !== "unit";
    el.disabled = locked;
    if (customSpellDraft.rangeMode === "mileLabel") {
        el.step = "0.1";
        el.value = (typeof currentLang !== "undefined" && currentLang === "en") ? "1" : "1.5";
    } else {
        el.step = "1";
        if (locked) el.value = "0";
    }
}

function onCspAreaTypeChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const el = document.getElementById("cspAreaValue");
    if (!el) return;
    const on = customSpellDraft.spellAreaType && customSpellDraft.spellAreaType !== 0
        && customSpellDraft.spellAreaType !== "0";
    el.disabled = !on;
    if (!on) {
        el.value = "0";
        customSpellDraft.spellAreaUi = 0;
    }
}

function onCspClassModeChange() {
    if (!customSpellDraft) return;
    syncCspDraftFromDom();
    const grid = document.getElementById("cspClassGrid");
    if (grid) grid.style.display = customSpellDraft.classListMode === "manual" ? "" : "none";
}

function syncCspDraftFromDom() {
    if (!customSpellDraft) return;
    const langs = customSpellDraft.availableLanguages || ["de"];
    langs.forEach(lang => {
        const n = document.getElementById(`cspName_${lang}`);
        const d = document.getElementById(`cspDesc_${lang}`);
        if (n) customSpellDraft.names[lang] = n.value;
        if (d) customSpellDraft.descriptions[lang] = d.value;
    });
    const level = document.getElementById("cspSpellLevel");
    if (level) customSpellDraft.spellLevel = level.value;
    const school = document.getElementById("cspSpellSchool");
    if (school) customSpellDraft.spellSchool = school.value;
    customSpellDraft.components = Array.from(document.querySelectorAll('input[name="cspComp"]:checked'))
        .map(el => el.value);
    const mat = document.getElementById("cspSpellMaterial");
    if (mat) customSpellDraft.spellMaterial = mat.value;
    const ct = document.getElementById("cspCastingTime");
    if (ct) customSpellDraft.castingTime = ct.value;
    const ctv = document.getElementById("cspCastingTimeValue");
    if (ctv) {
        customSpellDraft.castingTimeValue = customSpellDraft.castingTime === "reactionLabel"
            ? 0
            : (parseInt(ctv.value, 10) || 1);
    }
    const dur = document.getElementById("cspDuration");
    if (dur) customSpellDraft.duration = dur.value;
    const durv = document.getElementById("cspDurationValue");
    if (durv) customSpellDraft.durationTimeValue = parseInt(durv.value, 10) || 0;
    customSpellDraft.concentration = !!document.getElementById("cspConcentration")?.checked;
    customSpellDraft.ritual = !!document.getElementById("cspRitual")?.checked;
    const rm = document.getElementById("cspRangeMode");
    if (rm) customSpellDraft.rangeMode = rm.value;
    const rv = document.getElementById("cspRangeValue");
    if (rv) customSpellDraft.rangeValueUi = parseFloat(rv.value) || 0;
    const at = document.getElementById("cspAreaType");
    if (at) customSpellDraft.spellAreaType = at.value === "0" ? 0 : at.value;
    const av = document.getElementById("cspAreaValue");
    if (av) customSpellDraft.spellAreaUi = parseFloat(av.value) || 0;
    // classLabel nicht aus Pack-Kontext überschreiben (Consumer-Sache / Legacy auf dem Spell)
}

function clearCustomSpellDraft() {
    if (!customSpellDraft) return;
    const dirty = (customSpellDraft.names?.de || customSpellDraft.names?.en
        || customSpellDraft.descriptions?.de || customSpellDraft.descriptions?.en);
    if (dirty) {
        const msg = cspT("cspClearDraftConfirmLabel",
            "Einträge dieses Zaubers verwerfen und Maske leeren?");
        if (!confirm(msg)) return;
    }
    const keepId = customSpellDraft.ID;
    customSpellDraft = createEmptyCustomSpellDraft();
    customSpellDraft.ID = keepId;
    renderCustomSpellTab2();
}

function validateCustomSpellDraft() {
    if (!customSpellDraft) return { ok: false, errorKey: "cspNameRequiredAlertLabel" };
    syncCspDraftFromDom();
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const name = String(customSpellDraft.names[active] || "").trim();
    const desc = String(customSpellDraft.descriptions[active] || "").trim();
    if (!name) return { ok: false, errorKey: "cspNameRequiredAlertLabel" };
    if (!desc) return { ok: false, errorKey: "cspDescRequiredAlertLabel" };
    if (!customSpellDraft.spellLevel) return { ok: false, errorKey: "cspLevelRequiredAlertLabel" };
    if (!customSpellDraft.spellSchool) return { ok: false, errorKey: "cspSchoolRequiredAlertLabel" };
    if (!Array.isArray(customSpellDraft.components) || !customSpellDraft.components.length) {
        return { ok: false, errorKey: "cspComponentsRequiredAlertLabel" };
    }
    if (customSpellDraft.components.includes("compMLabel")
        && !String(customSpellDraft.spellMaterial || "").trim()) {
        return { ok: false, errorKey: "cspMaterialRequiredAlertLabel" };
    }
    const castLocked = customSpellDraft.castingTime === "reactionLabel";
    const ctv = Number(customSpellDraft.castingTimeValue);
    if (castLocked) {
        customSpellDraft.castingTimeValue = 0;
    } else if (!Number.isFinite(ctv) || ctv < 1) {
        return { ok: false, errorKey: "cspCastingTimeRequiredAlertLabel" };
    }
    const durLocked = customSpellDraft.duration === "instantaneousLabel"
        || customSpellDraft.duration === "untilDispelledLabel";
    if (!durLocked) {
        const dv = Number(customSpellDraft.durationTimeValue);
        if (!Number.isFinite(dv) || dv < 1) return { ok: false, errorKey: "cspDurationRequiredAlertLabel" };
    }
    if (customSpellDraft.rangeMode === "unit") {
        const rv = Number(customSpellDraft.rangeValueUi);
        if (!Number.isFinite(rv) || rv <= 0) return { ok: false, errorKey: "cspRangeRequiredAlertLabel" };
    }
    if (customSpellDraft.spellAreaType && customSpellDraft.spellAreaType !== 0) {
        const av = Number(customSpellDraft.spellAreaUi);
        if (!Number.isFinite(av) || av <= 0) return { ok: false, errorKey: "cspAreaRequiredAlertLabel" };
    }

    // Option A: keine Listen-/Klassenbindung in der Bibliothek
    const classLabels = Array.isArray(customSpellDraft.classLabel)
        ? customSpellDraft.classLabel.slice()
        : (customSpellDraft.classLabel ? [customSpellDraft.classLabel] : []);

    return { ok: true, classLabels };
}

function buildSpellSlugFromName(name, existingId) {
    const base = (typeof slugifyClassName === "function")
        ? slugifyClassName(name)
        : String(name || "spell").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    let slug = `custom_spell_${base}Label`;
    const used = new Set((customSpellEditorState?.spells || [])
        .filter(s => s.ID !== existingId)
        .map(s => s.translationLabel));
    if (!used.has(slug)) return slug;
    let i = 2;
    while (used.has(`custom_spell_${base}_${i}Label`)) i += 1;
    return `custom_spell_${base}_${i}Label`;
}

function compileSpellFromDraft(draft, classLabels) {
    const active = typeof getActiveUiLang === "function" ? getActiveUiLang() : "de";
    const name = String(draft.names[active] || draft.names.de || draft.names.en || "spell").trim();
    const existingId = draft.ID || customSpellEditingId;
    const translationLabel = existingId
        ? ((customSpellEditorState.spells || []).find(s => s.ID === existingId)?.translationLabel
            || buildSpellSlugFromName(name, existingId))
        : buildSpellSlugFromName(name, null);
    const spellDLabel = translationLabel.endsWith("Label")
        ? `${translationLabel.slice(0, -5)}D`
        : `${translationLabel}D`;

    let spellRange;
    if (draft.rangeMode === "selfLabel" || draft.rangeMode === "touchLabel"
        || draft.rangeMode === "mileLabel") {
        spellRange = draft.rangeMode;
    } else {
        const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
        const uiVal = Number(draft.rangeValueUi) || 0;
        spellRange = lang === "de" ? cspDisplayMetersToFeet(uiVal) : Math.round(uiVal);
    }

    const focus = [];
    if (draft.concentration) focus.push("concentrationLabel");
    if (draft.ritual) focus.push("ritualLabel");
    const spellFocus = focus.length === 0 ? 0 : (focus.length === 1 ? focus[0] : focus);

    const durLocked = draft.duration === "instantaneousLabel"
        || draft.duration === "untilDispelledLabel";

    const spell = {
        ID: existingId || peekNextCustomSpellId(customSpellEditorState),
        translationLabel,
        spellDLabel,
        spellLevel: draft.spellLevel,
        spellSchool: draft.spellSchool,
        components: (draft.components || []).slice(),
        // Custom-Zauber: Material immer 0 — Text gehört in die Beschreibung (wie PHB)
        spellMaterial: 0,
        castingTimeValue: draft.castingTime === "reactionLabel"
            ? 0
            : Math.max(1, parseInt(draft.castingTimeValue, 10) || 1),
        castingTime: draft.castingTime,
        durationTimeValue: durLocked ? 0 : Math.max(1, parseInt(draft.durationTimeValue, 10) || 1),
        duration: draft.duration,
        spellFocus,
        spellRange,
        spellArea: (() => {
            if (!draft.spellAreaType || draft.spellAreaType === 0) return 0;
            const uiVal = Number(draft.spellAreaUi) || 0;
            const lang = (typeof currentLang !== "undefined" && currentLang) ? currentLang : "de";
            const feet = lang === "de" ? cspDisplayMetersToFeet(uiVal) : Math.round(uiVal);
            return Math.max(1, feet || 1);
        })(),
        spellAreaType: draft.spellAreaType && draft.spellAreaType !== 0 ? draft.spellAreaType : 0,
        attack_save: 0,
        spellDamage_effect: 0,
        classLabel: (() => {
            const labels = Array.isArray(classLabels) ? classLabels.filter(Boolean) : [];
            if (!labels.length) return [];
            return labels.length === 1 ? labels[0] : labels.slice();
        })(),
        subclassLabel: 0,
        isCustom: true
    };
    if (typeof applyCustomContentSource === "function") applyCustomContentSource(spell);
    else if (typeof CUSTOM_CONTENT_SOURCE !== "undefined") {
        spell.source = CUSTOM_CONTENT_SOURCE.slice();
    }

    const translations = {
        de: Object.assign({}, customSpellEditorState.translations.de),
        en: Object.assign({}, customSpellEditorState.translations.en)
    };
    const materialText = (draft.components || []).includes("compMLabel")
        ? String(draft.spellMaterial || "").trim()
        : "";
    (draft.availableLanguages || [active]).forEach(lang => {
        if (!translations[lang]) translations[lang] = {};
        translations[lang][translationLabel] = String(draft.names[lang] || "").trim();
        translations[lang][spellDLabel] = cspAppendMaterialToDescription(
            String(draft.descriptions[lang] || "").trim(),
            materialText
        );
    });

    return { spell, translations, translationLabel, spellDLabel };
}

function saveCustomSpellDraft() {
    if (!customSpellEditorState || !customSpellDraft) return;
    const result = validateCustomSpellDraft();
    if (!result.ok) {
        alert(cspT(result.errorKey, result.errorKey));
        return;
    }

    const isNew = !customSpellDraft.ID && !customSpellEditingId;
    if (isNew && (customSpellEditorState.spells || []).length >= CSP_CONFIG.maxSpellsPerPack) {
        alert(cspT("cspMaxSpellsAlertLabel", "Maximal 100 Zauber pro Bibliothek."));
        return;
    }

    const compiled = compileSpellFromDraft(customSpellDraft, result.classLabels);
    const idx = (customSpellEditorState.spells || []).findIndex(s => s.ID === compiled.spell.ID);
    if (idx >= 0) customSpellEditorState.spells[idx] = compiled.spell;
    else customSpellEditorState.spells.push(compiled.spell);

    customSpellEditorState.translations = compiled.translations;
    customSpellEditorState.nextId = peekNextCustomSpellId(customSpellEditorState);

    // Session-Translations für Live-Anzeige
    if (typeof translations !== "undefined") {
        Object.assign(translations.de, compiled.translations.de || {});
        Object.assign(translations.en, compiled.translations.en || {});
    }

    if (typeof syncCustomSpellsIntoClassSpellList === "function") {
        try {
            syncCustomSpellsIntoClassSpellList(compiled.spell);
        } catch (e) {
            console.warn("syncCustomSpellsIntoClassSpellList fehlgeschlagen:", e);
        }
    }

    customSpellEditingId = null;
    customSpellDraft = null;
    switchCustomSpellTab(1);
}

function escapeCspHtml(str) {
    if (typeof escapeLfHtml === "function") return escapeLfHtml(str);
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

//=======================================================================
// Export / Wrap / Snapshot
//=======================================================================

function buildCustomSpellPackProvides(state) {
    return (state?.spells || []).map(s => ({
        kind: "spell",
        id: s.ID,
        slug: s.translationLabel || undefined
    }));
}

/**
 * Bibliothek ist Blatt — keine Dependencies nach oben.
 */
function buildCustomSpellPackDependencies(state) {
    return [];
}

function buildCustomSpellPackExportPayload(state) {
    if (!state) return null;
    // Bibliothek: Spells unverändert (kein Force-Stamp); keine Bindungsfelder
    const spells = (state.spells || []).map(s => Object.assign({}, s));
    const flatPayload = {
        version: 1,
        type: "customSpellPack",
        packageId: state.packageId || null,
        availableLanguages: (state.availableLanguages || []).slice(),
        translations: {
            de: Object.assign({}, state.translations?.de || {}),
            en: Object.assign({}, state.translations?.en || {})
        },
        spells,
        nextId: peekNextCustomSpellId(state)
    };

    const stateForWrap = Object.assign({}, state, { spells });
    if (typeof wrapCustomSpellPackExport === "function") {
        return wrapCustomSpellPackExport(stateForWrap, flatPayload);
    }
    if (typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined") {
        return wrapDcPackage({
            packageType: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
            packageId: state.packageId || undefined,
            createdAt: state.packageCreatedAt || undefined,
            provides: buildCustomSpellPackProvides(stateForWrap),
            dependencies: buildCustomSpellPackDependencies(stateForWrap),
            payload: flatPayload
        });
    }
    return flatPayload;
}

function getCustomSpellPackExportSnapshotString(exportData) {
    if (exportData && exportData.dc && exportData.payload) {
        return JSON.stringify({
            packageId: exportData.dc.packageId,
            verificationCode: exportData.dc.verificationCode,
            provides: exportData.dc.provides || [],
            dependencies: exportData.dc.dependencies || [],
            payload: exportData.payload
        });
    }
    return JSON.stringify(exportData);
}

function downloadCspJson(filename, data) {
    if (typeof downloadJson === "function") {
        downloadJson(filename, data);
        return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function buildCustomSpellPackFilename(state) {
    const prefix = CSP_CONFIG.filenamePrefix || "custom_spells";
    const stamp = (typeof formatCustomClassDate === "function")
        ? formatCustomClassDate(new Date())
        : (() => {
            const d = new Date();
            const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
            return `${String(d.getDate()).padStart(2, "0")}${months[d.getMonth()]}${d.getFullYear()}`;
        })();
    return `${prefix}_${stamp}.json`;
}

/**
 * Pack speichern / Beenden: Download nur bei Änderung, Runtime registrieren.
 */
function finishCustomSpellPack() {
    if (!customSpellEditorState) {
        closeCustomSpellModal();
        return;
    }
    const payload = buildCustomSpellPackExportPayload(customSpellEditorState);
    if (payload?.dc?.packageId) {
        customSpellEditorState.packageId = payload.dc.packageId;
        customSpellEditorState.packageCreatedAt =
            payload.dc.createdAt || customSpellEditorState.packageCreatedAt;
    }

    const currentSnapshot = getCustomSpellPackExportSnapshotString(payload);
    const changed = customSpellImportSnapshot == null
        || currentSnapshot !== customSpellImportSnapshot;

    if (changed) {
        downloadCspJson(buildCustomSpellPackFilename(customSpellEditorState), payload);
        customSpellImportSnapshot = currentSnapshot;
    }

    if (typeof markDcPackageUserLoaded === "function") {
        markDcPackageUserLoaded(
            (typeof DC_PACKAGE_TYPE !== "undefined")
                ? DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK
                : "customSpellPack"
        );
    }

    registerCustomSpellPackFromPayload(
        payload?.payload || payload,
        payload?.dc || null
    );

    discardCustomSpellEditor();
    if (typeof populateSpells === "function") {
        try { populateSpells(); } catch (e) { /* ignore */ }
    }
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
}

//=======================================================================
// Runtime-Registrierung
//=======================================================================

function clearRegisteredCustomSpellPack() {
    registeredCustomSpellPack = {
        packageId: null,
        verificationCode: null,
        linkedClassSlug: null,
        linkedSubclassSlug: null,
        linkedSubclassCategoryNumber: null,
        spellListLabels: [],
        spells: [],
        translations: { de: {}, en: {} },
        availableLanguages: [],
        nextId: CUSTOM_SPELL_ID_MIN,
        rawPayload: null,
        envelope: null
    };
}

function registerCustomSpellPackFromPayload(payload, envelope) {
    if (!payload || !Array.isArray(payload.spells)) return false;

    // Übersetzungen in Session mergen
    if (payload.translations?.de && typeof translations !== "undefined") {
        Object.assign(translations.de, payload.translations.de);
    }
    if (payload.translations?.en && typeof translations !== "undefined") {
        Object.assign(translations.en, payload.translations.en);
    }

    // Bibliothek: Spells wie in der Datei (kein Force-Stamp von classLabel)
    const spells = payload.spells.map(s => {
        const copy = Object.assign({}, s, { isCustom: true });
        if (typeof applyCustomContentSource === "function") applyCustomContentSource(copy);
        else if (typeof CUSTOM_CONTENT_SOURCE !== "undefined") {
            copy.source = CUSTOM_CONTENT_SOURCE.slice();
        }
        return copy;
    });

    registeredCustomSpellPack = {
        packageId: envelope?.packageId || payload.packageId || null,
        verificationCode: envelope?.verificationCode
            || (envelope?.packageId && typeof buildDcVerificationCode === "function"
                ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK, envelope.packageId)
                : null),
        linkedClassSlug: null,
        linkedSubclassSlug: null,
        linkedSubclassCategoryNumber: null,
        spellListLabels: [],
        spells,
        translations: {
            de: Object.assign({}, payload.translations?.de || {}),
            en: Object.assign({}, payload.translations?.en || {})
        },
        availableLanguages: Array.isArray(payload.availableLanguages)
            ? payload.availableLanguages.slice()
            : [],
        nextId: Number.isFinite(Number(payload.nextId))
            ? Math.max(CUSTOM_SPELL_ID_MIN, parseInt(payload.nextId, 10))
            : peekNextCustomSpellId({ spells }),
        rawPayload: payload,
        envelope: envelope || null
    };

    persistCustomSpellPackRuntimeToLocalStorage();
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

function persistCustomSpellPackRuntimeToLocalStorage() {
    const pack = (typeof registeredCustomSpellPack !== "undefined")
        ? registeredCustomSpellPack
        : null;
    if (!pack || !Array.isArray(pack.spells) || !pack.spells.length) return false;

    const base = pack.rawPayload || {};
    // Bibliothek: Runtime ohne Bindungsfelder (Legacy-Keys in rawPayload ignorieren)
    const flat = {
        version: 1,
        type: "customSpellPackRuntime",
        packageId: pack.packageId || base.packageId || null,
        availableLanguages: Array.isArray(pack.availableLanguages) && pack.availableLanguages.length
            ? pack.availableLanguages.slice()
            : (Array.isArray(base.availableLanguages) ? base.availableLanguages.slice() : []),
        translations: {
            de: Object.assign({}, base.translations?.de || {}, pack.translations?.de || {}),
            en: Object.assign({}, base.translations?.en || {}, pack.translations?.en || {})
        },
        spells: pack.spells,
        nextId: pack.nextId
    };
    try {
        const wrapped = (typeof wrapCustomSpellPackExport === "function")
            ? wrapCustomSpellPackExport({
                packageId: pack.packageId || flat.packageId,
                packageCreatedAt: pack.envelope?.createdAt || base.packageCreatedAt,
                spells: flat.spells
            }, flat)
            : ((typeof wrapDcPackage === "function" && typeof DC_PACKAGE_TYPE !== "undefined")
                ? wrapDcPackage({
                    packageType: DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK,
                    packageId: pack.packageId || flat.packageId || undefined,
                    provides: (typeof buildCustomSpellPackProvides === "function")
                        ? buildCustomSpellPackProvides({ spells: flat.spells })
                        : [],
                    dependencies: pack.envelope?.dependencies || base.dependencies || [],
                    payload: flat
                })
                : flat);
        localStorage.setItem(CUSTOM_SPELL_PACK_LS_KEY, JSON.stringify(wrapped));
        return true;
    } catch (e) {
        console.warn("customSpellPackRuntime speichern fehlgeschlagen:", e);
        return false;
    }
}

/**
 * true = Charakter hat mindestens einen Zauber aus dem geladenen Custom-Pack gewählt.
 * (finishCharacter → Runtime für den Bogen persistieren)
 */
function characterUsesRegisteredCustomSpellPack(character) {
    const packSpells = (typeof registeredCustomSpellPack !== "undefined"
        && Array.isArray(registeredCustomSpellPack?.spells))
        ? registeredCustomSpellPack.spells
        : [];
    if (!packSpells.length) return false;

    const packIds = new Set();
    packSpells.forEach(s => {
        if (s == null || s.ID == null) return;
        packIds.add(s.ID);
        packIds.add(Number(s.ID));
    });
    if (!packIds.size) return false;

    const buckets = [
        character?.cantrips,
        character?.spells,
        character?.favoredSpells,
        character?.spellbookSpells
    ];
    for (let b = 0; b < buckets.length; b++) {
        const list = buckets[b];
        if (!Array.isArray(list)) continue;
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            const id = (entry && typeof entry === "object") ? entry.spellId : entry;
            if (packIds.has(id) || packIds.has(Number(id))) return true;
        }
    }
    return false;
}

/** Bibliotheks-Zauber für getEffectiveSpellList — nur nach User-Load in dieser Session. */
function getRegisteredCustomSpellPackSpells() {
    const spells = Array.isArray(registeredCustomSpellPack?.spells)
        ? registeredCustomSpellPack.spells
        : [];
    if (!spells.length) return [];
    if (!cspHasUserLoadedSpellPackThisSession()) return [];
    return spells;
}

/** true = Zauber stammt aus der Session-Zauberbibliothek (kein PHB). */
function isSpellFromSessionLibrary(spell) {
    if (!spell || spell.ID == null) return false;
    const pack = getRegisteredCustomSpellPackSpells();
    if (!pack.length) return false;
    const want = spell.ID;
    const wantNum = Number(spell.ID);
    return pack.some(s =>
        s && (s.ID === want || s.ID === wantNum || Number(s.ID) === wantNum)
    );
}

/**
 * Freie Merkmals-Auswahl in Schritt 7.
 * Bibliotheks-Zauber: nur Zaubergrad (keine Klassen-/Listenbindung).
 * PHB-Zauber: Listen + Grad + Schule + Ritual wie bisher.
 *
 * @param {object} spell
 * @param {{ classSource?: any, levelSource?: any, schoolSource?: any, ritualSource?: any }} opts
 */
function spellPassesStep7FreeChoiceFilters(spell, opts) {
    if (!spell) return false;
    const o = opts || {};
    const levelSource = o.levelSource;
    const levelMatch = levelSource === undefined || levelSource === null || levelSource === 0
        || [levelSource].flat().includes(spell.spellLevel);
    if (!levelMatch) return false;

    // Bib: gehört zum Zaubergrad — keine weiteren Listen-Einschränkungen
    if (isSpellFromSessionLibrary(spell)) return true;

    const classSource = o.classSource;
    const labels = Array.isArray(spell.classLabel)
        ? spell.classLabel
        : (spell.classLabel ? [spell.classLabel] : []);
    const classMatch = !classSource || classSource === 0
        || [classSource].flat().some(allowed => labels.includes(allowed));
    if (!classMatch) return false;

    const schoolSource = o.schoolSource;
    const schoolMatch = !schoolSource || schoolSource === 0
        || [schoolSource].flat().includes(spell.spellSchool);
    if (!schoolMatch) return false;

    const ritualSource = o.ritualSource;
    if (!ritualSource || ritualSource === 0) return true;
    return Array.isArray(spell.spellFocus)
        ? spell.spellFocus.includes("ritualLabel")
        : spell.spellFocus === "ritualLabel";
}

//=======================================================================
// Translations (UI-Labels)
//=======================================================================

function applyCspTranslations() {
    const t = (key, fallback) =>
        (typeof tCC === "function" && tCC(key)) || fallback || key;
    const set = (id, key, fallback) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = t(key, fallback);
    };
    set("customSpellModalTitleLabel", "cspModalTitleLabel", "Zauberbibliothek");
    set("customSpellCreateNewBtn", "cspCreateNewLabel", "Zauber erstellen");
    set("customSpellUploadBtn", "cspUploadLabel", "Zauber hochladen (.json)");
    set("customSpellEditorTitleLabel", "cspEditorTitleLabel", "Zauberbibliothek");
    set("customSpellTabOverviewBtn", "cspTabOverviewLabel", "Übersicht");
    set("customSpellTabDetailsBtn", "cspTabDetailsLabel", "Details");
    set("customSpellFinishBtn", "cspSavePackLabel", "Speichern");

    const addBtn = document.getElementById("addCustomSpellBtn");
    if (addBtn) {
        const label = t("addCustomSpellLabel", "Eigene Zauber erstellen");
        addBtn.title = label;
        addBtn.setAttribute("aria-label", label);
    }
    if (customSpellEditorOpen && customSpellActiveTab === 1
        && document.getElementById("customSpellTab1Content")) {
        renderCustomSpellTab1();
    }
}

/**
 * Runtime + LocalStorage + Editor des Spell-Packs vollständig entfernen.
 * (Analog zu Custom-BG / Custom-UC – keine stillen Altlasten im Creator.)
 */
function clearCustomSpellPackRuntimeCompletely() {
    clearRegisteredCustomSpellPack();
    customSpellEditorState = null;
    customSpellImportSnapshot = null;
    customSpellEditorOpen = false;
    customSpellEditingId = null;
    customSpellDraft = null;
    customSpellActiveTab = 1;
    resetCspOverviewFilters();
    try {
        localStorage.removeItem(CUSTOM_SPELL_PACK_LS_KEY);
    } catch (e) {
        console.warn("customSpellPackRuntime löschen fehlgeschlagen:", e);
    }
    const overlay = document.getElementById("customSpellOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    if (typeof updateStep1CustomHub === "function") updateStep1CustomHub();
    return true;
}

/**
 * Creator-Start / Seiten-Reset: keine LS-Hydration.
 * Spell-Pack muss in dieser Session neu hochgeladen/erstellt werden.
 * (Bogen hydriert weiterhin über customFeaturesSheet.js.)
 */
function resetCustomSpellPackRuntimeOnCreatorLoad() {
    // --- LEVEL-UP: Runtime aus Snapshot behalten ---
    if (typeof shouldSkipCreatorRuntimeResetForLevelUp === "function"
        && shouldSkipCreatorRuntimeResetForLevelUp()) {
        return;
    }
    clearCustomSpellPackRuntimeCompletely();
}

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        try {
            resetCustomSpellPackRuntimeOnCreatorLoad();
        } catch (e) {
            console.warn(e);
        }
        if (typeof applyCspTranslations === "function") applyCspTranslations();
    });
}
