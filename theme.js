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

setTheme(localStorage.getItem(THEME_KEY) || "system");

// The Splashery toy's sound: off at first, on when tapped. The embed only sounds with ?sound=on,
// so the button reloads the toy with or without it.
const soundButton = document.querySelector("#splashery-sound");
const toyFrame = document.querySelector("#splashery-slot iframe");
if (soundButton && toyFrame) {
  soundButton.hidden = false;
  soundButton.setAttribute("aria-pressed", "false");
  soundButton.addEventListener("click", () => {
    const on = soundButton.getAttribute("aria-pressed") !== "true";
    const url = new URL(toyFrame.src);
    if (on) url.searchParams.set("sound", "on");
    else url.searchParams.delete("sound");
    toyFrame.src = url.href;
    soundButton.setAttribute("aria-pressed", String(on));
    soundButton.textContent = on ? "Sound: on (tap the toy)" : "Sound: off";
  });
}
