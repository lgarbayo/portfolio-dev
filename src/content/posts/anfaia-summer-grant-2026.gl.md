---
title: "Crónica dunha Bolsa de Verán ANFAIA 2026"
description: "Dous meses construíndo un formato de datos para odontoloxía con ANFAIA e HISTORA. Se me preguntan que me levo, a resposta non é o repositorio: é a xente que mo revisou."
pubDate: 2026-09-12
locale: gl
slug: anfaia-summer-grant-2026
tags:
  - healthcare
  - community
---

Pasei xullo e agosto de 2026 cunha Bolsa de Verán de ANFAIA, construíndo un
formato de datos para odontoloxía xunto a HISTORA. Se me preguntan que me levo,
a resposta non é o repositorio. É a xente que mo revisou.

Escribo isto porque cando eu buscaba información sobre estas bolsas atopei o que
adoita atoparse: a convocatoria, os proxectos, a dotación. Nada sobre o que
realmente pasa durante eses dous meses. E o que realmente pasa é bastante mellor
que o que pon na convocatoria.

## O proxecto, en breve

Un caso dental chega a anacos. Despois dunha soa visita con imaxe, unha clínica
ten un par de ficheiros STL do escáner intraoral, varios centos de cortes DICOM
do CBCT, unhas fotografías clínicas e un informe en PDF. Catro artefactos, catro
programas, catro sistemas de coordenadas, e ningunha afirmación lexible por unha
máquina de como se relacionan entre si.

As relacións non faltan: alguén as estableceu. Alguén mirou o CBCT ao lado do
escaneo e soubo que superficie era cal. Pero ese coñecemento vive nunha persoa ou
dentro do software dun provedor, e **non viaxa co dato**. O meu traballo foi
construír un contedor que obrigue a escribilas: que se mediu, que inferiu un
modelo, con que erro, e quen o verificou.

E xa está. Non é o interesante deste artigo.

## Como apliquei

Souben tarde e de rebote.

A convocatoria presentouse nun acto na miña universidade ao que non puiden ir.
Soubeno por uns compañeiros que si estiveran: contáronmo eles.
Así que o meu primeiro contacto con estas bolsas non foi un cartel nin un correo
institucional, foi unha conversa de corredor.

Logo estiven dándolle voltas máis tempo do que debería. O típico: que se o perfil
encaixaba, que se os proxectos non se me ían ir das mans, que se habería xente
mellor preparada. Enviei a solicitude o último día do prazo, e estiven a piques de
non enviala. Se chegaches ata aquí lendo e estás nese punto exacto, ese é máis ou
menos o motivo polo que escribo isto.

Ti propós un tema na solicitude. A min non mo colleron. Fun o único da promoción
ao que non lle aceptaron o proxecto que plantexara: a todos os demais saíulles
adiante o seu. O que fixeron comigo foi darme un e poñerme a traballar nel desde
cero.

Tiña todos os motivos para ler iso como un premio de consolación, e tería sido un
erro. O que seleccionan non é o proxecto: é a persoa. Unha vez dentro, ninguén
volveu mencionar que o tema non fose meu, e o que me deron viña con algo que eu
non podería conseguirme só: un problema real, un socio industrial detrás, e xente
que levaba anos nese problema con criterio para dicirme en que me estaba
equivocando.

Dos dous meses lévome máis do que agardaba levarme do proxecto que eu propuxera.

Así que se mandas unha idea e non é a que acaba sendo, iso non é un non. A min
pasoume, e escribo isto desde o lado bo.

## Cheguei sen saber facer nada disto

Convén dicilo sen adornos. Non construíra nunca un sistema multiaxente de verdade.
Non escribira unha especificación de formato. Non tocara Gaussian Splatting, nin
DICOM, nin FHIR, nin a pila de normas que rodea a un dato clínico. Sabía programar
(creo); non sabía nada de case todo o demais.

O primeiro mes foi aprendizaxe por erro, e os erros concretos ensinan máis que a
moralexa. A miña primeira versión do campo de aparencia producía unha casca con
**cor inventada**: víase moi ben e era exactamente o contrario do que o proxecto
necesitaba. Máis tarde adestrei un clasificador máis preciso para recortar o óso
por debaixo do ápice dos dentes; **gañou no benchmark e perdeu na tarefa real**, e
o defecto que me levara a adestralo seguía aí. A lección non era «necesito un
modelo mellor»: era que escollera mal a métrica.

O que máis me custou aprender non foi ningunha tecnoloxía concreta, senón unha
forma de traballar. Traballar a fondo con axentes move o gargalo: xa
non é escribir o código, é **saber que pedir e como comprobar que o que che
devolven é certo**. Un axente entrégache algo que compila, que ten boa pinta e que
está mal, e se non tes un criterio fixado *antes* de miralo, acéptalo.

