---
title: "Chronicle of an ANFAIA Summer Grant, 2026"
description: "Two months building a data format for dentistry with ANFAIA and HISTORA. If you ask me what I'm taking away, the answer isn't the repository: it's the people who reviewed it."
pubDate: 2026-09-12
locale: en
slug: anfaia-summer-grant-2026
tags:
  - healthcare
  - community
---

I spent July and August of 2026 on an ANFAIA Summer Grant, building a data
format for dentistry together with HISTORA. If you ask me what I'm taking away,
the answer isn't the repository. It's the people who reviewed it for me.

I'm writing this because when I was looking for information about these grants I
found what you usually find: the call, the projects, the stipend. Nothing about
what actually happens over those two months. And what actually happens is quite a
bit better than what the call says.

## The project, briefly

A dental case arrives in pieces. After a single imaging visit, a clinic has a
couple of STL files from the intraoral scanner, several hundred DICOM slices from
the CBCT, some clinical photographs and a PDF report. Four artefacts, four
programs, four coordinate systems, and not one machine-readable statement of how
they relate to each other.

The relationships aren't missing: someone established them. Someone looked at the
CBCT next to the scan and knew which surface was which. But that knowledge lives
inside a person or inside a vendor's software, and **it doesn't travel with the
data**. My job was to build a container that forces them to be written down: what
was measured, what a model inferred, with what error, and who verified it.

And that's it. It isn't the interesting part of this article.

## How I applied

I found out late, and second-hand.

The call was presented at an event at my university that I couldn't get to.
I heard about it from some classmates who had been there: they told me.
So my first contact with these grants wasn't a poster or an institutional
email, it was a corridor conversation.

Then I spent longer turning it over than I should have. The usual: whether the
profile fit, whether the projects would get away from me, whether there would be
better-prepared people. I sent the application on the last day of the window, and
I came close to not sending it. If you've read this far and you're at exactly that
point, that's more or less why I'm writing this.

You propose a topic in the application. Mine wasn't taken. I was the only one in
the cohort whose proposed project wasn't accepted: everyone else's went ahead.
What they did with me was hand me one and set me working on it from scratch.

I had every reason to read that as a consolation prize, and it would have been a
mistake. What they select isn't the project: it's the person. Once I was in,
nobody brought up again that the topic wasn't mine, and the one they gave me came
with something I could never have got for myself: a real problem, an industrial
partner behind it, and people who had spent years on that problem with the
judgement to tell me where I was getting it wrong.

From those two months I'm taking away more than I would have taken from the
project I proposed myself.

So if you send in an idea and it isn't the one that ends up happening, that is
not a no. It happened to me, and I'm writing this from the good side of it.

## I arrived not knowing how to do any of this

Worth saying without dressing it up. I had never built a real multi-agent system.
I had never written a format specification. I had never touched Gaussian
Splatting, or DICOM, or FHIR, or the stack of standards that surrounds a piece of
clinical data. I knew how to program (I think); I knew nothing about almost
everything else.

The first month was learning by mistake, and specific mistakes teach more than
the moral does. My first version of the appearance field produced a shell with
**invented colour**: it looked great and it was exactly the opposite of what the
project needed. Later I trained a more accurate classifier to crop the bone below
the apex of the teeth; **it won on the benchmark and lost on the real task**, and
the defect that had led me to train it was still there. The lesson wasn't "I need
a better model": it was that I had chosen the wrong metric.

What cost me the most to learn wasn't any particular technology, but a way of
working. Working seriously with agents moves the bottleneck: it's no longer
writing the code, it's **knowing what to ask for and how to check that what comes
back is true**. An agent hands you something that compiles, that looks good and
that is wrong, and if you don't have a criterion fixed *before* you look at it,
you accept it.

## The talks, which are half the programme

This is what I didn't know when I applied, and it's what I recommend most.

Over the summer there's a series of talks running alongside the projects, and
they're **open**: they aren't an internal activity for grant holders, anyone can
walk in. They stay up on ANFAIA's YouTube channel, so they're the part of the
programme anyone can attend without holding a grant. And not all of them are
technical, which is exactly what makes them worth it: there are people telling you
how they got to where they are, including the parts that didn't work out.

Week after week someone came in from a different world: technical profiles very
different from one another, and also people whose work looked nothing like mine or
anyone else's. On paper there was no common thread. I didn't miss a single one,
and there wasn't one I came away from thinking I'd wasted the hour.

The common thread turned up on its own, and it wasn't in the topics: every one of
them, at some point, had had to make a hard decision. Leaving to study or work
elsewhere because what they were looking for wasn't here. Fighting for one
particular post for years. Not one of them told a clean trajectory, and all of
them told it without dramatising it, like someone explaining a decision they made
and why.

That opened something up for me. It's not that I saw leaving as a failure — I had
never thought about it in those terms — it's that it simply wasn't an idea I had
in mind. I hadn't ruled it out: I hadn't considered it. Hearing people for whom
that was a real decision, taken for their own reasons and with what it cost them,
put it on the table as something I might have to think about at some point too. I
haven't decided anything. But now it's an option that exists, and before this
summer it wasn't.

No tutorial is any use for that. What is useful is someone who has already lived
it telling you first-hand, and that's what these talks do.

## The help I got

Here's what I'm really taking away.

**The support**. Isma and Matías were my mentors throughout the work, and
"throughout" is literal: it wasn't a kick-off meeting and a closing one, it was
being there while the project went wrong and got put right. Isma opened the door
to this kind of work being done in Galicia and proposed himself — together with
HISTORA — the idea the project started from. And Matías was side by side on all
of it: not just reviewing what I wrote, but inside every idea and every
experiment we put forward — contributing his own, arguing with mine and asking
what needed asking before spending a week on something. Learning to work that
way, and to be held to that standard, has served me as much as what I learned
about the subject.

**The clinicians.** Dr Pedro Manuel Guitián Lema and Dr Elena López Alvar gave
their time to explain to me what a dentist actually needs to measure and — just
as usefully — how much a good-looking number is worth when nobody can say how it
was obtained. Without that I'd have built something technically correct and
clinically irrelevant.

## What comes next

The work continues with HISTORA, and that's not me saying it: they've written about it on their own blog (https://www.histora.com/es/blog/uos-unified-oral-scene-luis-garbayo-anfaia-histora). That a company writes about what an intern did once the summer is over is, to me, the best sign that the summer was worth something.

There are things left open, and some of them aren't mine to close. But the project is still alive in September, which is exactly what I wanted to happen.

## Apply

If you're reading this and you're thinking about it: apply.

What ANFAIA offers isn't two paid months. It's a real project with a real
industrial partner, a mentor who reviews your work with real judgement, a series
of talks attended by people who have already walked the path, and the obligation
to publish all of it in the open, which is what forces it to be good. I arrived
not knowing how to do almost anything I ended up doing.

Ismael and Mariel, with the mentors, have built something uncommon: a place where
someone starting out can do serious work, get it wrong in public, and have
someone with twenty-five years in the trade sit down and tell them where. If
you're starting out in this in Galicia, there aren't many doors like it. This one
is open.

---

The project has a page where you can see it running:
agentic-smart-health.lgarbayo.com (https://agentic-smart-health.lgarbayo.com/).
*The code and the documentation are at
[github.com/ANFAIA/Agentic-Smart-Health](https://github.com/ANFAIA/Agentic-Smart-Health),
under the Apache 2.0 licence.*
