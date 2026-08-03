<?xml version="1.0" encoding="UTF-8"?>
<!--
    Cara visible del feed.

    Un fichero RSS está escrito para los lectores de feeds, no para las personas:
    quien abre la URL en el navegador se encuentra el XML en crudo, sin formato,
    y lo razonable es pensar que algo se ha roto. Firefox dejó de maquetarlos por
    su cuenta hace años.

    Esta hoja de estilos la aplica el propio navegador antes de pintar: el fichero
    que se descarga sigue siendo el mismo XML de siempre y los lectores no notan
    nada, pero quien llegue con un navegador ve una página que explica qué es
    esto y qué hacer con ello.

    Todo el contenido sale del feed. Lo único escrito aquí son las dos frases de
    explicación, y por eso van repetidas en los tres idiomas: la hoja es estática
    y no tiene acceso a los ficheros de traducción, así que elige según el
    `<language>` que el propio feed declara.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" encoding="UTF-8" indent="yes" />

    <xsl:template match="/">
        <xsl:variable name="lang" select="/rss/channel/language" />

        <html>
            <xsl:attribute name="lang"><xsl:value-of select="$lang" /></xsl:attribute>
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="robots" content="noindex" />
                <link rel="icon" href="/favicon-32.png" sizes="32x32" />
                <title><xsl:value-of select="/rss/channel/title" /></title>
                <style>
                    :root {
                        color-scheme: dark;
                        --bg: #171717;
                        --text: #d8d8d8;
                        --muted: rgba(216, 216, 216, 0.68);
                        --subtle: rgba(216, 216, 216, 0.45);
                        --border: rgba(255, 255, 255, 0.08);
                        --sans: "Space Grotesk", "Inter", system-ui, -apple-system, sans-serif;
                        --mono: "JetBrains Mono", ui-monospace, "Cascadia Mono", monospace;
                    }

                    * { box-sizing: border-box; }

                    body {
                        margin: 0;
                        padding: 3rem 1.5rem 4rem;
                        background: var(--bg);
                        color: var(--text);
                        font-family: var(--sans);
                        line-height: 1.6;
                    }

                    main {
                        max-width: 50rem;
                        margin-inline: auto;
                    }

                    h1 {
                        margin: 0 0 0.5rem;
                        font-size: clamp(2rem, 6vw, 3rem);
                        letter-spacing: -0.02em;
                    }

                    .tagline { margin: 0 0 2rem; color: var(--muted); }

                    .note {
                        padding: 1.25rem 1.5rem;
                        border: 1px solid var(--border);
                        border-radius: 0.5rem;
                        color: var(--muted);
                        font-size: 0.95rem;
                    }

                    .note p { margin: 0; }

                    .note code {
                        display: block;
                        margin-top: 0.75rem;
                        overflow-x: auto;
                        font-family: var(--mono);
                        font-size: 0.85rem;
                        color: var(--text);
                    }

                    ul { margin: 2.5rem 0 0; padding: 0; list-style: none; }

                    li + li {
                        margin-top: 2rem;
                        padding-top: 2rem;
                        border-top: 1px solid var(--border);
                    }

                    time {
                        font-family: var(--mono);
                        font-size: 0.75rem;
                        letter-spacing: 0.08em;
                        text-transform: uppercase;
                        color: var(--subtle);
                    }

                    h2 { margin: 0.5rem 0; font-size: 1.35rem; }

                    h2 a { color: inherit; text-decoration: none; }
                    h2 a:hover { text-decoration: underline; }

                    .description { margin: 0; color: var(--muted); }

                    .tags {
                        margin-top: 0.75rem;
                        font-family: var(--mono);
                        font-size: 0.75rem;
                        color: var(--subtle);
                    }

                    .back {
                        display: inline-block;
                        margin-top: 3rem;
                        font-family: var(--mono);
                        font-size: 0.85rem;
                        color: var(--text);
                    }
                </style>
            </head>
            <body>
                <main>
                    <h1><xsl:value-of select="/rss/channel/title" /></h1>
                    <p class="tagline"><xsl:value-of select="/rss/channel/description" /></p>

                    <div class="note">
                        <p>
                            <xsl:choose>
                                <xsl:when test="$lang = 'es'">Esto es un feed RSS: un listado pensado para lectores como Feedly, NetNewsWire o Thunderbird. Pega esta dirección en el tuyo y cada artículo nuevo te llegará solo, sin cuenta ni correo.</xsl:when>
                                <xsl:when test="$lang = 'gl'">Isto é unha fonte RSS: unha listaxe pensada para lectores como Feedly, NetNewsWire ou Thunderbird. Pega este enderezo no teu e cada artigo novo chegarache só, sen conta nin correo.</xsl:when>
                                <xsl:otherwise>This is an RSS feed: a list meant for readers like Feedly, NetNewsWire or Thunderbird. Paste this address into yours and every new article turns up on its own, with no account and no email.</xsl:otherwise>
                            </xsl:choose>
                        </p>
                        <code><xsl:value-of select="concat(/rss/channel/link, $lang, '/rss.xml')" /></code>
                    </div>

                    <ul>
                        <xsl:for-each select="/rss/channel/item">
                            <li>
                                <!-- La fecha viene en formato RFC-822 ("Sat, 01 Aug 2026
                                     00:00:00 GMT"). XSLT 1.0 no sabe de fechas, así que
                                     se recorta el día, el mes y el año en vez de
                                     intentar formatearla. -->
                                <time><xsl:value-of select="substring(pubDate, 6, 11)" /></time>
                                <h2>
                                    <a>
                                        <xsl:attribute name="href"><xsl:value-of select="link" /></xsl:attribute>
                                        <xsl:value-of select="title" />
                                    </a>
                                </h2>
                                <p class="description"><xsl:value-of select="description" /></p>
                                <xsl:if test="category">
                                    <p class="tags">
                                        <xsl:for-each select="category">
                                            <xsl:if test="position() &gt; 1"> · </xsl:if>
                                            <xsl:value-of select="." />
                                        </xsl:for-each>
                                    </p>
                                </xsl:if>
                            </li>
                        </xsl:for-each>
                    </ul>

                    <a class="back">
                        <xsl:attribute name="href"><xsl:value-of select="concat(/rss/channel/link, $lang, '/blog/')" /></xsl:attribute>
                        <xsl:choose>
                            <xsl:when test="$lang = 'es'">← Leer el blog en la web</xsl:when>
                            <xsl:when test="$lang = 'gl'">← Ler o blog na web</xsl:when>
                            <xsl:otherwise>← Read the blog on the site</xsl:otherwise>
                        </xsl:choose>
                    </a>
                </main>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>
