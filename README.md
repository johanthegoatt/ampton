# Ampton

Is that too much on one socket? Add up everything plugged into a single wall socket or extension lead, and Ampton tells you whether it's within the limit or heading for an overload.

Live: https://ampton.johanthegoat.xyz

## What it does

- **Builds the lead for you.** Add appliances from a list of typical wattages, change the watts to the exact figure on the rating plate, and set a quantity for several of the same thing.
- **Shows the real limit.** A UK wall socket and most extension leads are rated 13 amps, about 3,000 watts at 230 volts. Ampton adds the wattage up, converts it to amps, and draws a bar showing how much of the rating you've used and how much is still free.
- **Catches the four-way trap.** A four-way lead is rated 13 amps for the whole lead, not per socket, so four plugs don't give you four times the power. Ampton counts the total, not the sockets.
- **Flags the high-power appliances.** Kettles, heaters, irons, washing machines and tumble dryers each take a big share and run hot. Ampton marks them and warns when two share one lead, even if the number still fits.
- **Warns about daisy-chaining.** Tick "plugged into another lead" and Ampton flags it: all the current runs through the first lead's 13 amps, which is how leads overheat.
- **Other lead ratings.** Pick a 10-amp travel lead or a 16-amp heavy-duty lead and the limit moves with it.
- **A share link** that reopens the same setup. The whole list lives in the link's `#fragment`, which a browser never sends to a server, so nothing you build is uploaded.

## The method

Current is power divided by voltage (amps = watts ÷ volts). At the UK's 230 volts, the 13-amp rating of a BS 1363 socket, plug fuse or standard lead works out to about 2,990 watts, which is where the quoted 3,000-watt figure comes from (a little more at the older 240-volt figure, ~3,120 watts). Ampton sums the appliances in watts, divides by the mains voltage for the current, and compares it to the lead's rating. A load over the rating is flagged red; within about 10% of it is "close"; below that there's comfortable headroom. The high-power flag follows the fire-service rule that heating appliances are best in their own wall socket, and the daisy-chain warning follows the rule never to plug one lead into another.

Wattages shown are typical values for guidance; the real figure is on the appliance's rating plate, and Ampton lets you type it in.

Sources:

- [Electrical Safety First — overloading sockets and extension leads](https://www.electricalsafetyfirst.org.uk/guidance/safety-around-the-home/overloading-sockets/)
- [London Fire Brigade — don't overload sockets](https://www.london-fire.gov.uk/safety/the-home/electrical-safety/)
- BS 1363 — 13 A plugs, socket-outlets and extension leads for the UK.

## Jack

Jack is a little plug in the corner. Tap for a tip that fits what's on the lead, and Jack reacts to the load: a smile when there's room, a worried look when it's close, and a hand up when it's over. Everything Jack says is announced to a screen reader, and it holds still if you've asked for reduced motion.

## Run it

```
npm test        # the engine's tests (node --test, no dependencies)
```

Open `index.html` in a browser; there's no build step. The maths lives in `src/core.js` with no DOM, so the same file runs in the page and under the tests.

## Not a substitute for an electrician

Ampton is a guide for everyday appliances. It can't see your wiring. If a socket or plug feels hot, is scorched, or a breaker keeps tripping, stop using it and get it checked.
