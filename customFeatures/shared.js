//=======================================================================
// Custom Features – Shared (Ersteller)
//=======================================================================
// Gemeinsame Schalter und Einstiegs-Sichtbarkeit für alle Custom-Builder.
//
// Ordnerstruktur:
//   customFeatures/shared.js           – Flags, Visibility (diese Datei)
//   customFeatures/classBuilder.js     – Custom Class Builder
//   customFeatures/subclassBuilder.js  – Custom Subclass Builder (Standalone)
//   customFeatures/backgroundBuilder.js – Custom Background Builder
//   customFeatures/spellBuilder.js      – Custom Spell Builder (Pack)
//   customFeatures/featBuilder.js       – Custom Feat Builder (Pack / Talentbibliothek)
//   …
//
// Lade-Reihenfolge in charaktererstellung.html:
//   shared.js → classBuilder.js → subclassBuilder.js → backgroundBuilder.js → spellBuilder.js → …
//
// Charakterbogen-Runtime: customFeatures/customFeaturesSheet.js
// Pakete / Envelope / Abhängigkeits-Graph: dcPackage.js
//   → DC_PACKAGE_DEPENDENCY_EDGES, getDcPackageDependencyTargets(), …
//
// Shared LF-Masken/Compile liegen vorerst noch in classBuilder.js und werden
// von subclassBuilder.js mitgenutzt; bei weiteren Buildern schrittweise hierher.
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
    customClassBuilder: 0,
    /** Custom-Unterklassen-Ersteller: „+“ in Schritt 6 */
    customSubclassBuilder: 0,
    /** Custom-Hintergrund-Ersteller: „+“ in Schritt 2 */
    customBackgroundBuilder: 0,
    /** Custom-Zauber-Ersteller: „+“ in Schritt 7 */
    customSpellBuilder: 0,
    /** Custom-Talentbibliothek: „+“ in Schritt 6 */
    customFeatsBuilder: 0,
    /** Custom-Völker-Ersteller: „+“ in Schritt 3 */
    customSpeciesBuilder: 0,

    /** Kreis-mit-Plus-Icon neben Custom-Bezeichnungen (Ersteller + Bogen) */
    customContentMarker: 1
};

/**
 * source-Tag für vom Nutzer erstellte Custom-Inhalte (Klasse / UC / Hintergrund).
 * Entspricht dem Array-Format der PHB/SRD-Datenobjekte (z. B. ["phb2024"]).
 */
const CUSTOM_CONTENT_SOURCE = Object.freeze(["dicecharacters"]);

/** source auf ein Custom-Datenobjekt setzen (Compile + Legacy-Import). */
function applyCustomContentSource(entry) {
    if (!entry || typeof entry !== "object") return entry;
    entry.source = CUSTOM_CONTENT_SOURCE.slice();
    return entry;
}

//=======================================================================
// Custom-Inhalt-Marker (⊕ neben der Bezeichnung; einheitlich inkl. Dropdowns)
//=======================================================================

/** Einheitliches Glyph (natives <option> kann kein SVG). */
const CUSTOM_CONTENT_MARKER_CHAR = "⊕";

function getCustomContentMarkerTitle() {
    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    const fallback = lang === "en" ? "Custom" : "Selbsterstellt";
    if (typeof translations !== "undefined" && translations[lang]
        && translations[lang].customContentMarkerTitleLabel != null) {
        return translations[lang].customContentMarkerTitleLabel;
    }
    return fallback;
}

/** true = Custom-Marker global aktiv (CUSTOM_FEATURE_FLAGS.customContentMarker). */
function isCustomContentMarkerEnabled() {
    return typeof isCustomFeatureEnabled === "function"
        ? isCustomFeatureEnabled("customContentMarker")
        : (Number(CUSTOM_FEATURE_FLAGS?.customContentMarker) === 1);
}

/** Füllt/aktualisiert ein Marker-Element (Titel + ⊕). */
function paintCustomContentMarker(el) {
    if (!el) return;
    const title = getCustomContentMarkerTitle();
    el.classList.add("custom-content-marker");
    el.setAttribute("role", "img");
    el.title = title;
    el.setAttribute("aria-label", title);
    el.textContent = CUSTOM_CONTENT_MARKER_CHAR;
    el.style.removeProperty("--custom-content-marker-url");
}

/**
 * Marker ein-/ausblenden. Bei Flag=0 immer aus.
 * @param {HTMLElement|null} el
 * @param {boolean} show
 */
