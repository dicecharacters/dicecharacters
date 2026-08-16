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

    /** Kreis-mit-Plus-Icon neben Custom-Bezeichnungen (Ersteller + Bogen) */
    customContentMarker: 0

    // Weitere Schalter (später einkommentieren / auf 1 setzen):
    // customSpeciesBuilder: 0,
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
// Custom-Inhalt-Marker (Kreis mit Plus neben der Bezeichnung)
//=======================================================================

/** Inline-SVG: erbt currentColor (Ersteller hell, Bogen dunkel). */
const CUSTOM_CONTENT_MARKER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.5"/>'
    + '<path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 8v8M8 12h8"/>'
    + "</svg>";

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

/** Füllt/aktualisiert ein Marker-Element (Titel + SVG). */
function paintCustomContentMarker(el) {
    if (!el) return;
    const title = getCustomContentMarkerTitle();
    el.classList.add("custom-content-marker");
    el.setAttribute("role", "img");
    el.title = title;
    el.setAttribute("aria-label", title);
    el.innerHTML = CUSTOM_CONTENT_MARKER_SVG;
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
        el.innerHTML = "";
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
    return `<span class="custom-content-marker" role="img" title="${title}" aria-label="${title}">${CUSTOM_CONTENT_MARKER_SVG}</span>`;
}

/**
 * Native <option> kann kein SVG. Prefix für Custom-Einträge in Dropdowns.
 * @returns {string}
 */
function getCustomContentSelectPrefix() {
    return isCustomContentMarkerEnabled() ? "⊕ " : "";
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
    if (addScWrap) {
        addScWrap.classList.toggle("cc-feature-enabled", subclassBuilderOn);
        addScWrap.setAttribute("aria-hidden", subclassBuilderOn ? "false" : "true");
    }
    if (addScBtn) {
        addScBtn.disabled = !subclassBuilderOn;
        addScBtn.tabIndex = subclassBuilderOn ? 0 : -1;
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

    if (typeof applyCscTranslations === "function") applyCscTranslations();
    if (typeof applyCbgTranslations === "function") applyCbgTranslations();
    if (typeof applyCspTranslations === "function") applyCspTranslations();
    if (typeof applyCffTranslations === "function") applyCffTranslations();
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
