---
title: "The model recognizes the tooth. What it can't do is count."
description: "A Point Transformer numbers 93% of teeth from surface geometry alone. Almost every failure is the same one: the right tooth with the number shifted by one position."
pubDate: 2026-08-01
locale: en
slug: tooth-numbering-is-a-counting-problem
tags:
  - machine-learning
  - 3d
  - healthcare
---

An intraoral scanner produces a 3D mesh of the mouth: roughly 117,000 points per
arch. The goal of this experiment was to label every point with the tooth it
belongs to, in FDI notation, the two-digit system where the first digit indicates
the quadrant of the mouth and the second the position of the tooth. It sounds
like a simple problem: point cloud semantic segmentation is a mature field these
days, with good architectures and public datasets. In my case I set up a
[Point Transformer](https://github.com/pyg-team/pytorch_geometric/blob/master/examples/point_transformer_segmentation.py)
on Teeth3DS+ (300 patients, 600 arches) and expected the interesting part to be
tuning the metric. It turned out to be something else.

## First finding: geometry is enough

The question I wanted to answer wasn't "how accurate is it?", but an architecture
decision: do we need CBCT to number teeth? CBCT, which not everyone will know, is
a type of dental CT scan, a modern version specific to the mouth and face that
produces 3D images with less radiation than a standard hospital CT. The thing is
that integrating it is expensive: it requires registering volume and mesh with
sub-millimeter precision, and having both modalities from the same patient.

The result: with surface geometry alone, the model gets the FDI number right for
93% of teeth. The feature that achieves this is the normals, the vector
perpendicular to the surface at each point. Three numbers per vertex, computed in
seconds, at no acquisition cost. And something even more useful: the model
without any per-point feature collapses. It learns the training set and
generalizes nothing, because without a descriptor of the local shape it latches
onto the absolute position of the point within the arch, and every mouth has a
different shape.

## Second finding: the failure isn't recognizing, it's counting

<figure>
    <a href="/blog/fdi-neighbour-shift.webp">
        <img
            src="/blog/fdi-neighbour-shift.webp"
            alt="Four point clouds of dental arches, each tooth in its own colour and labelled with its FDI number. In the top pair, ground truth on the left and prediction on the right, one tooth comes back as 45 when it was a 46; every other tooth in the arch matches. The bottom pair shows an arch with no failures."
            width="1217"
            height="1000"
            loading="lazy"
            decoding="async"
        />
    </a>
    <figcaption>
        Top row, the arch that fails: ground truth on the left, prediction on the
        right. The tooth is found and cleanly delimited, and it comes back as 45
        when it was a 46, with the rest of the arch untouched. Bottom row, an arch
        with no failures. The labels are in Spanish: <em>con fallo</em> / <em>sin
        fallos</em> are with and without a failure, <em>etiqueta real</em> is the
        ground truth and <em>predicción</em> the prediction.
    </figcaption>
</figure>

This is where the problem stopped resembling what I thought it was. I looked at
what it was getting wrong, and the dominant error wasn't random. 62–83% of the
failures are the tooth next door (a 46 labeled as a 45), and it isn't a badly
drawn boundary, it's the whole tooth, correctly detected and correctly
delimited, with the number shifted by one position. The rest of the arch,
perfect.

The reason was in the notation: FDI is ordinal, and as I mentioned at the start,
the second digit is how many positions you've counted from the midline: 1 the
central incisor, 2 the lateral, 3 the canine, and so on. To say "this is a 46"
you have to know which quadrant you're in and that it's the sixth counting from
the center. That is counting, and counting requires seeing the whole sequence.
But the model looks at local neighborhoods, precisely what allows it to
generalize across patients. The problem is that a first molar and a second molar
are almost identical in shape, so locally there's nothing to distinguish a 46
from a 47. So the model infers the ordinal from a fuzzy estimate of "how far
along the arch am I". If that estimate shifts by one slot, the number shifts by
one slot.

What confirms the hypothesis: the error gets worse with missing teeth (0.86
versus 0.98 in complete dentitions). If a tooth is missing, the counting
reference breaks — and an intraoral scan cannot see a missing tooth, nor an
impacted, unerupted one; it only captures the surface visible in the mouth. So
what's needed is global context of the arch, and that has to come from another
source: a panoramic radiograph, the CBCT, or the clinical report itself. The
model knows what each tooth is, but fails at where it sits in the sequence.

## Third finding: the uncomfortable one

I spent several weeks drawing conclusions from single runs. Train, measure, note
the result, move on. But when I switched everything to three seeds with mean and
standard deviation, I discovered that the variance between runs was of the same
order as the effects I was measuring. It wasn't that the numbers moved a little,
the sign changed. A technique I had documented as a supposedly modest but
consistent improvement gave, across five runs of the same code, deltas of +0.034,
−0.048, −0.035, +0.017 and −0.116. These weren't conflicting results; they were
samples from a distribution centered on zero, which means I had been describing
noise.

And after several rounds something else surfaced: the training isn't even
reliable. One seed produced a model that never learned to tell upper jaw from
lower: it got 79% right on top and 19% on the bottom, systematically mapping the
lower teeth onto upper codes. That model would have gone unnoticed if I had only
looked at the global metric from a single pass.

The conclusion I take from all this could be summed up as: a well-measured
negative result is worth more than a badly measured positive one, knowing that a
technique doesn't help at this scale saves the time of building on top of it.
Before optimizing, it's worth understanding the structure of the error. The 93%
was the presentable number. The useful finding was that the failures are
systematic and of a single type, because that tells you exactly where to put the
human review: the molar region and mouths with missing teeth.

---

> Experiment on [Teeth3DS+](https://arxiv.org/abs/2210.06094). This is not a
> clinical result: it's a technical spike on one dataset and one type of scanner,
> and it serves to decide architecture, not to diagnose. This experiment is part
> of an exercise proposed by Matías Molinas, within ANFAIA's Agentic-Smart-Health
> project, in collaboration with Histora.
