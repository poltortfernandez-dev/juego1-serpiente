# Serpiente

Juego de navegador para practicar cómo ejecutar archivos y trabajar con GitHub.

## Ejecutar

Desde la carpeta del repositorio, arranca el servidor local con Python 3.

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000` en un navegador. Pulsa **Empezar** y usa las flechas, WASD o los botones en pantalla. Pulsa **Espacio** o **Pausa** para detener y reanudar la partida. El récord se guarda en el navegador.

`index.html` define la interfaz, `styles.css` le da estilo y `game.js` ejecuta la lógica. El juego funciona sin instalar paquetes.

## Comprobar GitHub

```bash
git status --short
git ls-remote --heads origin main
```

El primer comando muestra los cambios locales. El segundo consulta la rama `main` en GitHub.
