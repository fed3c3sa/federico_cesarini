(function () {
  "use strict";

  var still = window.matchMedia("(prefers-reduced-motion: reduce)");

  // The bar gets its hairline once the page moves under it.
  var bar = document.querySelector(".top");
  function onScroll() { bar.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Small screens: the sections open as a sheet under the bar.
  var toggle = document.querySelector(".menu-toggle");
  var sheet = document.getElementById("menu");
  function setMenu(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
    sheet.hidden = !open;
    document.documentElement.classList.toggle("menu-open", open);
  }
  toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
  sheet.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) { setMenu(false); toggle.focus(); } });
  window.matchMedia("(min-width: 981px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });

  // The pill under the section you are reading.
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[href^='#']"));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = byId[entry.target.id];
        if (a) a.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });

    // The benchmark bars fill in when they come into view.
    var bench = document.querySelector(".bench");
    if (bench) {
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { bench.classList.add("in"); obs.disconnect(); }
      }, { threshold: 0.35 }).observe(bench);
    }
  } else {
    var b = document.querySelector(".bench");
    if (b) b.classList.add("in");
  }

  // Crow's demo loop: plays while on screen, and a pause stays a pause.
  var video = document.querySelector("[data-demo]");
  var vbtn = document.querySelector("[data-demo-toggle]");
  if (video && vbtn) {
    var userPaused = still.matches;
    function label() {
      var playing = !video.paused;
      vbtn.setAttribute("aria-label", playing ? "Pause the demo" : "Play the demo");
      vbtn.classList.toggle("is-playing", playing);
    }
    vbtn.addEventListener("click", function () {
      if (video.paused) { userPaused = false; video.play(); } else { userPaused = true; video.pause(); }
    });
    video.addEventListener("play", label);
    video.addEventListener("pause", label);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { if (!userPaused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); } }
        else if (!video.paused) video.pause();
      }, { threshold: 0.25 }).observe(video);
    }
    label();
  }

  // Copy the install line.
  Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.classList.add("copied");
        btn.setAttribute("aria-label", "Copied");
        setTimeout(function () { btn.classList.remove("copied"); btn.setAttribute("aria-label", "Copy " + text); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  // The composer opens an email, addressed and ready.
  var form = document.querySelector(".composer");
  if (form) {
    var field = form.querySelector("textarea");
    var grow = function () { field.style.height = "auto"; field.style.height = Math.min(field.scrollHeight, 200) + "px"; };
    field.addEventListener("input", grow);
    field.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.submit(); }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = field.value.trim();
      if (!text) { field.focus(); form.classList.add("empty"); setTimeout(function () { form.classList.remove("empty"); }, 700); return; }
      var to = form.getAttribute("data-to");
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Hello from federicocesarini.com") + "&body=" + encodeURIComponent(text);
    });
  }
})();
