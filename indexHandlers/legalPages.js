// Gemeinsame Sprachumschaltung für Impressum und Datenschutz
function setLegalLanguage(lang) {
    const elements = translations[lang];
    if (!elements) return;

    document.documentElement.lang = lang === "en" ? "en" : "de";
    localStorage.setItem("currentLanguage", lang);

    const titleKey = document.body.getAttribute("data-title-key");
    if (titleKey && elements[titleKey]) {
        document.title = elements[titleKey];
    }

    Object.keys(elements).forEach((key) => {
        const el = document.getElementById(key);
        if (!el) return;
        if (el.tagName === "TITLE" || el.tagName === "META" || el.tagName === "SCRIPT") return;
        el.innerHTML = elements[key];
    });

    const langDe = document.getElementById("langDe");
    const langEn = document.getElementById("langEn");
    if (langDe) langDe.classList.toggle("active-lang", lang === "de");
    if (langEn) langEn.classList.toggle("active-lang", lang === "en");
}

document.addEventListener("DOMContentLoaded", () => {
    setLegalLanguage(localStorage.getItem("currentLanguage") || "de");
});
