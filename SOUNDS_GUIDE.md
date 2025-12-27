# Guía de Efectos de Sonido - Rexy VOX TTS

## Características

El sistema ahora permite subir y gestionar efectos de sonido personalizados que se pueden asociar a comandos y minijuegos.

## Formatos Soportados

- **MP3** (.mp3) - Recomendado
- **WAV** (.wav)
- **OGG** (.ogg)
- **WebM** (.webm)

**Límite de tamaño:** 10 MB por archivo

## Cómo Usar

### 1. Subir un Sonido

1. Ve a la pestaña **🛡️ (AutoMod)**
2. En la sección **🔊 Efectos de Sonido**, haz clic en **"Subir Sonido"**
3. Selecciona un archivo de audio en formato .mp3, .wav, .ogg o .webm
4. El sonido aparecerá en la lista de efectos disponibles

### 2. Usar Sonidos en Comandos

#### Tipo: Comando Simple (💬)
- Crea un comando como `!saludo`
- Añade el mensaje: `¡Hola {user}!`
- **Selecciona un sonido** en el dropdown **"Sonido (Opcional)"**
- Al ejecutar el comando, se reproducirá el sonido seguido del TTS

#### Tipo: Personalizado (⚙️)
- Crea un código personalizado
- **Selecciona un sonido** en el dropdown **"Sonido (Opcional)"**
- El sonido se reproducirá cuando se dispare el comando

### 3. Gestionar Sonidos

En la lista de efectos:
- **▶ Escuchar**: Reproduce una vista previa del sonido
- **🗑️ Eliminar**: Borra el sonido permanentemente

## Ejemplos

### Ejemplo 1: Alerta con Sonido
- Comando: `!alerta`
- Tipo: Comando
- Mensaje: `⚠️ {user} activó la alarma`
- Sonido: alert.mp3

### Ejemplo 2: Ruleta con Efectos
- Comando: `!ruleta`
- Tipo: Probabilidad
- Sonido ganador: win.mp3
- Mensaje ganador: `¡{user} ganó!`
- Sonido perdedor: lose.mp3
- Mensaje perdedor: `{user} perdió`

### Ejemplo 3: Código Personalizado con Sonido
```javascript
const num = Math.floor(Math.random() * 10) + 1;
return user + ' lanzó un ' + num;
```
- Sonido: dice.mp3

## Consejos

1. **Calidad**: Usa sonidos de buena calidad (128 kbps mínimo para MP3)
2. **Duración**: Sonidos cortos (máx 5 segundos) funcionan mejor
3. **Volumen**: Los sonidos usan el mismo control de volumen que la voz TTS
4. **Almacenamiento**: Los archivos se guardan en la carpeta `/sounds`

## Solución de Problemas

- **El sonido no se escucha**: Verifica que el volumen no esté al 0% y recarga la página
- **Error "Formato no permitido"**: Solo se aceptan .mp3, .wav, .ogg, .webm
- **Error "Archivo muy grande"**: El máximo es 10 MB
- **El sonido no suena en el chat**: Algunos navegadores requieren interacción del usuario primero

## Notas Técnicas

- Los sonidos se almacenan en `/sounds` en el servidor
- Puedes exportar/importar comandos como JSON y llevarán los referencias a sonidos
- Los sonidos se reproducen simultáneamente al TTS (no en cola)
