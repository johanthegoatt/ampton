// Jack, the friendly plug in the corner. Jack offers a tip when tapped, gives a
// thumbs-up when the lead has room, looks worried when it is close to the limit,
// and holds up a hand when it is overloaded. The app tells Jack the mood; Jack
// never changes it on a timer of its own. Everything Jack says goes through the
// bubble's live region so a screen reader hears it, and Jack holds still if you
// have asked for reduced motion.
(function () {
  "use strict";
  var btn = document.getElementById("jack");
  var bubble = document.getElementById("jack-bubble");
  if (!btn) { window.Jack = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var mood = "happy", tipKey = "start";
  var bubbleTimer = null, taps = [];

  var TIPS = {
    start: [
      "Hi, I'm Jack. Add what you've got plugged into one socket or lead and I'll tell you if it's too much.",
      "A wall socket and most extension leads are rated 13 amps, about 3,000 watts. I add your gear up against that.",
      "The sneaky bit: a four-way lead is 13 amps for the whole lead, not per socket. Four plugs don't mean four times the power."
    ],
    heat: [
      "Kettles, heaters, irons and washing machines pull a lot each. They're happiest in a wall socket on their own.",
      "Two big heating things on one lead is the usual overload, even if the number looks fine.",
      "The real wattage is on the appliance's rating plate. Type it in if you know it."
    ],
    tight: [
      "Getting close. There's not much room left, so I'd keep the spare sockets free.",
      "Close to the limit means one more plug could tip it over. Move a big appliance to its own socket if you can."
    ],
    over: [
      "That's over the limit. It can get hot enough to be a fire risk. Unplug something or move the biggest appliance.",
      "Too much on one lead. The lead, not the appliance, is what overheats, so take some load off it."
    ],
    daisy: [
      "Don't plug leads into leads. All the power runs through the first lead's 13 amps, which overloads it.",
      "One lead per wall socket. Chaining them is how leads get hot."
    ]
  };

  function pick(key) {
    var list = TIPS[key] || TIPS.start;
    return list[Math.floor(Math.random() * list.length)];
  }

  var FACES = {
    happy:  "M 22 34 Q 32 42 42 34",
    think:  "M 22 36 Q 32 33 42 36",
    worry:  "M 22 38 Q 32 32 42 38",
    alarm:  "M 23 39 Q 32 30 41 39"
  };

  function setMood(m) {
    mood = m;
    var mouth = document.getElementById("jack-mouth");
    if (mouth) mouth.setAttribute("d", FACES[m] || FACES.happy);
    btn.classList.toggle("is-alarm", m === "alarm");
  }

  function say(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove("show"); }, 7000);
  }

  // The app calls this with the assessment to keep Jack's face and the tip in
  // step with the lead's state.
  function context(info) {
    if (!info) return;
    if (info.daisyChained) { tipKey = "daisy"; setMood("alarm"); return; }
    if (info.status === "over") { tipKey = "over"; setMood("alarm"); return; }
    if (info.status === "tight") { tipKey = "tight"; setMood("worry"); return; }
    if (info.heatCount >= 2) { tipKey = "heat"; setMood("think"); return; }
    tipKey = info.empty ? "start" : "heat";
    setMood("happy");
  }

  function react() {
    say(pick(tipKey));
    taps.push(Date.now());
    taps = taps.filter(function (t) { return Date.now() - t < 1500; });
    if (taps.length >= 5 && !still.matches) {
      btn.classList.add("wiggle");
      setTimeout(function () { btn.classList.remove("wiggle"); }, 600);
      taps = [];
    }
  }

  btn.addEventListener("click", react);
  btn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); react(); }
  });

  setMood("happy");
  window.Jack = { react: react, context: context, say: say };
})();
