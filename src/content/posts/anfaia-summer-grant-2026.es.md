---
title: "Crónica de una Beca de Verano ANFAIA 2026"
description: "Dos meses construyendo un formato de datos para odontología con ANFAIA e HISTORA. Si me preguntan qué me llevo, la respuesta no es el repositorio: es la gente que me lo revisó."
pubDate: 2026-09-12
locale: es
slug: anfaia-summer-grant-2026
tags:
  - healthcare
  - community
---

Pasé julio y agosto de 2026 con una Beca de Verano de ANFAIA, construyendo un
formato de datos para odontología junto a HISTORA. Si me preguntan qué me llevo,
la respuesta no es el repositorio. Es la gente que me lo revisó.

Escribo esto porque cuando yo buscaba información sobre estas becas encontré lo
que suele encontrarse: la convocatoria, los proyectos, la dotación. Nada sobre lo
que realmente pasa durante esos dos meses. Y lo que realmente pasa es bastante
mejor que lo que pone en la convocatoria.

## El proyecto, en breve

Un caso dental llega a trozos. Después de una sola visita con imagen, una clínica
tiene un par de ficheros STL del escáner intraoral, varios cientos de cortes DICOM
del CBCT, unas fotografías clínicas y un informe en PDF. Cuatro artefactos, cuatro
programas, cuatro sistemas de coordenadas, y ninguna afirmación legible por una
máquina de cómo se relacionan entre sí.

Las relaciones no faltan: alguien las estableció. Alguien miró el CBCT al lado del
escaneo y supo qué superficie era cuál. Pero ese conocimiento vive en una persona
o dentro del software de un proveedor, y **no viaja con el dato**. Mi trabajo fue
construir un contenedor que obligue a escribirlas: qué se midió, qué infirió un
modelo, con qué error, y quién lo verificó.

Y ya está. No es lo interesante de este artículo.

## Cómo apliqué

Me enteré tarde y de rebote.

La convocatoria se presentó en un acto en mi universidad al que no pude ir. 
Lo supe por unos compañeros que sí habían estado: me lo contaron ellos.
Así que mi primer contacto con estas becas no fue un cartel ni un correo
institucional, fue una conversación de pasillo.

Luego estuve dándole vueltas más tiempo del que debería. Lo típico: que si el perfil
encajaba, que si los proyectos no se me iban a ir de las manos, que si habría gente
mejor preparada. Envié la solicitud el último día del plazo, y estuve a punto de
no enviarla. Si has llegado hasta aquí leyendo y estás en ese punto exacto, ese es
más o menos el motivo por el que escribo esto.

Tú propones un tema en la solicitud. A mí no me lo cogieron. Fui el único de la
promoción al que no le aceptaron el proyecto que había planteado: a todos los demás
les salió adelante el suyo. Lo que hicieron conmigo fue darme uno y ponerme a trabajar en él
desde cero.

Tenía todos los motivos para leer eso como un premio de consolación, y habría sido un
error. Lo que seleccionan no es el proyecto: es a la persona. Una vez dentro, nadie
volvió a mencionar que el tema no fuera mío, y el que me dieron venía con algo que yo
no habría podido conseguirme solo: un problema real, un socio industrial detrás, y
gente que llevaba años en ese problema con criterio para decirme en qué me estaba
equivocando.

De los dos meses me llevo más de lo que esperaba llevarme del proyecto que yo había
propuesto.

Así que si mandas una idea y no es la que acaba siendo, eso no es un no. A
mí me pasó, y escribo esto desde el lado bueno.

## Llegué sin saber hacer nada de esto

Conviene decirlo sin adornos. No había construido nunca un sistema multiagente de
verdad. No había escrito una especificación de formato. No había tocado Gaussian
Splatting, ni DICOM, ni FHIR, ni la pila de normas que rodea a un dato clínico.
Sabía programar (creo); no sabía nada de casi todo lo demás.

El primer mes fue aprendizaje por error, y los errores concretos enseñan más que
la moraleja. Mi primera versión del campo de apariencia producía una cáscara con
**color inventado**: se veía muy bien y era exactamente lo contrario de lo que el
proyecto necesitaba. Más tarde entrené un clasificador más preciso para recortar
el hueso por debajo del ápice de los dientes; **ganó en el benchmark y perdió en
la tarea real**, y el defecto que me había llevado a entrenarlo seguía ahí. La
lección no era «necesito un modelo mejor»: era que había elegido mal la métrica.

Lo que más me costó aprender no fue ninguna tecnología concreta, sino una forma de
trabajar. Trabajar a fondo con agentes mueve el cuello de botella: ya no es
escribir el código, es **saber qué pedir y cómo comprobar que lo que te devuelven
es cierto**. Un agente te entrega algo que compila, que tiene buena pinta y que
está mal, y si no tienes un criterio fijado *antes* de mirarlo, lo aceptas.

