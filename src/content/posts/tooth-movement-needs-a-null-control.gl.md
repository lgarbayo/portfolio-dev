---
title: "Escaneamos a mesma boca dúas veces, con minutos de diferenza. O software informou dun movemento dental de 2 mm."
description: "Entre os dous escaneos non se movera nada, así que cada milímetro que daba o sistema era ruído. Medir primeiro o ruído é o que converte unha cifra de desprazamento en algo sobre o que actuar."
pubDate: 2026-08-18
locale: gl
slug: tooth-movement-needs-a-null-control
tags:
  - 3d
  - healthcare
  - measurement
motion: /blog/grandpa-dentures.mp4
motionAlt: "O avó Simpson persegue coxeando polo bosque unha tartaruga que marcha coa súa dentadura postiza: «Volve aquí. Máis amodo. Vouche pillar»."
motionPoster: /blog/grandpa-dentures.webp
cover: /blog/arch-fdi-segmentation.webp
coverAlt: "Escaneo 3D dunha arcada inferior, con cada dente segmentado nunha cor e etiquetado co seu código FDI, e a enxiva en rosa."
---

Non se movera nada. Mesmo paciente, mesma cita, mesmo escáner, dúas capturas
consecutivas. Entre unha e outra non cambiou ningunha bioloxía. Non se retirou
sarro. Calquera desprazamento medido sobre ese par é falso por construción: é
ruído de medición puro.

A superposición estándar de arcada completa informou dunha mediana de 1,36 mm,
cun dente en 2,03 mm. Dous milímetros non son un erro de redondeo. Son a orde
dun desprazamento que levaría un clínico a actuar.

## Por que pasa isto

Os escáneres intraorais son excelentes: resolven a xeometría da superficie moi
por debaixo da décima de milímetro. Así que comparar dous escaneos separados no
tempo parece que debería funcionar sen máis. O problema non é o escáner. É que
nun escaneo intraoral non hai nada fixo.

Nun CBCT tes a base cranial: unha estrutura que non se move e contra a que se
mide todo o demais. Un escaneo intraoral non ten equivalente. Calquera dente do
campo pode moverse, e a enxiva cambia de forma entre visitas por inflamación,
por recesión ou simplemente porque se retiraron depósitos.

Así que o desprazamento só pode expresarse respecto ao resto da arcada, e como
definas «o resto da arcada» cambia a resposta. O enfoque convencional rexistra a
arcada enteira e mide cada dente contra ese axuste. No resultado fallan dúas
cousas:

- O dente está dentro da súa propia referencia. Se se move, arrastra o marco con
  el: infravalórase a si mesmo e sobrevalora os seus veciños.
- A enxiva tamén está na referencia. O movemento do tecido brando entra directo
  no marco contra o que se mide todo.

## Un cambio pequeno cun efecto grande

Para medir un dente concreto, constrúe o marco de referencia con todos os demais
dentes etiquetados, e exclúe a enxiva por completo. Probamos os dous marcos con
dous axustes de rexistro, para ver canto dependía cada un dun hiperparámetro que
ninguén reporta:

- Referencia de arcada completa: o desprazamento mediano oscila entre 0,17 e
  0,74 mm, un factor de 4,3
- Referencia sen o propio dente: entre 0,16 e 0,18 mm, un factor de 1,2

O dente máis afectado móvese 0,70 mm co marco convencional só por cambiar ese
axuste. Coa referencia sen o propio dente, 0,11 mm: por debaixo do residuo da
propia medición.

Pero a estabilidade non é o importante. O importante é o control nulo. Aquí está
a parte que defendería como máis relevante, e custa case nada: escanea o paciente
dúas veces na mesma visita. Entre eses dous escaneos non pode ter cambiado nada.
Así que o que informe o método é ruído, e xa tes o teu limiar de ruído. Para este
escáner e este protocolo, ese limiar está arredor de 0,4 mm. Por debaixo, non
dicimos que un dente se movese.

<figure>
    <a href="/blog/null-control-displacement.webp">
        <img
            src="/blog/null-control-displacement.webp"
            alt="Dúas gráficas. Á esquerda, as distribucións de desprazamento do control nulo e do par real previo/posterior superpóñense case por completo, ambas por debaixo do limiar de 0,388 mm debuxado como unha liña vermella descontinua. Á dereita, unha barra por dente para os catorce dentes presentes en ambos os escaneos: só os dous últimos molares superan ese limiar."
            width="744"
            height="261"
            loading="lazy"
            decoding="async"
        />
    </a>
    <figcaption>
        Desprazamento por dente medido contra unha referencia que exclúe o propio
        dente. Esquerda: o control nulo —dous escaneos da mesma boca, mesma visita
        (gris)— fronte ao par real previo/posterior (laranxa). As distribucións
        superpóñense: ningún dente se moveu de forma detectable. Dereita: a mesma
        comparación dente a dente, sobre os catorce dentes presentes en ambos os
        escaneos, co limiar debuxado como liña descontinua. As etiquetas están en
        castelán: <em>desplazamiento relativo</em> é o desprazamento relativo e
        <em>umbral</em> o limiar.
    </figcaption>
</figure>

Unha cousa que convén dicir claramente: co axuste máis estrito, o marco
convencional é de feito mellor (0,30 fronte a 0,39 mm). Non perde en todas
partes. O que o descualifica é que o seu rendemento depende dun valor que non
podes coñecer de antemán. O marco sen o propio dente gaña por non depender do
axuste, que é o que permite citar un limiar sequera.

E unha trampa na que caemos primeiro: un par antes/despois de hixiene non é un
control nulo. A hixiene non move os dentes, pero retira sarro, así que a
superficie cambia de verdade e o rexistro informa correctamente dunha diferenza.

## O que eu me levaría

Agora mesmo, unha cifra de desprazamento sacada de escaneos intraorais é
ininterpretable sen dúas cousas que case nunca se reportan: que marco de
referencia a produciu, e que informa ese marco ao repetir o escaneo dunha boca
que non cambiou.

A segunda son uns minutos na cadeira. Converte cada comparación posterior dunha
afirmación sen límites nunha acoutada por un límite de detección declarado. Sen
iso, estás publicando un número sen saber se significa algo.

## Salvidades, ditas por diante

Isto é un paciente: unha proba de concepto do método, non un estudo clínico. O
valor de 0,4 mm pertence a esta arcada. O que xeneraliza é o procedemento para
atopar o teu.

Tampouco podemos falar de sensibilidade: o control nulo dinos o que informa o método
cando o desprazamento é cero, non se un movemento real de 0,5 mm se recuperaría
con precisión. Iso é outro experimento.

---

> Parte dun traballo en curso sobre xemelgos dixitais dentais. Encantado de
> compartir a metodoloxía con máis detalle: o documento completo inclúe o proceso
> de rexistro e tres resultados negativos que non entraron nesta entrada.
