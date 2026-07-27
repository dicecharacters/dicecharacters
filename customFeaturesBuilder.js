//=======================================================================
// Custom Features Builder
//=======================================================================
// Zentrale Datei für alle Custom-Builder-UIs in der Charaktererstellung.
//
// Aufbau (Abschnitte):
//   0. Shared Utilities          – gemeinsame Helfer für alle Builder
//   1. Custom Class Builder      – aktiv (Kern, Stufen, UC, Compile, UI)
//   2. Custom Subclass Builder   – geplant (eigenständige UC außerhalb Klasse)
//   3. Custom Background Builder – geplant
//   4. Custom Species Builder    – geplant
//   5. Custom Feats Builder      – geplant
//   6. Custom Spell Builder      – geplant
//
// Charakterbogen-Logik gehört nach customFeaturesSheet.js (nicht hier).
//=======================================================================

//=======================================================================
// Feature-Sichtbarkeit (Release-Schalter)
//=======================================================================
// 0 = Feature aus (UI versteckt, Einstieg blockiert)
// 1 = Feature an (Nutzer kann die Funktion nutzen)
// Schalter sind voneinander unabhängig → gestaffelte Updates möglich.
//=======================================================================

const CUSTOM_FEATURE_FLAGS = {
    /** Custom-Klassen-Ersteller: „+“-Button in Schritt 1 */
    customClassBuilder: 0

    // Weitere Schalter (später einkommentieren / auf 1 setzen):
    // customSubclassBuilder: 0,
    // customBackgroundBuilder: 0,
    // customSpeciesBuilder: 0,
    // customFeatsBuilder: 0,
    // customSpellBuilder: 0
};

/** true, wenn der genannte Feature-Schalter auf 1 steht */
function isCustomFeatureEnabled(flagKey) {
    return Number(CUSTOM_FEATURE_FLAGS[flagKey]) === 1;
}

/**
 * UI an Feature-Flags anpassen (Buttons/Einstiege ein- oder ausblenden).
 * Bei neuen Custom-Features hier die zugehörigen DOM-Knoten ergänzen.
 * Hinweis: Sichtbarkeit läuft über CSS-Klasse cc-feature-enabled (nicht nur inline),
 * weil .add-custom-class-item sonst per !important wieder eingeblendet wird.
 */
function applyCustomFeatureVisibility() {
    const classBuilderOn = isCustomFeatureEnabled("customClassBuilder");
    const addClassItem = document.getElementById("addCustomClassListItem");
    const addClassBtn = document.getElementById("addCustomClassBtn");
    if (addClassItem) {
        addClassItem.classList.toggle("cc-feature-enabled", classBuilderOn);
        addClassItem.setAttribute("aria-hidden", classBuilderOn ? "false" : "true");
    }
    if (addClassBtn) {
        addClassBtn.disabled = !classBuilderOn;
        addClassBtn.tabIndex = classBuilderOn ? 0 : -1;
    }
    // Modal schließen, falls Feature deaktiviert und Overlay noch offen
    if (!classBuilderOn) {
        const overlay = document.getElementById("customClassOverlay");
        if (overlay && overlay.style.display !== "none" && overlay.style.display !== "") {
            if (typeof closeCustomClassModal === "function") closeCustomClassModal();
        }
    }
}

(function scheduleApplyCustomFeatureVisibility() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyCustomFeatureVisibility);
    } else {
        applyCustomFeatureVisibility();
    }
})();

//=======================================================================
// 0. Shared Utilities
//=======================================================================
// Aktuell noch überwiegend klassenbezogen benannt; bei weiteren Buildern
// schrittweise hierher extrahieren (clamp, Char-Counter, Escape, …).
//=======================================================================

//=======================================================================
// 1. Custom Class Builder
//=======================================================================
// Phase: Kernmerkmale, Stufenmerkmale, Unterklassen, Import/Export, Compile
//=======================================================================

const CUSTOM_CLASS_ID_MIN = 1000;
const CUSTOM_CLASS_FOCUS_OPTIONS = [
    "arcaneFocusLabel",
    "druidicFocusLabel",
    "holySymbolLabel",
    "musicalInstrumentLabel",
    "spellbookLabel"
];

/** Fokus-Optionen ohne Zauberbuch (Unterklassen-Zauberwirken) */
function getLfSpellcastingFocusOptionsForSlot(slot) {
    if (isLfSubclassFeatureSlot(slot)) {
        return CUSTOM_CLASS_FOCUS_OPTIONS.filter(l => l !== "spellbookLabel");
    }
    return CUSTOM_CLASS_FOCUS_OPTIONS.slice();
}

/** Anzeigetext für Fokus-Checkbox; Zauberbuch hervorgehoben */
function formatLfSpellcastingFocusOptionLabel(label) {
    const text = escapeLfHtml(tCC(label));
    if (label === "spellbookLabel") {
        return `<span class="cc-spellbook-focus-label">${text}</span>`;
    }
    return text;
}

/** Basis-Klasse hat Zauberbuch als Fokus gewählt */
function customClassStateUsesSpellbook(state) {
    const st = state || (typeof customClassEditorState !== "undefined" ? customClassEditorState : null);
    return normalizeToArray(st?.spellcastingFocus).includes("spellbookLabel");
}
/** Oberflächen-Kategorien: konkrete Auswahl erst in Schritt 6 */
const CUSTOM_CLASS_TOOL_SURFACE_OPTIONS = [
    "artisansToolsLabel",
    "musicalInstrumentLabel",
    "gamingSetLabel"
];
const CUSTOM_CLASS_NAME_MAX = 30;
const CUSTOM_CLASS_DESC_MAX = 500;
const CUSTOM_CLASS_EQUIP_MAX_ITEMS = 10;
const CUSTOM_CLASS_AMOUNT_MAX = 999;
const CUSTOM_CLASS_GOLD_MAX = 999;

/** Begrenzt Zahlenfelder bei Tastatureingabe (max-Attribut greift nur bei Pfeiltasten) */
function clampCustomClassNumberInput(input, min, max) {
    if (!input || input.value === "") return;
    const val = parseInt(input.value, 10);
    if (isNaN(val)) return;
    if (val > max) input.value = String(max);
    else if (val < min) input.value = String(min);
}

/** Setzt leere oder ungültige Zahlenfelder auf den Mindestwert */
function finalizeCustomClassNumberInput(input, min, max) {
    if (!input) return;
    if (input.value === "" || isNaN(parseInt(input.value, 10))) {
        input.value = String(min);
        return;
    }
    clampCustomClassNumberInput(input, min, max);
}

/** JSON-Snapshot nach Import – kein erneuter Download ohne Änderungen */
let customClassImportSnapshot = null;
let customClassPendingImportSnapshot = false;

/** Aktuell registrierte Custom Class (nur eine gleichzeitig) */
let registeredCustomClass = {
    translationLabel: null,
    id: null,
    translationKeys: [],
    compiledClassData: null,
    compiledSubclassList: null,
    compiledMagicSkillsList: null,
    compiledSubclassSpellsList: null,
    compiledSubclassSpellAbilityList: null,
    packageId: null,
    verificationCode: null,
    packageCreatedAt: null,
    runtimePackageId: null,
    runtimeCreatedAt: null
};

/** Editor-Zustand inkl. Boilerplates für Tab 2/3 */
let customClassEditorState = createEmptyCustomClassState();

function createEmptyCustomClassState() {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    return {
        id: null,
        slug: null,
        /** Welche Sprachfelder im Editor gepflegt werden (UI-aktive Sprache immer enthalten) */
        availableLanguages: [active],
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        primaryAbility: [],
        hitPointDie: "D8",
        savingThrowProficiencies: [],
        skillCategoryNumber: [],
        spellcastingLabel: 0,
        spellcastingAbility: 0,
        spellcastingFocus: [],
        weaponCategoryNumber: [],
        weaponPropertyCategoryNumber: [],
        armorCategoryNumber: [],
        toolLabel: 0,
        equipment: {
            A: { enabled: true, items: [], gp: 0 },
            B: { enabled: true, items: [], gp: 0 },
            C: { enabled: false, items: [], gp: 0 }
        },
        levelFeatures: [],
        subclasses: [],
        /** Klassenweite Parameter (Einfach → Frei), über Stufen wiederverwendbar */
        parameterRegistry: [],
        /** Tab 4: Zauberprogression (1 Zeile/Stufe; Standard = Wizard-Vorlage) */
        spellcastingProgression: {
            unlocked: false,
            startLevel: null,
            mode: "standard",
            /** Grundlisten aus Tab-2/3-Maske (Eingangsstufe) */
            baseSpellListLabels: [],
            /** User-Konfig bleibt beim Moduswechsel erhalten */
            userRows: {}
        },
        /** DC-Package: stabile Paket-ID (über Speichern/Re-Import) */
        packageId: null,
        packageCreatedAt: null,
        verificationCode: null
    };
}

/** Unterstützte Editor-Sprachen (erweiterbar) */
function getCustomClassSupportedLangs() {
    return ["de", "en"];
}

function getActiveUiLang() {
    return typeof currentLang !== "undefined" ? currentLang : "de";
}

function getCustomClassLangTitle(lang) {
    return lang === "de" ? tCC("customClassLangDeLabel") : tCC("customClassLangEnLabel");
}

/** Aktive UI-Sprache ist immer verfügbar und nicht abwählbar */
function ensureAvailableLanguages(state) {
    const st = state || customClassEditorState;
    const active = getActiveUiLang();
    const supported = getCustomClassSupportedLangs();
    let langs = Array.isArray(st.availableLanguages)
        ? st.availableLanguages.filter(l => supported.includes(l))
        : [];
    if (!langs.includes(active)) langs = [active, ...langs.filter(l => l !== active)];
    if (!langs.length) langs = [active];
    st.availableLanguages = langs;
    return langs;
}

function isCustomClassLangAvailable(lang) {
    return ensureAvailableLanguages(customClassEditorState).includes(lang);
}

/** Einheitlicher Aufklapp-Pfeil (▼), konsistent zur restlichen Seite */
function getCcCollapseArrowHtml(collapsed) {
    return `<span class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>`;
}

function toggleCcLangHeader(headerEl) {
    if (!headerEl) return;
    const body = headerEl.nextElementSibling;
    if (!body) return;
    body.classList.toggle("collapsed");
    const collapsed = body.classList.contains("collapsed");
    const arrow = headerEl.querySelector(".cc-collapse-arrow");
    if (arrow) arrow.classList.toggle("is-collapsed", collapsed);
}

function tCC(key, fallback = "") {
    const elements = (typeof translations !== "undefined" && translations[currentLang]) || {};
    return elements[key] || fallback || key;
}

function isRegisteredCustomClass(className) {
    if (!className || !registeredCustomClass.translationLabel) return false;
    return String(className).toLowerCase() === String(registeredCustomClass.translationLabel).toLowerCase();
}

/** true = Kategorie mit späterer Auswahl in Schritt 6 / Tab 2 */
function isCustomClassToolChoiceLabel(label) {
    return CUSTOM_CLASS_TOOL_SURFACE_OPTIONS.includes(label);
}

/**
 * Feste Tool-Meisterschaften der Custom Class ohne Auswahlbedarf.
 * Kategorien (Handwerkszeug/Instrument/Spiel) werden bewusst übersprungen.
 */
function appendFixedCustomClassToolProficiencies(selectedTools) {
    if (!Array.isArray(selectedTools) || !isRegisteredCustomClass(character.class)) return;
    if (typeof classCoreTraitsList === "undefined" || typeof toolList === "undefined") return;

    const classData = classCoreTraitsList.find(
        cls => cls.translationLabel.toLowerCase() === character.class.toLowerCase()
    );
    if (!classData || classData.toolLabel === 0 || classData.toolLabel == null) return;

    const labels = Array.isArray(classData.toolLabel)
        ? classData.toolLabel
        : [classData.toolLabel];

    labels.forEach(label => {
        if (!label || label === 0 || isCustomClassToolChoiceLabel(label)) return;

        const tool = toolList.find(t => t.translationLabel === label);
        if (!tool) return;
        // Tools mit Unterauswahl (z. B. Instrumente/Spiele) nicht hart setzen
        if (Array.isArray(tool.varies) && tool.varies.length > 0) return;

        const idStr = String(tool.ID);
        if (!selectedTools.includes(idStr)) {
            selectedTools.push(idStr);
        }
    });
}

//=======================================================================
// 1.x Modal öffnen / schließen / Tabs
//=======================================================================

function openCustomClassChooser() {
    if (!isCustomFeatureEnabled("customClassBuilder")) return;
    applyCustomClassModalTranslations();
    document.getElementById("customClassChooserView").style.display = "block";
    document.getElementById("customClassEditorView").style.display = "none";
    const overlay = document.getElementById("customClassOverlay");
    overlay.style.setProperty("display", "flex", "important");
    document.body.classList.add("modal-open");
}

function closeCustomClassModal() {
    if (typeof closeLfFloat === "function") closeLfFloat();
    const overlay = document.getElementById("customClassOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    document.body.classList.remove("modal-open");
    const fileInput = document.getElementById("customClassFileInput");
    if (fileInput) fileInput.value = "";
}

/** Ob im Editor ungespeicherte Eingaben vorliegen (Vergleich per Export-Snapshot) */
function hasUnsavedCustomClassChanges() {
    try {
        const state = collectCustomClassFormState();
        state.levelFeatures = customClassEditorState.levelFeatures || [];
        state.subclasses = customClassEditorState.subclasses || [];
        const current = buildSnapshotFromEditorState(state);
        if (customClassImportSnapshot !== null) {
            return current !== customClassImportSnapshot;
        }
        // Neuerstellung: mit leerem Ausgangszustand vergleichen
        const empty = createEmptyCustomClassState();
        ensureCustomClassLevelFeatureSlots(empty);
        ensureCustomClassSubclasses(empty);
        empty.id = state.id;
        empty.slug = state.slug;
        empty.packageId = state.packageId;
        empty.packageCreatedAt = state.packageCreatedAt;
        empty.verificationCode = state.verificationCode;
        return current !== buildSnapshotFromEditorState(empty);
    } catch (err) {
        // Im Zweifel nachfragen statt Eingaben stillschweigend zu verwerfen
        return true;
    }
}

/**
 * Schließen über „X“: bei ungespeicherten Eingaben erst nachfragen.
 * Klick außerhalb des Fensters schließt den Klassenersteller bewusst nicht.
 */
function requestCloseCustomClassModal() {
    const editorView = document.getElementById("customClassEditorView");
    const editorVisible = editorView && editorView.style.display !== "none";
    if (editorVisible && hasUnsavedCustomClassChanges()) {
        if (!confirm(tCC("customClassCloseConfirmLabel"))) return;
    }
    closeCustomClassModal();
}

function backToCustomClassChooser() {
    document.getElementById("customClassChooserView").style.display = "block";
    document.getElementById("customClassEditorView").style.display = "none";
}

function startCustomClassCreate() {
    customClassEditorState = createEmptyCustomClassState();
    customClassImportSnapshot = null;
    showCustomClassEditor();
}

function triggerCustomClassUpload() {
    const fileInput = document.getElementById("customClassFileInput");
    if (fileInput) fileInput.click();
}

function handleCustomClassFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const finish = () => {
        event.target.value = "";
    };

    if (typeof readAndValidateDcPackageFile !== "function") {
        alert(tCC("customClassImportErrorLabel", "Invalid file."));
        finish();
        return;
    }

    readAndValidateDcPackageFile(file, {
        expectedType: (typeof DC_PACKAGE_TYPE !== "undefined")
            ? DC_PACKAGE_TYPE.CUSTOM_CLASS
            : "customClass"
    }).then(result => {
        try {
            if (!result.ok) {
                alert(result.message || tCC("customClassImportErrorLabel", "Invalid file."));
                return;
            }
            customClassEditorState = hydrateEditorStateFromExport(result.payload, result.envelope);
            customClassPendingImportSnapshot = true;
            showCustomClassEditor();
        } catch (err) {
            console.error(err);
            alert(tCC("customClassImportErrorLabel", "Invalid file."));
        } finally {
            finish();
        }
    });
}

function showCustomClassEditor() {
    applyCustomClassModalTranslations();
    document.getElementById("customClassChooserView").style.display = "none";
    document.getElementById("customClassEditorView").style.display = "block";
    ensureCustomClassLevelFeatureSlots(customClassEditorState);
    ensureCustomClassSubclasses(customClassEditorState);
    renderCustomClassTab1();
    switchCustomClassTab(1);

    if (customClassPendingImportSnapshot) {
        customClassImportSnapshot = buildSnapshotFromEditorState(collectCustomClassFormState());
        customClassPendingImportSnapshot = false;
    }

    const overlay = document.getElementById("customClassOverlay");
    if (overlay.style.display !== "flex") {
        overlay.style.setProperty("display", "flex", "important");
        document.body.classList.add("modal-open");
    }
}

function switchCustomClassTab(tabNumber) {
    if (tabNumber === 4 && !customClassEditorState.spellcastingProgression?.unlocked) {
        return;
    }

    const previousTab = (() => {
        const active = document.querySelector(".custom-class-tab.active");
        return active ? Number(active.dataset.tab) : 1;
    })();

    document.querySelectorAll(".custom-class-tab").forEach(btn => {
        btn.classList.toggle("active", Number(btn.dataset.tab) === tabNumber);
    });
    document.querySelectorAll(".custom-class-tab-panel").forEach((panel, index) => {
        panel.classList.toggle("active", index + 1 === tabNumber);
    });

    onCustomClassTabChange(tabNumber, previousTab);
}

function applyCustomClassModalTranslations() {
    const map = {
        customClassModalTitleLabel: "customClassModalTitleLabel",
        customClassEditorTitleLabel: "customClassModalTitleLabel",
        customClassCreateNewBtn: "customClassCreateNewLabel",
        customClassUploadBtn: "customClassUploadLabel",
        customClassTabCoreBtn: "customClassTabCoreLabel",
        customClassTabLevelsBtn: "customClassTabLevelsLabel",
        customClassTabSubclassBtn: "customClassTabSubclassLabel",
        customClassTabSpellcastingBtn: "customClassTabSpellcastingLabel",
        customClassTab2HintLabel: "customClassTab2HintLabel",
        customClassTab4HintLabel: "customClassTab4HintLabel",
        customClassSaveBtn: "customClassSaveLabel",
        addCustomClassBtn: "addCustomClassLabel"
    };

    Object.keys(map).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === "addCustomClassBtn") {
            el.title = tCC(map[id]);
            el.setAttribute("aria-label", tCC(map[id]));
            return;
        }
        el.textContent = tCC(map[id]);
    });
    updateCustomClassTab4Ui();
}

//=======================================================================
// 1.x Tab 1 rendern
//=======================================================================

function renderCustomClassLangAvailabilityRow() {
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);
    const checks = getCustomClassSupportedLangs().map(lang => {
        const isActive = lang === activeLang;
        const checked = available.includes(lang) ? "checked" : "";
        const disabled = isActive ? "disabled" : "";
        const lockedClass = isActive ? " cc-lang-avail--locked" : "";
        return `<label class="cc-lang-avail-item${lockedClass}">
            <input type="checkbox" name="ccLangAvail" value="${lang}" ${checked} ${disabled}
                onchange="onCustomClassLangAvailabilityChange()">
            ${getCustomClassLangTitle(lang)}
        </label>`;
    }).join("");

    return `
        <div class="custom-class-field custom-class-lang-availability">
            <div class="custom-class-lang-avail-row">
                <span class="custom-class-section-title">${tCC("customClassLangAvailabilityLabel")}</span>
                <div class="custom-class-check-grid custom-class-lang-avail-grid">${checks}</div>
            </div>
        </div>
    `;
}

function syncNameDescFromTab1Dom() {
    getCustomClassSupportedLangs().forEach(lang => {
        const nameEl = document.getElementById(`ccName_${lang}`);
        const descEl = document.getElementById(`ccDesc_${lang}`);
        if (nameEl) customClassEditorState.names[lang] = nameEl.value;
        if (descEl) customClassEditorState.descriptions[lang] = descEl.value;
    });
}

function onCustomClassLangAvailabilityChange() {
    const activeLang = getActiveUiLang();
    syncNameDescFromTab1Dom();
    const selected = Array.from(document.querySelectorAll('input[name="ccLangAvail"]:checked'))
        .map(el => el.value)
        .filter(lang => getCustomClassSupportedLangs().includes(lang));
    if (!selected.includes(activeLang)) selected.unshift(activeLang);
    customClassEditorState.availableLanguages = selected;

    // Hit Die / weitere Tab1-Werte vor Re-Render sichern (Namen bereits oben)
    const hit = document.getElementById("ccHitDie")?.value;
    if (hit) customClassEditorState.hitPointDie = hit;

    renderCustomClassTab1();
}

function renderCustomClassTab1() {
    const container = document.getElementById("customClassTab1Content");
    if (!container) return;

    const req = `<span class="custom-class-required">*</span>`;
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);

    container.innerHTML = `
        ${renderCustomClassLangAvailabilityRow()}

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassNameLabel")} / ${tCC("customClassDescLabel")} ${req}</div>
            ${available.map(lang => renderLangBlock(lang, lang !== activeLang)).join("")}
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("primaryAbilityLabel")} ${tCC("customClassPrimaryMaxLabel", "(max. 2)")} ${req}</div>
            <div class="custom-class-check-grid" id="ccPrimaryAbilityGrid"></div>
        </div>

        <div class="custom-class-field">
            <label for="ccHitDie">${tCC("customClassHitDieLabel")} ${req}</label>
            <select id="ccHitDie" class="dropdown custom-class-hit-die-select">
                <option value="D6">D6</option>
                <option value="D8">D8</option>
                <option value="D10">D10</option>
                <option value="D12">D12</option>
            </select>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassSavingThrowsLabel")} ${req}</div>
            <div class="custom-class-check-grid" id="ccSavingThrowGrid"></div>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassSkillsPoolLabel")} ${req}</div>
            <div class="custom-class-check-grid" id="ccSkillGrid"></div>
        </div>

        <div class="custom-class-field">
            <label class="custom-class-section-title">
                <input type="checkbox" id="ccSpellcastingToggle">
                ${tCC("customClassSpellcastingToggleLabel")}
            </label>
            <div id="ccSpellFields" class="custom-class-spell-fields" style="display:none;">
                <div>
                    <label for="ccSpellAbility">${tCC("spellcastingAbilityLabel")}</label>
                    <select id="ccSpellAbility" class="dropdown custom-class-tool-select"></select>
                </div>
                <div>
                    <div class="custom-class-section-title">${tCC("spellcastingFocusLabel")}</div>
                    <div class="custom-class-check-grid" id="ccSpellFocusGrid"></div>
                </div>
            </div>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassWeaponCatLabel")}</div>
            <div class="custom-class-check-grid" id="ccWeaponCatGrid"></div>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassWeaponPropLabel")}</div>
            <div class="custom-class-check-grid" id="ccWeaponPropGrid"></div>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassArmorCatLabel")}</div>
            <div class="custom-class-check-grid" id="ccArmorCatGrid"></div>
        </div>

        <div class="custom-class-field">
            <label for="ccToolSelect">${tCC("customClassToolsLabel")}</label>
            <select id="ccToolSelect" class="dropdown custom-class-tool-select"></select>
        </div>

        <div class="custom-class-field">
            <div class="custom-class-section-title">${tCC("customClassStartingEquipmentLabel")}</div>
            ${renderEquipmentOption("A")}
            ${renderEquipmentOption("B")}
            ${renderEquipmentOption("C")}
        </div>
    `;

    // Nicht-aktive verfügbare Sprachen standardmäßig eingeklappt
    available.forEach(lang => {
        if (lang !== activeLang) toggleLangBlock(lang, true);
    });

    fillAttributeCheckboxes("ccPrimaryAbilityGrid", "ccPrimary", customClassEditorState.primaryAbility, 2);
    fillAttributeCheckboxes("ccSavingThrowGrid", "ccSave", customClassEditorState.savingThrowProficiencies, 2);
    fillSkillCheckboxes();
    fillWeaponArmorToolGrids();
    fillSpellcastingFields();
    fillEquipmentFromState();

    document.getElementById("ccHitDie").value = customClassEditorState.hitPointDie || "D8";

    // Namen/Beschreibungen + Zähler (nur verfügbare Sprachen im DOM)
    available.forEach(lang => {
        const nameEl = document.getElementById(`ccName_${lang}`);
        const descEl = document.getElementById(`ccDesc_${lang}`);
        if (nameEl) {
            nameEl.value = customClassEditorState.names[lang] || "";
            nameEl.oninput = () => updateCustomClassCharCounter(`ccName_${lang}`, `ccNameCount_${lang}`, CUSTOM_CLASS_NAME_MAX);
            updateCustomClassCharCounter(`ccName_${lang}`, `ccNameCount_${lang}`, CUSTOM_CLASS_NAME_MAX);
        }
        if (descEl) {
            descEl.value = customClassEditorState.descriptions[lang] || "";
            descEl.oninput = () => updateCustomClassCharCounter(`ccDesc_${lang}`, `ccDescCount_${lang}`, CUSTOM_CLASS_DESC_MAX);
            updateCustomClassCharCounter(`ccDesc_${lang}`, `ccDescCount_${lang}`, CUSTOM_CLASS_DESC_MAX);
        }
    });
}

function updateCustomClassCharCounter(inputId, counterId, max) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (!input || !counter) return;
    if (input.value.length > max) input.value = input.value.slice(0, max);
    counter.textContent = input.value.length;
}

function renderLangBlock(lang, collapsed) {
    const title = getCustomClassLangTitle(lang);
    const collapsedClass = collapsed ? "collapsed" : "";
    const activeLang = getActiveUiLang();
    return `
        <div class="custom-class-lang-block" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="toggleLangBlock('${lang}')">
                <span>${title}</span>
                <span id="ccLangToggle_${lang}" class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>
            </div>
            <div id="ccLangBody_${lang}" class="custom-class-lang-body ${collapsedClass}">
                <label for="ccName_${lang}">${tCC("customClassNameLabel")} ${lang === activeLang ? '<span class="custom-class-required">*</span>' : ""}</label>
                <input type="text" id="ccName_${lang}" class="custom-class-name-input app-small-input" maxlength="${CUSTOM_CLASS_NAME_MAX}">
                <div class="char-counter"><span id="ccNameCount_${lang}">0</span> / ${CUSTOM_CLASS_NAME_MAX}</div>
                <label for="ccDesc_${lang}" style="margin-top:8px;display:block;">${tCC("customClassDescLabel")}</label>
                <textarea id="ccDesc_${lang}" maxlength="${CUSTOM_CLASS_DESC_MAX}"></textarea>
                <div class="char-counter"><span id="ccDescCount_${lang}">0</span> / ${CUSTOM_CLASS_DESC_MAX}</div>
            </div>
        </div>
    `;
}

function toggleLangBlock(lang, forceCollapse) {
    const body = document.getElementById(`ccLangBody_${lang}`);
    const indicator = document.getElementById(`ccLangToggle_${lang}`);
    if (!body) return;

    let collapsed;
    if (typeof forceCollapse === "boolean") {
        collapsed = forceCollapse;
        body.classList.toggle("collapsed", collapsed);
    } else {
        body.classList.toggle("collapsed");
        collapsed = body.classList.contains("collapsed");
    }
    if (indicator) indicator.classList.toggle("is-collapsed", collapsed);
}

function fillAttributeCheckboxes(containerId, name, selected, max) {
    const container = document.getElementById(containerId);
    if (!container || typeof attributeList === "undefined") return;

    const selectedSet = new Set(Array.isArray(selected) ? selected : []);
    const atMax = Number.isFinite(max) && max > 0 && selectedSet.size >= max;

    container.innerHTML = attributeList.map(attr => {
        const isChecked = selectedSet.has(attr.translationLabel);
        const checked = isChecked ? "checked" : "";
        const disabled = (atMax && !isChecked) ? "disabled" : "";
        const labelCls = (atMax && !isChecked) ? " class=\"cc-check-disabled\"" : "";
        const label = tCC(attr.translationLabel, attr.translationLabel);
        return `<label${labelCls}><input type="checkbox" name="${name}" value="${attr.translationLabel}" ${checked} ${disabled} onchange="limitCheckboxGroup('${name}', ${max})"> ${label}</label>`;
    }).join("");
}

/**
 * Max-Auswahl: nicht gewählte Checkboxen sperren/ausgrauen,
 * bis mindestens eine Auswahl entfernt wird (wie Optionen-Masken).
 */
function limitCheckboxGroup(name, max) {
    const boxes = Array.from(document.querySelectorAll(`input[name="${name}"]`));
    if (!boxes.length || !Number.isFinite(max) || max < 1) return;

    const checked = boxes.filter(b => b.checked);
    if (checked.length > max) {
        // Zuletzt hinzugekommene über dem Limit wieder abwählen
        checked.slice(max).forEach(b => { b.checked = false; });
    }
    const lock = boxes.filter(b => b.checked).length >= max;
    boxes.forEach(box => {
        const label = box.closest("label");
        if (box.checked) {
            box.disabled = false;
            if (label) label.classList.remove("cc-check-disabled");
        } else {
            box.disabled = lock;
            if (label) label.classList.toggle("cc-check-disabled", lock);
        }
    });
}

function fillSkillCheckboxes() {
    const container = document.getElementById("ccSkillGrid");
    if (!container || typeof skillList === "undefined") return;

    container.innerHTML = skillList.map(skill => {
        const checked = customClassEditorState.skillCategoryNumber.includes(skill.skillCategoryNumber) ? "checked" : "";
        const label = tCC(skill.translationLabel, skill.translationLabel);
        return `<label><input type="checkbox" name="ccSkill" value="${skill.skillCategoryNumber}" ${checked}> ${label}</label>`;
    }).join("");
}

function fillWeaponArmorToolGrids() {
    const weaponCat = document.getElementById("ccWeaponCatGrid");
    if (weaponCat && typeof weaponCategory !== "undefined") {
        weaponCat.innerHTML = weaponCategory.map(cat => {
            const checked = customClassEditorState.weaponCategoryNumber.includes(cat.weaponCategoryNumber) ? "checked" : "";
            return `<label><input type="checkbox" name="ccWeaponCat" value="${cat.weaponCategoryNumber}" ${checked}> ${tCC(cat.translationLabel)}</label>`;
        }).join("");
    }

    const weaponProp = document.getElementById("ccWeaponPropGrid");
    if (weaponProp && typeof weaponProperty !== "undefined") {
        weaponProp.innerHTML = weaponProperty.map(prop => {
            const checked = customClassEditorState.weaponPropertyCategoryNumber.includes(prop.weaponPropertyCategoryNumber) ? "checked" : "";
            return `<label><input type="checkbox" name="ccWeaponProp" value="${prop.weaponPropertyCategoryNumber}" ${checked}> ${tCC(prop.translationLabel)}</label>`;
        }).join("");
    }

    const armorCat = document.getElementById("ccArmorCatGrid");
    if (armorCat && typeof armorCategory !== "undefined") {
        armorCat.innerHTML = armorCategory.map(cat => {
            const checked = normalizeToArray(customClassEditorState.armorCategoryNumber).includes(cat.armorCategoryNumber) ? "checked" : "";
            return `<label><input type="checkbox" name="ccArmorCat" value="${cat.armorCategoryNumber}" ${checked}> ${tCC(cat.translationLabel)}</label>`;
        }).join("");
    }

    fillToolDropdown();
}

function fillToolDropdown() {
    const select = document.getElementById("ccToolSelect");
    if (!select) return;

    const selected = normalizeToArray(customClassEditorState.toolLabel).filter(v => v && v !== 0)[0] || "";
    let html = `<option value="">${tCC("noneLabel")}</option>`;

    // Oberflächen-Kategorien (Reservierung für Schritt 6)
    CUSTOM_CLASS_TOOL_SURFACE_OPTIONS.forEach(label => {
        const sel = selected === label ? "selected" : "";
        html += `<option value="${label}" ${sel}>${tCC(label)}</option>`;
    });

    // Konkrete Tools aus toolList
    if (typeof toolList !== "undefined") {
        const sorted = [...toolList].sort((a, b) =>
            tCC(a.translationLabel).localeCompare(tCC(b.translationLabel), currentLang || "de")
        );
        sorted.forEach(tool => {
            const sel = selected === tool.translationLabel ? "selected" : "";
            html += `<option value="${tool.translationLabel}" ${sel}>${tCC(tool.translationLabel)}</option>`;
        });
    }

    select.innerHTML = html;
    select.onchange = function () {
        customClassEditorState.toolLabel = select.value || 0;
        if (typeof notifyCustomClassTab1ToolsChanged === "function") {
            notifyCustomClassTab1ToolsChanged();
        }
    };
}

function fillSpellcastingFields() {
    const toggle = document.getElementById("ccSpellcastingToggle");
    const fields = document.getElementById("ccSpellFields");
    const abilitySelect = document.getElementById("ccSpellAbility");
    const focusGrid = document.getElementById("ccSpellFocusGrid");

    if (!toggle || !fields || !abilitySelect || !focusGrid) return;

    const enabled = customClassEditorState.spellcastingLabel === 1;
    toggle.checked = enabled;
    fields.style.display = enabled ? "grid" : "none";

    abilitySelect.innerHTML = attributeList.map(attr => {
        const selected = customClassEditorState.spellcastingAbility === attr.translationLabel ? "selected" : "";
        return `<option value="${attr.translationLabel}" ${selected}>${tCC(attr.translationLabel)}</option>`;
    }).join("");

    const selectedFocus = normalizeToArray(customClassEditorState.spellcastingFocus).filter(v => v && v !== 0);
    focusGrid.innerHTML = CUSTOM_CLASS_FOCUS_OPTIONS.map(label => {
        const checked = selectedFocus.includes(label) ? "checked" : "";
        return `<label><input type="checkbox" name="ccSpellFocus" value="${label}" ${checked}
            onchange="onTab1SpellAbilityOrFocusChanged()"> ${formatLfSpellcastingFocusOptionLabel(label)}</label>`;
    }).join("");

    abilitySelect.onchange = onTab1SpellAbilityOrFocusChanged;
    toggle.onchange = onTab1SpellcastingToggleChanged;
}

function renderEquipmentOption(optionKey) {
    const titleKey = `customClassEquipmentOption${optionKey}Label`;
    return `
        <div class="custom-class-equip-option" data-option="${optionKey}">
            <div class="custom-class-equip-option-header">
                <strong>${tCC(titleKey)}</strong>
                <label>
                    <input type="checkbox" id="ccEquipEnabled_${optionKey}" onchange="toggleEquipmentOption('${optionKey}')">
                    ${tCC("customClassEquipmentEnabledLabel")}
                </label>
            </div>
            <div id="ccEquipBody_${optionKey}">
                <div class="custom-class-equip-header" id="ccEquipHeader_${optionKey}" style="display: none;">
                    <span>${tCC("categoryLabel")}</span>
                    <span>${tCC("identifierLabel")}</span>
                    <span>${tCC("amountLabel")}</span>
                    <span></span>
                </div>
                <div class="custom-class-equip-rows" id="ccEquipRows_${optionKey}"></div>
                <button type="button" id="ccEquipAddBtn_${optionKey}" class="custom-class-add-item-btn" onclick="addEquipmentRow('${optionKey}')">${tCC("customClassAddItemLabel")}</button>
                <div class="custom-class-equip-gp" style="margin-top:10px;">
                    <label for="ccEquipGP_${optionKey}" class="custom-class-equip-gp-label">${tCC("customClassGoldGPLabel")}</label>
                    <input type="number" id="ccEquipGP_${optionKey}" min="0" max="${CUSTOM_CLASS_GOLD_MAX}" step="1" value="0"
                        oninput="clampCustomClassNumberInput(this, 0, ${CUSTOM_CLASS_GOLD_MAX})"
                        onblur="finalizeCustomClassNumberInput(this, 0, ${CUSTOM_CLASS_GOLD_MAX})">
                </div>
            </div>
        </div>
    `;
}

function inferEquipmentCategory(label) {
    if (!label) return "";
    const inList = (list) => Array.isArray(list) && list.some(item => item.translationLabel === label);
    if (inList(typeof weaponList !== "undefined" ? weaponList : null)) return "weapon";
    if (inList(typeof armorList !== "undefined" ? armorList : null)) return "armor";
    if (inList(typeof toolList !== "undefined" ? toolList : null)) return "tool";
    if (inList(typeof adventuringGearList !== "undefined" ? adventuringGearList : null)) return "gear";
    const vehicles = [
        ...(typeof mountList !== "undefined" ? mountList : []),
        ...(typeof tackList !== "undefined" ? tackList : []),
        ...(typeof shipList !== "undefined" ? shipList : [])
    ];
    if (vehicles.some(item => item.translationLabel === label)) return "vehicle";
    return "";
}

function getEquipmentListForCategory(category) {
    switch (category) {
        case "weapon": return typeof weaponList !== "undefined" ? weaponList : [];
        case "armor": return typeof armorList !== "undefined" ? armorList : [];
        case "tool": return typeof toolList !== "undefined" ? toolList : [];
        case "gear": return typeof adventuringGearList !== "undefined" ? adventuringGearList : [];
        case "vehicle":
            return [
                ...(typeof mountList !== "undefined" ? mountList : []),
                ...(typeof tackList !== "undefined" ? tackList : []),
                ...(typeof shipList !== "undefined" ? shipList : [])
            ];
        default: return [];
    }
}

function buildCategoryOptionsHtml(selectedCategory) {
    const cats = [
        { value: "weapon", label: tCC("weaponsLabel") },
        { value: "armor", label: tCC("armorLabel") },
        { value: "tool", label: tCC("toolsLabel") },
        { value: "gear", label: tCC("gearLabel") },
        { value: "vehicle", label: tCC("mountAndVehicleLabel") }
    ];
    let html = `<option value="">${tCC("pleaseSelectLabel")}</option>`;
    cats.forEach(cat => {
        const sel = cat.value === selectedCategory ? "selected" : "";
        html += `<option value="${cat.value}" ${sel}>${cat.label}</option>`;
    });
    return html;
}

function buildItemsForCategoryHtml(category, selectedLabel) {
    let html = `<option value="">${tCC("pleaseSelectLabel")}</option>`;
    if (!category) return html;

    const list = getEquipmentListForCategory(category);
    const sorted = [...list].sort((a, b) =>
        tCC(a.translationLabel).localeCompare(tCC(b.translationLabel), currentLang || "de")
    );
    sorted.forEach(item => {
        const sel = item.translationLabel === selectedLabel ? "selected" : "";
        html += `<option value="${item.translationLabel}" ${sel}>${tCC(item.translationLabel)}</option>`;
    });
    return html;
}

function onCustomEquipCategoryChange(categorySelect) {
    const row = categorySelect.closest(".custom-class-equip-row");
    if (!row) return;
    const itemSelect = row.querySelector(".cc-equip-item");
    if (!itemSelect) return;
    itemSelect.innerHTML = buildItemsForCategoryHtml(categorySelect.value, "");
}

function buildItemSelectHtml(selectedLabel) {
    const category = inferEquipmentCategory(selectedLabel);
    return buildItemsForCategoryHtml(category, selectedLabel);
}

function addEquipmentRow(optionKey, preset) {
    const rows = document.getElementById(`ccEquipRows_${optionKey}`);
    if (!rows) return;
    if (rows.children.length >= CUSTOM_CLASS_EQUIP_MAX_ITEMS) {
        updateEquipmentAddButtonState(optionKey);
        return;
    }

    const label = preset && preset.label ? preset.label : "";
    const rawAmount = preset && preset.amount ? preset.amount : 1;
    const amount = Math.min(CUSTOM_CLASS_AMOUNT_MAX, Math.max(1, rawAmount));
    const category = (preset && preset.category) || inferEquipmentCategory(label);

    const row = document.createElement("div");
    row.className = "custom-class-equip-row";
    row.innerHTML = `
        <select class="cc-equip-category dropdown" onchange="onCustomEquipCategoryChange(this)" title="${tCC("categoryLabel")}">
            ${buildCategoryOptionsHtml(category)}
        </select>
        <select class="cc-equip-item dropdown" title="${tCC("identifierLabel")}">
            ${buildItemsForCategoryHtml(category, label)}
        </select>
        <input type="number" class="cc-equip-amount" min="1" max="${CUSTOM_CLASS_AMOUNT_MAX}" step="1" value="${amount}" title="${tCC("amountLabel")}"
            oninput="clampCustomClassNumberInput(this, 1, ${CUSTOM_CLASS_AMOUNT_MAX})"
            onblur="finalizeCustomClassNumberInput(this, 1, ${CUSTOM_CLASS_AMOUNT_MAX})">
        <button type="button" class="custom-class-remove-btn" onclick="removeEquipmentRow(this)" aria-label="×">×</button>
    `;
    rows.appendChild(row);
    updateEquipmentHeaderVisibility(optionKey);
    updateEquipmentAddButtonState(optionKey);
}

function removeEquipmentRow(button) {
    const optionBox = button.closest(".custom-class-equip-option");
    const row = button.closest(".custom-class-equip-row");
    if (row) row.remove();
    if (optionBox && optionBox.dataset.option) {
        updateEquipmentHeaderVisibility(optionBox.dataset.option);
        updateEquipmentAddButtonState(optionBox.dataset.option);
    }
}

function updateEquipmentAddButtonState(optionKey) {
    const rows = document.getElementById(`ccEquipRows_${optionKey}`);
    const btn = document.getElementById(`ccEquipAddBtn_${optionKey}`);
    if (!rows || !btn) return;

    const atMax = rows.children.length >= CUSTOM_CLASS_EQUIP_MAX_ITEMS;
    btn.disabled = atMax;
    btn.classList.toggle("custom-class-add-item-btn--disabled", atMax);
}

function updateEquipmentHeaderVisibility(optionKey) {
    const rows = document.getElementById(`ccEquipRows_${optionKey}`);
    const header = document.getElementById(`ccEquipHeader_${optionKey}`);
    if (!rows || !header) return;
    header.style.display = rows.children.length > 0 ? "grid" : "none";
}

function toggleEquipmentOption(optionKey) {
    const enabled = document.getElementById(`ccEquipEnabled_${optionKey}`).checked;
    const body = document.getElementById(`ccEquipBody_${optionKey}`);
    if (body) body.style.display = enabled ? "block" : "none";
}

function fillEquipmentFromState() {
    ["A", "B", "C"].forEach(key => {
        const conf = customClassEditorState.equipment[key] || { enabled: key !== "C", items: [], gp: 0 };
        const enabledEl = document.getElementById(`ccEquipEnabled_${key}`);
        const gpEl = document.getElementById(`ccEquipGP_${key}`);
        const rows = document.getElementById(`ccEquipRows_${key}`);

        if (enabledEl) enabledEl.checked = !!conf.enabled;
        if (gpEl) gpEl.value = Math.min(CUSTOM_CLASS_GOLD_MAX, Math.max(0, conf.gp || 0));
        if (rows) {
            rows.innerHTML = "";
            (conf.items || []).forEach(item => addEquipmentRow(key, item));
            updateEquipmentHeaderVisibility(key);
            updateEquipmentAddButtonState(key);
        }
        toggleEquipmentOption(key);
    });
}

//=======================================================================
// 1.x State aus Formular lesen / validieren
//=======================================================================

function collectCustomClassFormState() {
    const state = createEmptyCustomClassState();
    state.id = customClassEditorState.id;
    state.slug = customClassEditorState.slug;
    state.packageId = customClassEditorState.packageId || null;
    state.packageCreatedAt = customClassEditorState.packageCreatedAt || null;
    state.verificationCode = customClassEditorState.verificationCode || null;
    state.levelFeatures = customClassEditorState.levelFeatures || [];
    state.subclasses = customClassEditorState.subclasses || [];
    state.availableLanguages = ensureAvailableLanguages(customClassEditorState).slice();
    state.parameterRegistry = ensureParameterRegistry(customClassEditorState).map(p => ({
        id: p.id,
        names: { de: p.names?.de || "", en: p.names?.en || "" },
        useValue: normalizeLfParameterValueMode(p).useValue,
        useDie: normalizeLfParameterValueMode(p).useDie
    }));
    const prog = customClassEditorState.spellcastingProgression || {};
    state.spellcastingProgression = cloneSpellcastingProgression(prog);

    // Namen/Beschreibungen: vorhandene Werte behalten, DOM überschreibt verfügbare Sprachen
    state.names = {
        de: customClassEditorState.names?.de || "",
        en: customClassEditorState.names?.en || ""
    };
    state.descriptions = {
        de: customClassEditorState.descriptions?.de || "",
        en: customClassEditorState.descriptions?.en || ""
    };
    getCustomClassSupportedLangs().forEach(lang => {
        const nameEl = document.getElementById(`ccName_${lang}`);
        const descEl = document.getElementById(`ccDesc_${lang}`);
        if (nameEl) state.names[lang] = nameEl.value.trim().slice(0, CUSTOM_CLASS_NAME_MAX);
        if (descEl) state.descriptions[lang] = descEl.value.trim().slice(0, CUSTOM_CLASS_DESC_MAX);
    });

    const availFromDom = Array.from(document.querySelectorAll('input[name="ccLangAvail"]:checked')).map(el => el.value);
    if (availFromDom.length) {
        const active = getActiveUiLang();
        state.availableLanguages = availFromDom.includes(active)
            ? availFromDom
            : [active, ...availFromDom];
    }

    state.primaryAbility = Array.from(document.querySelectorAll('input[name="ccPrimary"]:checked')).map(el => el.value);
    state.savingThrowProficiencies = Array.from(document.querySelectorAll('input[name="ccSave"]:checked')).map(el => el.value);
    state.skillCategoryNumber = Array.from(document.querySelectorAll('input[name="ccSkill"]:checked')).map(el => parseInt(el.value, 10));
    state.hitPointDie = document.getElementById("ccHitDie")?.value || "D8";

    const spellOn = document.getElementById("ccSpellcastingToggle")?.checked;
    state.spellcastingLabel = spellOn ? 1 : 0;
    if (spellOn) {
        state.spellcastingAbility = document.getElementById("ccSpellAbility")?.value || 0;
        state.spellcastingFocus = Array.from(document.querySelectorAll('input[name="ccSpellFocus"]:checked')).map(el => el.value);
    } else {
        state.spellcastingAbility = 0;
        state.spellcastingFocus = 0;
    }

    state.weaponCategoryNumber = Array.from(document.querySelectorAll('input[name="ccWeaponCat"]:checked')).map(el => parseInt(el.value, 10));
    state.weaponPropertyCategoryNumber = Array.from(document.querySelectorAll('input[name="ccWeaponProp"]:checked')).map(el => parseInt(el.value, 10));
    state.armorCategoryNumber = Array.from(document.querySelectorAll('input[name="ccArmorCat"]:checked')).map(el => parseInt(el.value, 10));
    const toolValue = document.getElementById("ccToolSelect")?.value || "";
    state.toolLabel = toolValue || 0;

    ["A", "B", "C"].forEach(key => {
        const enabled = !!document.getElementById(`ccEquipEnabled_${key}`)?.checked;
        const gp = Math.min(
            CUSTOM_CLASS_GOLD_MAX,
            Math.max(0, parseInt(document.getElementById(`ccEquipGP_${key}`)?.value, 10) || 0)
        );
        const items = [];
        document.querySelectorAll(`#ccEquipRows_${key} .custom-class-equip-row`).forEach(row => {
            const label = row.querySelector(".cc-equip-item")?.value;
            const category = row.querySelector(".cc-equip-category")?.value || "";
            const amount = Math.min(
                CUSTOM_CLASS_AMOUNT_MAX,
                Math.max(1, parseInt(row.querySelector(".cc-equip-amount")?.value, 10) || 1)
            );
            if (label) items.push({ label, amount, category });
        });
        state.equipment[key] = { enabled, items: items.slice(0, CUSTOM_CLASS_EQUIP_MAX_ITEMS), gp };
    });

    return state;
}

function validateCustomClassState(state) {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    const activeName = (state.names[active] || "").trim();
    const other = active === "de" ? "en" : "de";
    const fallbackName = (state.names[other] || "").trim();

    if (!activeName && !fallbackName) {
        alert(tCC("customClassValidationAlertLabel"));
        return false;
    }
    if (state.primaryAbility.length < 1 || state.primaryAbility.length > 2) {
        alert(tCC("customClassPrimaryAbilityAlertLabel"));
        return false;
    }
    if (state.savingThrowProficiencies.length !== 2) {
        alert(tCC("customClassSavingThrowAlertLabel"));
        return false;
    }
    if (!state.skillCategoryNumber.length) {
        alert(tCC("customClassSkillsAlertLabel"));
        return false;
    }
    if (!state.hitPointDie) {
        alert(tCC("customClassValidationAlertLabel"));
        return false;
    }
    const subclasses = Array.isArray(state.subclasses) ? state.subclasses : [];
    if (subclasses.length < CUSTOM_CLASS_SC_CONFIG.minSubclasses) {
        alert(tCC("ccScNeedSubclassAlertLabel"));
        return false;
    }
    const named = subclasses.some(sc => lfHasText(sc?.names));
    if (!named) {
        alert(tCC("ccScNeedSubclassNameAlertLabel"));
        return false;
    }
    return true;
}

//=======================================================================
// 1.x Export-Objekt bauen
//=======================================================================

function normalizeToArray(value) {
    if (value === 0 || value === null || value === undefined || value === "") return [];
    return Array.isArray(value) ? value : [value];
}

function toLegacySingleOrArray(arr) {
    if (!arr || arr.length === 0) return 0;
    if (arr.length === 1) return arr[0];
    return arr;
}

function buildEquipmentExportValue(conf) {
    if (!conf || !conf.enabled) return 0;

    const parts = [];
    (conf.items || []).forEach(item => {
        if (!item.label) return;
        const exportLabel = formatCustomStartingEquipmentLabel(item.label);
        if (item.amount > 1) parts.push(`${item.amount}x${exportLabel}`);
        else parts.push(exportLabel);
    });
    if (conf.gp > 0) parts.push(`${conf.gp} GP`);

    if (parts.length === 0) return 0;
    if (parts.length === 1) return parts[0];
    return parts;
}

/**
 * Startausrüstung: Items mit Varianten wie PHB als list_… oder Label(1) exportieren,
 * damit Schritt 8 Dropdowns / Verknüpfung zu Schritt-6-Wahlen erhält.
 */
function formatCustomStartingEquipmentLabel(label) {
    if (!label || typeof label !== "string") return label;
    if (label.startsWith("list_") || /\(\d+\)$/.test(label)) return label;

    const itemData = typeof findItemData === "function" ? findItemData(label) : null;
    const hasVaries = itemData && Array.isArray(itemData.varies) && itemData.varies.length > 0;

    // Mit Schritt-6-Proficiency verknüpfbar (Barde/Mönch-Muster)
    const step6Linked = [
        "musicalInstrumentLabel",
        "gamingSetLabel",
        "artisansToolsLabel",
        "toolLabel"
    ];
    if (step6Linked.includes(label)) {
        return `${label}(1)`;
    }

    // Fokusse, Munition, Heiligensymbol u. a. mit varies → freie list_-Auswahl
    if (hasVaries) {
        return `list_${label}`;
    }
    return label;
}

function slugifyClassName(name) {
    const base = String(name || "undefined")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .replace(/_+/g, "_");
    return base || "undefined";
}

function buildStableSlug(state) {
    if (state.slug) return state.slug;
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    const source = state.names[active] || state.names.en || state.names.de || "undefined";
    return "custom_" + slugifyClassName(source);
}

function nextCustomClassId() {
    let maxId = CUSTOM_CLASS_ID_MIN - 1;
    if (typeof classCoreTraitsList !== "undefined") {
        classCoreTraitsList.forEach(entry => {
            if (entry && typeof entry.ID === "number" && entry.ID >= CUSTOM_CLASS_ID_MIN) {
                maxId = Math.max(maxId, entry.ID);
            }
        });
    }
    if (registeredCustomClass.id) return registeredCustomClass.id;
    return Math.max(CUSTOM_CLASS_ID_MIN, maxId + 1);
}

function buildCoreTraitsFromState(state, slug, id) {
    return {
        ID: id,
        translationLabel: slug,
        primaryAbility: state.primaryAbility.length === 1 ? state.primaryAbility[0] : state.primaryAbility.slice(),
        hitPointDie: state.hitPointDie,
        savingThrowProficiencies: state.savingThrowProficiencies.slice(),
        skillCategoryNumber: state.skillCategoryNumber.slice(),
        spellcastingLabel: state.spellcastingLabel,
        spellcastingAbility: state.spellcastingLabel === 1 ? state.spellcastingAbility : 0,
        spellcastingFocus: state.spellcastingLabel === 1
            ? toLegacySingleOrArray(normalizeToArray(state.spellcastingFocus))
            : 0,
        weaponCategoryNumber: state.weaponCategoryNumber.slice(),
        weaponPropertyCategoryNumber: state.weaponPropertyCategoryNumber.slice(),
        armorCategoryNumber: toLegacySingleOrArray(state.armorCategoryNumber),
        toolLabel: toLegacySingleOrArray(normalizeToArray(state.toolLabel).filter(v => v && v !== 0)),
        startingEquipmentA: buildEquipmentExportValue(state.equipment.A),
        startingEquipmentB: buildEquipmentExportValue(state.equipment.B),
        startingEquipmentC: buildEquipmentExportValue(state.equipment.C),
        isCustom: true
    };
}

//=======================================================================
// 1.x Compile: Editor-Slots → *ClassData / subclassList*
//=======================================================================

/** ÜB-Tabelle wie PHB: Stufe 1–4 = +2, 5–8 = +3, … */
function getCustomClassProficiencyBonus(level) {
    const lvl = Math.max(1, Math.min(20, parseInt(level, 10) || 1));
    return `+${Math.floor((lvl - 1) / 4) + 2}`;
}

/** Sentinel-0-Zeile ohne Klassen-Ressourcen */
function createEmptyCompiledClassDataRow(level, id) {
    return {
        ID: id,
        level: Number(level) || 1,
        ProficiencyBonus: getCustomClassProficiencyBonus(level),
        translationLabel: 0,
        classFeatureShortDescription: 0,
        classFeatureDescription: 0,
        choiceInStep3: 0,
        subclassCategoryNumber: 0,
        constForChoice: 0,
        classFeaturesStep2: 0,
        infoBox: 0,
        classFeaturesCharacterSheet: 0,
        skillCategoryNumber: 0,
        cantripsAmount: 0,
        preparedSpellsAmount: 0,
        SSpSL1: 0,
        SSpSL2: 0,
        SSpSL3: 0,
        SSpSL4: 0,
        SSpSL5: 0,
        SSpSL6: 0,
        SSpSL7: 0,
        SSpSL8: 0,
        SSpSL9: 0,
        spellListLabels: 0
    };
}

/** Fehlende / null-Werte auf Sentinel 0 (Arrays bleiben Arrays) */
function normalizeCompiledSentinelValue(value) {
    if (value === null || value === undefined || value === "") return 0;
    return value;
}

/**
 * Alte Compiles: „Vorbereiteten Zauber wählen“ hatte oft Sheet-Flag 0
 * (classDataPartial), obwohl eine Langbeschreibung mit CHOICE_LIST existiert.
 */
function sanitizeCompiledChoosePreparedSpellSheetFlags(rows, translationsBag) {
    const de = translationsBag?.de || (typeof translations !== "undefined" ? translations.de : null) || {};
    const en = translationsBag?.en || (typeof translations !== "undefined" ? translations.en : null) || {};
    (rows || []).forEach(row => {
        if (!row) return;
        const descKey = row.classFeatureDescription;
        if (!descKey || descKey === 0) return;
        const text = String(de[descKey] || en[descKey] || "");
        if (!text.includes("preparedSpells.source.name.")) return;
        const flag = String(row.classFeaturesCharacterSheet || "0");
        if (flag === "0" || flag === "") {
            row.classFeaturesCharacterSheet = 1;
        }
    });
}

function applyCompiledSentinels(row) {
    Object.keys(row).forEach(key => {
        if (key === "ID" || key === "level" || key === "ProficiencyBonus") return;
        if (Array.isArray(row[key])) return;
        row[key] = normalizeCompiledSentinelValue(row[key]);
    });
    return row;
}

function isLfSlotEligibleForCompile(slot) {
    if (!slot || slot.blockedBySubclass) return false;
    // System-Presets (Skills, ASI, Unterklasse, Epic Boon) immer
    if (slot.systemPreset) return true;

    const type = slot.payload?.featureType;
    // Unbelegte Zeile (kein Typ) → nicht in ClassData
    if (!type) return false;

    if (type === "subclass") return true;

    const cat = slot.payload?.category;
    if (!cat) return false;

    // Attribut → Direkt nur mit vergebenen Punkten
    if (type === "attribute" && (cat === "direct" || cat === "increase")) {
        const pts = slot.payload.optionsConfig?.abilityPoints || [];
        return pts.some(a => a && a.ability && (parseInt(a.points, 10) || 0) > 0);
    }
    // Attribut → Verteilung nur mit Punkten > 0
    if (type === "attribute" && cat === "distribution") {
        return (parseInt(slot.payload.optionsConfig?.points, 10) || 0) > 0;
    }
    // Optionen → Frei nur mit mindestens 2 benannten Optionen
    if (type === "options" && cat === "free") {
        const choices = Array.isArray(slot.payload.optionsConfig?.choices)
            ? slot.payload.optionsConfig.choices.filter(c => lfHasText(c?.names || c))
            : [];
        return choices.length >= 2;
    }
    // Einfach → Fertigkeiten nur mit gewählten Skills
    if (type === "simple" && cat === "skills") {
        const skills = slot.payload.optionsConfig?.selectedSkills || [];
        return Array.isArray(skills) && skills.length >= 1;
    }
    // Einfach → Rettungswürfe: mind. 1 Attribut (oder Modus „Alle“)
    if (type === "simple" && cat === "savingThrows") {
        const cfg = slot.payload.optionsConfig || {};
        if (cfg.mode === "all") return true;
        const labels = cfg.selectedLabels || [];
        return Array.isArray(labels) && labels.length >= 1;
    }
    // Einfach → Waffenvertrautheit: Alle (Restpool) oder mind. 1 Auswahl
    if (type === "simple" && cat === "weaponTraining") {
        const cfg = slot.payload.optionsConfig || {};
        const catMode = cfg.weaponCategoryMode || "selection";
        const propMode = cfg.weaponPropertyMode || "selection";
        if (catMode === "all" && getLfRemainingWeaponCategoryNumbers(customClassEditorState).length) return true;
        if (propMode === "all" && getLfRemainingWeaponPropertyCategoryNumbers(customClassEditorState).length) return true;
        const cats = cfg.selectedWeaponCategoryNumbers || [];
        const props = cfg.selectedWeaponPropertyCategoryNumbers || [];
        return (Array.isArray(cats) && cats.length > 0) || (Array.isArray(props) && props.length > 0);
    }
    // Einfach → Rüstungsvertrautheit: Alle (Restpool) oder mind. 1 Auswahl
    if (type === "simple" && cat === "armorTraining") {
        const cfg = slot.payload.optionsConfig || {};
        if (cfg.mode === "all" && getLfRemainingArmorCategoryNumbers(customClassEditorState).length) return true;
        const cats = cfg.selectedArmorCategoryNumbers || [];
        return Array.isArray(cats) && cats.length >= 1;
    }
    // Unterklassenzauber: nur mit mind. einem gewählten Zauber
    if (type === "spellcraft" && cat === "subclassSpells") {
        return collectLfSubclassSpellsSelectedLabels(slot.payload?.optionsConfig).length >= 1;
    }

    return true;
}

function buildCompiledFeatureKeyStem(slug, slot, subclassCategoryNumber) {
    const lvl = Number(slot.level) || 1;
    const idx = Number(slot.index) || 0;
    if (subclassCategoryNumber > 0) {
        return `${slug}_sc${subclassCategoryNumber}_L${lvl}_${idx}`;
    }
    return `${slug}_L${lvl}_${idx}`;
}

function putCompiledTranslation(bag, key, de, en) {
    if (!key || key === 0) return;
    const d = String(de || "").trim();
    const e = String(en || "").trim();
    bag.de[key] = d || e || key;
    bag.en[key] = e || d || key;
}

function pickCompiledLocaleText(map, lang) {
    if (!map) return "";
    const primary = String(map[lang] || "").trim();
    if (primary) return primary;
    const other = lang === "de" ? "en" : "de";
    return String(map[other] || "").trim();
}

/** Schreibt Bezeichnung/Desc wie im Ersteller: festes Spec-Label oder Custom-Text */
function applyCompiledCustomTexts(row, slot, keyStem, translationsBag, state, compileMeta) {
    const partial = slot.payload?.classDataPartial || {};
    const names = slot.payload?.names || {};
    const shorts = slot.payload?.shortDescriptions || {};
    let longs = slot.payload?.descriptions || {};

    const type = slot.payload?.featureType;
    const cat = slot.payload?.category;
    const cfg = slot.payload?.optionsConfig || {};

    // Optionen→Frei: CHOICE_LIST-Tag + Familien-Stamm (wie Waffenmeisterschaft)
    let freeFamilyReuse = null;
    if (type === "options" && cat === "free") {
        ensureLfFreeOptionsChoiceTagsOnSlot(slot);
        longs = slot.payload.descriptions || longs;
        const familyId = ensureLfFreeOptionsFamilyId(slot);
        const root = compileMeta?.freeFamilyRoot?.get(familyId) || null;
        if (root) {
            freeFamilyReuse = root;
        }
    }

    // Einfach→Frei: LEVEL_VAL-Tag wenn Parameter gesetzt
    if (type === "simple" && cat === "free" && cfg.parameterId) {
        ensureLfSimpleFreeLevelValTagsOnSlot(slot);
        longs = slot.payload.descriptions || longs;
    }

    // Bezeichnung: Partial → festes Spec-Label → Custom-Namen (oder Familien-Stamm)
    if (freeFamilyReuse) {
        row.translationLabel = freeFamilyReuse.translationLabel;
    } else if (partial.translationLabel && partial.translationLabel !== 0) {
        row.translationLabel = partial.translationLabel;
    } else {
        const fixedLabel = resolveCompiledFixedDesignationKey(slot, state);
        if (fixedLabel) {
            row.translationLabel = fixedLabel;
        } else if (lfHasText(names)) {
            const key = `${keyStem}Label`;
            putCompiledTranslation(
                translationsBag,
                key,
                pickCompiledLocaleText(names, "de"),
                pickCompiledLocaleText(names, "en")
            );
            row.translationLabel = key;
        } else {
            row.translationLabel = 0;
        }
    }

    const fixedDesc = resolveCompiledFixedDescKeys(slot, state);

    if (freeFamilyReuse) {
        row.classFeatureShortDescription = freeFamilyReuse.shortKey || 0;
        row.classFeatureDescription = freeFamilyReuse.longKey || 0;
    } else if (partial.classFeatureShortDescription && partial.classFeatureShortDescription !== 0) {
        row.classFeatureShortDescription = partial.classFeatureShortDescription;
    } else if (fixedDesc.shortKey) {
        row.classFeatureShortDescription = fixedDesc.shortKey;
    } else if (lfHasText(shorts)) {
        const key = `${keyStem}ShortD`;
        putCompiledTranslation(
            translationsBag,
            key,
            pickCompiledLocaleText(shorts, "de"),
            pickCompiledLocaleText(shorts, "en")
        );
        row.classFeatureShortDescription = key;
    } else {
        row.classFeatureShortDescription = 0;
    }

    if (freeFamilyReuse) {
        // Langbeschreibung bereits vom Stamm übernommen
    } else if (partial.classFeatureDescription && partial.classFeatureDescription !== 0) {
        row.classFeatureDescription = partial.classFeatureDescription;
    } else if (fixedDesc.longKey) {
        row.classFeatureDescription = fixedDesc.longKey;
    } else if (
        lfHasText(longs)
        || lfHasLongDescriptionContent(slot)
        || (type === "options" && cat === "free" && isLfDescSystemTokenEnabledOnOwner(slot))
    ) {
        const key = `${keyStem}D`;
        let deLong = pickCompiledLocaleText(longs, "de");
        let enLong = pickCompiledLocaleText(longs, "en");
        // Optionen→Frei: Token-Flag am Familien-Owner; Einfach→Frei: nur am Ketten-Owner
        const tokenOn = (type === "options" && cat === "free")
            ? isLfDescSystemTokenEnabledOnOwner(slot)
            : (shouldShowLfDescSystemTokenUi(slot) && isLfDescSystemTokenEnabled(slot));
        if (tokenOn && type === "options" && cat === "free") {
            const familyId = ensureLfFreeOptionsFamilyId(slot);
            deLong = ensureLfFreeChoicesChoiceListTagInText(deLong, familyId);
            enLong = ensureLfFreeChoicesChoiceListTagInText(enLong, familyId);
        } else if (!tokenOn && type === "options" && cat === "free") {
            deLong = stripLfFreeChoicesChoiceListTags(deLong);
            enLong = stripLfFreeChoicesChoiceListTags(enLong);
        }
        if (tokenOn && type === "simple" && cat === "free" && cfg.parameterId) {
            deLong = ensureLfLevelValTagInText(deLong, cfg.parameterId, "de");
            enLong = ensureLfLevelValTagInText(enLong, cfg.parameterId, "en");
        } else if (!tokenOn && type === "simple" && cat === "free" && cfg.parameterId) {
            deLong = stripLfLevelValTagInText(deLong, cfg.parameterId);
            enLong = stripLfLevelValTagInText(enLong, cfg.parameterId);
        }
        // Ohne Text und ohne Token → keine Langbeschreibung
        if (!String(deLong || "").trim() && !String(enLong || "").trim()) {
            row.classFeatureDescription = 0;
        } else {
            putCompiledTranslation(translationsBag, key, deLong, enLong);
            row.classFeatureDescription = key;
        }
    } else {
        row.classFeatureDescription = 0;
    }

    // Anzeige-Flags aus vorhandener Kurz-/Langbeschreibung (Presets können überschreiben)
    applyCompiledDisplayFlagsFromTexts(row, slot, partial);

    // Unterklassenzauber: feste Bezeichnung + Beschreibung "-"
    if (type === "spellcraft" && cat === "subclassSpells") {
        row.translationLabel = "magicProgressionLabel";
        row.classFeatureShortDescription = 0;
        row.classFeatureDescription = "-";
        row.classFeaturesStep2 = 0;
        row.infoBox = 0;
        if (row.classFeaturesCharacterSheet === undefined || row.classFeaturesCharacterSheet === null) {
            row.classFeaturesCharacterSheet = 0;
        }
    }

    // Einfach→Zauberwirken: Langbeschreibung mit Tab-1-Attribut/Fokus befüllen
    if (type === "simple" && cat === "spellcasting") {
        const cfg = slot.payload?.optionsConfig || {};
        const ability = cfg.spellcastingAbility || state?.spellcastingAbility || 0;
        const focusRaw = cfg.spellcastingFocus != null
            ? cfg.spellcastingFocus
            : state?.spellcastingFocus;
        const focuses = typeof normalizeToArray === "function"
            ? normalizeToArray(focusRaw).filter(Boolean)
            : (Array.isArray(focusRaw) ? focusRaw.filter(Boolean) : (focusRaw ? [focusRaw] : []));
        const usesBook = !(row.subclassCategoryNumber > 0) && focuses.includes("spellbookLabel");
        const key = `${keyStem}D`;
        putCompiledTranslation(
            translationsBag,
            key,
            formatLfSpellcastingCustomDesc(ability, focuses, "de", usesBook),
            formatLfSpellcastingCustomDesc(ability, focuses, "en", usesBook)
        );
        row.classFeatureDescription = key;
        if (!row.classFeatureShortDescription || row.classFeatureShortDescription === 0) {
            row.classFeatureShortDescription = "spellcastingShortD";
        }
        applyCompiledDisplayFlagsFromTexts(row, slot, partial);
        row.classFeaturesCharacterSheet = 1;
    }

    // Zaubertrick erhalten/wählen: nur feste Kurzbeschreibung (wie Sprachen/ASI)
    if (type === "spellcraft" && (cat === "getCantrip" || cat === "chooseCantrip")) {
        const spec = getLfSpellcraftCategorySpec(cat);
        row.classFeatureShortDescription = spec?.shortKey || 0;
        row.classFeatureDescription = 0;
        row.classFeaturesCharacterSheet = 0;
        if (row.classFeatureShortDescription && row.classFeatureShortDescription !== 0
            && !(row.subclassCategoryNumber > 0)) {
            row.classFeaturesStep2 = 1;
            row.infoBox = 1;
        } else {
            row.classFeaturesStep2 = 0;
            row.infoBox = 0;
        }
    }

    // Vorbereiteten Zauber wählen / Zauber erhalten:
    // Kurzbeschreibung fest; Langbeschreibung nur ohne „ins Zauberbuch“
    if (type === "spellcraft"
        && (cat === "choosePreparedSpell" || cat === "getPreparedSpell")) {
        const spec = getLfSpellcraftCategorySpec(cat);
        const cfg = slot.payload?.optionsConfig || {};
        const addToBook = customClassStateUsesSpellbook(state) && cfg.addToSpellbook !== false;
        row.classFeatureShortDescription = spec?.shortKey || 0;
        if (!addToBook && row.translationLabel && row.translationLabel !== 0) {
            const key = `${keyStem}D`;
            putCompiledTranslation(
                translationsBag,
                key,
                formatLfChoosePreparedSpellDesc(row.translationLabel, "de"),
                formatLfChoosePreparedSpellDesc(row.translationLabel, "en")
            );
            row.classFeatureDescription = key;
            row.classFeaturesCharacterSheet = 1;
        } else {
            row.classFeatureDescription = 0;
            row.classFeaturesCharacterSheet = 0;
        }
        if (row.classFeatureShortDescription && row.classFeatureShortDescription !== 0
            && !(row.subclassCategoryNumber > 0)) {
            row.classFeaturesStep2 = 1;
            row.infoBox = 1;
        } else {
            row.classFeaturesStep2 = 0;
            row.infoBox = 0;
        }
        if (row.classFeatureDescription && row.classFeatureDescription !== 0) {
            row.classFeaturesCharacterSheet = 1;
        }
    }

    // Familien-Stamm / Slot-Label für APPEND & Dedup registrieren
    if (compileMeta && row.translationLabel && row.translationLabel !== 0) {
        compileMeta.labelBySlotId.set(slot.slotId, row.translationLabel);
        if (type === "options" && cat === "free" && !freeFamilyReuse) {
            const familyId = ensureLfFreeOptionsFamilyId(slot);
            compileMeta.freeFamilyRoot.set(familyId, {
                slotId: slot.slotId,
                translationLabel: row.translationLabel,
                shortKey: row.classFeatureShortDescription || 0,
                longKey: row.classFeatureDescription || 0
            });
        }
    }
}

/**
 * Sheet-Flags: Optionen→Frei Folge-Stufen = 0 (Meisterschaft);
 * Einfach→Frei Verbesserung = APPEND oder 0.
 */
function applyCompiledSheetLinkFlags(row, slot, compileMeta) {
    if (!row || !slot?.payload) return;
    const type = slot.payload.featureType;
    const cat = slot.payload.category;
    const cfg = slot.payload.optionsConfig || {};

    if (type === "options" && cat === "free") {
        const familyId = ensureLfFreeOptionsFamilyId(slot);
        const root = compileMeta?.freeFamilyRoot?.get(familyId);
        if (root && root.slotId !== slot.slotId) {
            row.classFeaturesCharacterSheet = 0;
            return;
        }
        if (row.classFeatureDescription && row.classFeatureDescription !== 0) {
            row.classFeaturesCharacterSheet = 1;
        }
        return;
    }

    if (type === "simple" && cat === "free" && cfg.improvesSlotId) {
        const parentSlot = findLfSlotInState(compileMeta?.state, cfg.improvesSlotId)
            || (typeof findLfSlotAnywhere === "function" ? findLfSlotAnywhere(cfg.improvesSlotId) : null);
        // APPEND nur bei gleichem Scope (Basisklasse bzw. dieselbe Unterklasse)
        const scopeOk = parentSlot && isLfSameImproveScope(slot, parentSlot);
        const parentLabel = scopeOk
            ? compileMeta?.labelBySlotId?.get(cfg.improvesSlotId)
            : null;
        if (parentLabel && row.classFeatureDescription && row.classFeatureDescription !== 0) {
            row.classFeaturesCharacterSheet = `1:APPEND:${parentLabel}`;
        } else if (row.classFeatureDescription && row.classFeatureDescription !== 0 && !scopeOk) {
            // Fremder Scope: eigenständiges Merkmal (kein APPEND)
            row.classFeaturesCharacterSheet = 1;
        } else {
            row.classFeaturesCharacterSheet = 0;
        }
    }

    // Für Charakterbogen: LEVEL_VAL nur an der aktuellsten sichtbaren Stufe
    if (type === "simple" && cat === "free" && cfg.parameterId) {
        row.levelValParameterId = cfg.parameterId;
    }
}

/** Feste Bezeichnung wie formatLfDesignation / getLfFixedDesignationKey (mit Compile-State) */
function resolveCompiledFixedDesignationKey(slot, state) {
    if (!slot?.payload?.featureType || !slot.payload.category) return null;

    if (slot.payload.featureType === "options") {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        if (!spec || spec.designation === "custom") return null;
        if (spec.designation === "tab1Tool") {
            return getTab1SurfaceToolLabel(state)
                || slot.payload.optionsConfig?.toolSurfaceLabel
                || null;
        }
        return spec.designationLabel || null;
    }

    if (slot.payload.featureType === "simple") {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        if (!spec || spec.designation === "custom") return null;
        if (spec.designation === "preDefinedLabel") {
            return slot.payload.optionsConfig?.preDefinedLabel || null;
        }
        return spec.designationLabel || null;
    }

    if (slot.payload.featureType === "attribute") {
        const spec = getLfAttributeCategorySpec(slot.payload.category);
        return spec?.designationLabel || null;
    }

    if (slot.payload.featureType === "spellcraft") {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        return spec?.designationLabel || null;
    }

    return null;
}

/** Feste Kurz-/Langbeschreibung analog getLfFixedDescKeys (mit Compile-State) */
function resolveCompiledFixedDescKeys(slot, state) {
    const presetKeys = getLfSystemPresetFixedDescKeys(slot);
    if (presetKeys) return presetKeys;

    if (!slot?.payload?.featureType || !slot.payload.category) {
        return { shortKey: null, longKey: null };
    }

    if (slot.payload.featureType === "options") {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        if (!spec) return { shortKey: null, longKey: null };
        if (spec.descMode === "fixed") {
            return { shortKey: spec.shortKey || null, longKey: spec.longKey || null };
        }
        if (spec.descMode === "toolsFixed") {
            const surface = getTab1SurfaceToolLabel(state)
                || slot.payload.optionsConfig?.toolSurfaceLabel;
            return {
                shortKey: typeof getLfToolsShortDescKey === "function"
                    ? getLfToolsShortDescKey(surface)
                    : null,
                longKey: null
            };
        }
        return { shortKey: null, longKey: null };
    }

    if (slot.payload.featureType === "simple") {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        if (!spec) return { shortKey: null, longKey: null };
        if (spec.descMode === "fixed") {
            return { shortKey: spec.shortKey || null, longKey: spec.longKey || null };
        }
        if (spec.descMode === "preDefinedFixed") {
            const meta = getLfPreDefinedFeatureMeta(slot.payload.optionsConfig?.preDefinedLabel);
            return {
                shortKey: meta?.shortKey || null,
                longKey: meta?.longKey || null
            };
        }
        return { shortKey: null, longKey: null };
    }

    if (slot.payload.featureType === "spellcraft") {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        if (!spec) return { shortKey: null, longKey: null };
        if (spec.descMode === "fixed") {
            const cat = slot.payload.category;
            const addToBook = customClassStateUsesSpellbook(state)
                && (cat === "choosePreparedSpell" || cat === "getPreparedSpell")
                && slot.payload?.optionsConfig?.addToSpellbook !== false;
            return {
                shortKey: spec.shortKey || null,
                longKey: addToBook ? null : (spec.longKey || null)
            };
        }
        return { shortKey: null, longKey: null };
    }

    return { shortKey: null, longKey: null };
}

/**
 * Step2 / Infobox / Sheet-Flags aus Texten setzen, wenn Partial nichts gesetzt hat.
 * Doppelte Merkmale (ASI, Expertise, …) werden danach auf PHB-Muster bereinigt.
 */
function applyCompiledDisplayFlagsFromTexts(row, slot, partial) {
    const isSkills = slot.systemPreset === "coreSkills"
        || (slot.payload?.featureType === "options" && slot.payload?.category === "skills")
        || (slot.payload?.featureType === "simple" && slot.payload?.category === "skills");
    if (isSkills) return;
    // Einfach→Rettungswürfe: Flags werden in applyCompiledPresetAndSkillExtras gesetzt
    if (slot.payload?.featureType === "simple" && slot.payload?.category === "savingThrows") return;
    // Einfach→Waffen-/Rüstungsvertrautheit: Flags in applyCompiledPresetAndSkillExtras
    if (slot.payload?.featureType === "simple"
        && (slot.payload?.category === "weaponTraining" || slot.payload?.category === "armorTraining")) {
        return;
    }

    const hasShort = row.classFeatureShortDescription && row.classFeatureShortDescription !== 0;
    const hasLong = row.classFeatureDescription && row.classFeatureDescription !== 0;

    // Partial-Flags haben Vorrang, sofern explizit gesetzt (auch 0)
    const partialHasStep2 = partial && Object.prototype.hasOwnProperty.call(partial, "classFeaturesStep2");
    const partialHasInfo = partial && Object.prototype.hasOwnProperty.call(partial, "infoBox");
    const partialHasSheet = partial && Object.prototype.hasOwnProperty.call(partial, "classFeaturesCharacterSheet");

    if (!partialHasStep2 && hasShort && !(row.subclassCategoryNumber > 0)) {
        row.classFeaturesStep2 = 1;
    }
    if (!partialHasInfo && hasShort && !(row.subclassCategoryNumber > 0)) {
        row.infoBox = 1;
    }
    if (!partialHasSheet && hasLong) row.classFeaturesCharacterSheet = 1;
}

/**
 * PHB-Muster (z. B. Bard/Rogue): Gleiches Merkmal (gleicher translationLabel)
 * erscheint in der Merkmalsliste (Schritt 5) auf jeder Stufe (classFeaturesStep2),
 * die Infobox-Beschreibung aber nur beim ersten Vorkommen (infoBox).
 * Betrifft ASI, Expertise, Waffenbeherrschung u. a. Doppelungen in der Basisklasse.
 */
function applyCompiledDuplicateFeatureInfoBoxDedup(rows) {
    const byLabel = new Map();
    (rows || []).forEach(row => {
        if (!row || !row.translationLabel || row.translationLabel === 0) return;
        if (row.subclassCategoryNumber > 0) return;
        const key = String(row.translationLabel);
        if (!byLabel.has(key)) byLabel.set(key, []);
        byLabel.get(key).push(row);
    });

    byLabel.forEach((group, key) => {
        if (group.length < 2) return;
        group.sort((a, b) => (Number(a.level) - Number(b.level)) || (Number(a.ID) - Number(b.ID)));
        group.forEach((row, i) => {
            // Merkmalsliste: auf jeder betroffenen Stufe sichtbar
            row.classFeaturesStep2 = 1;
            if (i === 0) {
                // ASI: Kurzbeschreibung sicherstellen (Infobox-Text)
                if (key === "asiAndFeat"
                    && (!row.classFeatureShortDescription || row.classFeatureShortDescription === 0)) {
                    row.classFeatureShortDescription = "asiAndFeatShortD";
                }
                if (row.classFeatureShortDescription && row.classFeatureShortDescription !== 0) {
                    row.infoBox = 1;
                }
            } else {
                row.infoBox = 0;
            }
        });
    });
}

/** Zähler für selectedExpertiseN / selectedWeaponMasteryN / … über alle Slots */
function createCompiledChoiceCounters() {
    return {
        skill: 0,
        expertise: 0,
        weaponMastery: 0,
        maneuver: 0,
        language: 0,
        tool: 0,
        attribute: 0,
        freeChoice: 0
    };
}

function buildIndexedConstForChoice(prefix, startIndex, count) {
    const n = Math.max(0, parseInt(count, 10) || 0);
    if (n <= 0) return 0;
    return Array.from({ length: n }, (_, i) => `${prefix}${startIndex + i}`).join(";");
}

function countConstForChoiceParts(constForChoice) {
    if (typeof constForChoice !== "string" || !constForChoice.trim()) return 0;
    return constForChoice.split(";").map(s => s.trim()).filter(Boolean).length;
}

/** Feat-IDs für Kampfstil-Pool (Auswahl oder alle Cat-3) */
function resolveCompiledFightingStyleIds(cfg) {
    const feats = typeof featList !== "undefined" ? featList : [];
    const mode = cfg?.mode || "selection";
    if (mode === "all") {
        const ids = feats.filter(f => f.featCategoryNumber === 3).map(f => f.ID);
        return ids.length ? ids : 0;
    }
    const labels = Array.isArray(cfg?.selectedFeatLabels) ? cfg.selectedFeatLabels : [];
    const ids = [];
    labels.forEach(label => {
        const feat = feats.find(f => f.translationLabel === label);
        if (feat && !ids.includes(feat.ID)) ids.push(feat.ID);
    });
    return ids.length ? ids : 0;
}

/** Attribut-IDs für Rettungswurf-Auswahl */
function resolveCompiledSavingThrowAttributeIds(cfg) {
    const attrs = typeof attributeList !== "undefined" ? attributeList : [];
    const mode = cfg?.mode || "selection";
    if (mode === "all") {
        return attrs.map(a => a.ID);
    }
    const labels = Array.isArray(cfg?.selectedLabels) ? cfg.selectedLabels : [];
    const ids = [];
    labels.forEach(label => {
        const attr = attrs.find(a => a.translationLabel === label);
        if (attr && !ids.includes(attr.ID)) ids.push(attr.ID);
    });
    return ids.length ? ids : 0;
}

/** Gewährte Rettungswurf-Labels (Einfach→Rettungswürfe), ohne Tab-1-Kern */
function resolveCompiledGrantedSavingThrowLabels(cfg, state) {
    const allLabels = [
        "strengthLabel", "dexterityLabel", "constitutionLabel",
        "intelligenceLabel", "wisdomLabel", "charismaLabel"
    ];
    const core = new Set(normalizeToArray(state?.savingThrowProficiencies).filter(Boolean));
    const available = allLabels.filter(l => !core.has(l));
    const mode = cfg?.mode || "selection";
    if (mode === "all") return available;
    const selected = Array.isArray(cfg?.selectedLabels) ? cfg.selectedLabels : [];
    return selected.filter(l => available.includes(l));
}

/** Verbleibende Waffenkategorien (ohne Tab-1-Kern) */
function getLfRemainingWeaponCategoryNumbers(state) {
    const tab1 = new Set(
        normalizeToArray(state?.weaponCategoryNumber)
            .map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n > 0)
    );
    return (typeof weaponCategory !== "undefined" ? weaponCategory : [])
        .map(c => c.weaponCategoryNumber)
        .filter(n => Number.isFinite(n) && n > 0 && !tab1.has(n));
}

/** Verbleibende Waffeneigenschaften (ohne Tab-1-Kern) */
function getLfRemainingWeaponPropertyCategoryNumbers(state) {
    const tab1 = new Set(
        normalizeToArray(state?.weaponPropertyCategoryNumber)
            .map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n > 0)
    );
    return (typeof weaponProperty !== "undefined" ? weaponProperty : [])
        .map(p => p.weaponPropertyCategoryNumber)
        .filter(n => Number.isFinite(n) && n > 0 && !tab1.has(n));
}

/** Verbleibende Rüstungskategorien (ohne Tab-1-Kern) */
function getLfRemainingArmorCategoryNumbers(state) {
    const tab1 = new Set(
        normalizeToArray(state?.armorCategoryNumber)
            .map(n => parseInt(n, 10)).filter(n => Number.isFinite(n) && n > 0)
    );
    return (typeof armorCategory !== "undefined" ? armorCategory : [])
        .map(c => c.armorCategoryNumber)
        .filter(n => Number.isFinite(n) && n > 0 && !tab1.has(n));
}

/** Waffenkategorien für Einfach→Waffenvertrautheit (Alle = Restpool) */
function resolveCompiledWeaponTrainingCategoryNumbers(cfg, state) {
    const remaining = getLfRemainingWeaponCategoryNumbers(state);
    const mode = cfg?.weaponCategoryMode || "selection";
    if (mode === "all") return remaining.slice();
    return normalizeToArray(cfg?.selectedWeaponCategoryNumbers)
        .map(n => parseInt(n, 10))
        .filter(n => Number.isFinite(n) && n > 0 && remaining.includes(n));
}

/** Waffeneigenschaften für Einfach→Waffenvertrautheit (Alle = Restpool) */
function resolveCompiledWeaponTrainingPropertyNumbers(cfg, state) {
    const remaining = getLfRemainingWeaponPropertyCategoryNumbers(state);
    const mode = cfg?.weaponPropertyMode || "selection";
    if (mode === "all") return remaining.slice();
    return normalizeToArray(cfg?.selectedWeaponPropertyCategoryNumbers)
        .map(n => parseInt(n, 10))
        .filter(n => Number.isFinite(n) && n > 0 && remaining.includes(n));
}

/** Rüstungskategorien für Einfach→Rüstungsvertrautheit (Alle = Restpool) */
function resolveCompiledArmorTrainingCategoryNumbers(cfg, state) {
    const remaining = getLfRemainingArmorCategoryNumbers(state);
    const mode = cfg?.mode || "selection";
    if (mode === "all") return remaining.slice();
    return normalizeToArray(cfg?.selectedArmorCategoryNumbers)
        .map(n => parseInt(n, 10))
        .filter(n => Number.isFinite(n) && n > 0 && remaining.includes(n));
}

/** Manöver-Kategorie-Nummern */
function resolveCompiledManeuverCategoryNumbers(cfg) {
    const list = typeof maneuverCategoryList !== "undefined" ? maneuverCategoryList : [];
    const mode = cfg?.mode || "selection";
    if (mode === "all") {
        const nums = list.map(m => m.maneuverCategoryNumber);
        return nums.length ? nums : 0;
    }
    const selected = Array.isArray(cfg?.selectedManeuvers) ? cfg.selectedManeuvers
        : (Array.isArray(cfg?.selectedLabels) ? cfg.selectedLabels : []);
    if (!selected.length) return 0;
    const nums = [];
    selected.forEach(v => {
        if (typeof v === "number" || /^\d+$/.test(String(v))) {
            const n = parseInt(v, 10);
            if (Number.isFinite(n) && !nums.includes(n)) nums.push(n);
            return;
        }
        const m = list.find(x => x.translationLabel === v);
        if (m && !nums.includes(m.maneuverCategoryNumber)) nums.push(m.maneuverCategoryNumber);
    });
    return nums.length ? nums : 0;
}

/** Sprach-Kategorie-Nummern */
function resolveCompiledLanguageCategoryNumbers(cfg) {
    const langs = typeof languageList !== "undefined" ? languageList : [];
    const mode = cfg?.mode || "selection";
    if (mode === "all" || mode === "rarity") {
        let pool = langs.filter(l => l.translationLabel !== "commonLangLabel");
        if (mode === "rarity") {
            const rarity = cfg?.rarity === "rare" ? "rare" : "standard";
            pool = pool.filter(l => l.langRarity === rarity);
        }
        const nums = pool.map(l => l.languageCategoryNumber);
        return nums.length ? nums : 0;
    }
    const labels = Array.isArray(cfg?.selectedLabels) ? cfg.selectedLabels : [];
    const nums = [];
    labels.forEach(label => {
        const lang = langs.find(l => l.translationLabel === label);
        if (lang && !nums.includes(lang.languageCategoryNumber)) {
            nums.push(lang.languageCategoryNumber);
        }
    });
    return nums.length ? nums : 0;
}

/**
 * Options-Kategorien → choiceInStep3 / constForChoice / Pools (Phase 3).
 * Skills bleiben in applyCompiledPresetAndSkillExtras.
 */
function applyCompiledOptionsChoiceExtras(row, slot, state, counters, keyStem, translationsBag) {
    if (slot.payload?.featureType !== "options") return;
    const cat = slot.payload.category;
    if (!cat || cat === "skills" || cat === "asiAndFeat") return;

    const cfg = slot.payload.optionsConfig || {};
    const amount = getLfSlotAmountValue(slot) || 1;

    if (cat === "expertise") {
        row.choiceInStep3 = 1;
        const start = counters.expertise + 1;
        counters.expertise += amount;
        row.constForChoice = buildIndexedConstForChoice("selectedExpertise", start, amount);
        return;
    }

    if (cat === "weaponMasteries") {
        row.choiceInStep3 = 1;
        const start = counters.weaponMastery + 1;
        counters.weaponMastery += amount;
        row.constForChoice = buildIndexedConstForChoice("selectedWeaponMastery", start, amount);
        return;
    }

    if (cat === "fightingStyle") {
        row.choiceInStep3 = 1;
        row.constForChoice = `feat [${row.level}]`;
        row.fightingStyleID = resolveCompiledFightingStyleIds(cfg);
        return;
    }

    if (cat === "savingThrows") {
        row.choiceInStep3 = 1;
        const start = counters.attribute + 1;
        counters.attribute += amount;
        row.constForChoice = buildIndexedConstForChoice("selectedAttribute", start, amount);
        row.attributeID = resolveCompiledSavingThrowAttributeIds(cfg);
        return;
    }

    if (cat === "maneuver") {
        row.choiceInStep3 = 1;
        const start = counters.maneuver + 1;
        counters.maneuver += amount;
        row.constForChoice = buildIndexedConstForChoice("selectedManeuver", start, amount);
        row.maneuverCategoryNumber = resolveCompiledManeuverCategoryNumbers(cfg);
        return;
    }

    if (cat === "languages") {
        row.choiceInStep3 = 1;
        const start = counters.language + 1;
        counters.language += amount;
        row.constForChoice = buildIndexedConstForChoice("selectedLanguage", start, amount);
        row.languageCategoryNumber = resolveCompiledLanguageCategoryNumbers(cfg);
        return;
    }

    if (cat === "tools") {
        row.choiceInStep3 = 1;
        const start = counters.tool + 1;
        counters.tool += amount;
        row.constForChoice = buildIndexedConstForChoice("selectedTool", start, amount);
        // Oberflächen-Tool aus Tab 1 → toolCategoryNumber-Pool grob über Label
        const surface = getTab1SurfaceToolLabel(state)
            || cfg.toolSurfaceLabel
            || null;
        if (surface === "artisansToolsLabel") row.toolCategoryNumber = [1, 3];
        else if (surface === "musicalInstrumentLabel") row.toolCategoryNumber = [2];
        else if (surface === "gamingSetLabel") row.toolCategoryNumber = [3];
        else row.toolCategoryNumber = [1, 2, 3];
        // Alle vs. Auswahl (Schritt-6-Dropdown-Pool)
        const mode = cfg.mode || (Array.isArray(cfg.allowedLabels) && cfg.allowedLabels.length ? "selection" : "all");
        row.toolPoolMode = mode;
        row.toolAllowedLabels = (mode === "selection" && Array.isArray(cfg.allowedLabels))
            ? cfg.allowedLabels.slice()
            : 0;
        return;
    }

    if (cat === "free") {
        const choices = Array.isArray(cfg.choices) ? cfg.choices.filter(c => lfHasText(c?.names || c)) : [];
        if (choices.length >= 2) {
            row.choiceInStep3 = 1;
            const start = counters.freeChoice + 1;
            counters.freeChoice += amount;
            row.constForChoice = buildIndexedConstForChoice("selectedFreeChoice", start, amount);
            const familyId = ensureLfFreeOptionsFamilyId(slot);
            // Optionstexte als Translations; value = familienweit eindeutig (für CHOICE_LIST)
            row.freeChoiceOptions = choices.map((c, i) => {
                const optKey = `${keyStem || row.translationLabel || "fc"}_opt${i + 1}`;
                const optDescKey = `${optKey}D`;
                const value = `${familyId}__${i + 1}`;
                if (translationsBag) {
                    putCompiledTranslation(
                        translationsBag,
                        optKey,
                        pickCompiledLocaleText(c.names, "de"),
                        pickCompiledLocaleText(c.names, "en")
                    );
                    if (lfHasText(c.descriptions)) {
                        putCompiledTranslation(
                            translationsBag,
                            optDescKey,
                            pickCompiledLocaleText(c.descriptions, "de"),
                            pickCompiledLocaleText(c.descriptions, "en")
                        );
                    }
                }
                return {
                    value,
                    translationLabel: optKey,
                    descriptionLabel: lfHasText(c.descriptions) ? optDescKey : 0
                };
            });
            row.freeChoiceFamilyId = familyId;
        }
    }
}

/** Attribut → Direkt / Verteilung in ClassData-Rows */
function applyCompiledAttributeChoiceExtras(row, slot) {
    if (slot.payload?.featureType !== "attribute") return;
    const cfg = slot.payload.optionsConfig || {};

    if (slot.payload.category === "distribution") {
        // Unterklassen: Verteilung nicht kompilieren (nur Basisklasse)
        if (isLfSubclassFeatureSlot(slot) || (row.subclassCategoryNumber || 0) > 0) {
            return;
        }
        row.choiceInStep3 = 1;
        row.constForChoice = "attributeDistribution";
        row.attributeDistributionConfig = {
            points: Math.max(0, parseInt(cfg.points, 10) || 0),
            allowedAbilities: Array.isArray(cfg.allowedAbilities) ? cfg.allowedAbilities.slice() : [],
            distributionMode: cfg.distributionMode || "free",
            maxPerAbility: cfg.maxPerAbility != null ? parseInt(cfg.maxPerAbility, 10) : null
        };
        return;
    }

    if (slot.payload.category === "direct") {
        // Passive Attributsboni (wie primalChampion) – Anwendung in applyPassiveClassFeatures
        row.choiceInStep3 = 0;
        row.constForChoice = 0;
        const bonuses = {};
        (cfg.abilityPoints || []).forEach(a => {
            const pts = Math.max(0, parseInt(a.points, 10) || 0);
            if (!pts || !a.ability) return;
            const key = String(a.ability).replace(/Label$/i, "");
            bonuses[key] = (bonuses[key] || 0) + pts;
        });
        row.classAttributeBonuses = Object.keys(bonuses).length ? bonuses : 0;
    }
}

function buildSelectedSkillConstForChoice(amount) {
    const n = Math.max(0, parseInt(amount, 10) || 0);
    if (n <= 0) return 0;
    return Array.from({ length: n }, (_, i) => `selectedSkill${i + 1}`).join(";");
}

/** Fertigkeits-Pool für ClassData-Zeile (Tab-1 / Filter) */
function resolveCompiledSkillCategoryNumbers(slot, state) {
    const cfg = slot.payload?.optionsConfig || {};
    const filter = cfg.skillFilter || "base";
    const allSkills = typeof skillList !== "undefined" ? skillList : [];

    if (filter === "selection" && Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length) {
        const wanted = new Set(cfg.selectedSkills);
        const nums = [];
        allSkills.forEach(s => {
            const label = s.translationLabel || s;
            if (!wanted.has(label)) return;
            const n = parseInt(s.skillCategoryNumber, 10);
            if (Number.isFinite(n) && !nums.includes(n)) nums.push(n);
        });
        return nums.length ? nums : 0;
    }

    if (filter === "all") {
        const nums = [];
        allSkills.forEach(s => {
            const n = parseInt(s.skillCategoryNumber, 10);
            if (Number.isFinite(n) && !nums.includes(n)) nums.push(n);
        });
        return nums.length ? nums : 0;
    }

    const base = normalizeToArray(state.skillCategoryNumber).map(n => parseInt(n, 10)).filter(Number.isFinite);
    return base.length ? base : 0;
}

function mergeCompiledClassDataPartial(row, partial) {
    if (!partial || typeof partial !== "object") return;
    Object.keys(partial).forEach(key => {
        if (partial[key] === null || partial[key] === undefined) return;
        row[key] = partial[key];
    });
}

/**
 * System-Presets & Skills: Flags aus classDataPartial + PHB-übliche constForChoice.
 */
function applyCompiledPresetAndSkillExtras(row, slot, state, counters) {
    const partial = slot.payload?.classDataPartial || {};
    mergeCompiledClassDataPartial(row, partial);

    const preset = slot.systemPreset;
    const isCoreSkills = preset === "coreSkills";
    const isOptionsSkills = slot.payload?.featureType === "options" && slot.payload?.category === "skills";
    const isSimpleSkills = slot.payload?.featureType === "simple" && slot.payload?.category === "skills";
    const isSimpleSavingThrows = slot.payload?.featureType === "simple" && slot.payload?.category === "savingThrows";
    const isSimpleWeaponTraining = slot.payload?.featureType === "simple" && slot.payload?.category === "weaponTraining";
    const isSimpleArmorTraining = slot.payload?.featureType === "simple" && slot.payload?.category === "armorTraining";
    const isSkills = isCoreSkills || isOptionsSkills;

    // Einfach→Fertigkeiten: feste Fertigkeiten ab Merkmalsstufe (kein Dropdown)
    if (isSimpleSkills) {
        const cfg = slot.payload.optionsConfig || {};
        const labels = Array.isArray(cfg.selectedSkills) ? cfg.selectedSkills : [];
        const nums = [];
        const allSkills = typeof skillList !== "undefined" ? skillList : [];
        labels.forEach(lab => {
            const sk = allSkills.find(s => (s.translationLabel || s) === lab);
            const n = sk ? parseInt(sk.skillCategoryNumber, 10) : NaN;
            if (Number.isFinite(n) && !nums.includes(n)) nums.push(n);
        });
        row.choiceInStep3 = 0;
        row.constForChoice = 0;
        row.grantedSkillCategoryNumbers = nums.length ? nums : 0;
        row.translationLabel = "additionalSkillsLabel";
        row.classFeatureShortDescription = "additionalSkillsShortD";
        row.classFeatureDescription = 0;
        row.classFeaturesStep2 = 1;
        row.infoBox = 1;
        row.classFeaturesCharacterSheet = 0;
        return;
    }

    // Einfach→Rettungswürfe: gewährte Attribute (kein Dropdown)
    if (isSimpleSavingThrows) {
        const cfg = slot.payload.optionsConfig || {};
        const labels = resolveCompiledGrantedSavingThrowLabels(cfg, state);
        row.choiceInStep3 = 0;
        row.constForChoice = 0;
        row.grantedSavingThrowLabels = labels.length ? labels : 0;
        row.translationLabel = "savingThrowsLabel";
        row.classFeatureShortDescription = "grantedSavingThrowsShortD";
        row.classFeatureDescription = 0;
        row.classFeaturesStep2 = 1;
        row.infoBox = 1;
        row.classFeaturesCharacterSheet = 0;
        return;
    }

    // Einfach→Waffenvertrautheit: feste Kategorien/Eigenschaften (wie Wächter-Get_*)
    if (isSimpleWeaponTraining) {
        const cfg = slot.payload.optionsConfig || {};
        const weaponCats = resolveCompiledWeaponTrainingCategoryNumbers(cfg, state);
        const weaponProps = resolveCompiledWeaponTrainingPropertyNumbers(cfg, state);
        row.choiceInStep3 = 0;
        row.constForChoice = 0;
        row.Get_weaponCategoryNumber = weaponCats.length ? weaponCats : 0;
        row.grantedWeaponPropertyCategoryNumbers = weaponProps.length ? weaponProps : 0;
        row.translationLabel = "weaponTrainingLabel";
        row.classFeatureShortDescription = "weaponTrainingGrantedShortD";
        row.classFeatureDescription = 0;
        row.classFeaturesStep2 = 1;
        row.infoBox = 1;
        row.classFeaturesCharacterSheet = 0;
        return;
    }

    // Einfach→Rüstungsvertrautheit: feste Rüstungskategorien
    if (isSimpleArmorTraining) {
        const cfg = slot.payload.optionsConfig || {};
        const armorCats = resolveCompiledArmorTrainingCategoryNumbers(cfg, state);
        row.choiceInStep3 = 0;
        row.constForChoice = 0;
        row.Get_armorCategoryNumber = armorCats.length === 1 ? armorCats[0] : (armorCats.length ? armorCats : 0);
        row.translationLabel = "armorTrainingLabel";
        row.classFeatureShortDescription = "armorTrainingGrantedShortD";
        row.classFeatureDescription = 0;
        row.classFeaturesStep2 = 1;
        row.infoBox = 1;
        row.classFeaturesCharacterSheet = 0;
        return;
    }

    if (isSkills) {
        row.choiceInStep3 = 1;
        row.skillCategoryNumber = resolveCompiledSkillCategoryNumbers(slot, state);
        const amount = getLfSlotAmountValue(slot) || (isCoreSkills ? 2 : 1);
        if (counters) {
            const start = counters.skill + 1;
            counters.skill += amount;
            row.constForChoice = buildIndexedConstForChoice("selectedSkill", start, amount);
        } else {
            row.constForChoice = buildSelectedSkillConstForChoice(amount);
        }

        if (isCoreSkills) {
            // PHB-Skillzeile: nur Auswahl, keine Anzeige in Liste/Infobox
            row.translationLabel = 0;
            row.classFeatureShortDescription = 0;
            row.classFeatureDescription = 0;
            row.classFeaturesStep2 = 0;
            row.infoBox = 0;
            row.classFeaturesCharacterSheet = 0;
        } else {
            // Zusätzliche Options→Fertigkeiten
            row.translationLabel = "additionalSkillsLabel";
            row.classFeatureShortDescription = "additionalSkillsShortD";
            row.classFeatureDescription = 0;
            row.classFeaturesStep2 = 1;
            row.infoBox = 1;
            row.classFeaturesCharacterSheet = 0;
        }
        return;
    }

    if (preset === "asiAndFeat" || (slot.payload?.category === "asiAndFeat" && preset !== "epicBoon")) {
        row.choiceInStep3 = 1;
        if (!row.constForChoice || row.constForChoice === 0) {
            row.constForChoice = `feats [${row.level}]`;
        }
        return;
    }

    if (preset === "epicBoon") {
        row.choiceInStep3 = 1;
        row.constForChoice = row.constForChoice && row.constForChoice !== 0
            ? row.constForChoice
            : "epicBoons";
    }
}

/** Scope der Tab-4-Zauberprogression: Basisklasse (0) oder eine Unterklasse */
function resolveCompiledSpellcastingScope(state) {
    const baseSlot = (state?.levelFeatures || []).find(s =>
        isLfSlotEligibleForCompile(s)
        && s.payload?.featureType === "simple"
        && s.payload?.category === "spellcasting"
    );
    if (baseSlot) {
        return { subclassCategoryNumber: 0, slot: baseSlot, source: "class" };
    }
    for (let i = 0; i < (state?.subclasses || []).length; i++) {
        const sc = state.subclasses[i];
        const slot = (sc.levelFeatures || []).find(s =>
            isLfSlotEligibleForCompile(s)
            && s.payload?.featureType === "simple"
            && s.payload?.category === "spellcasting"
        );
        if (slot) {
            return {
                subclassCategoryNumber: sc.subclassCategoryNumber || (i + 1),
                slot,
                source: "subclass",
                subclass: sc
            };
        }
    }
    return null;
}

/** Reine Übungsbonus-Felder (ohne Zauber) */
function buildCompiledProficiencyOnlySnapshot(level) {
    return { ProficiencyBonus: getCustomClassProficiencyBonus(level) };
}

/** Zauber-Ressourcen einer Stufe (0 wenn Progression nicht aktiv / unter startLevel) */
function buildCompiledSpellResourceSnapshot(level, state) {
    const snap = {
        cantripsAmount: 0,
        preparedSpellsAmount: 0,
        SSpSL1: 0,
        SSpSL2: 0,
        SSpSL3: 0,
        SSpSL4: 0,
        SSpSL5: 0,
        SSpSL6: 0,
        SSpSL7: 0,
        SSpSL8: 0,
        SSpSL9: 0,
        spellListLabels: 0
    };
    const progRow = getSpellProgRowFromProgression(state?.spellcastingProgression, level);
    if (!progRow) return snap;

    snap.cantripsAmount = Math.max(0, parseInt(progRow.cantripsAmount, 10) || 0);
    snap.preparedSpellsAmount = Math.max(0, parseInt(progRow.preparedSpellsAmount, 10) || 0);
    for (let i = 1; i <= 9; i++) {
        snap[`SSpSL${i}`] = Math.max(0, parseInt(progRow[`SSpSL${i}`], 10) || 0);
    }
    const lists = Array.isArray(progRow.spellListLabels) && progRow.spellListLabels.length
        ? progRow.spellListLabels
        : (state?.spellcastingProgression?.baseSpellListLabels || []);
    snap.spellListLabels = Array.isArray(lists) && lists.length ? lists.slice() : 0;
    return snap;
}

function applyCompiledResourceFields(row, fields) {
    if (!row || !fields) return;
    Object.keys(fields).forEach(key => {
        row[key] = fields[key];
    });
}

/**
 * ÜB auf alle Zeilen; Zauberprogression nur auf den Spellcasting-Scope
 * (Basisklasse ODER eine Unterklasse – wie Arcane Trickster).
 */
function denormalizeCompiledClassResources(rows, state, nextId) {
    const scope = resolveCompiledSpellcastingScope(state);
    const spellSubclass = scope ? scope.subclassCategoryNumber : null;
    const zeroSpell = buildCompiledSpellResourceSnapshot(0, null);

    // Trägerzeilen: jede Stufe mind. Base; bei UC-Caster zusätzlich UC-Zeile ab startLevel
    for (let level = 1; level <= 20; level++) {
        if (!rows.some(r => Number(r.level) === level && (r.subclassCategoryNumber || 0) === 0)) {
            const carrier = createEmptyCompiledClassDataRow(level, nextId());
            carrier.subclassCategoryNumber = 0;
            carrier.translationLabel = 0;
            carrier.infoBox = 0;
            carrier.classFeaturesStep2 = 0;
            carrier.classFeaturesCharacterSheet = 0;
            rows.push(carrier);
        }
        if (spellSubclass != null && spellSubclass > 0) {
            const start = state?.spellcastingProgression?.startLevel || 1;
            if (level >= start
                && !rows.some(r => Number(r.level) === level && (r.subclassCategoryNumber || 0) === spellSubclass)) {
                const carrier = createEmptyCompiledClassDataRow(level, nextId());
                carrier.subclassCategoryNumber = spellSubclass;
                carrier.translationLabel = 0;
                carrier.infoBox = 0;
                carrier.classFeaturesStep2 = 0;
                carrier.classFeaturesCharacterSheet = 0;
                rows.push(carrier);
            }
        }
    }

    for (let level = 1; level <= 20; level++) {
        const pb = buildCompiledProficiencyOnlySnapshot(level);
        const spellSnap = (scope && state?.spellcastingProgression?.unlocked)
            ? buildCompiledSpellResourceSnapshot(level, state)
            : zeroSpell;
        rows.filter(r => Number(r.level) === level).forEach(row => {
            applyCompiledResourceFields(row, pb);
            const rowSub = row.subclassCategoryNumber || 0;
            if (spellSubclass == null) {
                applyCompiledResourceFields(row, zeroSpell);
            } else if (rowSub === spellSubclass) {
                applyCompiledResourceFields(row, spellSnap);
            } else {
                applyCompiledResourceFields(row, zeroSpell);
            }
        });
    }
}

/** @deprecated Alias – wird durch denormalizeCompiledClassResources ersetzt */
function buildCompiledLevelResourceSnapshot(level, state) {
    return {
        ...buildCompiledProficiencyOnlySnapshot(level),
        ...buildCompiledSpellResourceSnapshot(level, state)
    };
}

function denormalizeCompiledLevelResources(rowsAtLevel, snapshot) {
    (rowsAtLevel || []).forEach(row => applyCompiledResourceFields(row, snapshot));
}

function ensureCompiledLevelCarrierRows(rows, nextId) {
    for (let level = 1; level <= 20; level++) {
        if (rows.some(r => Number(r.level) === level)) continue;
        const row = createEmptyCompiledClassDataRow(level, nextId());
        row.translationLabel = 0;
        row.infoBox = 0;
        row.classFeaturesStep2 = 0;
        row.classFeaturesCharacterSheet = 0;
        rows.push(row);
    }
}

/**
 * Vordefiniert-/Frei-Parameter eines Slots als LEVEL_VAL-Spaltenwerte.
 * Keys entsprechen [LEVEL_VAL]key[/LEVEL_VAL] in den Merkmalsbeschreibungen.
 */
function extractCompiledLevelParameterValuesFromSlot(slot, state) {
    const values = {};
    if (!slot?.payload) return values;

    const type = slot.payload.featureType;
    const cat = slot.payload.category;
    const cfg = slot.payload.optionsConfig || {};

    // Einfach → Vordefiniert (rages, bardicDie, …)
    if (type === "simple" && cat === "preDefined") {
        const label = cfg.preDefinedLabel;
        if (!label) return values;
        const defaults = buildLfPreDefinedDefaultParameterValues(label);
        Object.assign(values, defaults, cfg.parameterValues || {});
        const meta = getLfPreDefinedFeatureMeta(label);
        if (meta?.fixedValues && typeof meta.fixedValues === "object") {
            Object.assign(values, meta.fixedValues);
        }
        return values;
    }

    // Einfach → Frei: Anzeigewert unter stabiler parameterId (für LEVEL_VAL in Freitext)
    if (type === "simple" && cat === "free" && cfg.parameterId) {
        const registry = Array.isArray(state?.parameterRegistry) ? state.parameterRegistry : [];
        const param = registry.find(p => p.id === cfg.parameterId) || null;
        values[cfg.parameterId] = formatLfSimpleFreeParamValueText(cfg, param);
    }

    return values;
}

/** Parameter-Events je Stufe (Carry-Forward wie PHB-Klassendaten). */
function collectCompiledParameterEvents(state) {
    const events = [];
    const pushFromSlots = (slots) => {
        (slots || []).filter(isLfSlotEligibleForCompile).forEach(slot => {
            const values = extractCompiledLevelParameterValuesFromSlot(slot, state);
            if (!Object.keys(values).length) return;
            events.push({ level: Number(slot.level) || 1, values });
        });
    };
    pushFromSlots(state?.levelFeatures);
    (state?.subclasses || []).forEach(sc => pushFromSlots(sc.levelFeatures));
    return events;
}

/** Pro Stufe: letzte bekannte Parameterwerte (1→20 Carry-Forward). */
function buildCompiledParameterCarryByLevel(events) {
    const sorted = (events || []).slice().sort((a, b) => a.level - b.level || 0);
    const byLevel = {};
    let carry = {};
    let ei = 0;
    for (let level = 1; level <= 20; level++) {
        while (ei < sorted.length && sorted[ei].level === level) {
            Object.assign(carry, sorted[ei].values);
            ei += 1;
        }
        byLevel[level] = { ...carry };
    }
    return byLevel;
}

/**
 * Schreibt LEVEL_VAL-Spalten (rages, wildShape, …) auf alle Rows der jeweiligen Stufe.
 * Unabhängig von subclassCategoryNumber – Lookup im Charakterbogen ist level-basiert.
 */
function denormalizeCompiledFeatureParameters(rows, state) {
    const byLevel = buildCompiledParameterCarryByLevel(collectCompiledParameterEvents(state));
    (rows || []).forEach(row => {
        const snap = byLevel[row.level] || {};
        Object.keys(snap).forEach(key => {
            if (snap[key] === undefined || snap[key] === null) return;
            row[key] = snap[key];
        });
    });
}

function compileSlotToClassDataRow(slot, ctx) {
    const {
        nextId,
        state,
        slug,
        translationsBag,
        subclassCategoryNumber,
        counters,
        compileMeta
    } = ctx;

    // Preset-Partial nachziehen, falls Slot noch roh ist
    if (slot.systemPreset && !slot.payload?.classDataPartial) {
        applySystemPresetToSlot(slot);
    }

    const level = Number(slot.level) || 1;
    const row = createEmptyCompiledClassDataRow(level, nextId());
    row.subclassCategoryNumber = subclassCategoryNumber > 0 ? subclassCategoryNumber : 0;

    const keyStem = buildCompiledFeatureKeyStem(slug, slot, row.subclassCategoryNumber);
    applyCompiledPresetAndSkillExtras(row, slot, state, counters);
    applyCompiledCustomTexts(row, slot, keyStem, translationsBag, state, compileMeta);
    if (counters) applyCompiledOptionsChoiceExtras(row, slot, state, counters, keyStem, translationsBag);
    applyCompiledAttributeChoiceExtras(row, slot);
    applyCompiledSheetLinkFlags(row, slot, compileMeta);

    // Feste Skill-Zeile (coreSkills): PHB-Shape ohne Label; freie Options→Fertigkeiten: Zusätzliche Fertigkeiten
    if (slot.systemPreset === "coreSkills") {
        row.translationLabel = 0;
        row.classFeatureShortDescription = 0;
        row.classFeatureDescription = 0;
        row.classFeaturesStep2 = 0;
        row.infoBox = 0;
    } else if (slot.payload?.featureType === "options" && slot.payload?.category === "skills") {
        row.translationLabel = "additionalSkillsLabel";
        row.classFeatureShortDescription = "additionalSkillsShortD";
        row.classFeatureDescription = 0;
        row.classFeaturesStep2 = 1;
        row.infoBox = 1;
    }

    applyCompiledSentinels(row);
    return row;
}

function compileCustomSubclassList(state, slug, translationsBag) {
    const list = [];
    (state.subclasses || []).forEach((sc, i) => {
        const n = sc.subclassCategoryNumber || (i + 1);
        const labelKey = `${slug}_sc${n}Label`;
        const descKey = `${slug}_sc${n}DLabel`;
        putCompiledTranslation(
            translationsBag,
            labelKey,
            pickCompiledLocaleText(sc.names, "de"),
            pickCompiledLocaleText(sc.names, "en")
        );
        putCompiledTranslation(
            translationsBag,
            descKey,
            pickCompiledLocaleText(sc.descriptions, "de"),
            pickCompiledLocaleText(sc.descriptions, "en")
        );
        list.push({
            subclassCategoryNumber: n,
            translationLabel: labelKey,
            subclassD: descKey
        });
    });
    return list;
}

function createEmptyCompiledMagicSkillEntry(id, classSlug, subclassNum) {
    return {
        ID: id,
        class: String(classSlug || "").toLowerCase(),
        subclass: subclassNum || 0,
        translationLabel: ["spellcastingLabel"],
        getSpellList_c: 0,
        getSpellList_sl: 0,
        chooseNonSpecificSpell_c: 0,
        chooseNonSpecificSpell_ss: 0,
        chooseNonSpecificSpell_sf: 0,
        chooseNonSpecific_sl: 0,
        chooseNonSpecificSpell_a: 0,
        getSpecificSpell: 0,
        chooseType: 1
    };
}

/** Freigeschaltete Spell-Grade aus Progressionszeile → Label-Liste */
function buildCompiledSpellGradeLabelsFromProgRow(progRow) {
    if (!progRow) return ["cantripLabel"];
    const labels = ["cantripLabel"];
    for (let i = 1; i <= 9; i++) {
        if ((parseInt(progRow[`SSpSL${i}`], 10) || 0) > 0) {
            const levelLabel = i === 1 ? "1stLevelLabel"
                : i === 2 ? "2ndLevelLabel"
                    : i === 3 ? "3rdLevelLabel"
                        : `${i}thLevelLabel`;
            labels.push(levelLabel);
        }
    }
    return labels;
}

/**
 * Zauberkunst + Spellcasting → magicSkillsList / subclassSpellsList / Spell-Ability.
 * Zauberkunst-Merkmale: chooseType immer 3 (Cantrips: chooseType irrelevant).
 */
function compileCustomMagicSkillsData(state, slug, compileMeta) {
    const magicSkillsList = [];
    const subclassSpellsList = [];
    const subclassSpellAbilityList = [];
    let magicId = 0;
    let subSpellId = 0;
    const nextMagicId = () => { magicId += 1; return magicId; };
    const nextSubSpellId = () => { subSpellId += 1; return subSpellId; };

    const pushSpellcastingMagic = (slot, subclassNum) => {
        const cfg = slot.payload?.optionsConfig || {};
        const prog = state.spellcastingProgression || {};
        const maxRow = prog.unlocked
            ? getSpellProgRowFromProgression(prog, 20)
            : null;
        // Listen: Slot-Config (Tab 2/3) oder Tab-4-Progression
        const fromCfg = Array.isArray(cfg.spellListLabels)
            ? cfg.spellListLabels.filter(Boolean)
            : [];
        const fromProg = Array.isArray(maxRow?.spellListLabels) && maxRow.spellListLabels.length
            ? maxRow.spellListLabels.filter(Boolean)
            : (Array.isArray(prog.baseSpellListLabels) ? prog.baseSpellListLabels.filter(Boolean) : []);
        const lists = fromCfg.length ? fromCfg : fromProg;
        const entry = createEmptyCompiledMagicSkillEntry(nextMagicId(), slug, subclassNum);
        entry.translationLabel = ["spellcastingLabel"];
        entry.getSpellList_c = lists.length ? lists.slice() : 0;
        entry.getSpellList_sl = buildCompiledSpellGradeLabelsFromProgRow(maxRow);
        // Basis + Zauberbuch-Fokus → chooseType 0 (Anzahl setzt Step 7 wie Magier)
        const usesBook = subclassNum === 0 && customClassStateUsesSpellbook(state);
        entry.chooseType = usesBook ? 0 : 1;
        magicSkillsList.push(entry);

        if (subclassNum > 0) {
            const ability = cfg.spellcastingAbility || 0;
            if (ability && ability !== 0) {
                subclassSpellAbilityList.push({
                    classLabel: String(slug || "").toLowerCase(),
                    subclassLabel: `${slug}_sc${subclassNum}Label`,
                    subclassCategoryNumber: subclassNum,
                    spellAbillityLabel: ability
                });
            }
        }
    };

    const featureLabelForSlot = (slot) => {
        const fromMeta = compileMeta?.labelBySlotId?.get(slot.slotId);
        if (fromMeta && fromMeta !== 0) return String(fromMeta);
        return null;
    };

    const pushSpellcraftMagic = (slot, subclassNum) => {
        const cat = slot.payload?.category;
        const cfg = slot.payload?.optionsConfig || {};
        const label = featureLabelForSlot(slot);
        if (!label) return;

        const entry = createEmptyCompiledMagicSkillEntry(nextMagicId(), slug, subclassNum);
        entry.translationLabel = [label];
        entry.chooseType = 3; // Zauberkunst: vorbereitet + begünstigt (Cantrips: egal)

        if (cat === "getCantrip") {
            const spells = (cfg.selectedSpells || []).filter(Boolean);
            if (!spells.length) return;
            entry.getSpecificSpell = spells.slice();
            entry.chooseType = 1;
            magicSkillsList.push(entry);
            return;
        }

        if (cat === "chooseCantrip") {
            const pick = Math.max(0, parseInt(cfg.pickCount, 10) || 0);
            if (pick < 1) return;
            entry.chooseType = 1;
            entry.chooseNonSpecificSpell_a = pick;
            entry.chooseNonSpecificSpell_c = (cfg.listMode === "selection" && (cfg.spellListLabels || []).length)
                ? cfg.spellListLabels.slice()
                : 0;
            entry.chooseNonSpecificSpell_ss = (cfg.schoolMode === "selection" && (cfg.schoolLabels || []).length)
                ? cfg.schoolLabels.slice()
                : 0;
            entry.chooseNonSpecific_sl = ["cantripLabel"];
            magicSkillsList.push(entry);
            return;
        }

        if (cat === "getPreparedSpell") {
            const byLevel = cfg.selectedByLevel || {};
            const allSpells = [];
            Object.keys(byLevel).forEach(lvl => {
                (byLevel[lvl] || []).filter(Boolean).forEach(lab => allSpells.push(lab));
            });
            if (!allSpells.length) return;
            const addToBook = customClassStateUsesSpellbook(state) && cfg.addToSpellbook !== false;
            entry.chooseType = addToBook ? 0 : 3;
            entry.getSpecificSpell = ["subclassSpellsList"];
            magicSkillsList.push(entry);
            subclassSpellsList.push({
                ID: nextSubSpellId(),
                class: String(slug || "").toLowerCase(),
                classFeature: [label],
                level: Number(slot.level) || 1,
                subclassCategoryNumber: subclassNum || 0,
                landCategoryNumber: 0,
                preparedSpells: allSpells.slice()
            });
            return;
        }

        if (cat === "choosePreparedSpell") {
            const pick = Math.max(0, parseInt(cfg.pickCount, 10) || 0);
            if (pick < 1) return;
            const addToBook = customClassStateUsesSpellbook(state) && cfg.addToSpellbook !== false;
            entry.chooseType = addToBook ? 0 : 3;
            entry.chooseNonSpecificSpell_a = pick;
            entry.chooseNonSpecificSpell_c = (cfg.listMode === "selection" && (cfg.spellListLabels || []).length)
                ? cfg.spellListLabels.slice()
                : 0;
            entry.chooseNonSpecificSpell_ss = (cfg.schoolMode === "selection" && (cfg.schoolLabels || []).length)
                ? cfg.schoolLabels.slice()
                : 0;
            if (cfg.levelMode === "selection" && (cfg.levelLabels || []).length) {
                entry.chooseNonSpecific_sl = cfg.levelLabels.slice();
            } else {
                entry.chooseNonSpecific_sl = getLfPreparedSpellLevelLabels().slice();
            }
            magicSkillsList.push(entry);
        }
        // subclassSpells: später pro Unterklasse als eine magicSkills-Zeile + n× subclassSpellsList
    };

    const pushSubclassSpellsFamily = (slots, subclassNum) => {
        const series = (slots || [])
            .filter(s =>
                isLfSlotEligibleForCompile(s)
                && s.payload?.featureType === "spellcraft"
                && s.payload?.category === "subclassSpells"
            )
            .slice()
            .sort((a, b) => (a.level - b.level) || (a.index - b.index));
        if (!series.length) return;

        const featureLabel = "magicProgressionLabel";
        const magicEntry = createEmptyCompiledMagicSkillEntry(nextMagicId(), slug, subclassNum);
        magicEntry.translationLabel = [featureLabel];
        magicEntry.getSpecificSpell = ["subclassSpellsList"];
        // Familie: ins Zauberbuch wenn Fokus gesetzt und kein Slot die Checkbox abwählt
        const addToBook = customClassStateUsesSpellbook(state)
            && series.every(s => s.payload?.optionsConfig?.addToSpellbook !== false);
        magicEntry.chooseType = addToBook ? 0 : 1;
        magicSkillsList.push(magicEntry);

        series.forEach(slot => {
            const allSpells = collectLfSubclassSpellsSelectedLabels(slot.payload?.optionsConfig);
            if (!allSpells.length) return;
            subclassSpellsList.push({
                ID: nextSubSpellId(),
                class: String(slug || "").toLowerCase(),
                classFeature: [featureLabel],
                level: Number(slot.level) || 1,
                subclassCategoryNumber: subclassNum || 0,
                landCategoryNumber: 0,
                preparedSpells: allSpells.slice()
            });
        });
    };

    const walk = (slots, subclassNum) => {
        (slots || []).filter(isLfSlotEligibleForCompile).forEach(slot => {
            const type = slot.payload?.featureType;
            const cat = slot.payload?.category;
            if (type === "simple" && cat === "spellcasting") {
                pushSpellcastingMagic(slot, subclassNum);
            } else if (type === "spellcraft" && cat !== "subclassSpells") {
                pushSpellcraftMagic(slot, subclassNum);
            }
        });
        if (subclassNum > 0) pushSubclassSpellsFamily(slots, subclassNum);
    };

    walk(state?.levelFeatures, 0);
    (state?.subclasses || []).forEach((sc, i) => {
        walk(sc.levelFeatures, sc.subclassCategoryNumber || (i + 1));
    });

    return { magicSkillsList, subclassSpellsList, subclassSpellAbilityList };
}

/**
 * Flache ClassData-Rows aus Tab-2- und Tab-3-Slots.
 * @returns {{ compiledClassData: Array, compiledSubclassList: Array, featureTranslations: {de:{}, en:{}} }}
 */
function compileCustomClassRuntimeData(state, slug) {
    const translationsBag = { de: {}, en: {} };
    let idCounter = 0;
    const nextId = () => {
        idCounter += 1;
        return idCounter;
    };

    const rows = [];
    const counters = createCompiledChoiceCounters();
    const compileMeta = createCompiledSlotLinkMeta(state);
    const baseSlots = (state.levelFeatures || [])
        .filter(isLfSlotEligibleForCompile)
        .slice()
        .sort((a, b) => (a.level - b.level) || (a.index - b.index));

    baseSlots.forEach(slot => {
        rows.push(compileSlotToClassDataRow(slot, {
            nextId,
            state,
            slug,
            translationsBag,
            subclassCategoryNumber: 0,
            counters,
            compileMeta
        }));
    });

    (state.subclasses || []).forEach((sc, i) => {
        const n = sc.subclassCategoryNumber || (i + 1);
        const scSlots = (sc.levelFeatures || [])
            .filter(isLfSlotEligibleForCompile)
            .slice()
            .sort((a, b) => (a.level - b.level) || (a.index - b.index));
        scSlots.forEach(slot => {
            rows.push(compileSlotToClassDataRow(slot, {
                nextId,
                state,
                slug,
                translationsBag,
                subclassCategoryNumber: n,
                counters,
                compileMeta
            }));
        });
    });

    // Übungsbonus-Zeile (PHB-Muster: Infobox, nicht Merkmalsliste)
    rows.unshift(buildCompiledProficiencyBonusRow(nextId()));

    // ÜB + Zauberprogression scope-korrekt (Base vs. eine Unterklasse)
    denormalizeCompiledClassResources(rows, state, nextId);

    // LEVEL_VAL-Parameter (rages, bardicDie, freie Parameter-IDs, …) carry-forward
    denormalizeCompiledFeatureParameters(rows, state);

    // Stabile Sortierung: Stufe → Basisklasse vor Subclass → ID
    // Übungsbonus bleibt erste Zeile auf Stufe 1
    rows.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        const aPb = a.translationLabel === "proficiencyBonusLabel" ? 0 : 1;
        const bPb = b.translationLabel === "proficiencyBonusLabel" ? 0 : 1;
        if (aPb !== bPb) return aPb - bPb;
        const aSub = a.subclassCategoryNumber || 0;
        const bSub = b.subclassCategoryNumber || 0;
        if (aSub !== bSub) return aSub - bSub;
        return a.ID - b.ID;
    });
    rows.forEach((row, i) => { row.ID = i + 1; });

    // Doppelte Merkmale (ASI, Expertise, …): Liste je Stufe, Infobox nur einmal
    applyCompiledDuplicateFeatureInfoBoxDedup(rows);

    const compiledSubclassList = compileCustomSubclassList(state, slug, translationsBag);
    const magicPack = compileCustomMagicSkillsData(state, slug, compileMeta, translationsBag);

    return {
        compiledClassData: rows,
        compiledSubclassList,
        compiledMagicSkillsList: magicPack.magicSkillsList,
        compiledSubclassSpellsList: magicPack.subclassSpellsList,
        compiledSubclassSpellAbilityList: magicPack.subclassSpellAbilityList,
        featureTranslations: translationsBag
    };
}

function countCompiledSkillChoices(classData) {
    // Stufe-1-Fertigkeitswahlen (Skill-Section: skill1…skillN)
    const parts = [];
    (classData || []).forEach(r => {
        if (Number(r.level) !== 1) return;
        if (r.choiceInStep3 !== 1) return;
        if (typeof r.constForChoice !== "string" || !r.constForChoice.includes("selectedSkill")) return;
        r.constForChoice.split(";").map(s => s.trim()).filter(Boolean).forEach(p => {
            if (/^selectedSkill\d+$/i.test(p)) parts.push(p);
        });
    });
    return parts.length ? parts.length : 2;
}

/** Übungsbonus-Zeile wie in PHB-Klassendaten (Infobox, nicht Merkmalsliste) */
function buildCompiledProficiencyBonusRow(id) {
    const row = createEmptyCompiledClassDataRow(1, id);
    row.translationLabel = "proficiencyBonusLabel";
    row.classFeatureShortDescription = "proficiencyBonusShortD";
    row.classFeatureDescription = 0;
    row.choiceInStep3 = 0;
    row.subclassCategoryNumber = 0;
    row.constForChoice = 0;
    row.classFeaturesStep2 = 0;
    row.infoBox = 1;
    row.classFeaturesCharacterSheet = 0;
    row.ProficiencyBonus = getCustomClassProficiencyBonus(1);
    return applyCompiledSentinels(row);
}

function isRegisteredCustomClassSlug(className) {
    if (!className || !registeredCustomClass.translationLabel) return false;
    return String(className).toLowerCase() === String(registeredCustomClass.translationLabel).toLowerCase();
}

/** Für getClassData / populateClassFormOptions */
function getRegisteredCustomClassBundle(className) {
    if (!isRegisteredCustomClassSlug(className)) return null;
    return {
        classData: registeredCustomClass.compiledClassData || [],
        subclassList: registeredCustomClass.compiledSubclassList || [],
        magicSkillsList: registeredCustomClass.compiledMagicSkillsList || [],
        subclassSpellsList: registeredCustomClass.compiledSubclassSpellsList || [],
        subclassSpellAbilityList: registeredCustomClass.compiledSubclassSpellAbilityList || [],
        skillCount: countCompiledSkillChoices(registeredCustomClass.compiledClassData)
    };
}

function createCustomClassChoiceIndexState() {
    return {
        expertise: 1,
        weaponMastery: 1,
        feat: 1,
        attribute: 1,
        maneuver: 1,
        language: 1,
        tool: 1,
        instrument: 1,
        game: 1,
        skill: 1,
        free: 1
    };
}

function isCompiledSkillChoiceRow(feature) {
    return typeof feature?.constForChoice === "string"
        && feature.constForChoice.includes("selectedSkill");
}

function isCompiledSystemChoiceSkipRow(feature) {
    const label = feature?.translationLabel;
    return label === "subclass" || label === "asiAndFeat" || label === "epicBoon";
}

/**
 * Dynamic-Content-Schlüssel für Schritt-6-Sections (max. 4).
 * Gleiche Kategorie / gleicher Auswahltyp → dieselbe Section.
 */
function getCompiledDynamicContentKey(feature) {
    if (!feature || feature.choiceInStep3 !== 1) return null;
    if (feature.subclassCategoryNumber > 0) return null;
    if (isCompiledSkillChoiceRow(feature) || isCompiledSystemChoiceSkipRow(feature)) return null;

    if (feature.fightingStyleID && feature.fightingStyleID !== 0) return "fightingStyle";
    const cfc = typeof feature.constForChoice === "string" ? feature.constForChoice : "";
    if (cfc.includes("selectedExpertise")) return "expertise";
    if (cfc.includes("selectedWeaponMastery")) return "weaponMastery";
    if (cfc.includes("selectedLanguage")) return "language";
    if (cfc.includes("selectedManeuver")) return "maneuver";
    if (cfc.includes("selectedTool")) return "tool";
    if (cfc.includes("selectedAttribute")) return "savingThrow";
    if (cfc.includes("selectedFreeChoice")) return "free";
    if (cfc === "attributeDistribution" || cfc.includes("attributeDistribution")) {
        return "attributeDistribution";
    }
    if (Array.isArray(feature.attributeID) && feature.attributeID.length) return "savingThrow";
    if (feature.maneuverCategoryNumber && feature.maneuverCategoryNumber !== 0) return "maneuver";
    if (feature.languageCategoryNumber && feature.languageCategoryNumber !== 0) return "language";
    if (feature.toolCategoryNumber && feature.toolCategoryNumber !== 0) return "tool";
    // Attributverteilung o.Ä. über Label
    if (feature.translationLabel && feature.translationLabel !== 0) {
        return `label:${feature.translationLabel}`;
    }
    return null;
}

/**
 * Bis zu 4 Dynamic-Content-Gruppen für die Basisklasse.
 * unlockLevel = erste Stufe mit Auswahl; features nach Stufe sortiert.
 */
function getCustomClassDynamicChoiceGroups(classData) {
    const map = new Map();
    (classData || []).forEach(f => {
        const key = getCompiledDynamicContentKey(f);
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, {
                key,
                unlockLevel: Number(f.level) || 1,
                features: [],
                sortId: Number(f.ID) || 0
            });
        }
        const g = map.get(key);
        g.features.push(f);
        g.unlockLevel = Math.min(g.unlockLevel, Number(f.level) || 1);
        g.sortId = Math.min(g.sortId, Number(f.ID) || 0);
    });

    return [...map.values()]
        .map(g => {
            g.features.sort((a, b) => (a.level - b.level) || (a.ID - b.ID));
            return g;
        })
        .sort((a, b) => (a.unlockLevel - b.unlockLevel) || (a.sortId - b.sortId))
        .slice(0, 4);
}

/** @deprecated – nutze getCustomClassDynamicChoiceGroups */
function getCustomClassBaseChoiceFeatures(classData, level) {
    const lvl = Number(level) || 1;
    return getCustomClassDynamicChoiceGroups(classData)
        .filter(g => g.unlockLevel <= lvl)
        .flatMap(g => g.features.filter(f => f.level <= lvl));
}

function appendCustomClassChoiceDropdown(container, {
    selectId,
    selectName,
    labelText,
    optionsHtml
}) {
    const elements = translations[currentLang];
    const lab = document.createElement("label");
    lab.setAttribute("for", selectId);
    // labelText ist die fertige Beschriftung inkl. Stufe und Doppelpunkt
    lab.innerText = labelText;
    container.appendChild(lab);

    const sel = document.createElement("select");
    sel.id = selectId;
    sel.name = selectName || selectId;
    sel.className = "dropdown";
    sel.innerHTML = `<option value="">${elements.pleaseSelectLabel || ""}</option>${optionsHtml || ""}`;
    container.appendChild(sel);
    return sel;
}

/** Schritt-6-Dropdown-Label: „Wähle … (Stufe X):“ */
function formatCcStep6DropdownLabel(chooseLabelKey, level) {
    const elements = translations[currentLang] || {};
    const choose = elements[chooseLabelKey] || chooseLabelKey;
    const lvlWord = elements.levelLabel2 || elements.levelLabel || "Stufe";
    return `${choose} (${lvlWord} ${Number(level) || 1}):`;
}

/** Zusätzliche Fertigkeiten: „Zusätzliche Fertigkeiten - Wähle eine Fertigkeit (Stufe X):“ */
function formatCcAdditionalSkillDropdownLabel(level) {
    const elements = translations[currentLang] || {};
    const prefix = elements.additionalSkillsLabel || "";
    const choose = elements.chooseSkillLabel || "";
    const lvlWord = elements.levelLabel2 || elements.levelLabel || "Stufe";
    return `${prefix} - ${choose} (${lvlWord} ${Number(level) || 1}):`;
}

/**
 * choose*-Key, Options-HTML und Select-Präfix für Werkzeug-Oberfläche.
 * Präfix muss zu saveClassForm passen (tool* / instrument* / game*),
 * sonst landen Instrument-IDs fälschlich in classForm.tools.
 */
function resolveCcToolDropdownParts(feature) {
    const nums = normalizeToArray(feature?.toolCategoryNumber).map(n => parseInt(n, 10));
    const first = nums[0];
    const mode = feature?.toolPoolMode
        || (Array.isArray(feature?.toolAllowedLabels) && feature.toolAllowedLabels.length ? "selection" : "all");
    const allowed = (mode === "selection" && Array.isArray(feature?.toolAllowedLabels))
        ? feature.toolAllowedLabels
        : null;

    if (first === 2 || feature?.translationLabel === "musicalInstrumentLabel") {
        return {
            chooseKey: "chooseInsrumentLabel",
            selectPrefix: "instrument",
            optionsHtml: createCcFilteredInstrumentOptionsHtml(allowed)
        };
    }
    if (first === 3 || feature?.translationLabel === "gamingSetLabel") {
        return {
            chooseKey: "chooseGameLabel",
            selectPrefix: "game",
            optionsHtml: createCcFilteredGameOptionsHtml(allowed)
        };
    }
    // Handwerkzeuge (Default / Cat 1+3 wie Options-Maske)
    const artisanCats = (nums.includes(1) || nums.includes(3) || !nums.length) ? [1, 3] : nums;
    return {
        chooseKey: "chooseArtisanToolLabel",
        selectPrefix: "tool",
        optionsHtml: createCcFilteredArtisanToolOptionsHtml(artisanCats, allowed)
    };
}

/** Instrument-Optionen, optional auf erlaubte Labels gefiltert */
function createCcFilteredInstrumentOptionsHtml(allowedLabels) {
    if (typeof createInstrumentOptions !== "function") return "";
    if (!allowedLabels || !allowedLabels.length) return createInstrumentOptions();
    const elements = translations[currentLang] || {};
    const list = (typeof instrumentList !== "undefined" ? instrumentList : [])
        .filter(i => allowedLabels.includes(i.translationLabel));
    return list.map(instrument => {
        const name = elements[instrument.translationLabel] || instrument.translationLabel;
        return `<option value="${instrument.instrumentCategoryNumber}">${escapeLfHtml(name)}</option>`;
    }).join("");
}

/** Spiel-Optionen, optional gefiltert */
function createCcFilteredGameOptionsHtml(allowedLabels) {
    if (typeof createGameOptions !== "function") return "";
    if (!allowedLabels || !allowedLabels.length) return createGameOptions();
    const elements = translations[currentLang] || {};
    const list = (typeof gameList !== "undefined" ? gameList : [])
        .filter(g => allowedLabels.includes(g.translationLabel));
    return list.map(game => {
        const name = elements[game.translationLabel] || game.translationLabel;
        return `<option value="${game.gameCategoryNumber}">${escapeLfHtml(name)}</option>`;
    }).join("");
}

/** Handwerkszeug-Optionen, optional gefiltert */
function createCcFilteredArtisanToolOptionsHtml(categoryNumbers, allowedLabels) {
    if (typeof createToolOptions !== "function") return "";
    if (!allowedLabels || !allowedLabels.length) {
        return createToolOptions(categoryNumbers);
    }
    const elements = translations[currentLang] || {};
    const cats = Array.isArray(categoryNumbers) ? categoryNumbers : [1];
    const list = (typeof toolList !== "undefined" ? toolList : [])
        .filter(t => cats.includes(t.toolCategoryNumber) && allowedLabels.includes(t.translationLabel));
    return list.map(tool => {
        const name = elements[tool.translationLabel] || tool.translationLabel;
        return `<option value="${tool.ID}">${escapeLfHtml(name)}</option>`;
    }).join("");
}

/**
 * Einfach→Fertigkeiten: skillCategoryNumbers ab Merkmalsstufe
 * (inkl. Unterklasse nur bei passender Auswahl).
 */
function getGrantedCustomClassSkillCategoryNumbers() {
    if (typeof isRegisteredCustomClassSlug !== "function"
        || !isRegisteredCustomClassSlug(character?.class)) {
        return [];
    }
    const classData = typeof getClassData === "function"
        ? (getClassData(String(character.class).toLowerCase(), "class") || [])
        : [];
    const level = Number(character.level) || 1;

    const selectedSubclassEl = document.querySelector('input[name="subclass"]:checked');
    let selectedSubclassNumber = selectedSubclassEl
        ? (parseInt(selectedSubclassEl.value, 10) || 0)
        : 0;
    if (!selectedSubclassNumber && character.classForm?.subclass) {
        selectedSubclassNumber = parseInt(character.classForm.subclass, 10) || 0;
    }

    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        const granted = f.grantedSkillCategoryNumbers;
        if (!Array.isArray(granted) || !granted.length) return;
        granted.forEach(n => {
            const id = parseInt(n, 10);
            if (!Number.isFinite(id)) return;
            const idStr = String(id);
            if (!nums.includes(idStr)) nums.push(idStr);
        });
    });
    return nums;
}

/** Fügt gewährte Custom-Class-Fertigkeiten in ein Skill-ID-Array ein */
function appendGrantedCustomClassSkillIds(skillIds) {
    if (!Array.isArray(skillIds)) return skillIds;
    getGrantedCustomClassSkillCategoryNumbers().forEach(id => {
        if (!skillIds.includes(id)) skillIds.push(id);
    });
    return skillIds;
}

/** Gewährte Rettungswurf-Attribute (Labels) aus Custom-Class-Merkmalen */
function getGrantedCustomClassSavingThrowLabels() {
    if (typeof isRegisteredCustomClassSlug !== "function"
        || !isRegisteredCustomClassSlug(character?.class)) {
        return [];
    }
    const classData = typeof getClassData === "function"
        ? (getClassData(String(character.class).toLowerCase(), "class") || [])
        : [];
    const level = Number(character.level) || 1;

    const selectedSubclassEl = document.querySelector('input[name="subclass"]:checked');
    let selectedSubclassNumber = selectedSubclassEl
        ? (parseInt(selectedSubclassEl.value, 10) || 0)
        : 0;
    if (!selectedSubclassNumber && character.classForm?.subclass) {
        selectedSubclassNumber = parseInt(character.classForm.subclass, 10) || 0;
    }

    const labels = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        const granted = f.grantedSavingThrowLabels;
        if (!Array.isArray(granted) || !granted.length) return;
        granted.forEach(lab => {
            if (lab && !labels.includes(lab)) labels.push(lab);
        });
    });
    return labels;
}

/** Fügt gewährte Custom-Class-Rettungswürfe als Attribut-IDs in classForm.attributes ein */
function appendGrantedCustomClassSavingThrowIds(attributeIds) {
    if (!Array.isArray(attributeIds)) return attributeIds;
    const attrs = typeof attributeList !== "undefined" ? attributeList : [];
    getGrantedCustomClassSavingThrowLabels().forEach(lab => {
        const attr = attrs.find(a => a.translationLabel === lab);
        if (!attr) return;
        const idStr = String(attr.ID);
        if (!attributeIds.includes(idStr) && !attributeIds.includes(attr.ID)) {
            attributeIds.push(idStr);
        }
    });
    return attributeIds;
}

/**
 * Gewährte Waffenkategorie-Nummern aus Custom-Class-Merkmalen (Einfach→Waffenvertrautheit).
 */
function getGrantedCustomClassWeaponCategoryNumbers() {
    if (typeof isRegisteredCustomClassSlug !== "function"
        || !isRegisteredCustomClassSlug(character?.class)) {
        return [];
    }
    const classData = typeof getClassData === "function"
        ? (getClassData(String(character.class).toLowerCase(), "class") || [])
        : [];
    const level = Number(character.level) || 1;
    const selectedSubclassEl = document.querySelector('input[name="subclass"]:checked');
    let selectedSubclassNumber = selectedSubclassEl
        ? (parseInt(selectedSubclassEl.value, 10) || 0)
        : 0;
    if (!selectedSubclassNumber && character.classForm?.subclass) {
        selectedSubclassNumber = parseInt(character.classForm.subclass, 10) || 0;
    }
    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        if (f.translationLabel !== "weaponTrainingLabel") return;
        const granted = f.Get_weaponCategoryNumber;
        if (!granted || granted === 0) return;
        normalizeToArray(granted).forEach(n => {
            const id = parseInt(n, 10);
            if (Number.isFinite(id) && id > 0 && !nums.includes(id)) nums.push(id);
        });
    });
    return nums;
}

/**
 * Gewährte Waffeneigenschaft-Nummern aus Custom-Class-Merkmalen.
 */
function getGrantedCustomClassWeaponPropertyCategoryNumbers() {
    if (typeof isRegisteredCustomClassSlug !== "function"
        || !isRegisteredCustomClassSlug(character?.class)) {
        return [];
    }
    const classData = typeof getClassData === "function"
        ? (getClassData(String(character.class).toLowerCase(), "class") || [])
        : [];
    const level = Number(character.level) || 1;
    const selectedSubclassEl = document.querySelector('input[name="subclass"]:checked');
    let selectedSubclassNumber = selectedSubclassEl
        ? (parseInt(selectedSubclassEl.value, 10) || 0)
        : 0;
    if (!selectedSubclassNumber && character.classForm?.subclass) {
        selectedSubclassNumber = parseInt(character.classForm.subclass, 10) || 0;
    }
    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        const granted = f.grantedWeaponPropertyCategoryNumbers;
        if (!granted || granted === 0) return;
        normalizeToArray(granted).forEach(n => {
            const id = parseInt(n, 10);
            if (Number.isFinite(id) && id > 0 && !nums.includes(id)) nums.push(id);
        });
    });
    return nums;
}

/**
 * Gewährte Rüstungskategorie-Nummern aus Custom-Class-Merkmalen.
 */
function getGrantedCustomClassArmorCategoryNumbers() {
    if (typeof isRegisteredCustomClassSlug !== "function"
        || !isRegisteredCustomClassSlug(character?.class)) {
        return [];
    }
    const classData = typeof getClassData === "function"
        ? (getClassData(String(character.class).toLowerCase(), "class") || [])
        : [];
    const level = Number(character.level) || 1;
    const selectedSubclassEl = document.querySelector('input[name="subclass"]:checked');
    let selectedSubclassNumber = selectedSubclassEl
        ? (parseInt(selectedSubclassEl.value, 10) || 0)
        : 0;
    if (!selectedSubclassNumber && character.classForm?.subclass) {
        selectedSubclassNumber = parseInt(character.classForm.subclass, 10) || 0;
    }
    const nums = [];
    classData.forEach(f => {
        if (!f || (Number(f.level) || 1) > level) return;
        const sc = f.subclassCategoryNumber || 0;
        if (sc > 0 && sc !== selectedSubclassNumber) return;
        if (f.translationLabel !== "armorTrainingLabel") return;
        const granted = f.Get_armorCategoryNumber;
        if (!granted || granted === 0) return;
        normalizeToArray(granted).forEach(n => {
            const id = parseInt(n, 10);
            if (Number.isFinite(id) && id > 0 && !nums.includes(id)) nums.push(id);
        });
    });
    return nums;
}

function createCustomFightingStyleOptionsHtml(fightingStyleIDs) {
    const ids = Array.isArray(fightingStyleIDs) ? fightingStyleIDs : [];
    const elements = translations[currentLang];
    const feats = typeof featList !== "undefined" ? featList : [];
    return feats
        .filter(f => ids.includes(f.ID))
        .map(f => {
            const name = elements[f.translationLabel] || f.translationLabel;
            return `<option value="${f.ID}">${name}</option>`;
        })
        .join("");
}

/** Optionen→Frei: kompiliierte Wahltexte für Schritt-6-Dropdowns */
function createCustomFreeChoiceOptionsHtml(feature) {
    const options = Array.isArray(feature?.freeChoiceOptions) ? feature.freeChoiceOptions : [];
    if (!options.length) return "";
    const elements = translations[currentLang] || {};
    return options.map(opt => {
        const value = escapeLfAttr(opt.value != null ? String(opt.value) : "");
        const label = elements[opt.translationLabel] || opt.translationLabel || value;
        return `<option value="${value}">${escapeLfHtml(label)}</option>`;
    }).join("");
}

/**
 * Generische Schritt-6-Auswahlen für Custom Classes (eine Dynamic-Section oder Unterklasse).
 * features: nur Rows, deren Stufe bereits freigeschaltet ist.
 * @param {object} [renderOptions]
 * @param {boolean} [renderOptions.includeSkills] – Fertigkeits-Dropdowns (für Unterklassen)
 * @param {"base"|"subclass"} [renderOptions.context]
 */
function renderCustomClassChoiceFeatures(container, features, indexState, renderOptions) {
    if (!container || !Array.isArray(features) || !features.length) return;
    const elements = translations[currentLang];
    const idx = indexState || createCustomClassChoiceIndexState();
    const opts = renderOptions || {};
    const includeSkills = !!opts.includeSkills;

    const core = (typeof classCoreTraitsList !== "undefined" ? classCoreTraitsList : [])
        .find(c => String(c.translationLabel || "").toLowerCase()
            === String(character.class || "").toLowerCase());
    const weaponCats = normalizeToArray(core?.weaponCategoryNumber).map(n => parseInt(n, 10)).filter(Number.isFinite);
    const weaponProps = normalizeToArray(core?.weaponPropertyCategoryNumber).map(n => parseInt(n, 10)).filter(Number.isFinite);
    const wCats = weaponCats.length ? weaponCats : [1, 2, 3, 4];
    const wProps = weaponProps.length ? weaponProps : [1, 2, 3, 4, 5, 6, 7, 8, 9];

    let renderedExpertise = false;

    features.forEach(feature => {
        if (!feature || feature.choiceInStep3 !== 1) return;
        if (isCompiledSystemChoiceSkipRow(feature)) return;

        // Fertigkeiten: Basisklasse → skillSection; Unterklasse → hier (wie PHB bonusProficiencies)
        if (isCompiledSkillChoiceRow(feature)) {
            if (!includeSkills) return;
            renderCustomClassSkillChoiceDropdowns(container, feature, idx);
            return;
        }

        const amount = Math.max(1, countConstForChoiceParts(feature.constForChoice) || 1);
        const featLevel = feature.level || 1;

        // Kampfstil
        if (feature.fightingStyleID && feature.fightingStyleID !== 0) {
            const opts = createCustomFightingStyleOptionsHtml(feature.fightingStyleID);
            const labelText = formatCcStep6DropdownLabel("chooseFightingStyleLabel", featLevel);
            for (let i = 0; i < amount; i++) {
                const n = idx.feat++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `feat${n}`,
                    selectName: `feats${featLevel}`,
                    labelText,
                    optionsHtml: opts
                });
            }
            return;
        }

        // Expertise
        if (typeof feature.constForChoice === "string"
            && feature.constForChoice.includes("selectedExpertise")) {
            const labelText = formatCcStep6DropdownLabel("chooseExpertiseLabel", featLevel);
            for (let i = 0; i < amount; i++) {
                const n = idx.expertise++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `expertise${n}`,
                    selectName: `expertise${n}`,
                    labelText,
                    optionsHtml: ""
                });
            }
            renderedExpertise = true;
            return;
        }

        // Waffenmeisterschaft
        if (typeof feature.constForChoice === "string"
            && feature.constForChoice.includes("selectedWeaponMastery")) {
            const opts = typeof createWeaponOptions === "function"
                ? createWeaponOptions(wCats, wProps)
                : "";
            const labelText = formatCcStep6DropdownLabel("chooseWTLabel", featLevel);
            for (let i = 0; i < amount; i++) {
                const n = idx.weaponMastery++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `weaponMastery${n}`,
                    selectName: `weaponMastery${n}`,
                    labelText,
                    optionsHtml: opts
                });
            }
            return;
        }

        // Rettungswürfe
        if ((Array.isArray(feature.attributeID) && feature.attributeID.length)
            || (typeof feature.constForChoice === "string"
                && feature.constForChoice.includes("selectedAttribute"))) {
            const opts = typeof createSavingThrowOptions === "function"
                ? createSavingThrowOptions(feature.attributeID || [])
                : "";
            const labelText = formatCcStep6DropdownLabel("chooseSavingThrowLabel", featLevel);
            for (let i = 0; i < amount; i++) {
                const n = idx.attribute++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `attribute${n}`,
                    selectName: `attribute${n}`,
                    labelText,
                    optionsHtml: opts
                });
            }
            return;
        }

        // Manöver
        if ((feature.maneuverCategoryNumber && feature.maneuverCategoryNumber !== 0)
            || (typeof feature.constForChoice === "string"
                && feature.constForChoice.includes("selectedManeuver"))) {
            const opts = typeof createManeuverOptions === "function"
                ? createManeuverOptions(feature.maneuverCategoryNumber || [])
                : "";
            const labelText = formatCcStep6DropdownLabel("chooseManeuverLabel", featLevel);
            for (let i = 0; i < amount; i++) {
                const n = idx.maneuver++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `maneuver${n}`,
                    selectName: `maneuver${n}`,
                    labelText,
                    optionsHtml: opts
                });
            }
            return;
        }

        // Sprachen
        if ((feature.languageCategoryNumber && feature.languageCategoryNumber !== 0)
            || (typeof feature.constForChoice === "string"
                && feature.constForChoice.includes("selectedLanguage"))) {
            const opts = typeof createLangOptions === "function"
                ? createLangOptions(feature.languageCategoryNumber)
                : "";
            const labelText = formatCcStep6DropdownLabel("chooseLanguageLabel", featLevel);
            for (let i = 0; i < amount; i++) {
                const n = idx.language++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `language${n}`,
                    selectName: `language${n}`,
                    labelText,
                    optionsHtml: opts
                });
            }
            return;
        }

        // Werkzeuge / Instrumente / Spiele
        // Wichtig: id-Präfix steuert saveClassForm → classForm.tools | .instruments | .games
        if ((feature.toolCategoryNumber && feature.toolCategoryNumber !== 0)
            || (typeof feature.constForChoice === "string"
                && feature.constForChoice.includes("selectedTool"))) {
            const parts = resolveCcToolDropdownParts(feature);
            const prefix = parts.selectPrefix || "tool";
            const labelText = formatCcStep6DropdownLabel(parts.chooseKey, featLevel);
            for (let i = 0; i < amount; i++) {
                const n = (prefix === "instrument")
                    ? idx.instrument++
                    : (prefix === "game")
                        ? idx.game++
                        : idx.tool++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `${prefix}${n}`,
                    selectName: `${prefix}${n}`,
                    labelText,
                    optionsHtml: parts.optionsHtml
                });
            }
            return;
        }

        // Freie Optionen / Attributverteilung / Fallback
        if (typeof feature.constForChoice === "string"
            && feature.constForChoice.includes("attributeDistribution")) {
            // Nur Basisklasse; Unterklassen kompiliert ohne Verteilung
            if (opts.context === "subclass") return;
            renderCustomClassAttributeDistributionUI(container, feature);
            return;
        }

        const fallbackLabel = (feature.translationLabel && feature.translationLabel !== 0)
            ? (elements[feature.translationLabel] || feature.translationLabel)
            : (elements.chooseOptionLabel || "Option");
        const fallbackText = `${fallbackLabel} (${elements.levelLabel2 || "Stufe"} ${featLevel}):`;
        if (typeof feature.constForChoice === "string"
            && feature.constForChoice.includes("selectedFreeChoice")) {
            const freeOpts = createCustomFreeChoiceOptionsHtml(feature);
            for (let i = 0; i < amount; i++) {
                const n = idx.free++;
                appendCustomClassChoiceDropdown(container, {
                    selectId: `freeChoice${n}`,
                    selectName: `freeChoice${n}`,
                    labelText: fallbackText,
                    optionsHtml: freeOpts
                });
            }
        }
    });

    if (renderedExpertise && typeof populateExpertiseOptions === "function") {
        populateExpertiseOptions();
    }
}

/**
 * Fertigkeits-Dropdowns aus kompiliertem selectedSkillN (Unterklasse / Sonderfälle).
 * Nutzt die kompilierten Indizes, damit saveClassForm → classForm.skills stimmt.
 */
function renderCustomClassSkillChoiceDropdowns(container, feature, indexState) {
    if (!container || !feature) return;
    const elements = translations[currentLang] || {};
    const idx = indexState || createCustomClassChoiceIndexState();
    const featLevel = feature.level || 1;
    const pool = Array.isArray(feature.skillCategoryNumber) ? feature.skillCategoryNumber : [];
    const optionsHtml = (typeof createSkillOptions === "function" && pool.length)
        ? createSkillOptions(pool)
        : (typeof createSkillOptions === "function" ? createSkillOptions([]) : "");
    const labelText = formatCcStep6DropdownLabel("chooseSkillLabel", featLevel);

    const parts = String(feature.constForChoice || "")
        .split(";")
        .map(s => s.trim())
        .filter(Boolean);
    const skillIndexes = [];
    parts.forEach(part => {
        const m = part.match(/^selectedSkill(\d+)$/i);
        if (m) skillIndexes.push(parseInt(m[1], 10));
    });
    if (!skillIndexes.length) {
        skillIndexes.push(idx.skill++);
    }

    skillIndexes.forEach(n => {
        if (!Number.isFinite(n) || n <= 0) return;
        if (document.getElementById(`skill${n}`)) return;
        appendCustomClassChoiceDropdown(container, {
            selectId: `skill${n}`,
            selectName: `skill${n}`,
            labelText,
            optionsHtml
        });
        const sel = document.getElementById(`skill${n}`);
        if (sel) sel.setAttribute("onchange", "updateSkills()");
        idx.skill = Math.max(idx.skill, n + 1);
    });
}

/**
 * Schritt-6-Auswahlen einer Unterklasse in #dynamicSubclassContent.
 * Gemeinsamer Einstieg für Custom-Class-Tab3 und späteren Standalone-Subclass-Builder.
 *
 * @param {HTMLElement} container
 * @param {Array} subclassFeatures – ClassData-Rows mit choiceInStep3 und subclassCategoryNumber
 * @param {object} [options]
 * @param {number} [options.level] – nur Merkmale bis zu dieser Stufe
 * @param {object} [options.indexState] – gemeinsame ID-Zähler (optional)
 */
function populateCustomClassSubclassChoiceSection(container, subclassFeatures, options) {
    if (!container) return false;
    const opts = options || {};
    const lvl = opts.level != null ? Number(opts.level) : null;

    const features = (subclassFeatures || []).filter(f => {
        if (!f || f.choiceInStep3 !== 1) return false;
        if (lvl != null && (Number(f.level) || 1) > lvl) return false;
        return true;
    });

    container.innerHTML = "";
    if (!features.length) {
        container.style.display = "none";
        return false;
    }

    container.style.display = "block";
    const idx = opts.indexState || createCustomClassChoiceIndexState();
    renderCustomClassChoiceFeatures(container, features, idx, {
        includeSkills: true,
        context: "subclass"
    });
    return true;
}

/**
 * Attribut → Verteilung: ASI-ähnliche Punkte-UI (Design wie Attributswerterhöhung).
 */
function renderCustomClassAttributeDistributionUI(container, feature) {
    if (!container || !feature) return;
    const elements = translations[currentLang] || {};
    const cfg = feature.attributeDistributionConfig || {};
    const points = Math.max(1, parseInt(cfg.points, 10) || 1);
    const mode = cfg.distributionMode || "free";
    let maxPer = points;
    if (mode === "maxPerAbility") {
        maxPer = Math.max(1, Math.min(points, parseInt(cfg.maxPerAbility, 10) || 1));
    } else if (mode === "allOnOne") {
        maxPer = points;
    }
    const allowed = Array.isArray(cfg.allowedAbilities) && cfg.allowedAbilities.length
        ? cfg.allowedAbilities
        : getLfAbilityAttributeLabels();

    const featLevel = feature.level || 1;
    const uid = `ccAttrDist_L${featLevel}_${feature.ID || 0}`;

    const wrap = document.createElement("div");
    wrap.className = "cc-attr-dist-block";
    // Section-Titel kommt bereits aus populateCustomClassBaseChoiceSection (h3)
    let html = `
        <div class="asi-container cc-attr-dist-container" data-cc-attr-dist-id="${escapeLfAttr(uid)}"
            data-points="${points}" data-mode="${escapeLfAttr(mode)}" data-max-per="${maxPer}">
            <div class="asi-header">
                <strong>${escapeLfHtml(elements.distributePointsLabel || "Punkte verteilen")}:</strong>
                <span class="points-tracker">
                    ${escapeLfHtml(elements.remainingPointsLabel || "Verbleibend")}:
                    <span class="asi-points-remaining">${points}</span>
                </span>
            </div>`;

    allowed.forEach(attrLabel => {
        const stringId = String(attrLabel).replace(/Label$/i, "");
        const name = elements[attrLabel] || attrLabel;
        html += `
            <div class="asi-row">
                <label>${escapeLfHtml(name)}</label>
                <input type="number" class="asi-point-input cc-attr-dist-input"
                    data-attribute="${escapeLfAttr(stringId)}"
                    min="0" max="${maxPer}" value="0"
                    oninput="updateCcAttributeDistributionPoints(event)">
            </div>`;
    });
    html += `</div>`;
    wrap.innerHTML = html;
    container.appendChild(wrap);
}

/** Live-Punkteverteilung für Custom-Class Attribut→Verteilung */
function updateCcAttributeDistributionPoints(event) {
    const changedInput = event?.target;
    if (!changedInput) return;
    const box = changedInput.closest(".cc-attr-dist-container");
    if (!box) return;

    const totalAllowed = parseInt(box.dataset.points, 10) || 0;
    const mode = box.dataset.mode || "free";
    const maxPer = parseInt(box.dataset.maxPer, 10) || totalAllowed;
    const inputs = Array.from(box.querySelectorAll(".cc-attr-dist-input"));
    const remainingEl = box.querySelector(".asi-points-remaining");

    let value = parseInt(changedInput.value, 10) || 0;
    if (value < 0) value = 0;
    if (value > maxPer) value = maxPer;
    changedInput.value = String(value);

    // Alles auf ein Attribut: andere auf 0
    if (mode === "allOnOne" && value > 0) {
        inputs.forEach(inp => {
            if (inp !== changedInput) inp.value = "0";
        });
    }

    let totalPoints = inputs.reduce((s, inp) => s + (parseInt(inp.value, 10) || 0), 0);
    if (totalPoints > totalAllowed) {
        const overage = totalPoints - totalAllowed;
        changedInput.value = String(Math.max(0, (parseInt(changedInput.value, 10) || 0) - overage));
        totalPoints = totalAllowed;
    }

    if (remainingEl) remainingEl.textContent = String(Math.max(0, totalAllowed - totalPoints));

    if (typeof character !== "undefined") {
        if (!character.customAttributeDistributions) character.customAttributeDistributions = {};
        const key = box.dataset.ccAttrDistId || "default";
        character.customAttributeDistributions[key] = {};
        inputs.forEach(inp => {
            const v = parseInt(inp.value, 10) || 0;
            if (v > 0) character.customAttributeDistributions[key][inp.dataset.attribute] = v;
        });
    }

    if (typeof updateLiveAttributes === "function") updateLiveAttributes();
}

/** Boni aus Custom-Class Attribut→Verteilung (Schritt 6) */
function calculateCustomAttributeDistributionBonuses() {
    const bonuses = { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 };
    document.querySelectorAll(".cc-attr-dist-container .cc-attr-dist-input").forEach(input => {
        const value = parseInt(input.value, 10) || 0;
        const key = input.dataset.attribute;
        if (value > 0 && Object.prototype.hasOwnProperty.call(bonuses, key)) {
            bonuses[key] += value;
        }
    });
    return bonuses;
}

/**
 * Befüllt dynamicClassSection1–4: je ein Auswahl-Merkmal (Gruppe),
 * sichtbar ab unlockLevel; spätere Stufen ergänzen Dropdowns in derselben Section.
 */
function populateCustomClassBaseChoiceSection(classData, level) {
    const lvl = Number(level) || 1;
    const groups = getCustomClassDynamicChoiceGroups(classData);
    const idx = createCustomClassChoiceIndexState();

    for (let i = 0; i < 4; i++) {
        const section = document.getElementById(`dynamicClassSection${i + 1}`);
        if (!section) continue;
        section.innerHTML = "";
        const group = groups[i];
        if (!group) {
            section.style.display = "none";
            continue;
        }
        const unlocked = lvl >= group.unlockLevel;
        section.style.display = unlocked ? "block" : "none";
        if (!unlocked) continue;

        const title = document.createElement("h3");
        const first = group.features[0];
        const elements = translations[currentLang];
        title.textContent = (first?.translationLabel && first.translationLabel !== 0)
            ? (elements[first.translationLabel] || first.translationLabel)
            : (elements.chooseOptionLabel || "Option");
        section.appendChild(title);

        const visibleFeatures = group.features.filter(f => f.level <= lvl);
        renderCustomClassChoiceFeatures(section, visibleFeatures, idx);
    }
    return groups.length > 0;
}

/**
 * Options→Fertigkeiten jenseits der Stufe-1-Skill-Dropdowns (skill1…N):
 * weitere selectedSkillK in der Fertigkeiten-Section mit Stufen-Label.
 */
function populateCustomClassSkillSectionExtras(classData, level) {
    document.querySelectorAll(".cc-custom-extra-skill").forEach(el => el.remove());

    const section = document.getElementById("skillSection");
    if (!section || typeof createSkillOptions !== "function") return;

    const elements = translations[currentLang] || {};
    const lvl = Number(level) || 1;
    const level1Count = countCompiledSkillChoices(classData);

    const entries = [];
    (classData || []).forEach(row => {
        if (!isCompiledSkillChoiceRow(row)) return;
        if ((row.subclassCategoryNumber || 0) > 0) return;
        const rowLevel = Number(row.level) || 1;
        if (rowLevel > lvl) return;
        const parts = String(row.constForChoice).split(";").map(s => s.trim()).filter(Boolean);
        parts.forEach(part => {
            const m = part.match(/^selectedSkill(\d+)$/i);
            if (!m) return;
            const skillIndex = parseInt(m[1], 10);
            if (!Number.isFinite(skillIndex) || skillIndex <= 0) return;
            // Stufe 1: skill1…skillCount bereits von populateClassFormOptions erzeugt
            if (rowLevel === 1 && skillIndex <= level1Count) return;
            entries.push({
                skillIndex,
                rowLevel,
                pool: Array.isArray(row.skillCategoryNumber) ? row.skillCategoryNumber : []
            });
        });
    });

    entries.sort((a, b) => (a.rowLevel - b.rowLevel) || (a.skillIndex - b.skillIndex));
    const seen = new Set();
    entries.forEach(entry => {
        const id = `skill${entry.skillIndex}`;
        if (seen.has(id) || document.getElementById(id)) return;
        seen.add(id);

        const label = document.createElement("label");
        label.id = `${id}Label`;
        label.className = "cc-custom-extra-skill";
        label.setAttribute("for", id);
        label.innerText = formatCcAdditionalSkillDropdownLabel(entry.rowLevel);
        section.appendChild(label);

        const select = document.createElement("select");
        select.id = id;
        select.name = id;
        select.className = "dropdown cc-custom-extra-skill";
        const pool = entry.pool.length ? entry.pool : [];
        select.innerHTML = `<option value="">${elements.pleaseSelectLabel || ""}</option>`
            + (pool.length ? createSkillOptions(pool) : "");
        select.setAttribute("onchange", "updateSkills()");
        section.appendChild(select);
    });

    if (typeof updateSkills === "function") updateSkills();
}

/** Sichtbarkeit + Inhalt der 4 Sections anhand unlockLevel / aktueller Stufe */
function applyCustomClassDynamicSectionVisibility(level) {
    const classData = typeof getClassData === "function"
        ? (getClassData(String(character.class || "").toLowerCase(), "class") || [])
        : (registeredCustomClass.compiledClassData || []);
    populateCustomClassBaseChoiceSection(classData, level);
    populateCustomClassSkillSectionExtras(classData, level);
}

function buildExportPayload(state, slug, id) {
    const nameDe = state.names.de || state.names.en || "Undefined";
    const nameEn = state.names.en || state.names.de || "Undefined";
    const descDe = state.descriptions.de || state.descriptions.en || "";
    const descEn = state.descriptions.en || state.descriptions.de || "";

    const labelKey = `${slug}Label`;
    const descKey = `${slug}DLabel`;
    const textKey = `${slug}Text`;

    const compiled = compileCustomClassRuntimeData(state, slug);

    const flatPayload = {
        version: 1,
        type: "customClass",
        coreTraits: buildCoreTraitsFromState(state, slug, id),
        translations: {
            de: {
                [slug]: nameDe,
                [labelKey]: nameDe,
                [descKey]: descDe,
                [textKey]: descDe,
                ...(compiled.featureTranslations.de || {})
            },
            en: {
                [slug]: nameEn,
                [labelKey]: nameEn,
                [descKey]: descEn,
                [textKey]: descEn,
                ...(compiled.featureTranslations.en || {})
            }
        },
        // Editor-State (Re-Import / Weiterbearbeitung)
        levelFeatures: state.levelFeatures || [],
        subclasses: state.subclasses || [],
        availableLanguages: ensureAvailableLanguages(state).slice(),
        parameterRegistry: ensureParameterRegistry(state).map(p => ({
            id: p.id,
            names: { de: p.names?.de || "", en: p.names?.en || "" },
            useValue: normalizeLfParameterValueMode(p).useValue,
            useDie: normalizeLfParameterValueMode(p).useDie
        })),
        spellcastingProgression: cloneSpellcastingProgression(state.spellcastingProgression),
        // Laufzeit-Arrays (Charaktererstellung / später Charakterbogen)
        compiledClassData: compiled.compiledClassData,
        compiledSubclassList: compiled.compiledSubclassList,
        compiledMagicSkillsList: compiled.compiledMagicSkillsList || [],
        compiledSubclassSpellsList: compiled.compiledSubclassSpellsList || [],
        compiledSubclassSpellAbilityList: compiled.compiledSubclassSpellAbilityList || []
    };

    // DC-Envelope (Phase A); packageId stabil im Editor-State halten
    if (typeof wrapCustomClassExport === "function") {
        if (!state.packageId) {
            state.packageId = typeof createDcPackageId === "function"
                ? createDcPackageId()
                : null;
        }
        if (!state.packageCreatedAt) {
            state.packageCreatedAt = new Date().toISOString();
        }
        const wrapped = wrapCustomClassExport(state, flatPayload);
        state.verificationCode = wrapped.dc?.verificationCode || null;
        state.packageId = wrapped.dc?.packageId || state.packageId;
        return wrapped;
    }
    return flatPayload;
}

function formatCustomClassDate(date) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const d = date.getDate();
    const mon = months[date.getMonth()];
    const year = date.getFullYear();
    return `${d}${mon}${year}`;
}

function buildCustomClassFilename(state) {
    const active = typeof currentLang !== "undefined" ? currentLang : "de";
    const other = active === "de" ? "en" : "de";
    const raw = state.names[active] || state.names[other] || "undefined";
    const slug = slugifyClassName(raw);
    return `custom_class_${slug}_${formatCustomClassDate(new Date())}.json`;
}

function downloadJson(filename, data) {
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

//=======================================================================
// 1.x Speichern → Export + Runtime-Registrierung
//=======================================================================

function buildSnapshotFromEditorState(state) {
    const slug = buildStableSlug(state);
    const id = state.id || nextCustomClassId();
    const snapshotState = { ...state, slug, id };
    return getCustomClassExportSnapshotString(buildExportPayload(snapshotState, slug, id));
}

/** Snapshot ohne updatedAt – sonst würde jeder Speichern-Klick als Änderung gelten */
function getCustomClassExportSnapshotString(exportData) {
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

function saveCustomClass() {
    // Tab1 / Tab3 einsammeln; levelFeatures liegen bereits im Editor-State
    syncSubclassBoxesFromDom();
    syncSpellcastingProgressionFromSlots(customClassEditorState.levelFeatures);
    const prevLf = customClassEditorState.levelFeatures;
    const prevSub = customClassEditorState.subclasses;
    const state = collectCustomClassFormState();
    state.levelFeatures = prevLf || [];
    state.subclasses = prevSub || [];
    // Progression aus dem synchronisierten Editor-State übernehmen
    state.spellcastingProgression = cloneSpellcastingProgression(
        customClassEditorState.spellcastingProgression
    );
    ensureCustomClassLevelFeatureSlots(state);
    ensureCustomClassSubclasses(state);
    if (!validateCustomClassState(state)) return;

    const slug = buildStableSlug(state);
    const id = state.id || nextCustomClassId();
    state.slug = slug;
    state.id = id;

    const payload = buildExportPayload(state, slug, id);
    const currentSnapshot = getCustomClassExportSnapshotString(payload);
    const hasChanges = customClassImportSnapshot === null || currentSnapshot !== customClassImportSnapshot;

    // JSON-Download nur bei neuen oder geänderten Daten
    if (hasChanges) {
        downloadJson(buildCustomClassFilename(state), payload);
    }

    customClassImportSnapshot = currentSnapshot;

    // In Laufzeit übernehmen
    registerCustomClassInRuntime(payload);

    customClassEditorState = state;
    closeCustomClassModal();
}

function unregisterPreviousCustomClass() {
    if (!registeredCustomClass.translationLabel) return;

    const oldLabel = registeredCustomClass.translationLabel;

    // Aus classCoreTraitsList entfernen
    if (typeof classCoreTraitsList !== "undefined") {
        const idx = classCoreTraitsList.findIndex(c => c.translationLabel === oldLabel || c.isCustom);
        if (idx >= 0) classCoreTraitsList.splice(idx, 1);
    }

    // Alte Translations entfernen
    (registeredCustomClass.translationKeys || []).forEach(key => {
        if (translations?.de) delete translations.de[key];
        if (translations?.en) delete translations.en[key];
    });

    // Text-Container entfernen
    const oldText = document.getElementById(oldLabel + "Text");
    if (oldText) oldText.remove();

    registeredCustomClass.compiledClassData = null;
    registeredCustomClass.compiledSubclassList = null;
    registeredCustomClass.compiledMagicSkillsList = null;
    registeredCustomClass.compiledSubclassSpellsList = null;
    registeredCustomClass.compiledSubclassSpellAbilityList = null;
    registeredCustomClass.translationLabel = null;
    registeredCustomClass.id = null;
    registeredCustomClass.translationKeys = [];
    registeredCustomClass.packageId = null;
    registeredCustomClass.verificationCode = null;
    registeredCustomClass.packageCreatedAt = null;
    registeredCustomClass.runtimePackageId = null;
    registeredCustomClass.runtimeCreatedAt = null;
}

function clearClassSelectionUI() {
    document.querySelectorAll('input[name="class"]').forEach(r => { r.checked = false; });

    if (typeof character !== "undefined") {
        character.class = null;
        character.classForm = null;
    }
    if (typeof selectedClassName !== "undefined") {
        selectedClassName = null;
    }

    const classDetailsContainer = document.getElementById("classDetailsContainer");
    if (classDetailsContainer) classDetailsContainer.style.display = "none";

    const classTextContainer = document.getElementById("classTextContainer");
    if (classTextContainer) classTextContainer.style.display = "none";

    const classSymbolContainer = document.getElementById("classSymbolContainer");
    if (classSymbolContainer) classSymbolContainer.style.display = "none";

    const classImageContainer = document.getElementById("classImageContainer");
    if (classImageContainer) classImageContainer.style.display = "none";

    const toggleText = document.getElementById("toggleText");
    if (toggleText) toggleText.style.display = "none";
}

function registerCustomClassInRuntime(rawPackage) {
    unregisterPreviousCustomClass();
    clearClassSelectionUI();

    // Envelope entpacken (neu) oder flaches Legacy-Payload
    let payload = rawPackage;
    let envelope = null;
    if (typeof normalizeDcPackageInput === "function") {
        const norm = normalizeDcPackageInput(rawPackage);
        if (norm.ok) {
            payload = norm.payload;
            envelope = norm.envelope;
        }
    }

    const core = payload.coreTraits;
    const slug = core.translationLabel;

    // Translations einspielen
    const keys = Object.keys(payload.translations?.de || {});
    Object.assign(translations.de, payload.translations.de || {});
    Object.assign(translations.en, payload.translations.en || {});

    // In Datenliste
    classCoreTraitsList.push(core);

    const compiledClassData = Array.isArray(payload.compiledClassData) ? payload.compiledClassData : [];
    sanitizeCompiledChoosePreparedSpellSheetFlags(compiledClassData, payload.translations);

    const packageId = envelope?.packageId
        || customClassEditorState?.packageId
        || null;
    const verificationCode = envelope?.verificationCode
        || (packageId && typeof buildDcVerificationCode === "function"
            ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_CLASS, packageId)
            : null);

    registeredCustomClass = {
        translationLabel: slug,
        id: core.ID,
        translationKeys: keys,
        compiledClassData,
        compiledSubclassList: Array.isArray(payload.compiledSubclassList) ? payload.compiledSubclassList : [],
        compiledMagicSkillsList: Array.isArray(payload.compiledMagicSkillsList)
            ? payload.compiledMagicSkillsList
            : [],
        compiledSubclassSpellsList: Array.isArray(payload.compiledSubclassSpellsList)
            ? payload.compiledSubclassSpellsList
            : [],
        compiledSubclassSpellAbilityList: Array.isArray(payload.compiledSubclassSpellAbilityList)
            ? payload.compiledSubclassSpellAbilityList
            : [],
        packageId,
        verificationCode,
        packageCreatedAt: envelope?.createdAt || customClassEditorState?.packageCreatedAt || null
    };

    // Text-Div für showClassText
    ensureCustomClassTextNode(slug);

    // Radio in Schritt 1
    const listItem = document.getElementById("customClassListItem");
    const radio = document.getElementById("customClassRadio");
    const label = document.getElementById("customClassRadioLabel");

    if (radio) {
        radio.value = slug;
        radio.checked = false;
    }
    if (label) {
        const strong = label.querySelector("strong") || label;
        strong.textContent = translations[currentLang][`${slug}Label`] || translations[currentLang][slug] || slug;
    }
    if (listItem) listItem.style.display = "";

    refreshCustomClassUI();
}

/**
 * Serialisierbares Runtime-Paket für Charakterbogen / LocalStorage.
 * Enthält Kernmerkmale, kompilierte ClassData und Feature-Übersetzungen.
 * Vordefinierte PHB-/Custom-Feature-Texte (ccPreDefined…) bleiben in translationsCustomFeatures.js.
 */
function buildPersistedCustomClassRuntime() {
    if (!registeredCustomClass?.translationLabel) return null;
    const slug = registeredCustomClass.translationLabel;
    if (!isRegisteredCustomClassSlug(slug)) return null;

    const core = (typeof classCoreTraitsList !== "undefined")
        ? classCoreTraitsList.find(c => c.translationLabel === slug || c.isCustom)
        : null;
    if (!core) return null;

    const translationsSlice = { de: {}, en: {} };
    const keySet = new Set(registeredCustomClass.translationKeys || []);

    // Zusätzlich alle Keys aus kompilierten Rows / Subclasses einsammeln
    (registeredCustomClass.compiledClassData || []).forEach(row => {
        ["translationLabel", "classFeatureShortDescription", "classFeatureDescription"].forEach(field => {
            const v = row?.[field];
            if (v && v !== 0) keySet.add(String(v));
        });
        (row?.freeChoiceOptions || []).forEach(opt => {
            if (opt?.translationLabel) keySet.add(String(opt.translationLabel));
        });
    });
    (registeredCustomClass.compiledSubclassList || []).forEach(sc => {
        if (sc?.translationLabel) keySet.add(String(sc.translationLabel));
        if (sc?.subclassD) keySet.add(String(sc.subclassD));
    });
    keySet.add(slug);
    keySet.add(`${slug}Label`);
    keySet.add(`${slug}DLabel`);
    keySet.add(`${slug}Text`);

    keySet.forEach(key => {
        if (translations?.de && translations.de[key] != null) translationsSlice.de[key] = translations.de[key];
        if (translations?.en && translations.en[key] != null) translationsSlice.en[key] = translations.en[key];
    });

    return {
        version: 1,
        type: "customClassRuntime",
        slug,
        coreTraits: JSON.parse(JSON.stringify(core)),
        translations: translationsSlice,
        compiledClassData: JSON.parse(JSON.stringify(registeredCustomClass.compiledClassData || [])),
        compiledSubclassList: JSON.parse(JSON.stringify(registeredCustomClass.compiledSubclassList || [])),
        compiledMagicSkillsList: JSON.parse(JSON.stringify(registeredCustomClass.compiledMagicSkillsList || [])),
        compiledSubclassSpellsList: JSON.parse(JSON.stringify(registeredCustomClass.compiledSubclassSpellsList || [])),
        compiledSubclassSpellAbilityList: JSON.parse(JSON.stringify(
            registeredCustomClass.compiledSubclassSpellAbilityList || []
        ))
    };
}

/** Schreibt Runtime in LocalStorage (nach finishCharacter-Clear). */
function persistCustomClassRuntimeToLocalStorage() {
    const flat = buildPersistedCustomClassRuntime();
    if (!flat) return false;
    const payload = (typeof wrapCustomClassRuntimeExport === "function")
        ? wrapCustomClassRuntimeExport(flat, {
            packageId: registeredCustomClass.packageId,
            slug: registeredCustomClass.translationLabel,
            runtimePackageId: registeredCustomClass.runtimePackageId || null,
            runtimeCreatedAt: registeredCustomClass.runtimeCreatedAt || null
        })
        : flat;
    if (payload?.dc?.packageId) {
        registeredCustomClass.runtimePackageId = payload.dc.packageId;
        registeredCustomClass.runtimeCreatedAt = payload.dc.createdAt || registeredCustomClass.runtimeCreatedAt;
    }
    try {
        localStorage.setItem("customClassRuntime", JSON.stringify(payload));
        return true;
    } catch (e) {
        console.warn("customClassRuntime konnte nicht gespeichert werden:", e);
        return false;
    }
}

function ensureCustomClassTextNode(slug) {
    const container = document.getElementById("classTextContainer");
    if (!container) return;

    let node = document.getElementById(slug + "Text");
    if (!node) {
        node = document.createElement("div");
        node.id = slug + "Text";
        node.className = "classText";
        node.style.display = "none";
        container.appendChild(node);
    }
    node.innerHTML = (translations[currentLang][`${slug}DLabel`] || translations[currentLang][`${slug}Text`] || "")
        .replace(/\n/g, "<br>");
}

//=======================================================================
// 1.x Import → Editor hydratisieren
//=======================================================================

function parseEquipmentConf(value) {
    const conf = { enabled: false, items: [], gp: 0 };
    if (value === 0 || value === null || value === undefined || value === "None") {
        return conf;
    }

    conf.enabled = true;
    const parts = Array.isArray(value) ? value : [value];
    parts.forEach(part => {
        const str = String(part).trim();
        const gpMatch = str.match(/^(\d+)\s*GP$/i);
        if (gpMatch) {
            conf.gp = parseInt(gpMatch[1], 10) || 0;
            return;
        }
        const amountMatch = str.match(/^(\d+)x\s*(.+)$/i);
        if (amountMatch) {
            conf.items.push({ amount: parseInt(amountMatch[1], 10) || 1, label: amountMatch[2].trim(), category: "" });
            return;
        }
        conf.items.push({ amount: 1, label: str, category: "" });
    });
    conf.items.forEach(item => {
        if (!item.category) item.category = inferEquipmentCategory(item.label);
    });
    return conf;
}

function hydrateEditorStateFromExport(data, envelope) {
    const core = data.coreTraits;
    const state = createEmptyCustomClassState();
    state.id = core.ID || null;
    state.slug = core.translationLabel || null;

    // DC-Package-Metadaten (Envelope neu oder Legacy → neue ID beim nächsten Speichern)
    if (envelope?.packageId) {
        state.packageId = envelope.packageId;
        state.packageCreatedAt = envelope.createdAt || null;
        state.verificationCode = envelope.verificationCode
            || (typeof buildDcVerificationCode === "function"
                ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_CLASS, envelope.packageId)
                : null);
    } else if (data.packageId) {
        state.packageId = data.packageId;
        state.packageCreatedAt = data.packageCreatedAt || null;
        state.verificationCode = data.verificationCode || null;
    } else if (typeof createDcPackageId === "function") {
        // Legacy-Datei: ab jetzt stabile ID zuweisen
        state.packageId = createDcPackageId();
        state.packageCreatedAt = new Date().toISOString();
        state.verificationCode = typeof buildDcVerificationCode === "function"
            ? buildDcVerificationCode(DC_PACKAGE_TYPE.CUSTOM_CLASS, state.packageId)
            : null;
    }

    state.levelFeatures = Array.isArray(data.levelFeatures) ? data.levelFeatures : [];
    state.subclasses = Array.isArray(data.subclasses) ? data.subclasses : [];
    ensureCustomClassSubclasses(state);
    if (Array.isArray(data.availableLanguages) && data.availableLanguages.length) {
        state.availableLanguages = data.availableLanguages.slice();
    }
    if (Array.isArray(data.parameterRegistry)) {
        state.parameterRegistry = data.parameterRegistry.map(p => ({
            id: p.id,
            names: { de: p.names?.de || "", en: p.names?.en || "" },
            useValue: normalizeLfParameterValueMode(p).useValue,
            useDie: normalizeLfParameterValueMode(p).useDie
        }));
    }
    if (data.spellcastingProgression) {
        state.spellcastingProgression = cloneSpellcastingProgression(data.spellcastingProgression);
    }
    ensureAvailableLanguages(state);

    const slug = core.translationLabel;
    const de = data.translations?.de || {};
    const en = data.translations?.en || {};

    state.names.de = de[`${slug}Label`] || de[slug] || "";
    state.names.en = en[`${slug}Label`] || en[slug] || "";
    state.descriptions.de = de[`${slug}DLabel`] || de[`${slug}Text`] || "";
    state.descriptions.en = en[`${slug}DLabel`] || en[`${slug}Text`] || "";

    state.primaryAbility = normalizeToArray(core.primaryAbility);
    state.hitPointDie = core.hitPointDie || "D8";
    state.savingThrowProficiencies = normalizeToArray(core.savingThrowProficiencies);
    state.skillCategoryNumber = normalizeToArray(core.skillCategoryNumber).map(n => parseInt(n, 10));
    state.spellcastingLabel = core.spellcastingLabel ? 1 : 0;
    state.spellcastingAbility = core.spellcastingAbility || 0;
    state.spellcastingFocus = normalizeToArray(core.spellcastingFocus);
    state.weaponCategoryNumber = normalizeToArray(core.weaponCategoryNumber).map(n => parseInt(n, 10));
    state.weaponPropertyCategoryNumber = normalizeToArray(core.weaponPropertyCategoryNumber).map(n => parseInt(n, 10));
    state.armorCategoryNumber = normalizeToArray(core.armorCategoryNumber).map(n => parseInt(n, 10));
    state.toolLabel = normalizeToArray(core.toolLabel).filter(v => v !== 0)[0] || 0;

    state.equipment.A = parseEquipmentConf(core.startingEquipmentA);
    state.equipment.B = parseEquipmentConf(core.startingEquipmentB);
    state.equipment.C = parseEquipmentConf(core.startingEquipmentC);

    // Defaults wenn Import keine Flags hat: A/B an, C aus – parseEquipmentConf setzt enabled anhand Inhalt.
    // Wenn A/B leer aber 0: disabled bleibt false – für Import ok.
    // Für leere A/B im Export als 0: enabled false. Beim Neu-Erstellen sind Defaults aktiv.

    return state;
}

//=======================================================================
// 1.x Auswahl & UI-Refresh
//=======================================================================

function selectCustomClass() {
    const slug = registeredCustomClass.translationLabel;
    if (!slug) return;
    selectClass(slug);
}

function refreshCustomClassUI() {
    applyCustomFeatureVisibility();
    applyCustomClassModalTranslations();

    const listItem = document.getElementById("customClassListItem");
    const label = document.getElementById("customClassRadioLabel");
    const slug = registeredCustomClass.translationLabel;

    if (!slug) {
        if (listItem) listItem.style.display = "none";
        return;
    }

    if (listItem) listItem.style.display = "";
    if (label) {
        const strong = label.querySelector("strong") || label;
        strong.textContent = translations[currentLang][`${slug}Label`] || translations[currentLang][slug] || slug;
    }

    ensureCustomClassTextNode(slug);

    // Offenes Modal-Formular neu übersetzen, falls sichtbar
    const editor = document.getElementById("customClassEditorView");
    if (editor && editor.style.display !== "none" && document.getElementById("customClassOverlay")?.style.display === "flex") {
        const prevLf = customClassEditorState.levelFeatures;
        const prevSub = customClassEditorState.subclasses;
        if (document.getElementById("customClassTab1Content")?.children.length) {
            customClassEditorState = collectCustomClassFormState();
            customClassEditorState.levelFeatures = prevLf;
            customClassEditorState.subclasses = prevSub;
            renderCustomClassTab1();
        }
        if (document.getElementById("customClassTab2")?.classList.contains("active")) {
            renderCustomClassTab2();
        }
    }
}

//=======================================================================
// 1.x Tab 2: Levelbasierte Merkmale
//=======================================================================
// Vereinbarte Folge-Logik (noch nicht voll UI):
// - Export später 1:1 classData-Shape (compile aus Slots)
// - Merkmaltyp → Kategorie → Floating Windows; Limits ausgrauen
// - Optionen-Limit 4 (ohne Skills/ASI/Feats-Sektionen)
// - Unterklasse auf einer Mehrzeilen-Stufe sperrt die Geschwisterzeilen
// - Tab1↔Tab2 Tool-Kategorien bidirektional, max. ein Tooltyp
//=======================================================================

/**
 * Zentrale Config – rowCount steuert Zeilen je Stufen-Box.
 * Beispiel Stufe 2 von 2 auf 3 Zeilen: { level: 2, rowCount: 3 }
 * fixed[index] = systemPreset für unveränderliche Zeilen.
 */
const CUSTOM_CLASS_LF_CONFIG = {
    nameMax: 30,
    /** Max. Zeichen für Einfach → Frei Parameterbezeichnung */
    parameterNameMax: 20,
    shortDescMax: 100,
    descMax: 500,

    limits: {
        optionsTypeMax: 4,
        /**
         * Max. freie Merkmaltyp-„Unterklasse“-Zeilen in Tab 2 (ohne feste Stufe-3-Zeile).
         * Gesamt UC-Stufen = 1 (Stufe 3 fest) + subclassFreeMax → aktuell 5.
         * Dropdown zeigt Rest „Unterklasse (N)“; Spalte Anzahl = Ordnungszahl 1…N.
         */
        subclassFreeMax: 4,
        freeOptionsFeatureMax: 3,
        freeOptionsChoicesMax: 10,
        /** Mindestanzahl Optionen in der Spalte Optionen (Merkmaltyp Optionen) */
        optionsMinChoices: 2,
        attributePointsMax: 6,
        preparedSpellFeatureMax: 2,
        preparedSpellsPerFeatureMax: 3,
        /**
         * Max. Aufrufe „Unterklassenzauber“ (Magieprogression) pro Unterklasse.
         * PHB Domäne/Patron ≈ 4 Stufen; Paladin/Ranger ≈ 5 — hier bewusst zentral erweiterbar.
         */
        subclassSpellsFeatureMax: 4,
        /** Max. gewählte Zauber pro Magieprogression-Aufruf (über alle Grade) */
        subclassSpellsPerInvocationMax: 3,
        /** Dropdowns pro Zaubergrad-Block in der Magieprogression-Maske */
        subclassSpellsDropdownsPerGrade: 3
    },

    /**
     * Max. Dropdowns in Spalte „Anzahl“ je Optionen-Kategorie (zentral anpassbar).
     * skills: Klassen-Kontingent über alle Stufen (PHB: oft 2, Schurke 4).
     */
    optionsDropdownLimits: {
        free: 6,
        skills: 4,
        savingThrows: 2,
        expertise: 4,
        weaponMasteries: 6,
        tools: 3,
        languages: 2,
        asiAndFeat: 2,
        maneuver: 6,
        fightingStyle: 2
    },

    /** Spec je Optionen-Kategorie (Bezeichnung / Desc / Options-Maske) */
    optionsCategorySpecs: {
        free: {
            designation: "custom",
            descMode: "custom",
            optionsMode: "freeChoices",
            globalAmountPool: true
        },
        skills: {
            designationLabel: "additionalSkillsLabel",
            descMode: "fixed",
            shortKey: "additionalSkillsShortD",
            longKey: null,
            optionsMode: "skillFilter",
            globalAmountPool: true
        },
        savingThrows: {
            designationLabel: "savingThrowsLabel",
            descMode: "fixed",
            shortKey: "savingThrowChoiceShortD",
            longKey: null,
            optionsMode: "savingThrows",
            globalAmountPool: true
        },
        expertise: {
            designationLabel: "expertiseLabel",
            descMode: "fixed",
            shortKey: "expertiseShortD",
            longKey: "expertiseD",
            optionsMode: "expertiseInfo",
            globalAmountPool: true
        },
        weaponMasteries: {
            designationLabel: "weaponMasteryLabel",
            descMode: "fixed",
            shortKey: "weaponMasteryShortD",
            longKey: "weaponMasteryD",
            // Pool kommt aus Tab-1 Waffenkategorien + Waffeneigenschaften (createWeaponOptions)
            optionsMode: "weaponMasteriesInfo",
            globalAmountPool: true
        },
        tools: {
            designation: "tab1Tool",
            descMode: "toolsFixed",
            optionsMode: "tools",
            globalAmountPool: true
        },
        languages: {
            designationLabel: "languagesLabel",
            descMode: "fixed",
            shortKey: "languageShortD",
            longKey: null,
            optionsMode: "languages",
            globalAmountPool: true
        },
        asiAndFeat: {
            designationLabel: "asiAndFeat",
            descMode: "none",
            optionsMode: "asiAndFeat",
            minLevel: 4,
            globalAmountPool: true
        },
        maneuver: {
            designationLabel: "maneuverLabel",
            descMode: "fixed",
            shortKey: "maneuverShortD",
            longKey: "maneuverD",
            optionsMode: "maneuver",
            globalAmountPool: true
        },
        fightingStyle: {
            designationLabel: "fightingStyleLabel",
            descMode: "fixed",
            shortKey: "fightingStyleShortD",
            longKey: null,
            optionsMode: "fightingStyle",
            globalAmountPool: true
        }
    },

    /**
     * Spec je Einfach-Kategorie (Bezeichnung / Desc / Options-Maske).
     * Anzahl-Spalte ist für Merkmaltyp Einfach immer deaktiviert.
     */
    simpleCategorySpecs: {
        free: {
            designation: "custom",
            descMode: "custom",
            optionsMode: "parameter",
            optionsIcon: "gear"
        },
        skills: {
            designationLabel: "additionalSkillsLabel",
            descMode: "fixed",
            shortKey: "additionalSkillsShortD",
            longKey: null,
            optionsMode: "skillsPick",
            optionsIcon: "gear",
            pickMin: 1,
            pickMax: 3
        },
        savingThrows: {
            designationLabel: "savingThrowsLabel",
            descMode: "fixed",
            shortKey: "grantedSavingThrowsShortD",
            longKey: null,
            optionsMode: "savingThrowsPick",
            optionsIcon: "gear",
            pickMin: 1
        },
        spellcasting: {
            designationLabel: "spellcastingLabel",
            descMode: "fixed",
            shortKey: "spellcastingShortD",
            longKey: "spellcastingCustomD",
            optionsMode: "spellLists",
            optionsIcon: "gear",
            oncePerClass: true,
            pickMin: 1,
            pickMax: 8
        },
        preDefined: {
            designation: "preDefinedLabel",
            descMode: "preDefinedFixed",
            // Bezeichnung = Merkmalswahl; Optionen = feste LEVEL_VAL-Parameter (falls Meta.parameters)
            optionsMode: "preDefinedParams",
            optionsIcon: "gear"
        },
        // Feste Vertrautheits-Grants (ohne Spielerwahl im Ersteller)
        weaponTraining: {
            designationLabel: "weaponTrainingLabel",
            descMode: "fixed",
            shortKey: "weaponTrainingGrantedShortD",
            longKey: null,
            optionsMode: "weaponTrainingPick",
            optionsIcon: "gear",
            pickMin: 1
        },
        armorTraining: {
            designationLabel: "armorTrainingLabel",
            descMode: "fixed",
            shortKey: "armorTrainingGrantedShortD",
            longKey: null,
            optionsMode: "armorTrainingPick",
            optionsIcon: "gear",
            pickMin: 1
        }
    },

    /**
     * Vordefinierte Einfach-Merkmale inkl. Voraussetzungen (frühere Stufe).
     * Keys = translationLabel der Anzeige / Speicherung.
     * sheetFlag → classFeaturesCharacterSheet (0–3, optional :APPEND / :Pfad).
     * parameters → feste Spaltenkeys für [LEVEL_VAL]…[/LEVEL_VAL] auf dem Charakterbogen.
     */
    preDefinedFeatureMeta: {
        // Barbar: GES+KO, Schild erlaubt → featureHandlers.unarmoredDefense
        unarmoredDefense: {
            shortKey: "unarmoredDefenseShortD",
            longKey: "unarmoredDefenseBD",
            requires: null,
            sheetFlag: 3,
            parameters: []
        },
        // Mönch: GES+WEI, kein Schild → featureHandlers.unarmoredDefenseLabel
        unarmoredDefenseLabel: {
            shortKey: "unarmoredDefenseShortD",
            longKey: "unarmoredDefenseD",
            requires: null,
            sheetFlag: 3,
            parameters: []
        },
        extraAttackLabel: {
            shortKey: "extraAttackShortD",
            longKey: "extraAttackD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        twoExtraAttacksLabel: {
            shortKey: "twoExtraAttacksShortD",
            longKey: "twoExtraAttacksD",
            requires: "extraAttackLabel",
            sheetFlag: 1,
            parameters: []
        },
        threeExtraAttacksLabel: {
            shortKey: "threeExtraAttacksShortD",
            longKey: "threeExtraAttacksD",
            requires: "twoExtraAttacksLabel",
            sheetFlag: 1,
            parameters: []
        },
        sneakAttackLabel: {
            shortKey: "sneakAttackShortD",
            longKey: "sneakAttackD",
            requires: null,
            sheetFlag: 1,
            parameters: [
                {
                    key: "sneakAttackDice",
                    nameKey: "sneakAttackDiceLabel",
                    // Wie Einfach→Frei: Wert × Würfel; Würfel fest D6
                    valueType: "valueDie",
                    defaultValue: "1D6",
                    valueMin: 1,
                    valueMax: 10,
                    dieFixed: "D6"
                }
            ]
        },
        rage: {
            shortKey: "ccPreDefinedRageShortD",
            longKey: "ccPreDefinedRageD",
            requires: null,
            sheetFlag: 1,
            parameters: [
                { key: "rages", nameKey: "ragesLabel", valueType: "number", defaultValue: 2, min: 1, max: 20 },
                // In der Optionen-Spalte nur Nutzungen; Schaden nur in der Maske
                {
                    key: "rageDamage",
                    nameKey: "rageDamageLabel",
                    valueType: "select",
                    defaultValue: "+2",
                    selectOptions: ["+1", "+2", "+3", "+4", "+5"],
                    showInChip: false
                }
            ]
        },
        channelDivinityLabel: {
            shortKey: "ccPreDefinedChannelDivinityShortD",
            longKey: "ccPreDefinedChannelDivinityD",
            requires: null,
            sheetFlag: 1,
            parameters: [
                { key: "channelDivinity", nameKey: "channelDivinityLabel", valueType: "number", defaultValue: 2, min: 1, max: 20 }
            ]
        },
        wildShapeLabel: {
            shortKey: "ccPreDefinedWildShapeShortD",
            longKey: "ccPreDefinedWildShapeD",
            requires: null,
            sheetFlag: 1,
            parameters: [
                { key: "wildShape", nameKey: "wildShapeLabel", valueType: "number", defaultValue: 2, min: 1, max: 20 }
            ]
        },
        deflectAttacksLabel: {
            shortKey: "deflectAttacksShortD",
            longKey: "deflectAttacksD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        evasionLabel: {
            shortKey: "evasionShortD",
            longKey: "evasionD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        secondWindLabel: {
            shortKey: "secondWindShortD",
            longKey: "secondWindD",
            requires: null,
            sheetFlag: 1,
            parameters: [
                { key: "secondWind", nameKey: "secondWindLabel", valueType: "number", defaultValue: 2, min: 1, max: 20 }
            ]
        },
        ritualAdeptLabel: {
            shortKey: "ritualAdeptShortD",
            longKey: "ritualAdeptD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        cunningActionLabel: {
            shortKey: "cunningActionLabelShortD",
            longKey: "cunningActionLabelD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        dangerSense: {
            shortKey: "dangerSenseShortD",
            longKey: "dangerSenseD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        uncannyDodgeLabel: {
            shortKey: "uncannyDodgeShortD",
            longKey: "uncannyDodgeD",
            requires: null,
            sheetFlag: 1,
            parameters: []
        },
        bardicInspirationLabel: {
            shortKey: "ccPreDefinedBardicInspirationShortD",
            longKey: "ccPreDefinedBardicInspirationD",
            requires: null,
            sheetFlag: 1,
            parameters: [
                {
                    key: "bardicDie",
                    nameKey: "bardicInspirationDiceLabel",
                    valueType: "die",
                    defaultValue: "D6",
                    dieOptions: ["D4", "D6", "D8", "D10", "D12", "D20"]
                }
            ]
        }
    },

    /**
     * Spec je Attribut-Kategorie (Bezeichnung / Desc / Options-Maske).
     * Anzahl-Spalte ist für Merkmaltyp Attribut immer deaktiviert.
     */
    attributeCategorySpecs: {
        direct: {
            designationLabel: "ccLfAbilityImprovementNameLabel",
            descMode: "none",
            optionsMode: "directPoints",
            pointsMax: 6
        },
        distribution: {
            designationLabel: "ccLfAbilityImprovementNameLabel",
            descMode: "none",
            optionsMode: "distributionConfig",
            pointsMin: 1,
            pointsMax: 6,
            attrsMin: 2,
            /** Pro Klasse nur 1×; zählt trotzdem gegen Dynamic-Content-Limit (max. 4) */
            oncePerClass: true,
            countsTowardOptionsLimit: true
        }
    },

    /**
     * Spec je Zauberkunst-Kategorie.
     * Anzahl-Spalte immer deaktiviert; Zuweisung/Wahl erfolgt in Schritt 7.
     * Ausnahme Unterklassenzauber: Anzahl zeigt Ordnungszahl 1…N (read-only).
     */
    spellcraftCategorySpecs: {
        getCantrip: {
            designation: "custom",
            // Wie Sprachen/ASI: Kurzbeschreibung fest, keine Langbeschreibung
            descMode: "fixed",
            shortKey: "ccLfGetCantripShortD",
            longKey: null,
            optionsMode: "getCantrip",
            dropdownCount: 3
        },
        chooseCantrip: {
            designation: "custom",
            descMode: "fixed",
            shortKey: "ccLfChooseCantripShortD",
            longKey: null,
            optionsMode: "chooseCantrip",
            pickMin: 1,
            pickMax: 3
        },
        getPreparedSpell: {
            designation: "custom",
            descMode: "fixed",
            shortKey: "ccLfGetPreparedSpellShortD",
            longKey: "ccLfChoosePreparedSpellD",
            optionsMode: "getPreparedSpell",
            dropdownCount: 3
        },
        choosePreparedSpell: {
            designation: "custom",
            descMode: "fixed",
            shortKey: "ccLfChoosePreparedSpellShortD",
            longKey: "ccLfChoosePreparedSpellD",
            optionsMode: "choosePreparedSpell",
            pickMin: 1,
            pickMax: 3
        },
        /** Domänen-/Patron-ähnliche Stufenprogression (nur Unterklasse + Basis-Zauberwirken) */
        subclassSpells: {
            designationLabel: "magicProgressionLabel",
            descMode: "none",
            optionsMode: "subclassSpells",
            subclassOnly: true,
            requiresBaseSpellcasting: true
        }
    },

    /** Anzahl-Semantik (leer: Einfach/Attribut/Zauberkunst ohne Anzahl-Spalte) */
    amountSemantics: {},

    preDefinedFeatures: [
        "unarmoredDefense",
        "unarmoredDefenseLabel",
        "extraAttackLabel",
        "twoExtraAttacksLabel",
        "threeExtraAttacksLabel",
        "sneakAttackLabel",
        "rage",
        "channelDivinityLabel",
        "wildShapeLabel",
        "deflectAttacksLabel",
        "evasionLabel",
        "secondWindLabel",
        "ritualAdeptLabel",
        "cunningActionLabel",
        "dangerSense",
        "uncannyDodgeLabel",
        "bardicInspirationLabel"
    ],

    featureTypes: {
        options: "ccLfTypeOptionsLabel",
        simple: "ccLfTypeSimpleLabel",
        attribute: "ccLfTypeAttributeLabel",
        subclass: "ccLfTypeSubclassLabel",
        spellcraft: "ccLfTypeSpellcraftLabel"
    },

    categoriesByType: {
        options: [
            "free", "skills", "savingThrows", "expertise",
            "weaponMasteries", "tools", "languages", "asiAndFeat", "maneuver",
            "fightingStyle"
        ],
        simple: ["free", "skills", "savingThrows", "spellcasting", "preDefined", "weaponTraining", "armorTraining"],
        attribute: ["direct", "distribution"],
        subclass: ["none"],
        spellcraft: ["getCantrip", "chooseCantrip", "getPreparedSpell", "choosePreparedSpell", "subclassSpells"]
    },

    /**
     * Stufen-Boxen: rowCount = Kapazität; fixed = Index → Preset
     * Presets: coreSkills | subclass | asiAndFeat | epicBoon
     */
    layout: [
        { level: 1, rowCount: 4, fixed: { 0: "coreSkills" } },
        { level: 2, rowCount: 3 },
        { level: 3, rowCount: 1, fixed: { 0: "subclass" } },
        { level: 4, rowCount: 1, fixed: { 0: "asiAndFeat" } },
        { level: 5, rowCount: 2 },
        { level: 6, rowCount: 2 },
        { level: 7, rowCount: 2 },
        { level: 8, rowCount: 1, fixed: { 0: "asiAndFeat" } },
        { level: 9, rowCount: 2 },
        { level: 10, rowCount: 2 },
        { level: 11, rowCount: 2 },
        { level: 12, rowCount: 1, fixed: { 0: "asiAndFeat" } },
        { level: 13, rowCount: 2 },
        { level: 14, rowCount: 2 },
        { level: 15, rowCount: 2 },
        { level: 16, rowCount: 1, fixed: { 0: "asiAndFeat" } },
        { level: 17, rowCount: 2 },
        { level: 18, rowCount: 2 },
        { level: 19, rowCount: 1, fixed: { 0: "epicBoon" } },
        { level: 20, rowCount: 1 }
    ]
};

/** Freie Unterklasse erst ab dieser Stufe wähl-/verschiebbar */
const CUSTOM_CLASS_LF_SUBCLASS_MIN_LEVEL = 3;
/** Optionen + ASI/Feat erst ab Stufe 4 */
const CUSTOM_CLASS_LF_ASI_MIN_LEVEL = 4;

/**
 * Tab 3: Unterklassen-Editor (Config leicht anpassbar).
 * rowsPerLevel = Standard-Merkmalszeilen je UC-Stufe;
 * rowsPerLevelOverrides = Ausnahme pro Stufe (z. B. Stufe 3: 3 Zeilen).
 */
const CUSTOM_CLASS_SC_CONFIG = {
    minSubclasses: 1,
    maxSubclasses: 4,
    nameMax: 30,
    descMax: 300,
    /** Standard-Zeilen pro Unterklassen-Stufe (Tab 3) */
    rowsPerLevel: 2,
    /** Mehr Zeilen nur auf ausgewählten Stufen (PHB: L3 oft Spells + 2 Features) */
    rowsPerLevelOverrides: { 3: 3 },
    limits: {
        /**
         * Max. eindeutige Dynamic-Content-Kategorien (Optionen außer Skills/ASI)
         * pro Unterklasse – analog Tab 2, aber niedrigeres Limit.
         * Attribut→Verteilung zählt hier nicht (in Unterklassen nicht erlaubt).
         */
        optionsTypeMax: 2
    },
    /** In Tab-3-Merkmalen nicht wählbare Attribut-Kategorien */
    blockedAttributeCategories: ["distribution"]
};

let ccLfDragSourceSlotId = null;

function getLfOptionsCategorySpec(category) {
    return CUSTOM_CLASS_LF_CONFIG.optionsCategorySpecs[category] || null;
}

function getLfSimpleCategorySpec(category) {
    return CUSTOM_CLASS_LF_CONFIG.simpleCategorySpecs[category] || null;
}

function getLfAttributeCategorySpec(category) {
    // Altbestand: „increase“ → Direkt
    const key = category === "increase" ? "direct" : category;
    return CUSTOM_CLASS_LF_CONFIG.attributeCategorySpecs[key] || null;
}

function getLfSpellcraftCategorySpec(category) {
    return CUSTOM_CLASS_LF_CONFIG.spellcraftCategorySpecs[category] || null;
}

//=======================================================================
// Unterklassenzauber (Magieprogression) – Hilfen
//=======================================================================

/** Basis-Zauberwirken-Slot (Tab 2), nicht Unterklasse */
function getLfBaseSpellcastingSlot(state) {
    const st = state || customClassEditorState;
    return (st?.levelFeatures || []).find(s =>
        s
        && !s.blockedBySubclass
        && s.payload?.featureType === "simple"
        && s.payload?.category === "spellcasting"
    ) || null;
}

function getLfBaseSpellcastingLevel(state) {
    const slot = getLfBaseSpellcastingSlot(state);
    return slot ? (Number(slot.level) || 1) : null;
}

function hasLfBaseClassSpellcasting(state) {
    return !!getLfBaseSpellcastingSlot(state);
}

/** Zauberlisten der Eingangsstufe (Tab-4 baseSpellListLabels / Spellcasting-Slot) */
function getLfSpellcastingEntrySpellListLabels(state) {
    const st = state || customClassEditorState;
    const prog = st?.spellcastingProgression;
    if (Array.isArray(prog?.baseSpellListLabels) && prog.baseSpellListLabels.length) {
        return prog.baseSpellListLabels.filter(Boolean);
    }
    const slot = getLfBaseSpellcastingSlot(st);
    const lists = slot?.payload?.optionsConfig?.spellListLabels;
    return Array.isArray(lists) ? lists.filter(Boolean) : [];
}

function getLfSpellGradeRank(levelLabel) {
    if (!levelLabel) return -1;
    if (levelLabel === "cantripLabel") return 0;
    const map = {
        "1stLevelLabel": 1,
        "2ndLevelLabel": 2,
        "3rdLevelLabel": 3,
        "4thLevelLabel": 4,
        "5thLevelLabel": 5,
        "6thLevelLabel": 6,
        "7thLevelLabel": 7,
        "8thLevelLabel": 8,
        "9thLevelLabel": 9
    };
    return map[levelLabel] != null ? map[levelLabel] : -1;
}

function getLfSpellGradeLabelFromRank(rank) {
    if (rank === 0) return "cantripLabel";
    if (rank === 1) return "1stLevelLabel";
    if (rank === 2) return "2ndLevelLabel";
    if (rank === 3) return "3rdLevelLabel";
    if (rank >= 4 && rank <= 9) return `${rank}thLevelLabel`;
    return null;
}

/** In Tab 4 auf Charakterstufe freigeschaltete Zaubergrade (inkl. Cantrips) */
function getLfTab4UnlockedSpellGradeLabels(state, level) {
    const st = state || customClassEditorState;
    const row = getSpellProgRowFromProgression(st?.spellcastingProgression, level);
    if (!row) return [];
    const labels = [];
    if ((parseInt(row.cantripsAmount, 10) || 0) > 0) labels.push("cantripLabel");
    for (let i = 1; i <= 9; i++) {
        if ((parseInt(row[`SSpSL${i}`], 10) || 0) > 0) {
            const lab = getLfSpellGradeLabelFromRank(i);
            if (lab) labels.push(lab);
        }
    }
    return labels;
}

function collectLfSubclassSpellsSelectedLabels(cfg) {
    const out = [];
    const byLevel = cfg?.selectedByLevel || {};
    Object.keys(byLevel).forEach(lvl => {
        (byLevel[lvl] || []).filter(Boolean).forEach(lab => out.push(lab));
    });
    return out;
}

function getLfSpellGradeRankForSpellLabel(spellLabel) {
    if (typeof spellList === "undefined" || !spellLabel) return -1;
    const spell = spellList.find(s => s.translationLabel === spellLabel);
    return spell ? getLfSpellGradeRank(spell.spellLevel) : -1;
}

/** Max. Grad bisheriger Magieprogression-Aufrufe derselben UC (niedrigere Stufe) */
function getLfSubclassSpellsPriorMaxGradeRank(slots, slot) {
    let maxRank = -1;
    const lvl = Number(slot?.level) || 0;
    (slots || []).forEach(s => {
        if (!s || s.slotId === slot?.slotId) return;
        if (s.payload?.featureType !== "spellcraft" || s.payload?.category !== "subclassSpells") return;
        if ((Number(s.level) || 0) >= lvl) return;
        collectLfSubclassSpellsSelectedLabels(s.payload?.optionsConfig).forEach(lab => {
            maxRank = Math.max(maxRank, getLfSpellGradeRankForSpellLabel(lab));
        });
    });
    return maxRank;
}

/**
 * Erlaubte Grade für einen Magieprogression-Slot:
 * Tab-4-Freischaltung dieser Stufe ∩ Grad > max(früherer Aufrufe).
 */
function getLfSubclassSpellsAllowedGradeLabels(slot, slots, state) {
    const tab4 = getLfTab4UnlockedSpellGradeLabels(state || customClassEditorState, slot?.level);
    const priorMax = getLfSubclassSpellsPriorMaxGradeRank(slots || getLfSlotsForSlot(slot), slot);
    return tab4.filter(lab => getLfSpellGradeRank(lab) > priorMax);
}

function countLfSubclassSpellsFeatures(slots, excludeSlotId) {
    return (slots || []).filter(s =>
        s.slotId !== excludeSlotId
        && s.payload?.featureType === "spellcraft"
        && s.payload?.category === "subclassSpells"
    ).length;
}

function isLfSubclassSpellsTakenOnLevel(slots, level, excludeSlotId) {
    return (slots || []).some(s =>
        s.slotId !== excludeSlotId
        && Number(s.level) === Number(level)
        && s.payload?.featureType === "spellcraft"
        && s.payload?.category === "subclassSpells"
    );
}

/** Ordnungszahl 1…N unter den Magieprogression-Slots derselben UC (nach Stufe) */
function getLfSubclassSpellsOrdinal(slot, slots) {
    if (!slot || slot.payload?.category !== "subclassSpells") return 0;
    const series = (slots || getLfSlotsForSlot(slot))
        .filter(s =>
            s.payload?.featureType === "spellcraft"
            && s.payload?.category === "subclassSpells"
        )
        .slice()
        .sort((a, b) => (a.level - b.level) || (a.index - b.index));
    const idx = series.findIndex(s => s.slotId === slot.slotId);
    return idx >= 0 ? idx + 1 : 0;
}

function refreshLfSubclassSpellsOrdinals(slots) {
    const series = (slots || [])
        .filter(s =>
            s.payload?.featureType === "spellcraft"
            && s.payload?.category === "subclassSpells"
        )
        .slice()
        .sort((a, b) => (a.level - b.level) || (a.index - b.index));
    series.forEach((s, i) => {
        s.payload.amount = i + 1;
    });
}

function isLfSubclassSpellsCategorySelectable(slot, slots) {
    if (!isLfSubclassFeatureSlot(slot)) return false;
    if (!hasLfBaseClassSpellcasting(customClassEditorState)) return false;
    const baseLvl = getLfBaseSpellcastingLevel(customClassEditorState);
    if (baseLvl != null && (Number(slot.level) || 0) < baseLvl) return false;
    const max = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsFeatureMax || 4;
    const count = countLfSubclassSpellsFeatures(slots, slot.slotId);
    if (slot.payload?.category === "subclassSpells") return true;
    if (count >= max) return false;
    if (isLfSubclassSpellsTakenOnLevel(slots, slot.level, slot.slotId)) return false;
    return true;
}

/** true, wenn mindestens ein Magieprogression-Slot Zauber konfiguriert hat */
function hasAnyLfSubclassSpellsConfiguration(state) {
    const st = state || customClassEditorState;
    return (st?.subclasses || []).some(sc =>
        (sc.levelFeatures || []).some(s =>
            s.payload?.featureType === "spellcraft"
            && s.payload?.category === "subclassSpells"
            && collectLfSubclassSpellsSelectedLabels(s.payload?.optionsConfig).length > 0
        )
    );
}

/** Alle Magieprogression-Zauberwahlen zurücksetzen (Kategorie/Slot bleibt) */
function clearAllLfSubclassSpellsConfigurations(state) {
    const st = state || customClassEditorState;
    (st?.subclasses || []).forEach(sc => {
        (sc.levelFeatures || []).forEach(s => {
            if (s.payload?.featureType !== "spellcraft" || s.payload?.category !== "subclassSpells") return;
            const cfg = s.payload.optionsConfig || {};
            s.payload.optionsConfig = {
                schoolMode: cfg.schoolMode || "all",
                schoolLabels: Array.isArray(cfg.schoolLabels) ? cfg.schoolLabels.slice() : [],
                selectedByLevel: {},
                spellListLabels: getLfSpellcastingEntrySpellListLabels(st)
            };
            s.payload.descriptions = { de: "-", en: "-" };
        });
        refreshLfSubclassSpellsOrdinals(sc.levelFeatures || []);
    });
}

/**
 * Entfernt Zauber, deren Grad nicht mehr erlaubt ist (Tab 4 / Ascending).
 * @returns {boolean} true wenn etwas geändert wurde
 */
function sanitizeLfSubclassSpellsSlotSelections(slot, slots, state) {
    if (!slot || slot.payload?.category !== "subclassSpells") return false;
    const cfg = slot.payload.optionsConfig || {};
    const byLevel = cfg.selectedByLevel || {};
    const allowed = new Set(getLfSubclassSpellsAllowedGradeLabels(slot, slots, state || customClassEditorState));
    const next = {};
    let changed = false;

    Object.keys(byLevel).forEach(lvl => {
        const picks = Array.isArray(byLevel[lvl]) ? byLevel[lvl] : [];
        if (!allowed.has(lvl)) {
            if (picks.some(Boolean)) changed = true;
            return;
        }
        const cleaned = picks.map(lab => {
            if (!lab) return "";
            if (getLfSpellGradeLabelFromRank(getLfSpellGradeRankForSpellLabel(lab)) !== lvl) {
                changed = true;
                return "";
            }
            return lab;
        });
        const had = picks.some(Boolean);
        const has = cleaned.some(Boolean);
        if (had && !has) changed = true;
        if (has) next[lvl] = cleaned;
        else if (had) changed = true;
    });

    const prevKeys = Object.keys(byLevel).sort().join(",");
    const nextKeys = Object.keys(next).sort().join(",");
    if (prevKeys !== nextKeys) changed = true;

    if (!changed) return false;

    slot.payload.optionsConfig = {
        ...cfg,
        selectedByLevel: next,
        spellListLabels: getLfSpellcastingEntrySpellListLabels(state || customClassEditorState)
    };
    return true;
}

/** Alle UC-Magieprogression-Slots gegen aktuelle Tab-4-Lage bereinigen */
function sanitizeAllLfSubclassSpellsAgainstTab4(state) {
    const st = state || customClassEditorState;
    let any = false;
    (st?.subclasses || []).forEach(sc => {
        const slots = sc.levelFeatures || [];
        slots.forEach(s => {
            if (sanitizeLfSubclassSpellsSlotSelections(s, slots, st)) any = true;
        });
        if (any) refreshLfSubclassSpellsOrdinals(slots);
    });
    return any;
}

/**
 * Vor Tab-4-Konfigwechsel: Warnung + vollständiger Magieprogression-Reset.
 * @returns {boolean} false = Abbruch
 */
function confirmLfSubclassSpellsResetForTab4Change() {
    if (!hasAnyLfSubclassSpellsConfiguration()) return true;
    if (!confirm(tCC("ccLfSubclassSpellsTab4ResetConfirmLabel"))) return false;
    clearAllLfSubclassSpellsConfigurations();
    return true;
}

function getLfAbilityAttributeLabels() {
    return [
        "strengthLabel", "dexterityLabel", "constitutionLabel",
        "intelligenceLabel", "wisdomLabel", "charismaLabel"
    ];
}

function sumLfAbilityPoints(abilityPoints) {
    if (!Array.isArray(abilityPoints)) return 0;
    return abilityPoints.reduce((sum, a) => sum + (Math.max(0, parseInt(a.points, 10) || 0)), 0);
}

function getLfPreDefinedFeatureMeta(label) {
    return CUSTOM_CLASS_LF_CONFIG.preDefinedFeatureMeta[label] || null;
}

/** Parameter-Schema eines Vordefiniert-Merkmals (feste LEVEL_VAL-Spaltenkeys). */
function getLfPreDefinedParameters(label) {
    const meta = getLfPreDefinedFeatureMeta(label);
    return Array.isArray(meta?.parameters) ? meta.parameters : [];
}

/** Default-Werte für Vordefiniert-Parameter aus dem Meta-Schema (inkl. feste Begleitwerte). */
function buildLfPreDefinedDefaultParameterValues(label) {
    const meta = getLfPreDefinedFeatureMeta(label);
    const values = {};
    getLfPreDefinedParameters(label).forEach(p => {
        if (!p?.key) return;
        values[p.key] = p.defaultValue != null ? p.defaultValue : (p.valueType === "number" ? 1 : "");
    });
    // Feste Begleitwerte (falls gesetzt) – nicht in der UI, aber für LEVEL_VAL
    if (meta?.fixedValues && typeof meta.fixedValues === "object") {
        Object.assign(values, meta.fixedValues);
    }
    return values;
}

/** Vordefiniert ohne Parameter → nur einmal (Klasse ODER je Unterklasse) */
function isLfPreDefinedOnceOnly(label) {
    return getLfPreDefinedParameters(label).length === 0;
}

/** Alle Basis-Slots der Klasse */
function getLfBaseClassLevelFeatureSlots(state) {
    const st = state || customClassEditorState;
    return Array.isArray(st?.levelFeatures) ? st.levelFeatures : [];
}

/** Prüft, ob Vordefiniert-Label bereits in Slot-Liste vorkommt */
function isLfPreDefinedLabelUsedInSlots(slots, label, excludeSlotId) {
    return (slots || []).some(s =>
        s
        && s.slotId !== excludeSlotId
        && s.payload?.featureType === "simple"
        && s.payload?.category === "preDefined"
        && s.payload?.optionsConfig?.preDefinedLabel === label
    );
}

/**
 * Darf Vordefiniert-Label auf diesem Slot gewählt werden?
 * Parameterlose: 1× in Basisklasse ODER 1× pro UC (nicht beides).
 */
function canSelectLfPreDefinedLabel(slot, label) {
    if (!slot || !label) return false;
    const current = slot.payload?.optionsConfig?.preDefinedLabel;
    if (current === label) return true;
    if (!isLfPreDefinedOnceOnly(label)) return true;

    const baseSlots = getLfBaseClassLevelFeatureSlots();
    const usedInBase = isLfPreDefinedLabelUsedInSlots(baseSlots, label, slot.slotId);

    if (isLfSubclassFeatureSlot(slot)) {
        if (usedInBase) return false;
        const scSlots = getLfSlotsForSlot(slot);
        return !isLfPreDefinedLabelUsedInSlots(scSlots, label, slot.slotId);
    }

    // Basis: bereits in Basis oder in irgendeiner UC
    if (usedInBase) return false;
    const subclasses = customClassEditorState?.subclasses || [];
    for (let i = 0; i < subclasses.length; i++) {
        if (isLfPreDefinedLabelUsedInSlots(subclasses[i].levelFeatures, label, slot.slotId)) {
            return false;
        }
    }
    return true;
}

/** Ordnungszahl eines Vordefiniert-Aufrufs (1 = erste, 2 = zweite, …) im gleichen Scope */
function getLfPreDefinedOccurrenceOrdinal(slot, label) {
    if (!slot || !label) return 1;
    const slots = (getLfSlotsForSlot(slot) || [])
        .filter(s =>
            s?.payload?.featureType === "simple"
            && s.payload?.category === "preDefined"
            && s.payload?.optionsConfig?.preDefinedLabel === label
        )
        .slice()
        .sort((a, b) => (a.level - b.level) || (a.index - b.index));
    const idx = slots.findIndex(s => s.slotId === slot.slotId);
    return idx >= 0 ? idx + 1 : 1;
}

/** Rohwert „1D6“ / „D6“ / „3“ → { count, die } */
function parseLfValueDieParameter(raw, fixedDie, defaultCount) {
    const die = String(fixedDie || "D6").toUpperCase();
    const fallbackCount = defaultCount != null ? defaultCount : 1;
    const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
    let m = s.match(/^(\d+)[×X]?D(\d+)$/);
    if (m) {
        return { count: Math.max(1, parseInt(m[1], 10) || fallbackCount), die: `D${m[2]}` };
    }
    if (/^D\d+$/.test(s)) return { count: fallbackCount, die: s };
    const n = parseInt(s, 10);
    if (Number.isFinite(n) && n > 0) return { count: n, die };
    return { count: fallbackCount, die };
}

function formatLfValueDieParameter(count, die) {
    const n = Math.max(1, parseInt(count, 10) || 1);
    const d = String(die || "D6").toUpperCase();
    return `${n}${d}`;
}

/** Würfelwert auf erlaubte Optionen normalisieren (z. B. 1D6 → D6). */
function normalizeLfDieParameterValue(raw, dieOptions, fallback) {
    const opts = Array.isArray(dieOptions) && dieOptions.length
        ? dieOptions
        : ["D4", "D6", "D8", "D10", "D12", "D20"];
    const fb = fallback || opts[0] || "D6";
    const s = String(raw ?? "").trim().toUpperCase();
    if (opts.includes(s)) return s;
    const match = s.match(/D(4|6|8|10|12|20)\b/);
    if (match) {
        const die = `D${match[1]}`;
        if (opts.includes(die)) return die;
    }
    return fb;
}

/** Auswahlwert auf erlaubte Optionen normalisieren (z. B. Rage-Schaden +1…+5). */
function normalizeLfSelectParameterValue(raw, selectOptions, fallback) {
    const opts = Array.isArray(selectOptions) ? selectOptions : [];
    const fb = fallback != null ? fallback : (opts[0] || "");
    const s = String(raw ?? "").trim();
    if (opts.includes(s)) return s;
    // "+2" vs "2" tolerieren
    const withPlus = s.startsWith("+") ? s : (s ? `+${s}` : "");
    if (withPlus && opts.includes(withPlus)) return withPlus;
    // Altbestand Sneak: "D6" → "1D6" wenn nD6-Optionen vorhanden
    const upper = s.toUpperCase();
    if (/^D(4|6|8|10|12|20)$/.test(upper)) {
        const asOne = `1${upper}`;
        if (opts.includes(asOne)) return asOne;
    }
    return fb;
}

/** classDataPartial-Flags für ein gewähltes Vordefiniert-Merkmal. */
function buildLfPreDefinedClassDataPartial(label) {
    const meta = getLfPreDefinedFeatureMeta(label);
    if (!meta) return null;
    const hasShort = !!meta.shortKey;
    const hasLong = !!meta.longKey;
    return {
        translationLabel: label,
        classFeatureShortDescription: meta.shortKey || 0,
        classFeatureDescription: meta.longKey || 0,
        choiceInStep3: 0,
        subclassCategoryNumber: 0,
        constForChoice: 0,
        classFeaturesStep2: hasShort ? 1 : 0,
        infoBox: hasShort ? 1 : 0,
        // Charakterbogen: 0–3 (+ optional :APPEND / :Pfad) – für Nutzer in der Maske unsichtbar
        classFeaturesCharacterSheet: meta.sheetFlag != null ? meta.sheetFlag : (hasLong ? 1 : 0)
    };
}

function ensureParameterRegistry(state) {
    const st = state || customClassEditorState;
    if (!Array.isArray(st.parameterRegistry)) st.parameterRegistry = [];
    return st.parameterRegistry;
}

const LF_SIMPLE_FREE_DIE_OPTIONS = ["D4", "D6", "D8", "D10", "D12", "D20"];

/**
 * Wert-/Würfel-Modus eines Frei-Parameters.
 * Altbestand ohne Flags → nur Wert (bisheriges Verhalten).
 */
function normalizeLfParameterValueMode(source) {
    let useValue = source?.useValue;
    let useDie = source?.useDie;
    if (useValue == null && useDie == null) {
        useValue = true;
        useDie = false;
    } else {
        useValue = !!useValue;
        useDie = !!useDie;
    }
    if (!useValue && !useDie) useValue = true;
    return { useValue, useDie };
}

/** Anzeige für Chip: „3“, „D8“ oder „2D6“ */
function formatLfSimpleFreeParamValueText(cfg, param) {
    const mode = normalizeLfParameterValueMode(param || cfg);
    if (mode.useValue && mode.useDie) {
        const n = parseInt(cfg?.value, 10) || 0;
        const die = normalizeLfDieParameterValue(cfg?.die, LF_SIMPLE_FREE_DIE_OPTIONS, "D6");
        return `${n}${die}`;
    }
    if (mode.useDie) {
        return normalizeLfDieParameterValue(cfg?.die, LF_SIMPLE_FREE_DIE_OPTIONS, "D6");
    }
    return String(parseInt(cfg?.value, 10) || 0);
}

function isLfSimpleFreeParamValueComplete(cfg, param) {
    if (!cfg?.parameterId) return false;
    const mode = normalizeLfParameterValueMode(param || cfg);
    if (mode.useValue) {
        const n = parseInt(cfg.value, 10);
        if (!(Number.isFinite(n) && n > 0)) return false;
    }
    if (mode.useDie) {
        const die = String(cfg.die || "").trim();
        if (!die) return false;
    }
    return true;
}

function getLfParameterById(parameterId) {
    if (!parameterId) return null;
    return ensureParameterRegistry().find(p => p.id === parameterId) || null;
}

function createLfParameterId() {
    return `param_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function getLfParameterDisplayName(parameterId) {
    const param = getLfParameterById(parameterId);
    if (!param) return "";
    const lang = getActiveUiLang();
    const other = lang === "de" ? "en" : "de";
    return param.names?.[lang] || param.names?.[other] || "";
}

/**
 * Merkmalsbezeichnung hochzählen: „Zähmen“ → „Zähmen 2“, „Zähmen 2“ → „Zähmen 3“.
 */
function incrementLfDesignationSuggestion(name) {
    const raw = String(name || "").trim();
    if (!raw) return "";
    const m = raw.match(/^(.*?)(?:\s+(\d+))?$/);
    const base = String(m?.[1] || "").trim() || raw;
    const n = m?.[2] ? parseInt(m[2], 10) : 1;
    const next = Number.isFinite(n) && n > 0 ? n + 1 : 2;
    return `${base} ${next}`.slice(0, CUSTOM_CLASS_LF_CONFIG.nameMax);
}

function buildLfSuggestedFeatureNamesFromSource(sourceNames) {
    const deSrc = String(sourceNames?.de || "").trim();
    const enSrc = String(sourceNames?.en || "").trim();
    return {
        de: incrementLfDesignationSuggestion(deSrc || enSrc),
        en: incrementLfDesignationSuggestion(enSrc || deSrc)
    };
}

function collectLfSlotsAnywhere() {
    const all = [];
    (customClassEditorState.levelFeatures || []).forEach(s => all.push(s));
    (customClassEditorState.subclasses || []).forEach(sc => {
        (sc.levelFeatures || []).forEach(s => all.push(s));
    });
    return all;
}

/** Frühere Einfach→Frei-Slots mit demselben Parameter (aufsteigend nach Stufe) */
function getLfSimpleFreeSlotsForParameter(parameterId, excludeSlotId) {
    if (!parameterId) return [];
    return collectLfSlotsAnywhere()
        .filter(s => s
            && s.slotId !== excludeSlotId
            && s.payload?.featureType === "simple"
            && s.payload?.category === "free"
            && s.payload?.optionsConfig?.parameterId === parameterId)
        .sort((a, b) => {
            const lvl = Number(a.level) - Number(b.level);
            if (lvl !== 0) return lvl;
            return Number(a.index) - Number(b.index);
        });
}

/**
 * Bei Parameter-Übernahme: Wert = letzter früherer Wert + 1;
 * Würfel = letzter gesetzter Würfel;
 * APPEND/Verbesserung nur bei gleichem Scope (Klasse↔Klasse bzw. dieselbe Unterklasse).
 * Parameter aus anderem Scope (z. B. Klasse → Unterklasse) nur Werte, kein improvesSlotId.
 */
function applyLfSimpleFreeExistingParamSuggestions(targetSlot, parameterId) {
    if (!targetSlot || !parameterId) return { value: null, die: null, mode: normalizeLfParameterValueMode(null) };
    const param = getLfParameterById(parameterId);
    const mode = normalizeLfParameterValueMode(param);
    const sources = getLfSimpleFreeSlotsForParameter(parameterId, targetSlot.slotId)
        .filter(s => isLfSlotEarlierThan(s, targetSlot));
    let suggestedValue = mode.useValue ? 2 : null;
    let suggestedDie = mode.useDie ? "D6" : null;
    if (sources.length) {
        const latest = sources[sources.length - 1];
        const latestCfg = latest.payload?.optionsConfig || {};
        if (mode.useValue) {
            const lastVal = parseInt(latestCfg.value, 10) || 1;
            suggestedValue = Math.max(1, Math.min(20, lastVal + 1));
        }
        if (mode.useDie) {
            suggestedDie = normalizeLfDieParameterValue(latestCfg.die, LF_SIMPLE_FREE_DIE_OPTIONS, "D6");
        }

        const cfg = { ...(targetSlot.payload.optionsConfig || {}) };
        // APPEND nur innerhalb desselben Scopes
        const sameScopeSources = sources.filter(s => isLfSameImproveScope(targetSlot, s));
        if (sameScopeSources.length) {
            const latestSame = sameScopeSources[sameScopeSources.length - 1];
            const root = resolveLfSimpleFreeRootSlot(latestSame);
            if (root && isLfSameImproveScope(targetSlot, root)) {
                cfg.improvesSlotId = root.slotId;
                if (!lfHasText(targetSlot.payload.names) && lfHasText(latestSame.payload?.names)) {
                    targetSlot.payload.names = buildLfSuggestedFeatureNamesFromSource(latestSame.payload.names);
                }
            } else {
                cfg.improvesSlotId = "";
            }
        } else {
            // Fremder Scope: Parameter ok, keine Merkmals-Verbesserung
            cfg.improvesSlotId = "";
        }
        targetSlot.payload.optionsConfig = cfg;
    }
    return { value: suggestedValue, die: suggestedDie, mode };
}

/**
 * DOM-Aktualisierung nach Parameter-Übernahme in der Einfach→Frei-Maske.
 * Wert/Würfel-Modus kommt fest aus dem Registry-Parameter.
 */
function onLfSimpleParamExistingChange(parameterId) {
    if (!ccLfFloatContext?.slotId) return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx?.slot) return;
    const locked = !!document.getElementById("ccLfParamSelectExisting")?.checked;
    syncLfSimpleParamModeControls(parameterId, { locked });
    if (!parameterId) return;
    const { value, die } = applyLfSimpleFreeExistingParamSuggestions(ctx.slot, parameterId);
    const valueEl = document.getElementById("ccLfParamValue");
    if (valueEl && value != null) valueEl.value = String(value);
    const dieEl = document.getElementById("ccLfParamDie");
    if (dieEl && die != null) dieEl.value = die;
}

/** Ob Slot A streng vor Slot B liegt (Stufe, dann Zeilenindex) */
function isLfSlotEarlierThan(a, b) {
    const aLvl = Number(a?.level);
    const bLvl = Number(b?.level);
    if (Number.isNaN(aLvl) || Number.isNaN(bLvl)) return false;
    if (aLvl !== bLvl) return aLvl < bLvl;
    return Number(a?.index) < Number(b?.index);
}

/** Manöver-Merkmal (Optionen → Manöver) */
function isLfManeuverOptionsSlot(slot) {
    return slot?.payload?.featureType === "options" && slot?.payload?.category === "maneuver";
}

/**
 * Letzte gesetzte Überlegenheitswürfel-Anzahl vor diesem Slot.
 * Wirkt wie ein vordefinierter Klassenparameter: spätere Stufen überschreiben.
 */
function getLfEarlierManeuverDice(slots, slot) {
    let best = null;
    let bestDice = null;
    (slots || []).forEach(s => {
        if (!s || s.slotId === slot?.slotId) return;
        if (!isLfManeuverOptionsSlot(s)) return;
        if (!isLfSlotEarlierThan(s, slot)) return;
        const dice = parseInt(s.payload?.optionsConfig?.maneuverDice, 10);
        if (!(dice > 0)) return;
        if (!best || isLfSlotEarlierThan(best, s)) {
            best = s;
            bestDice = dice;
        }
    });
    return bestDice;
}

/** Effektive Würfelanzahl für diesen Slot (eigene Angabe oder letzte frühere) */
function getLfManeuverDiceForSlot(slots, slot) {
    const own = parseInt(slot?.payload?.optionsConfig?.maneuverDice, 10);
    if (own > 0) return own;
    return getLfEarlierManeuverDice(slots, slot) || 4;
}

/** Optionen→Frei-Slots mit bereits gesetzten Optionseinträgen (für Übernahme) */
function getLfFreeOptionsCopySources(slots, excludeSlotId) {
    // Quellen: Basisklasse + alle Unterklassen (Übertragen auch Tab 2 ↔ Tab 3)
    const allSlots = [];
    (customClassEditorState.levelFeatures || []).forEach(s => allSlots.push(s));
    (customClassEditorState.subclasses || []).forEach(sc => {
        (sc.levelFeatures || []).forEach(s => allSlots.push(s));
    });
    // Fallback, falls nur lokaler Scope übergeben wurde und State noch leer ist
    if (!allSlots.length && Array.isArray(slots)) {
        slots.forEach(s => allSlots.push(s));
    }

    return allSlots
        .filter(s => s
            && s.slotId !== excludeSlotId
            && s.payload?.featureType === "options"
            && s.payload?.category === "free"
            && isLfOptionsConfigured(s))
        .sort((a, b) => {
            const aSc = a.subclassId ? 1 : 0;
            const bSc = b.subclassId ? 1 : 0;
            if (aSc !== bSc) return aSc - bSc;
            if (a.subclassId && b.subclassId && a.subclassId !== b.subclassId) {
                return String(a.subclassId).localeCompare(String(b.subclassId));
            }
            const lvl = Number(a.level) - Number(b.level);
            if (lvl !== 0) return lvl;
            return Number(a.index) - Number(b.index);
        });
}

/** Anzeige-Label für Frei-Optionen-Kopierquelle (Stufe + Merkmalsbezeichnung) */
function formatLfFreeOptionsCopySourceLabel(slot, sources) {
    const levelPart = (() => {
        const sameLevelCount = sources.filter(o =>
            Number(o.level) === Number(slot.level)
            && (o.subclassId || null) === (slot.subclassId || null)
        ).length;
        return sameLevelCount > 1
            ? `${tCC("ccLfColLevelLabel")} ${slot.level} (#${Number(slot.index) + 1})`
            : `${tCC("ccLfColLevelLabel")} ${slot.level}`;
    })();
    const designation = String(formatLfDesignation(slot) || "").trim();
    const namePart = designation && designation !== "—" ? designation : "";
    const basePart = namePart ? `${levelPart} · ${namePart}` : levelPart;
    if (!slot.subclassId) return basePart;
    const sc = findCustomClassSubclassById(slot.subclassId);
    const scTitle = getSubclassDisplayName(sc)
        || `${tCC("ccScBoxTitleLabel")} ${sc?.subclassCategoryNumber || ""}`.trim();
    return `${scTitle} · ${basePart}`;
}

/** Slot in Basisklasse oder Unterklassen finden */
function findLfSlotAnywhere(slotId) {
    if (!slotId) return null;
    const base = (customClassEditorState.levelFeatures || []).find(s => s.slotId === slotId);
    if (base) return base;
    for (const sc of (customClassEditorState.subclasses || [])) {
        const hit = (sc.levelFeatures || []).find(s => s.slotId === slotId);
        if (hit) return hit;
    }
    return null;
}

/** Unabhängige Kopie der Frei-Optionseinträge */
function cloneLfFreeChoices(choices) {
    return (choices || []).map(c => ({
        names: {
            de: String(c?.names?.de || c?.de || ""),
            en: String(c?.names?.en || c?.en || "")
        },
        descriptions: {
            de: String(c?.descriptions?.de || ""),
            en: String(c?.descriptions?.en || "")
        }
    }));
}

//=======================================================================
// 1.x CHOICE / LEVEL_VAL-Tags & Merkmals-Verkettung (Frei / Verbesserung)
//=======================================================================

/** [CHOICE_LIST]classForm.freeChoices:familyId[/CHOICE_LIST] */
function buildLfFreeChoicesChoiceListTag(familyId) {
    const id = String(familyId || "").trim();
    return id
        ? `[CHOICE_LIST]classForm.freeChoices:${id}[/CHOICE_LIST]`
        : "[CHOICE_LIST]classForm.freeChoices[/CHOICE_LIST]";
}

/** Vorhandene Freiwahl-CHOICE_LIST-Tags entfernen */
function stripLfFreeChoicesChoiceListTags(text) {
    return String(text || "")
        .replace(/\[CHOICE_LIST\]\s*classForm\.freeChoices(?::[^\]]+)?\s*\[\/CHOICE_LIST\]/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/** CHOICE_LIST-Tag in Langbeschreibung sicherstellen (im Editor als Alias-Chip). */
function ensureLfFreeChoicesChoiceListTagInText(text, familyId) {
    const tag = buildLfFreeChoicesChoiceListTag(familyId);
    const max = CUSTOM_CLASS_LF_CONFIG.descMax || 500;
    let body = stripLfFreeChoicesChoiceListTags(text);
    const room = Math.max(0, max - tag.length - 1);
    body = body.slice(0, room).trim();
    if (!body) return tag;
    return `${body}\n${tag}`;
}

function buildLfLevelValTag(parameterId) {
    return `[LEVEL_VAL]${parameterId}[/LEVEL_VAL]`;
}

/** Anzeigeblock: „Parameterbezeichnung: [LEVEL_VAL]…[/LEVEL_VAL]“ (pro Sprache). */
function buildLfLevelValTokenBlock(parameterId, lang) {
    const tag = buildLfLevelValTag(parameterId);
    if (!parameterId) return tag;
    const param = getLfParameterById(parameterId);
    const other = lang === "de" ? "en" : "de";
    const name = String(param?.names?.[lang] || param?.names?.[other] || "").trim();
    return name ? `${name}: ${tag}` : tag;
}

/** LEVEL_VAL-Tag (inkl. optionaler Parameterbezeichnung davor) entfernen. */
function stripLfLevelValTagInText(text, parameterId) {
    let t = String(text || "");
    if (parameterId) {
        const escaped = String(parameterId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // „Name: [LEVEL_VAL]id[/LEVEL_VAL]“ oder nackter Tag
        t = t.replace(
            new RegExp(`(?:^|\\n)[^\\n]*?:\\s*\\[LEVEL_VAL\\]\\s*${escaped}\\s*\\[\\/LEVEL_VAL\\]`, "gi"),
            "\n"
        );
        t = t.replace(new RegExp(`\\[LEVEL_VAL\\]\\s*${escaped}\\s*\\[\\/LEVEL_VAL\\]`, "gi"), "");
    } else {
        t = t.replace(/(?:^|\n)[^\n]*?:\s*\[LEVEL_VAL\][\s\S]*?\[\/LEVEL_VAL\]/gi, "\n");
        t = t.replace(/\[LEVEL_VAL\][\s\S]*?\[\/LEVEL_VAL\]/gi, "");
    }
    return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** LEVEL_VAL-Tag inkl. Parameterbezeichnung in Freitext sicherstellen. */
function ensureLfLevelValTagInText(text, parameterId, lang = "de") {
    if (!parameterId) return String(text || "");
    const block = buildLfLevelValTokenBlock(parameterId, lang);
    const max = CUSTOM_CLASS_LF_CONFIG.descMax || 500;
    let t = stripLfLevelValTagInText(text, parameterId);
    const trimmed = t.trim();
    const combined = trimmed ? `${trimmed}\n${block}` : block;
    return combined.slice(0, max);
}

/**
 * Editor-Hinweis für classFeaturesCharacterSheet (Compile setzt APPEND/0 final).
 */
function resolveLfEditorSheetFlagHint(slot, hasLong) {
    if (!hasLong) return 0;
    const type = slot?.payload?.featureType;
    const cat = slot?.payload?.category;
    const cfg = slot?.payload?.optionsConfig || {};
    if (type === "options" && cat === "free" && cfg.extendsSlotId) return 0;
    if (type === "simple" && cat === "free" && cfg.improvesSlotId) return 1;
    return 1;
}

/** Stabile Familien-ID für Optionen→Frei (Meisterschafts-Muster). */
function ensureLfFreeOptionsFamilyId(slot) {
    if (!slot?.payload) return "";
    const cfg = slot.payload.optionsConfig || {};
    if (cfg.featureFamilyId) return cfg.featureFamilyId;

    if (cfg.extendsSlotId) {
        const parent = findLfSlotAnywhere(cfg.extendsSlotId);
        if (parent) {
            const parentId = ensureLfFreeOptionsFamilyId(parent);
            if (parentId) {
                cfg.featureFamilyId = parentId;
                slot.payload.optionsConfig = cfg;
                return parentId;
            }
        }
    }

    cfg.featureFamilyId = `fc_${slot.slotId}`;
    slot.payload.optionsConfig = cfg;
    return cfg.featureFamilyId;
}

/** Alle Optionen→Frei-Slots derselben Merkmalsfamilie (aufsteigend). */
function getLfFreeOptionsFamilySlots(slot) {
    if (!slot?.payload) return [];
    const familyId = ensureLfFreeOptionsFamilyId(slot);
    if (!familyId) return [slot];
    return collectLfSlotsAnywhere()
        .filter(s => s
            && s.payload?.featureType === "options"
            && s.payload?.category === "free"
            && ensureLfFreeOptionsFamilyId(s) === familyId)
        .sort((a, b) => {
            const lvl = Number(a.level) - Number(b.level);
            if (lvl !== 0) return lvl;
            return Number(a.index) - Number(b.index);
        });
}

/**
 * Slot, der den System-Token-Alias tragen darf:
 * höchste Stufe der Verbesserungs-/Familienkette (allein = sich selbst).
 */
function getLfDescSystemTokenOwnerSlot(slot) {
    if (!slot?.payload) return null;
    const type = slot.payload.featureType;
    const cat = slot.payload.category;

    if (type === "simple" && cat === "free") {
        if (!slot.payload.optionsConfig?.parameterId) return null;
        const root = resolveLfSimpleFreeRootSlot(slot);
        const chain = getLfSimpleFreeImproveChainSlots(root, null);
        if (!chain.length) return slot;
        return chain[chain.length - 1];
    }

    if (type === "options" && cat === "free") {
        const family = getLfFreeOptionsFamilySlots(slot);
        if (!family.length) return slot;
        return family[family.length - 1];
    }

    return null;
}

/** Alias-Chip nur am Token-Owner (nicht an Wurzeln mit späteren Verbesserungen). */
function shouldShowLfDescSystemTokenUi(slot) {
    const owner = getLfDescSystemTokenOwnerSlot(slot);
    return !!(owner && owner.slotId === slot.slotId);
}

/** CHOICE_LIST in alle Langbeschreibungs-Sprachen eines Optionen→Frei-Slots. */
function ensureLfFreeOptionsChoiceTagsOnSlot(slot) {
    if (!(slot?.payload?.featureType === "options" && slot.payload.category === "free")) return;
    const familyId = ensureLfFreeOptionsFamilyId(slot);
    const descs = slot.payload.descriptions || { de: "", en: "" };
    if (!shouldShowLfDescSystemTokenUi(slot) || slot.payload.descSystemToken === false) {
        slot.payload.descriptions = {
            de: stripLfFreeChoicesChoiceListTags(descs.de),
            en: stripLfFreeChoicesChoiceListTags(descs.en)
        };
        return;
    }
    slot.payload.descriptions = {
        de: ensureLfFreeChoicesChoiceListTagInText(descs.de, familyId),
        en: ensureLfFreeChoicesChoiceListTagInText(descs.en, familyId)
    };
}

/** LEVEL_VAL in Langbeschreibung, wenn Parameter gesetzt. */
function ensureLfSimpleFreeLevelValTagsOnSlot(slot) {
    if (!(slot?.payload?.featureType === "simple" && slot.payload.category === "free")) return;
    const parameterId = slot.payload.optionsConfig?.parameterId;
    if (!parameterId) return;
    const descs = slot.payload.descriptions || { de: "", en: "" };
    if (!shouldShowLfDescSystemTokenUi(slot) || slot.payload.descSystemToken === false) {
        slot.payload.descriptions = {
            de: stripLfLevelValTagInText(descs.de, parameterId),
            en: stripLfLevelValTagInText(descs.en, parameterId)
        };
        return;
    }
    slot.payload.descriptions = {
        de: ensureLfLevelValTagInText(descs.de, parameterId, "de"),
        en: ensureLfLevelValTagInText(descs.en, parameterId, "en")
    };
}

/**
 * Spec für System-Token in der Langbeschreibung (Alias-Chip statt Roh-TAG).
 * null = kein Token für diesen Slot.
 */
function getLfDescSystemTokenSpec(slot) {
    if (!slot?.payload) return null;
    const type = slot.payload.featureType;
    const cat = slot.payload.category;

    if (type === "simple" && cat === "free") {
        const parameterId = slot.payload.optionsConfig?.parameterId;
        if (!parameterId) return null;
        return {
            kind: "levelVal",
            labelKey: "ccLfDescTokenParameterLabel",
            parameterId,
            stripText: (t) => stripLfLevelValTagInText(t, parameterId),
            ensureText: (t, lang) => ensureLfLevelValTagInText(t, parameterId, lang || "de")
        };
    }

    if (type === "options" && cat === "free") {
        const familyId = ensureLfFreeOptionsFamilyId(slot);
        return {
            kind: "choiceList",
            labelKey: "ccLfDescTokenChoicesLabel",
            stripText: (t) => stripLfFreeChoicesChoiceListTags(t),
            ensureText: (t) => ensureLfFreeChoicesChoiceListTagInText(t, familyId)
        };
    }

    return null;
}

function isLfDescSystemTokenEnabled(slot) {
    if (!getLfDescSystemTokenSpec(slot)) return false;
    return slot.payload.descSystemToken !== false;
}

/** Token-Flag des Ketten-Owners (für Compile auch am Stamm). */
function isLfDescSystemTokenEnabledOnOwner(slot) {
    const owner = getLfDescSystemTokenOwnerSlot(slot);
    if (!owner) return false;
    if (!getLfDescSystemTokenSpec(owner) && !getLfDescSystemTokenSpec(slot)) return false;
    return owner.payload.descSystemToken !== false;
}

function setLfDescSystemTokenEnabled(slot, enabled) {
    if (!slot?.payload) return;
    slot.payload.descSystemToken = !!enabled;
}

/** Anzeigewerte ohne System-Tags */
function getLfDescDisplayValues(slot) {
    const descs = slot.payload?.descriptions || { de: "", en: "" };
    const spec = getLfDescSystemTokenSpec(slot);
    if (!spec) return { de: descs.de || "", en: descs.en || "" };
    return {
        de: spec.stripText(descs.de),
        en: spec.stripText(descs.en)
    };
}

function buildLfDescSystemTokenLabelHtml(spec) {
    const currentLabel = escapeLfHtml(tCC(spec.labelKey));
    if (spec.kind === "levelVal" && spec.parameterId) {
        const paramName = String(getLfParameterDisplayName(spec.parameterId) || "").trim();
        if (paramName) {
            return `${escapeLfHtml(paramName)}: ${currentLabel}`;
        }
    }
    return currentLabel;
}

function buildLfDescSystemTokenBarHtml(spec, enabled) {
    if (!spec) return "";
    const label = buildLfDescSystemTokenLabelHtml(spec);
    if (enabled) {
        return `
            <div class="cc-lf-desc-token" data-token-kind="${escapeLfAttr(spec.kind)}">
                <span class="cc-lf-desc-token-label">${label}</span>
                <button type="button" class="cc-lf-desc-token-remove" onclick="onLfDescSystemTokenRemove(event)"
                    aria-label="×">×</button>
            </div>`;
    }
    return `
        <button type="button" class="cc-lf-desc-token cc-lf-desc-token--add" data-token-kind="${escapeLfAttr(spec.kind)}"
            onclick="onLfDescSystemTokenAdd(event)">
            <span class="cc-lf-desc-token-label">
                <span class="cc-lf-desc-token-plus" aria-hidden="true">+</span>
                ${label}
            </span>
            <span class="cc-lf-desc-token-remove cc-lf-desc-token-remove--spacer" aria-hidden="true"></span>
        </button>`;
}

/** Textareas → Slot (ohne/mit Token je nach Flag) */
function syncLfDescLongFromDom(slot, forceTokenEnabled) {
    const spec = getLfDescSystemTokenSpec(slot);
    const showUi = shouldShowLfDescSystemTokenUi(slot);
    const enabled = showUi && (forceTokenEnabled != null
        ? !!forceTokenEnabled
        : isLfDescSystemTokenEnabled(slot));
    slot.payload.descriptions = slot.payload.descriptions || { de: "", en: "" };
    const max = CUSTOM_CLASS_LF_CONFIG.descMax || 500;
    ensureAvailableLanguages(customClassEditorState).forEach(lang => {
        const el = document.getElementById(`ccLfLong_${lang}`);
        let body = el ? el.value.trim() : String(slot.payload.descriptions[lang] || "");
        if (spec) body = spec.stripText(body);
        if (spec && enabled) body = spec.ensureText(body, lang);
        slot.payload.descriptions[lang] = String(body || "").slice(0, max);
    });
    if (spec && showUi) setLfDescSystemTokenEnabled(slot, enabled);
}

function refreshLfFloatDescBodyFromSlot(slot) {
    const bodyEl = document.getElementById("ccLfFloatBody");
    if (!bodyEl || !slot) return;
    bodyEl.innerHTML = buildLfFloatDescBody(slot);
    bindLfFloatCharCounters(bodyEl);
}

function onLfDescSystemTokenRemove(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!ccLfFloatContext || ccLfFloatContext.mode !== "desc") return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx?.slot) return;
    syncLfDescLongFromDom(ctx.slot, false);
    refreshLfFloatDescBodyFromSlot(ctx.slot);
}

function onLfDescSystemTokenAdd(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!ccLfFloatContext || ccLfFloatContext.mode !== "desc") return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx?.slot) return;
    syncLfDescLongFromDom(ctx.slot, true);
    refreshLfFloatDescBodyFromSlot(ctx.slot);
}

function buildLfLongDescSectionHtml(slot) {
    const spec = getLfDescSystemTokenSpec(slot);
    const showUi = !!(spec && shouldShowLfDescSystemTokenUi(slot));
    const enabled = showUi && isLfDescSystemTokenEnabled(slot);
    if (showUi && enabled) {
        if (spec.kind === "levelVal") ensureLfSimpleFreeLevelValTagsOnSlot(slot);
        if (spec.kind === "choiceList") ensureLfFreeOptionsChoiceTagsOnSlot(slot);
    } else if (spec) {
        // Nicht-Owner / deaktiviert: Roh-Tags aus dem Payload halten
        if (spec.kind === "levelVal") ensureLfSimpleFreeLevelValTagsOnSlot(slot);
        if (spec.kind === "choiceList") ensureLfFreeOptionsChoiceTagsOnSlot(slot);
    }
    const values = spec ? getLfDescDisplayValues(slot) : (slot.payload.descriptions || { de: "", en: "" });
    return `
        <div class="cc-lf-desc-section">
            <div class="cc-lf-float-field-label">${tCC("ccLfChipLongLabel")}</div>
            ${renderLfFloatLangFields("ccLfLong", values, CUSTOM_CLASS_LF_CONFIG.descMax, true)}
            ${showUi ? buildLfDescSystemTokenBarHtml(spec, enabled) : ""}
        </div>`;
}

/** Langbeschreibung „gesetzt“ inkl. aktivem System-Token (nur Token-Owner). */
function lfHasLongDescriptionContent(slot) {
    if (slot?.payload?.featureType === "spellcraft"
        && (slot.payload?.category === "choosePreparedSpell"
            || slot.payload?.category === "getPreparedSpell")) {
        const addToBook = customClassStateUsesSpellbook()
            && slot.payload.optionsConfig?.addToSpellbook !== false;
        if (addToBook) return false;
        return true;
    }
    if (lfHasText(getLfDescDisplayValues(slot))) return true;
    return shouldShowLfDescSystemTokenUi(slot) && isLfDescSystemTokenEnabled(slot);
}

/** Gleicher Verbesserungs-Scope: Basisklasse untereinander, Unterklasse nur innerhalb derselben */
function isLfSameImproveScope(slotA, slotB) {
    if (!slotA || !slotB) return false;
    return (slotA.subclassId || null) === (slotB.subclassId || null);
}

/** Frühere Einfach→Frei-Merkmale als Verbesserungsziele (nur Ausgangsmerkmale, gleicher Scope) */
function getLfSimpleFreeImproveSources(targetSlot) {
    if (!targetSlot) return [];
    return collectLfSlotsAnywhere()
        .filter(s => s
            && s.slotId !== targetSlot.slotId
            && s.payload?.featureType === "simple"
            && s.payload?.category === "free"
            && lfHasText(s.payload?.names)
            && !s.payload?.optionsConfig?.improvesSlotId
            && isLfSameImproveScope(targetSlot, s)
            && isLfSlotEarlierThan(s, targetSlot))
        .sort((a, b) => {
            const lvl = Number(a.level) - Number(b.level);
            if (lvl !== 0) return lvl;
            return Number(a.index) - Number(b.index);
        });
}

/** Ausgangsmerkmal einer Verbesserungskette (improvesSlotId → Wurzel) */
function resolveLfSimpleFreeRootSlot(slot) {
    let current = slot;
    const seen = new Set();
    while (current?.payload?.optionsConfig?.improvesSlotId) {
        const parentId = current.payload.optionsConfig.improvesSlotId;
        if (seen.has(parentId)) break;
        seen.add(parentId);
        const parent = findLfSlotAnywhere(parentId);
        if (!parent) break;
        // Abbruch bei Scope-Wechsel (ungültige Alt-Daten)
        if (!isLfSameImproveScope(slot, parent)) break;
        current = parent;
    }
    return current || slot;
}

/**
 * Alle Merkmale einer Verbesserungskette (Wurzel + Verbesserungen), aufsteigend nach Stufe.
 * Nur gleicher Scope; excludeSlotId: aktueller Slot auslassen.
 */
function getLfSimpleFreeImproveChainSlots(rootSlot, excludeSlotId) {
    if (!rootSlot?.slotId) return [];
    const rootId = rootSlot.slotId;
    return collectLfSlotsAnywhere()
        .filter(s => {
            if (!s || s.slotId === excludeSlotId) return false;
            if (s.payload?.featureType !== "simple" || s.payload?.category !== "free") return false;
            if (!isLfSameImproveScope(rootSlot, s)) return false;
            if (s.slotId === rootId) return true;
            const improves = s.payload?.optionsConfig?.improvesSlotId;
            if (!improves) return false;
            const chainRoot = resolveLfSimpleFreeRootSlot(s);
            return chainRoot?.slotId === rootId;
        })
        .sort((a, b) => {
            const lvl = Number(a.level) - Number(b.level);
            if (lvl !== 0) return lvl;
            return Number(a.index) - Number(b.index);
        });
}

/**
 * Höchste/letzte Stufe in der Kette (für Namens- & Parameter-Vorschläge).
 * Ohne Verbesserungen → Wurzel selbst.
 */
function getLfSimpleFreeLatestInImproveChain(rootSlot, excludeSlotId) {
    const target = excludeSlotId ? findLfSlotAnywhere(excludeSlotId) : null;
    const chain = getLfSimpleFreeImproveChainSlots(rootSlot, excludeSlotId);
    const earlier = target
        ? chain.filter(s => isLfSlotEarlierThan(s, target))
        : chain;
    if (!earlier.length) return rootSlot;
    return earlier[earlier.length - 1];
}

function formatLfSimpleFreeImproveSourceLabel(slot) {
    const lang = getActiveUiLang();
    const other = lang === "de" ? "en" : "de";
    const name = slot?.payload?.names?.[lang] || slot?.payload?.names?.[other] || "—";
    const lvl = Number(slot?.level) || 1;
    return `${name} (${tCC("levelLabel2", "Stufe")} ${lvl})`;
}

/**
 * Verbesserung + Parameter von Quell-Merkmal übernehmen.
 * Verbesserungsziel = immer Wurzel im gleichen Scope;
 * Vorschläge (Name/Parameter) = letzte höchste Stufe der Kette.
 */
function applyLfSimpleFreeImproveFromSource(targetSlot, sourceSlotId, { forceNames = false } = {}) {
    if (!targetSlot) return;
    const cfg = { ...(targetSlot.payload.optionsConfig || {}) };
    if (!sourceSlotId) {
        cfg.improvesSlotId = "";
        targetSlot.payload.optionsConfig = cfg;
        return;
    }
    let source = findLfSlotAnywhere(sourceSlotId);
    if (!source) return;

    // Nur Ausgangsmerkmale als Verbesserungsziel erlauben
    if (source.payload?.optionsConfig?.improvesSlotId) {
        source = resolveLfSimpleFreeRootSlot(source);
        if (!source || source.slotId === targetSlot.slotId) return;
    }

    // Kein APPEND über Klasse ↔ Unterklasse hinweg
    if (!isLfSameImproveScope(targetSlot, source)) {
        cfg.improvesSlotId = "";
        targetSlot.payload.optionsConfig = cfg;
        return;
    }

    const root = source;
    cfg.improvesSlotId = root.slotId;

    // Vorschläge aus der höchsten bestehenden Verbesserung (nicht aus der Wurzel allein)
    const latest = getLfSimpleFreeLatestInImproveChain(root, targetSlot.slotId) || root;

    if (forceNames || !lfHasText(targetSlot.payload.names)) {
        targetSlot.payload.names = buildLfSuggestedFeatureNamesFromSource(latest.payload?.names);
    }

    const latestCfg = latest.payload?.optionsConfig || {};
    if (latestCfg.parameterId) {
        cfg.selectExisting = true;
        cfg.parameterId = latestCfg.parameterId;
        const param = getLfParameterById(latestCfg.parameterId);
        const mode = normalizeLfParameterValueMode(param);
        cfg.useValue = mode.useValue;
        cfg.useDie = mode.useDie;
        if (mode.useValue) {
            const lastVal = parseInt(latestCfg.value, 10) || 1;
            cfg.value = Math.max(1, Math.min(20, lastVal + 1));
        }
        if (mode.useDie) {
            cfg.die = normalizeLfDieParameterValue(latestCfg.die, LF_SIMPLE_FREE_DIE_OPTIONS, "D6");
        }
    }
    targetSlot.payload.optionsConfig = cfg;
    ensureLfSimpleFreeLevelValTagsOnSlot(targetSlot);
}

/** Compile-Meta für Familien-Stamm, APPEND-Ziele und Slot-Labels */
function createCompiledSlotLinkMeta(state) {
    return {
        state: state || null,
        labelBySlotId: new Map(),
        freeFamilyRoot: new Map()
    };
}

/** Slot in einem Compile-/Editor-State finden (Basisklasse oder Unterklasse) */
function findLfSlotInState(state, slotId) {
    if (!slotId || !state) return null;
    const base = (state.levelFeatures || []).find(s => s.slotId === slotId);
    if (base) return base;
    for (const sc of (state.subclasses || [])) {
        const hit = (sc.levelFeatures || []).find(s => s.slotId === slotId);
        if (hit) {
            if (!hit.subclassId && sc.id) hit.subclassId = sc.id;
            return hit;
        }
    }
    return null;
}

/** Ob ein vordefiniertes Merkmal bereits früher (Stufe/Index) gesetzt ist */
function hasLfPreDefinedOnEarlierLevel(slots, label, level, excludeSlotId, index = Number.POSITIVE_INFINITY) {
    const needLvl = Number(level);
    const needIdx = Number(index);
    return (slots || []).some(s => {
        if (!s || s.slotId === excludeSlotId) return false;
        const sLvl = Number(s.level);
        const sIdx = Number(s.index);
        // Frühere Stufe, oder gleiche Stufe mit kleinerem Zeilenindex
        const isEarlier = sLvl < needLvl || (sLvl === needLvl && sIdx < needIdx);
        if (!isEarlier || Number.isNaN(sLvl) || Number.isNaN(needLvl)) return false;
        if (s.payload?.featureType !== "simple" || s.payload?.category !== "preDefined") return false;
        const stored = s.payload.optionsConfig?.preDefinedLabel;
        if (!stored) return false;
        if (stored === label) return true;
        // Alias-Toleranz (PHB-Keys ohne „Label“-Suffix)
        const aliases = {
            extraAttackLabel: ["extraAttack", "extraAttackLabel"],
            twoExtraAttacksLabel: ["twoExtraAttacks", "twoExtraAttacksLabel"],
            threeExtraAttacksLabel: ["threeExtraAttacks", "threeExtraAttacksLabel"]
            // unarmoredDefense / unarmoredDefenseLabel bewusst getrennt (Barbar ≠ Mönch)
        };
        return (aliases[label] || []).includes(stored);
    });
}

function isLfSimpleSpellcastingTaken(slots, excludeSlotId) {
    return (slots || []).some(s =>
        s.slotId !== excludeSlotId
        && s.payload.featureType === "simple"
        && s.payload.category === "spellcasting"
    );
}

/** Attribut → Verteilung: nur einmal pro Basisklasse (nicht in Unterklassen) */
function isLfAttributeDistributionTaken(slots, excludeSlotId) {
    return (slots || []).some(s =>
        s.slotId !== excludeSlotId
        && !isLfSubclassFeatureSlot(s)
        && s.payload.featureType === "attribute"
        && s.payload.category === "distribution"
    );
}

/** Attribut→Verteilung ist in Unterklassen-Merkmalen gesperrt */
function isLfAttributeDistributionBlockedForSlot(slot) {
    if (!isLfSubclassFeatureSlot(slot)) return false;
    const blocked = CUSTOM_CLASS_SC_CONFIG.blockedAttributeCategories || [];
    return blocked.includes("distribution");
}

/**
 * Erlaubte Kategorien für Typ/Slot-Kontext (Basisklasse vs. Unterklasse).
 * Später auch vom Standalone-Unterklasseneditor nutzbar.
 */
function getLfAllowedCategoriesForSlot(slot, type) {
    let cats = (CUSTOM_CLASS_LF_CONFIG.categoriesByType[type] || [])
        .filter(c => c && c !== "none");
    if (type === "attribute" && isLfAttributeDistributionBlockedForSlot(slot)) {
        cats = cats.filter(c => c !== "distribution");
    }
    if (type === "spellcraft") {
        // Unterklassenzauber nur in UC; immer anzeigen wenn Voraussetzung erfüllt
        // (auch bei Rest 0 → ausgegraut mit „(0)“)
        if (!isLfSubclassFeatureSlot(slot)) {
            cats = cats.filter(c => c !== "subclassSpells");
        } else {
            const baseLvl = getLfBaseSpellcastingLevel(customClassEditorState);
            const prereqOk = hasLfBaseClassSpellcasting(customClassEditorState)
                && (baseLvl == null || (Number(slot.level) || 0) >= baseLvl);
            cats = cats.filter(c => {
                if (c !== "subclassSpells") return true;
                return prereqOk || slot.payload?.category === "subclassSpells";
            });
        }
    }
    return cats;
}

/** Altbestand: Verteilung auf Unterklassen-Slots entfernen */
function sanitizeLfSubclassAttributeDistribution(slot) {
    if (!isLfAttributeDistributionBlockedForSlot(slot)) return false;
    if (slot.payload?.featureType !== "attribute") return false;
    if (slot.payload.category !== "distribution") return false;
    slot.payload.category = null;
    slot.payload.optionsConfig = null;
    return true;
}

/** Klassen mit Spellcasting als Zauberlisten-Quelle (voller PHB-Satz) */
function getLfSpellcastingClassOptions() {
    if (typeof classCoreTraitsList === "undefined") return [];
    return classCoreTraitsList
        .filter(c => c.spellcastingLabel === 1 && !c.isCustom)
        .map(c => c.translationLabel);
}

/** Einheitliche Schriftfarben der Zauberlisten für alle Masken (CSS-Klassen in style.css) */
const CC_SPELL_LIST_COLOR_CLASS_MAP = {
    bard: "cc-spell-list-color--bard",
    druid: "cc-spell-list-color--druid",
    warlock: "cc-spell-list-color--warlock",
    cleric: "cc-spell-list-color--cleric",
    wizard: "cc-spell-list-color--wizard",
    paladin: "cc-spell-list-color--paladin",
    ranger: "cc-spell-list-color--ranger",
    sorcerer: "cc-spell-list-color--sorcerer"
};

function getSpellListColorClass(label) {
    return CC_SPELL_LIST_COLOR_CLASS_MAP[label] || "";
}

function getLfSpellSchoolLabels() {
    return [
        "abjurationLabel", "conjurationLabel", "divinationLabel", "enchantmentLabel",
        "evocationLabel", "illusionLabel", "necromancyLabel", "transmutationLabel"
    ];
}

function getLfPreparedSpellLevelLabels() {
    return [
        "1stLevelLabel", "2ndLevelLabel", "3rdLevelLabel", "4thLevelLabel", "5thLevelLabel",
        "6thLevelLabel", "7thLevelLabel", "8thLevelLabel", "9thLevelLabel"
    ];
}

/** Alle fest vergebenen Zauberkunst-Zauber (global einmalig) */
function getLfUsedSpellcraftSpellLabels(slots, excludeSlotId) {
    const used = new Set();
    const visit = (list) => {
        (list || []).forEach(s => {
            if (!s || s.slotId === excludeSlotId) return;
            if (s.payload?.featureType !== "spellcraft") return;
            const cfg = s.payload.optionsConfig || {};
            const cat = s.payload.category;
            if (cat === "getCantrip" && Array.isArray(cfg.selectedSpells)) {
                cfg.selectedSpells.forEach(lab => { if (lab) used.add(lab); });
            }
            if ((cat === "getPreparedSpell" || cat === "subclassSpells")
                && cfg.selectedByLevel && typeof cfg.selectedByLevel === "object") {
                Object.values(cfg.selectedByLevel).forEach(arr => {
                    if (!Array.isArray(arr)) return;
                    arr.forEach(lab => { if (lab) used.add(lab); });
                });
            }
        });
    };
    visit(slots);
    // Auch Basisklasse + alle Unterklassen einbeziehen, wenn nur ein Scope übergeben wurde
    if (typeof customClassEditorState !== "undefined") {
        visit(customClassEditorState.levelFeatures);
        (customClassEditorState.subclasses || []).forEach(sc => visit(sc.levelFeatures));
    }
    return used;
}

/**
 * Filtert spellList nach Listen / Schule / Grad.
 * excludeUsed: global bereits vergebene Labels ausblenden.
 */
function filterLfSpells({
    listMode = "all",
    spellListLabels = [],
    schoolMode = "all",
    schoolLabels = [],
    levelLabels = null,
    onlyCantrips = false,
    excludeUsed = null
} = {}) {
    if (typeof spellList === "undefined") return [];
    const lists = Array.isArray(spellListLabels) ? spellListLabels : [];
    const schools = Array.isArray(schoolLabels) ? schoolLabels : [];
    const levels = levelLabels == null
        ? null
        : (Array.isArray(levelLabels) ? levelLabels : []);

    return spellList.filter(spell => {
        const label = spell.translationLabel;
        if (!label) return false;
        if (excludeUsed && excludeUsed.has(label)) return false;

        const isCantrip = spell.spellLevel === "cantripLabel";
        if (onlyCantrips && !isCantrip) return false;
        if (!onlyCantrips && levels) {
            if (levels.length === 0) return false;
            // Cantrips nur wenn explizit in levelLabels erlaubt (z. B. Magieprogression)
            if (isCantrip) return levels.includes("cantripLabel");
            if (!levels.includes(spell.spellLevel)) return false;
        }

        if (listMode === "selection") {
            if (!lists.length) return false;
            const classes = Array.isArray(spell.classLabel) ? spell.classLabel : [spell.classLabel];
            if (!lists.some(l => classes.includes(l))) return false;
        }

        if (schoolMode === "selection") {
            if (!schools.length) return false;
            if (!schools.includes(spell.spellSchool)) return false;
        }

        return true;
    });
}

function buildLfSpellDropdownOptionsHtml(spells, selectedValue, usedElsewhere) {
    const sorted = [...spells].sort((a, b) =>
        tCC(a.translationLabel).localeCompare(tCC(b.translationLabel), currentLang || "de")
    );
    let html = `<option value="">${tCC("pleaseSelectLabel")}</option>`;
    sorted.forEach(spell => {
        const lab = spell.translationLabel;
        if (usedElsewhere && usedElsewhere.has(lab) && lab !== selectedValue) return;
        const selected = lab === selectedValue ? "selected" : "";
        html += `<option value="${lab}" ${selected}>${escapeLfHtml(tCC(lab))}</option>`;
    });
    return html;
}

/** Alle/Auswahl-Filterblock (Listen, Schulen, Grade) */
function buildLfSpellcraftFilterBlockHtml({
    headingKey,
    modeId,
    listId,
    mode,
    items,
    selectedSet,
    minHint = 1,
    onchangeExtra = ""
}) {
    const showSelection = mode === "selection";
    return `
        ${buildLfControlRowHtml(
            buildLfOptionsFilterHeadingHtml(headingKey),
            `<select id="${modeId}" class="dropdown cc-lf-float-input cc-lf-options-filter"
                onchange="document.getElementById('${listId}Wrap').style.display=this.value==='selection'?'block':'none';${onchangeExtra}">
                <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
            </select>`
        )}
        <div id="${listId}Wrap" style="display:${showSelection ? "block" : "none"};">
            <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(minHint)}</p>
            ${buildLfCheckboxGridHtml(listId, items, selectedSet)}
        </div>
    `;
}

//=======================================================================
// 1.x Tab 4: Zauberprogression – Daten & Standardvorlage (Wizard-basiert)
//=======================================================================

/**
 * Standardvorlage (Wizard-Daten aus wizardClassData).
 * SSpSL* = Zauberplätze pro Grad (unabhängig von preparedSpellsAmount).
 * Jede Grad-Spalte steigt über die Stufen nur oder bleibt gleich.
 */
const CUSTOM_CLASS_SPELL_STANDARD_TEMPLATE = {
    1:  { cantripsAmount: 3, preparedSpellsAmount: 4,  slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] },
    2:  { cantripsAmount: 3, preparedSpellsAmount: 5,  slots: [3, 0, 0, 0, 0, 0, 0, 0, 0] },
    3:  { cantripsAmount: 3, preparedSpellsAmount: 6,  slots: [4, 0, 0, 0, 0, 0, 0, 0, 0] },
    4:  { cantripsAmount: 4, preparedSpellsAmount: 7,  slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] },
    5:  { cantripsAmount: 4, preparedSpellsAmount: 9,  slots: [4, 3, 2, 0, 0, 0, 0, 0, 0] },
    6:  { cantripsAmount: 4, preparedSpellsAmount: 10, slots: [4, 3, 3, 0, 0, 0, 0, 0, 0] },
    7:  { cantripsAmount: 4, preparedSpellsAmount: 11, slots: [4, 3, 3, 1, 0, 0, 0, 0, 0] },
    8:  { cantripsAmount: 4, preparedSpellsAmount: 12, slots: [4, 3, 3, 2, 0, 0, 0, 0, 0] },
    9:  { cantripsAmount: 4, preparedSpellsAmount: 14, slots: [4, 3, 3, 3, 1, 0, 0, 0, 0] },
    10: { cantripsAmount: 5, preparedSpellsAmount: 15, slots: [4, 3, 3, 3, 2, 0, 0, 0, 0] },
    11: { cantripsAmount: 5, preparedSpellsAmount: 16, slots: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
    12: { cantripsAmount: 5, preparedSpellsAmount: 16, slots: [4, 3, 3, 3, 2, 1, 0, 0, 0] },
    13: { cantripsAmount: 5, preparedSpellsAmount: 17, slots: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
    14: { cantripsAmount: 5, preparedSpellsAmount: 18, slots: [4, 3, 3, 3, 2, 1, 1, 0, 0] },
    15: { cantripsAmount: 5, preparedSpellsAmount: 19, slots: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
    16: { cantripsAmount: 5, preparedSpellsAmount: 21, slots: [4, 3, 3, 3, 2, 1, 1, 1, 0] },
    17: { cantripsAmount: 5, preparedSpellsAmount: 22, slots: [4, 3, 3, 3, 2, 1, 1, 1, 1] },
    18: { cantripsAmount: 5, preparedSpellsAmount: 23, slots: [4, 3, 3, 3, 3, 1, 1, 1, 1] },
    19: { cantripsAmount: 5, preparedSpellsAmount: 24, slots: [4, 3, 3, 3, 3, 2, 1, 1, 1] },
    20: { cantripsAmount: 5, preparedSpellsAmount: 25, slots: [4, 3, 3, 3, 3, 2, 2, 1, 1] }
};

function createEmptySpellProgRow(lists) {
    const row = {
        spellListLabels: Array.isArray(lists) ? lists.slice() : [],
        cantripsAmount: null,
        preparedSpellsAmount: null
    };
    for (let i = 1; i <= 9; i++) row[`SSpSL${i}`] = null;
    return row;
}

function cloneSpellProgRow(row) {
    if (!row) return createEmptySpellProgRow([]);
    const out = {
        spellListLabels: Array.isArray(row.spellListLabels) ? row.spellListLabels.slice() : [],
        cantripsAmount: row.cantripsAmount,
        preparedSpellsAmount: row.preparedSpellsAmount
    };
    for (let i = 1; i <= 9; i++) out[`SSpSL${i}`] = row[`SSpSL${i}`];
    return out;
}

function cloneSpellcastingProgression(prog) {
    const p = prog || {};
    const userRows = {};
    Object.keys(p.userRows || {}).forEach(k => {
        userRows[k] = cloneSpellProgRow(p.userRows[k]);
    });
    const base = Array.isArray(p.baseSpellListLabels)
        ? p.baseSpellListLabels.slice()
        : (Array.isArray(p.spellListLabels) ? p.spellListLabels.slice() : []);
    return {
        unlocked: !!p.unlocked,
        startLevel: p.startLevel ?? null,
        mode: p.mode === "user" ? "user" : "standard",
        baseSpellListLabels: base,
        userRows
    };
}

function buildStandardSpellProgRow(casterLevel, baseLists) {
    const tpl = CUSTOM_CLASS_SPELL_STANDARD_TEMPLATE[casterLevel]
        || CUSTOM_CLASS_SPELL_STANDARD_TEMPLATE[20];
    const row = createEmptySpellProgRow(baseLists);
    row.cantripsAmount = tpl.cantripsAmount;
    row.preparedSpellsAmount = tpl.preparedSpellsAmount;
    for (let i = 1; i <= 9; i++) row[`SSpSL${i}`] = tpl.slots[i - 1] || 0;
    return row;
}

function getSpellcastingSourceSlot() {
    const classSlot = getTab2SpellcastingSlot(customClassEditorState.levelFeatures);
    if (classSlot) return { slot: classSlot, source: "class" };
    for (const sc of (customClassEditorState.subclasses || [])) {
        const slot = (sc.levelFeatures || []).find(s =>
            s.payload.featureType === "simple" && s.payload.category === "spellcasting"
        );
        if (slot) return { slot, source: "subclass", subclass: sc };
    }
    return null;
}

function shiftSpellProgUserRows(userRows, delta, newStart) {
    const next = {};
    Object.keys(userRows || {}).forEach(k => {
        const oldLvl = parseInt(k, 10);
        if (!Number.isFinite(oldLvl)) return;
        const newLvl = oldLvl + delta;
        if (newLvl < newStart || newLvl > 20) return;
        next[String(newLvl)] = cloneSpellProgRow(userRows[k]);
    });
    return next;
}

function ensureSpellProgUserRowsInitialized(prog) {
    const start = prog.startLevel;
    if (!start) return;
    const base = prog.baseSpellListLabels || [];
    for (let lvl = start; lvl <= 20; lvl++) {
        const key = String(lvl);
        if (!prog.userRows[key]) prog.userRows[key] = createEmptySpellProgRow(base);
    }
    Object.keys(prog.userRows).forEach(k => {
        if (parseInt(k, 10) < start || parseInt(k, 10) > 20) delete prog.userRows[k];
    });
}

function getActiveSpellProgRow(level) {
    const prog = customClassEditorState?.spellcastingProgression;
    if (prog?.unlocked && prog.mode === "user") {
        ensureSpellProgUserRowsInitialized(prog);
    }
    return getSpellProgRowFromProgression(prog, level);
}

/**
 * Effektive Progressionszeile für eine Charakterstufe.
 * Standard: Wizard-Vorlage ab startLevel; User: userRows.
 */
function getSpellProgRowFromProgression(prog, level) {
    const p = prog || {};
    const start = p.startLevel;
    if (!p.unlocked || start == null || level < start) return null;
    if (p.mode === "user") {
        const row = p.userRows?.[String(level)];
        if (row) return row;
        return createEmptySpellProgRow(p.baseSpellListLabels || []);
    }
    return buildStandardSpellProgRow(level - start + 1, p.baseSpellListLabels || []);
}

/** Initialen der Zauberlisten als HTML – jede Initiale in ihrer Klassenfarbe */
function getSpellListInitialsHtml(labels) {
    return (labels || []).map(l => {
        const name = tCC(l, l);
        const initial = name ? String(name).charAt(0).toLocaleUpperCase(getActiveUiLang()) : "?";
        const colorCls = getSpellListColorClass(l);
        return colorCls ? `<span class="${colorCls}">${initial}</span>` : initial;
    }).join(", ");
}

function enforceSpellProgMonotonicityFrom(level) {
    const prog = customClassEditorState.spellcastingProgression;
    if (!prog || prog.mode !== "user" || !prog.startLevel) return;
    ensureSpellProgUserRowsInitialized(prog);
    const start = prog.startLevel;
    for (let lvl = Math.max(start, level); lvl < 20; lvl++) {
        const cur = prog.userRows[String(lvl)];
        const next = prog.userRows[String(lvl + 1)];
        if (!cur || !next) continue;
        ["cantripsAmount", "preparedSpellsAmount"].forEach(key => {
            const a = parseInt(cur[key], 10);
            const b = parseInt(next[key], 10);
            if (Number.isFinite(a) && (!Number.isFinite(b) || b < a)) next[key] = a;
        });
        for (let i = 1; i <= 9; i++) {
            const key = `SSpSL${i}`;
            const a = parseInt(cur[key], 10) || 0;
            const b = parseInt(next[key], 10) || 0;
            if (b < a) next[key] = a;
        }
        const curLists = cur.spellListLabels || [];
        const nextSet = new Set(next.spellListLabels || []);
        curLists.forEach(l => nextSet.add(l));
        next.spellListLabels = [...nextSet];
    }
}

function syncSpellcastingProgressionFromSlots(slots) {
    void slots;
    const found = getSpellcastingSourceSlot();
    let prog = cloneSpellcastingProgression(customClassEditorState.spellcastingProgression);

    if (!found) {
        customClassEditorState.spellcastingProgression = {
            unlocked: false,
            startLevel: null,
            mode: prog.mode || "standard",
            baseSpellListLabels: [],
            userRows: prog.userRows || {}
        };
        updateCustomClassTab4Ui();
        return;
    }

    const newStart = Number(found.slot.level) || 1;
    const newLists = Array.isArray(found.slot.payload.optionsConfig?.spellListLabels)
        ? found.slot.payload.optionsConfig.spellListLabels.slice()
        : [];
    const oldStart = prog.startLevel;

    if (prog.unlocked && oldStart != null && oldStart !== newStart) {
        prog.userRows = shiftSpellProgUserRows(prog.userRows, newStart - oldStart, newStart);
    }

    prog.unlocked = true;
    prog.startLevel = newStart;
    prog.baseSpellListLabels = newLists;
    ensureSpellProgUserRowsInitialized(prog);
    Object.keys(prog.userRows).forEach(k => {
        const lvl = parseInt(k, 10);
        if (lvl < newStart) return;
        const row = prog.userRows[k];
        const extras = (row.spellListLabels || []).filter(l => !newLists.includes(l));
        row.spellListLabels = [...newLists, ...extras];
    });

    customClassEditorState.spellcastingProgression = prog;
    updateCustomClassTab4Ui();
}

function pruneParameterRegistry(slots) {
    const registry = ensureParameterRegistry();
    const used = new Set();
    const scan = (list) => {
        (list || []).forEach(s => {
            const id = s.payload?.optionsConfig?.parameterId;
            if (id) used.add(id);
        });
    };
    // Immer Basisklasse + alle Unterklassen scannen (sonst löscht Tab-3-Prune Tab-2-Parameter)
    scan(customClassEditorState.levelFeatures);
    (customClassEditorState.subclasses || []).forEach(sc => scan(sc.levelFeatures));
    if (slots && slots !== customClassEditorState.levelFeatures) scan(slots);
    customClassEditorState.parameterRegistry = registry.filter(p => used.has(p.id));
}

function isLfOptionsAsiCategory(slot) {
    return !!(slot
        && slot.payload.featureType === "options"
        && slot.payload.category === "asiAndFeat");
}

function getLfToolsShortDescKey(surfaceLabel) {
    if (surfaceLabel === "musicalInstrumentLabel") return "musicalInstrumentToolProfShortD";
    if (surfaceLabel === "gamingSetLabel") return "gameToolProfShortD";
    if (surfaceLabel === "artisansToolsLabel") return "artisansToolProfShortD";
    return null;
}

function getLfDescChipLetters() {
    return (typeof currentLang !== "undefined" && currentLang === "en")
        ? { short: "S", long: "D" }
        : { short: "K", long: "B" };
}

function getLfLevelLayout(level) {
    return CUSTOM_CLASS_LF_CONFIG.layout.find(l => l.level === level) || null;
}

/** Stufe ist DnD-gesperrt, wenn alle Zeilen fest konfiguriert sind */
function isLfLevelDragLocked(level) {
    const def = getLfLevelLayout(level);
    if (!def) return true;
    if (def.dragLocked === true) return true;
    const fixed = def.fixed || {};
    for (let i = 0; i < def.rowCount; i++) {
        if (!fixed[i] && !fixed[String(i)]) return false;
    }
    return def.rowCount > 0;
}

function expandLfLevelRows(levelDef) {
    const rows = [];
    const fixed = levelDef.fixed || {};
    for (let i = 0; i < levelDef.rowCount; i++) {
        const preset = fixed[i] || fixed[String(i)] || null;
        rows.push(preset
            ? { kind: "fixed", systemPreset: preset }
            : { kind: "free" });
    }
    return rows;
}

function createEmptyLfPayload() {
    return {
        featureType: null,
        category: null,
        names: { de: "", en: "" },
        shortDescriptions: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        optionsConfig: null,
        amount: null,
        classDataPartial: null
    };
}

function createLfSlot(level, index, layoutSlot) {
    const kind = layoutSlot.kind;
    const systemPreset = layoutSlot.systemPreset || null;
    return {
        slotId: `L${level}-${index}`,
        level,
        index,
        kind,
        systemPreset,
        contentLocked: kind === "fixed",
        blockedBySubclass: false,
        boundFromTab1Tool: false,
        payload: createEmptyLfPayload()
    };
}

//=======================================================================
// 1.x Tab 3: Unterklassen – Datenmodell & Sync mit Tab 2
//=======================================================================

function createCustomClassSubclassId(categoryNumber) {
    return `sc${categoryNumber}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function createEmptyCustomClassSubclass(categoryNumber, collapsed) {
    return {
        id: createCustomClassSubclassId(categoryNumber),
        subclassCategoryNumber: categoryNumber,
        names: { de: "", en: "" },
        descriptions: { de: "", en: "" },
        collapsed: !!collapsed,
        levelFeatures: []
    };
}

function createScFeatureSlot(subclassId, level, index) {
    return {
        slotId: `${subclassId}-L${level}-${index}`,
        subclassId,
        level,
        index,
        kind: "free",
        systemPreset: null,
        contentLocked: false,
        blockedBySubclass: false,
        boundFromTab1Tool: false,
        payload: createEmptyLfPayload()
    };
}

function findCustomClassSubclassById(subclassId) {
    return (customClassEditorState.subclasses || []).find(s => s.id === subclassId) || null;
}

/** Mindestens 1 Unterklasse; Nummern 1…n; Sync der Merkmalszeilen mit Tab 2 */
function ensureCustomClassSubclasses(state) {
    const st = state || customClassEditorState;
    if (!Array.isArray(st.subclasses)) st.subclasses = [];

    while (st.subclasses.length < CUSTOM_CLASS_SC_CONFIG.minSubclasses) {
        const n = st.subclasses.length + 1;
        st.subclasses.push(createEmptyCustomClassSubclass(n, n > 1));
    }
    if (st.subclasses.length > CUSTOM_CLASS_SC_CONFIG.maxSubclasses) {
        st.subclasses = st.subclasses.slice(0, CUSTOM_CLASS_SC_CONFIG.maxSubclasses);
    }

    st.subclasses.forEach((sc, i) => {
        sc.subclassCategoryNumber = i + 1;
        if (!sc.id) sc.id = createCustomClassSubclassId(sc.subclassCategoryNumber);
        if (!sc.names) sc.names = { de: "", en: "" };
        if (!sc.descriptions) sc.descriptions = { de: "", en: "" };
        if (!Array.isArray(sc.levelFeatures)) sc.levelFeatures = [];
        if (typeof sc.collapsed !== "boolean") sc.collapsed = i > 0;
        // Alte Slots an aktuelle subclassId binden
        sc.levelFeatures.forEach(slot => {
            slot.subclassId = sc.id;
            sanitizeLfSubclassAttributeDistribution(slot);
        });
        syncSubclassLevelFeatureSlots(sc, st.levelFeatures);
    });
    return st.subclasses;
}

/** Stufen in Tab 2 mit Merkmaltyp Unterklasse */
function getTab2SubclassLevels(slots) {
    const levels = new Set();
    (slots || []).forEach(s => {
        if (s?.payload?.featureType === "subclass") levels.add(Number(s.level));
    });
    return [...levels].filter(l => !Number.isNaN(l)).sort((a, b) => a - b);
}

function isScFeatureSlotPopulated(slot) {
    if (!slot?.payload) return false;
    if (slot.payload.featureType) return true;
    if (lfHasText(slot.payload.names)) return true;
    if (lfHasText(slot.payload.descriptions)) return true;
    if (lfHasText(slot.payload.shortDescriptions)) return true;
    if (slot.payload.optionsConfig) return true;
    if (slot.payload.amount) return true;
    return false;
}

function subclassLevelHasContent(level, state) {
    const st = state || customClassEditorState;
    return (st.subclasses || []).some(sc =>
        (sc.levelFeatures || []).some(s => Number(s.level) === Number(level) && isScFeatureSlotPopulated(s))
    );
}

/**
 * Tab-3-Zeilen an Tab-2-Unterklassenstufen anpassen.
 * Standard rowsPerLevel; Ausnahmen über rowsPerLevelOverrides (z. B. Stufe 3 → 3).
 */
function getScRowsPerLevel(level) {
    const overrides = CUSTOM_CLASS_SC_CONFIG.rowsPerLevelOverrides || {};
    const n = Number(level);
    if (Object.prototype.hasOwnProperty.call(overrides, n)) {
        return Math.max(1, parseInt(overrides[n], 10) || 1);
    }
    if (Object.prototype.hasOwnProperty.call(overrides, String(n))) {
        return Math.max(1, parseInt(overrides[String(n)], 10) || 1);
    }
    return Math.max(1, CUSTOM_CLASS_SC_CONFIG.rowsPerLevel || 2);
}

function syncSubclassLevelFeatureSlots(subclass, classSlots) {
    if (!subclass) return;
    const levels = getTab2SubclassLevels(classSlots || customClassEditorState.levelFeatures);
    const prev = Array.isArray(subclass.levelFeatures) ? subclass.levelFeatures : [];
    const next = [];

    levels.forEach(level => {
        const rowsPer = getScRowsPerLevel(level);
        for (let i = 0; i < rowsPer; i++) {
            const slotId = `${subclass.id}-L${level}-${i}`;
            let found = prev.find(s => s.slotId === slotId);
            if (!found) {
                found = prev.find(s =>
                    Number(s.level) === Number(level)
                    && Number(s.index) === i
                    && s.subclassId === subclass.id
                );
            }
            if (!found) {
                // Fallback: gleicher Index auf der Stufe (nach ID-Wechsel)
                found = prev.find(s => Number(s.level) === Number(level) && Number(s.index) === i);
            }
            if (found) {
                found.slotId = slotId;
                found.subclassId = subclass.id;
                found.level = level;
                found.index = i;
                found.kind = "free";
                next.push(found);
            } else {
                next.push(createScFeatureSlot(subclass.id, level, i));
            }
        }
    });
    subclass.levelFeatures = next;
}

function syncAllSubclassLevelFeatures(state) {
    const st = state || customClassEditorState;
    (st.subclasses || []).forEach(sc => syncSubclassLevelFeatureSlots(sc, st.levelFeatures));
}

function clearSubclassFeaturesForLevels(levels, state) {
    const st = state || customClassEditorState;
    const drop = new Set((levels || []).map(Number));
    (st.subclasses || []).forEach(sc => {
        sc.levelFeatures = (sc.levelFeatures || []).filter(s => !drop.has(Number(s.level)));
        syncSubclassLevelFeatureSlots(sc, st.levelFeatures);
    });
}

/**
 * Prüft ob Tab-2-Änderung Unterklassen-Stufen mit Inhalt entfernt.
 * Bei Abbruch: false (Aufrufer muss Änderung rückgängig machen).
 */
function confirmTab2SubclassLevelRemoval(prevLevels, nextLevels) {
    const removed = (prevLevels || []).filter(l => !(nextLevels || []).includes(l));
    const withContent = removed.filter(l => subclassLevelHasContent(l));
    if (!withContent.length) {
        if (removed.length) clearSubclassFeaturesForLevels(removed);
        syncAllSubclassLevelFeatures();
        return true;
    }
    if (!confirm(tCC("ccScDeleteSubclassFeatureWarnLabel"))) return false;
    clearSubclassFeaturesForLevels(removed);
    syncAllSubclassLevelFeatures();
    return true;
}

/** Slot gehört zu einer Unterklasse (Tab 3), nicht zur Basisklasse */
function isLfSubclassFeatureSlot(slot) {
    return !!(slot && slot.subclassId);
}

/** Slot anhand ID in Tab-2- oder Tab-3-Slots finden */
function resolveLfSlotContext(slotId) {
    const classSlots = customClassEditorState.levelFeatures || [];
    let slot = classSlots.find(s => s.slotId === slotId);
    if (slot) return { slot, slots: classSlots, subclass: null, isSubclass: false };

    const subclasses = ensureCustomClassSubclasses(customClassEditorState);
    for (let i = 0; i < subclasses.length; i++) {
        const sc = subclasses[i];
        const slots = sc.levelFeatures || [];
        slot = slots.find(s => s.slotId === slotId);
        if (slot) return { slot, slots, subclass: sc, isSubclass: true };
    }
    return null;
}

function getLfSlotsForSlot(slot) {
    if (!slot) return customClassEditorState.levelFeatures || [];
    if (slot.subclassId) {
        const sc = findCustomClassSubclassById(slot.subclassId);
        return sc?.levelFeatures || [];
    }
    return customClassEditorState.levelFeatures || [];
}

function getLfOptionsTypeMaxForSlots(slots) {
    if ((slots || []).some(s => s.subclassId)) {
        return CUSTOM_CLASS_SC_CONFIG.limits.optionsTypeMax;
    }
    return CUSTOM_CLASS_LF_CONFIG.limits.optionsTypeMax;
}

function getLfOptionsTypeLimitAlertMessage(scopeSlots) {
    const max = getLfOptionsTypeMaxForSlots(scopeSlots);
    const raw = tCC(
        "ccLfOptionsTypeLimitAlertLabel",
        "Maximal {max} Merkmale mit Spielerauswahl (Optionen) möglich."
    );
    return String(raw).replace(/\{max\}/g, String(max));
}

function rerenderLfOwner(ctx) {
    if (ctx?.isSubclass) {
        // Bezeichnung/Beschreibung der Unterklasse vor Re-Render aus dem DOM sichern
        syncSubclassBoxesFromDom();
        renderCustomClassTab3();
    } else {
        renderCustomClassTab2();
    }
}

function buildDefaultLevelFeatureSlots() {
    const slots = [];
    CUSTOM_CLASS_LF_CONFIG.layout.forEach(levelDef => {
        expandLfLevelRows(levelDef).forEach((layoutSlot, index) => {
            slots.push(createLfSlot(levelDef.level, index, layoutSlot));
        });
    });
    return slots;
}

function applySystemPresetToSlot(slot) {
    if (!slot.systemPreset) return;
    const p = slot.payload;
    p.featureType = null;
    p.category = null;
    p.classDataPartial = null;

    switch (slot.systemPreset) {
        case "coreSkills":
            p.featureType = "options";
            p.category = "skills";
            // Default 2 Fertigkeiten-Dropdowns (Schurke u. a. bis 4 über Anzahl-Maske)
            if (!getLfSlotAmountValue(slot)) p.amount = 2;
            // PHB: Skill-Wahlzeile ohne Bezeichnung / Infobox / Merkmalsliste
            p.classDataPartial = {
                translationLabel: 0,
                classFeatureShortDescription: 0,
                classFeatureDescription: 0,
                choiceInStep3: 1,
                classFeaturesStep2: 0,
                infoBox: 0,
                classFeaturesCharacterSheet: 0
            };
            break;
        case "subclass":
            p.featureType = "subclass";
            p.category = "none";
            p.classDataPartial = {
                translationLabel: "subclass",
                classFeatureShortDescription: "subclassShortD",
                classFeatureDescription: 0,
                choiceInStep3: 1,
                classFeaturesStep2: 1,
                infoBox: 1,
                classFeaturesCharacterSheet: 0
            };
            break;
        case "asiAndFeat":
            p.featureType = "options";
            p.category = "asiAndFeat";
            p.classDataPartial = {
                translationLabel: "asiAndFeat",
                classFeatureShortDescription: "asiAndFeatShortD",
                classFeatureDescription: 0,
                choiceInStep3: 1,
                constForChoice: null,
                classFeaturesStep2: 1,
                infoBox: 1,
                classFeaturesCharacterSheet: 0
            };
            break;
        case "epicBoon":
            p.featureType = "options";
            p.category = "asiAndFeat";
            p.classDataPartial = {
                translationLabel: "epicBoon",
                classFeatureShortDescription: "epicBoonShortD",
                classFeatureDescription: 0,
                choiceInStep3: 1,
                constForChoice: "epicBoons",
                classFeaturesStep2: 1,
                infoBox: 1,
                classFeaturesCharacterSheet: 0
            };
            break;
        default:
            break;
    }
}

function getTab1SurfaceToolLabel(editorState) {
    const tool = editorState && editorState.toolLabel;
    const label = Array.isArray(tool) ? tool.find(v => v && v !== 0) : tool;
    if (!label || label === 0) return null;
    if (isCustomClassToolChoiceLabel(label)) return label;
    return null;
}

/** Verhindert Sync-Schleifen Tab1 ↔ Tab2 */
let ccBiSyncGuard = false;

function findFirstFreeLfSlot(slots) {
    return (slots || []).find(s =>
        s.kind === "free"
        && !s.blockedBySubclass
        && !s.systemPreset
        && !s.payload.featureType
    ) || null;
}

function getTab2ToolsSlots(slots) {
    return (slots || []).filter(s =>
        !s.subclassId
        && s.kind === "free"
        && !s.blockedBySubclass
        && s.payload.featureType === "options"
        && s.payload.category === "tools"
    );
}

function getTab2SpellcastingSlot(slots) {
    return (slots || []).find(s =>
        !s.subclassId
        && s.payload.featureType === "simple"
        && s.payload.category === "spellcasting"
    ) || null;
}

function isSpellcastingInAnySubclass(excludeSlotId) {
    return (customClassEditorState.subclasses || []).some(sc =>
        (sc.levelFeatures || []).some(s =>
            s.slotId !== excludeSlotId
            && s.payload.featureType === "simple"
            && s.payload.category === "spellcasting"
        )
    );
}

function isSpellcastingTakenInSubclass(subclassId, excludeSlotId) {
    const sc = findCustomClassSubclassById(subclassId);
    if (!sc) return false;
    return (sc.levelFeatures || []).some(s =>
        s.slotId !== excludeSlotId
        && s.payload.featureType === "simple"
        && s.payload.category === "spellcasting"
    );
}

/**
 * Ob Einfach→Zauberwirken für diesen Slot gesperrt ist.
 * Global max. 1×: entweder in Tab 2 ODER in genau einer Unterklasse (über alle hinweg).
 */
function isLfSimpleSpellcastingBlockedForSlot(slot, slots) {
    if (!slot) return true;
    if (isLfSubclassFeatureSlot(slot)) {
        // Tab 3: blockiert wenn Basisklasse schon Zauberwirken hat ODER irgendeine Unterklasse
        if (getTab2SpellcastingSlot(customClassEditorState.levelFeatures)) return true;
        return isSpellcastingInAnySubclass(slot.slotId);
    }
    // Tab 2: blockiert wenn schon in Tab 2 oder in einer Unterklasse
    if (isSpellcastingInAnySubclass(null)) return true;
    return isLfSimpleSpellcastingTaken(slots, slot.slotId);
}

function setTab1ToolSelectValue(label) {
    customClassEditorState.toolLabel = label || 0;
    const sel = document.getElementById("ccToolSelect");
    if (sel) sel.value = label || "";
}

function ensureTab2ToolsSlot(slots, surface) {
    let toolsSlot = getTab2ToolsSlots(slots)[0] || null;
    if (!toolsSlot) {
        toolsSlot = findFirstFreeLfSlot(slots);
        if (!toolsSlot) return null;
        toolsSlot.payload.featureType = "options";
        toolsSlot.payload.category = "tools";
        toolsSlot.payload.names = { de: "", en: "" };
        toolsSlot.payload.shortDescriptions = { de: "", en: "" };
        toolsSlot.payload.descriptions = { de: "", en: "" };
        toolsSlot.payload.amount = null;
        toolsSlot.payload.classDataPartial = null;
    }
    // Nur als Verknüpfung markieren – Typ/Kategorie bleiben editierbar
    toolsSlot.boundFromTab1Tool = true;
    toolsSlot.contentLocked = false;
    toolsSlot.payload.optionsConfig = {
        ...(toolsSlot.payload.optionsConfig || {}),
        toolSurfaceLabel: surface,
        mode: toolsSlot.payload.optionsConfig?.mode || "all",
        allowedLabels: Array.isArray(toolsSlot.payload.optionsConfig?.allowedLabels)
            ? toolsSlot.payload.optionsConfig.allowedLabels
            : []
    };
    // Nur eine Tools-Zeile behalten
    getTab2ToolsSlots(slots).forEach((s, idx) => {
        if (s.slotId !== toolsSlot.slotId) resetLfSlotUserConfig(s, false);
    });
    return toolsSlot;
}

function clearTab2ToolsSlots(slots) {
    getTab2ToolsSlots(slots).forEach(s => resetLfSlotUserConfig(s, false));
}

/**
 * Tab1 → Tab2: Oberflächen-Werkzeug setzt/entfernt Options→Werkzeuge.
 * contentLocked wird bewusst nicht gesetzt (Zeile aufhebbar).
 */
function syncTab1ToolBindingToSlots(slots, editorState) {
    if (ccBiSyncGuard) return;
    const surfaceTool = getTab1SurfaceToolLabel(editorState);

    // Alte Locks an Tools-Zeilen lösen (editierbar halten)
    (slots || []).forEach(slot => {
        if (slot.boundFromTab1Tool && slot.payload.category === "tools") {
            slot.contentLocked = false;
        }
    });

    if (!surfaceTool) {
        // Kein Oberflächen-Werkzeug in Tab1 → verknüpfte Tools-Zeilen entfernen
        (slots || []).forEach(slot => {
            if (!slot.boundFromTab1Tool) return;
            if (slot.payload.featureType === "options" && slot.payload.category === "tools") {
                resetLfSlotUserConfig(slot, false);
            } else {
                slot.boundFromTab1Tool = false;
                slot.contentLocked = false;
            }
        });
        return;
    }

    ensureTab2ToolsSlot(slots, surfaceTool);
}

/**
 * Tab2 → Tab1: Options→Werkzeuge spiegelt Oberflächen-Auswahl nach Tab1.
 * Fehlt die Zeile, wird Tab1-Oberflächen-Werkzeug geleert.
 */
function syncTab2ToolsCategoryToTab1(slots) {
    if (ccBiSyncGuard) return;
    const toolsSlots = getTab2ToolsSlots(slots);

    // Mehrere Tools-Zeilen → nur erste behalten
    toolsSlots.forEach((s, idx) => {
        if (idx > 0) resetLfSlotUserConfig(s, false);
    });

    const toolsSlot = getTab2ToolsSlots(slots)[0] || null;
    ccBiSyncGuard = true;
    try {
        if (!toolsSlot) {
            if (getTab1SurfaceToolLabel(customClassEditorState)) {
                setTab1ToolSelectValue("");
            }
            return;
        }
        const surface = toolsSlot.payload.optionsConfig?.toolSurfaceLabel
            || getTab1SurfaceToolLabel(customClassEditorState);
        if (surface && isCustomClassToolChoiceLabel(surface)) {
            toolsSlot.payload.optionsConfig = toolsSlot.payload.optionsConfig || { allowedLabels: [] };
            toolsSlot.payload.optionsConfig.toolSurfaceLabel = surface;
            toolsSlot.boundFromTab1Tool = true;
            toolsSlot.contentLocked = false;
            setTab1ToolSelectValue(surface);
        }
    } finally {
        ccBiSyncGuard = false;
    }
}

function updateTab1SpellDomFromState() {
    const toggle = document.getElementById("ccSpellcastingToggle");
    const fields = document.getElementById("ccSpellFields");
    const abilitySelect = document.getElementById("ccSpellAbility");
    const enabled = customClassEditorState.spellcastingLabel === 1;
    if (toggle) toggle.checked = enabled;
    if (fields) fields.style.display = enabled ? "grid" : "none";
    if (abilitySelect && customClassEditorState.spellcastingAbility) {
        abilitySelect.value = customClassEditorState.spellcastingAbility;
    }
    const selectedFocus = new Set(
        normalizeToArray(customClassEditorState.spellcastingFocus).filter(v => v && v !== 0)
    );
    document.querySelectorAll('input[name="ccSpellFocus"]').forEach(el => {
        el.checked = selectedFocus.has(el.value);
    });
}

/** Tab2-Zauberwirken → Tab1-Checkbox + Attribut/Fokus (nicht Tab3) */
function syncTab1SpellcastingFromTab2() {
    if (ccBiSyncGuard) return;
    const slot = getTab2SpellcastingSlot(customClassEditorState.levelFeatures);
    ccBiSyncGuard = true;
    try {
        if (!slot) {
            customClassEditorState.spellcastingLabel = 0;
            customClassEditorState.spellcastingAbility = 0;
            customClassEditorState.spellcastingFocus = [];
        } else {
            customClassEditorState.spellcastingLabel = 1;
            const cfg = slot.payload.optionsConfig || {};
            if (cfg.spellcastingAbility) {
                customClassEditorState.spellcastingAbility = cfg.spellcastingAbility;
            }
            if (cfg.spellcastingFocus != null) {
                customClassEditorState.spellcastingFocus = normalizeToArray(cfg.spellcastingFocus);
            }
        }
        updateTab1SpellDomFromState();
    } finally {
        ccBiSyncGuard = false;
    }
    syncSpellcastingProgressionFromSlots(customClassEditorState.levelFeatures);
}

function ensureTab2SpellcastingSlot(slots) {
    let slot = getTab2SpellcastingSlot(slots);
    if (slot) return slot;
    slot = findFirstFreeLfSlot(slots);
    if (!slot) return null;
    slot.payload.featureType = "simple";
    slot.payload.category = "spellcasting";
    slot.payload.names = { de: "", en: "" };
    slot.payload.shortDescriptions = { de: "", en: "" };
    slot.payload.descriptions = { de: "", en: "" };
    slot.payload.amount = null;
    slot.payload.classDataPartial = null;
    slot.payload.optionsConfig = {
        spellListLabels: [],
        spellcastingAbility: customClassEditorState.spellcastingAbility || 0,
        spellcastingFocus: normalizeToArray(customClassEditorState.spellcastingFocus)
    };
    slot.boundFromTab1Tool = false;
    slot.contentLocked = false;
    return slot;
}

/** Tab1-Checkbox → Tab2 Einfach→Zauberwirken */
function syncTab2SpellcastingFromTab1() {
    if (ccBiSyncGuard) return;
    const slots = customClassEditorState.levelFeatures || [];
    const on = customClassEditorState.spellcastingLabel === 1;

    if (on) {
        if (isSpellcastingInAnySubclass(null)) {
            // Unterklasse hat bereits Zauberwirken → Checkbox zurücknehmen
            ccBiSyncGuard = true;
            customClassEditorState.spellcastingLabel = 0;
            updateTab1SpellDomFromState();
            ccBiSyncGuard = false;
            alert(tCC("ccScSpellcastingBlockedBySubclassAlertLabel"));
            return false;
        }
        const slot = ensureTab2SpellcastingSlot(slots);
        if (!slot) {
            ccBiSyncGuard = true;
            customClassEditorState.spellcastingLabel = 0;
            updateTab1SpellDomFromState();
            ccBiSyncGuard = false;
            alert(tCC("ccLfNoFreeRowAlertLabel"));
            return false;
        }
        slot.payload.optionsConfig = slot.payload.optionsConfig || {};
        slot.payload.optionsConfig.spellcastingAbility = customClassEditorState.spellcastingAbility || 0;
        slot.payload.optionsConfig.spellcastingFocus = normalizeToArray(customClassEditorState.spellcastingFocus);
    } else {
        const slot = getTab2SpellcastingSlot(slots);
        if (slot) resetLfSlotUserConfig(slot, false);
    }
    syncSpellcastingProgressionFromSlots(slots);
    return true;
}

function mirrorTab1SpellAbilityFocusToTab2() {
    if (ccBiSyncGuard) return;
    const slot = getTab2SpellcastingSlot(customClassEditorState.levelFeatures);
    if (!slot) return;
    slot.payload.optionsConfig = slot.payload.optionsConfig || { spellListLabels: [] };
    slot.payload.optionsConfig.spellcastingAbility = customClassEditorState.spellcastingAbility || 0;
    slot.payload.optionsConfig.spellcastingFocus = normalizeToArray(customClassEditorState.spellcastingFocus);
}

function onTab1SpellcastingToggleChanged() {
    if (ccBiSyncGuard) return;
    const toggle = document.getElementById("ccSpellcastingToggle");
    const on = !!toggle?.checked;
    customClassEditorState.spellcastingLabel = on ? 1 : 0;
    if (!on) {
        customClassEditorState.spellcastingAbility = 0;
        customClassEditorState.spellcastingFocus = [];
    } else {
        // DOM → State für Ability/Focus
        customClassEditorState.spellcastingAbility = document.getElementById("ccSpellAbility")?.value || 0;
        customClassEditorState.spellcastingFocus = Array.from(
            document.querySelectorAll('input[name="ccSpellFocus"]:checked')
        ).map(el => el.value);
    }
    const fields = document.getElementById("ccSpellFields");
    if (fields) fields.style.display = on ? "grid" : "none";

    const ok = syncTab2SpellcastingFromTab1();
    if (!ok) return;

    const panel = document.getElementById("customClassTab2");
    if (panel && panel.classList.contains("active")) {
        renderCustomClassTab2();
    }
}

function onTab1SpellAbilityOrFocusChanged() {
    if (ccBiSyncGuard) return;
    if (customClassEditorState.spellcastingLabel !== 1) return;
    customClassEditorState.spellcastingAbility = document.getElementById("ccSpellAbility")?.value || 0;
    const nextFocus = Array.from(
        document.querySelectorAll('input[name="ccSpellFocus"]:checked')
    ).map(el => el.value);
    if (!confirmLfSpellbookFocusSelection(customClassEditorState.spellcastingFocus, nextFocus, "ccSpellFocus")) {
        return;
    }
    customClassEditorState.spellcastingFocus = nextFocus;
    mirrorTab1SpellAbilityFocusToTab2();
}

/**
 * Confirm wenn Zauberbuch-Fokus neu aktiviert wird.
 * Bei Abbruch: Checkbox zurücksetzen, false.
 */
function confirmLfSpellbookFocusSelection(prevFocus, nextFocus, checkboxName) {
    const prev = normalizeToArray(prevFocus);
    const next = normalizeToArray(nextFocus);
    const wasOn = prev.includes("spellbookLabel");
    const isOn = next.includes("spellbookLabel");
    if (!isOn || wasOn) return true;
    const msg = tCC(
        "ccLfSpellbookFocusConfirmLabel",
        "Bei der Auswahl des Zauberbuchs als Zauberfokus wählst du deine vorbereiteten Zauber aus dem Zauberbuch aus. (Das Vorgehen ist dann identisch wie bei der Klasse Magier.)\n\nMöchtest du Zauberbuch als Zauberfokus auswählen?"
    );
    if (confirm(msg)) return true;
    // Abbruch: Zauberbuch-Checkbox wieder aus
    document.querySelectorAll(`input[name="${checkboxName}"][value="spellbookLabel"]`).forEach(el => {
        el.checked = false;
    });
    return false;
}

/** Nach Tab2-Typ/Kategorie-Änderungen: Tools + Zauberwirken mit Tab1 abgleichen */
function syncClassTraitsFromTab2Slots(slots) {
    syncTab2ToolsCategoryToTab1(slots);
    syncTab1SpellcastingFromTab2();
}

function applySubclassSiblingLocks(slots) {
    const byLevel = new Map();
    slots.forEach(slot => {
        if (!byLevel.has(slot.level)) byLevel.set(slot.level, []);
        byLevel.get(slot.level).push(slot);
    });

    byLevel.forEach(levelSlots => {
        const freeSlots = levelSlots.filter(s => s.kind === "free");
        if (freeSlots.length < 2) {
            freeSlots.forEach(s => { s.blockedBySubclass = false; });
            return;
        }

        const subclassSlot = freeSlots.find(s =>
            s.payload.featureType === "subclass" && !s.blockedBySubclass
        );

        freeSlots.forEach(slot => {
            if (subclassSlot && slot.slotId !== subclassSlot.slotId) {
                slot.blockedBySubclass = true;
                slot.boundFromTab1Tool = false;
                slot.contentLocked = true;
                slot.payload = createEmptyLfPayload();
            } else if (!subclassSlot) {
                slot.blockedBySubclass = false;
                if (!slot.boundFromTab1Tool && slot.kind === "free" && !slot.systemPreset) {
                    slot.contentLocked = false;
                }
            }
        });
    });
}

function ensureCustomClassLevelFeatureSlots(editorState) {
    const state = editorState || customClassEditorState;
    const defaults = buildDefaultLevelFeatureSlots();
    const existing = Array.isArray(state.levelFeatures) ? state.levelFeatures : [];

    const merged = defaults.map(defSlot => {
        const prev = existing.find(s =>
            s && s.level === defSlot.level && s.index === defSlot.index
        );
        if (!prev) {
            applySystemPresetToSlot(defSlot);
            return defSlot;
        }

        if (defSlot.kind === "fixed") {
            applySystemPresetToSlot(defSlot);
            // Gemeisterte Fertigkeiten: gewählte Dropdown-Anzahl behalten (sonst Default 2)
            if (defSlot.systemPreset === "coreSkills") {
                const prevAmount = getLfSlotAmountValue(prev);
                defSlot.payload.amount = prevAmount > 0 ? prevAmount : 2;
            }
            return defSlot;
        }

        defSlot.payload = {
            ...createEmptyLfPayload(),
            ...(prev.payload || {})
        };
        defSlot.boundFromTab1Tool = !!prev.boundFromTab1Tool;
        // Verknüpfte Tools-Zeilen bleiben editierbar/aufhebbar
        defSlot.contentLocked = defSlot.boundFromTab1Tool ? false : !!prev.contentLocked;
        defSlot.blockedBySubclass = !!prev.blockedBySubclass;
        return defSlot;
    });

    // Ungültige Restbestände bereinigen (Unterklasse < 3, ASI-Optionen < 4)
    merged.forEach(slot => {
        // Attribut Altbestand: Kategorie „increase“ → „direct“
        if (slot.payload.featureType === "attribute" && slot.payload.category === "increase") {
            slot.payload.category = "direct";
            slot.payload.amount = null;
        }
        if (
            slot.kind === "free"
            && slot.payload.featureType === "subclass"
            && slot.level < CUSTOM_CLASS_LF_SUBCLASS_MIN_LEVEL
        ) {
            resetLfSlotUserConfig(slot, false);
        }
        if (isLfOptionsAsiCategory(slot) && slot.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL) {
            resetLfSlotUserConfig(slot, false);
        }
    });

    syncTab1ToolBindingToSlots(merged, state);
    applySubclassSiblingLocks(merged);
    state.levelFeatures = merged;
    // Tab-3-Zeilen an aktuelle Unterklassen-Stufen anbinden
    if (Array.isArray(state.subclasses) && state.subclasses.length) {
        state.subclasses.forEach(sc => syncSubclassLevelFeatureSlots(sc, merged));
    }
    return merged;
}

function isLfSlotDraggable(slot) {
    if (!slot || slot.kind !== "free") return false;
    if (slot.blockedBySubclass) return false;
    // Progressionslinie mit ≥2 Merkmalen: keine Verschiebung/Tausch mehr
    if (isLfProgressionLineDragLocked(slot)) return false;
    // Tab 3: alle Unterklassen-Zeilen frei verschiebbar (keine festen Zeilen)
    if (isLfSubclassFeatureSlot(slot)) return true;
    if (isLfLevelDragLocked(slot.level)) return false;
    return true;
}

/**
 * Schlüssel einer Progressionslinie (oder null).
 * Linien: Einfach→Frei (parameterId), Vordefiniert mit Parametern,
 * Optionen→Frei (Familie), Magieprogression.
 */
function getLfProgressionLineKey(slot) {
    if (!slot?.payload?.featureType || !slot.payload.category) return null;
    const type = slot.payload.featureType;
    const cat = slot.payload.category;
    const cfg = slot.payload.optionsConfig || {};

    if (type === "simple" && cat === "free" && cfg.parameterId) {
        return `simpleFree:${cfg.parameterId}`;
    }

    if (type === "simple" && cat === "preDefined" && cfg.preDefinedLabel) {
        if (isLfPreDefinedOnceOnly(cfg.preDefinedLabel)) return null;
        return `preDefined:${cfg.preDefinedLabel}`;
    }

    if (type === "options" && cat === "free") {
        if (!isLfOptionsConfigured(slot) && !cfg.extendsSlotId) return null;
        if (cfg.featureFamilyId) return `optionsFree:${cfg.featureFamilyId}`;
        // Zur Wurzel der Verbesserungskette auflösen
        let root = slot;
        const seen = new Set();
        while (root?.payload?.optionsConfig?.extendsSlotId) {
            if (seen.has(root.slotId)) break;
            seen.add(root.slotId);
            const parent = findLfSlotAnywhere(root.payload.optionsConfig.extendsSlotId);
            if (!parent) break;
            root = parent;
        }
        const rootCfg = root?.payload?.optionsConfig || {};
        if (rootCfg.featureFamilyId) return `optionsFree:${rootCfg.featureFamilyId}`;
        return `optionsFree:root:${root?.slotId || slot.slotId}`;
    }

    if (type === "spellcraft" && cat === "subclassSpells") {
        if (collectLfSubclassSpellsSelectedLabels(cfg).length < 1) return null;
        return "subclassSpells";
    }

    return null;
}

/** Anzahl definierter Merkmale derselben Progressionslinie (gleicher Scope) */
function countLfProgressionLineMembers(slot) {
    const key = getLfProgressionLineKey(slot);
    if (!key) return 0;
    const slots = getLfSlotsForSlot(slot) || [];
    return slots.filter(s => getLfProgressionLineKey(s) === key).length;
}

/** Ab 2 Merkmalen in der Linie: Drag/Tausch gesperrt */
function isLfProgressionLineDragLocked(slot) {
    return countLfProgressionLineMembers(slot) >= 2;
}

function isLfSlotDropTarget(slot) {
    return isLfSlotDraggable(slot);
}

/** Unterklasse < 3 und Optionen+ASI < 4 nicht auf gesperrte Stufen tauschen (nur Tab 2). */
function canLfSwapRespectingSubclassLevel(slotA, slotB) {
    // Tab 3: keine festen Stufenregeln – alle Zeilen frei tauschbar
    if (isLfSubclassFeatureSlot(slotA) || isLfSubclassFeatureSlot(slotB)) return true;

    const payloadToA = slotB.payload;
    const payloadToB = slotA.payload;
    if (payloadToA && payloadToA.featureType === "subclass" && slotA.level < CUSTOM_CLASS_LF_SUBCLASS_MIN_LEVEL) {
        return false;
    }
    if (payloadToB && payloadToB.featureType === "subclass" && slotB.level < CUSTOM_CLASS_LF_SUBCLASS_MIN_LEVEL) {
        return false;
    }
    if (payloadToA && payloadToA.featureType === "options" && payloadToA.category === "asiAndFeat"
        && slotA.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL) {
        return false;
    }
    if (payloadToB && payloadToB.featureType === "options" && payloadToB.category === "asiAndFeat"
        && slotB.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL) {
        return false;
    }
    return true;
}

function swapLfSlotPayloads(slotIdA, slotIdB) {
    const ctxA = resolveLfSlotContext(slotIdA);
    const ctxB = resolveLfSlotContext(slotIdB);
    if (!ctxA || !ctxB) return false;
    const a = ctxA.slot;
    const b = ctxB.slot;
    if (!a || !b || a.slotId === b.slotId) return false;
    if (!isLfSlotDraggable(a) || !isLfSlotDropTarget(b)) return false;

    // Tab 3: nur innerhalb derselben Unterklasse tauschen
    if (ctxA.isSubclass || ctxB.isSubclass) {
        if (!ctxA.isSubclass || !ctxB.isSubclass) return false;
        if (a.subclassId !== b.subclassId) return false;
        if (!canLfSwapRespectingSubclassLevel(a, b)) return false;

        const payloadA = a.payload;
        const boundA = a.boundFromTab1Tool;
        const lockedA = a.contentLocked;

        a.payload = b.payload;
        a.boundFromTab1Tool = b.boundFromTab1Tool;
        a.contentLocked = b.boundFromTab1Tool ? false : (!!b.contentLocked);

        b.payload = payloadA;
        b.boundFromTab1Tool = boundA;
        b.contentLocked = boundA ? false : (!!lockedA);
        return true;
    }

    if (!canLfSwapRespectingSubclassLevel(a, b)) return false;

    const slots = ctxA.slots;
    const prevLevels = getTab2SubclassLevels(slots);

    const payloadA = a.payload;
    const boundA = a.boundFromTab1Tool;
    const lockedA = a.contentLocked;

    a.payload = b.payload;
    a.boundFromTab1Tool = b.boundFromTab1Tool;
    a.contentLocked = b.boundFromTab1Tool ? false : (!!b.contentLocked);

    b.payload = payloadA;
    b.boundFromTab1Tool = boundA;
    b.contentLocked = boundA ? false : (!!lockedA);

    applySubclassSiblingLocks(slots);

    const nextLevels = getTab2SubclassLevels(slots);
    if (!confirmTab2SubclassLevelRemoval(prevLevels, nextLevels)) {
        // Tausch rückgängig
        b.payload = a.payload;
        b.boundFromTab1Tool = a.boundFromTab1Tool;
        b.contentLocked = a.contentLocked;
        a.payload = payloadA;
        a.boundFromTab1Tool = boundA;
        a.contentLocked = lockedA;
        applySubclassSiblingLocks(slots);
        return false;
    }
    return true;
}

function onLfRowDragStart(event, slotId) {
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx || !isLfSlotDraggable(ctx.slot)) {
        event.preventDefault();
        return;
    }
    // Drag nicht von Select/Input/Button starten (sonst bricht DnD ab)
    const t = event.target;
    if (t && typeof t.closest === "function") {
        if (t.closest("select, input, textarea, button, a, .cc-lf-chip-btn, .cc-lf-chips")) {
            event.preventDefault();
            return;
        }
    }
    ccLfDragSourceSlotId = slotId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", slotId);
    event.currentTarget.classList.add("cc-lf-row--dragging");
}

function onLfRowDragEnd(event) {
    event.currentTarget.classList.remove("cc-lf-row--dragging");
    document.querySelectorAll(".cc-lf-row--drag-over").forEach(el => {
        el.classList.remove("cc-lf-row--drag-over");
    });
    ccLfDragSourceSlotId = null;
}

/** DnD über Stufen-Schienen hinweg am Leben halten (sonst bricht der Drop ab). */
function onLfLevelGroupDragOver(event) {
    if (!ccLfDragSourceSlotId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
}

function onLfRowDragOver(event, slotId) {
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx || !isLfSlotDropTarget(ctx.slot)) return;
    if (!ccLfDragSourceSlotId || ccLfDragSourceSlotId === slotId) return;
    const sourceCtx = resolveLfSlotContext(ccLfDragSourceSlotId);
    if (!sourceCtx || !canLfSwapRespectingSubclassLevel(sourceCtx.slot, ctx.slot)) return;
    // Tab 3: kein Drop in eine andere Unterklasse
    if (ctx.isSubclass || sourceCtx.isSubclass) {
        if (!ctx.isSubclass || !sourceCtx.isSubclass) return;
        if (ctx.slot.subclassId !== sourceCtx.slot.subclassId) return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("cc-lf-row--drag-over");
}

function onLfRowDragLeave(event) {
    // Nur entfernen, wenn die Zeile wirklich verlassen wird (nicht Kind-Elemente)
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
    event.currentTarget.classList.remove("cc-lf-row--drag-over");
}

function onLfRowDrop(event, slotId) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove("cc-lf-row--drag-over");
    const sourceId = ccLfDragSourceSlotId || event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === slotId) return;
    if (swapLfSlotPayloads(sourceId, slotId)) {
        const ctx = resolveLfSlotContext(slotId);
        rerenderLfOwner(ctx);
    }
}

function isLfSlotContentEmpty(slot) {
    if (!slot || slot.kind !== "free") return false;
    if (slot.blockedBySubclass || slot.boundFromTab1Tool || slot.systemPreset) return false;
    return !slot.payload.featureType;
}

/** Typ/Kategorie nur auf freien, nicht gesperrten Zeilen editierbar */
function canEditLfTypeCategory(slot) {
    return !!(slot
        && slot.kind === "free"
        && !slot.contentLocked
        && !slot.blockedBySubclass
        && !slot.systemPreset);
}

/**
 * Dynamic-Content in Schritt 6 (max. 4 Sections):
 * - Options-Kategorien außer Fertigkeiten / ASI+Talent
 * - Attribut → Verteilung
 * Gleiche Options-Kategorie auf mehreren Stufen = 1 Slot (Wiederholung erlaubt).
 */
function getLfDynamicContentKey(slot) {
    if (!slot?.payload) return null;

    if (slot.payload.featureType === "attribute"
        && slot.payload.category === "distribution") {
        return "attribute:distribution";
    }

    if (slot.payload.featureType !== "options") return null;
    if (slot.systemPreset === "coreSkills"
        || slot.systemPreset === "asiAndFeat"
        || slot.systemPreset === "epicBoon") {
        return null;
    }

    const cat = slot.payload.category;
    // Fertigkeiten & ASI/Talent: eigene UI, nicht in dynamicClassSection1–4
    if (!cat || cat === "skills" || cat === "asiAndFeat") return null;
    return `options:${cat}`;
}

function countsTowardOptionsTypeLimit(slot) {
    return getLfDynamicContentKey(slot) != null;
}

function isLfOptionsCategoryExemptFromDynamicLimit(category) {
    return category === "skills" || category === "asiAndFeat";
}

/** Eindeutige Dynamic-Content-Keys (andere Slots; excludeSlotId optional) */
function getLfUsedDynamicContentKeys(slots, excludeSlotId) {
    const keys = new Set();
    (slots || []).forEach(s => {
        if (excludeSlotId && s.slotId === excludeSlotId) return;
        const key = getLfDynamicContentKey(s);
        if (key) keys.add(key);
    });
    return keys;
}

function countLfDynamicContentKeys(slots, excludeSlotId) {
    return getLfUsedDynamicContentKeys(slots, excludeSlotId).size;
}

/** @deprecated Alias */
function countLfOptionsTypeUses(slots, excludeSlotId) {
    return countLfDynamicContentKeys(slots, excludeSlotId);
}

/**
 * Darf diese Kategorie gewählt werden?
 * Bei vollem Unique-Limit: nur bereits genutzte Options-Kategorien
 * (+ Fertigkeiten / ASI+Talent ausgenommen).
 * Basisklasse: max. 4 · Unterklasse: max. 2 (CUSTOM_CLASS_*_CONFIG.limits).
 */
function canSelectLfDynamicContentCategory(slot, type, category, scopeSlots) {
    if (!category) return true;
    const max = getLfOptionsTypeMaxForSlots(scopeSlots);
    const otherKeys = getLfUsedDynamicContentKeys(scopeSlots, slot.slotId);

    if (type === "options") {
        if (isLfOptionsCategoryExemptFromDynamicLimit(category)) return true;
        if (category === "asiAndFeat" && slot.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL) return false;

        const key = `options:${category}`;
        // Schon auf anderem Slot / diesem Slot: Wiederholung OK
        if (otherKeys.has(key)) return true;
        if (slot.payload.category === category) return true;
        // Neue Kategorie nur bei freiem Unique-Slot
        return otherKeys.size < max;
    }

    if (type === "attribute" && category === "distribution") {
        // Unterklassen: Verteilung nicht wählbar
        if (isLfAttributeDistributionBlockedForSlot(slot)) return false;
        if (isLfAttributeDistributionTaken(scopeSlots, slot.slotId)) return false;
        if (slot.payload.category === "distribution") return true;
        return otherKeys.size < max;
    }

    return true;
}

function countLfFreeSubclassUses(slots, excludeSlotId) {
    return (slots || []).filter(s =>
        s.slotId !== excludeSlotId
        && s.kind === "free"
        && s.payload.featureType === "subclass"
    ).length;
}

/** Alle Unterklasse-Merkmalszeilen (feste Stufe 3 + freie) für Ordnungszahl */
function isLfSubclassFeatureAmountSlot(slot) {
    if (!slot || slot.blockedBySubclass) return false;
    if (slot.systemPreset === "subclass") return true;
    return slot.kind === "free" && slot.payload?.featureType === "subclass";
}

/** Ordnungszahl 1…N: feste Stufe-3-Zeile = 1, danach freie Unterklasse-Merkmale */
function getLfSubclassFeatureOrdinal(slot, slots) {
    if (!isLfSubclassFeatureAmountSlot(slot)) return 0;
    const series = (slots || [])
        .filter(isLfSubclassFeatureAmountSlot)
        .slice()
        .sort((a, b) => (a.level - b.level) || (a.index - b.index));
    const idx = series.findIndex(s => s.slotId === slot.slotId);
    return idx >= 0 ? idx + 1 : 0;
}

function refreshLfSubclassFeatureOrdinals(slots) {
    const series = (slots || [])
        .filter(isLfSubclassFeatureAmountSlot)
        .slice()
        .sort((a, b) => (a.level - b.level) || (a.index - b.index));
    series.forEach((s, i) => {
        if (!s.payload) return;
        s.payload.amount = i + 1;
    });
}

/** @deprecated Alias */
function getLfFreeSubclassFeatureOrdinal(slot, slots) {
    return getLfSubclassFeatureOrdinal(slot, slots);
}

/** @deprecated Alias */
function refreshLfFreeSubclassFeatureOrdinals(slots) {
    refreshLfSubclassFeatureOrdinals(slots);
}

function isLfFeatureTypeAtLimit(type, slots, excludeSlotId) {
    const limits = CUSTOM_CLASS_LF_CONFIG.limits;
    if (type === "options") {
        // Typ Optionen bleibt immer wählbar (weitere Stufen / Wiederholung).
        // Limit greift nur bei der Kategorie-Wahl.
        return false;
    }
    if (type === "subclass") {
        if ((slots || []).some(s => s.subclassId)) return true;
        return countLfFreeSubclassUses(slots, excludeSlotId) >= limits.subclassFreeMax;
    }
    return false;
}

/** Merkmaltyp-Text inkl. Restkontingent für „Unterklasse“ (wie Unterklassenzauber) */
function formatLfFeatureTypeOptionLabel(type, slot, slots) {
    if (type !== "subclass") {
        const key = CUSTOM_CLASS_LF_CONFIG.featureTypes[type];
        return key ? tCC(key, type) : type;
    }
    const max = CUSTOM_CLASS_LF_CONFIG.limits.subclassFreeMax || 4;
    const used = countLfFreeSubclassUses(slots || getLfSlotsForSlot(slot), null);
    const remaining = Math.max(0, max - used);
    const key = CUSTOM_CLASS_LF_CONFIG.featureTypes.subclass;
    return `${key ? tCC(key, type) : type} (${remaining})`;
}

function getLfCategoryLabelKey(category) {
    const map = {
        free: "ccLfCatFreeLabel",
        skills: "ccLfCatSkillsLabel",
        savingThrows: "ccLfCatSavingThrowsLabel",
        weaponTraining: "ccLfCatWeaponTrainingLabel",
        armorTraining: "ccLfCatArmorTrainingLabel",
        expertise: "ccLfCatExpertiseLabel",
        weaponMasteries: "ccLfCatWeaponMasteriesLabel",
        tools: "ccLfCatToolsLabel",
        languages: "ccLfCatLanguagesLabel",
        asiAndFeat: "asiAndFeat",
        maneuver: "ccLfCatManeuverLabel",
        fightingStyle: "fightingStyleLabel",
        spellcasting: "spellcastingLabel",
        preDefined: "ccLfCatPreDefinedLabel",
        increase: "ccLfCatDirectLabel",
        direct: "ccLfCatDirectLabel",
        distribution: "ccLfCatDistributionLabel",
        getCantrip: "ccLfCatGetCantripLabel",
        chooseCantrip: "ccLfCatChooseCantripLabel",
        getPreparedSpell: "ccLfCatGetPreparedSpellLabel",
        choosePreparedSpell: "ccLfCatChoosePreparedSpellLabel",
        subclassSpells: "ccLfCatSubclassSpellsLabel",
        none: null
    };
    return map[category] || null;
}

function formatLfFeatureType(type) {
    if (!type) return "—";
    const key = CUSTOM_CLASS_LF_CONFIG.featureTypes[type];
    return key ? tCC(key, type) : type;
}

function formatLfCategory(category) {
    if (!category || category === "none") return "—";
    const key = getLfCategoryLabelKey(category);
    if (key) return tCC(key, category);
    return category;
}

/** Kategorie-Text inkl. Restkontingent für Unterklassenzauber */
function formatLfCategoryOptionLabel(category, slot, slots) {
    if (category !== "subclassSpells") return formatLfCategory(category);
    const max = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsFeatureMax || 4;
    const used = countLfSubclassSpellsFeatures(slots || getLfSlotsForSlot(slot), null);
    const remaining = Math.max(0, max - used);
    return `${formatLfCategory(category)} (${remaining})`;
}

function buildLfTypeSelectHtml(slot, slots) {
    if (!canEditLfTypeCategory(slot)) {
        const text = formatLfFeatureType(slot.payload.featureType);
        return `<span class="${slot.payload.featureType ? "" : "cc-lf-cell--muted"}">${text}</span>`;
    }

    const current = slot.payload.featureType || "";
    const workingSlots = slots || getLfSlotsForSlot(slot);
    const isSc = isLfSubclassFeatureSlot(slot);
    let html = `<select class="dropdown cc-lf-select" aria-label="${tCC("ccLfColTypeLabel")}"
        onchange="onLfFeatureTypeChange('${slot.slotId}', this.value)"
        onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">`;
    html += `<option value="">${tCC("pleaseSelectLabel")}</option>`;

    Object.keys(CUSTOM_CLASS_LF_CONFIG.featureTypes).forEach(type => {
        // In Unterklassen-Merkmalen kein Typ „Unterklasse“
        if (isSc && type === "subclass") return;
        const atLimit = isLfFeatureTypeAtLimit(type, workingSlots, slot.slotId);
        const tooEarlyForSubclass = type === "subclass" && slot.level < CUSTOM_CLASS_LF_SUBCLASS_MIN_LEVEL;
        const selected = current === type ? "selected" : "";
        const disabled = ((atLimit || tooEarlyForSubclass) && current !== type) ? "disabled" : "";
        html += `<option value="${type}" ${selected} ${disabled}>${formatLfFeatureTypeOptionLabel(type, slot, workingSlots)}</option>`;
    });

    html += `</select>`;
    return html;
}

function buildLfCategorySelectHtml(slot) {
    if (!canEditLfTypeCategory(slot)) {
        return `<span>${formatLfCategory(slot.payload.category)}</span>`;
    }

    const type = slot.payload.featureType;
    if (!type) {
        return `<span class="cc-lf-cell--muted">—</span>`;
    }

    const cats = getLfAllowedCategoriesForSlot(slot, type);
    // Einzige feste Kategorie → nur Anzeige
    if (type === "subclass" || (cats.length === 1 && cats[0] === "none")) {
        return `<span>${formatLfCategory(slot.payload.category || cats[0])}</span>`;
    }

    const current = slot.payload.category || "";
    const workingSlots = getLfSlotsForSlot(slot);
    let html = `<select class="dropdown cc-lf-select" aria-label="${tCC("ccLfColCategoryLabel")}"
        onchange="onLfCategoryChange('${slot.slotId}', this.value)"
        onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">`;
    html += `<option value="">${tCC("pleaseSelectLabel")}</option>`;

    cats.forEach(cat => {
        if (cat === "none") return;

        const allowed = canSelectLfDynamicContentCategory(slot, type, cat, workingSlots);
        const selected = current === cat ? "selected" : "";
        const asiTooEarly = type === "options" && cat === "asiAndFeat"
            && slot.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL;
        const spellcastingTaken = type === "simple" && cat === "spellcasting"
            && isLfSimpleSpellcastingBlockedForSlot(slot, workingSlots);
        const distributionTaken = type === "attribute" && cat === "distribution"
            && isLfAttributeDistributionTaken(workingSlots, slot.slotId);
        const subclassSpellsBlocked = type === "spellcraft" && cat === "subclassSpells"
            && !isLfSubclassSpellsCategorySelectable(slot, workingSlots)
            && current !== cat;

        const disabled = ((!allowed || asiTooEarly || spellcastingTaken || distributionTaken
            || subclassSpellsBlocked)
            && current !== cat)
            ? "disabled"
            : "";
        html += `<option value="${cat}" ${selected} ${disabled}>${formatLfCategoryOptionLabel(cat, slot, workingSlots)}</option>`;
    });

    html += `</select>`;
    return html;
}

function applyDefaultCategoryForType(slot) {
    const type = slot.payload.featureType;
    if (!type) {
        slot.payload.category = null;
        return;
    }
    if (type === "subclass") {
        slot.payload.category = "none";
        return;
    }
    // Altbestand Attribut → Erhöhung als Direkt migrieren
    if (type === "attribute" && slot.payload.category === "increase") {
        slot.payload.category = "direct";
        return;
    }
    // Unterklasse: Verteilung nicht erlaubt
    if (type === "attribute" && slot.payload.category === "distribution"
        && isLfAttributeDistributionBlockedForSlot(slot)) {
        slot.payload.category = null;
        return;
    }
    const cats = getLfAllowedCategoriesForSlot(slot, type);
    if (slot.payload.category && cats.includes(slot.payload.category)) return;
    slot.payload.category = null;
}

function resetLfSlotUserConfig(slot, keepTypeCategory) {
    if (!keepTypeCategory) {
        slot.payload.featureType = null;
        slot.payload.category = null;
    }
    slot.payload.names = { de: "", en: "" };
    slot.payload.shortDescriptions = { de: "", en: "" };
    slot.payload.descriptions = { de: "", en: "" };
    slot.payload.optionsConfig = null;
    slot.payload.amount = null;
    slot.payload.classDataPartial = null;
    slot.boundFromTab1Tool = false;
    if (!slot.systemPreset && slot.kind === "free" && !slot.blockedBySubclass) {
        slot.contentLocked = false;
    }
}

function onLfFeatureTypeChange(slotId, typeValue) {
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx || !canEditLfTypeCategory(ctx.slot)) return;
    const { slot, slots, isSubclass } = ctx;

    const nextType = typeValue || null;
    if (nextType === "subclass" && (isSubclass || slot.level < CUSTOM_CLASS_LF_SUBCLASS_MIN_LEVEL)) {
        rerenderLfOwner(ctx);
        return;
    }
    if (nextType && isLfFeatureTypeAtLimit(nextType, slots, slot.slotId)) {
        rerenderLfOwner(ctx);
        return;
    }

    const prevType = slot.payload.featureType;
    const prevLevels = isSubclass ? null : getTab2SubclassLevels(slots);

    // Snapshot für möglichen Abbruch der Unterklassen-Warnung
    const prevPayload = {
        featureType: slot.payload.featureType,
        category: slot.payload.category,
        names: { ...(slot.payload.names || {}) },
        shortDescriptions: { ...(slot.payload.shortDescriptions || {}) },
        descriptions: { ...(slot.payload.descriptions || {}) },
        optionsConfig: slot.payload.optionsConfig,
        amount: slot.payload.amount,
        classDataPartial: slot.payload.classDataPartial
    };

    slot.payload.featureType = nextType;

    if (!nextType) {
        resetLfSlotUserConfig(slot, false);
    } else {
        if (prevType !== nextType) {
            slot.payload.names = { de: "", en: "" };
            slot.payload.shortDescriptions = { de: "", en: "" };
            slot.payload.descriptions = { de: "", en: "" };
            slot.payload.optionsConfig = null;
            slot.payload.amount = null;
            slot.payload.classDataPartial = null;
            slot.boundFromTab1Tool = false;
            slot.contentLocked = false;
        }
        applyDefaultCategoryForType(slot);
    }

    if (!isSubclass) {
        applySubclassSiblingLocks(slots);
        const nextLevels = getTab2SubclassLevels(slots);
        if (prevLevels && !confirmTab2SubclassLevelRemoval(prevLevels, nextLevels)) {
            Object.assign(slot.payload, prevPayload);
            applySubclassSiblingLocks(slots);
            renderCustomClassTab2();
            return;
        }
        syncClassTraitsFromTab2Slots(slots);
        applySubclassSiblingLocks(slots);
        syncSpellcastingProgressionFromSlots(slots);
        pruneParameterRegistry(slots);
        refreshLfFreeSubclassFeatureOrdinals(slots);
        renderCustomClassTab2();
        return;
    }

    pruneParameterRegistry(slots);
    syncSpellcastingProgressionFromSlots();
    syncSubclassBoxesFromDom();
    renderCustomClassTab3();
}

function onLfCategoryChange(slotId, categoryValue) {
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx || !canEditLfTypeCategory(ctx.slot)) return;
    const { slot, slots, isSubclass } = ctx;

    const type = slot.payload.featureType;
    if (!type) return;

    const cats = getLfAllowedCategoriesForSlot(slot, type);
    const nextCat = categoryValue || null;
    if (nextCat && !cats.includes(nextCat)) {
        rerenderLfOwner(ctx);
        return;
    }

    if (type === "options" && nextCat === "asiAndFeat" && slot.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL) {
        rerenderLfOwner(ctx);
        return;
    }
    if (type === "simple" && nextCat === "spellcasting"
        && isLfSimpleSpellcastingBlockedForSlot(slot, slots)) {
        alert(tCC("ccLfSpellcastingOnceAlertLabel"));
        rerenderLfOwner(ctx);
        return;
    }
    if (type === "attribute" && nextCat === "distribution") {
        if (isLfAttributeDistributionBlockedForSlot(slot)) {
            alert(tCC(
                "ccLfAttrDistributionSubclassBlockedAlertLabel",
                "Attributverteilung ist in Unterklassen nicht verfügbar."
            ));
            rerenderLfOwner(ctx);
            return;
        }
        if (!canSelectLfDynamicContentCategory(slot, type, nextCat, slots)) {
            alert(isLfAttributeDistributionTaken(slots, slot.slotId)
                ? tCC("ccLfAttrDistributionOnceAlertLabel")
                : getLfOptionsTypeLimitAlertMessage(slots));
            rerenderLfOwner(ctx);
            return;
        }
    }

    if (type === "spellcraft" && nextCat === "subclassSpells") {
        if (!isLfSubclassFeatureSlot(slot) || !hasLfBaseClassSpellcasting(customClassEditorState)) {
            alert(tCC("ccLfSubclassSpellsRequiresBaseAlertLabel"));
            rerenderLfOwner(ctx);
            return;
        }
        const baseLvl = getLfBaseSpellcastingLevel(customClassEditorState);
        if (baseLvl != null && (Number(slot.level) || 0) < baseLvl) {
            alert(tCC("ccLfSubclassSpellsRequiresBaseAlertLabel"));
            rerenderLfOwner(ctx);
            return;
        }
        if (isLfSubclassSpellsTakenOnLevel(slots, slot.level, slot.slotId)) {
            alert(tCC("ccLfSubclassSpellsOncePerLevelAlertLabel"));
            rerenderLfOwner(ctx);
            return;
        }
        const max = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsFeatureMax || 4;
        if (countLfSubclassSpellsFeatures(slots, slot.slotId) >= max) {
            alert(tCC("ccLfSubclassSpellsMaxAlertLabel"));
            rerenderLfOwner(ctx);
            return;
        }
    }

    // Neue Options-Kategorie nur wenn Unique-Limit noch frei (Wiederholung erlaubt)
    if (type === "options" && nextCat) {
        if (!canSelectLfDynamicContentCategory(slot, type, nextCat, slots)) {
            if (!(nextCat === "asiAndFeat" && slot.level < CUSTOM_CLASS_LF_ASI_MIN_LEVEL)) {
                alert(getLfOptionsTypeLimitAlertMessage(slots));
            }
            rerenderLfOwner(ctx);
            return;
        }
    }

    const prevCat = slot.payload.category;
    slot.payload.category = nextCat;

    if (prevCat !== nextCat) {
        slot.payload.optionsConfig = null;
        slot.payload.amount = null;
        if ((type === "options" && nextCat && nextCat !== "free")
            || (type === "simple" && nextCat && nextCat !== "free")
            || type === "attribute") {
            slot.payload.names = { de: "", en: "" };
            slot.payload.shortDescriptions = { de: "", en: "" };
            slot.payload.descriptions = { de: "", en: "" };
        }
        if (type === "options" && nextCat === "expertise") {
            slot.payload.optionsConfig = { infoLabel: "skillProfTitle" };
        }
        if (type === "options" && nextCat === "weaponMasteries") {
            slot.payload.optionsConfig = {
                infoLabels: ["ccLfWeaponMasteryOptionsShortLabel"]
            };
        }
        if (type === "spellcraft" && nextCat === "subclassSpells") {
            slot.payload.names = { de: "", en: "" };
            slot.payload.shortDescriptions = { de: "", en: "" };
            slot.payload.descriptions = { de: "-", en: "-" };
            slot.payload.optionsConfig = {
                schoolMode: "all",
                schoolLabels: [],
                selectedByLevel: {}
            };
        }
        // Vorbereiteten Zauber wählen / Zauber erhalten: feste System-Beschreibung
        if (type === "spellcraft"
            && (nextCat === "choosePreparedSpell" || nextCat === "getPreparedSpell")) {
            slot.payload.shortDescriptions = { de: "", en: "" };
            slot.payload.descriptions = { de: "", en: "" };
            // Nur Sheet-Flag; Step2/Infobox setzt Compile aus Kurzbeschreibung
            slot.payload.classDataPartial = {
                classFeaturesCharacterSheet: 1
            };
        }
        // Zaubertrick erhalten/wählen: nur Kurzbeschreibung (wie ASI / Sprachen)
        if (type === "spellcraft"
            && (nextCat === "getCantrip" || nextCat === "chooseCantrip")) {
            slot.payload.shortDescriptions = { de: "", en: "" };
            slot.payload.descriptions = { de: "", en: "" };
            slot.payload.classDataPartial = {
                classFeaturesCharacterSheet: 0
            };
        }
        // Tools: Oberflächen-Label aus Tab1 übernehmen, falls vorhanden
        if (type === "options" && nextCat === "tools" && !isSubclass) {
            const surface = getTab1SurfaceToolLabel(customClassEditorState);
            slot.payload.optionsConfig = {
                toolSurfaceLabel: surface || "",
                mode: "all",
                allowedLabels: []
            };
            slot.boundFromTab1Tool = !!surface;
            slot.contentLocked = false;
        }
        // Zauberwirken Tab2: Tab1-Werte vorbelegen
        if (type === "simple" && nextCat === "spellcasting" && !isSubclass) {
            slot.payload.optionsConfig = {
                spellListLabels: [],
                spellcastingAbility: customClassEditorState.spellcastingAbility || 0,
                spellcastingFocus: normalizeToArray(customClassEditorState.spellcastingFocus)
            };
        }
        if (type === "simple" && nextCat === "spellcasting" && isSubclass) {
            slot.payload.optionsConfig = {
                spellListLabels: [],
                spellcastingAbility: 0,
                spellcastingFocus: []
            };
        }
    }

    // Kategorie Werkzeuge darf mehrfach vorkommen (zusätzliche Dropdowns / Stufen)

    if (!isSubclass) {
        applySubclassSiblingLocks(slots);
        syncClassTraitsFromTab2Slots(slots);
        syncSpellcastingProgressionFromSlots(slots);
    } else {
        syncSpellcastingProgressionFromSlots();
    }
    if (type === "spellcraft") refreshLfSubclassSpellsOrdinals(slots);
    pruneParameterRegistry(slots);
    rerenderLfOwner(ctx);
}

function formatLfDesignation(slot) {
    if (slot.systemPreset === "coreSkills") return tCC("skillProfTitle", "Mastered Skills");
    if (slot.systemPreset === "subclass") return tCC("ccLfTypeSubclassLabel", "Subclass");
    if (slot.systemPreset === "asiAndFeat") return tCC("asiAndFeat", "ASI / Feat");
    if (slot.systemPreset === "epicBoon") return tCC("epicBoon", "Epic Boon");
    if (slot.blockedBySubclass) return tCC("ccLfBlockedBySubclassLabel", "—");

    if (slot.payload.featureType === "options" && slot.payload.category) {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        if (spec) {
            if (spec.designation === "custom") {
                const lang = typeof currentLang !== "undefined" ? currentLang : "de";
                const other = lang === "de" ? "en" : "de";
                return (slot.payload.names?.[lang] || slot.payload.names?.[other] || "") || "—";
            }
            if (spec.designation === "tab1Tool") {
                const toolLabel = getTab1SurfaceToolLabel(customClassEditorState)
                    || slot.payload.optionsConfig?.toolSurfaceLabel;
                return toolLabel ? tCC(toolLabel, toolLabel) : tCC("ccLfCatToolsLabel", "Tools");
            }
            if (spec.designationLabel) return tCC(spec.designationLabel, spec.designationLabel);
        }
    }

    if (slot.payload.featureType === "simple" && slot.payload.category) {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        if (spec) {
            if (spec.designation === "custom") {
                const lang = typeof currentLang !== "undefined" ? currentLang : "de";
                const other = lang === "de" ? "en" : "de";
                return (slot.payload.names?.[lang] || slot.payload.names?.[other] || "") || "—";
            }
            if (spec.designation === "preDefinedLabel") {
                const key = slot.payload.optionsConfig?.preDefinedLabel;
                if (!key) return "—";
                const base = tCC(key, key);
                // Mit Parametern: mehrfache Aufrufe als „Name 2“, „Name 3“, …
                if (getLfPreDefinedParameters(key).length > 0) {
                    const ordinal = getLfPreDefinedOccurrenceOrdinal(slot, key);
                    return ordinal > 1 ? `${base} ${ordinal}` : base;
                }
                return base;
            }
            if (spec.designationLabel) return tCC(spec.designationLabel, spec.designationLabel);
        }
    }

    if (slot.payload.featureType === "attribute" && slot.payload.category) {
        const spec = getLfAttributeCategorySpec(slot.payload.category);
        if (spec?.designationLabel) return tCC(spec.designationLabel, spec.designationLabel);
    }

    if (slot.payload.featureType === "spellcraft" && slot.payload.category) {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        if (spec?.designationLabel) return tCC(spec.designationLabel, spec.designationLabel);
    }

    if (isLfSlotContentEmpty(slot)) {
        return tCC("ccLfEmptyFreeRowLabel", "(leer – verschiebbar)");
    }

    const lang = typeof currentLang !== "undefined" ? currentLang : "de";
    const other = lang === "de" ? "en" : "de";
    return (slot.payload.names?.[lang] || slot.payload.names?.[other] || "") || "—";
}

function getLfRowCssClass(slot) {
    const parts = ["cc-lf-row"];
    if (slot.kind === "fixed") parts.push("cc-lf-row--fixed");
    if (slot.kind === "free") parts.push("cc-lf-row--free");
    if (isLfSlotContentEmpty(slot)) parts.push("cc-lf-row--empty");
    if (slot.blockedBySubclass) parts.push("cc-lf-row--blocked");
    // Farbiger Streifen: Verknüpfung mit anderen Tabs / Erkennung
    if (slot.boundFromTab1Tool
        || (slot.payload?.featureType === "options" && slot.payload?.category === "tools")) {
        parts.push("cc-lf-row--linked-tools");
    }
    if (slot.payload?.featureType === "simple" && slot.payload?.category === "spellcasting") {
        parts.push("cc-lf-row--linked-spellcasting");
    }
    if (slot.payload?.featureType === "spellcraft" && slot.payload?.category === "subclassSpells") {
        parts.push("cc-lf-row--linked-magic-progression");
    }
    if (slot.payload?.featureType === "subclass" || slot.systemPreset === "subclass") {
        parts.push("cc-lf-row--linked-subclass");
    }
    if (isLfSlotDraggable(slot)) parts.push("cc-lf-row--draggable");
    return parts.join(" ");
}

//=======================================================================
// 1.x Floating-Masken & Status-Chips
//=======================================================================

let ccLfFloatContext = null;

function getLfAmountSemantics(slot) {
    if (!slot || !slot.payload.featureType || !slot.payload.category) return null;

    // Merkmaltyp Optionen: Anzahl = Dropdown-Anzahl (pro Kategorie-Limit)
    if (slot.payload.featureType === "options") {
        const max = CUSTOM_CLASS_LF_CONFIG.optionsDropdownLimits[slot.payload.category];
        if (!max) return null;
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        return {
            labelKey: "ccLfAmountDropdownsLabel",
            hintKey: "ccLfAmountDropdownsHintLabel",
            min: 1,
            maxPerSlot: max,
            /** Globales Kontingent über alle Stufen (Verfügbarkeits-Zähler) */
            globalMaxKey: spec?.globalAmountPool ? `_optionsPool_${slot.payload.category}` : null,
            _inlineGlobalMax: spec?.globalAmountPool ? max : null
        };
    }

    const key = `${slot.payload.featureType}:${slot.payload.category}`;
    return CUSTOM_CLASS_LF_CONFIG.amountSemantics[key] || null;
}

function getLfSlotAmountValue(slot) {
    const n = parseInt(slot?.payload?.amount, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

function sumLfAmountPool(slots, type, category, excludeSlotId) {
    return (slots || []).reduce((sum, s) => {
        if (s.slotId === excludeSlotId) return sum;
        if (s.payload.featureType !== type || s.payload.category !== category) return sum;
        return sum + getLfSlotAmountValue(s);
    }, 0);
}

function getLfAmountBudget(slot, slots) {
    const sem = getLfAmountSemantics(slot);
    if (!sem) return null;
    const current = getLfSlotAmountValue(slot);
    const usedOthers = sumLfAmountPool(slots, slot.payload.featureType, slot.payload.category, slot.slotId);
    let globalMax = null;
    if (sem._inlineGlobalMax != null) globalMax = sem._inlineGlobalMax;
    else if (sem.globalMaxKey && CUSTOM_CLASS_LF_CONFIG.limits[sem.globalMaxKey] != null) {
        globalMax = CUSTOM_CLASS_LF_CONFIG.limits[sem.globalMaxKey];
    }
    const remainingGlobal = globalMax != null ? Math.max(0, globalMax - usedOthers) : null;
    let maxAllowed = remainingGlobal != null
        ? Math.min(sem.maxPerSlot, remainingGlobal)
        : sem.maxPerSlot;
    maxAllowed = Math.max(maxAllowed, current);
    return {
        sem,
        usedOthers,
        globalMax,
        remainingGlobal,
        maxAllowed,
        current,
        canIncrease: maxAllowed >= sem.min
    };
}

function lfHasText(map) {
    if (!map) return false;
    return !!(String(map.de || "").trim() || String(map.en || "").trim());
}

/** Gleiches Schloss wie bei gesperrten Dropdowns (select:disabled) */
function getLfLockIconHtml() {
    return `<span class="cc-lf-lock" aria-hidden="true">🔒</span>`;
}

/** Filter-Trichter-Icon für Optionen-Masken mit Filter */
function getLfFilterIconHtml() {
    return `<span class="cc-lf-filter-icon" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d="M3 5h18l-7 8v5l-4 2v-7L3 5z"/></svg></span>`;
}

/** Zahnrad-Icon für Einfach-Optionen-Masken (Parameter etc.) */
function getLfGearIconHtml() {
    return `<span class="cc-lf-gear-icon" aria-hidden="true">⚙</span>`;
}

/** Hinweis „Auswahl (min. X)“ */
function formatLfPickMinHint(min) {
    return String(tCC("ccLfPickMinHintLabel") || "").replace(/\{n\}/g, String(min));
}

/** Hinweis „Optionsauswahl (min. X)“ (Merkmaltyp Optionen) */
function formatLfMinOptionsHint(min) {
    return String(tCC("ccLfMinOptionsHintLabel") || "").replace(/\{n\}/g, String(min));
}

/** Hinweis „Auswahl (min. X/max. Y)“ (Einfach-Pick-Masken) */
function formatLfPickRangeHint(min, max) {
    return String(tCC("ccLfPickRangeHintLabel") || "")
        .replace(/\{min\}/g, String(min))
        .replace(/\{max\}/g, String(max));
}

/** Überschrift für Filter-Dropdowns: „Label [Filter-Icon]“ */
function buildLfOptionsFilterHeadingHtml(labelKey) {
    return `<label class="cc-lf-float-label cc-lf-float-label--filter">${tCC(labelKey)} ${getLfFilterIconHtml()}</label>`;
}

/** Überschrift für Einfach-Auswahlmasken: „Label [Zahnrad]“ */
function buildLfOptionsGearHeadingHtml(labelKey) {
    return `<label class="cc-lf-float-label cc-lf-float-label--filter">${tCC(labelKey)} ${getLfGearIconHtml()}</label>`;
}

/** Label + Control in einer Zeile (z. B. Sprachen-Filter, Seltenheit) */
function buildLfControlRowHtml(labelHtml, controlHtml, extraClass = "") {
    const cls = ["cc-lf-control-row", extraClass].filter(Boolean).join(" ");
    return `<div class="${cls}">${labelHtml}${controlHtml}</div>`;
}

function getLfFixedDesignationKey(slot) {
    if (!slot || !slot.payload.featureType || !slot.payload.category) return null;

    if (slot.payload.featureType === "options") {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        if (!spec || spec.designation === "custom") return null;
        if (spec.designation === "tab1Tool") {
            return getTab1SurfaceToolLabel(customClassEditorState)
                || slot.payload.optionsConfig?.toolSurfaceLabel
                || null;
        }
        return spec.designationLabel || null;
    }

    if (slot.payload.featureType === "simple") {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        if (!spec || spec.designation === "custom") return null;
        if (spec.designation === "preDefinedLabel") {
            return slot.payload.optionsConfig?.preDefinedLabel || null;
        }
        return spec.designationLabel || null;
    }

    if (slot.payload.featureType === "attribute") {
        const spec = getLfAttributeCategorySpec(slot.payload.category);
        return spec?.designationLabel || null;
    }

    if (slot.payload.featureType === "spellcraft") {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        return spec?.designationLabel || null;
    }

    return null;
}

function canOpenLfNameMask(slot) {
    // Feste Bezeichnungen: nur Text in der Zelle, keine Maske
    if (!slot || slot.kind !== "free" || slot.blockedBySubclass || isLfSlotContentEmpty(slot)) return false;
    // Einfach → Vordefiniert: Auswahl in der Bezeichnungsspalte
    if (slot.payload.featureType === "simple" && slot.payload.category === "preDefined") return true;
    if (getLfFixedDesignationKey(slot)) return false;
    if (slot.payload.featureType === "options" && slot.payload.category === "free") return true;
    if (slot.payload.featureType === "simple" && slot.payload.category === "free") return true;
    if (slot.payload.featureType === "spellcraft") return true;
    return false;
}

/**
 * Feste Options-Anzeige (nur Text, keine Maske).
 * Expertise → skillProfTitle; Waffenmeisterschaften → Waffenkategorien & -eigenschaften.
 */
function getLfFixedOptionsDisplayKeys(slot) {
    if (!slot || slot.payload.featureType !== "options") return null;
    const spec = getLfOptionsCategorySpec(slot.payload.category);
    if (spec?.optionsMode === "expertiseInfo") return ["skillProfTitle"];
    if (spec?.optionsMode === "weaponMasteriesInfo") {
        return ["ccLfWeaponMasteryOptionsShortLabel"];
    }
    const cfg = slot.payload.optionsConfig;
    if (Array.isArray(cfg?.infoLabels) && cfg.infoLabels.length) return cfg.infoLabels.slice();
    if (cfg?.infoLabel) return [cfg.infoLabel];
    return null;
}

function getLfFixedOptionsDisplayKey(slot) {
    const keys = getLfFixedOptionsDisplayKeys(slot);
    return keys && keys.length ? keys[0] : null;
}

/**
 * Feste Kurzbeschreibung nur für bestimmte System-Zeilen:
 * Stufe 3 Unterklasse → subclassShortD; Stufe 4 ASI/Talent → asiAndFeatShortD.
 * Nicht bei freier Auswahl und nicht bei weiteren ASI-Stufen / Epic Boon.
 */
function getLfSystemPresetFixedDescKeys(slot) {
    if (!slot || slot.kind !== "fixed" || !slot.systemPreset) return null;
    const level = Number(slot.level);
    if (slot.systemPreset === "subclass" && level === 3) {
        return { shortKey: "subclassShortD", longKey: null };
    }
    if (slot.systemPreset === "asiAndFeat" && level === 4) {
        return { shortKey: "asiAndFeatShortD", longKey: null };
    }
    if (slot.systemPreset === "epicBoon" && level === 19) {
        return { shortKey: "epicBoonShortD", longKey: null };
    }
    return null;
}

function getLfFixedDescKeys(slot) {
    const presetKeys = getLfSystemPresetFixedDescKeys(slot);
    if (presetKeys) return presetKeys;

    if (!slot || !slot.payload.featureType || !slot.payload.category) {
        return { shortKey: null, longKey: null };
    }

    if (slot.payload.featureType === "options") {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        if (!spec) return { shortKey: null, longKey: null };
        if (spec.descMode === "fixed") {
            return { shortKey: spec.shortKey || null, longKey: spec.longKey || null };
        }
        if (spec.descMode === "toolsFixed") {
            const surface = getTab1SurfaceToolLabel(customClassEditorState)
                || slot.payload.optionsConfig?.toolSurfaceLabel;
            return { shortKey: getLfToolsShortDescKey(surface), longKey: null };
        }
        return { shortKey: null, longKey: null };
    }

    if (slot.payload.featureType === "simple") {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        if (!spec) return { shortKey: null, longKey: null };
        if (spec.descMode === "fixed") {
            return { shortKey: spec.shortKey || null, longKey: spec.longKey || null };
        }
        if (spec.descMode === "preDefinedFixed") {
            const meta = getLfPreDefinedFeatureMeta(slot.payload.optionsConfig?.preDefinedLabel);
            return {
                shortKey: meta?.shortKey || null,
                longKey: meta?.longKey || null
            };
        }
        return { shortKey: null, longKey: null };
    }

    if (slot.payload.featureType === "spellcraft") {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        if (!spec) return { shortKey: null, longKey: null };
        if (spec.descMode === "fixed") {
            const cat = slot.payload.category;
            const addToBook = customClassStateUsesSpellbook()
                && (cat === "choosePreparedSpell" || cat === "getPreparedSpell")
                && slot.payload.optionsConfig?.addToSpellbook !== false;
            return {
                shortKey: spec.shortKey || null,
                longKey: addToBook ? null : (spec.longKey || null)
            };
        }
        return { shortKey: null, longKey: null };
    }

    return { shortKey: null, longKey: null };
}

function isLfDescMaskReadonly(slot) {
    if (!slot) return false;
    if (getLfSystemPresetFixedDescKeys(slot)) return true;
    if (!slot.payload.featureType) return false;
    if (slot.payload.featureType === "options") {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        return !!(spec && (spec.descMode === "fixed" || spec.descMode === "toolsFixed"));
    }
    if (slot.payload.featureType === "simple") {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        return !!(spec && (spec.descMode === "fixed" || spec.descMode === "preDefinedFixed"));
    }
    if (slot.payload.featureType === "spellcraft") {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        return !!(spec && spec.descMode === "fixed");
    }
    return false;
}

function canOpenLfDescMask(slot) {
    if (!slot || slot.blockedBySubclass || isLfSlotContentEmpty(slot)) return false;
    // Feste System-Zeilen mit Kurzbeschreibung (Stufe 3 / 4)
    if (getLfSystemPresetFixedDescKeys(slot)) return true;
    if (slot.kind === "fixed") return false;
    if (!slot.payload.featureType || !slot.payload.category) return false;
    if (slot.payload.featureType === "options") {
        const spec = getLfOptionsCategorySpec(slot.payload.category);
        return !!(spec && (spec.descMode === "custom" || spec.descMode === "fixed" || spec.descMode === "toolsFixed"));
    }
    if (slot.payload.featureType === "simple") {
        const spec = getLfSimpleCategorySpec(slot.payload.category);
        if (!spec || spec.descMode === "none") return false;
        // preDefinedFixed erst nach Auswahl sichtbar
        if (spec.descMode === "preDefinedFixed") {
            return !!slot.payload.optionsConfig?.preDefinedLabel;
        }
        return spec.descMode === "custom" || spec.descMode === "fixed";
    }
    if (slot.payload.featureType === "attribute" || slot.payload.featureType === "subclass") return false;
    if (slot.payload.featureType === "spellcraft") {
        const spec = getLfSpellcraftCategorySpec(slot.payload.category);
        return !!(spec && (spec.descMode === "custom" || spec.descMode === "fixed"));
    }
    return true;
}

/** Übersetzungspaar de/en für feste Beschreibungs-Keys */
function getLfTranslationPair(key) {
    if (!key || typeof translations === "undefined") return { de: "", en: "" };
    return {
        de: (translations.de && translations.de[key]) || "",
        en: (translations.en && translations.en[key]) || ""
    };
}

/**
 * Feste Langbeschreibung für gewährte/gewählte vorbereitete Zauber
 * (wie magicInitiateDsheet; {featureLabel} = translationLabel für source.name).
 * Gleicher TAG für „Vorbereiteten Zauber wählen“ und „Zauber erhalten“.
 */
function formatLfChoosePreparedSpellDesc(featureLabel, lang) {
    const key = "ccLfChoosePreparedSpellD";
    let tpl = "";
    if (typeof translations !== "undefined") {
        tpl = (translations[lang] && translations[lang][key])
            || (translations.de && translations.de[key])
            || "";
    }
    if (!tpl) {
        const tag = `[CHOICE_LIST]preparedSpells.source.name.${featureLabel || "…"}[/CHOICE_LIST]`;
        return lang === "en"
            ? `<b>Learned Spells:</b> ${tag} (Cast once/Long Rest without slot or use own slots).`
            : `<b>Erlernte Zauber:</b> ${tag} (Einmal täglich ohne Zauberplatz wirkbar oder mit eigenen Plätzen).`;
    }
    return String(tpl).replace(/\{featureLabel\}/g, featureLabel || "…");
}

/** Übersetzungslabels für feste Keys (Attribut, Fokus, …) */
function resolveLfTranslationLabelText(label, lang) {
    if (!label || label === 0) return "";
    const key = String(label);
    if (typeof translations === "undefined") return key;
    return (translations[lang] && translations[lang][key])
        || (translations.de && translations.de[key])
        || key;
}

/**
 * Custom-Zauberwirken-Langbeschreibung: Tab-1-Attribut/Fokus einsetzen.
 * usesSpellbook → Magier-Absatz zu Vorbereiten / Buch-Einträgen.
 */
function formatLfSpellcastingCustomDesc(abilityLabel, focusLabels, lang, usesSpellbook) {
    const key = usesSpellbook ? "spellcastingCustomSpellbookD" : "spellcastingCustomD";
    let tpl = "";
    if (typeof translations !== "undefined") {
        tpl = (translations[lang] && translations[lang][key])
            || (translations.de && translations.de[key])
            || "";
    }
    const noneText = resolveLfTranslationLabelText("noneLabel", lang) || (lang === "en" ? "None" : "Keine");
    const abilityText = resolveLfTranslationLabelText(abilityLabel, lang) || noneText;
    const focuses = Array.isArray(focusLabels) ? focusLabels.filter(Boolean) : [];
    const focusText = focuses.length
        ? focuses.map(f => resolveLfTranslationLabelText(f, lang) || String(f)).join(", ")
        : noneText;
    if (!tpl) {
        const prepareLine = usesSpellbook
            ? (lang === "en"
                ? "<li><b>Learning and changing prepared spells:</b> After finishing a Long Rest, you can prepare new spells from your Spellbook. You add two new spells to your Spellbook upon leveling up.</li>"
                : "<li><b>Vorbereitete Zauber lernen und ändern:</b> Nach einer Langen Rast kannst du neue Zauber aus deinem Zauberbuch vorbereiten. Beim Stufenaufstieg fügst du zwei neue Zauber zu deinem Zauberbuch hinzu.</li>")
            : (lang === "en"
                ? "<li><b>Learning and changing prepared spells:</b> After finishing a Long Rest, you can change your prepared spells from your class spell lists.</li>"
                : "<li><b>Vorbereitete Zauber lernen und ändern:</b> Nach einer Langen Rast kannst du deine vorbereiteten Zauber aus den Zauberlisten deiner Klasse anpassen.</li>");
        return lang === "en"
            ? `You have learned to cast magic in the form of cantrips and spells.<br><br><ul><li><b>Regain Spell Slots:</b> Long Rest.</li>${prepareLine}<li><b>Spellcasting Ability:</b> ${abilityText}</li><li><b>Spellcasting Focus:</b> ${focusText}</li></ul>`
            : `Du hast gelernt, Magie in Form von Zaubertricken und Zaubern zu wirken.<br><br><ul><li><b>Zauberplätze regenerieren:</b> Lange Rast.</li>${prepareLine}<li><b>Zauberattribut:</b> ${abilityText}</li><li><b>Zauberfokus:</b> ${focusText}</li></ul>`;
    }
    return String(tpl)
        .replace(/\{spellcastingAbility\}/g, abilityText)
        .replace(/\{spellcastingFocus\}/g, focusText);
}

function canOpenLfOptionsMask(slot) {
    if (!slot || slot.kind === "fixed" || slot.blockedBySubclass || isLfSlotContentEmpty(slot)) return false;
    if (!slot.payload.featureType || !slot.payload.category) return false;
    if (slot.payload.featureType === "subclass") return false;
    // Feste Labels → nur Text in der Zelle
    if (getLfFixedOptionsDisplayKeys(slot)) return false;
    // Einfach → Vordefiniert: Maske nur wenn Merkmal gewählt und Parameter-Schema vorhanden
    if (slot.payload.featureType === "simple" && slot.payload.category === "preDefined") {
        const label = slot.payload.optionsConfig?.preDefinedLabel;
        return !!label && getLfPreDefinedParameters(label).length > 0;
    }
    // Optionen → Werkzeuge: Maske erst nach Wahl der Werkzeug-Art (Bezeichnungsspalte)
    if (slot.payload.featureType === "options" && slot.payload.category === "tools") {
        const surface = slot.payload.optionsConfig?.toolSurfaceLabel
            || (!isLfSubclassFeatureSlot(slot) ? getTab1SurfaceToolLabel(customClassEditorState) : "");
        if (!surface) return false;
    }
    const simpleSpec = slot.payload.featureType === "simple"
        ? getLfSimpleCategorySpec(slot.payload.category)
        : null;
    if (simpleSpec?.optionsMode === "none") return false;
    return true;
}

function canOpenLfAmountMask(slot) {
    if (!slot || slot.blockedBySubclass || isLfSlotContentEmpty(slot)) return false;
    // Feste Zeilen: nur Gemeisterte Fertigkeiten dürfen die Anzahl setzen (2–4)
    if (slot.kind === "fixed" && slot.systemPreset !== "coreSkills") return false;
    // Merkmaltyp Einfach / Attribut / Zauberkunst: Anzahl-Spalte immer entwertet
    if (slot.payload.featureType === "simple"
        || slot.payload.featureType === "attribute"
        || slot.payload.featureType === "spellcraft") return false;
    return !!getLfAmountSemantics(slot);
}

function isLfOptionsConfigured(slot) {
    const cfg = slot.payload.optionsConfig;
    if (!cfg) return false;
    const min = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;
    const type = slot.payload.featureType;
    const cat = slot.payload.category;

    if (type === "options") {
        if (cat === "skills") {
            if (cfg.skillFilter === "all" || cfg.skillFilter === "base") return true;
            return Array.isArray(cfg.selectedSkills) && cfg.selectedSkills.length >= min;
        }
        if (cat === "free") {
            return Array.isArray(cfg.choices)
                && cfg.choices.filter(c => lfHasText(c?.names || c)).length >= min;
        }
        if (cat === "tools") {
            if (!cfg.toolSurfaceLabel) return false;
            const mode = cfg.mode
                || (Array.isArray(cfg.allowedLabels) && cfg.allowedLabels.length ? "selection" : "all");
            if (mode === "all") return true;
            return Array.isArray(cfg.allowedLabels) && cfg.allowedLabels.length >= min;
        }
        if (cat === "savingThrows" || cat === "languages") {
            const labels = cfg.allowedLabels || cfg.selectedLabels || [];
            if (cfg.mode === "all" || cfg.mode === "rarity") return !!(cfg.mode === "all" || cfg.rarity);
            return Array.isArray(labels) && labels.length >= min;
        }
        if (cat === "expertise" || cat === "weaponMasteries") return true;
        if (cat === "asiAndFeat") {
            if (cfg.mode === "all" || cfg.mode === "featCategory") return !!cfg.mode;
            return Array.isArray(cfg.selectedFeatLabels) && cfg.selectedFeatLabels.length >= min;
        }
        if (cat === "maneuver") {
            if (cfg.mode === "all") return (cfg.maneuverDice || 0) > 0;
            return Array.isArray(cfg.selectedManeuvers) && cfg.selectedManeuvers.length >= min
                && (cfg.maneuverDice || 0) > 0;
        }
        if (cat === "fightingStyle") {
            if (cfg.mode === "all") return true;
            return Array.isArray(cfg.selectedFeatLabels) && cfg.selectedFeatLabels.length >= min;
        }
    }

    if (type === "simple") {
        if (cat === "preDefined") {
            const label = cfg.preDefinedLabel;
            if (!label) return false;
            const params = getLfPreDefinedParameters(label);
            // Ohne Parameter reicht die Merkmalswahl (Optionen-Zelle bleibt —)
            if (!params.length) return true;
            const values = cfg.parameterValues || {};
            return params.every(p => {
                const raw = values[p.key];
                if (p.valueType === "number") {
                    const n = parseInt(raw, 10);
                    return Number.isFinite(n) && n >= (p.min || 1);
                }
                return String(raw ?? "").trim().length > 0;
            });
        }
        if (cat === "skills") {
            const n = (cfg.selectedSkills || []).length;
            const spec = getLfSimpleCategorySpec("skills");
            return n >= (spec?.pickMin || 1) && n <= (spec?.pickMax || 3);
        }
        if (cat === "savingThrows") {
            if (cfg.mode === "all") return true;
            const n = (cfg.selectedLabels || []).length;
            const spec = getLfSimpleCategorySpec("savingThrows");
            return n >= (spec?.pickMin || 1);
        }
        if (cat === "spellcasting") {
            const n = (cfg.spellListLabels || []).length;
            const spec = getLfSimpleCategorySpec("spellcasting");
            const abilityOk = !!cfg.spellcastingAbility;
            const focusOk = normalizeToArray(cfg.spellcastingFocus).filter(v => v && v !== 0).length >= 1;
            return abilityOk && focusOk
                && n >= (spec?.pickMin || 1) && n <= (spec?.pickMax || 2);
        }
        if (cat === "weaponTraining") {
            const pickMin = getLfSimpleCategorySpec("weaponTraining")?.pickMin || 1;
            const catMode = cfg.weaponCategoryMode || "selection";
            const propMode = cfg.weaponPropertyMode || "selection";
            const remainingCats = getLfRemainingWeaponCategoryNumbers(customClassEditorState);
            const remainingProps = getLfRemainingWeaponPropertyCategoryNumbers(customClassEditorState);
            if (catMode === "all" && remainingCats.length) return true;
            if (propMode === "all" && remainingProps.length) return true;
            const cats = catMode === "selection" ? (cfg.selectedWeaponCategoryNumbers || []) : [];
            const props = propMode === "selection" ? (cfg.selectedWeaponPropertyCategoryNumbers || []) : [];
            const n = (Array.isArray(cats) ? cats.length : 0) + (Array.isArray(props) ? props.length : 0);
            return n >= pickMin;
        }
        if (cat === "armorTraining") {
            const pickMin = getLfSimpleCategorySpec("armorTraining")?.pickMin || 1;
            if (cfg.mode === "all" && getLfRemainingArmorCategoryNumbers(customClassEditorState).length) return true;
            const n = (cfg.selectedArmorCategoryNumbers || []).length;
            return n >= pickMin;
        }
        if (cat === "free") {
            // Parameter ist optional; gilt erst mit gesetzter Bezeichnung als konfiguriert
            if (!cfg.parameterId) return false;
            const param = getLfParameterById(cfg.parameterId);
            if (!(param && lfHasText(param.names))) return false;
            return isLfSimpleFreeParamValueComplete(cfg, param);
        }
        return !!cfg.configured;
    }
    if (type === "attribute") {
        const spec = getLfAttributeCategorySpec(cat);
        if (spec?.optionsMode === "directPoints") {
            const sum = sumLfAbilityPoints(cfg.abilityPoints);
            return sum >= 1 && sum <= (spec.pointsMax || 6);
        }
        if (spec?.optionsMode === "distributionConfig") {
            const points = parseInt(cfg.points, 10) || 0;
            const attrs = cfg.allowedAbilities || [];
            const mode = cfg.distributionMode || "";
            const pointsOk = points >= (spec.pointsMin || 1) && points <= (spec.pointsMax || 6);
            const attrsOk = Array.isArray(attrs) && attrs.length >= (spec.attrsMin || 2);
            if (!pointsOk || !attrsOk || !mode) return false;
            if (mode === "maxPerAbility") {
                const maxPer = parseInt(cfg.maxPerAbility, 10) || 0;
                return maxPer >= 1 && maxPer <= points;
            }
            return mode === "free" || mode === "allOnOne";
        }
        return false;
    }
    if (type === "spellcraft") {
        return isLfSpellcraftOptionsConfigured(cfg, cat);
    }
    return !!cfg.configured;
}

function isLfSpellcraftOptionsConfigured(cfg, cat) {
    if (!cfg) return false;
    const listOk = cfg.listMode === "all"
        || (cfg.listMode === "selection" && Array.isArray(cfg.spellListLabels) && cfg.spellListLabels.length >= 1);

    if (cat === "getCantrip") {
        const picks = (cfg.selectedSpells || []).filter(Boolean);
        return listOk && picks.length >= 1;
    }
    if (cat === "chooseCantrip") {
        const schoolOk = cfg.schoolMode === "all"
            || (cfg.schoolMode === "selection" && Array.isArray(cfg.schoolLabels) && cfg.schoolLabels.length >= 1);
        const pick = parseInt(cfg.pickCount, 10) || 0;
        const spec = getLfSpellcraftCategorySpec("chooseCantrip");
        return listOk && schoolOk
            && pick >= (spec?.pickMin || 1) && pick <= (spec?.pickMax || 3);
    }
    if (cat === "getPreparedSpell") {
        const levelOk = cfg.levelMode === "all"
            || (cfg.levelMode === "selection" && Array.isArray(cfg.levelLabels) && cfg.levelLabels.length >= 1);
        if (!listOk || !levelOk) return false;
        const levels = cfg.levelMode === "all"
            ? getLfPreparedSpellLevelLabels()
            : (cfg.levelLabels || []);
        if (!levels.length) return false;
        return levels.every(lvl => {
            const arr = cfg.selectedByLevel?.[lvl] || [];
            return arr.some(Boolean);
        });
    }
    if (cat === "choosePreparedSpell") {
        const schoolOk = cfg.schoolMode === "all"
            || (cfg.schoolMode === "selection" && Array.isArray(cfg.schoolLabels) && cfg.schoolLabels.length >= 1);
        const levelOk = cfg.levelMode === "all"
            || (cfg.levelMode === "selection" && Array.isArray(cfg.levelLabels) && cfg.levelLabels.length >= 1);
        const pick = parseInt(cfg.pickCount, 10) || 0;
        const spec = getLfSpellcraftCategorySpec("choosePreparedSpell");
        return listOk && schoolOk && levelOk
            && pick >= (spec?.pickMin || 1) && pick <= (spec?.pickMax || 3);
    }
    if (cat === "subclassSpells") {
        // Leere Auswahl = Slot bleibt im Editor, gilt aber nicht als „konfiguriert“ für Gear-Chip
        const schoolOk = cfg.schoolMode === "all"
            || (cfg.schoolMode === "selection" && Array.isArray(cfg.schoolLabels) && cfg.schoolLabels.length >= 1);
        return schoolOk && collectLfSubclassSpellsSelectedLabels(cfg).length >= 1;
    }
    return false;
}

function getLfSkillsPoolCount(skillFilter) {
    const allSkills = typeof skillList !== "undefined" ? skillList : [];
    if (skillFilter === "all") return allSkills.length;
    if (skillFilter === "base") {
        const baseNums = new Set(
            normalizeToArray(customClassEditorState.skillCategoryNumber).map(n => parseInt(n, 10))
        );
        return allSkills.filter(s => baseNums.has(s.skillCategoryNumber)).length;
    }
    return 0;
}

function getLfSavingThrowPoolCount() {
    const granted = new Set(normalizeToArray(customClassEditorState.savingThrowProficiencies));
    const attrs = [
        "strengthLabel", "dexterityLabel", "constitutionLabel",
        "intelligenceLabel", "wisdomLabel", "charismaLabel"
    ];
    return attrs.filter(a => !granted.has(a)).length;
}

function getLfFeatPoolCount(mode, cfg) {
    const feats = typeof featList !== "undefined" ? featList : [];
    if (mode === "all") return feats.length;
    if (mode === "featCategory") {
        const catNum = cfg?.featCategoryNumber || 2;
        return feats.filter(f => f.featCategoryNumber === catNum).length;
    }
    return 0;
}

function getLfManeuverPoolCount() {
    return typeof maneuverCategoryList !== "undefined" ? maneuverCategoryList.length : 0;
}

/** Kampfstil-Talente (featCategoryNumber 3) für Optionen→Fighting Style */
function getLfFightingStyleFeats() {
    if (typeof featList === "undefined") return [];
    return featList.filter(f => f.featCategoryNumber === 3);
}

function getLfFightingStylePoolCount() {
    return getLfFightingStyleFeats().length;
}

/** Poolgröße Optionen→Werkzeuge (Alle): Instrumente / Spiele / Handwerkszeuge */
function getLfToolsPoolCount(surfaceLabel) {
    if (surfaceLabel === "musicalInstrumentLabel" && typeof instrumentList !== "undefined") {
        return instrumentList.length;
    }
    if (surfaceLabel === "gamingSetLabel" && typeof gameList !== "undefined") {
        return gameList.length;
    }
    if (surfaceLabel === "artisansToolsLabel" && typeof toolList !== "undefined") {
        return toolList.filter(t => t.toolCategoryNumber === 1 || t.toolCategoryNumber === 3).length;
    }
    return 0;
}

function getLfLanguagePoolCount(mode, cfg) {
    const langs = (typeof languageList !== "undefined" ? languageList : [])
        .filter(l => l.translationLabel !== "commonLangLabel");
    if (mode === "rarity") {
        const rarity = cfg?.rarity === "rare" ? "rare" : "standard";
        return langs.filter(l => l.langRarity === rarity).length;
    }
    // all / default: kompletter Pool ohne Gemeinsprache
    return langs.length;
}

function countLfOptionsEntries(slot) {
    const cfg = slot.payload.optionsConfig;
    if (!cfg) return 0;
    if (slot.payload.featureType === "simple") {
        if (slot.payload.category === "skills") return (cfg.selectedSkills || []).length;
        if (slot.payload.category === "savingThrows") {
            if (cfg.mode === "all") return getLfSavingThrowPoolCount();
            return (cfg.selectedLabels || []).length;
        }
        if (slot.payload.category === "spellcasting") return (cfg.spellListLabels || []).length;
        if (slot.payload.category === "weaponTraining") {
            const catMode = cfg.weaponCategoryMode || "selection";
            const propMode = cfg.weaponPropertyMode || "selection";
            let n = 0;
            if (catMode === "all") n += getLfRemainingWeaponCategoryNumbers(customClassEditorState).length;
            else n += (cfg.selectedWeaponCategoryNumbers || []).length;
            if (propMode === "all") n += getLfRemainingWeaponPropertyCategoryNumbers(customClassEditorState).length;
            else n += (cfg.selectedWeaponPropertyCategoryNumbers || []).length;
            return n;
        }
        if (slot.payload.category === "armorTraining") {
            if (cfg.mode === "all") return getLfRemainingArmorCategoryNumbers(customClassEditorState).length;
            return (cfg.selectedArmorCategoryNumbers || []).length;
        }
        if (slot.payload.category === "preDefined") {
            const params = getLfPreDefinedParameters(cfg.preDefinedLabel);
            if (params.length) {
                const values = cfg.parameterValues || {};
                return params.filter(p => {
                    const raw = values[p.key];
                    if (p.valueType === "number") return Number.isFinite(parseInt(raw, 10));
                    return String(raw ?? "").trim().length > 0;
                }).length;
            }
            return cfg.preDefinedLabel ? 1 : 0;
        }
        if (slot.payload.category === "free") return cfg.parameterId ? 1 : 0;
        return 0;
    }
    if (slot.payload.featureType === "attribute") {
        const cat = slot.payload.category === "increase" ? "direct" : slot.payload.category;
        if (cat === "direct") return sumLfAbilityPoints(cfg.abilityPoints);
        if (cat === "distribution") return parseInt(cfg.points, 10) || 0;
        return 0;
    }
    if (slot.payload.featureType === "spellcraft") {
        const cat = slot.payload.category;
        if (cat === "getCantrip") return (cfg.selectedSpells || []).filter(Boolean).length;
        if (cat === "getPreparedSpell") {
            let n = 0;
            Object.values(cfg.selectedByLevel || {}).forEach(arr => {
                if (Array.isArray(arr)) n += arr.filter(Boolean).length;
            });
            return n;
        }
        if (cat === "subclassSpells") {
            return collectLfSubclassSpellsSelectedLabels(cfg).length;
        }
        if (cat === "chooseCantrip" || cat === "choosePreparedSpell") {
            return isLfOptionsConfigured(slot) ? (parseInt(cfg.pickCount, 10) || 1) : 0;
        }
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "skills") {
        if (cfg.skillFilter === "all") return getLfSkillsPoolCount("all");
        if (cfg.skillFilter === "base") return getLfSkillsPoolCount("base");
        if (Array.isArray(cfg.selectedSkills)) return cfg.selectedSkills.length;
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "savingThrows") {
        if (cfg.mode === "all") return getLfSavingThrowPoolCount();
        if (Array.isArray(cfg.selectedLabels)) return cfg.selectedLabels.length;
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "languages") {
        if (cfg.mode === "all") return getLfLanguagePoolCount("all", cfg);
        if (cfg.mode === "rarity") return getLfLanguagePoolCount("rarity", cfg);
        if (Array.isArray(cfg.selectedLabels)) return cfg.selectedLabels.length;
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "asiAndFeat") {
        if (cfg.mode === "all") return getLfFeatPoolCount("all", cfg);
        if (cfg.mode === "featCategory") return getLfFeatPoolCount("featCategory", cfg);
        if (Array.isArray(cfg.selectedFeatLabels)) return cfg.selectedFeatLabels.length;
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "maneuver") {
        if (cfg.mode === "all") return getLfManeuverPoolCount();
        if (Array.isArray(cfg.selectedManeuvers)) return cfg.selectedManeuvers.length;
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "fightingStyle") {
        if (cfg.mode === "all") return getLfFightingStylePoolCount();
        if (Array.isArray(cfg.selectedFeatLabels)) return cfg.selectedFeatLabels.length;
        return 0;
    }
    if (slot.payload.featureType === "options" && slot.payload.category === "tools") {
        const mode = cfg.mode
            || (Array.isArray(cfg.allowedLabels) && cfg.allowedLabels.length ? "selection" : "all");
        if (mode === "all") return getLfToolsPoolCount(cfg.toolSurfaceLabel);
        if (Array.isArray(cfg.allowedLabels)) return cfg.allowedLabels.length;
        return 0;
    }
    if (Array.isArray(cfg.choices)) return cfg.choices.filter(c => lfHasText(c?.names || c)).length;
    if (Array.isArray(cfg.allowedLabels)) return cfg.allowedLabels.length;
    if (Array.isArray(cfg.selectedLabels)) return cfg.selectedLabels.length;
    if (Array.isArray(cfg.selectedSkills)) return cfg.selectedSkills.length;
    if (Array.isArray(cfg.selectedFeatLabels)) return cfg.selectedFeatLabels.length;
    if (Array.isArray(cfg.selectedManeuvers)) return cfg.selectedManeuvers.length;
    if (cfg.mode === "all") return 1;
    if (cfg.infoLabel || cfg.infoLabels || cfg.preDefinedLabel) return 1;
    if (Array.isArray(cfg.abilityPoints)) return cfg.abilityPoints.filter(a => (a.points || 0) > 0).length;
    return 0;
}

function buildLfNameCellHtml(slot) {
    // Optionen → Werkzeuge: Werkzeug-Art direkt in der Bezeichnungsspalte wählen
    if (slot.kind === "free" && !slot.blockedBySubclass
        && slot.payload.featureType === "options" && slot.payload.category === "tools") {
        return buildLfToolSurfaceSelectHtml(slot);
    }
    const text = formatLfDesignation(slot);
    if (!canOpenLfNameMask(slot)) {
        const cls = isLfSlotContentEmpty(slot) ? " cc-lf-cell--placeholder" : "";
        return `<span class="${cls.trim()}">${text}</span>`;
    }
    const empty = slot.payload.featureType === "simple" && slot.payload.category === "preDefined"
        ? !slot.payload.optionsConfig?.preDefinedLabel
        : !lfHasText(slot.payload.names);
    return `<button type="button" class="cc-lf-cell-btn${empty ? " cc-lf-cell-btn--empty" : ""}"
        onclick="openLfFloat('${slot.slotId}', 'name', event)"
        onmousedown="event.stopPropagation()">${empty ? tCC("ccLfClickToSetNameLabel", "(Bezeichnung festlegen)") : text}</button>`;
}

function buildLfDescChipsHtml(slot) {
    if (slot.blockedBySubclass || isLfSlotContentEmpty(slot)) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }

    const letters = getLfDescChipLetters();
    const isSc = isLfSubclassFeatureSlot(slot);

    // Unterklassen: nie Kurzbeschreibung / nie „K“/„S“ – nur Langbeschreibung
    if (isSc) {
        const presetKeys = getLfSystemPresetFixedDescKeys(slot);
        if (presetKeys) {
            const hasL = !!presetKeys.longKey;
            if (!hasL) return `<span class="cc-lf-chip-muted">—</span>`;
            return `<button type="button" class="cc-lf-chips cc-lf-chips--readonly" onclick="openLfFloat('${slot.slotId}', 'desc', event)"
                onmousedown="event.stopPropagation()" title="${tCC("ccLfViewFixedDescTitleLabel")}">
                ${getLfLockIconHtml()}
                <span class="cc-lf-chip cc-lf-chip--on" title="${tCC("ccLfChipLongLabel")}">${letters.long}</span>
            </button>`;
        }

        let spec = null;
        if (slot.payload.featureType === "options") spec = getLfOptionsCategorySpec(slot.payload.category);
        else if (slot.payload.featureType === "simple") spec = getLfSimpleCategorySpec(slot.payload.category);
        else if (slot.payload.featureType === "attribute") spec = getLfAttributeCategorySpec(slot.payload.category);
        else if (slot.payload.featureType === "spellcraft") spec = getLfSpellcraftCategorySpec(slot.payload.category);

        if (spec && spec.descMode === "none") {
            return `<span class="cc-lf-chip-muted">—</span>`;
        }
        if (spec && (spec.descMode === "fixed" || spec.descMode === "toolsFixed" || spec.descMode === "preDefinedFixed")) {
            if (spec.descMode === "preDefinedFixed" && !slot.payload.optionsConfig?.preDefinedLabel) {
                return `<span class="cc-lf-chip-muted">—</span>`;
            }
            const keys = getLfFixedDescKeys(slot);
            if (!keys.longKey) return `<span class="cc-lf-chip-muted">—</span>`;
            return `<button type="button" class="cc-lf-chips cc-lf-chips--readonly" onclick="openLfFloat('${slot.slotId}', 'desc', event)"
                onmousedown="event.stopPropagation()" title="${tCC("ccLfViewFixedDescTitleLabel")}">
                ${getLfLockIconHtml()}
                <span class="cc-lf-chip cc-lf-chip--on" title="${tCC("ccLfChipLongLabel")}">${letters.long}</span>
            </button>`;
        }
        if (!canOpenLfDescMask(slot)) {
            return `<span class="cc-lf-chip-muted">—</span>`;
        }
        const hasL = lfHasLongDescriptionContent(slot);
        return `<button type="button" class="cc-lf-chips" onclick="openLfFloat('${slot.slotId}', 'desc', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfEditDescTitleLabel")}">
            <span class="cc-lf-chip${hasL ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipLongLabel")}">${letters.long}</span>
        </button>`;
    }

    const presetKeys = getLfSystemPresetFixedDescKeys(slot);
    if (presetKeys) {
        const hasS = !!presetKeys.shortKey;
        const hasL = !!presetKeys.longKey;
        return `<button type="button" class="cc-lf-chips cc-lf-chips--readonly" onclick="openLfFloat('${slot.slotId}', 'desc', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfViewFixedDescTitleLabel")}">
            ${getLfLockIconHtml()}
            <span class="cc-lf-chip${hasS ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipShortLabel")}">${letters.short}</span>
            <span class="cc-lf-chip${hasL ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipLongLabel")}">${letters.long}</span>
        </button>`;
    }

    // Übrige feste Zeilen ohne eigene Kurzbeschreibung
    if (slot.kind === "fixed") {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }

    let spec = null;
    if (slot.payload.featureType === "options") {
        spec = getLfOptionsCategorySpec(slot.payload.category);
    } else if (slot.payload.featureType === "simple") {
        spec = getLfSimpleCategorySpec(slot.payload.category);
    } else if (slot.payload.featureType === "attribute") {
        spec = getLfAttributeCategorySpec(slot.payload.category);
    } else if (slot.payload.featureType === "spellcraft") {
        spec = getLfSpellcraftCategorySpec(slot.payload.category);
    }

    if (spec && (spec.descMode === "none")) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }

    // Feste Keys → Maske öffnen (nur lesen)
    if (spec && (spec.descMode === "fixed" || spec.descMode === "toolsFixed" || spec.descMode === "preDefinedFixed")) {
        if (spec.descMode === "preDefinedFixed" && !slot.payload.optionsConfig?.preDefinedLabel) {
            return `<span class="cc-lf-chip-muted">—</span>`;
        }
        const keys = getLfFixedDescKeys(slot);
        const hasS = !!keys.shortKey;
        const hasL = !!keys.longKey;
        return `<button type="button" class="cc-lf-chips cc-lf-chips--readonly" onclick="openLfFloat('${slot.slotId}', 'desc', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfViewFixedDescTitleLabel")}">
            ${getLfLockIconHtml()}
            <span class="cc-lf-chip${hasS ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipShortLabel")}">${letters.short}</span>
            <span class="cc-lf-chip${hasL ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipLongLabel")}">${letters.long}</span>
        </button>`;
    }

    if (!canOpenLfDescMask(slot)) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }

    const hasS = lfHasText(slot.payload.shortDescriptions);
    const hasL = lfHasLongDescriptionContent(slot);
    return `<button type="button" class="cc-lf-chips" onclick="openLfFloat('${slot.slotId}', 'desc', event)"
        onmousedown="event.stopPropagation()" title="${tCC("ccLfEditDescTitleLabel")}">
        <span class="cc-lf-chip${hasS ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipShortLabel")}">${letters.short}</span>
        <span class="cc-lf-chip${hasL ? " cc-lf-chip--on" : ""}" title="${tCC("ccLfChipLongLabel")}">${letters.long}</span>
    </button>`;
}

function buildLfOptionsChipHtml(slot) {
    const fixedKeys = getLfFixedOptionsDisplayKeys(slot);
    if (fixedKeys && fixedKeys.length) {
        return `<span>${fixedKeys.map(k => tCC(k)).join(" & ")}</span>`;
    }
    if (!canOpenLfOptionsMask(slot)) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }

    const on = isLfOptionsConfigured(slot);
    const useGear = slot.payload.featureType === "simple"
        || slot.payload.featureType === "attribute"
        || slot.payload.featureType === "spellcraft";
    const icon = useGear ? getLfGearIconHtml() : getLfFilterIconHtml();

    // Einfach → Frei: Parametername + Wert
    if (slot.payload.featureType === "simple" && slot.payload.category === "free") {
        const cfg = slot.payload.optionsConfig || {};
        const param = getLfParameterById(cfg.parameterId);
        const lang = getActiveUiLang();
        const other = lang === "de" ? "en" : "de";
        const name = param
            ? (param.names?.[lang] || param.names?.[other] || "—")
            : "—";
        const valueText = formatLfSimpleFreeParamValueText(cfg, param);
        const label = on ? `${icon} ${escapeLfHtml(name)} ${escapeLfHtml(valueText)}` : `${icon} —`;
        return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
            onclick="openLfFloat('${slot.slotId}', 'options', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfEditOptionsTitleLabel")}">${label}</button>`;
    }

    // Einfach → Vordefiniert: nur Chip-Werte (ohne Parameternamen; showInChip:false ausblenden)
    if (slot.payload.featureType === "simple" && slot.payload.category === "preDefined") {
        const cfg = slot.payload.optionsConfig || {};
        const params = getLfPreDefinedParameters(cfg.preDefinedLabel).filter(p => p.showInChip !== false);
        const values = cfg.parameterValues || {};
        let label = `${icon} —`;
        if (on && params.length) {
            const parts = params.map(p => {
                const v = values[p.key];
                return v != null && String(v).trim() !== "" ? escapeLfHtml(String(v)) : "—";
            });
            label = `${icon} ${parts.join(" · ")}`;
        }
        return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
            onclick="openLfFloat('${slot.slotId}', 'options', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfEditOptionsTitleLabel")}">${label}</button>`;
    }

    // Attribut: Punkte-Anzahl in der Chip-Anzeige
    if (slot.payload.featureType === "attribute") {
        const n = countLfOptionsEntries(slot);
        const label = on ? `${icon} ${n}` : `${icon} —`;
        return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
            onclick="openLfFloat('${slot.slotId}', 'options', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfEditOptionsTitleLabel")}">${label}</button>`;
    }

    // Manöver: Pool-Anzahl + Überlegenheitswürfel (klassenweiter Parameter)
    if (slot.payload.featureType === "options" && slot.payload.category === "maneuver") {
        const n = countLfOptionsEntries(slot);
        const cfg = slot.payload.optionsConfig || {};
        const dice = parseInt(cfg.maneuverDice, 10)
            || getLfEarlierManeuverDice(getLfSlotsForSlot(slot), slot)
            || 0;
        const label = on
            ? `<span class="cc-lf-chip-pair">${icon}<span class="cc-lf-chip-num">${n}</span></span>`
                + `<span class="cc-lf-chip-sep" aria-hidden="true">·</span>`
                + `<span class="cc-lf-chip-pair">${getLfGearIconHtml()}<span class="cc-lf-chip-num">${dice || "—"}</span></span>`
            : `${icon} —`;
        return `<button type="button" class="cc-lf-chip-btn cc-lf-chip-btn--maneuver${on ? " cc-lf-chip-btn--on" : ""}"
            onclick="openLfFloat('${slot.slotId}', 'options', event)"
            onmousedown="event.stopPropagation()" title="${tCC("ccLfEditOptionsTitleLabel")}">${label}</button>`;
    }

    const n = countLfOptionsEntries(slot);
    const label = on ? `${icon} ${n}` : `${icon} —`;
    return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
        onclick="openLfFloat('${slot.slotId}', 'options', event)"
        onmousedown="event.stopPropagation()" title="${tCC("ccLfEditOptionsTitleLabel")}">${label}</button>`;
}

function buildLfAmountChipHtml(slot, slots) {
    // Magieprogression: Ordnungszahl 1…N (read-only)
    if (slot?.payload?.featureType === "spellcraft" && slot.payload?.category === "subclassSpells") {
        const n = getLfSubclassSpellsOrdinal(slot, slots) || getLfSlotAmountValue(slot);
        return n > 0
            ? `<span class="cc-lf-chip-btn cc-lf-chip-btn--on" style="pointer-events:none;">${n}</span>`
            : `<span class="cc-lf-chip-muted">—</span>`;
    }
    // Unterklasse (feste Stufe 3 + freie): Ordnungszahl 1…N (read-only)
    if (isLfSubclassFeatureAmountSlot(slot)) {
        const n = getLfSubclassFeatureOrdinal(slot, slots) || getLfSlotAmountValue(slot);
        return n > 0
            ? `<span class="cc-lf-chip-btn cc-lf-chip-btn--on" style="pointer-events:none;">${n}</span>`
            : `<span class="cc-lf-chip-muted">—</span>`;
    }
    if (!canOpenLfAmountMask(slot)) {
        return `<span class="cc-lf-chip-muted">—</span>`;
    }
    const n = getLfSlotAmountValue(slot);
    const on = n > 0;
    return `<button type="button" class="cc-lf-chip-btn${on ? " cc-lf-chip-btn--on" : ""}"
        onclick="openLfFloat('${slot.slotId}', 'amount', event)"
        onmousedown="event.stopPropagation()" title="${tCC("ccLfEditAmountTitleLabel")}">${on ? `×${n}` : "×—"}</button>`;
}

function escapeLfAttr(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

function escapeLfHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/** Zeichenzähler wie in Tab 1: „X / Y“ rechts, Goldfarbe */
function buildLfCharCountHtml(fieldId, maxLen, currentLen) {
    return `<div class="char-counter" data-for="${fieldId}"><span class="cc-lf-char-cur">${currentLen || 0}</span> / ${maxLen}</div>`;
}

function bindLfFloatCharCounters(root) {
    if (!root) return;
    root.querySelectorAll("input[maxlength], textarea[maxlength]").forEach(el => {
        if (!el.id) return;
        const update = () => {
            const counter = root.querySelector(`.char-counter[data-for="${el.id}"] .cc-lf-char-cur`);
            if (counter) counter.textContent = String(el.value.length);
        };
        el.addEventListener("input", update);
        update();
    });
}

function renderLfFloatLangFields(prefix, values, maxLen, isTextarea) {
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);
    const ordered = [activeLang, ...available.filter(l => l !== activeLang)];

    const field = (lang, collapsed) => {
        const val = values?.[lang] || "";
        const id = `${prefix}_${lang}`;
        const bodyClass = collapsed ? "custom-class-lang-body collapsed" : "custom-class-lang-body";
        const title = getCustomClassLangTitle(lang);
        const header = `
            <div class="custom-class-lang-header" onclick="toggleCcLangHeader(this)">
                <span>${title}</span>
                ${getCcCollapseArrowHtml(!!collapsed)}
            </div>`;
        if (isTextarea) {
            return `<div class="custom-class-lang-block">${header}<div class="${bodyClass}">
                <div class="cc-lf-float-input-wrap">
                    <textarea id="${id}" class="cc-lf-float-input" rows="4" maxlength="${maxLen}">${escapeLfHtml(val)}</textarea>
                    ${buildLfCharCountHtml(id, maxLen, val.length)}
                </div>
            </div></div>`;
        }
        return `<div class="custom-class-lang-block">${header}<div class="${bodyClass}">
            <div class="cc-lf-float-input-wrap cc-lf-float-input-wrap--name">
                <input type="text" id="${id}" class="cc-lf-float-input custom-class-name-input" maxlength="${maxLen}" value="${escapeLfAttr(val)}">
                ${buildLfCharCountHtml(id, maxLen, val.length)}
            </div>
        </div></div>`;
    };

    return ordered.map(lang => field(lang, lang !== activeLang)).join("");
}

function buildLfFloatNameBody(slot) {
    // Einfach → Vordefiniert: Auswahl in der Bezeichnungsmaske
    if (slot.payload.featureType === "simple" && slot.payload.category === "preDefined") {
        return buildLfSimplePreDefinedSelectHtml(slot);
    }
    // Einfach → Frei: Verbesserung + Bezeichnung
    if (slot.payload.featureType === "simple" && slot.payload.category === "free") {
        return buildLfSimpleFreeNameBody(slot);
    }
    return renderLfFloatLangFields("ccLfName", slot.payload.names, CUSTOM_CLASS_LF_CONFIG.nameMax, false);
}

/** Bezeichnungsmaske Einfach→Frei inkl. „Verbesserung von bestehendem Merkmal“ */
function buildLfSimpleFreeNameBody(slot) {
    const sources = getLfSimpleFreeImproveSources(slot);
    const current = slot.payload.optionsConfig?.improvesSlotId || "";
    const opts = sources.map(s => {
        const selected = s.slotId === current ? "selected" : "";
        return `<option value="${escapeLfAttr(s.slotId)}" ${selected}>${escapeLfHtml(formatLfSimpleFreeImproveSourceLabel(s))}</option>`;
    }).join("");
    return `
        <div class="cc-lf-float-field-label">${tCC("ccLfColNameLabel")}</div>
        ${renderLfFloatLangFields("ccLfName", slot.payload.names, CUSTOM_CLASS_LF_CONFIG.nameMax, false)}
        <hr class="cc-lf-float-divider">
        <div class="cc-lf-improve-block">
            <label class="cc-lf-float-label" for="ccLfImproveFrom">${tCC("ccLfImproveExistingFeatureLabel")}</label>
            <select id="ccLfImproveFrom" class="dropdown cc-lf-float-input cc-lf-options-filter"
                onchange="onLfSimpleFreeImproveChange(this.value)">
                <option value="">${tCC("pleaseSelectLabel")}</option>
                ${opts}
            </select>
        </div>
    `;
}

/** Dropdown-Änderung: Bezeichnung vorschlagen + Parameter übernehmen */
function onLfSimpleFreeImproveChange(sourceSlotId) {
    if (!ccLfFloatContext?.slotId) return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx?.slot) return;
    applyLfSimpleFreeImproveFromSource(ctx.slot, sourceSlotId, { forceNames: true });
    const names = ctx.slot.payload.names || {};
    ensureAvailableLanguages(customClassEditorState).forEach(lang => {
        const el = document.getElementById(`ccLfName_${lang}`);
        if (el) el.value = names[lang] || "";
    });
}

/** Dropdown für vordefinierte Einfach-Merkmale (Bezeichnungsspalte) */
function buildLfSimplePreDefinedSelectHtml(slot) {
    const cfg = slot.payload.optionsConfig || {};
    const current = cfg.preDefinedLabel || "";
    const slots = getLfSlotsForSlot(slot);
    const opts = CUSTOM_CLASS_LF_CONFIG.preDefinedFeatures.map(label => {
        const meta = getLfPreDefinedFeatureMeta(label);
        const requires = meta?.requires || null;
        const unlocked = !requires || hasLfPreDefinedOnEarlierLevel(
            slots, requires, slot.level, slot.slotId, slot.index
        );
        const onceOk = canSelectLfPreDefinedLabel(slot, label);
        const selected = current === label ? "selected" : "";
        const disabled = ((!unlocked || !onceOk) && current !== label) ? "disabled" : "";
        const reqHint = (!unlocked && requires)
            ? ` (${tCC("ccLfRequiresEarlierLabel")}: ${tCC(requires)})`
            : "";
        return `<option value="${label}" ${selected} ${disabled}>${tCC(label, label)}${reqHint}</option>`;
    }).join("");
    return `
        <label class="cc-lf-float-label" for="ccLfPreDefinedSelect">${tCC("ccLfExistingFeaturesLabel")}</label>
        <select id="ccLfPreDefinedSelect" class="dropdown cc-lf-float-input cc-lf-options-filter"
            onchange="onLfPreDefinedSelectChange()">
            <option value="">${tCC("pleaseSelectLabel")}</option>
            ${opts}
        </select>
    `;
}

/** Sofort übernehmen und Maske schließen (ohne Overlay-Klick-Race). */
function onLfPreDefinedSelectChange() {
    if (!ccLfFloatContext || ccLfFloatContext.readonly) return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx) return;
    if (!applyLfSimplePreDefinedFromDom(ctx.slot, { soft: false })) return;
    const overlay = document.getElementById("ccLfFloatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    ccLfFloatContext = null;
    rerenderLfOwner(ctx);
}

function buildLfFixedDescPreviewBlock(labelKey, translationKey) {
    if (!translationKey) return "";
    const pair = getLfTranslationPair(translationKey);
    // Platzhalter für Compile-Zeit-Labels (z. B. CHOICE_LIST-Pfad)
    if (translationKey === "ccLfChoosePreparedSpellD") {
        pair.de = formatLfChoosePreparedSpellDesc("…", "de");
        pair.en = formatLfChoosePreparedSpellDesc("…", "en");
    }
    if (translationKey === "spellcastingCustomD" || translationKey === "spellcastingCustomSpellbookD") {
        const state = typeof customClassEditorState !== "undefined" ? customClassEditorState : null;
        const ability = state?.spellcastingAbility || 0;
        const focuses = typeof normalizeToArray === "function"
            ? normalizeToArray(state?.spellcastingFocus).filter(Boolean)
            : [];
        const usesBook = focuses.includes("spellbookLabel");
        pair.de = formatLfSpellcastingCustomDesc(ability, focuses, "de", usesBook);
        pair.en = formatLfSpellcastingCustomDesc(ability, focuses, "en", usesBook);
    }
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);
    const ordered = [activeLang, ...available.filter(l => l !== activeLang)];
    // Gleiches Sprachbox-Layout wie in der bearbeitbaren Kurz-/Beschreibung-Maske
    const sections = ordered.map(lang => {
        const collapsed = lang !== activeLang;
        const bodyClass = collapsed ? "custom-class-lang-body collapsed" : "custom-class-lang-body";
        return `
            <div class="custom-class-lang-block">
                <div class="custom-class-lang-header" onclick="toggleCcLangHeader(this)">
                    <span>${getCustomClassLangTitle(lang)}</span>
                    ${getCcCollapseArrowHtml(!!collapsed)}
                </div>
                <div class="${bodyClass}">
                    <div class="cc-lf-float-preview">${pair[lang] || "—"}</div>
                </div>
            </div>`;
    }).join("");
    return `
        <div class="cc-lf-float-field-label">${tCC(labelKey)}</div>
        ${sections}
    `;
}

function buildLfFloatDescBody(slot) {
    if (isLfDescMaskReadonly(slot)) {
        const keys = getLfFixedDescKeys(slot);
        // Unterklassen: feste Beschreibungen ohne Kurzbeschreibung
        if (isLfSubclassFeatureSlot(slot)) {
            const longHtml = keys.longKey ? buildLfFixedDescPreviewBlock("ccLfChipLongLabel", keys.longKey) : "";
            return longHtml || `<p>—</p>`;
        }
        const shortHtml = keys.shortKey ? buildLfFixedDescPreviewBlock("ccLfChipShortLabel", keys.shortKey) : "";
        const longHtml = keys.longKey ? buildLfFixedDescPreviewBlock("ccLfChipLongLabel", keys.longKey) : "";
        if (shortHtml && longHtml) {
            return `<div class="cc-lf-desc-section">${shortHtml}</div>
                <hr class="cc-lf-float-divider">
                <div class="cc-lf-desc-section">${longHtml}</div>`;
        }
        return shortHtml || longHtml || `<p>—</p>`;
    }

    // Unterklassenmerkmale: nur Langbeschreibung
    if (isLfSubclassFeatureSlot(slot)) {
        return buildLfLongDescSectionHtml(slot);
    }

    return `
        <div class="cc-lf-desc-section">
            <div class="cc-lf-float-field-label">${tCC("ccLfChipShortLabel")}</div>
            ${renderLfFloatLangFields("ccLfShort", slot.payload.shortDescriptions, CUSTOM_CLASS_LF_CONFIG.shortDescMax, true)}
        </div>
        <hr class="cc-lf-float-divider">
        ${buildLfLongDescSectionHtml(slot)}
    `;
}

function buildLfFloatAmountBody(slot, slots) {
    const budget = getLfAmountBudget(slot, slots);
    if (!budget) return `<p>${tCC("ccLfNoAmountForRowLabel")}</p>`;
    const { sem, globalMax, remainingGlobal, maxAllowed, current } = budget;
    const minVal = maxAllowed >= sem.min ? sem.min : 0;
    const value = current > 0 ? Math.min(current, maxAllowed) : (minVal || 0);
    const poolLine = globalMax != null
        ? `<p class="cc-lf-float-pool">${tCC("ccLfAmountRemainingLabel")}: <strong>${remainingGlobal}</strong> / ${globalMax}</p>`
        : "";

    if (maxAllowed < sem.min && current === 0) {
        return `<p class="cc-lf-float-context">${tCC("ccLfAmountPoolExhaustedLabel")}</p>${poolLine}`;
    }

    // Angezeigtes Max = festes Kategorie-Limit; Restkontingent nur über Verfügbarkeits-Zähler
    const displayMax = sem.maxPerSlot;
    const context = slot.payload.featureType === "options"
        ? `${tCC("ccLfAmountDropdownsContextLabel")} (max. ${displayMax}):`
        : `${tCC(sem.labelKey)} (max. ${displayMax}):`;

    return `
        <p class="cc-lf-float-context">${context}</p>
        <input type="number" id="ccLfAmountInput" class="cc-lf-float-input cc-lf-amount-input" min="${minVal}" max="${maxAllowed}"
            step="1" value="${value}"
            oninput="clampCustomClassNumberInput(this, ${minVal}, ${maxAllowed})">
        ${poolLine}
    `;
}

function buildLfCheckboxGridHtml(listId, items, selectedSet, max = null, displayOpts = {}) {
    const uppercase = !!displayOpts.uppercase;
    const lang = typeof currentLang !== "undefined" ? currentLang : "de";
    const sorted = [...items].sort((a, b) => {
        const la = typeof a === "string" ? a : a.translationLabel;
        const lb = typeof b === "string" ? b : b.translationLabel;
        return tCC(la).localeCompare(tCC(lb), lang);
    });
    const hasMax = Number.isFinite(max) && max > 0;
    const selectedCount = [...selectedSet].filter(v =>
        sorted.some(item => (typeof item === "string" ? item : item.translationLabel) === v)
    ).length;
    const atMax = hasMax && selectedCount >= max;
    const dataMax = hasMax ? ` data-max="${max}"` : "";
    const onchange = hasMax ? ` onchange="limitLfCheckboxGrid('${listId}')"` : "";

    return `<div class="cc-lf-check-grid" id="${listId}"${dataMax}>
        ${sorted.map(item => {
            const label = typeof item === "string" ? item : item.translationLabel;
            const isChecked = selectedSet.has(label);
            const checked = isChecked ? "checked" : "";
            const disabled = (atMax && !isChecked) ? "disabled" : "";
            const labelCls = (atMax && !isChecked) ? " class=\"cc-lf-check-disabled\"" : "";
            let text = tCC(label);
            if (uppercase) text = String(text).toLocaleUpperCase(lang);
            // Zauberlisten (Klassen) erhalten in allen Masken ihre definierte Schriftfarbe
            const colorCls = getSpellListColorClass(label);
            const textHtml = colorCls
                ? `<span class="${colorCls}">${escapeLfHtml(text)}</span>`
                : escapeLfHtml(text);
            return `<label${labelCls}><input type="checkbox" value="${label}" ${checked} ${disabled}${onchange}> ${textHtml}</label>`;
        }).join("")}
    </div>`;
}

/**
 * Bei Maximalauswahl: nicht gewählte Checkboxen sperren/ausgrauen,
 * bis mindestens eine Auswahl entfernt wird.
 */
function limitLfCheckboxGrid(listId) {
    const root = document.getElementById(listId);
    if (!root) return;
    const max = parseInt(root.getAttribute("data-max"), 10);
    if (!Number.isFinite(max) || max < 1) return;

    const boxes = Array.from(root.querySelectorAll('input[type="checkbox"]'));
    const checkedCount = boxes.filter(b => b.checked).length;
    // Falls Soft-State über dem Max liegt: überschüssige abwählen
    if (checkedCount > max) {
        boxes.filter(b => b.checked).slice(max).forEach(b => { b.checked = false; });
    }
    const lock = boxes.filter(b => b.checked).length >= max;
    boxes.forEach(box => {
        const label = box.closest("label");
        if (box.checked) {
            box.disabled = false;
            if (label) label.classList.remove("cc-lf-check-disabled");
        } else {
            box.disabled = lock;
            if (label) label.classList.toggle("cc-lf-check-disabled", lock);
        }
    });
}

/** Initialisiert Max-Limits für alle Checkbox-Grids in einem Container */
function initLfCheckboxGridLimits(container) {
    if (!container) return;
    container.querySelectorAll(".cc-lf-check-grid[data-max]").forEach(grid => {
        if (grid.id) limitLfCheckboxGrid(grid.id);
    });
}

function buildLfFloatOptionsBody(slot) {
    const type = slot.payload.featureType;
    const cat = slot.payload.category;
    const cfg = slot.payload.optionsConfig || {};
    const min = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;

    if (type === "options" && cat === "skills") {
        const filter = cfg.skillFilter || "all";
        const selected = new Set(cfg.selectedSkills || []);
        const skills = (typeof skillList !== "undefined" ? skillList : []).map(s => s.translationLabel || s);
        const opts = [
            { v: "selection", k: "ccLfSkillFilterSelectionLabel" },
            { v: "base", k: "ccLfSkillFilterBaseLabel" },
            { v: "all", k: "ccLfSkillFilterAllLabel" }
        ];
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("skillsLabel"),
                `<select id="ccLfSkillFilter" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfSkillSelectWrap').style.display=this.value==='selection'?'block':'none'">
                    ${opts.map(o => `<option value="${o.v}" ${filter === o.v ? "selected" : ""}>${tCC(o.k)}</option>`).join("")}
                </select>`
            )}
            <div id="ccLfSkillSelectWrap" style="display:${filter === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfSkillAllowList", skills, selected)}
            </div>
        `;
    }

    if (type === "options" && cat === "free") {
        const choices = Array.isArray(cfg.choices) && cfg.choices.length
            ? cfg.choices
            : [{ names: { de: "", en: "" }, descriptions: { de: "", en: "" } }, { names: { de: "", en: "" }, descriptions: { de: "", en: "" } }];
        const rows = choices.slice(0, CUSTOM_CLASS_LF_CONFIG.limits.freeOptionsChoicesMax).map((c, i) =>
            buildLfFreeChoiceRowHtml(i, c)
        ).join("");
        const sources = getLfFreeOptionsCopySources(getLfSlotsForSlot(slot), slot.slotId);
        const currentExtends = cfg.extendsSlotId || "";
        const copyOpts = sources.map(s => {
            const label = formatLfFreeOptionsCopySourceLabel(s, sources);
            const selected = s.slotId === currentExtends ? "selected" : "";
            return `<option value="${escapeLfAttr(s.slotId)}" ${selected}>${escapeLfHtml(label)}</option>`;
        }).join("");
        const copyBlock = sources.length
            ? `
            <div class="cc-lf-free-options-copy">
                <label class="cc-lf-float-label" for="ccLfFreeOptionsCopyFrom">${tCC("ccLfFreeOptionsCopyFromLabel")}</label>
                <select id="ccLfFreeOptionsCopyFrom" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="onLfFreeOptionsCopyFromChange(this.value)">
                    <option value="">${tCC("pleaseSelectLabel")}</option>
                    ${copyOpts}
                </select>
            </div>`
            : "";
        return `
            <p class="cc-lf-float-context">${tCC("ccLfFreeOptionsHintLabel")}</p>
            ${copyBlock}
            <div id="ccLfChoiceList">${rows}</div>
            <button type="button" class="custom-class-add-item-btn" style="margin-top:8px;"
                onclick="addLfFreeChoiceRow()">${tCC("ccLfAddOptionEntryLabel")}</button>
        `;
    }

    if (type === "options" && cat === "savingThrows") {
        const granted = new Set(normalizeToArray(customClassEditorState.savingThrowProficiencies));
        const attrs = ["strengthLabel", "dexterityLabel", "constitutionLabel", "intelligenceLabel", "wisdomLabel", "charismaLabel"]
            .filter(a => !granted.has(a));
        const selected = new Set(cfg.selectedLabels || []);
        const mode = cfg.mode || "selection";
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("savingThrowsLabel"),
                `<select id="ccLfSaveMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfSaveSelectWrap').style.display=this.value==='selection'?'block':'none'">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`
            )}
            <div id="ccLfSaveSelectWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfSaveAllowList", attrs, selected)}
            </div>
        `;
    }

    if (type === "options" && cat === "tools") {
        // Werkzeug-Art wird in der Bezeichnungsspalte gewählt; Maske: Alle / Auswahl
        const surface = cfg.toolSurfaceLabel
            || (!isLfSubclassFeatureSlot(slot) ? getTab1SurfaceToolLabel(customClassEditorState) : "")
            || "";
        if (!surface) {
            return `
                ${buildLfOptionsFilterHeadingHtml("ccLfCatToolsLabel")}
                <p class="cc-lf-float-hint">${tCC("ccLfToolsPickSurfaceHintLabel")}</p>
            `;
        }
        let list = [];
        if (surface === "musicalInstrumentLabel" && typeof instrumentList !== "undefined") list = instrumentList;
        else if (surface === "gamingSetLabel" && typeof gameList !== "undefined") list = gameList;
        else if (surface === "artisansToolsLabel" && typeof toolList !== "undefined") {
            list = toolList.filter(t => t.toolCategoryNumber === 1 || t.toolCategoryNumber === 3);
        }
        const mode = cfg.mode || (Array.isArray(cfg.allowedLabels) && cfg.allowedLabels.length ? "selection" : "all");
        const selected = new Set(cfg.allowedLabels || []);
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml(surface),
                `<select id="ccLfToolMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfToolAllowWrap').style.display=this.value==='selection'?'block':'none'">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`
            )}
            <div id="ccLfToolAllowWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfToolAllowList", list, selected)}
            </div>
        `;
    }

    if (type === "options" && cat === "languages") {
        const mode = cfg.mode || "selection";
        const selected = new Set(cfg.selectedLabels || []);
        // Gemeinsprache hat jeder Charakter automatisch → nicht anbieten
        const langs = (typeof languageList !== "undefined" ? languageList : [])
            .filter(l => l.translationLabel !== "commonLangLabel");
        const rarity = cfg.rarity || "standard";
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("languagesLabel"),
                `<select id="ccLfLangMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfLangSelectWrap').style.display=this.value==='selection'?'block':'none';document.getElementById('ccLfLangRarityWrap').style.display=this.value==='rarity'?'flex':'none';">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                    <option value="rarity" ${mode === "rarity" ? "selected" : ""}>${tCC("ccLfLangRarityModeLabel")}</option>
                </select>`
            )}
            <div id="ccLfLangSelectWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfLangAllowList", langs, selected)}
            </div>
            <div id="ccLfLangRarityWrap" class="cc-lf-control-row" style="display:${mode === "rarity" ? "flex" : "none"};">
                <label class="cc-lf-float-label" for="ccLfLangRarity">${tCC("rarityLabel")}</label>
                <select id="ccLfLangRarity" class="dropdown cc-lf-float-input cc-lf-options-filter">
                    <option value="standard" ${rarity === "standard" ? "selected" : ""}>${tCC("ccLfLangRarityStandardLabel")}</option>
                    <option value="rare" ${rarity === "rare" ? "selected" : ""}>${tCC("ccLfLangRarityRareLabel")}</option>
                </select>
            </div>
        `;
    }

    if (type === "options" && cat === "asiAndFeat") {
        const mode = cfg.mode || "all";
        const selected = new Set(cfg.selectedFeatLabels || []);
        const feats = typeof featList !== "undefined" ? featList : [];
        const catNum = cfg.featCategoryNumber || 2;
        const featCatOpts = [
            { n: 1, k: "ccLfFeatCatOriginLabel" },
            { n: 2, k: "ccLfFeatCatGeneralLabel" },
            { n: 3, k: "ccLfFeatCatFightingStyleLabel" },
            { n: 4, k: "ccLfFeatCatEpicBoonLabel" }
        ];
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("ccLfFeatsFilterLabel"),
                `<select id="ccLfFeatMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfFeatSelectWrap').style.display=this.value==='specific'?'block':'none';document.getElementById('ccLfFeatCatWrap').style.display=this.value==='featCategory'?'flex':'none';">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="featCategory" ${mode === "featCategory" ? "selected" : ""}>${tCC("ccLfFeatCategoryModeLabel")}</option>
                    <option value="specific" ${mode === "specific" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`
            )}
            <div id="ccLfFeatCatWrap" class="cc-lf-control-row" style="display:${mode === "featCategory" ? "flex" : "none"};">
                <label class="cc-lf-float-label" for="ccLfFeatCategoryNumber">${tCC("ccLfFeatCategoryModeLabel")}</label>
                <select id="ccLfFeatCategoryNumber" class="dropdown cc-lf-float-input cc-lf-options-filter">
                    ${featCatOpts.map(o =>
                        `<option value="${o.n}" ${catNum === o.n ? "selected" : ""}>${tCC(o.k)}</option>`
                    ).join("")}
                </select>
            </div>
            <div id="ccLfFeatSelectWrap" style="display:${mode === "specific" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfFeatAllowList", feats, selected)}
            </div>
        `;
    }

    if (type === "options" && cat === "maneuver") {
        const mode = cfg.mode || "all";
        const selected = new Set(cfg.selectedManeuvers || []);
        const list = typeof maneuverCategoryList !== "undefined" ? maneuverCategoryList : [];
        const slots = getLfSlotsForSlot(slot);
        const earlierDice = getLfEarlierManeuverDice(slots, slot);
        const ownDice = parseInt(cfg.maneuverDice, 10);
        const dice = ownDice > 0 ? ownDice : (earlierDice || 4);
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("maneuverLabel"),
                `<select id="ccLfManeuverMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfManeuverSelectWrap').style.display=this.value==='selection'?'block':'none'">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`
            )}
            <div id="ccLfManeuverSelectWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfManeuverAllowList", list, selected)}
            </div>
            <div class="cc-lf-maneuver-dice-block cc-lf-param-value-block">
                ${buildLfOptionsGearHeadingHtml("ccLfManeuverDiceLabel")}
                <input type="number" id="ccLfManeuverDice" class="cc-lf-float-input cc-lf-maneuver-dice-input"
                    min="1" max="12" step="1" value="${dice}"
                    oninput="clampCustomClassNumberInput(this, 1, 12)">
            </div>
        `;
    }

    if (type === "options" && cat === "fightingStyle") {
        const mode = cfg.mode || "selection";
        const selected = new Set(cfg.selectedFeatLabels || []);
        const list = getLfFightingStyleFeats();
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("fightingStyleLabel"),
                `<select id="ccLfFightingStyleMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfFightingStyleSelectWrap').style.display=this.value==='selection'?'block':'none'">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`
            )}
            <div id="ccLfFightingStyleSelectWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(min)}</p>
                ${buildLfCheckboxGridHtml("ccLfFightingStyleAllowList", list, selected)}
            </div>
        `;
    }

    if (type === "simple" && cat === "skills") {
        const selected = new Set(cfg.selectedSkills || []);
        const skills = (typeof skillList !== "undefined" ? skillList : []).map(s => s.translationLabel || s);
        const spec = getLfSimpleCategorySpec("skills");
        const pickMin = spec?.pickMin || 1;
        const pickMax = spec?.pickMax || 3;
        return `
            ${buildLfOptionsGearHeadingHtml("skillsLabel")}
            <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickRangeHint(pickMin, pickMax)}</p>
            ${buildLfCheckboxGridHtml("ccLfSimpleSkillList", skills, selected, pickMax)}
        `;
    }

    if (type === "simple" && cat === "savingThrows") {
        const granted = new Set(normalizeToArray(customClassEditorState.savingThrowProficiencies));
        const attrs = [
            "strengthLabel", "dexterityLabel", "constitutionLabel",
            "intelligenceLabel", "wisdomLabel", "charismaLabel"
        ].filter(a => !granted.has(a));
        const selected = new Set(cfg.selectedLabels || []);
        const mode = cfg.mode || "selection";
        const pickMin = getLfSimpleCategorySpec("savingThrows")?.pickMin || 1;
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsGearHeadingHtml("savingThrowsLabel"),
                `<select id="ccLfSimpleSaveMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfSimpleSaveSelectWrap').style.display=this.value==='selection'?'block':'none'">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`
            )}
            <div id="ccLfSimpleSaveSelectWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickMinHint(pickMin)}</p>
                ${buildLfCheckboxGridHtml("ccLfSimpleSaveAllowList", attrs, selected)}
            </div>
        `;
    }

    if (type === "simple" && cat === "spellcasting") {
        const selected = new Set(cfg.spellListLabels || []);
        const lists = getLfSpellcastingClassOptions();
        const spec = getLfSimpleCategorySpec("spellcasting");
        const pickMin = spec?.pickMin || 1;
        const pickMax = spec?.pickMax || 2;
        const ability = cfg.spellcastingAbility || "";
        const focusSelected = new Set(normalizeToArray(cfg.spellcastingFocus).filter(v => v && v !== 0));
        const focusOptions = getLfSpellcastingFocusOptionsForSlot(slot);
        const abilityOpts = (typeof attributeList !== "undefined" ? attributeList : []).map(attr =>
            `<option value="${attr.translationLabel}" ${ability === attr.translationLabel ? "selected" : ""}>${tCC(attr.translationLabel)}</option>`
        ).join("");
        const focusHtml = focusOptions.map(label => {
            const checked = focusSelected.has(label) ? "checked" : "";
            return `<label><input type="checkbox" name="ccLfSpellFocus" value="${label}" ${checked}> ${formatLfSpellcastingFocusOptionLabel(label)}</label>`;
        }).join("");
        return `
            ${buildLfControlRowHtml(
                `<label class="cc-lf-float-label" for="ccLfSpellAbility">${tCC("spellcastingAbilityLabel")}</label>`,
                `<select id="ccLfSpellAbility" class="dropdown cc-lf-float-input cc-lf-options-filter">
                    <option value="">${tCC("pleaseSelectLabel")}</option>
                    ${abilityOpts}
                </select>`
            )}
            <div class="cc-lf-param-value-block">
                <label class="cc-lf-float-label">${tCC("spellcastingFocusLabel")}</label>
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickMinHint(1)}</p>
                <div class="cc-lf-check-grid" id="ccLfSpellFocusList">${focusHtml}</div>
            </div>
            <div class="cc-lf-param-value-block">
                ${buildLfOptionsGearHeadingHtml("ccLfSpellListsHeadingLabel")}
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickRangeHint(pickMin, pickMax)}</p>
                ${buildLfCheckboxGridHtml("ccLfSimpleSpellList", lists, selected, pickMax)}
            </div>
        `;
    }

    // Einfach → Waffenvertrautheit: Kategorien + Eigenschaften (ohne Tab-1-Auswahl)
    if (type === "simple" && cat === "weaponTraining") {
        const tab1Cats = new Set(
            normalizeToArray(customClassEditorState.weaponCategoryNumber).map(n => parseInt(n, 10))
        );
        const tab1Props = new Set(
            normalizeToArray(customClassEditorState.weaponPropertyCategoryNumber).map(n => parseInt(n, 10))
        );
        const weaponCats = (typeof weaponCategory !== "undefined" ? weaponCategory : [])
            .filter(c => !tab1Cats.has(c.weaponCategoryNumber))
            .map(c => c.translationLabel);
        const weaponProps = (typeof weaponProperty !== "undefined" ? weaponProperty : [])
            .filter(p => !tab1Props.has(p.weaponPropertyCategoryNumber))
            .map(p => p.translationLabel);
        const selectedCats = new Set(
            normalizeToArray(cfg.selectedWeaponCategoryNumbers).map(n => {
                const catObj = (typeof weaponCategory !== "undefined" ? weaponCategory : [])
                    .find(c => c.weaponCategoryNumber === parseInt(n, 10));
                return catObj?.translationLabel;
            }).filter(Boolean)
        );
        const selectedProps = new Set(
            normalizeToArray(cfg.selectedWeaponPropertyCategoryNumbers).map(n => {
                const propObj = (typeof weaponProperty !== "undefined" ? weaponProperty : [])
                    .find(p => p.weaponPropertyCategoryNumber === parseInt(n, 10));
                return propObj?.translationLabel;
            }).filter(Boolean)
        );
        const pickMin = getLfSimpleCategorySpec("weaponTraining")?.pickMin || 1;
        const catMode = cfg.weaponCategoryMode || "selection";
        const propMode = cfg.weaponPropertyMode || "selection";
        return `
            <div class="cc-lf-param-value-block">
                ${buildLfControlRowHtml(
                    buildLfOptionsGearHeadingHtml("weaponCategoryLabel"),
                    `<select id="ccLfSimpleWeaponCatMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                        onchange="document.getElementById('ccLfSimpleWeaponCatSelectWrap').style.display=this.value==='selection'?'block':'none'">
                        <option value="all" ${catMode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                        <option value="selection" ${catMode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                    </select>`,
                    "cc-lf-control-row--training-pick"
                )}
                <div id="ccLfSimpleWeaponCatSelectWrap" style="display:${catMode === "selection" ? "block" : "none"};">
                    <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickMinHint(pickMin)}</p>
                    ${buildLfCheckboxGridHtml("ccLfSimpleWeaponCatList", weaponCats, selectedCats)}
                </div>
            </div>
            <div class="cc-lf-param-value-block">
                ${buildLfControlRowHtml(
                    buildLfOptionsGearHeadingHtml("weaponPropertyLabel"),
                    `<select id="ccLfSimpleWeaponPropMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                        onchange="document.getElementById('ccLfSimpleWeaponPropSelectWrap').style.display=this.value==='selection'?'block':'none'">
                        <option value="all" ${propMode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                        <option value="selection" ${propMode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                    </select>`,
                    "cc-lf-control-row--training-pick"
                )}
                <div id="ccLfSimpleWeaponPropSelectWrap" style="display:${propMode === "selection" ? "block" : "none"};">
                    <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickMinHint(pickMin)}</p>
                    ${buildLfCheckboxGridHtml("ccLfSimpleWeaponPropList", weaponProps, selectedProps)}
                </div>
            </div>
        `;
    }

    // Einfach → Rüstungsvertrautheit: Kategorien ohne Tab-1-Auswahl
    if (type === "simple" && cat === "armorTraining") {
        const tab1Armor = new Set(
            normalizeToArray(customClassEditorState.armorCategoryNumber).map(n => parseInt(n, 10))
        );
        const armorCats = (typeof armorCategory !== "undefined" ? armorCategory : [])
            .filter(c => !tab1Armor.has(c.armorCategoryNumber))
            .map(c => c.translationLabel);
        const selected = new Set(
            normalizeToArray(cfg.selectedArmorCategoryNumbers).map(n => {
                const catObj = (typeof armorCategory !== "undefined" ? armorCategory : [])
                    .find(c => c.armorCategoryNumber === parseInt(n, 10));
                return catObj?.translationLabel;
            }).filter(Boolean)
        );
        const pickMin = getLfSimpleCategorySpec("armorTraining")?.pickMin || 1;
        const mode = cfg.mode || "selection";
        return `
            ${buildLfControlRowHtml(
                buildLfOptionsGearHeadingHtml("armorCategoryLabel"),
                `<select id="ccLfSimpleArmorCatMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="document.getElementById('ccLfSimpleArmorCatSelectWrap').style.display=this.value==='selection'?'block':'none'">
                    <option value="all" ${mode === "all" ? "selected" : ""}>${tCC("ccLfSkillFilterAllLabel")}</option>
                    <option value="selection" ${mode === "selection" ? "selected" : ""}>${tCC("ccLfSkillFilterSelectionLabel")}</option>
                </select>`,
                "cc-lf-control-row--training-pick"
            )}
            <div id="ccLfSimpleArmorCatSelectWrap" style="display:${mode === "selection" ? "block" : "none"};">
                <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickMinHint(pickMin)}</p>
                ${buildLfCheckboxGridHtml("ccLfSimpleArmorCatList", armorCats, selected)}
            </div>
        `;
    }

    if (type === "simple" && cat === "free") {
        return buildLfSimpleParameterMaskHtml(slot, cfg);
    }

    if (type === "simple" && cat === "preDefined") {
        return buildLfPreDefinedParamsMaskHtml(slot, cfg);
    }

    if (type === "attribute" && (cat === "direct" || cat === "increase")) {
        return buildLfAttributeDirectMaskHtml(slot, cfg);
    }

    if (type === "attribute" && cat === "distribution") {
        return buildLfAttributeDistributionMaskHtml(slot, cfg);
    }

    if (type === "spellcraft") {
        return buildLfSpellcraftOptionsBody(slot, cfg);
    }

    return `
        <label class="cc-lf-float-label">${tCC("ccLfOptionsGenericLabel")}</label>
        <label class="cc-lf-check-line">
            <input type="checkbox" id="ccLfOptionsConfigured" ${cfg.configured ? "checked" : ""}>
            ${tCC("ccLfOptionsMarkConfiguredLabel")}
        </label>
    `;
}

/** Optionen-Maske für Merkmaltyp Zauberkunst */
function buildLfSpellcraftOptionsBody(slot, cfg) {
    const cat = slot.payload.category;
    if (cat === "getCantrip") return buildLfSpellcraftGetCantripMaskHtml(slot, cfg);
    if (cat === "chooseCantrip") return buildLfSpellcraftChooseCantripMaskHtml(slot, cfg);
    if (cat === "getPreparedSpell") return buildLfSpellcraftGetPreparedMaskHtml(slot, cfg);
    if (cat === "choosePreparedSpell") return buildLfSpellcraftChoosePreparedMaskHtml(slot, cfg);
    if (cat === "subclassSpells") return buildLfSpellcraftSubclassSpellsMaskHtml(slot, cfg);
    return `<p>—</p>`;
}

function buildLfSpellcraftGetCantripMaskHtml(slot, cfg) {
    const listMode = cfg.listMode || "all";
    const lists = getLfSpellcastingClassOptions();
    const selectedLists = new Set(cfg.spellListLabels || []);
    const picks = Array.isArray(cfg.selectedSpells) ? cfg.selectedSpells.slice(0, 3) : [];
    while (picks.length < 3) picks.push("");
    const used = getLfUsedSpellcraftSpellLabels(customClassEditorState.levelFeatures, slot.slotId);
    const spells = filterLfSpells({
        listMode,
        spellListLabels: cfg.spellListLabels || [],
        onlyCantrips: true,
        excludeUsed: used
    });

    const dropdowns = picks.map((val, i) => `
        <div class="cc-lf-sc-cantrip-slot${i > 0 ? " cc-lf-sc-cantrip-slot--spaced" : ""}">
            <label class="cc-lf-float-label" for="ccLfScCantrip_${i}">${tCC("ccLfSpellcraftCantripSlotLabel")} ${i + 1}</label>
            <select id="ccLfScCantrip_${i}" class="dropdown cc-lf-float-input cc-lf-options-filter cc-lf-sc-spell-pick"
                data-index="${i}" onchange="onLfSpellcraftCantripPickChange()">
                ${buildLfSpellDropdownOptionsHtml(spells, val, used)}
            </select>
        </div>
    `).join("");

    return `
        <div class="cc-lf-param-value-block" style="margin-top:0;">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellListsHeadingLabel",
                modeId: "ccLfScListMode",
                listId: "ccLfScSpellLists",
                mode: listMode,
                items: lists,
                selectedSet: selectedLists,
                minHint: 1,
                onchangeExtra: "refreshLfSpellcraftGetCantripDropdowns();"
            })}
        </div>
        <div class="cc-lf-param-value-block cc-lf-sc-cantrip-picks" id="ccLfScCantripPicks">
            ${buildLfOptionsGearHeadingHtml("ccLfSpellcraftCantripsPickLabel")}
            <p class="cc-lf-float-hint cc-lf-sc-cantrip-picks-hint">${formatLfMinOptionsHint(1)}</p>
            ${dropdowns}
        </div>
    `;
}

function buildLfSpellcraftChooseCantripMaskHtml(slot, cfg) {
    const listMode = cfg.listMode || "all";
    const schoolMode = cfg.schoolMode || "all";
    const spec = getLfSpellcraftCategorySpec("chooseCantrip");
    const pickMin = spec?.pickMin || 1;
    const pickMax = spec?.pickMax || 3;
    const pickCount = Math.max(pickMin, Math.min(pickMax, parseInt(cfg.pickCount, 10) || pickMin));
    return `
        <div class="cc-lf-param-value-block" style="margin-top:0;">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellListsHeadingLabel",
                modeId: "ccLfScListMode",
                listId: "ccLfScSpellLists",
                mode: listMode,
                items: getLfSpellcastingClassOptions(),
                selectedSet: new Set(cfg.spellListLabels || []),
                minHint: 1
            })}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellSchoolsHeadingLabel",
                modeId: "ccLfScSchoolMode",
                listId: "ccLfScSchools",
                mode: schoolMode,
                items: getLfSpellSchoolLabels(),
                selectedSet: new Set(cfg.schoolLabels || []),
                minHint: 1
            })}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfControlRowHtml(
                buildLfOptionsGearHeadingHtml("ccLfSpellcraftCantripPickCountLabel"),
                `<input type="number" id="ccLfScPickCount" class="cc-lf-float-input cc-lf-amount-input"
                    min="${pickMin}" max="${pickMax}" step="1" value="${pickCount}"
                    oninput="clampCustomClassNumberInput(this, ${pickMin}, ${pickMax})">`
            )}
            <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickRangeHint(pickMin, pickMax)}</p>
        </div>
    `;
}

function buildLfSpellcraftGetPreparedMaskHtml(slot, cfg) {
    const listMode = cfg.listMode || "all";
    const levelMode = cfg.levelMode || "all";
    const levelLabels = levelMode === "all"
        ? getLfPreparedSpellLevelLabels()
        : (cfg.levelLabels || []);
    const used = getLfUsedSpellcraftSpellLabels(customClassEditorState.levelFeatures, slot.slotId);
    const selectedByLevel = cfg.selectedByLevel || {};

    const sections = levelLabels.map(lvl => {
        const picks = Array.isArray(selectedByLevel[lvl]) ? selectedByLevel[lvl].slice(0, 3) : [];
        while (picks.length < 3) picks.push("");
        const spells = filterLfSpells({
            listMode,
            spellListLabels: cfg.spellListLabels || [],
            levelLabels: [lvl],
            excludeUsed: used
        });
        const dropdowns = picks.map((val, i) => `
            <select id="ccLfScPrep_${lvl}_${i}" class="dropdown cc-lf-float-input cc-lf-options-filter cc-lf-sc-spell-pick"
                data-level="${lvl}" data-index="${i}" onchange="onLfSpellcraftPreparedPickChange()">
                ${buildLfSpellDropdownOptionsHtml(spells, val, used)}
            </select>
        `).join("");
        return `
            <div class="cc-lf-sc-level-block" data-level="${lvl}">
                <div class="cc-lf-float-field-label">${tCC(lvl)}</div>
                <p class="cc-lf-float-hint">${formatLfMinOptionsHint(1)}</p>
                ${dropdowns}
            </div>
        `;
    }).join("");

    return `
        ${buildLfAddToSpellbookCheckboxHtml(cfg)}
        <div class="cc-lf-param-value-block" style="margin-top:0;">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellListsHeadingLabel",
                modeId: "ccLfScListMode",
                listId: "ccLfScSpellLists",
                mode: listMode,
                items: getLfSpellcastingClassOptions(),
                selectedSet: new Set(cfg.spellListLabels || []),
                minHint: 1,
                onchangeExtra: "softRebuildLfSpellcraftPreparedMask();"
            })}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellLevelsHeadingLabel",
                modeId: "ccLfScLevelMode",
                listId: "ccLfScLevels",
                mode: levelMode,
                items: getLfPreparedSpellLevelLabels(),
                selectedSet: new Set(cfg.levelLabels || []),
                minHint: 1,
                onchangeExtra: "softRebuildLfSpellcraftPreparedMask();"
            })}
        </div>
        <div class="cc-lf-param-value-block" id="ccLfScPreparedSections">
            ${buildLfOptionsGearHeadingHtml("ccLfSpellcraftSpellsPickLabel")}
            ${sections || `<p class="cc-lf-float-hint">${tCC("ccLfSpellcraftSelectLevelsFirstLabel")}</p>`}
        </div>
    `;
}

function buildLfSpellcraftChoosePreparedMaskHtml(slot, cfg) {
    const listMode = cfg.listMode || "all";
    const schoolMode = cfg.schoolMode || "all";
    const levelMode = cfg.levelMode || "all";
    const spec = getLfSpellcraftCategorySpec("choosePreparedSpell");
    const pickMin = spec?.pickMin || 1;
    const pickMax = spec?.pickMax || 3;
    const pickCount = Math.max(pickMin, Math.min(pickMax, parseInt(cfg.pickCount, 10) || pickMin));

    return `
        ${buildLfAddToSpellbookCheckboxHtml(cfg)}
        <div class="cc-lf-param-value-block" style="margin-top:0;">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellListsHeadingLabel",
                modeId: "ccLfScListMode",
                listId: "ccLfScSpellLists",
                mode: listMode,
                items: getLfSpellcastingClassOptions(),
                selectedSet: new Set(cfg.spellListLabels || []),
                minHint: 1
            })}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellSchoolsHeadingLabel",
                modeId: "ccLfScSchoolMode",
                listId: "ccLfScSchools",
                mode: schoolMode,
                items: getLfSpellSchoolLabels(),
                selectedSet: new Set(cfg.schoolLabels || []),
                minHint: 1
            })}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellLevelsHeadingLabel",
                modeId: "ccLfScLevelMode",
                listId: "ccLfScLevels",
                mode: levelMode,
                items: getLfPreparedSpellLevelLabels(),
                selectedSet: new Set(cfg.levelLabels || []),
                minHint: 1
            })}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfControlRowHtml(
                buildLfOptionsGearHeadingHtml("ccLfSpellcraftPickCountLabel"),
                `<input type="number" id="ccLfScPickCount" class="cc-lf-float-input cc-lf-amount-input"
                    min="${pickMin}" max="${pickMax}" step="1" value="${pickCount}"
                    oninput="clampCustomClassNumberInput(this, ${pickMin}, ${pickMax})">`
            )}
            <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickRangeHint(pickMin, pickMax)}</p>
        </div>
    `;
}

/** Liest aktuelle Listen-/Modus-Filter aus der Maske */
function readLfSpellcraftListFilterFromDom() {
    const listMode = document.getElementById("ccLfScListMode")?.value || "all";
    const spellListLabels = Array.from(document.querySelectorAll("#ccLfScSpellLists input:checked")).map(el => el.value);
    return { listMode, spellListLabels };
}

function refreshLfSpellcraftGetCantripDropdowns() {
    if (!ccLfFloatContext) return;
    const slot = (customClassEditorState.levelFeatures || []).find(s => s.slotId === ccLfFloatContext.slotId);
    if (!slot) return;
    const { listMode, spellListLabels } = readLfSpellcraftListFilterFromDom();
    const used = getLfUsedSpellcraftSpellLabels(customClassEditorState.levelFeatures, slot.slotId);
    const currentPicks = [];
    for (let i = 0; i < 3; i++) {
        currentPicks.push(document.getElementById(`ccLfScCantrip_${i}`)?.value || "");
    }
    const spells = filterLfSpells({ listMode, spellListLabels, onlyCantrips: true, excludeUsed: used });
    for (let i = 0; i < 3; i++) {
        const sel = document.getElementById(`ccLfScCantrip_${i}`);
        if (!sel) continue;
        const cur = currentPicks[i];
        const blocked = new Set(used);
        currentPicks.forEach((lab, j) => { if (j !== i && lab) blocked.add(lab); });
        sel.innerHTML = buildLfSpellDropdownOptionsHtml(spells, cur, blocked);
    }
}

function onLfSpellcraftCantripPickChange() {
    refreshLfSpellcraftGetCantripDropdowns();
}

function softRebuildLfSpellcraftPreparedMask() {
    if (!ccLfFloatContext || ccLfFloatContext.mode !== "options") return;
    const slot = (customClassEditorState.levelFeatures || []).find(s => s.slotId === ccLfFloatContext.slotId);
    if (!slot || slot.payload.category !== "getPreparedSpell") return;
    applyLfSpellcraftGetPreparedFromDom(slot, { soft: true });
    const bodyEl = document.getElementById("ccLfFloatBody");
    if (!bodyEl) return;
    bodyEl.innerHTML = buildLfSpellcraftGetPreparedMaskHtml(slot, slot.payload.optionsConfig || {});
    bindLfSpellcraftMaskHandlers(slot);
}

function onLfSpellcraftPreparedPickChange() {
    if (!ccLfFloatContext) return;
    const slot = (customClassEditorState.levelFeatures || []).find(s => s.slotId === ccLfFloatContext.slotId);
    if (!slot) return;
    applyLfSpellcraftGetPreparedFromDom(slot, { soft: true });
    softRebuildLfSpellcraftPreparedMask();
}

/** Event-Bindings für Zauberkunst-Masken nach dem Rendern */
function bindLfSpellcraftMaskHandlers(slot) {
    if (!slot || slot.payload.featureType !== "spellcraft") return;
    const cat = slot.payload.category;
    if (cat === "getCantrip") {
        document.querySelectorAll("#ccLfScSpellLists input").forEach(el => {
            el.onchange = refreshLfSpellcraftGetCantripDropdowns;
        });
    }
    if (cat === "getPreparedSpell") {
        document.querySelectorAll("#ccLfScSpellLists input, #ccLfScLevels input").forEach(el => {
            el.onchange = softRebuildLfSpellcraftPreparedMask;
        });
    }
    if (cat === "subclassSpells") {
        document.querySelectorAll("#ccLfScSchools input").forEach(el => {
            el.onchange = softRebuildLfSpellcraftSubclassSpellsMask;
        });
    }
}

function applyLfSpellcraftListFilterFromDom() {
    const listMode = document.getElementById("ccLfScListMode")?.value || "all";
    const spellListLabels = Array.from(document.querySelectorAll("#ccLfScSpellLists input:checked")).map(el => el.value);
    return { listMode, spellListLabels };
}

function applyLfSpellcraftSchoolFilterFromDom() {
    const schoolMode = document.getElementById("ccLfScSchoolMode")?.value || "all";
    const schoolLabels = Array.from(document.querySelectorAll("#ccLfScSchools input:checked")).map(el => el.value);
    return { schoolMode, schoolLabels };
}

function applyLfSpellcraftLevelFilterFromDom() {
    const levelMode = document.getElementById("ccLfScLevelMode")?.value || "all";
    const levelLabels = Array.from(document.querySelectorAll("#ccLfScLevels input:checked")).map(el => el.value);
    return { levelMode, levelLabels };
}

function applyLfSpellcraftGetCantripFromDom(slot, { soft = false } = {}) {
    const { listMode, spellListLabels } = applyLfSpellcraftListFilterFromDom();
    const selectedSpells = [];
    for (let i = 0; i < 3; i++) {
        selectedSpells.push(document.getElementById(`ccLfScCantrip_${i}`)?.value || "");
    }
    const filled = selectedSpells.filter(Boolean);
    if (!soft) {
        if (listMode === "selection" && spellListLabels.length < 1) {
            alert(tCC("ccLfSpellListsHeadingLabel"));
            return false;
        }
        if (filled.length < 1) {
            alert(tCC("ccLfSpellcraftCantripsPickLabel"));
            return false;
        }
        // Globale Einmaligkeit + keine Duplikate in dieser Maske
        if (new Set(filled).size !== filled.length) {
            alert(tCC("ccLfSpellcraftDuplicateAlertLabel"));
            return false;
        }
        const used = getLfUsedSpellcraftSpellLabels(customClassEditorState.levelFeatures, slot.slotId);
        if (filled.some(lab => used.has(lab))) {
            alert(tCC("ccLfSpellcraftAlreadyUsedAlertLabel"));
            return false;
        }
    }
    slot.payload.optionsConfig = { listMode, spellListLabels, selectedSpells };
    return true;
}

function applyLfSpellcraftChooseCantripFromDom(slot, { soft = false } = {}) {
    const { listMode, spellListLabels } = applyLfSpellcraftListFilterFromDom();
    const { schoolMode, schoolLabels } = applyLfSpellcraftSchoolFilterFromDom();
    const spec = getLfSpellcraftCategorySpec("chooseCantrip");
    const pickMin = spec?.pickMin || 1;
    const pickMax = spec?.pickMax || 3;
    let pickCount = parseInt(document.getElementById("ccLfScPickCount")?.value, 10) || 0;
    pickCount = Math.max(0, Math.min(pickMax, pickCount));

    if (!soft) {
        if (listMode === "selection" && spellListLabels.length < 1) {
            alert(tCC("ccLfSpellListsHeadingLabel"));
            return false;
        }
        if (schoolMode === "selection" && schoolLabels.length < 1) {
            alert(tCC("ccLfSpellSchoolsHeadingLabel"));
            return false;
        }
        if (pickCount < pickMin || pickCount > pickMax) {
            alert(`${tCC("ccLfSpellcraftCantripPickCountLabel")} (${pickMin}–${pickMax})`);
            return false;
        }
    }
    slot.payload.optionsConfig = { listMode, spellListLabels, schoolMode, schoolLabels, pickCount };
    return true;
}

function applyLfSpellcraftGetPreparedFromDom(slot, { soft = false } = {}) {
    const { listMode, spellListLabels } = applyLfSpellcraftListFilterFromDom();
    const { levelMode, levelLabels } = applyLfSpellcraftLevelFilterFromDom();
    const activeLevels = levelMode === "all" ? getLfPreparedSpellLevelLabels() : levelLabels;
    const selectedByLevel = {};
    const allFilled = [];
    activeLevels.forEach(lvl => {
        const picks = [];
        for (let i = 0; i < 3; i++) {
            picks.push(document.getElementById(`ccLfScPrep_${lvl}_${i}`)?.value || "");
        }
        selectedByLevel[lvl] = picks;
        picks.filter(Boolean).forEach(lab => allFilled.push(lab));
    });

    if (!soft) {
        if (listMode === "selection" && spellListLabels.length < 1) {
            alert(tCC("ccLfSpellListsHeadingLabel"));
            return false;
        }
        if (levelMode === "selection" && levelLabels.length < 1) {
            alert(tCC("ccLfSpellLevelsHeadingLabel"));
            return false;
        }
        if (!activeLevels.length) {
            alert(tCC("ccLfSpellcraftSelectLevelsFirstLabel"));
            return false;
        }
        const missing = activeLevels.some(lvl => !(selectedByLevel[lvl] || []).some(Boolean));
        if (missing) {
            alert(tCC("ccLfSpellcraftSpellsPickLabel"));
            return false;
        }
        if (new Set(allFilled).size !== allFilled.length) {
            alert(tCC("ccLfSpellcraftDuplicateAlertLabel"));
            return false;
        }
        const used = getLfUsedSpellcraftSpellLabels(customClassEditorState.levelFeatures, slot.slotId);
        if (allFilled.some(lab => used.has(lab))) {
            alert(tCC("ccLfSpellcraftAlreadyUsedAlertLabel"));
            return false;
        }
    }
    slot.payload.optionsConfig = { listMode, spellListLabels, levelMode, levelLabels, selectedByLevel };
    slot.payload.optionsConfig = readLfAddToSpellbookFromDom(slot.payload.optionsConfig);
    return true;
}

function applyLfSpellcraftChoosePreparedFromDom(slot, { soft = false } = {}) {
    const { listMode, spellListLabels } = applyLfSpellcraftListFilterFromDom();
    const { schoolMode, schoolLabels } = applyLfSpellcraftSchoolFilterFromDom();
    const { levelMode, levelLabels } = applyLfSpellcraftLevelFilterFromDom();
    const spec = getLfSpellcraftCategorySpec("choosePreparedSpell");
    const pickMin = spec?.pickMin || 1;
    const pickMax = spec?.pickMax || 3;
    let pickCount = parseInt(document.getElementById("ccLfScPickCount")?.value, 10) || 0;
    pickCount = Math.max(0, Math.min(pickMax, pickCount));

    if (!soft) {
        if (listMode === "selection" && spellListLabels.length < 1) {
            alert(tCC("ccLfSpellListsHeadingLabel"));
            return false;
        }
        if (schoolMode === "selection" && schoolLabels.length < 1) {
            alert(tCC("ccLfSpellSchoolsHeadingLabel"));
            return false;
        }
        if (levelMode === "selection" && levelLabels.length < 1) {
            alert(tCC("ccLfSpellLevelsHeadingLabel"));
            return false;
        }
        if (pickCount < pickMin || pickCount > pickMax) {
            alert(`${tCC("ccLfSpellcraftPickCountLabel")} (${pickMin}–${pickMax})`);
            return false;
        }
    }
    slot.payload.optionsConfig = {
        listMode, spellListLabels, schoolMode, schoolLabels, levelMode, levelLabels, pickCount
    };
    slot.payload.optionsConfig = readLfAddToSpellbookFromDom(slot.payload.optionsConfig);
    return true;
}

/** Checkbox „… in das Zauberbuch“ (nur bei Basis-Zauberbuch-Fokus) */
function buildLfAddToSpellbookCheckboxHtml(cfg) {
    if (!customClassStateUsesSpellbook()) return "";
    const checked = cfg?.addToSpellbook !== false ? "checked" : "";
    return `
        <div class="cc-lf-param-value-block cc-lf-add-to-spellbook">
            <label class="cc-lf-add-to-spellbook-label">
                <input type="checkbox" id="ccLfAddToSpellbook" ${checked}>
                ${escapeLfHtml(tCC("ccLfAddToSpellbookLabel"))}
            </label>
        </div>`;
}

function readLfAddToSpellbookFromDom(cfg) {
    if (!customClassStateUsesSpellbook()) {
        const next = { ...(cfg || {}) };
        delete next.addToSpellbook;
        return next;
    }
    const el = document.getElementById("ccLfAddToSpellbook");
    // Default an, wenn Checkbox fehlt
    const on = el ? !!el.checked : true;
    return { ...(cfg || {}), addToSpellbook: on };
}

function buildLfSpellcraftSubclassSpellsMaskHtml(slot) {
    let cfg = slot.payload?.optionsConfig || {};
    const slots = getLfSlotsForSlot(slot);
    // Ungültige Wahlen (Tab 4 / Ascending) vor Anzeige bereinigen
    sanitizeLfSubclassSpellsSlotSelections(slot, slots, customClassEditorState);
    cfg = slot.payload.optionsConfig || cfg || {};

    const schoolMode = cfg.schoolMode || "all";
    const schoolLabels = cfg.schoolLabels || [];
    const entryLists = getLfSpellcastingEntrySpellListLabels(customClassEditorState);
    const allowedGrades = getLfSubclassSpellsAllowedGradeLabels(slot, slots, customClassEditorState);
    const dropPerGrade = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsDropdownsPerGrade || 3;
    const maxTotal = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsPerInvocationMax || 3;
    const selectedByLevel = cfg.selectedByLevel || {};
    const used = getLfUsedSpellcraftSpellLabels(slots, slot.slotId);
    const selectedCount = collectLfSubclassSpellsSelectedLabels(cfg).length;

    const hintHtml = `
        <p class="cc-lf-float-hint cc-lf-subclass-spells-hint-intro">${escapeLfHtml(tCC("ccLfSubclassSpellsHintIntroLabel"))}</p>
        <ol class="cc-lf-float-hint cc-lf-subclass-spells-hint-list">
            <li>${escapeLfHtml(tCC("ccLfSubclassSpellsHint1Label"))}</li>
            <li>${escapeLfHtml(tCC("ccLfSubclassSpellsHint2Label"))}</li>
        </ol>
    `;

    const sections = allowedGrades.map(lvl => {
        const picks = Array.isArray(selectedByLevel[lvl]) ? selectedByLevel[lvl].slice(0, dropPerGrade) : [];
        while (picks.length < dropPerGrade) picks.push("");
        const spells = filterLfSpells({
            listMode: entryLists.length ? "selection" : "all",
            spellListLabels: entryLists,
            schoolMode,
            schoolLabels,
            levelLabels: [lvl],
            excludeUsed: used
        });
        const dropdowns = picks.map((val, i) => `
            <select id="ccLfScSubSp_${lvl}_${i}" class="dropdown cc-lf-float-input cc-lf-options-filter cc-lf-sc-spell-pick"
                data-level="${lvl}" data-index="${i}" onchange="onLfSpellcraftSubclassSpellsPickChange()">
                ${buildLfSpellDropdownOptionsHtml(spells, val, used)}
            </select>
        `).join("");
        return `
            <div class="cc-lf-sc-level-block" data-level="${lvl}">
                <div class="cc-lf-float-field-label">${tCC(lvl)}</div>
                ${dropdowns}
            </div>
        `;
    }).join("");

    return `
        ${buildLfAddToSpellbookCheckboxHtml(cfg)}
        <div class="cc-lf-subclass-spells-hint" style="margin-top:0;">${hintHtml}</div>
        <div class="cc-lf-param-value-block">
            ${buildLfSpellcraftFilterBlockHtml({
                headingKey: "ccLfSpellSchoolsHeadingLabel",
                modeId: "ccLfScSchoolMode",
                listId: "ccLfScSchools",
                mode: schoolMode,
                items: getLfSpellSchoolLabels(),
                selectedSet: new Set(schoolLabels),
                minHint: 1,
                onchangeExtra: "softRebuildLfSpellcraftSubclassSpellsMask();"
            })}
        </div>
        <div class="cc-lf-param-value-block" id="ccLfScSubclassSpellsSections">
            <div class="cc-lf-control-row" style="margin-bottom:8px;">
                ${buildLfOptionsGearHeadingHtml("ccLfSpellcraftSpellsPickLabel")}
                <span id="ccLfScSubclassSpellsCounter" class="cc-lf-sc-pick-counter">${selectedCount}/${maxTotal}</span>
            </div>
            ${sections || `<p class="cc-lf-float-hint">${tCC("ccLfSubclassSpellsNoGradesLabel")}</p>`}
        </div>
    `;
}

function softRebuildLfSpellcraftSubclassSpellsMask() {
    if (!ccLfFloatContext) return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx?.slot || ctx.slot.payload.category !== "subclassSpells") return;
    applyLfSpellcraftSubclassSpellsFromDom(ctx.slot, { soft: true });
    const bodyEl = document.getElementById("ccLfFloatBody");
    if (!bodyEl) return;
    bodyEl.innerHTML = buildLfSpellcraftSubclassSpellsMaskHtml(ctx.slot, ctx.slot.payload.optionsConfig || {});
    bindLfSpellcraftMaskHandlers(ctx.slot);
}

function onLfSpellcraftSubclassSpellsPickChange() {
    if (!ccLfFloatContext) return;
    const ctx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!ctx?.slot) return;
    applyLfSpellcraftSubclassSpellsFromDom(ctx.slot, { soft: true });
    const maxTotal = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsPerInvocationMax || 3;
    const count = collectLfSubclassSpellsSelectedLabels(ctx.slot.payload.optionsConfig).length;
    const counter = document.getElementById("ccLfScSubclassSpellsCounter");
    if (counter) counter.textContent = `${count}/${maxTotal}`;
    // Über Limit: letzte Wahl zurücksetzen
    if (count > maxTotal) {
        const sel = document.activeElement;
        if (sel && sel.tagName === "SELECT") {
            sel.value = "";
            applyLfSpellcraftSubclassSpellsFromDom(ctx.slot, { soft: true });
            const recount = collectLfSubclassSpellsSelectedLabels(ctx.slot.payload.optionsConfig).length;
            if (counter) counter.textContent = `${recount}/${maxTotal}`;
        }
    }
}

function applyLfSpellcraftSubclassSpellsFromDom(slot, { soft = false } = {}) {
    const slots = getLfSlotsForSlot(slot);
    const { schoolMode, schoolLabels } = applyLfSpellcraftSchoolFilterFromDom();
    const allowedGrades = getLfSubclassSpellsAllowedGradeLabels(slot, slots, customClassEditorState);
    const dropPerGrade = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsDropdownsPerGrade || 3;
    const maxTotal = CUSTOM_CLASS_LF_CONFIG.limits.subclassSpellsPerInvocationMax || 3;
    const selectedByLevel = {};
    const allFilled = [];

    // DOM-Grade oder zuletzt erlaubte Grade lesen
    const gradeNodes = document.querySelectorAll("#ccLfScSubclassSpellsSections .cc-lf-sc-level-block[data-level]");
    const grades = gradeNodes.length
        ? Array.from(gradeNodes).map(el => el.getAttribute("data-level")).filter(Boolean)
        : allowedGrades.slice();

    grades.forEach(lvl => {
        const picks = [];
        for (let i = 0; i < dropPerGrade; i++) {
            picks.push(document.getElementById(`ccLfScSubSp_${lvl}_${i}`)?.value || "");
        }
        selectedByLevel[lvl] = picks;
        picks.filter(Boolean).forEach(lab => allFilled.push(lab));
    });

    if (!soft) {
        if (schoolMode === "selection" && schoolLabels.length < 1) {
            alert(tCC("ccLfSpellSchoolsHeadingLabel"));
            return false;
        }
        if (allFilled.length > maxTotal) {
            alert(`${allFilled.length}/${maxTotal}`);
            return false;
        }
        if (new Set(allFilled).size !== allFilled.length) {
            alert(tCC("ccLfSpellcraftDuplicateAlertLabel"));
            return false;
        }
        const used = getLfUsedSpellcraftSpellLabels(slots, slot.slotId);
        if (allFilled.some(lab => used.has(lab))) {
            alert(tCC("ccLfSpellcraftAlreadyUsedAlertLabel"));
            return false;
        }
    }

    // Überzählige leeren (soft: auf maxTotal kürzen)
    if (allFilled.length > maxTotal) {
        let keep = 0;
        Object.keys(selectedByLevel).forEach(lvl => {
            selectedByLevel[lvl] = (selectedByLevel[lvl] || []).map(lab => {
                if (!lab) return "";
                if (keep < maxTotal) {
                    keep += 1;
                    return lab;
                }
                return "";
            });
        });
    }

    slot.payload.optionsConfig = {
        schoolMode,
        schoolLabels,
        selectedByLevel,
        // Persistierte Eingangslisten (Referenz; Filter-UI hat keine Listenwahl)
        spellListLabels: getLfSpellcastingEntrySpellListLabels(customClassEditorState)
    };
    slot.payload.optionsConfig = readLfAddToSpellbookFromDom(slot.payload.optionsConfig);
    slot.payload.descriptions = { de: "-", en: "-" };
    refreshLfSubclassSpellsOrdinals(slots);
    return true;
}

/** Attribut → Direkt: Punkte fest auf Attribute verteilen (Summe max. 6) */
function buildLfAttributeDirectMaskHtml(slot, cfg) {
    const attrs = getLfAbilityAttributeLabels();
    const pointsMax = getLfAttributeCategorySpec("direct")?.pointsMax
        || CUSTOM_CLASS_LF_CONFIG.limits.attributePointsMax;
    const pointsMap = {};
    (cfg.abilityPoints || []).forEach(a => { pointsMap[a.ability] = a.points || 0; });
    const used = sumLfAbilityPoints(cfg.abilityPoints);
    return `
        ${buildLfOptionsGearHeadingHtml("ccLfAttrDirectPointsHeadingLabel")}
        <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickRangeHint(1, pointsMax)}</p>
        <div class="cc-lf-attr-grid" id="ccLfAttrPoints">
            ${attrs.map(a => `
                <label class="cc-lf-attr-direct-label">
                    <span class="cc-lf-attr-name">${escapeLfHtml(tCC(a))}</span>
                    <input type="number" class="cc-lf-float-input cc-lf-attr-direct-input" data-ability="${a}"
                        min="0" max="${pointsMax}" step="1" value="${pointsMap[a] || 0}"
                        oninput="onLfAttrDirectPointInput(this, ${pointsMax})">
                </label>
            `).join("")}
        </div>
        <p class="cc-lf-float-pool cc-lf-float-pool--center" id="ccLfAttrDirectPool">${tCC("ccLfAmountRemainingLabel")}: <strong>${Math.max(0, pointsMax - used)}</strong> / ${pointsMax}</p>
    `;
}

/** Live-Begrenzung der Direkt-Punkteverteilung (Summe ≤ max) */
function onLfAttrDirectPointInput(input, pointsMax) {
    if (!input) return;
    const root = document.getElementById("ccLfAttrPoints");
    if (!root) return;
    const boxes = Array.from(root.querySelectorAll("input[data-ability]"));
    let sum = boxes.reduce((s, el) => s + (Math.max(0, parseInt(el.value, 10) || 0)), 0);
    if (sum > pointsMax) {
        const others = sum - (Math.max(0, parseInt(input.value, 10) || 0));
        const maxForThis = Math.max(0, pointsMax - others);
        input.value = String(maxForThis);
        sum = pointsMax;
    }
    const pool = document.getElementById("ccLfAttrDirectPool");
    if (pool) {
        pool.innerHTML = `${tCC("ccLfAmountRemainingLabel")}: <strong>${Math.max(0, pointsMax - sum)}</strong> / ${pointsMax}`;
    }
}

/** Attribut → Verteilung: Punkte, erlaubte Attribute, Verteilungsmodus */
function buildLfAttributeDistributionMaskHtml(slot, cfg) {
    const spec = getLfAttributeCategorySpec("distribution");
    const pointsMin = spec?.pointsMin || 1;
    const pointsMax = spec?.pointsMax || 6;
    const attrsMin = spec?.attrsMin || 2;
    const points = Math.max(pointsMin, Math.min(pointsMax, parseInt(cfg.points, 10) || pointsMin));
    const mode = cfg.distributionMode || "free";
    const maxPer = Math.max(1, Math.min(points, parseInt(cfg.maxPerAbility, 10) || 1));
    const selected = new Set(cfg.allowedAbilities || []);
    const attrs = getLfAbilityAttributeLabels();

    const modeOpts = [
        { v: "free", k: "ccLfAttrDistModeFreeLabel" },
        { v: "maxPerAbility", k: "ccLfAttrDistModeMaxPerLabel" },
        { v: "allOnOne", k: "ccLfAttrDistModeAllOnOneLabel" }
    ];

    return `
        <div class="cc-lf-float-field-label cc-lf-attr-dist-title">${tCC("ccLfAttrDistOptionsHeadingLabel")}</div>
        ${buildLfControlRowHtml(
            buildLfOptionsGearHeadingHtml("ccLfAttrPointsLabel"),
            `<input type="number" id="ccLfAttrDistPoints" class="cc-lf-float-input cc-lf-amount-input"
                min="${pointsMin}" max="${pointsMax}" step="1" value="${points}"
                oninput="clampCustomClassNumberInput(this, ${pointsMin}, ${pointsMax}); onLfAttrDistPointsChange()">`
        )}
        <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfPickRangeHint(pointsMin, pointsMax)}</p>
        <div class="cc-lf-param-value-block">
            <label class="cc-lf-float-label">${tCC("ccLfAttrAllowedLabel")}</label>
            <p class="cc-lf-float-hint cc-lf-float-hint--after-filter">${formatLfMinOptionsHint(attrsMin)}</p>
            ${buildLfCheckboxGridHtml("ccLfAttrAllowList", attrs, selected)}
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfControlRowHtml(
                buildLfOptionsFilterHeadingHtml("ccLfAttrDistModeLabel"),
                `<select id="ccLfAttrDistMode" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    onchange="onLfAttrDistModeChange()">
                    ${modeOpts.map(o => `<option value="${o.v}" ${mode === o.v ? "selected" : ""}>${tCC(o.k)}</option>`).join("")}
                </select>`
            )}
            <div id="ccLfAttrMaxPerWrap" style="display:${mode === "maxPerAbility" ? "block" : "none"}; margin-top:12px;">
                <label class="cc-lf-float-label" for="ccLfAttrMaxPer">${tCC("ccLfAttrMaxPerAbilityLabel")}</label>
                <input type="number" id="ccLfAttrMaxPer" class="cc-lf-float-input cc-lf-amount-input"
                    min="1" max="${points}" step="1" value="${maxPer}"
                    oninput="clampCustomClassNumberInput(this, 1, parseInt(document.getElementById('ccLfAttrDistPoints')?.value, 10) || ${pointsMax})">
            </div>
        </div>
    `;
}

function onLfAttrDistModeChange() {
    const mode = document.getElementById("ccLfAttrDistMode")?.value || "free";
    const wrap = document.getElementById("ccLfAttrMaxPerWrap");
    if (wrap) wrap.style.display = mode === "maxPerAbility" ? "block" : "none";
}

function onLfAttrDistPointsChange() {
    const points = parseInt(document.getElementById("ccLfAttrDistPoints")?.value, 10) || 1;
    const maxPer = document.getElementById("ccLfAttrMaxPer");
    if (maxPer) {
        maxPer.max = String(points);
        clampCustomClassNumberInput(maxPer, 1, points);
    }
}

function buildLfSimpleParameterMaskHtml(slot, cfg) {
    const selectExisting = !!cfg.selectExisting;
    const registry = ensureParameterRegistry();
    const param = getLfParameterById(cfg.parameterId);
    // Bei Übernahme: Modus fest aus Registry; sonst aus Slot/Registry (Default: nur Wert)
    const mode = normalizeLfParameterValueMode(selectExisting && param ? param : (param || cfg));
    const value = cfg.value || 1;
    const die = normalizeLfDieParameterValue(cfg.die, LF_SIMPLE_FREE_DIE_OPTIONS, "D6");
    const nameMax = CUSTOM_CLASS_LF_CONFIG.parameterNameMax;
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);
    const ordered = [activeLang, ...available.filter(l => l !== activeLang)];
    const names = param?.names || { de: "", en: "" };
    const modeLocked = selectExisting;

    const nameFields = ordered.map(lang => {
        const collapsed = lang !== activeLang;
        const bodyClass = collapsed ? "custom-class-lang-body collapsed" : "custom-class-lang-body";
        const id = `ccLfParamName_${lang}`;
        const val = (names[lang] || "").slice(0, nameMax);
        return `
            <div class="custom-class-lang-block">
                <div class="custom-class-lang-header" onclick="toggleCcLangHeader(this)">
                    <span>${getCustomClassLangTitle(lang)}</span>
                    ${getCcCollapseArrowHtml(!!collapsed)}
                </div>
                <div class="${bodyClass}">
                    <div class="cc-lf-float-input-wrap cc-lf-float-input-wrap--name">
                        <input type="text" id="${id}" class="cc-lf-float-input custom-class-name-input"
                            maxlength="${nameMax}" value="${escapeLfAttr(val)}"
                            ${selectExisting ? "disabled" : ""}>
                        ${buildLfCharCountHtml(id, nameMax, val.length)}
                    </div>
                </div>
            </div>`;
    }).join("");

    const dropdownOpts = registry.map(p => {
        const lang = activeLang;
        const other = lang === "de" ? "en" : "de";
        const label = p.names?.[lang] || p.names?.[other] || p.id;
        const selected = cfg.parameterId === p.id ? "selected" : "";
        return `<option value="${p.id}" ${selected}>${escapeLfHtml(label)}</option>`;
    }).join("");

    const dieOpts = LF_SIMPLE_FREE_DIE_OPTIONS.map(d =>
        `<option value="${d}" ${d === die ? "selected" : ""}>${d}</option>`
    ).join("");

    return `
        <label class="cc-lf-check-line">
            <input type="checkbox" id="ccLfParamSelectExisting" ${selectExisting ? "checked" : ""}
                onchange="toggleLfSimpleParamMode(this.checked)">
            ${tCC("ccLfParamSelectExistingLabel")}
        </label>
        <div id="ccLfParamNameWrap" style="display:${selectExisting ? "none" : "block"};">
            <label class="cc-lf-float-label">${tCC("ccLfParamNameLabel")}</label>
            ${nameFields}
        </div>
        <div id="ccLfParamSelectWrap" style="display:${selectExisting ? "block" : "none"};">
            <label class="cc-lf-float-label" for="ccLfParamSelect">${tCC("ccLfParamNameLabel")}</label>
            <select id="ccLfParamSelect" class="dropdown cc-lf-float-input cc-lf-options-filter"
                onchange="onLfSimpleParamExistingChange(this.value)">
                <option value="">${tCC("pleaseSelectLabel")}</option>
                ${dropdownOpts}
            </select>
        </div>
        <div class="cc-lf-param-mode-checks">
            <label class="cc-lf-check-line">
                <input type="checkbox" id="ccLfParamUseValue" ${mode.useValue ? "checked" : ""}
                    ${modeLocked ? "disabled" : ""}
                    onchange="onLfSimpleParamModeCheckboxChange()">
                ${tCC("ccLfParamUseValueLabel")}
            </label>
            <label class="cc-lf-check-line">
                <input type="checkbox" id="ccLfParamUseDie" ${mode.useDie ? "checked" : ""}
                    ${modeLocked ? "disabled" : ""}
                    onchange="onLfSimpleParamModeCheckboxChange()">
                ${tCC("ccLfParamUseDieLabel")}
            </label>
        </div>
        <div class="cc-lf-param-value-block">
            ${buildLfOptionsGearHeadingHtml("ccLfParamValueLabel")}
            <div class="cc-lf-param-value-row">
                <span id="ccLfParamValueInputWrap" style="display:${mode.useValue ? "inline-flex" : "none"};">
                    <input type="number" id="ccLfParamValue" class="cc-lf-float-input cc-lf-amount-input"
                        min="1" max="20" step="1" value="${value}"
                        oninput="clampCustomClassNumberInput(this, 1, 20)">
                </span>
                <span id="ccLfParamTimesSep" class="cc-lf-param-times-sep"
                    style="display:${mode.useValue && mode.useDie ? "inline" : "none"};">×</span>
                <span id="ccLfParamDieWrap" style="display:${mode.useDie ? "inline-flex" : "none"};">
                    <select id="ccLfParamDie" class="dropdown cc-lf-float-input cc-lf-options-filter">
                        ${dieOpts}
                    </select>
                </span>
            </div>
        </div>
    `;
}

/**
 * Optionen-Maske für Einfach → Vordefiniert mit festen LEVEL_VAL-Parametern.
 * Pro Parameter: übersetzter Name + Zahnrad-Wertfeld (ohne „Parameterbezeichnung“).
 */
function buildLfPreDefinedParamsMaskHtml(slot, cfg) {
    const label = cfg.preDefinedLabel || "";
    const params = getLfPreDefinedParameters(label);
    if (!params.length) {
        return `<p class="cc-lf-float-hint">${tCC("ccLfPreDefinedNoParamsHintLabel")}</p>`;
    }
    const values = cfg.parameterValues || buildLfPreDefinedDefaultParameterValues(label);
    const blocks = params.map(p => {
        const key = p.key;
        const raw = values[key] != null ? values[key] : p.defaultValue;
        const inputId = `ccLfPreDefParam_${key}`;
        const titleKey = p.nameKey || key;
        let valueControls;
        if (p.valueType === "valueDie") {
            const fixedDie = String(p.dieFixed || "D6").toUpperCase();
            const parsed = parseLfValueDieParameter(raw, fixedDie, 1);
            const min = p.valueMin != null ? p.valueMin : 1;
            const max = p.valueMax != null ? p.valueMax : 10;
            const count = Math.max(min, Math.min(max, parsed.count));
            const dieOpts = LF_SIMPLE_FREE_DIE_OPTIONS.map(d =>
                `<option value="${d}" ${d === fixedDie ? "selected" : ""}>${d}</option>`
            ).join("");
            valueControls = `
                ${buildLfOptionsGearHeadingHtml("ccLfParamValueLabel")}
                <div class="cc-lf-param-value-row">
                    <span class="cc-lf-param-value-input-wrap" style="display:inline-flex;">
                        <input type="number" id="${inputId}_count" class="cc-lf-float-input cc-lf-amount-input"
                            data-param-key="${escapeLfAttr(key)}" data-value-type="valueDie"
                            min="${min}" max="${max}" step="1" value="${count}"
                            oninput="clampCustomClassNumberInput(this, ${min}, ${max})">
                    </span>
                    <span class="cc-lf-param-times-sep" style="display:inline;">×</span>
                    <span class="cc-lf-param-die-wrap" style="display:inline-flex;">
                        <select id="${inputId}_die" class="dropdown cc-lf-float-input cc-lf-options-filter" disabled>
                            ${dieOpts}
                        </select>
                    </span>
                </div>`;
        } else if (p.valueType === "number") {
            const min = p.min != null ? p.min : 1;
            const max = p.max != null ? p.max : 20;
            const n = Math.max(min, Math.min(max, parseInt(raw, 10) || min));
            valueControls = `
                ${buildLfOptionsGearHeadingHtml("ccLfParamValueLabel")}
                <input type="number" id="${inputId}" class="cc-lf-float-input cc-lf-amount-input"
                    data-param-key="${escapeLfAttr(key)}" data-value-type="number"
                    min="${min}" max="${max}" step="1" value="${n}"
                    oninput="clampCustomClassNumberInput(this, ${min}, ${max})">`;
        } else if (p.valueType === "die" || p.valueType === "select") {
            const selectOptions = p.valueType === "die"
                ? (Array.isArray(p.dieOptions) && p.dieOptions.length
                    ? p.dieOptions
                    : ["D4", "D6", "D8", "D10", "D12", "D20"])
                : (Array.isArray(p.selectOptions) && p.selectOptions.length
                    ? p.selectOptions
                    : []);
            const selected = p.valueType === "die"
                ? normalizeLfDieParameterValue(raw, selectOptions, p.defaultValue || "D6")
                : normalizeLfSelectParameterValue(raw, selectOptions, p.defaultValue || selectOptions[0] || "");
            const opts = selectOptions.map(d =>
                `<option value="${escapeLfAttr(d)}" ${String(d) === String(selected) ? "selected" : ""}>${escapeLfHtml(d)}</option>`
            ).join("");
            valueControls = buildLfControlRowHtml(
                buildLfOptionsGearHeadingHtml("ccLfParamValueLabel"),
                `<select id="${inputId}" class="dropdown cc-lf-float-input cc-lf-options-filter"
                    data-param-key="${escapeLfAttr(key)}" data-value-type="${escapeLfAttr(p.valueType)}">${opts}</select>`,
                "cc-lf-control-row--predef-select"
            );
        } else {
            const maxLen = p.maxLength || 10;
            const val = String(raw ?? "").slice(0, maxLen);
            valueControls = `
                ${buildLfOptionsGearHeadingHtml("ccLfParamValueLabel")}
                <div class="cc-lf-float-input-wrap cc-lf-float-input-wrap--name">
                    <input type="text" id="${inputId}" class="cc-lf-float-input custom-class-name-input"
                        data-param-key="${escapeLfAttr(key)}" data-value-type="text"
                        maxlength="${maxLen}" value="${escapeLfAttr(val)}">
                    ${buildLfCharCountHtml(inputId, maxLen, val.length)}
                </div>`;
        }
        return `
            <div class="cc-lf-param-value-block" data-predef-param="${escapeLfAttr(key)}">
                <label class="cc-lf-float-label">${tCC(titleKey, key)}</label>
                ${valueControls}
            </div>`;
    }).join("");
    return blocks;
}

function applyLfSimpleParamValueModeUi(mode) {
    const normalized = normalizeLfParameterValueMode(mode);
    const valueWrap = document.getElementById("ccLfParamValueInputWrap");
    const dieWrap = document.getElementById("ccLfParamDieWrap");
    const timesEl = document.getElementById("ccLfParamTimesSep");
    if (valueWrap) valueWrap.style.display = normalized.useValue ? "inline-flex" : "none";
    if (dieWrap) dieWrap.style.display = normalized.useDie ? "inline-flex" : "none";
    if (timesEl) timesEl.style.display = (normalized.useValue && normalized.useDie) ? "inline" : "none";
}

/** Checkboxen Wert/Würfel → sichtbare Eingabefelder */
function onLfSimpleParamModeCheckboxChange() {
    const useValueEl = document.getElementById("ccLfParamUseValue");
    const useDieEl = document.getElementById("ccLfParamUseDie");
    if (!useValueEl || !useDieEl) return;
    // Mindestens eine Option muss aktiv bleiben
    if (!useValueEl.checked && !useDieEl.checked) {
        useValueEl.checked = true;
    }
    applyLfSimpleParamValueModeUi({
        useValue: useValueEl.checked,
        useDie: useDieEl.checked
    });
}

/**
 * Wert/Würfel-Checkboxen aus Parameter (oder DOM) spiegeln.
 * locked=true bei Parameter-Übernahme (nicht änderbar).
 */
function syncLfSimpleParamModeControls(parameterId, { locked = false } = {}) {
    const useValueEl = document.getElementById("ccLfParamUseValue");
    const useDieEl = document.getElementById("ccLfParamUseDie");
    if (!useValueEl || !useDieEl) return;
    const param = parameterId ? getLfParameterById(parameterId) : null;
    const mode = param
        ? normalizeLfParameterValueMode(param)
        : normalizeLfParameterValueMode({
            useValue: useValueEl.checked,
            useDie: useDieEl.checked
        });
    useValueEl.checked = mode.useValue;
    useDieEl.checked = mode.useDie;
    useValueEl.disabled = !!locked;
    useDieEl.disabled = !!locked;
    applyLfSimpleParamValueModeUi(mode);
}

function toggleLfSimpleParamMode(selectExisting) {
    const nameWrap = document.getElementById("ccLfParamNameWrap");
    const selectWrap = document.getElementById("ccLfParamSelectWrap");
    if (nameWrap) nameWrap.style.display = selectExisting ? "none" : "block";
    if (selectWrap) selectWrap.style.display = selectExisting ? "block" : "none";
    document.querySelectorAll("#ccLfParamNameWrap input").forEach(el => {
        el.disabled = !!selectExisting;
    });
    if (selectExisting) {
        const parameterId = document.getElementById("ccLfParamSelect")?.value || "";
        if (parameterId) onLfSimpleParamExistingChange(parameterId);
        else syncLfSimpleParamModeControls("", { locked: true });
    } else {
        // Eigenen Parameter anlegen/bearbeiten → Modus wieder editierbar
        const useValueEl = document.getElementById("ccLfParamUseValue");
        const useDieEl = document.getElementById("ccLfParamUseDie");
        if (useValueEl) useValueEl.disabled = false;
        if (useDieEl) useDieEl.disabled = false;
        onLfSimpleParamModeCheckboxChange();
    }
}

function buildLfFreeChoiceLangBoxHtml(index, lang, collapsed, names, descs) {
    const nameMax = CUSTOM_CLASS_LF_CONFIG.nameMax;
    const descMax = CUSTOM_CLASS_LF_CONFIG.descMax;
    const idBase = `ccLfChoice_${index}`;
    const nameId = `${idBase}_name_${lang}`;
    const descId = `${idBase}_desc_${lang}`;
    const nameVal = names?.[lang] || "";
    const descVal = descs?.[lang] || "";
    const bodyClass = collapsed ? "custom-class-lang-body collapsed" : "custom-class-lang-body";
    return `
        <div class="custom-class-lang-block cc-lang-box-dashed" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="toggleCcLangHeader(this)">
                <span>${getCustomClassLangTitle(lang)}</span>
                ${getCcCollapseArrowHtml(!!collapsed)}
            </div>
            <div class="${bodyClass}">
                <div class="cc-lf-float-field-label">${tCC("ccLfColNameLabel")}</div>
                <div class="cc-lf-float-input-wrap cc-lf-float-input-wrap--name">
                    <input type="text" id="${nameId}" class="cc-lf-float-input custom-class-name-input cc-lf-choice-name-${lang}"
                        maxlength="${nameMax}" value="${escapeLfAttr(nameVal)}">
                    ${buildLfCharCountHtml(nameId, nameMax, nameVal.length)}
                </div>
                <div class="cc-lf-float-field-label">${tCC("ccLfChipLongLabel")}</div>
                <div class="cc-lf-float-input-wrap">
                    <textarea id="${descId}" class="cc-lf-float-input cc-lf-choice-desc-${lang}" rows="2"
                        maxlength="${descMax}">${escapeLfHtml(descVal)}</textarea>
                    ${buildLfCharCountHtml(descId, descMax, descVal.length)}
                </div>
            </div>
        </div>`;
}

function buildLfFreeChoiceRowHtml(index, choice) {
    const names = choice?.names || { de: choice?.de || "", en: choice?.en || "" };
    const descs = choice?.descriptions || { de: "", en: "" };
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);
    const ordered = [activeLang, ...available.filter(l => l !== activeLang)];
    const langBoxes = ordered.map(lang =>
        buildLfFreeChoiceLangBoxHtml(index, lang, lang !== activeLang, names, descs)
    ).join("");
    const minChoices = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;
    const removeBtn = index >= 2
        ? `<button type="button" class="cc-lf-choice-remove" aria-label="${tCC("customClassCancelLabel")}"
            onclick="removeLfFreeChoiceRow(this); event.stopPropagation();"
            onmousedown="event.stopPropagation()">&times;</button>`
        : "";
    return `
        <div class="cc-lf-choice-row">
            ${removeBtn}
            <label><strong>${tCC("ccLfOptionEntryLabel")} ${index + 1}</strong></label>
            ${langBoxes}
        </div>`;
}

function renumberLfFreeChoiceRows() {
    const list = document.getElementById("ccLfChoiceList");
    if (!list) return;
    const minChoices = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;
    Array.from(list.children).forEach((row, i) => {
        const label = row.querySelector("label strong");
        if (label) label.textContent = `${tCC("ccLfOptionEntryLabel")} ${i + 1}`;
        let removeBtn = row.querySelector(".cc-lf-choice-remove");
        const showRemove = i + 1 >= 3 && list.children.length > minChoices;
        if (showRemove && !removeBtn) {
            removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "cc-lf-choice-remove";
            removeBtn.setAttribute("aria-label", tCC("customClassCancelLabel"));
            removeBtn.innerHTML = "&times;";
            removeBtn.onclick = (e) => { removeLfFreeChoiceRow(removeBtn); e.stopPropagation(); };
            removeBtn.onmousedown = (e) => e.stopPropagation();
            row.insertBefore(removeBtn, row.firstChild);
        } else if (removeBtn) {
            removeBtn.style.display = showRemove ? "" : "none";
        }
    });
}

function removeLfFreeChoiceRow(btn) {
    const row = btn?.closest?.(".cc-lf-choice-row");
    const list = document.getElementById("ccLfChoiceList");
    if (!row || !list) return;
    const minChoices = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;
    if (list.children.length <= minChoices) return;
    row.remove();
    renumberLfFreeChoiceRows();
}

function addLfFreeChoiceRow() {
    const list = document.getElementById("ccLfChoiceList");
    if (!list) return;
    if (list.children.length >= CUSTOM_CLASS_LF_CONFIG.limits.freeOptionsChoicesMax) return;
    const i = list.children.length;
    const wrap = document.createElement("div");
    wrap.innerHTML = buildLfFreeChoiceRowHtml(i, null);
    const row = wrap.firstElementChild;
    list.appendChild(row);
    bindLfFloatCharCounters(row);
    renumberLfFreeChoiceRows();
}

/**
 * Optionen→Frei: Einträge einer früheren Stufe in die aktuelle Maske kopieren.
 * Ersetzt vorhandene Maskeneinträge; Zielanzahl = max(Quelle, aktuelle Anzahl-Spalte, Minimum).
 * Merkmalsbezeichnung als editierbarer Vorschlag (Zähmen → Zähmen 2), wenn Ziel leer.
 */
function onLfFreeOptionsCopyFromChange(sourceSlotId) {
    if (!sourceSlotId || !ccLfFloatContext?.slotId) return;
    const targetCtx = resolveLfSlotContext(ccLfFloatContext.slotId);
    if (!targetCtx) return;
    const source = findLfSlotAnywhere(sourceSlotId);
    const target = targetCtx.slot;
    if (!source || !target) return;

    const list = document.getElementById("ccLfChoiceList");
    if (!list) return;

    const minChoices = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;
    const maxChoices = CUSTOM_CLASS_LF_CONFIG.limits.freeOptionsChoicesMax;
    const cloned = cloneLfFreeChoices(source.payload?.optionsConfig?.choices);
    const amount = getLfSlotAmountValue(target);
    let targetCount = Math.max(cloned.length, amount, minChoices);
    targetCount = Math.min(maxChoices, targetCount);

    const emptyChoice = () => ({ names: { de: "", en: "" }, descriptions: { de: "", en: "" } });
    while (cloned.length < targetCount) cloned.push(emptyChoice());
    const finalChoices = cloned.slice(0, targetCount);

    list.innerHTML = finalChoices.map((c, i) => buildLfFreeChoiceRowHtml(i, c)).join("");
    bindLfFloatCharCounters(list);
    renumberLfFreeChoiceRows();

    // Familien-Link setzen (Charakterbogen: ein Block, wachsende CHOICE_LIST)
    const parentFamilyId = ensureLfFreeOptionsFamilyId(source);
    target.payload.optionsConfig = {
        ...(target.payload.optionsConfig || {}),
        extendsSlotId: sourceSlotId,
        featureFamilyId: parentFamilyId
    };

    // Bezeichnung nur vorschlagen, wenn noch leer
    if (!lfHasText(target.payload.names) && lfHasText(source.payload?.names)) {
        target.payload.names = buildLfSuggestedFeatureNamesFromSource(source.payload.names);
    }
    ensureLfFreeOptionsChoiceTagsOnSlot(target);
}

function openLfFloat(slotId, mode, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx) return;
    const { slot, slots } = ctx;

    if (mode === "name" && !canOpenLfNameMask(slot)) return;
    if (mode === "desc" && !canOpenLfDescMask(slot)) return;
    if (mode === "options" && !canOpenLfOptionsMask(slot)) return;
    if (mode === "amount" && !canOpenLfAmountMask(slot)) return;

    const titleEl = document.getElementById("ccLfFloatTitle");
    const hintEl = document.getElementById("ccLfFloatHint");
    const bodyEl = document.getElementById("ccLfFloatBody");
    const overlay = document.getElementById("ccLfFloatOverlay");
    if (!titleEl || !bodyEl || !overlay) return;

    const descReadonly = mode === "desc" && isLfDescMaskReadonly(slot);
    ccLfFloatContext = { slotId, mode, readonly: descReadonly, isSubclass: ctx.isSubclass };

    if (descReadonly) {
        titleEl.innerHTML = `${getLfLockIconHtml()}<span>${tCC("ccLfEditDescTitleLabel")}</span>`;
    } else {
        const titles = {
            name: "ccLfEditNameTitleLabel",
            desc: "ccLfEditDescTitleLabel",
            options: "ccLfEditOptionsTitleLabel",
            amount: "ccLfEditAmountTitleLabel"
        };
        titleEl.textContent = tCC(titles[mode] || "");
    }
    if (hintEl) {
        hintEl.textContent = "";
        hintEl.style.display = "none";
    }

    if (mode === "name") bodyEl.innerHTML = buildLfFloatNameBody(slot);
    else if (mode === "desc") bodyEl.innerHTML = buildLfFloatDescBody(slot);
    else if (mode === "amount") bodyEl.innerHTML = buildLfFloatAmountBody(slot, slots);
    else if (mode === "options") bodyEl.innerHTML = buildLfFloatOptionsBody(slot);

    const floatPanel = overlay.querySelector(".cc-lf-float");
    if (floatPanel) {
        floatPanel.classList.toggle("cc-lf-float--wide", mode === "name" || mode === "options" || mode === "desc");
    }

    bindLfFloatCharCounters(bodyEl);
    initLfCheckboxGridLimits(bodyEl);
    if (mode === "options" && slot.payload.featureType === "spellcraft") {
        bindLfSpellcraftMaskHandlers(slot);
    }
    overlay.style.setProperty("display", "flex", "important");
}

/** Schließen übernimmt Eingaben (kein eigener Speichern-Button). */
function closeLfFloat() {
    if (ccLfFloatContext?.mode === "ccSpellLists") {
        // Kein Speichern-Button: Auswahl wird beim Schließen übernommen
        commitCcSpellListFloat();
        return;
    }
    if (ccLfFloatContext && !ccLfFloatContext.readonly) {
        commitLfFloat({ soft: true, rerender: true });
    }
    const overlay = document.getElementById("ccLfFloatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    ccLfFloatContext = null;
}

function readLfLangPair(prefix) {
    return {
        de: (document.getElementById(`${prefix}_de`)?.value || "").trim(),
        en: (document.getElementById(`${prefix}_en`)?.value || "").trim()
    };
}

/** Übernimmt Masken-Inhalt in den Slot. soft=true: unvollständige Optionen ohne Alert speichern. */
function commitLfFloat({ soft = false, rerender = false } = {}) {
    if (!ccLfFloatContext || ccLfFloatContext.readonly) return true;
    const { slotId, mode } = ccLfFloatContext;
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx) return true;
    const { slot, slots } = ctx;

    if (mode === "name") {
        // Einfach → Vordefiniert: Auswahl in Bezeichnungsmaske
        if (slot.payload.featureType === "simple" && slot.payload.category === "preDefined") {
            const ok = applyLfSimplePreDefinedFromDom(slot, { soft });
            if (!ok) return false;
            if (rerender) rerenderLfOwner(ctx);
            return true;
        }
        slot.payload.names = slot.payload.names || { de: "", en: "" };
        ensureAvailableLanguages(customClassEditorState).forEach(lang => {
            const el = document.getElementById(`ccLfName_${lang}`);
            if (!el) return;
            slot.payload.names[lang] = el.value.trim().slice(0, CUSTOM_CLASS_LF_CONFIG.nameMax);
        });
        // Einfach→Frei: Verbesserungs-Link speichern
        if (slot.payload.featureType === "simple" && slot.payload.category === "free") {
            const improveEl = document.getElementById("ccLfImproveFrom");
            if (improveEl) {
                const improvesSlotId = improveEl.value || "";
                slot.payload.optionsConfig = {
                    ...(slot.payload.optionsConfig || {}),
                    improvesSlotId
                };
                if (improvesSlotId) {
                    applyLfSimpleFreeImproveFromSource(slot, improvesSlotId, { forceNames: false });
                    // Bezeichnung aus den Inputs hat Vorrang (Nutzer kann editieren)
                    ensureAvailableLanguages(customClassEditorState).forEach(lang => {
                        const el = document.getElementById(`ccLfName_${lang}`);
                        if (!el) return;
                        slot.payload.names[lang] = el.value.trim().slice(0, CUSTOM_CLASS_LF_CONFIG.nameMax);
                    });
                }
            }
        }
    } else if (mode === "desc") {
        slot.payload.shortDescriptions = slot.payload.shortDescriptions || { de: "", en: "" };
        slot.payload.descriptions = slot.payload.descriptions || { de: "", en: "" };
        ensureAvailableLanguages(customClassEditorState).forEach(lang => {
            const shortEl = document.getElementById(`ccLfShort_${lang}`);
            if (shortEl) {
                slot.payload.shortDescriptions[lang] = shortEl.value.trim().slice(0, CUSTOM_CLASS_LF_CONFIG.shortDescMax);
            }
        });
        // Langbeschreibung + optional System-Token (Alias), beide Sprachen
        syncLfDescLongFromDom(slot);
        // Unterklassenmerkmale: keine Kurzbeschreibung
        if (isLfSubclassFeatureSlot(slot)) {
            slot.payload.shortDescriptions = { de: "", en: "" };
        }
        const hasShort = lfHasText(slot.payload.shortDescriptions);
        const hasLong = lfHasLongDescriptionContent(slot);
        const sheetFlag = resolveLfEditorSheetFlagHint(slot, hasLong);
        slot.payload.classDataPartial = {
            ...(slot.payload.classDataPartial || {}),
            classFeaturesStep2: hasShort ? 1 : 0,
            infoBox: hasShort ? 1 : 0,
            classFeaturesCharacterSheet: sheetFlag
        };
    } else if (mode === "amount") {
        const budget = getLfAmountBudget(slot, slots);
        const input = document.getElementById("ccLfAmountInput");
        if (budget && input) {
            const raw = parseInt(input.value, 10);
            let val = Number.isFinite(raw) ? raw : budget.sem.min;
            const minVal = budget.maxAllowed >= budget.sem.min ? budget.sem.min : 0;
            val = Math.max(minVal, Math.min(budget.maxAllowed, val));
            slot.payload.amount = val > 0 ? val : null;
        }
    } else if (mode === "options") {
        applyLfFloatOptions(slot, { soft });
    }

    if (rerender) rerenderLfOwner(ctx);
    return true;
}

/** Kompatibilität: früherer Speichern-Button */
function applyLfFloat() {
    const ctx = ccLfFloatContext ? resolveLfSlotContext(ccLfFloatContext.slotId) : null;
    commitLfFloat({ soft: false, rerender: false });
    const overlay = document.getElementById("ccLfFloatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    ccLfFloatContext = null;
    if (ctx) rerenderLfOwner(ctx);
    else renderCustomClassTab2();
}

function lfFailMinOptions() {
    const min = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;
    alert(tCC("ccLfMinOptionsAlertLabel") + ` (${min})`);
    return false;
}

/** Speichert Vordefiniert-Auswahl aus der Bezeichnungsmaske. */
function applyLfSimplePreDefinedFromDom(slot, { soft = false } = {}) {
    const selectEl = document.getElementById("ccLfPreDefinedSelect");
    // Maske nicht (mehr) im DOM → bestehenden Wert nicht überschreiben
    if (!selectEl) return true;

    const preDefinedLabel = selectEl.value || "";
    if (!soft && !preDefinedLabel) {
        alert(tCC("pleaseSelectLabel"));
        return false;
    }
    if (preDefinedLabel) {
        const meta = getLfPreDefinedFeatureMeta(preDefinedLabel);
        if (meta?.requires && !hasLfPreDefinedOnEarlierLevel(
            getLfSlotsForSlot(slot), meta.requires, slot.level, slot.slotId, slot.index
        )) {
            if (!soft) {
                alert(`${tCC("ccLfRequiresEarlierLabel")}: ${tCC(meta.requires)}`);
                return false;
            }
            // Soft-Close: ungültige Auswahl nicht übernehmen
            return true;
        }
        if (!canSelectLfPreDefinedLabel(slot, preDefinedLabel)) {
            if (!soft) alert(tCC("pleaseSelectLabel"));
            return soft;
        }
        const prevLabel = slot.payload.optionsConfig?.preDefinedLabel;
        const prevValues = slot.payload.optionsConfig?.parameterValues;
        const parameterValues = (prevLabel === preDefinedLabel && prevValues)
            ? { ...prevValues }
            : buildLfPreDefinedDefaultParameterValues(preDefinedLabel);
        slot.payload.optionsConfig = { preDefinedLabel, parameterValues };
        const partial = buildLfPreDefinedClassDataPartial(preDefinedLabel);
        if (partial) slot.payload.classDataPartial = partial;
    } else if (soft) {
        // Leere Auswahl nur übernehmen, wenn Nutzer aktiv „Bitte wählen“ gesetzt hat
        slot.payload.optionsConfig = { ...(slot.payload.optionsConfig || {}), preDefinedLabel: "", parameterValues: {} };
        slot.payload.classDataPartial = null;
    }
    return true;
}

function applyLfFloatOptions(slot, { soft = false } = {}) {
    const type = slot.payload.featureType;
    const cat = slot.payload.category;
    const min = CUSTOM_CLASS_LF_CONFIG.limits.optionsMinChoices;

    if (type === "options" && cat === "skills") {
        const skillFilter = document.getElementById("ccLfSkillFilter")?.value || "all";
        const selectedSkills = Array.from(document.querySelectorAll("#ccLfSkillAllowList input:checked")).map(el => el.value);
        if (!soft && skillFilter === "selection" && selectedSkills.length < min) return lfFailMinOptions();
        slot.payload.optionsConfig = { skillFilter, selectedSkills };
        return true;
    }

    if (type === "options" && cat === "free") {
        const prevCfg = slot.payload.optionsConfig || {};
        const prevChoices = Array.isArray(prevCfg.choices) ? prevCfg.choices : [];
        const available = ensureAvailableLanguages(customClassEditorState);
        const rows = Array.from(document.querySelectorAll("#ccLfChoiceList .cc-lf-choice-row"));
        const choices = rows.map((row, idx) => {
            const prev = prevChoices[idx] || {};
            const names = {
                de: prev.names?.de || prev.de || "",
                en: prev.names?.en || prev.en || ""
            };
            const descriptions = {
                de: prev.descriptions?.de || "",
                en: prev.descriptions?.en || ""
            };
            available.forEach(lang => {
                const nameEl = row.querySelector(`.cc-lf-choice-name-${lang}`);
                const descEl = row.querySelector(`.cc-lf-choice-desc-${lang}`);
                if (nameEl) names[lang] = nameEl.value.trim().slice(0, CUSTOM_CLASS_LF_CONFIG.nameMax);
                if (descEl) descriptions[lang] = descEl.value.trim().slice(0, CUSTOM_CLASS_LF_CONFIG.descMax);
            });
            return { names, descriptions };
        }).filter(c => lfHasText(c.names));
        if (!soft && choices.length < min) return lfFailMinOptions();

        // Copy-From-Auswahl aus Maske übernehmen (falls gesetzt)
        const copyFromEl = document.getElementById("ccLfFreeOptionsCopyFrom");
        const extendsSlotId = (copyFromEl && copyFromEl.value)
            ? copyFromEl.value
            : (prevCfg.extendsSlotId || "");

        slot.payload.optionsConfig = {
            choices,
            extendsSlotId,
            featureFamilyId: prevCfg.featureFamilyId || ""
        };
        if (extendsSlotId) {
            const parent = findLfSlotAnywhere(extendsSlotId);
            if (parent) {
                slot.payload.optionsConfig.featureFamilyId = ensureLfFreeOptionsFamilyId(parent);
            }
        } else {
            ensureLfFreeOptionsFamilyId(slot);
        }
        ensureLfFreeOptionsChoiceTagsOnSlot(slot);
        return true;
    }

    if (type === "options" && cat === "savingThrows") {
        const mode = document.getElementById("ccLfSaveMode")?.value || "selection";
        const selectedLabels = Array.from(document.querySelectorAll("#ccLfSaveAllowList input:checked")).map(el => el.value);
        if (!soft && mode === "selection" && selectedLabels.length < min) return lfFailMinOptions();
        slot.payload.optionsConfig = { mode, selectedLabels };
        return true;
    }

    if (type === "options" && cat === "expertise") {
        slot.payload.optionsConfig = { infoLabel: "skillProfTitle" };
        return true;
    }

    if (type === "options" && cat === "weaponMasteries") {
        slot.payload.optionsConfig = {
            infoLabels: ["ccLfWeaponMasteryOptionsShortLabel"]
        };
        return true;
    }

    if (type === "options" && cat === "tools") {
        // Werkzeug-Art kommt aus der Bezeichnungsspalte (nicht mehr aus der Maske)
        const surface = slot.payload.optionsConfig?.toolSurfaceLabel
            || (!isLfSubclassFeatureSlot(slot) ? getTab1SurfaceToolLabel(customClassEditorState) : "")
            || "";
        const mode = document.getElementById("ccLfToolMode")?.value
            || slot.payload.optionsConfig?.mode
            || "all";
        const allowedLabels = Array.from(document.querySelectorAll("#ccLfToolAllowList input:checked")).map(el => el.value);
        if (!soft && !surface) {
            alert(tCC("ccLfToolsPickSurfaceHintLabel"));
            return false;
        }
        if (!surface) {
            slot.payload.optionsConfig = { toolSurfaceLabel: "", mode: "all", allowedLabels: [] };
            return true;
        }
        if (!soft && mode === "selection" && allowedLabels.length < min) return lfFailMinOptions();
        slot.payload.optionsConfig = {
            toolSurfaceLabel: surface,
            mode,
            allowedLabels: mode === "selection" ? allowedLabels : []
        };
        if (!isLfSubclassFeatureSlot(slot) && surface) {
            slot.boundFromTab1Tool = true;
            slot.contentLocked = false;
            ccBiSyncGuard = true;
            setTab1ToolSelectValue(surface);
            ccBiSyncGuard = false;
        }
        return true;
    }

    if (type === "options" && cat === "languages") {
        const mode = document.getElementById("ccLfLangMode")?.value || "selection";
        const selectedLabels = Array.from(document.querySelectorAll("#ccLfLangAllowList input:checked")).map(el => el.value);
        const rarity = document.getElementById("ccLfLangRarity")?.value || "standard";
        if (!soft && mode === "selection" && selectedLabels.length < min) return lfFailMinOptions();
        slot.payload.optionsConfig = { mode, selectedLabels, rarity };
        return true;
    }

    if (type === "options" && cat === "asiAndFeat") {
        const mode = document.getElementById("ccLfFeatMode")?.value || "all";
        const featCategoryNumber = parseInt(document.getElementById("ccLfFeatCategoryNumber")?.value, 10) || 1;
        const selectedFeatLabels = Array.from(document.querySelectorAll("#ccLfFeatAllowList input:checked")).map(el => el.value);
        if (!soft && mode === "specific" && selectedFeatLabels.length < min) return lfFailMinOptions();
        slot.payload.optionsConfig = { mode, featCategoryNumber, selectedFeatLabels };
        return true;
    }

    if (type === "options" && cat === "maneuver") {
        const mode = document.getElementById("ccLfManeuverMode")?.value || "all";
        const maneuverDice = Math.max(1, Math.min(12, parseInt(document.getElementById("ccLfManeuverDice")?.value, 10) || 4));
        const selectedManeuvers = Array.from(document.querySelectorAll("#ccLfManeuverAllowList input:checked")).map(el => el.value);
        if (!soft && mode === "selection" && selectedManeuvers.length < min) return lfFailMinOptions();
        // Anzahl überschreibt frühere Manöver-Stufen (klassenweiter Parameter)
        slot.payload.optionsConfig = { mode, maneuverDice, selectedManeuvers };
        return true;
    }

    if (type === "options" && cat === "fightingStyle") {
        const mode = document.getElementById("ccLfFightingStyleMode")?.value || "selection";
        const selectedFeatLabels = Array.from(
            document.querySelectorAll("#ccLfFightingStyleAllowList input:checked")
        ).map(el => el.value);
        if (!soft && mode === "selection" && selectedFeatLabels.length < min) return lfFailMinOptions();
        slot.payload.optionsConfig = { mode, selectedFeatLabels };
        return true;
    }

    if (type === "simple" && cat === "skills") {
        const selectedSkills = Array.from(document.querySelectorAll("#ccLfSimpleSkillList input:checked")).map(el => el.value);
        const spec = getLfSimpleCategorySpec("skills");
        const pickMin = spec?.pickMin || 1;
        const pickMax = spec?.pickMax || 3;
        if (!soft && (selectedSkills.length < pickMin || selectedSkills.length > pickMax)) {
            alert(`${tCC("ccLfSimpleSkillsPickHintLabel")} (${pickMin}–${pickMax})`);
            return false;
        }
        slot.payload.optionsConfig = { selectedSkills };
        return true;
    }

    if (type === "simple" && cat === "savingThrows") {
        const mode = document.getElementById("ccLfSimpleSaveMode")?.value || "selection";
        const selectedLabels = Array.from(
            document.querySelectorAll("#ccLfSimpleSaveAllowList input:checked")
        ).map(el => el.value);
        const pickMin = getLfSimpleCategorySpec("savingThrows")?.pickMin || 1;
        if (!soft && mode === "selection" && selectedLabels.length < pickMin) {
            alert(`${tCC("ccLfSimpleSavingThrowsPickHintLabel")} (${pickMin})`);
            return false;
        }
        slot.payload.optionsConfig = {
            mode,
            selectedLabels: mode === "selection" ? selectedLabels : []
        };
        return true;
    }

    if (type === "simple" && cat === "spellcasting") {
        const spellListLabels = Array.from(document.querySelectorAll("#ccLfSimpleSpellList input:checked")).map(el => el.value);
        const spellcastingAbility = document.getElementById("ccLfSpellAbility")?.value || "";
        const spellcastingFocus = Array.from(
            document.querySelectorAll('#ccLfSpellFocusList input[name="ccLfSpellFocus"]:checked')
        ).map(el => el.value);
        const spec = getLfSimpleCategorySpec("spellcasting");
        const pickMin = spec?.pickMin || 1;
        const pickMax = spec?.pickMax || 2;
        if (!soft && !spellcastingAbility) {
            alert(tCC("ccLfSpellAbilityRequiredAlertLabel"));
            return false;
        }
        if (!soft && spellcastingFocus.length < 1) {
            alert(tCC("ccLfSpellFocusRequiredAlertLabel"));
            return false;
        }
        if (!soft && (spellListLabels.length < pickMin || spellListLabels.length > pickMax)) {
            alert(`${tCC("ccLfSimpleSpellListsHintLabel")} (${pickMin}–${pickMax})`);
            return false;
        }
        // Basis: Confirm bei neuem Zauberbuch-Fokus
        if (!isLfSubclassFeatureSlot(slot)) {
            if (!confirmLfSpellbookFocusSelection(
                customClassEditorState.spellcastingFocus,
                spellcastingFocus,
                "ccLfSpellFocus"
            )) {
                return false;
            }
        }
        // Unterklasse: Zauberbuch nie speichern
        const focusClean = isLfSubclassFeatureSlot(slot)
            ? spellcastingFocus.filter(f => f !== "spellbookLabel")
            : spellcastingFocus;
        slot.payload.optionsConfig = {
            spellListLabels,
            spellcastingAbility,
            spellcastingFocus: focusClean
        };
        if (!isLfSubclassFeatureSlot(slot)) {
            ccBiSyncGuard = true;
            customClassEditorState.spellcastingLabel = 1;
            customClassEditorState.spellcastingAbility = spellcastingAbility;
            customClassEditorState.spellcastingFocus = focusClean.slice();
            updateTab1SpellDomFromState();
            ccBiSyncGuard = false;
        }
        syncSpellcastingProgressionFromSlots();
        return true;
    }

    if (type === "simple" && cat === "weaponTraining") {
        const weaponCategoryMode = document.getElementById("ccLfSimpleWeaponCatMode")?.value || "selection";
        const weaponPropertyMode = document.getElementById("ccLfSimpleWeaponPropMode")?.value || "selection";
        const selectedCatLabels = Array.from(
            document.querySelectorAll("#ccLfSimpleWeaponCatList input:checked")
        ).map(el => el.value);
        const selectedPropLabels = Array.from(
            document.querySelectorAll("#ccLfSimpleWeaponPropList input:checked")
        ).map(el => el.value);
        const selectedWeaponCategoryNumbers = weaponCategoryMode === "selection"
            ? selectedCatLabels.map(lab => {
                const catObj = (typeof weaponCategory !== "undefined" ? weaponCategory : [])
                    .find(c => c.translationLabel === lab);
                return catObj ? catObj.weaponCategoryNumber : NaN;
            }).filter(n => Number.isFinite(n))
            : [];
        const selectedWeaponPropertyCategoryNumbers = weaponPropertyMode === "selection"
            ? selectedPropLabels.map(lab => {
                const propObj = (typeof weaponProperty !== "undefined" ? weaponProperty : [])
                    .find(p => p.translationLabel === lab);
                return propObj ? propObj.weaponPropertyCategoryNumber : NaN;
            }).filter(n => Number.isFinite(n))
            : [];
        const pickMin = getLfSimpleCategorySpec("weaponTraining")?.pickMin || 1;
        const remainingCats = getLfRemainingWeaponCategoryNumbers(customClassEditorState);
        const remainingProps = getLfRemainingWeaponPropertyCategoryNumbers(customClassEditorState);
        const allOk = (weaponCategoryMode === "all" && remainingCats.length > 0)
            || (weaponPropertyMode === "all" && remainingProps.length > 0);
        const total = selectedWeaponCategoryNumbers.length + selectedWeaponPropertyCategoryNumbers.length;
        if (!soft && !allOk && total < pickMin) {
            alert(`${tCC("ccLfSimpleWeaponTrainingPickHintLabel")} (${pickMin})`);
            return false;
        }
        slot.payload.optionsConfig = {
            weaponCategoryMode,
            weaponPropertyMode,
            selectedWeaponCategoryNumbers,
            selectedWeaponPropertyCategoryNumbers
        };
        return true;
    }

    if (type === "simple" && cat === "armorTraining") {
        const mode = document.getElementById("ccLfSimpleArmorCatMode")?.value || "selection";
        const selectedLabels = Array.from(
            document.querySelectorAll("#ccLfSimpleArmorCatList input:checked")
        ).map(el => el.value);
        const selectedArmorCategoryNumbers = mode === "selection"
            ? selectedLabels.map(lab => {
                const catObj = (typeof armorCategory !== "undefined" ? armorCategory : [])
                    .find(c => c.translationLabel === lab);
                return catObj ? catObj.armorCategoryNumber : NaN;
            }).filter(n => Number.isFinite(n))
            : [];
        const pickMin = getLfSimpleCategorySpec("armorTraining")?.pickMin || 1;
        const remainingArmor = getLfRemainingArmorCategoryNumbers(customClassEditorState);
        if (!soft && mode === "all" && !remainingArmor.length) {
            alert(tCC("ccLfSimpleArmorTrainingPickHintLabel"));
            return false;
        }
        if (!soft && mode === "selection" && selectedArmorCategoryNumbers.length < pickMin) {
            alert(`${tCC("ccLfSimpleArmorTrainingPickHintLabel")} (${pickMin})`);
            return false;
        }
        slot.payload.optionsConfig = {
            mode,
            selectedArmorCategoryNumbers
        };
        return true;
    }

    if (type === "simple" && cat === "preDefined") {
        const preDefinedLabel = slot.payload.optionsConfig?.preDefinedLabel || "";
        if (!preDefinedLabel) {
            if (!soft) alert(tCC("pleaseSelectLabel"));
            return soft;
        }
        const params = getLfPreDefinedParameters(preDefinedLabel);
        const parameterValues = {};
        let incomplete = false;
        params.forEach(p => {
            if (p.valueType === "valueDie") {
                const min = p.valueMin != null ? p.valueMin : 1;
                const max = p.valueMax != null ? p.valueMax : 10;
                const fixedDie = String(p.dieFixed || "D6").toUpperCase();
                const countEl = document.getElementById(`ccLfPreDefParam_${p.key}_count`);
                if (!countEl) {
                    incomplete = true;
                    return;
                }
                const count = Math.max(min, Math.min(max, parseInt(countEl.value, 10) || min));
                parameterValues[p.key] = formatLfValueDieParameter(count, fixedDie);
                return;
            }
            const el = document.getElementById(`ccLfPreDefParam_${p.key}`);
            if (!el) {
                incomplete = true;
                return;
            }
            if (p.valueType === "number") {
                const min = p.min != null ? p.min : 1;
                const max = p.max != null ? p.max : 20;
                const n = Math.max(min, Math.min(max, parseInt(el.value, 10) || min));
                parameterValues[p.key] = n;
            } else if (p.valueType === "die") {
                const dieOptions = Array.isArray(p.dieOptions) && p.dieOptions.length
                    ? p.dieOptions
                    : ["D4", "D6", "D8", "D10", "D12", "D20"];
                const die = normalizeLfDieParameterValue(el.value, dieOptions, p.defaultValue || "D6");
                if (!die) incomplete = true;
                parameterValues[p.key] = die;
            } else if (p.valueType === "select") {
                const selectOptions = Array.isArray(p.selectOptions) ? p.selectOptions : [];
                const selected = normalizeLfSelectParameterValue(
                    el.value, selectOptions, p.defaultValue || selectOptions[0] || ""
                );
                if (!selected) incomplete = true;
                parameterValues[p.key] = selected;
            } else {
                const maxLen = p.maxLength || 10;
                const text = String(el.value || "").trim().slice(0, maxLen);
                if (!text) incomplete = true;
                parameterValues[p.key] = text;
            }
        });
        if (!soft && incomplete) {
            alert(tCC("ccLfPreDefinedParamsRequiredAlertLabel"));
            return false;
        }
        const meta = getLfPreDefinedFeatureMeta(preDefinedLabel);
        if (meta?.fixedValues && typeof meta.fixedValues === "object") {
            Object.assign(parameterValues, meta.fixedValues);
        }
        slot.payload.optionsConfig = { preDefinedLabel, parameterValues };
        const partial = buildLfPreDefinedClassDataPartial(preDefinedLabel);
        if (partial) slot.payload.classDataPartial = partial;
        return true;
    }

    if (type === "simple" && cat === "free") {
        const selectExisting = !!document.getElementById("ccLfParamSelectExisting")?.checked;
        const useValueChecked = !!document.getElementById("ccLfParamUseValue")?.checked;
        const useDieChecked = !!document.getElementById("ccLfParamUseDie")?.checked;
        // Bei Übernahme: Modus fest aus Registry (Checkboxen können disabled sein)
        let mode = normalizeLfParameterValueMode({
            useValue: useValueChecked,
            useDie: useDieChecked
        });
        const registry = ensureParameterRegistry();
        const slots = getLfSlotsForSlot(slot);

        const readValueDie = (resolvedMode) => {
            const value = resolvedMode.useValue
                ? Math.max(1, Math.min(20, parseInt(document.getElementById("ccLfParamValue")?.value, 10) || 1))
                : null;
            const die = resolvedMode.useDie
                ? normalizeLfDieParameterValue(
                    document.getElementById("ccLfParamDie")?.value,
                    LF_SIMPLE_FREE_DIE_OPTIONS,
                    "D6"
                )
                : null;
            return { value, die };
        };

        if (selectExisting) {
            const parameterId = document.getElementById("ccLfParamSelect")?.value || "";
            if (!parameterId) {
                const keepsImprove = slot.payload.optionsConfig?.improvesSlotId || "";
                slot.payload.optionsConfig = keepsImprove ? { improvesSlotId: keepsImprove } : null;
                pruneParameterRegistry(slots);
                return true;
            }
            const param = getLfParameterById(parameterId);
            mode = normalizeLfParameterValueMode(param);
            const { value, die } = readValueDie(mode);
            // Verbesserungs-Link + Namensvorschlag (falls früheres Merkmal denselben Parameter hat)
            applyLfSimpleFreeExistingParamSuggestions(slot, parameterId);
            slot.payload.optionsConfig = {
                ...(slot.payload.optionsConfig || {}),
                selectExisting: true,
                parameterId,
                useValue: mode.useValue,
                useDie: mode.useDie,
                value,
                die
            };
            ensureLfSimpleFreeLevelValTagsOnSlot(slot);
            return true;
        }

        const available = ensureAvailableLanguages(customClassEditorState);
        const names = { de: "", en: "" };
        available.forEach(lang => {
            const el = document.getElementById(`ccLfParamName_${lang}`);
            if (el) names[lang] = el.value.trim().slice(0, CUSTOM_CLASS_LF_CONFIG.parameterNameMax);
        });

        // Ohne Parameterbezeichnung gilt kein Parameter als gesetzt (optional)
        if (!lfHasText(names)) {
            const keepsImprove = slot.payload.optionsConfig?.improvesSlotId || "";
            slot.payload.optionsConfig = keepsImprove ? { improvesSlotId: keepsImprove } : null;
            pruneParameterRegistry(slots);
            return true;
        }

        if (!useValueChecked && !useDieChecked) {
            if (!soft) {
                alert(tCC("ccLfParamModeRequiredAlertLabel"));
                return false;
            }
            mode = normalizeLfParameterValueMode({ useValue: true, useDie: false });
        }

        const { value, die } = readValueDie(mode);
        const prevImprove = slot.payload.optionsConfig?.improvesSlotId || "";

        let parameterId = slot.payload.optionsConfig?.parameterId || "";
        if (!parameterId || slot.payload.optionsConfig?.selectExisting) {
            parameterId = createLfParameterId();
            registry.push({
                id: parameterId,
                names: { de: names.de || "", en: names.en || "" },
                useValue: mode.useValue,
                useDie: mode.useDie
            });
        } else {
            const existing = registry.find(p => p.id === parameterId);
            if (existing) {
                available.forEach(lang => { existing.names[lang] = names[lang] || ""; });
                existing.useValue = mode.useValue;
                existing.useDie = mode.useDie;
            } else {
                registry.push({
                    id: parameterId,
                    names: { de: names.de || "", en: names.en || "" },
                    useValue: mode.useValue,
                    useDie: mode.useDie
                });
            }
        }
        slot.payload.optionsConfig = {
            selectExisting: false,
            parameterId,
            useValue: mode.useValue,
            useDie: mode.useDie,
            value,
            die,
            improvesSlotId: prevImprove
        };
        ensureLfSimpleFreeLevelValTagsOnSlot(slot);
        return true;
    }

    if (type === "spellcraft" && cat === "getCantrip") {
        return applyLfSpellcraftGetCantripFromDom(slot, { soft });
    }
    if (type === "spellcraft" && cat === "chooseCantrip") {
        return applyLfSpellcraftChooseCantripFromDom(slot, { soft });
    }
    if (type === "spellcraft" && cat === "getPreparedSpell") {
        return applyLfSpellcraftGetPreparedFromDom(slot, { soft });
    }
    if (type === "spellcraft" && cat === "choosePreparedSpell") {
        return applyLfSpellcraftChoosePreparedFromDom(slot, { soft });
    }
    if (type === "spellcraft" && cat === "subclassSpells") {
        return applyLfSpellcraftSubclassSpellsFromDom(slot, { soft });
    }

    if (type === "attribute" && (cat === "direct" || cat === "increase")) {
        const pointsMax = getLfAttributeCategorySpec("direct")?.pointsMax
            || CUSTOM_CLASS_LF_CONFIG.limits.attributePointsMax;
        const abilityPoints = Array.from(document.querySelectorAll("#ccLfAttrPoints input[data-ability]")).map(el => ({
            ability: el.dataset.ability,
            points: Math.max(0, parseInt(el.value, 10) || 0)
        }));
        const sum = sumLfAbilityPoints(abilityPoints);
        if (!soft && (sum < 1 || sum > pointsMax)) {
            alert(`${tCC("ccLfAttrDirectPointsAlertLabel")} (1–${pointsMax})`);
            return false;
        }
        slot.payload.optionsConfig = { abilityPoints };
        slot.payload.amount = null;
        return true;
    }

    if (type === "attribute" && cat === "distribution") {
        const spec = getLfAttributeCategorySpec("distribution");
        const pointsMin = spec?.pointsMin || 1;
        const pointsMax = spec?.pointsMax || 6;
        const attrsMin = spec?.attrsMin || 2;
        let points = parseInt(document.getElementById("ccLfAttrDistPoints")?.value, 10) || 0;
        points = Math.max(0, Math.min(pointsMax, points));
        const allowedAbilities = Array.from(document.querySelectorAll("#ccLfAttrAllowList input:checked")).map(el => el.value);
        const distributionMode = document.getElementById("ccLfAttrDistMode")?.value || "free";
        let maxPerAbility = parseInt(document.getElementById("ccLfAttrMaxPer")?.value, 10) || 1;
        maxPerAbility = Math.max(1, Math.min(points || pointsMax, maxPerAbility));

        if (!soft) {
            if (points < pointsMin || points > pointsMax) {
                alert(`${tCC("ccLfAttrPointsLabel")} (${pointsMin}–${pointsMax})`);
                return false;
            }
            if (allowedAbilities.length < attrsMin) return lfFailMinOptions();
            if (distributionMode === "maxPerAbility" && (maxPerAbility < 1 || maxPerAbility > points)) {
                alert(tCC("ccLfAttrMaxPerAbilityLabel"));
                return false;
            }
        }

        slot.payload.optionsConfig = {
            points: points || null,
            allowedAbilities,
            distributionMode,
            maxPerAbility: distributionMode === "maxPerAbility" ? maxPerAbility : null
        };
        slot.payload.amount = null;
        return true;
    }

    slot.payload.optionsConfig = {
        configured: !!document.getElementById("ccLfOptionsConfigured")?.checked
    };
    return true;
}

function renderCustomClassTab2() {
    const container = document.getElementById("customClassTab2Content");
    if (!container) return;

    // Scrollposition merken (Tabellenbereich + Modal/Overlay), sonst springt die Ansicht nach oben
    const scrollState = captureLfTab2ScrollState();

    const slots = ensureCustomClassLevelFeatureSlots(customClassEditorState);
    refreshLfFreeSubclassFeatureOrdinals(slots);
    const byLevel = new Map();
    slots.forEach(slot => {
        if (!byLevel.has(slot.level)) byLevel.set(slot.level, []);
        byLevel.get(slot.level).push(slot);
    });

    const colHeaders = [
        tCC("ccLfColLevelLabel", "Stufe"),
        "",
        tCC("ccLfColTypeLabel", "Merkmaltyp"),
        tCC("ccLfColCategoryLabel", "Kategorie"),
        tCC("ccLfColNameLabel", "Bezeichnung"),
        tCC("ccLfColDescLabel", "Kurz- & Beschreibung"),
        tCC("ccLfColOptionsLabel", "Optionen"),
        tCC("ccLfColAmountLabel", "Anzahl")
    ];

    let html = `
        <p class="custom-class-hint cc-lf-intro">${tCC("ccLfPhase1HintLabel")}</p>
        <div class="cc-lf-table-wrap">
            <div class="cc-lf-table">
                <div class="cc-lf-header" role="row">
                    ${colHeaders.map((h, i) => {
                        let extra = "";
                        if (i === 0) extra = " cc-lf-cell--level";
                        if (i === 1) extra = " cc-lf-cell--handle";
                        return `<div class="cc-lf-cell cc-lf-cell--head${extra}" role="columnheader">${h}</div>`;
                    }).join("")}
                </div>
    `;

    CUSTOM_CLASS_LF_CONFIG.layout.forEach(levelDef => {
        const level = levelDef.level;
        const levelSlots = byLevel.get(level) || [];
        const levelLocked = isLfLevelDragLocked(level);

        html += `
            <div class="cc-lf-level-group${levelLocked ? " cc-lf-level-group--locked" : ""}" data-level="${level}"
                ondragover="onLfLevelGroupDragOver(event)">
                <div class="cc-lf-level-rail" aria-label="${tCC("ccLfColLevelLabel", "Stufe")} ${level}"
                    ondragover="onLfLevelGroupDragOver(event)">
                    <span class="cc-lf-level-rail-num">${level}</span>
                </div>
                <div class="cc-lf-level-rows" ondragover="onLfLevelGroupDragOver(event)">
        `;

        levelSlots.forEach(slot => {
            const canDrag = isLfSlotDraggable(slot);
            const dragAttrs = canDrag
                ? `draggable="true"
                   ondragstart="onLfRowDragStart(event, '${slot.slotId}')"
                   ondragend="onLfRowDragEnd(event)"
                   ondragover="onLfRowDragOver(event, '${slot.slotId}')"
                   ondragleave="onLfRowDragLeave(event)"
                   ondrop="onLfRowDrop(event, '${slot.slotId}')"`
                : `aria-disabled="true"`;

            const handle = canDrag
                ? `<span class="cc-lf-drag-handle" title="${tCC("ccLfDragHandleLabel", "Verschieben")}">⋮⋮</span>`
                : `<span class="cc-lf-drag-handle cc-lf-drag-handle--locked" title="${tCC("ccLfFixedRowLabel", "Fest")}">✕</span>`;

            html += `
                <div class="${getLfRowCssClass(slot)}" role="row" data-slot-id="${slot.slotId}" ${dragAttrs}>
                    <div class="cc-lf-cell cc-lf-cell--handle" role="cell">${handle}</div>
                    <div class="cc-lf-cell" role="cell">${buildLfTypeSelectHtml(slot, slots)}</div>
                    <div class="cc-lf-cell" role="cell">${buildLfCategorySelectHtml(slot)}</div>
                    <div class="cc-lf-cell" role="cell">${buildLfNameCellHtml(slot)}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildLfDescChipsHtml(slot)}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildLfOptionsChipHtml(slot)}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildLfAmountChipHtml(slot, slots)}</div>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    html += `</div></div>`;
    container.innerHTML = html;
    restoreLfTab2ScrollState(scrollState);
    syncSpellcastingProgressionFromSlots(slots);
}

/** Speichert Scrollpositionen vor dem Tab-2-Rerender */
function captureLfTab2ScrollState() {
    const wrap = document.querySelector("#customClassTab2Content .cc-lf-table-wrap");
    const modal = document.querySelector(".custom-class-modal");
    const overlay = document.querySelector(".custom-class-overlay");
    return {
        tableTop: wrap ? wrap.scrollTop : 0,
        tableLeft: wrap ? wrap.scrollLeft : 0,
        modalTop: modal ? modal.scrollTop : 0,
        overlayTop: overlay ? overlay.scrollTop : 0
    };
}

/** Stellt Scrollpositionen nach dem Tab-2-Rerender wieder her */
function restoreLfTab2ScrollState(state) {
    if (!state) return;
    const apply = () => {
        const wrap = document.querySelector("#customClassTab2Content .cc-lf-table-wrap");
        const modal = document.querySelector(".custom-class-modal");
        const overlay = document.querySelector(".custom-class-overlay");
        if (wrap) {
            wrap.scrollTop = state.tableTop;
            wrap.scrollLeft = state.tableLeft;
        }
        if (modal) modal.scrollTop = state.modalTop;
        if (overlay) overlay.scrollTop = state.overlayTop;
    };
    apply();
    // Nach Layout/Paint erneut setzen (manche Browser setzen Scroll beim DOM-Replace zurück)
    requestAnimationFrame(apply);
}

function onCustomClassTabChange(tabNumber, previousTab) {
    if (previousTab === 1) {
        const prevLf = customClassEditorState.levelFeatures;
        const prevSub = customClassEditorState.subclasses;
        const prevParams = ensureParameterRegistry(customClassEditorState).slice();
        const prevProg = { ...(customClassEditorState.spellcastingProgression || {}) };
        customClassEditorState = collectCustomClassFormState();
        customClassEditorState.levelFeatures = prevLf;
        customClassEditorState.subclasses = prevSub;
        customClassEditorState.parameterRegistry = prevParams;
        customClassEditorState.spellcastingProgression = prevProg;
        // Tab1 → Tab2 Sync für Werkzeuge & Zauberwirken
        ensureCustomClassLevelFeatureSlots(customClassEditorState);
        syncTab2SpellcastingFromTab1();
    }
    if (previousTab === 3) {
        syncSubclassBoxesFromDom();
    }

    if (tabNumber === 2) {
        renderCustomClassTab2();
    } else if (tabNumber === 3) {
        closeLfFloat();
        renderCustomClassTab3();
    } else if (tabNumber === 4) {
        renderCustomClassTab4();
    } else {
        closeLfFloat();
    }
}

//=======================================================================
// 1.x Tab 3: Unterklassen – UI
//=======================================================================

function getSubclassDisplayName(sc) {
    const lang = getActiveUiLang();
    const other = lang === "de" ? "en" : "de";
    const name = (sc?.names?.[lang] || sc?.names?.[other] || "").trim();
    if (name) return name;
    return `${tCC("ccScBoxTitleLabel")} ${sc?.subclassCategoryNumber || ""}`.trim();
}

function syncSubclassBoxesFromDom() {
    const subclasses = customClassEditorState.subclasses || [];
    const available = ensureAvailableLanguages(customClassEditorState);
    subclasses.forEach(sc => {
        available.forEach(lang => {
            const nameEl = document.getElementById(`ccScName_${sc.id}_${lang}`);
            const descEl = document.getElementById(`ccScDesc_${sc.id}_${lang}`);
            if (nameEl) {
                sc.names = sc.names || { de: "", en: "" };
                sc.names[lang] = nameEl.value.trim().slice(0, CUSTOM_CLASS_SC_CONFIG.nameMax);
            }
            if (descEl) {
                sc.descriptions = sc.descriptions || { de: "", en: "" };
                sc.descriptions[lang] = descEl.value.trim().slice(0, CUSTOM_CLASS_SC_CONFIG.descMax);
            }
        });
        const body = document.getElementById(`ccScBody_${sc.id}`);
        // collapsed nur über State/Toggle steuern — DOM-Sync würde Toggle überschreiben
        if (body && typeof sc.collapsed !== "boolean") {
            sc.collapsed = body.classList.contains("collapsed");
        }
    });
}

function toggleCustomClassSubclassBox(subclassId) {
    syncSubclassBoxesFromDom();
    const sc = findCustomClassSubclassById(subclassId);
    if (!sc) return;
    sc.collapsed = !sc.collapsed;
    renderCustomClassTab3();
}

function addCustomClassSubclass() {
    syncSubclassBoxesFromDom();
    const list = ensureCustomClassSubclasses(customClassEditorState);
    if (list.length >= CUSTOM_CLASS_SC_CONFIG.maxSubclasses) return;
    const n = list.length + 1;
    list.push(createEmptyCustomClassSubclass(n, true));
    ensureCustomClassSubclasses(customClassEditorState);
    renderCustomClassTab3();
}

function removeCustomClassSubclass(subclassId) {
    syncSubclassBoxesFromDom();
    const list = customClassEditorState.subclasses || [];
    if (list.length <= CUSTOM_CLASS_SC_CONFIG.minSubclasses) return;
    const sc = list.find(s => s.id === subclassId);
    if (!sc) return;
    const hasContent = lfHasText(sc.names) || lfHasText(sc.descriptions)
        || (sc.levelFeatures || []).some(isScFeatureSlotPopulated);
    if (hasContent && !confirm(tCC("ccScRemoveSubclassConfirmLabel"))) return;
    customClassEditorState.subclasses = list.filter(s => s.id !== subclassId);
    ensureCustomClassSubclasses(customClassEditorState);
    renderCustomClassTab3();
}

function buildScLangBlockHtml(sc, lang, collapsed) {
    const title = getCustomClassLangTitle(lang);
    const activeLang = getActiveUiLang();
    const nameId = `ccScName_${sc.id}_${lang}`;
    const descId = `ccScDesc_${sc.id}_${lang}`;
    const nameVal = sc.names?.[lang] || "";
    const descVal = sc.descriptions?.[lang] || "";
    const bodyClass = collapsed ? "custom-class-lang-body collapsed" : "custom-class-lang-body";
    return `
        <div class="custom-class-lang-block" data-lang="${lang}">
            <div class="custom-class-lang-header" onclick="toggleCcLangHeader(this)">
                <span>${title}</span>
                ${getCcCollapseArrowHtml(!!collapsed)}
            </div>
            <div class="${bodyClass}">
                <label for="${nameId}">${tCC("customClassNameLabel")} ${lang === activeLang ? '<span class="custom-class-required">*</span>' : ""}</label>
                <input type="text" id="${nameId}" class="custom-class-name-input app-small-input"
                    maxlength="${CUSTOM_CLASS_SC_CONFIG.nameMax}" value="${escapeLfAttr(nameVal)}"
                    oninput="updateCustomClassCharCounter('${nameId}', '${nameId}_count', ${CUSTOM_CLASS_SC_CONFIG.nameMax})">
                <div class="char-counter"><span id="${nameId}_count">${nameVal.length}</span> / ${CUSTOM_CLASS_SC_CONFIG.nameMax}</div>
                <label for="${descId}" style="margin-top:8px;display:block;">${tCC("customClassDescLabel")}</label>
                <textarea id="${descId}" maxlength="${CUSTOM_CLASS_SC_CONFIG.descMax}"
                    oninput="updateCustomClassCharCounter('${descId}', '${descId}_count', ${CUSTOM_CLASS_SC_CONFIG.descMax})">${escapeLfHtml(descVal)}</textarea>
                <div class="char-counter"><span id="${descId}_count">${descVal.length}</span> / ${CUSTOM_CLASS_SC_CONFIG.descMax}</div>
            </div>
        </div>`;
}

function buildScFeatureTableHtml(sc) {
    const slots = sc.levelFeatures || [];
    const levels = getTab2SubclassLevels(customClassEditorState.levelFeatures);
    if (!levels.length) {
        return `<p class="cc-sc-empty-levels">${tCC("ccScNoSubclassLevelsHintLabel")}</p>`;
    }

    const byLevel = new Map();
    slots.forEach(slot => {
        if (!byLevel.has(slot.level)) byLevel.set(slot.level, []);
        byLevel.get(slot.level).push(slot);
    });

    const colHeaders = [
        tCC("ccLfColLevelLabel", "Stufe"),
        "",
        tCC("ccLfColTypeLabel", "Merkmaltyp"),
        tCC("ccLfColCategoryLabel", "Kategorie"),
        tCC("ccLfColNameLabel", "Bezeichnung"),
        tCC("customClassDescLabel", "Beschreibung"),
        tCC("ccLfColOptionsLabel", "Optionen"),
        tCC("ccLfColAmountLabel", "Anzahl")
    ];

    let html = `
        <div class="cc-lf-table-wrap cc-sc-table-wrap">
            <div class="cc-lf-table">
                <div class="cc-lf-header" role="row">
                    ${colHeaders.map((h, i) => {
                        let extra = "";
                        if (i === 0) extra = " cc-lf-cell--level";
                        if (i === 1) extra = " cc-lf-cell--handle";
                        return `<div class="cc-lf-cell cc-lf-cell--head${extra}" role="columnheader">${h}</div>`;
                    }).join("")}
                </div>
    `;

    levels.forEach(level => {
        const levelSlots = (byLevel.get(level) || []).slice().sort((a, b) => a.index - b.index);
        html += `
            <div class="cc-lf-level-group" data-level="${level}"
                ondragover="onLfLevelGroupDragOver(event)">
                <div class="cc-lf-level-rail" aria-label="${tCC("ccLfColLevelLabel")} ${level}"
                    ondragover="onLfLevelGroupDragOver(event)">
                    <span class="cc-lf-level-rail-num">${level}</span>
                </div>
                <div class="cc-lf-level-rows" ondragover="onLfLevelGroupDragOver(event)">
        `;
        levelSlots.forEach(slot => {
            const canDrag = isLfSlotDraggable(slot);
            const dragAttrs = canDrag
                ? `draggable="true"
                   ondragstart="onLfRowDragStart(event, '${slot.slotId}')"
                   ondragend="onLfRowDragEnd(event)"
                   ondragover="onLfRowDragOver(event, '${slot.slotId}')"
                   ondragleave="onLfRowDragLeave(event)"
                   ondrop="onLfRowDrop(event, '${slot.slotId}')"`
                : `aria-disabled="true"`;
            const handle = canDrag
                ? `<span class="cc-lf-drag-handle" title="${tCC("ccLfDragHandleLabel", "Verschieben")}">⋮⋮</span>`
                : `<span class="cc-lf-drag-handle cc-lf-drag-handle--locked" title="${tCC("ccLfFixedRowLabel", "Fest")}">✕</span>`;
            html += `
                <div class="${getLfRowCssClass(slot)}" role="row" data-slot-id="${slot.slotId}" ${dragAttrs}>
                    <div class="cc-lf-cell cc-lf-cell--handle" role="cell">${handle}</div>
                    <div class="cc-lf-cell" role="cell">${buildLfTypeSelectHtml(slot, slots)}</div>
                    <div class="cc-lf-cell" role="cell">${buildLfCategorySelectHtml(slot)}</div>
                    <div class="cc-lf-cell" role="cell">${buildLfNameCellHtml(slot)}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildLfDescChipsHtml(slot)}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildLfOptionsChipHtml(slot)}</div>
                    <div class="cc-lf-cell cc-lf-cell--center" role="cell">${buildLfAmountChipHtml(slot, slots)}</div>
                </div>
            `;
        });
        html += `</div></div>`;
    });

    html += `</div></div>`;
    return html;
}

function buildScSubclassBoxHtml(sc) {
    const collapsed = !!sc.collapsed;
    const activeLang = getActiveUiLang();
    const available = ensureAvailableLanguages(customClassEditorState);
    const ordered = [activeLang, ...available.filter(l => l !== activeLang)];
    const canRemove = (customClassEditorState.subclasses || []).length > CUSTOM_CLASS_SC_CONFIG.minSubclasses;
    const title = getSubclassDisplayName(sc);

    const removeBtn = canRemove
        ? `<button type="button" class="cc-sc-remove-btn" title="${tCC("ccScRemoveSubclassLabel")}"
            onclick="event.stopPropagation(); removeCustomClassSubclass('${sc.id}')">&times;</button>`
        : "";

    return `
        <div class="cc-sc-box${collapsed ? " cc-sc-box--collapsed" : ""}" data-subclass-id="${sc.id}">
            <div class="cc-sc-box-header" onclick="toggleCustomClassSubclassBox('${sc.id}')">
                <span class="cc-sc-box-title">${escapeLfHtml(title)}</span>
                <span class="cc-sc-box-actions">
                    ${removeBtn}
                    <span class="cc-collapse-arrow${collapsed ? " is-collapsed" : ""}" aria-hidden="true">&#x25BC;</span>
                </span>
            </div>
            <div id="ccScBody_${sc.id}" class="cc-sc-box-body${collapsed ? " collapsed" : ""}">
                <div class="custom-class-field">
                    <div class="custom-class-section-title">${tCC("customClassNameLabel")} / ${tCC("customClassDescLabel")}</div>
                    ${ordered.map(lang => buildScLangBlockHtml(sc, lang, lang !== activeLang)).join("")}
                </div>
                <div class="custom-class-field">
                    <div class="custom-class-section-title">${tCC("ccScLevelFeaturesHeadingLabel")}</div>
                    ${buildScFeatureTableHtml(sc)}
                </div>
            </div>
        </div>
    `;
}

function renderCustomClassTab3() {
    // Vor jedem Rebuild Name/Beschreibung aus dem DOM übernehmen
    syncSubclassBoxesFromDom();

    const container = document.getElementById("customClassTab3Content");
    if (!container) return;

    ensureCustomClassLevelFeatureSlots(customClassEditorState);
    const subclasses = ensureCustomClassSubclasses(customClassEditorState);
    sanitizeAllLfSubclassSpellsAgainstTab4(customClassEditorState);
    subclasses.forEach(sc => refreshLfSubclassSpellsOrdinals(sc.levelFeatures || []));
    const canAdd = subclasses.length < CUSTOM_CLASS_SC_CONFIG.maxSubclasses;

    let html = `
        <p class="custom-class-hint cc-lf-intro">${tCC("ccScTabHintLabel")}</p>
        <div class="cc-sc-list">
            ${subclasses.map(sc => buildScSubclassBoxHtml(sc)).join("")}
        </div>
    `;
    if (canAdd) {
        html += `
            <button type="button" class="custom-class-add-item-btn cc-sc-add-btn"
                onclick="addCustomClassSubclass()">${tCC("ccScAddSubclassLabel")}</button>
        `;
    }

    container.innerHTML = html;
}

/** Tab 4: freigeschaltet durch Einfach→Zauberwirken (Tab 2 oder Tab 3) */
function updateCustomClassTab4Ui() {
    const btn = document.getElementById("customClassTabSpellcastingBtn");
    if (!btn) return;
    const unlocked = !!customClassEditorState.spellcastingProgression?.unlocked;
    btn.disabled = !unlocked;
    btn.classList.toggle("custom-class-tab--locked", !unlocked);
    btn.title = unlocked
        ? tCC("customClassTabSpellcastingLabel")
        : tCC("customClassTab4LockedHintLabel");
    if (!unlocked && btn.classList.contains("active")) {
        switchCustomClassTab(2);
    }
}

function onCcSpellProgModeChange(mode) {
    const prog = customClassEditorState.spellcastingProgression;
    if (!prog?.unlocked) return;
    const next = mode === "user" ? "user" : "standard";
    if (prog.mode === next) return;
    if (!confirmLfSubclassSpellsResetForTab4Change()) {
        renderCustomClassTab4();
        return;
    }
    prog.mode = next;
    if (prog.mode === "user") ensureSpellProgUserRowsInitialized(prog);
    renderCustomClassTab4();
    // Tab-3-Chips (Zauberanzahl) aktualisieren falls sichtbar
    if (document.getElementById("customClassTab3")?.classList.contains("active")) {
        renderCustomClassTab3();
    }
}

function onCcSpellProgNumberChange(level, field, rawValue) {
    const prog = customClassEditorState.spellcastingProgression;
    if (!prog || prog.mode !== "user" || !prog.startLevel || level < prog.startLevel) return;
    ensureSpellProgUserRowsInitialized(prog);
    const row = prog.userRows[String(level)];
    if (!row) return;

    let minVal = 0;
    if (level > prog.startLevel) {
        const prev = prog.userRows[String(level - 1)];
        if (prev) minVal = parseInt(prev[field], 10) || 0;
    }
    let maxVal = 15;
    if (field === "cantripsAmount") maxVal = 10;
    if (field === "preparedSpellsAmount") maxVal = 25;

    let val = parseInt(rawValue, 10);
    if (!Number.isFinite(val)) val = minVal;
    val = Math.max(minVal, Math.min(maxVal, val));
    const prevVal = parseInt(row[field], 10) || 0;
    if (prevVal === val) return;
    row[field] = val;

    enforceSpellProgMonotonicityFrom(level);
    // Grade können entfallen → Magieprogression-Wahlen bereinigen
    if (sanitizeAllLfSubclassSpellsAgainstTab4()
        && document.getElementById("customClassTab3")?.classList.contains("active")) {
        renderCustomClassTab3();
    }
    renderCustomClassTab4();
}

let ccSpellListFloatLevel = null;

function openCcSpellListFloat(level, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const prog = customClassEditorState.spellcastingProgression;
    if (!prog?.unlocked || !prog.startLevel || level < prog.startLevel) return;
    if (prog.mode === "standard" && level !== prog.startLevel) return;

    ccSpellListFloatLevel = level;
    const row = getActiveSpellProgRow(level);
    const selected = new Set(row?.spellListLabels || prog.baseSpellListLabels || []);
    const allLists = getLfSpellcastingClassOptions();
    const isEntry = level === prog.startLevel;
    const prevRow = level > prog.startLevel ? getActiveSpellProgRow(level - 1) : null;
    const required = new Set(isEntry ? [] : (prevRow?.spellListLabels || prog.baseSpellListLabels || []));

    const overlay = document.getElementById("ccLfFloatOverlay");
    const title = document.getElementById("ccLfFloatTitle");
    const body = document.getElementById("ccLfFloatBody");
    if (!overlay || !title || !body) return;

    title.textContent = tCC("ccSpellListsMaskTitleLabel");
    const boxes = allLists.map(label => {
        const checked = selected.has(label) || required.has(label) ? "checked" : "";
        const mustKeep = required.has(label);
        const disabled = mustKeep ? "disabled" : "";
        const cls = mustKeep ? " class=\"cc-lf-check-disabled\"" : "";
        const colorCls = getSpellListColorClass(label);
        const textHtml = colorCls
            ? `<span class="${colorCls}">${escapeLfHtml(tCC(label))}</span>`
            : escapeLfHtml(tCC(label));
        return `<label${cls}><input type="checkbox" value="${label}" ${checked} ${disabled}
            onchange="onCcSpellListFloatChange()"> ${textHtml}</label>`;
    }).join("");

    body.innerHTML = `
        <p class="cc-lf-float-hint">${isEntry
            ? tCC("ccSpellListsEntryHintLabel")
            : tCC("ccSpellListsHigherHintLabel")}</p>
        <p class="cc-lf-float-hint">${formatLfPickMinHint(1)}</p>
        <div class="cc-lf-check-grid" id="ccSpellListFloatGrid">${boxes}</div>
    `;
    ccLfFloatContext = { slotId: null, mode: "ccSpellLists", readonly: false };
    overlay.style.setProperty("display", "flex", "important");
}

function onCcSpellListFloatChange() {
    const boxes = Array.from(document.querySelectorAll("#ccSpellListFloatGrid input[type='checkbox']"));
    if (boxes.filter(b => b.checked).length >= 1) return;
    const first = boxes.find(b => !b.disabled) || boxes[0];
    if (first) first.checked = true;
}

function commitCcSpellListFloat() {
    const level = ccSpellListFloatLevel;
    const prog = customClassEditorState.spellcastingProgression;
    const grid = document.getElementById("ccSpellListFloatGrid");
    if (level == null || !prog?.unlocked || !grid) {
        closeCcSpellListFloat();
        return;
    }
    let selected = Array.from(grid.querySelectorAll("input:checked")).map(el => el.value);
    if (selected.length < 1) {
        alert(tCC("ccLfSimpleSpellListsHintLabel"));
        return;
    }

    // Eingangsstufe = zentrale Listenkonfig → Magieprogression ggf. zurücksetzen
    if (level === prog.startLevel) {
        const prev = (prog.baseSpellListLabels || []).slice().sort().join("|");
        const next = selected.slice().sort().join("|");
        if (prev !== next && !confirmLfSubclassSpellsResetForTab4Change()) return;
    }

    if (level === prog.startLevel) {
        prog.baseSpellListLabels = selected.slice();
        const found = getSpellcastingSourceSlot();
        if (found?.slot) {
            found.slot.payload.optionsConfig = found.slot.payload.optionsConfig || {};
            found.slot.payload.optionsConfig.spellListLabels = selected.slice();
        }
        ensureSpellProgUserRowsInitialized(prog);
        const base = selected.slice();
        Object.keys(prog.userRows).forEach(k => {
            const lvl = parseInt(k, 10);
            const row = prog.userRows[k];
            if (lvl <= level) {
                row.spellListLabels = base.slice();
            } else {
                const extras = (row.spellListLabels || []).filter(l => !base.includes(l));
                row.spellListLabels = [...base, ...extras];
            }
        });
    } else if (prog.mode === "user") {
        ensureSpellProgUserRowsInitialized(prog);
        const row = prog.userRows[String(level)];
        const prev = getActiveSpellProgRow(level - 1);
        const required = new Set(prev?.spellListLabels || prog.baseSpellListLabels || []);
        required.forEach(l => {
            if (!selected.includes(l)) selected.push(l);
        });
        row.spellListLabels = selected;
        enforceSpellProgMonotonicityFrom(level);
        sanitizeAllLfSubclassSpellsAgainstTab4();
    }

    closeCcSpellListFloat();
    renderCustomClassTab4();
    if (document.getElementById("customClassTab3")?.classList.contains("active")) {
        renderCustomClassTab3();
    }
}

function closeCcSpellListFloat() {
    ccSpellListFloatLevel = null;
    const overlay = document.getElementById("ccLfFloatOverlay");
    if (overlay) overlay.style.setProperty("display", "none", "important");
    if (ccLfFloatContext?.mode === "ccSpellLists") ccLfFloatContext = null;
}

/**
 * Hard-Reset (nur Freie Zauberkonfig.): setzt die Zauberlisten aller Stufen
 * auf die Basisauswahl der Eingangsstufe zurück (ergänzte Listen entfallen).
 */
/** Freie Zauberkonfig.: setzt alle Zahlenwerte aller Stufen auf 0 */
function zeroCcSpellProgValues() {
    const prog = customClassEditorState.spellcastingProgression;
    if (!prog?.unlocked || prog.mode !== "user") return;
    if (!confirmLfSubclassSpellsResetForTab4Change()) return;
    ensureSpellProgUserRowsInitialized(prog);
    Object.values(prog.userRows).forEach(row => {
        row.cantripsAmount = 0;
        row.preparedSpellsAmount = 0;
        for (let i = 1; i <= 9; i++) row[`SSpSL${i}`] = 0;
    });
    renderCustomClassTab4();
    if (document.getElementById("customClassTab3")?.classList.contains("active")) {
        renderCustomClassTab3();
    }
}

function resetCcSpellProgLists() {
    const prog = customClassEditorState.spellcastingProgression;
    if (!prog?.unlocked || prog.mode !== "user") return;
    if (!confirm(tCC("ccSpellListsResetConfirmLabel"))) return;
    if (!confirmLfSubclassSpellsResetForTab4Change()) return;
    ensureSpellProgUserRowsInitialized(prog);
    const base = (prog.baseSpellListLabels || []).slice();
    Object.values(prog.userRows).forEach(row => {
        row.spellListLabels = base.slice();
    });
    renderCustomClassTab4();
    if (document.getElementById("customClassTab3")?.classList.contains("active")) {
        renderCustomClassTab3();
    }
}

function renderCustomClassTab4() {
    const container = document.getElementById("customClassTab4Content");
    if (!container) return;

    syncSpellcastingProgressionFromSlots();
    const prog = customClassEditorState.spellcastingProgression || {};
    if (!prog.unlocked || !prog.startLevel) {
        container.innerHTML = `<p class="custom-class-hint">${tCC("customClassTab4LockedHintLabel")}</p>`;
        return;
    }

    const start = prog.startLevel;
    const mode = prog.mode === "user" ? "user" : "standard";
    const editable = mode === "user";

    // Hard-Reset (nur Freie Zauberkonfig.): alle ergänzten Listen aus allen Stufen entfernen
    const resetBtnHtml = editable
        ? `<button type="button" class="cc-spell-prog-reset-btn" title="${tCC("ccSpellListsResetTitleLabel")}"
            onclick="resetCcSpellProgLists()"><img src="images/reset.png" alt="Reset"></button>`
        : "";
    const headCells = [
        tCC("ccLfColLevelLabel"),
        tCC("ccSpellListsColLabel"),
        tCC("ccCantripsAmountLabel"),
        tCC("ccPreparedSpellsAmountLabel"),
        ...Array.from({ length: 9 }, (_, i) => `${i + 1}. ${tCC("ccSpellSlotGradeColLabel")}`)
    ].map((h, i) => `<div class="cc-spell-prog-cell cc-spell-prog-cell--head">${escapeLfHtml(h)}${i === 1 ? resetBtnHtml : ""}</div>`).join("");

    // Gruppenüberschrift über den Zauberplatz-Spalten (1.–9. Grad)
    const groupHeadRow = `
        <div class="cc-spell-prog-row cc-spell-prog-row--group-head" role="row">
            <div class="cc-spell-prog-cell cc-spell-prog-cell--group-spacer" aria-hidden="true"></div>
            <div class="cc-spell-prog-cell cc-spell-prog-cell--slot-group" role="columnheader">${escapeLfHtml(tCC("spellSlotsLabel"))}</div>
        </div>`;

    const buildNum = (lvl, locked, row, field, min, max) => {
        if (locked) return `<span class="cc-lf-chip-muted">—</span>`;
        const raw = row?.[field];
        const val = (raw == null || raw === "") ? "" : raw;
        if (!editable) return `<span>${val === "" ? "—" : val}</span>`;
        const prev = lvl > start ? getActiveSpellProgRow(lvl - 1) : null;
        const floor = prev && prev[field] != null ? (parseInt(prev[field], 10) || 0) : min;
        const shown = val === "" ? floor : val;
        return `<input type="number" class="cc-spell-prog-input"
            min="${floor}" max="${max}" step="1"
            value="${shown}" onchange="onCcSpellProgNumberChange(${lvl}, '${field}', this.value)">`;
    };

    let body = "";
    for (let lvl = 1; lvl <= 20; lvl++) {
        const locked = lvl < start;
        const row = locked ? null : getActiveSpellProgRow(lvl);
        const listsHtml = locked ? "—" : (getSpellListInitialsHtml(row?.spellListLabels) || "—");
        const canOpenLists = !locked && (editable || lvl === start);
        const listCell = locked
            ? `<span class="cc-lf-chip-muted">—</span>`
            : `<button type="button" class="cc-lf-chip-btn${(row?.spellListLabels || []).length ? " cc-lf-chip-btn--on" : ""}"
                ${canOpenLists ? "" : "disabled"}
                onclick="openCcSpellListFloat(${lvl}, event)">${listsHtml}</button>`;

        const cells = [
            `<div class="cc-spell-prog-cell cc-spell-prog-cell--lvl">${lvl}</div>`,
            `<div class="cc-spell-prog-cell">${listCell}</div>`,
            `<div class="cc-spell-prog-cell">${buildNum(lvl, locked, row, "cantripsAmount", 0, 10)}</div>`,
            `<div class="cc-spell-prog-cell">${buildNum(lvl, locked, row, "preparedSpellsAmount", 0, 25)}</div>`
        ];
        for (let i = 1; i <= 9; i++) {
            cells.push(`<div class="cc-spell-prog-cell">${buildNum(lvl, locked, row, `SSpSL${i}`, 0, 15)}</div>`);
        }
        body += `<div class="cc-spell-prog-row${locked ? " cc-spell-prog-row--locked" : ""}">${cells.join("")}</div>`;
    }

    // Zauberlisten-Spalte wächst mit der maximalen Listenanzahl über alle Stufen mit
    let maxLists = 1;
    for (let lvl = start; lvl <= 20; lvl++) {
        const n = (getActiveSpellProgRow(lvl)?.spellListLabels || []).length;
        if (n > maxLists) maxLists = n;
    }
    const listsColPx = Math.max(104, 48 + maxLists * 22);

    container.innerHTML = `
        <div class="cc-spell-prog-toolbar">
            <p class="custom-class-hint cc-lf-intro">${tCC("customClassTab4HintLabel")}</p>
            <label class="cc-spell-prog-mode">
                <span>${tCC("ccSpellProgModeLabel")}</span>
                <select class="dropdown" onchange="onCcSpellProgModeChange(this.value)">
                    <option value="standard" ${mode === "standard" ? "selected" : ""}>${tCC("ccSpellProgModeStandardLabel")}</option>
                    <option value="user" ${mode === "user" ? "selected" : ""}>${tCC("ccSpellProgModeUserLabel")}</option>
                </select>
                ${editable
                    ? `<button type="button" class="cc-spell-prog-zero-btn" title="${tCC("ccSpellProgZeroTitleLabel")}"
                        onclick="zeroCcSpellProgValues()">0</button>`
                    : ""}
            </label>
        </div>
        <div class="cc-spell-prog-table-wrap">
            <div class="cc-spell-prog-table" style="--cc-spell-lists-col:${listsColPx}px;">
                ${groupHeadRow}
                <div class="cc-spell-prog-row cc-spell-prog-row--head">${headCells}</div>
                ${body}
            </div>
        </div>
    `;
}

function notifyCustomClassTab1ToolsChanged() {
    if (ccBiSyncGuard) return;
    const slots = customClassEditorState.levelFeatures || [];
    const surface = getTab1SurfaceToolLabel(customClassEditorState);

    if (surface) {
        const before = getTab2ToolsSlots(slots)[0];
        const ensured = ensureTab2ToolsSlot(slots, surface);
        if (!ensured && !before) {
            // Keine freie Zeile → Tab1 zurücksetzen
            alert(tCC("ccLfNoFreeRowAlertLabel"));
            ccBiSyncGuard = true;
            setTab1ToolSelectValue("");
            ccBiSyncGuard = false;
            return;
        }
    } else {
        // „Kein Werkzeug“ oder konkretes Nicht-Oberflächen-Tool → Tools-Zeilen entfernen
        clearTab2ToolsSlots(slots);
    }

    const panel = document.getElementById("customClassTab2");
    if (panel && panel.classList.contains("active")) {
        renderCustomClassTab2();
    }
}

/** Bezeichnungs-Dropdown für Optionen→Werkzeuge (Handwerkszeug / Musikinstrument / Spiele) */
function buildLfToolSurfaceSelectHtml(slot) {
    const current = slot.payload.optionsConfig?.toolSurfaceLabel
        || (!isLfSubclassFeatureSlot(slot) ? getTab1SurfaceToolLabel(customClassEditorState) : "")
        || "";
    const opts = CUSTOM_CLASS_TOOL_SURFACE_OPTIONS.map(label =>
        `<option value="${label}" ${current === label ? "selected" : ""}>${tCC(label)}</option>`
    ).join("");
    return `<select class="dropdown cc-lf-select" aria-label="${tCC("ccLfCatToolsLabel")}"
        onchange="onLfToolSurfaceCellChange('${slot.slotId}', this.value)"
        onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">
        <option value="">${tCC("pleaseSelectLabel")}</option>
        ${opts}
    </select>`;
}

/**
 * Werkzeug-Art in der Bezeichnungsspalte gewechselt →
 * Optionen-Auswahl zurücksetzen und Tab 1 synchronisieren.
 */
function onLfToolSurfaceCellChange(slotId, value) {
    const ctx = resolveLfSlotContext(slotId);
    if (!ctx) return;
    const surface = value || "";
    ctx.slot.payload.optionsConfig = {
        ...(ctx.slot.payload.optionsConfig || {}),
        toolSurfaceLabel: surface,
        mode: ctx.slot.payload.optionsConfig?.mode || "all",
        allowedLabels: []
    };
    if (!ctx.isSubclass) {
        ccBiSyncGuard = true;
        setTab1ToolSelectValue(surface);
        ccBiSyncGuard = false;
        ctx.slot.boundFromTab1Tool = !!surface;
        ctx.slot.contentLocked = false;
    }
    rerenderLfOwner(ctx);
}

//=======================================================================
// 2. Custom Subclass Builder (geplant)
//=======================================================================
// Eigenständige Unterklassen außerhalb des Klassen-Builders.
// (Klasseninterne UC bleiben vorerst in Abschnitt 1 / Tab 3.)
//=======================================================================

//=======================================================================
// 3. Custom Background Builder (geplant)
//=======================================================================

//=======================================================================
// 4. Custom Species Builder (geplant)
//=======================================================================

//=======================================================================
// 5. Custom Feats Builder (geplant)
//=======================================================================

//=======================================================================
// 6. Custom Spell Builder (geplant)
//=======================================================================
