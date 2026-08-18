---
title: "We scanned the same mouth twice, minutes apart. The software reported a 2 mm tooth movement."
description: "Nothing had moved between the two scans, so every millimetre the pipeline reported was noise. Measuring the noise first is what turns a displacement figure into something you can act on."
pubDate: 2026-08-18
locale: en
slug: tooth-movement-needs-a-null-control
tags:
  - 3d
  - healthcare
  - measurement
motion: /blog/grandpa-dentures.mp4
motionAlt: "Grandpa Simpson shuffles through the woods after a turtle that is walking off with his dentures: 'Come back here, you. Slow down. I'll get you.'"
motionPoster: /blog/grandpa-dentures.webp
cover: /blog/arch-fdi-segmentation.webp
coverAlt: "A 3D scan of a lower dental arch, each tooth segmented in its own colour and labelled with its FDI code, with the gingiva left in pink."
canonicalUrl: https://www.linkedin.com/pulse/we-scanned-same-mouth-twice-minutes-apart-software-reported-garbayo-wbj2e/
---

Nothing had moved. Same patient, same appointment, same scanner, two consecutive
acquisitions. No biology changed between them. No calculus was removed. Any
displacement measured from that pair is false by construction — it's pure
measurement noise.

The standard whole-arch superimposition reported a median of 1.36 mm, with one
tooth at 2.03 mm. Two millimetres isn't a rounding error. It's the order of a
displacement that would make a clinician act.

## Why this happens

Intraoral scanners are excellent — they resolve surface geometry well under a
tenth of a millimetre. So comparing two scans over time feels like it should just
work. The problem isn't the scanner. It's that an intraoral scan contains nothing
fixed.

In a CBCT you have the cranial base: a structure that doesn't move, against which
everything else is measured. An intraoral scan has no equivalent. Every tooth in
the field can move, and the gingiva changes shape between visits through
inflammation, recession, or simply having deposits removed.

So displacement can only be expressed relative to the rest of the arch — and how
you define "the rest of the arch" changes the answer. The conventional approach
registers the whole arch and measures each tooth against that fit. Two things go
wrong in the output:

- The tooth sits inside its own reference. If it moves, it drags the frame with
  it — under-reporting itself and over-reporting its neighbours.
- The gingiva is in the reference too. Soft tissue motion goes straight into the
  frame everything is measured against.

## A small change with a large effect

To measure a given tooth, fit the reference frame from every other labelled
tooth, and exclude gingiva entirely. We tested both frames at two registration
settings, to see how much each depended on a hyperparameter nobody reports:

- Whole-arch reference: median displacement swings from 0.17 to 0.74 mm — a
  factor of 4.3
- Leave-one-out reference: 0.16 to 0.18 mm — a factor of 1.2

The worst-affected tooth moves by 0.70 mm under the conventional frame purely
from changing that setting. Under leave-one-out, 0.11 mm — below the
measurement's own residual.

But stability isn't the point. The null control is. Here's the part I'd argue
matters most, and it costs almost nothing: Scan the patient twice at the same
visit. Nothing can have changed between those two scans. So whatever the method
reports is noise — and now you know your noise threshold. For this scanner and
protocol, that threshold is about 0.4 mm. Below it, we don't say a tooth moved.

<figure>
    <a href="/blog/null-control-displacement.webp">
        <img
            src="/blog/null-control-displacement.webp"
            alt="Two charts. On the left, the displacement distributions of the null control and the real pre/post pair overlap almost entirely, both below the 0.388 mm threshold drawn as a dashed red line. On the right, a bar per tooth for the fourteen teeth present in both scans: only the last two molars rise above that threshold."
            width="744"
            height="261"
            loading="lazy"
            decoding="async"
        />
    </a>
    <figcaption>
        Per-tooth displacement measured against a leave-one-out reference. Left:
        the null control — two scans of the same mouth, same visit (grey) —
        against the real pre/post pair (orange). The distributions overlap: no
        tooth moved detectably. Right: the same comparison tooth by tooth, across
        the fourteen teeth present in both scans, with the threshold drawn as a
        dashed line. The labels are in Spanish: <em>control nulo</em> is the null control,
        <em>par real</em> the real pre/post pair, <em>desplazamiento relativo</em>
        the relative displacement and <em>umbral</em> the threshold.
    </figcaption>
</figure>

One thing worth stating plainly: at the tighter setting, the conventional frame
is actually better (0.30 vs 0.39 mm). It doesn't lose everywhere. What
disqualifies it is that its performance depends on a value you can't know in
advance. The leave-one-out frame wins by not depending on the setting — which is
what makes a threshold quotable at all.

And a trap we fell into first: a pre/post-hygiene pair is not a null control.
Hygiene doesn't move teeth, but it removes calculus, so the surface genuinely
changes and registration correctly reports a difference.

## What I'd take away

Right now, a displacement figure from intraoral scans is uninterpretable without
two things that are almost never reported: which reference frame produced it, and
what that frame reports on a repeat scan of an unchanged mouth.

The second one is a few minutes of chair time. It converts every subsequent
comparison from an unbounded claim into one bounded by a stated detection limit.
Without it, you're publishing a number without knowing whether it means anything.

## Caveats, stated up front

This is one patient — a proof of concept for the method, not a clinical study.
The 0.4 mm value belongs to this arch. What generalises is the procedure for
finding your own.

We also can't speak to sensitivity: the null control tells you what the method
reports when displacement is zero, not whether a real 0.5 mm movement would be
recovered accurately. That's a separate experiment.

---

> Part of ongoing work on dental digital twins. Happy to share the methodology in
> more detail — the full write-up includes the registration pipeline and three
> negative results that didn't make this post.