function setCustomContentMarkerVisible(el, show) {
    if (!el) return;
    if (!isCustomContentMarkerEnabled() || !show) {
        el.hidden = true;
        el.textContent = "";
        return;
    }
    paintCustomContentMarker(el);
    el.hidden = false;
}

/** HTML-Schnipsel für Listen/Labels (oder leer wenn Flag aus). */
function getCustomContentMarkerHtml() {
    if (!isCustomContentMarkerEnabled()) return "";
    const title = getCustomContentMarkerTitle()
        .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<span class="custom-content-marker" role="img" title="${title}" aria-label="${title}">${CUSTOM_CONTENT_MARKER_CHAR}</span>`;
}

/**
 * Prefix/Suffix für Custom-Einträge in nativen <select>-Dropdowns.
 * @returns {string}
 */
function getCustomContentSelectPrefix() {
    return isCustomContentMarkerEnabled() ? `${CUSTOM_CONTENT_MARKER_CHAR} ` : "";
}

/**
 * Anzeigename + ⊕ für Dropdowns/Checkboxen (Suffix, wie createFeatOptions).
 * @param {string} displayName
 * @param {boolean} isCustom
 * @returns {string}
 */
function withCustomContentSelectMarker(displayName, isCustom) {
    const name = displayName == null ? "" : String(displayName);
    if (!isCustom || !isCustomContentMarkerEnabled()) return name;
    const mark = String(getCustomContentSelectPrefix() || "").trim();
    return mark ? `${name} ${mark}` : name;
}

/**
 * Effektive featList: PHB + Session-Talentbibliothek (ohne Duplikate).
 * Mutiert niemals die globale featList.
 * @returns {object[]}
 */
function getEffectiveFeatList() {
    const base = (typeof featList !== "undefined" && Array.isArray(featList)) ? featList : [];
    const pack = (typeof getRegisteredCustomFeatPackFeats === "function")
        ? (getRegisteredCustomFeatPackFeats() || [])
        : [];
    if (!pack.length) return base;
    const seen = new Set(base.map(f => f && Number(f.ID)).filter(Number.isFinite));
    const append = [];
    pack.forEach(f => {
        if (!f) return;
        const id = Number(f.ID);
        if (!Number.isFinite(id) || seen.has(id)) return;
        seen.add(id);
        append.push(f);
    });
    return append.length ? base.concat(append) : base;
}

/** true = Talent aus der Talentbibliothek / isCustom. */
function isCustomContentFeat(feat) {
    if (!feat) return false;
    if (feat.isCustom) return true;
    const id = Number(feat.ID);
    if (typeof getRegisteredCustomFeatPackFeats === "function") {
        const pack = getRegisteredCustomFeatPackFeats();
        if (Array.isArray(pack) && pack.some(f => f && Number(f.ID) === id)) return true;
    }
    if (typeof getSheetCustomFeatPackFeats === "function") {
        const pack = getSheetCustomFeatPackFeats();
        if (Array.isArray(pack) && pack.some(f => f && Number(f.ID) === id)) return true;
    }
    return false;
}

/** true = Standalone-Custom-Unterklasse (nicht UC einer Custom-Klasse). */
function isCustomContentSubclass(subclass, className) {
    if (!subclass) return false;
    // Nur Standalone-Custom-UC (feste Kategorie-Nummer)
    if (typeof CUSTOM_SUBCLASS_CATEGORY_NUMBER !== "undefined"
        && Number(subclass.subclassCategoryNumber) === Number(CUSTOM_SUBCLASS_CATEGORY_NUMBER)) {
        return true;
    }
    // Explizit Standalone markiert, aber nicht „nur weil Custom-Klasse“
    if (subclass.isCustom
        && !(typeof isRegisteredCustomClassSlug === "function" && className
            && isRegisteredCustomClassSlug(className))) {
        return true;
    }
    return false;
}

/** true = Zauber aus Bibliothek / isCustom. */
function isCustomContentSpell(spell) {
    if (!spell) return false;
    if (spell.isCustom) return true;
    if (typeof isSpellFromSessionLibrary === "function" && isSpellFromSessionLibrary(spell)) {
        return true;
    }
    if (typeof getSheetCustomSpellPackSpells === "function") {
        const pack = getSheetCustomSpellPackSpells();
        const id = Number(spell.ID);
        if (Array.isArray(pack) && pack.some(s => s && Number(s.ID) === id)) return true;
    }
    return false;
}

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

    const subclassBuilderOn = isCustomFeatureEnabled("customSubclassBuilder");
    const addScWrap = document.getElementById("addCustomSubclassWrap");
    const addScBtn = document.getElementById("addCustomSubclassBtn");
    const hideScForLevelUp = (typeof isLevelUpMode === "function" && isLevelUpMode()
        && typeof isLevelUpSubclassFixed === "function" && isLevelUpSubclassFixed());
    if (addScWrap) {
        addScWrap.classList.toggle("cc-feature-enabled", subclassBuilderOn && !hideScForLevelUp);
        addScWrap.classList.toggle("level-up-subclass-add-hidden", !!hideScForLevelUp);
        addScWrap.setAttribute("aria-hidden", (subclassBuilderOn && !hideScForLevelUp) ? "false" : "true");
    }
    if (addScBtn) {
        addScBtn.disabled = !subclassBuilderOn || hideScForLevelUp;
        addScBtn.tabIndex = (subclassBuilderOn && !hideScForLevelUp) ? 0 : -1;
    }
    if (!subclassBuilderOn) {
        const scOverlay = document.getElementById("customSubclassOverlay");
        if (scOverlay && scOverlay.style.display !== "none" && scOverlay.style.display !== "") {
            if (typeof closeCustomSubclassModal === "function") closeCustomSubclassModal();
        }
    }

    const backgroundBuilderOn = isCustomFeatureEnabled("customBackgroundBuilder");
    const addBgItem = document.getElementById("addCustomBackgroundListItem");
    const addBgBtn = document.getElementById("addCustomBackgroundBtn");
    if (addBgItem) {
        addBgItem.classList.toggle("cc-feature-enabled", backgroundBuilderOn);
        addBgItem.setAttribute("aria-hidden", backgroundBuilderOn ? "false" : "true");
    }
    if (addBgBtn) {
        addBgBtn.disabled = !backgroundBuilderOn;
        addBgBtn.tabIndex = backgroundBuilderOn ? 0 : -1;
    }
    if (!backgroundBuilderOn) {
        const bgOverlay = document.getElementById("customBackgroundOverlay");
        if (bgOverlay && bgOverlay.style.display !== "none" && bgOverlay.style.display !== "") {
            if (typeof closeCustomBackgroundModal === "function") closeCustomBackgroundModal();
        }
    }

    const spellBuilderOn = isCustomFeatureEnabled("customSpellBuilder");
    const addSpellWrap = document.getElementById("addCustomSpellWrap");
    const addSpellBtn = document.getElementById("addCustomSpellBtn");
    if (addSpellWrap) {
        addSpellWrap.classList.toggle("cc-feature-enabled", spellBuilderOn);
        addSpellWrap.setAttribute("aria-hidden", spellBuilderOn ? "false" : "true");
    }
    if (addSpellBtn) {
        addSpellBtn.disabled = !spellBuilderOn;
        addSpellBtn.tabIndex = spellBuilderOn ? 0 : -1;
    }
    if (!spellBuilderOn) {
        const spOverlay = document.getElementById("customSpellOverlay");
        if (spOverlay && spOverlay.style.display !== "none" && spOverlay.style.display !== "") {
            if (typeof closeCustomSpellModal === "function") closeCustomSpellModal();
        }
    }

    const featsBuilderOn = isCustomFeatureEnabled("customFeatsBuilder");
    const addFeatWrap = document.getElementById("addCustomFeatWrap");
    const addFeatBtn = document.getElementById("addCustomFeatBtn");
    if (addFeatWrap) {
        addFeatWrap.classList.toggle("cc-feature-enabled", featsBuilderOn);
        addFeatWrap.setAttribute("aria-hidden", featsBuilderOn ? "false" : "true");
    }
    if (addFeatBtn) {
        addFeatBtn.disabled = !featsBuilderOn;
        addFeatBtn.tabIndex = featsBuilderOn ? 0 : -1;
    }
    if (!featsBuilderOn) {
        const ftOverlay = document.getElementById("customFeatOverlay");
        if (ftOverlay && ftOverlay.style.display !== "none" && ftOverlay.style.display !== "") {
            if (typeof closeCustomFeatModal === "function") closeCustomFeatModal();
        }
    }

    const speciesBuilderOn = isCustomFeatureEnabled("customSpeciesBuilder");
    const addSpItem = document.getElementById("addCustomSpeciesListItem");
    const addSpBtn = document.getElementById("addCustomSpeciesBtn");
    if (addSpItem) {
        addSpItem.classList.toggle("cc-feature-enabled", speciesBuilderOn);
        addSpItem.setAttribute("aria-hidden", speciesBuilderOn ? "false" : "true");
    }
    if (addSpBtn) {
        addSpBtn.disabled = !speciesBuilderOn;
        addSpBtn.tabIndex = speciesBuilderOn ? 0 : -1;
    }
    if (!speciesBuilderOn) {
        const spcOverlay = document.getElementById("customSpeciesOverlay");
        if (spcOverlay && spcOverlay.style.display !== "none" && spcOverlay.style.display !== "") {
            if (typeof closeCustomSpeciesModal === "function") closeCustomSpeciesModal();
        }
    }

    if (typeof applyCscTranslations === "function") applyCscTranslations();
    if (typeof applyCbgTranslations === "function") applyCbgTranslations();
    if (typeof applyCspTranslations === "function") applyCspTranslations();
    if (typeof applyCffTranslations === "function") applyCffTranslations();
    if (typeof applyCspcTranslations === "function") applyCspcTranslations();

    updateStep1CustomHub();
}

//=======================================================================
// Schritt-1: klappbarer Spiegel der Custom-Builder-„+“-Buttons
//=======================================================================

function tStep1CustomHub(key, fallback) {
    const lang = (typeof currentLang !== "undefined" && currentLang)
        ? currentLang
        : ((typeof currentLanguage !== "undefined" && currentLanguage) ? currentLanguage : "de");
    if (typeof translations !== "undefined" && translations[lang]?.[key] != null) {
        return translations[lang][key];
    }
    if (typeof tCC === "function") {
        const via = tCC(key);
        if (via && via !== key) return via;
    }
    return fallback || key;
}

/** true = mind. ein Custom-Builder-Flag aktiv → Hub-Pfeil sichtbar */
function isStep1CustomHubAnyBuilderEnabled() {
    return isCustomFeatureEnabled("customClassBuilder")
        || isCustomFeatureEnabled("customSubclassBuilder")
        || isCustomFeatureEnabled("customBackgroundBuilder")
        || isCustomFeatureEnabled("customSpeciesBuilder")
        || isCustomFeatureEnabled("customFeatsBuilder")
        || isCustomFeatureEnabled("customSpellBuilder");
}

/** true = Paket in dieser Session per Upload/Erstellen geladen (kein LS-Hydrate). */
function isStep1CustomHubDcSessionLoaded(packageTypeOrTypes) {
    if (typeof wasDcPackageUserLoadedThisSession !== "function"
        || typeof DC_PACKAGE_TYPE === "undefined") {
        return true;
    }
    const types = Array.isArray(packageTypeOrTypes) ? packageTypeOrTypes : [packageTypeOrTypes];
    return types.some(t => wasDcPackageUserLoadedThisSession(t));
}

function isStep1CustomHubRuntimeLoaded(hubKey) {
    switch (hubKey) {
        case "class":
            if (!isStep1CustomHubDcSessionLoaded([
                DC_PACKAGE_TYPE.CUSTOM_CLASS,
                DC_PACKAGE_TYPE.CUSTOM_CLASS_RUNTIME
            ])) return false;
            return !!(typeof registeredCustomClass !== "undefined"
                && registeredCustomClass?.translationLabel);
        case "subclass":
            if (!isStep1CustomHubDcSessionLoaded(DC_PACKAGE_TYPE.CUSTOM_SUBCLASS)) return false;
            return !!(typeof registeredCustomSubclass !== "undefined"
                && registeredCustomSubclass);
        case "background":
            if (!isStep1CustomHubDcSessionLoaded(DC_PACKAGE_TYPE.CUSTOM_BACKGROUND)) return false;
            return !!(typeof registeredCustomBackground !== "undefined"
                && registeredCustomBackground?.translationLabel);
        case "species":
            if (!isStep1CustomHubDcSessionLoaded(DC_PACKAGE_TYPE.CUSTOM_SPECIES)) return false;
            return !!(typeof registeredCustomSpecies !== "undefined"
                && registeredCustomSpecies?.translationLabel);
        case "feat":
            if (!isStep1CustomHubDcSessionLoaded(DC_PACKAGE_TYPE.CUSTOM_FEAT_PACK)) return false;
            return !!(typeof registeredCustomFeatPack !== "undefined"
                && Array.isArray(registeredCustomFeatPack?.feats)
                && registeredCustomFeatPack.feats.length > 0);
        case "spell":
            if (!isStep1CustomHubDcSessionLoaded(DC_PACKAGE_TYPE.CUSTOM_SPELL_PACK)) return false;
            return !!(typeof registeredCustomSpellPack !== "undefined"
                && Array.isArray(registeredCustomSpellPack?.spells)
                && registeredCustomSpellPack.spells.length > 0);
        default:
            return false;
    }
}

function toggleStep1CustomHub(forceCollapse) {
    const panel = document.getElementById("step1CustomHubPanel");
    const toggle = document.getElementById("step1CustomHubToggle");
    const arrow = document.getElementById("step1CustomHubArrow");
    if (!panel || !toggle) return;
    let collapsed;
    if (typeof forceCollapse === "boolean") collapsed = forceCollapse;
    else collapsed = !panel.classList.contains("collapsed");
    panel.classList.toggle("collapsed", collapsed);
    // Kein hidden/display:none – Slide-Animation braucht sichtbares Layout
    panel.removeAttribute("hidden");
    panel.setAttribute("aria-hidden", collapsed ? "true" : "false");
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    if (arrow) arrow.classList.toggle("is-collapsed", collapsed);
}

/**
 * Hub-Sichtbarkeit (Flags), Labels, Grün-Status (Runtime), UC-Gate (Klasse gewählt).
 * Spiegel-Buttons behalten dieselben onclick-Handler wie die Fach-Schritte.
 */
function updateStep1CustomHub() {
    const hub = document.getElementById("step1CustomHub");
    if (!hub) return;
    const anyOn = isStep1CustomHubAnyBuilderEnabled();
    hub.classList.toggle("cc-feature-enabled", anyOn);
    hub.setAttribute("aria-hidden", anyOn ? "false" : "true");
    if (!anyOn) toggleStep1CustomHub(true);

    const hasClass = !!(typeof character !== "undefined" && character?.class);
    const needClassTitle = tStep1CustomHub(
        "step1CustomNeedClassHoverLabel",
        "Zuerst Klasse wählen"
    );

    hub.querySelectorAll(".step1-custom-hub-row").forEach(row => {
        const flag = row.getAttribute("data-flag");
        const hubKey = row.getAttribute("data-hub");
        const enabled = flag ? isCustomFeatureEnabled(flag) : false;
        row.hidden = !enabled;
        if (!enabled) return;

        const label = row.querySelector(".step1-custom-hub-label");
        const btn = row.querySelector("button");
        const labelKey = label?.getAttribute("data-label-key");
        if (label && labelKey) {
            label.textContent = tStep1CustomHub(labelKey, label.textContent);
            label.classList.toggle("is-loaded", isStep1CustomHubRuntimeLoaded(hubKey));
        }

        const subclassNeedsClass = hubKey === "subclass" && !hasClass;
        row.classList.toggle("is-disabled", subclassNeedsClass);
        if (btn) {
            btn.disabled = subclassNeedsClass;
            btn.tabIndex = subclassNeedsClass ? -1 : 0;
            const baseAria = label?.textContent || "+";
            if (subclassNeedsClass) {
                btn.title = needClassTitle;
                row.title = needClassTitle;
                btn.setAttribute("aria-label", needClassTitle);
            } else {
                btn.removeAttribute("title");
                row.removeAttribute("title");
                btn.setAttribute("aria-label", baseAria);
                btn.title = baseAria;
            }
        } else if (row) {
            row.removeAttribute("title");
        }
    });
}

(function scheduleApplyCustomFeatureVisibility() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyCustomFeatureVisibility);
    } else {
        applyCustomFeatureVisibility();
    }
})();

/**
 * Modal-Breite: Chooser schmal (`--chooser`), Editor breit (Default).
 * @param {string|HTMLElement} overlayOrModal Overlay-ID, Overlay-Node oder Modal-Node
 * @param {boolean} isChooser true = Erstellen/Hochladen-Ansicht
 */
function setCustomFeatureModalChooserMode(overlayOrModal, isChooser) {
    let modal = null;
    if (typeof overlayOrModal === "string") {
        const overlay = document.getElementById(overlayOrModal);
        modal = overlay?.querySelector(".custom-class-modal") || null;
    } else if (overlayOrModal?.classList?.contains("custom-class-modal")) {
        modal = overlayOrModal;
    } else if (overlayOrModal?.querySelector) {
        modal = overlayOrModal.querySelector(".custom-class-modal");
    }
    if (!modal) return;
    modal.classList.toggle("custom-class-modal--chooser", !!isChooser);
}
