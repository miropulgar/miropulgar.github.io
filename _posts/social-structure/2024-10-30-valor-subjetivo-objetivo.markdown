---
layout: post
title:  "El valor subjetivo es objetivo"
date:   2024-10-28 14:10:16 +0100
categories: jekyll update
---

# Axiomas y Definiciones

## Axiomas

- **Axioma 1**: El valor es subjetivo.
- **Axioma 2**: Existen elementos comunes entre subjetividades. Esto se sostiene por el hecho de que en un intercambio económico, para definir el valor de algo, tienen que coincidir dos subjetividades, como mínimo, entre el oferente y el demandante.

## Definiciones

- **Definición 1**: Una configuración intersubjetiva es un conjunto de elementos comunes entre varias subjetividades que afectan la valoración de algo.
- **Definición 2**: La objetividad se define como una forma de intersubjetividad, es decir, cuando una valoración es compartida por múltiples subjetividades de manera consistente.

# Teoremas y Demostraciones

## Teorema 1: Si el valor es subjetivo, entonces existen diferentes configuraciones intersubjetivas que afectan la valoración.

**Demostración**:  
Sea \( S \) el conjunto de todas las subjetividades. Por el Axioma 1, cada subjetividad \( s \in S \) tiene su propia valoración. Por el Axioma 2, que se sostiene por la necesidad de coincidencia entre oferente y demandante en un intercambio económico, existen elementos comunes entre subjetividades. Definimos una configuración intersubjetiva \( I \) como el conjunto de estos elementos comunes. Entonces, \( I \subseteq S \), y \( I \) afecta la valoración en \( S \).

## Teorema 2: Si hay diferentes configuraciones intersubjetivas, entonces se experimenta de manera más o menos similar.

**Demostración**:  
Sea \( I \) una configuración intersubjetiva que afecta las subjetividades \( s_1, s_2, \ldots, s_n \). Si \( I \) es común entre \( s_1, s_2, \ldots, s_n \), entonces las experiencias de valoración en estas subjetividades serán similares en lo que respecta a \( I \).

## Teorema 3: Si se experimenta de manera similar, hay modos de valoración compartidos.

**Demostración**:  
Dado que \( s_1, s_2, \ldots, s_n \) comparten la configuración intersubjetiva \( I \) y experimentan de manera similar, se puede definir un modo de valoración compartido \( M \) como el conjunto de valoraciones resultantes de \( I \). Por lo tanto, \( M \subseteq V \) (donde \( V \) es el conjunto de todas las valoraciones).

## Teorema 4: La objetividad no es más que intersubjetividad.

**Demostración**:  
Por definición, la objetividad es una forma de intersubjetividad donde las valoraciones son compartidas por múltiples subjetividades de manera consistente. Así, si una valoración es objetiva, es porque es intersubjetiva.

## Teorema 5 (Conclusión): El valor subjetivo no es más que valor objetivo.

**Demostración**:  
Por el Axioma 1, el valor es subjetivo. Por el Teorema 1, existen configuraciones intersubjetivas que afectan las valoraciones. Por los Teoremas 2 y 3, estas configuraciones llevan a modos de valoración compartidos. Por el Teorema 4, la objetividad es intersubjetividad. Por lo tanto, el valor subjetivo, al ser influenciado por configuraciones intersubjetivas que generan modos de valoración compartidos, se convierte en valor objetivo.

# Formalización en Lógica Formal Algebraica

Definamos las siguientes proposiciones:
- \( S \): El valor es subjetivo.
- \( C \): Existen elementos comunes entre subjetividades (basado en la coincidencia mínima necesaria en intercambios económicos).
- \( I \): Existen configuraciones intersubjetivas que afectan la valoración.
- \( E \): Se experimenta de manera similar.
- \( M \): Hay modos de valoración compartidos.
- \( O \): La objetividad no es más que intersubjetividad.
- \( V \): El valor subjetivo es valor objetivo.

Formalizamos las premisas y conclusiones en términos de lógica proposicional:

1. \( S \) (Axioma 1)
2. \( C \) (Axioma 2)
3. \( S \rightarrow I \) (Teorema 1)
4. \( I \rightarrow E \) (Teorema 2)
5. \( E \rightarrow M \) (Teorema 3)
6. \( O \) (Teorema 4)
7. \( O \rightarrow (S \rightarrow V) \) (Teorema 5)

## Demostración

1. \( S \) (Dado)
2. \( S \rightarrow I \) (Dado)
3. \( I \rightarrow E \) (Dado)
4. \( E \rightarrow M \) (Dado)
5. \( O \) (Dado)
6. \( O \rightarrow (S \rightarrow V) \) (Dado)

Aplicamos modus ponens repetidamente:
1. De \( S \) y \( S \rightarrow I \), obtenemos \( I \).
2. De \( I \) y \( I \rightarrow E \), obtenemos \( E \).
3. De \( E \) y \( E \rightarrow M \), obtenemos \( M \).

Finalmente, de \( O \) y \( O \rightarrow (S \rightarrow V) \), junto con \( S \):
4. De \( S \), obtenemos \( S \rightarrow V \) por \( O \).
5. Aplicando modus ponens, obtenemos \( V \).
