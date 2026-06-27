const THEME_KEY = "paper-minimal-theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const site = document.querySelector(".site");
const themeInputs = [...document.querySelectorAll("input[name='theme']")];

function setTheme(choice) {
  const resolved = choice === "system" ? (systemDark.matches ? "dark" : "light") : choice;
  site.dataset.themeChoice = choice;
  site.dataset.resolvedTheme = resolved;
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.dataset.resolvedTheme = resolved;
  localStorage.setItem(THEME_KEY, choice);
  for (const input of themeInputs) {
    input.checked = input.value === choice;
  }
  document.dispatchEvent(new CustomEvent("paper-theme-change", { detail: { choice, resolved } }));
}

themeInputs.forEach((input) => input.addEventListener("change", () => setTheme(input.value)));
systemDark.addEventListener("change", () => {
  if (site.dataset.themeChoice === "system") {
    setTheme("system");
  }
});

setTheme(localStorage.getItem(THEME_KEY) || "light");
