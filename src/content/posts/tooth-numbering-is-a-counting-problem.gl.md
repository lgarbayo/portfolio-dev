---
title: "O modelo recoñece o dente. O que non sabe facer é contar."
description: "Un Point Transformer numera o 93% dos dentes só coa xeometría da superficie. Case todos os fallos son o mesmo: o dente correcto co número desprazado unha posición."
pubDate: 2026-08-01
locale: gl
slug: tooth-numbering-is-a-counting-problem
tags:
  - machine-learning
  - 3d
  - healthcare
motion: /blog/arm-for-a-leg.mp4
motionAlt: "Dous personaxes dos Simpson saúdanse: «Pero se é o meu vello amigo o señor McCraig, cunha perna por brazo e un brazo por perna!»"
motionPoster: /blog/arm-for-a-leg.webp
---

Un escáner intraoral produce unha malla 3D da boca: uns 117.000 puntos por
arcada. O obxectivo deste experimento era etiquetar cada punto co dente ao que
pertence, en notación FDI, o sistema de dous díxitos onde o primeiro indica o
cuadrante da boca e o segundo a posición do dente. Soa a problema sinxelo: a
segmentación semántica de nubes de puntos é hoxe un campo maduro, con boas
arquitecturas e conxuntos de datos públicos. No meu caso montei un
[Point Transformer](https://github.com/pyg-team/pytorch_geometric/blob/master/examples/point_transformer_segmentation.py)
sobre Teeth3DS+ (300 pacientes, 600 arcadas) e agardaba que a parte interesante
fose axustar a métrica. Resultou ser outra cousa.

## Primeiro achado: a xeometría abonda

A pregunta que quería responder non era «canto acerta?», senón unha decisión de
arquitectura: fai falta CBCT para numerar dentes? O CBCT, que non todo o mundo
coñecerá, é un tipo de TAC dental, unha versión moderna específica de boca e cara
que produce imaxes 3D con menos radiación ca un TAC de hospital. A cuestión é que
integralo sae caro: esixe rexistrar volume e malla con precisión submilimétrica,
e dispor das dúas modalidades do mesmo paciente.

O resultado: só coa xeometría da superficie, o modelo acerta o número FDI no 93%
dos dentes. A característica que o consegue son as normais, o vector
perpendicular á superficie en cada punto. Tres números por vértice, calculados en
segundos, sen ningún custo de adquisición. E algo aínda máis útil: o modelo sen
ningunha característica por punto derrúbase. Aprende o conxunto de adestramento e
non xeneraliza nada, porque sen un descritor da forma local agárrase á posición
absoluta do punto dentro da arcada, e cada boca ten unha forma distinta.

## Segundo achado: o fallo non é recoñecer, é contar

<figure>
    <a href="/blog/fdi-neighbour-shift.webp">
        <img
            src="/blog/fdi-neighbour-shift.webp"
            alt="Catro nubes de puntos de arcadas dentais, cada dente nunha cor e etiquetado co seu número FDI. No par de arriba, etiqueta real á esquerda e predición á dereita, un dente sae como 45 cando era un 46; todos os demais dentes da arcada coinciden. O par de abaixo amosa unha arcada sen ningún fallo."
            width="1217"
            height="1000"
            loading="lazy"
            decoding="async"
        />
    </a>
    <figcaption>
        Fila de arriba, a arcada que falla: etiqueta real á esquerda, predición á
        dereita. O dente está atopado e limpamente delimitado, e sae como 45 cando
        era un 46, co resto da arcada intacto. Fila de abaixo, unha arcada sen
        fallos. As etiquetas están en castelán: <em>con fallo</em> e <em>sin
        fallos</em> son con e sen fallo, <em>etiqueta real</em> é a etiqueta real
        e <em>predicción</em> a predición.
    </figcaption>
</figure>

Aquí é onde o problema deixou de parecerse ao que eu cría que era. Mirei en que
se equivocaba, e o erro dominante non era aleatorio. Entre o 62% e o 83% dos
fallos son o dente veciño (un 46 etiquetado como 45), e non é un bordo mal
trazado: é o dente enteiro, correctamente detectado e correctamente delimitado,
co número desprazado unha posición. O resto da arcada, perfecto.

A razón estaba na notación: FDI é ordinal e, como dicía ao principio, o segundo
díxito é cantas posicións contaches desde a liña media: 1 o incisivo central, 2 o
lateral, 3 o canino, e así. Para dicir «isto é un 46» hai que saber en que
cuadrante estás e que é o sexto contando desde o centro. Iso é contar, e contar
esixe ver a secuencia enteira. Pero o modelo mira veciñanzas locais, que é
precisamente o que lle permite xeneralizar entre pacientes. O problema é que un
primeiro molar e un segundo molar son case idénticos de forma, así que
localmente non hai nada que distinga un 46 dun 47. De modo que o modelo infire o
ordinal dunha estimación difusa de «por onde vou na arcada». Se esa estimación se
despraza un oco, o número desprázase un oco.

O que confirma a hipótese: o erro empeora con dentes ausentes (0,86 fronte a 0,98
en denticións completas). Se falta un dente, a referencia de conteo rómpese, e un
escaneo intraoral non pode ver un dente ausente, nin un incluído sen erupcionar;
só capta a superficie visible na boca. Así que fai falta contexto global da
arcada, e iso ten que vir doutra fonte: unha radiografía panorámica, o CBCT ou o
propio informe clínico. O modelo sabe que é cada dente, pero falla ao situalo
dentro da secuencia.

## Terceiro achado: o incómodo

Pasei varias semanas sacando conclusións de execucións soltas. Adestrar, medir,
anotar o resultado, seguir. Pero cando o pasei todo a tres sementes con media e
desviación típica, descubrín que a varianza entre execucións era da mesma orde ca
os efectos que estaba a medir. Non é que os números se movesen un pouco: cambiaba
o signo. Unha técnica que eu documentara como unha mellora supostamente modesta
pero consistente deu, en cinco execucións do mesmo código, deltas de +0,034,
−0,048, −0,035, +0,017 e −0,116. Non eran resultados contraditorios: eran mostras
dunha distribución centrada en cero, o que significa que eu estivera describindo
ruído.

E tras varias roldas saíu outra cousa: o adestramento nin sequera é fiable. Unha
semente produciu un modelo que nunca aprendeu a distinguir maxilar superior de
inferior: acertaba o 79% arriba e o 19% abaixo, mapeando sistematicamente os
dentes inferiores sobre códigos superiores. Ese modelo pasaríame desapercibido se
só mirase a métrica global dunha única pasada.

A conclusión que saco de todo isto podería resumirse así: un resultado negativo
ben medido vale máis ca un positivo mal medido; saber que unha técnica non axuda
a esta escala aforra o tempo de construír enriba dela. Antes de optimizar, convén
entender a estrutura do erro. O 93% era o número presentable. O achado útil foi
que os fallos son sistemáticos e dun só tipo, porque iso indica exactamente
onde poñer a revisión humana: a rexión molar e as bocas con dentes ausentes.

---

> Experimento sobre [Teeth3DS+](https://arxiv.org/abs/2210.06094). Isto non é un
> resultado clínico: é unha proba técnica sobre un conxunto de datos e un tipo de
> escáner, e serve para decidir arquitectura, non para diagnosticar. Este
> experimento forma parte dun exercicio proposto por Matías Molinas, dentro do
> proxecto Agentic-Smart-Health de ANFAIA, en colaboración con Histora.
