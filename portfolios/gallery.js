// The screening room: the poster you point at, focus or (on a touch screen) scroll to the middle
// plays its trailer, and its color lights the stage. Without this script the wall still shows
// every poster as a still image with its links.
(() => {
  const stage = document.querySelector("main.stage");
  const posters = [...document.querySelectorAll(".poster")];
  if (!stage || !posters.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
  let active = null;

  const glowOf = (poster) => getComputedStyle(poster).getPropertyValue("--glow").trim();

  function load(video) {
    if (video.dataset.loaded) return;
    video.dataset.loaded = "1";
    for (const [type, attr] of [["video/webm", "webm"], ["video/mp4", "mp4"]]) {
      const src = video.dataset[attr];
      if (!src) continue;
      const source = document.createElement("source");
      source.src = src;
      source.type = type;
      video.append(source);
    }
    video.addEventListener("playing", () => video.classList.add("is-ready"), { once: true });
    video.load();
  }

  function activate(poster) {
    if (active === poster) return;
    if (active) deactivate(active);
    active = poster;
    poster.classList.add("is-playing");
    stage.style.setProperty("--stage-glow", glowOf(poster));
    if (reduceMotion.matches) return;
    const video = poster.querySelector("video");
    if (!video) return;
    load(video);
    try {
      video.currentTime = 0;
    } catch (e) {
      /* not seekable yet */
    }
    const playing = video.play();
    if (playing && playing.catch) playing.catch(() => {});
  }

  function deactivate(poster) {
    poster.classList.remove("is-playing");
    const video = poster.querySelector("video");
    if (video) video.pause();
    if (active === poster) active = null;
  }

  posters.forEach((poster, i) => {
    poster.style.setProperty("--i", String(i));
    poster.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse" || canHover.matches) activate(poster);
    });
    poster.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" || canHover.matches) deactivate(poster);
    });
    poster.addEventListener("focusin", () => activate(poster));
    poster.addEventListener("focusout", (e) => {
      if (!poster.contains(e.relatedTarget)) deactivate(poster);
    });
  });

  // On a touch screen, the poster nearest the middle of the screen is the one that plays.
  let queued = false;
  function pickByScroll() {
    queued = false;
    if (canHover.matches) return;
    const mid = window.innerHeight / 2;
    let best = null;
    let bestDistance = Infinity;
    for (const poster of posters) {
      const r = poster.querySelector(".poster__frame").getBoundingClientRect();
      if (r.bottom < window.innerHeight * 0.3 || r.top > window.innerHeight * 0.7) continue;
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestDistance) {
        best = poster;
        bestDistance = d;
      }
    }
    if (best) activate(best);
    else if (active) deactivate(active);
  }
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(pickByScroll);
    }
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  queue();

  // A hidden tab keeps nothing playing.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && active) deactivate(active);
  });
})();