## As charlas, que son a metade do programa

Isto é o que non sabía cando apliquei, e é o que máis recomendo.

Durante o verán hai un ciclo de charlas que corre en paralelo aos proxectos, e son
**abertas**: non son unha actividade interna para os bolseiros, pode entrar quen
queira. Quedan publicadas na canle de YouTube de ANFAIA, así que son a parte do
programa á que calquera pode asistir sen ter bolsa. E non todas son técnicas, que
é xustamente o que as fai valer: hai xente contando como chegou a onde está,
incluídas as partes que non saíron.

Semana tras semana entraba alguén dun mundo distinto: perfís técnicos moi
distintos entre eles, e tamén xente cuxo traballo non se parecía en nada ao meu
nin ao dos demais. Sobre o papel non había un fío común. Non perdín nin unha, e
non houbo ningunha da que saíse pensando que perdera a hora.

O fío común apareceu só, e non estaba nos temas: todos, nalgún momento, tiveran
que tomar unha decisión difícil. Irse fóra a estudar ou a traballar porque aquí
non estaba o que buscaban. Pelexar un posto concreto durante anos. Ningún contaba
unha traxectoria limpa, e todos a contaban sen dramatizala, como quen che explica
unha decisión que tomou e por que.

Iso abriume algo a min. Non é que vise o de irse fóra como un fracaso —nunca o
pensara neses termos—, é que simplemente non era unha idea que tivese presente.
Non a descartara: non ma plantexara. Oír a xente para quen iso foi unha decisión
real, tomada cos seus motivos e co que custou, púxoa enriba da mesa como algo que
a min tamén me podería tocar pensar nalgún momento. Non decidín nada. Pero agora é
unha opción que existe, e antes deste verán non o era.

Para iso non serve un titorial. Serve que alguén que xa o viviu cho conte en
primeira persoa, e iso é o que fan estas charlas.

## A axuda que recibín

Aquí está o que de verdade me levo.

**O acompañamento**. Isma e Matías foron os meus mentores durante todo o traballo,
e «durante todo» é literal: non foi unha reunión de arranque e outra de peche, foi
estar aí mentres o proxecto se torcía e se amañaba. Isma abriu a porta a que este
tipo de traballo se faga en Galicia e propuxo el mesmo —xunto con HISTORA— a idea
coa que arrancou o proxecto. E Matías estivo cóbado con cóbado en todo: non só
revisando o que escribía, senón dentro de cada idea e cada experimento que
plantexabamos —achegando as súas, discutindo as miñas e preguntando o que había que
preguntar antes de gastar unha semana en algo—. Aprender a traballar así, e a
recibir ese nivel de esixencia, serviume tanto como o que aprendín do tema.

**Os clínicos.** O Dr. Pedro Manuel Guitián Lema e a Dra. Elena López Alvar
dedicaron tempo a explicarme que necesita medir de verdade un odontólogo e —igual
de útil— canto vale un número de boa pinta cando ninguén pode dicir como se
obtivo. Sen iso construiría algo tecnicamente correcto e clinicamente irrelevante.

## Que vén agora

O traballo continúa con HISTORA, e iso non o digo eu: eles contárono no seu propio blog (https://www.histora.com/es/blog/uos-unified-oral-scene-luis-garbayo-anfaia-histora). Que unha empresa escriba sobre o que fixo un bolseiro cando o verán xa rematou é, para min, o mellor sinal de que o verán serviu para algo.

Quedan cousas abertas, e algunha non é miña de pechar. Pero o proxecto segue vivo en setembro, que era exactamente o que quería que pasase.

## Aplica

Se estás léndoo e estalo pensando: aplica.

O que ANFAIA ofrece non son dous meses pagados. É un proxecto real cun socio
industrial real, un mentor que che revisa o traballo con criterio de verdade, un
ciclo de charlas ao que asiste xente que xa fixo o camiño, e a obriga de
publicalo todo en aberto, que é a que te forza a que estea ben. Eu cheguei sen
saber facer case nada do que acabei facendo.

Ismael e Mariel, cos mentores, montaron algo pouco común: un sitio onde alguén que
empeza pode facer traballo serio, equivocarse en público e que alguén con vinte e
cinco anos de oficio se sente a dicirlle en que. Se estás empezando nisto en
Galicia, non hai moitas portas así. Esta está aberta.

---

O proxecto ten unha páxina onde se ve funcionando:
agentic-smart-health.lgarbayo.com (https://agentic-smart-health.lgarbayo.com/).
*O código e a documentación están en
[github.com/ANFAIA/Agentic-Smart-Health](https://github.com/ANFAIA/Agentic-Smart-Health),
baixo licenza Apache 2.0.*
