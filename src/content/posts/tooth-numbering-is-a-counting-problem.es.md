---
title: "El modelo reconoce el diente. Lo que no sabe hacer es contar."
description: "Un Point Transformer numera el 93% de los dientes sólo con la geometría de la superficie. Casi todos los fallos son el mismo: el diente correcto con el número desplazado una posición."
pubDate: 2026-08-01
locale: es
slug: tooth-numbering-is-a-counting-problem
tags:
  - machine-learning
  - 3d
  - healthcare
motion: /blog/arm-for-a-leg.mp4
motionAlt: "Dos personajes de los Simpson se saludan: «¡Pero si es mi viejo amigo el señor McCraig, con una pierna por brazo y un brazo por pierna!»"
motionPoster: /blog/arm-for-a-leg.webp
---

Un escáner intraoral produce una malla 3D de la boca: unos 117.000 puntos por
arcada. El objetivo de este experimento era etiquetar cada punto con el diente al
que pertenece, en notación FDI, el sistema de dos dígitos donde el primero indica
el cuadrante de la boca y el segundo la posición del diente. Suena a problema
sencillo: la segmentación semántica de nubes de puntos es hoy un campo maduro,
con buenas arquitecturas y conjuntos de datos públicos. En mi caso monté un
[Point Transformer](https://github.com/pyg-team/pytorch_geometric/blob/master/examples/point_transformer_segmentation.py)
sobre Teeth3DS+ (300 pacientes, 600 arcadas) y esperaba que la parte interesante
fuera ajustar la métrica. Resultó ser otra cosa.

## Primer hallazgo: la geometría basta

La pregunta que quería responder no era «¿cuánto acierta?», sino una decisión de
arquitectura: ¿hace falta CBCT para numerar dientes? El CBCT, que no todo el mundo
conocerá, es un tipo de TAC dental, una versión moderna específica de boca y cara
que produce imágenes 3D con menos radiación que un TAC de hospital. La cuestión es
que integrarlo sale caro: exige registrar volumen y malla con precisión
submilimétrica, y disponer de las dos modalidades del mismo paciente.

El resultado: sólo con la geometría de la superficie, el modelo acierta el número
FDI en el 93% de los dientes. La característica que lo consigue son las normales,
el vector perpendicular a la superficie en cada punto. Tres números por vértice,
calculados en segundos, sin ningún coste de adquisición. Y algo aún más útil: el
modelo sin ninguna característica por punto se derrumba. Aprende el conjunto de
entrenamiento y no generaliza nada, porque sin un descriptor de la forma local se
agarra a la posición absoluta del punto dentro de la arcada, y cada boca tiene una
forma distinta.

## Segundo hallazgo: el fallo no es reconocer, es contar

<figure>
    <a href="/blog/fdi-neighbour-shift.webp">
        <img
            src="/blog/fdi-neighbour-shift.webp"
            alt="Cuatro nubes de puntos de arcadas dentales, cada diente en un color y etiquetado con su número FDI. En el par de arriba, etiqueta real a la izquierda y predicción a la derecha, un diente sale como 45 cuando era un 46; todos los demás dientes de la arcada coinciden. El par de abajo muestra una arcada sin ningún fallo."
            width="1217"
            height="1000"
            loading="lazy"
            decoding="async"
        />
    </a>
    <figcaption>
        Fila de arriba, la arcada que falla: etiqueta real a la izquierda,
        predicción a la derecha. El diente está encontrado y limpiamente
        delimitado, y sale como 45 cuando era un 46, con el resto de la arcada
        intacto. Fila de abajo, una arcada sin fallos.
    </figcaption>
</figure>

Aquí es donde el problema dejó de parecerse a lo que yo creía que era. Miré en
qué se equivocaba, y el error dominante no era aleatorio. Entre el 62% y el 83%
de los fallos son el diente de al lado (un 46 etiquetado como 45), y no es un
borde mal trazado: es el diente entero, correctamente detectado y correctamente
delimitado, con el número desplazado una posición. El resto de la arcada,
perfecto.

La razón estaba en la notación: FDI es ordinal y, como decía al principio, el
segundo dígito es cuántas posiciones has contado desde la línea media: 1 el
incisivo central, 2 el lateral, 3 el canino, y así. Para decir «esto es un 46»
hay que saber en qué cuadrante estás y que es el sexto contando desde el centro.
Eso es contar, y contar exige ver la secuencia entera. Pero el modelo mira
vecindarios locales, que es precisamente lo que le permite generalizar entre
pacientes. El problema es que un primer molar y un segundo molar son casi
idénticos de forma, así que localmente no hay nada que distinga un 46 de un 47.
De modo que el modelo infiere el ordinal de una estimación difusa de «por dónde
voy en la arcada». Si esa estimación se desplaza un hueco, el número se desplaza
un hueco.

Lo que confirma la hipótesis: el error empeora con dientes ausentes (0,86 frente
a 0,98 en denticiones completas). Si falta un diente, la referencia de conteo se
rompe, y un escaneo intraoral no puede ver un diente ausente, ni uno incluido sin
erupcionar; sólo capta la superficie visible en la boca. Así que hace falta
contexto global de la arcada, y eso tiene que venir de otra fuente: una
radiografía panorámica, el CBCT o el propio informe clínico. El modelo sabe qué
es cada diente, pero falla en dónde encaja dentro de la secuencia.

## Tercer hallazgo: el incómodo

Pasé varias semanas sacando conclusiones de ejecuciones sueltas. Entrenar, medir,
anotar el resultado, seguir. Pero cuando lo pasé todo a tres semillas con media y
desviación típica, descubrí que la varianza entre ejecuciones era del mismo orden
que los efectos que estaba midiendo. No es que los números se movieran un poco:
cambiaba el signo. Una técnica que yo había documentado como una mejora
supuestamente modesta pero consistente dio, en cinco ejecuciones del mismo código,
deltas de +0,034, −0,048, −0,035, +0,017 y −0,116. No eran resultados
contradictorios: eran muestras de una distribución centrada en cero, lo que
significa que yo había estado describiendo ruido.

Y tras varias rondas salió otra cosa: el entrenamiento ni siquiera es fiable. Una
semilla produjo un modelo que nunca aprendió a distinguir maxilar superior de
inferior: acertaba el 79% arriba y el 19% abajo, mapeando sistemáticamente los
dientes inferiores sobre códigos superiores. Ese modelo habría pasado
desapercibido si sólo hubiera mirado la métrica global de una única pasada.

La conclusión que saco de todo esto se podría resumir así: un resultado negativo
bien medido vale más que uno positivo mal medido; saber que una técnica no ayuda
a esta escala ahorra el tiempo de construir encima de ella. Antes de optimizar,
conviene entender la estructura del error. El 93% era el número presentable. El
hallazgo útil fue que los fallos son sistemáticos y de un solo tipo, porque eso
te dice exactamente dónde poner la revisión humana: la región molar y las bocas
con dientes ausentes.

---

> Experimento sobre [Teeth3DS+](https://arxiv.org/abs/2210.06094). Esto no es un
> resultado clínico: es una prueba técnica sobre un conjunto de datos y un tipo de
> escáner, y sirve para decidir arquitectura, no para diagnosticar. Este
> experimento forma parte de un ejercicio propuesto por Matías Molinas, dentro del
> proyecto Agentic-Smart-Health de ANFAIA, en colaboración con Histora.
