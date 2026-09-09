---
title: "Escaneamos la misma boca dos veces, con minutos de diferencia. El software informó de un movimiento dental de 2 mm."
description: "Entre los dos escaneos no se había movido nada, así que cada milímetro que daba el sistema era ruido. Medir primero el ruido es lo que convierte una cifra de desplazamiento en algo sobre lo que actuar."
pubDate: 2026-08-18
locale: es
slug: tooth-movement-needs-a-null-control
tags:
  - 3d
  - healthcare
  - measurement
motion: /blog/grandpa-dentures.mp4
motionAlt: "El abuelo Simpson persigue renqueando por el bosque a una tortuga que se marcha con su dentadura postiza: «Vuelve aquí. Más despacio. Te voy a pillar»."
motionPoster: /blog/grandpa-dentures.webp
cover: /blog/arch-fdi-segmentation.webp
coverAlt: "Escaneo 3D de una arcada inferior, con cada diente segmentado en un color y etiquetado con su código FDI, y la encía en rosa."
---

No se había movido nada. Mismo paciente, misma cita, mismo escáner, dos capturas
consecutivas. Entre una y otra no cambió ninguna biología. No se retiró sarro.
Cualquier desplazamiento medido sobre ese par es falso por construcción: es ruido
de medición puro.

La superposición estándar de arcada completa informó de una mediana de 1,36 mm,
con un diente en 2,03 mm. Dos milímetros no son un error de redondeo. Son el
orden de un desplazamiento que llevaría a un clínico a actuar.

## Por qué pasa esto

Los escáneres intraorales son excelentes: resuelven la geometría de la superficie
muy por debajo de la décima de milímetro. Así que comparar dos escaneos separados
en el tiempo parece que debería funcionar sin más. El problema no es el escáner.
Es que en un escaneo intraoral no hay nada fijo.

En un CBCT tienes la base craneal: una estructura que no se mueve y contra la que
se mide todo lo demás. Un escaneo intraoral no tiene equivalente. Cualquier diente
del campo puede moverse, y la encía cambia de forma entre visitas por inflamación,
por recesión o simplemente porque se han retirado depósitos.

Así que el desplazamiento sólo puede expresarse respecto al resto de la arcada, y
cómo definas «el resto de la arcada» cambia la respuesta. El enfoque convencional
registra la arcada entera y mide cada diente contra ese ajuste. En el resultado
fallan dos cosas:

- El diente está dentro de su propia referencia. Si se mueve, arrastra el marco
  con él: se infravalora a sí mismo y sobrevalora a sus vecinos.
- La encía también está en la referencia. El movimiento del tejido blando entra
  directo en el marco contra el que se mide todo.

## Un cambio pequeño con un efecto grande

Para medir un diente concreto, construye el marco de referencia con todos los
demás dientes etiquetados, y excluye la encía por completo. Probamos los dos
marcos con dos ajustes de registro, para ver cuánto dependía cada uno de un
hiperparámetro que nadie reporta:

- Referencia de arcada completa: el desplazamiento mediano oscila entre 0,17 y
  0,74 mm, un factor de 4,3
- Referencia sin el propio diente: entre 0,16 y 0,18 mm, un factor de 1,2

El diente más afectado se mueve 0,70 mm con el marco convencional sólo por
cambiar ese ajuste. Con la referencia sin el propio diente, 0,11 mm: por debajo
del residuo de la propia medición.

Pero la estabilidad no es lo importante. Lo importante es el control nulo. Aquí
está la parte que defendería como más relevante, y cuesta casi nada: escanea al
paciente dos veces en la misma visita. Entre esos dos escaneos no puede haber
cambiado nada. Así que lo que informe el método es ruido, y ya tienes tu umbral
de ruido. Para este escáner y este protocolo, ese umbral está en torno a 0,4 mm.
Por debajo, no decimos que un diente se haya movido.

<figure>
    <a href="/blog/null-control-displacement.webp">
        <img
            src="/blog/null-control-displacement.webp"
            alt="Dos gráficas. A la izquierda, las distribuciones de desplazamiento del control nulo y del par real previo/posterior se solapan casi por completo, ambas por debajo del umbral de 0,388 mm dibujado como una línea roja discontinua. A la derecha, una barra por diente para los catorce dientes presentes en ambos escaneos: sólo los dos últimos molares superan ese umbral."
            width="744"
            height="261"
            loading="lazy"
            decoding="async"
        />
    </a>
    <figcaption>
        Desplazamiento por diente medido contra una referencia que excluye el
        propio diente. Izquierda: el control nulo —dos escaneos de la misma boca,
        misma visita (gris)— frente al par real previo/posterior (naranja). Las
        distribuciones se solapan: ningún diente se movió de forma detectable.
        Derecha: la misma comparación diente a diente, sobre los catorce dientes
        presentes en ambos escaneos, con el umbral dibujado como línea
        discontinua.
    </figcaption>
</figure>

Una cosa que conviene decir claramente: con el ajuste más estricto, el marco
convencional es de hecho mejor (0,30 frente a 0,39 mm). No pierde en todas
partes. Lo que lo descalifica es que su rendimiento depende de un valor que no
puedes conocer de antemano. El marco sin el propio diente gana por no depender
del ajuste, que es lo que permite citar un umbral siquiera.

Y una trampa en la que caímos primero: un par antes/después de higiene no es un
control nulo. La higiene no mueve los dientes, pero retira sarro, así que la
superficie cambia de verdad y el registro informa correctamente de una
diferencia.

## Lo que yo me llevaría

Ahora mismo, una cifra de desplazamiento sacada de escaneos intraorales es
ininterpretable sin dos cosas que casi nunca se reportan: qué marco de referencia
la produjo, y qué informa ese marco al repetir el escaneo de una boca que no ha
cambiado.

La segunda son unos minutos de sillón. Convierte cada comparación posterior de
una afirmación sin límites en una acotada por un límite de detección declarado.
Sin eso, estás publicando un número sin saber si significa algo.

## Salvedades, dichas por delante

Esto es un paciente: una prueba de concepto del método, no un estudio clínico. El
valor de 0,4 mm pertenece a esta arcada. Lo que generaliza es el procedimiento
para encontrar el tuyo.

Tampoco podemos hablar de sensibilidad: el control nulo te dice qué informa el
método cuando el desplazamiento es cero, no si un movimiento real de 0,5 mm se
recuperaría con precisión. Eso es otro experimento.

---

> Parte de un trabajo en curso sobre gemelos digitales dentales. Encantado de
> compartir la metodología con más detalle: el documento completo incluye el
> proceso de registro y tres resultados negativos que no entraron en esta
> entrada.