## Las charlas, que son la mitad del programa

Esto es lo que no sabía cuando apliqué, y es lo que más recomiendo.

Durante el verano hay un ciclo de charlas que corre en paralelo a los proyectos, y
son **abiertas**: no son una actividad interna para los becarios, puede entrar
quien quiera. Quedan publicadas en el canal de YouTube de ANFAIA, así que son la
parte del programa a la que cualquiera puede asistir sin tener beca. Y no todas son
técnicas, que es justo lo que las hace valer: hay gente contando cómo llegó a donde
está, incluidas las partes que no salieron.

Semana tras semana entraba alguien de un mundo distinto: perfiles técnicos muy
distintos entre ellos, y también gente cuyo trabajo no se parecía en nada al mío ni al
de los demás. Sobre el papel no había un hilo común. No me perdí ni una, y no hubo
ninguna de la que saliera pensando que había perdido la hora.

El hilo común apareció solo, y no estaba en los temas: todos, en algún momento,
habían tenido que tomar una decisión difícil. Irse fuera a estudiar o a trabajar porque 
aquí no estaba lo que buscaban. Pelear un
puesto concreto durante años. Ninguno contaba una trayectoria limpia, y todos la
contaban sin dramatizarla, como quien te explica una decisión que tomó y por qué.

Eso me abrió algo a mí. No es que viera lo de irse fuera como un fracaso —nunca lo
había pensado en esos términos—, es que simplemente no era una idea que tuviera
presente. No la había descartado: no me la había planteado. Oír a gente para quien
eso fue una decisión real, tomada con sus motivos y con lo que costó, la puso encima de
la mesa como algo que a mí también me podría tocar pensar en algún momento. No he
decidido nada. Pero ahora es una opción que existe, y antes de este verano no lo era.

Para eso no sirve un tutorial. Sirve que alguien que ya lo vivió te lo cuente en
primera persona, y eso es lo que hacen estas charlas.

## La ayuda que recibí

Aquí está lo que de verdad me llevo.

**El acompañamiento**. Isma y Matías fueron mis mentores durante todo el trabajo, y
«durante todo» es literal: no fue una reunión de arranque y otra de cierre, fue estar
ahí mientras el proyecto se torcía y se arreglaba. Isma abrió la puerta a que este tipo
de trabajo se haga en Galicia y propuso él mismo -junto HISTORA- la idea con la que arrancó el
proyecto. Y Matías estuvo codo con codo en todo: no solo revisando lo
que escribía, sino dentro de cada idea y cada experimento que planteábamos —aportando
las suyas, discutiendo las mías y preguntando lo que había que preguntar antes de
gastar una semana en algo—. Aprender a trabajar así, y a recibir ese nivel de
exigencia, me ha servido tanto como lo que aprendí del tema.

**Los clínicos.** El Dr. Pedro Manuel Guitián Lema y la Dra. Elena López Alvar dedicaron
tiempo a explicarme qué necesita medir de verdad un odontólogo y —igual de útil—
cuánto vale un número de buena pinta cuando nadie puede decir cómo se obtuvo. Sin
eso habría construido algo técnicamente correcto y clínicamente irrelevante.

## Qué viene ahora

El trabajo continúa con HISTORA, y eso no lo digo yo: ellos lo han contado en su propio blog (https://www.histora.com/es/blog/uos-unified-oral-scene-luis-garbayo-anfaia-histora). Que una empresa escriba sobre lo que hizo un becario cuando el verano ya se ha acabado es, para mí, la mejor señal de que el verano sirvió para algo.

Quedan cosas abiertas, y alguna no es mía de cerrar. Pero el proyecto sigue vivo en septiembre, que era exactamente lo que quería que pasara.

## Aplica

Si estás leyéndolo y te lo estás pensando: aplica.

Lo que ANFAIA ofrece no son dos meses pagados. Es un proyecto real con un socio
industrial real, un mentor que te revisa el trabajo con criterio de verdad, un
ciclo de charlas al que asiste gente que ya hizo el camino, y la obligación de
publicarlo todo en abierto, que es la que te fuerza a que esté bien. Yo llegué sin
saber hacer casi nada de lo que acabé haciendo.

Ismael y Mariel, con los mentores, han montado algo poco común: un sitio donde
alguien que empieza puede hacer trabajo serio, equivocarse en público y que
alguien con veinticinco años de oficio se siente a decirle en qué. Si estás
empezando en esto en Galicia, no hay muchas puertas así. Esta está abierta.

---

El proyecto tiene una página donde se ve funcionando:
agentic-smart-health.lgarbayo.com (https://agentic-smart-health.lgarbayo.com/).
*El código y la documentación están en
[github.com/ANFAIA/Agentic-Smart-Health](https://github.com/ANFAIA/Agentic-Smart-Health),
bajo licencia Apache 2.0.*
